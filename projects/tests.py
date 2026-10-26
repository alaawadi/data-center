"""Tests for project visibility (public vs. courses-only)."""
import json
from tempfile import TemporaryDirectory

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.urls import reverse

from users.models import User, UserRole

from .models import Project, ProjectInteraction, ProjectStatus, ProjectVisibility


class ProjectVisibilityTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059700001', password='pass1234', full_name='مدرب الظهور', role=UserRole.TRAINER
        )
        self.student = User.objects.create_user(
            phone='059700002', password='pass1234', full_name='طالب الظهور', role=UserRole.STUDENT
        )

    def _save(self, user, **fields):
        self.client.force_login(user)
        project = Project.objects.create(
            owner=user,
            title=fields.get('title', 'مشروع اختبار'),
            cover='test-cover.png',
        )
        payload = {
            'id': project.slug,
            'title': project.title,
            'summary': 'ملخص للمشروع',
            'content': ' '.join(['وصف'] * 50),
            'category': 'تقنية',
            'date': '2025-01-01',
            'status': 'published',
            'visibility': fields.get('visibility', 'public'),
            'tags': ['واجهة', 'تجربة', 'مشروع'],
        }
        res = self.client.post(
            reverse('projects:save'),
            data=json.dumps(payload),
            content_type='application/json',
        )
        return res.json(), Project.objects.get(owner=user, title=payload['title'])

    def _publish_payload(self, **overrides):
        payload = {
            'id': '',
            'title': 'مشروع مكتمل',
            'summary': 'نبذة قصيرة',
            'content': ' '.join(['وصف'] * 50),
            'category': 'تقنية',
            'date': '2025-01-01',
            'visibility': 'public',
            'tags': ['واجهة', 'تجربة', 'مشروع'],
            'cover': 'data:image/png;base64,YQ==',
            'status': 'published',
        }
        payload.update(overrides)
        return payload

    def test_publishing_rejects_missing_required_project_fields(self):
        self.client.force_login(self.trainer)
        response = self.client.post(
            reverse('projects:save'),
            data=json.dumps({'id': '', 'status': 'published'}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'project_incomplete')
        self.assertEqual(
            set(response.json()['missing']),
            {'title', 'cover', 'summary', 'content', 'category', 'visibility', 'tags', 'date'},
        )
        self.assertFalse(Project.objects.filter(owner=self.trainer).exists())

    def test_publishing_accepts_complete_project(self):
        self.client.force_login(self.trainer)
        with TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                reverse('projects:save'),
                data=json.dumps(self._publish_payload()),
                content_type='application/json',
            )
            self.assertEqual(response.status_code, 200, response.content)
            project = Project.objects.get(slug=response.json()['id'])
            self.assertEqual(project.status, ProjectStatus.PUBLISHED)
            self.assertEqual(project.tags.count(), 3)
            self.assertTrue(project.cover)

    def test_publishing_requires_three_distinct_tags(self):
        project = Project.objects.create(
            owner=self.trainer, title='مسودة', cover='existing-cover.png'
        )
        self.client.force_login(self.trainer)
        response = self.client.post(
            reverse('projects:save'),
            data=json.dumps(self._publish_payload(
                id=project.slug,
                tags=['واجهة', 'واجهة', 'تجربة'],
            )),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['missing'], ['tags'])
        project.refresh_from_db()
        self.assertEqual(project.status, ProjectStatus.DRAFT)

    def test_trainer_can_mark_project_for_courses(self):
        data, project = self._save(self.trainer, visibility='courses')
        self.assertTrue(data['ok'])
        self.assertEqual(project.visibility, ProjectVisibility.COURSES)

    def test_trainer_defaults_to_public(self):
        data, project = self._save(self.trainer, visibility='public')
        self.assertEqual(project.visibility, ProjectVisibility.PUBLIC)

    def test_student_cannot_mark_project_for_courses(self):
        data, project = self._save(self.student, visibility='courses')
        self.assertTrue(data['ok'])
        self.assertEqual(project.visibility, ProjectVisibility.PUBLIC)

    def test_new_project_defaults_to_public(self):
        project = Project.objects.create(owner=self.trainer, title='افتراضي')
        self.assertEqual(project.visibility, ProjectVisibility.PUBLIC)

    def test_public_dict_exposes_visibility(self):
        project = Project.objects.create(
            owner=self.trainer, title='x', visibility=ProjectVisibility.COURSES
        )
        self.assertEqual(project.to_public_dict()['visibility'], 'courses')

    def test_public_projects_list_hides_courses_projects(self):
        Project.objects.create(
            owner=self.trainer, title='عام', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        Project.objects.create(
            owner=self.trainer, title='دورات', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
        )
        res = self.client.get(reverse('projects:list'))
        titles = [p['title'] for p in res.context['projects_json']]
        self.assertIn('عام', titles)
        self.assertNotIn('دورات', titles)

    def test_projects_list_has_search_and_load_more_controls(self):
        response = self.client.get(reverse('projects:list'))
        self.assertContains(response, 'id="projectsSearch"')
        self.assertContains(response, 'id="projectsMore"')

    def test_freelancer_profile_hides_courses_projects(self):
        Project.objects.create(
            owner=self.trainer, title='عام', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        Project.objects.create(
            owner=self.trainer, title='دورات', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
        )
        res = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.trainer.handle})
        )
        titles = [p['title'] for p in res.context['projects_json']]
        self.assertIn('عام', titles)
        self.assertNotIn('دورات', titles)

    def test_inactive_project_is_hidden_from_public_listing_and_freelancer_profile(self):
        project = Project.objects.create(
            owner=self.trainer, title='مشروع متوقف', status=ProjectStatus.INACTIVE,
            visibility=ProjectVisibility.PUBLIC,
        )
        listing = self.client.get(reverse('projects:list'))
        titles = [item['title'] for item in listing.context['projects_json']]
        self.assertNotIn(project.title, titles)

        profile = self.client.get(
            reverse('accounts:profile', kwargs={'handle': self.trainer.handle})
        )
        profile_titles = [item['title'] for item in profile.context['projects_json']]
        self.assertNotIn(project.title, profile_titles)
        self.assertEqual(
            self.client.get(reverse('projects:detail', kwargs={'pk': project.slug})).status_code,
            404,
        )

    def test_project_file_download_tracks_download_count(self):
        project = Project.objects.create(
            owner=self.trainer, title='مشروع ملف', status=ProjectStatus.PUBLISHED,
        )
        project_file = project.files.create(original_name='report.txt', size=4)
        project_file.file.save('report.txt', ContentFile(b'test'), save=True)
        response = None
        try:
            response = self.client.get(
                reverse('projects:file-download', args=[project_file.pk])
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn('attachment', response['Content-Disposition'])
            project_file.refresh_from_db()
            self.assertEqual(project_file.downloads, 1)
            self.assertEqual(
                project.to_public_dict()['files'][0]['downloads'],
                1,
            )
        finally:
            if response is not None:
                response.close()
            project_file.file.delete(save=False)

    def test_admin_can_assign_project_to_another_user(self):
        admin = User.objects.create_user(
            phone='059700003', password='pass1234', full_name='مدير المشاريع',
            role=UserRole.ADMIN,
        )
        self.client.force_login(admin)
        response = self.client.post(
            reverse('projects:save'),
            data=json.dumps({
                'id': '',
                'ownerId': str(self.student.pk),
                'title': 'مشروع طالب',
                'status': 'draft',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        project = Project.objects.get(slug=response.json()['id'])
        self.assertEqual(project.owner, self.student)

    def test_admin_can_reassign_existing_project_from_editor(self):
        admin = User.objects.create_user(
            phone='059700004', password='pass1234', full_name='مدير المشاريع',
            role=UserRole.ADMIN,
        )
        project = Project.objects.create(owner=self.trainer, title='مشروع قبل التعديل')
        self.client.force_login(admin)
        response = self.client.post(
            reverse('projects:save'),
            data=json.dumps({
                'id': project.slug,
                'ownerId': str(self.student.pk),
                'title': project.title,
                'status': 'draft',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        project.refresh_from_db()
        self.assertEqual(project.owner, self.student)

    def test_admin_editor_provides_searchable_owner_list(self):
        admin = User.objects.create_user(
            phone='059700005', password='pass1234', full_name='مدير المشاريع',
            role=UserRole.ADMIN,
        )
        project = Project.objects.create(owner=self.trainer, title='مشروع للتحرير')
        self.client.force_login(admin)
        response = self.client.get(reverse('projects:edit', args=[project.slug]))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['is_admin_project_editor'])
        self.assertEqual(
            response.context['admin_project_owner_id'],
            str(self.trainer.pk),
        )
        owners = response.context['admin_project_owners']
        self.assertIn(str(self.student.pk), [owner['id'] for owner in owners])
        self.assertContains(response, 'id="edOwnerSearch"')

    def test_project_editor_has_project_details_and_responsive_templates_only(self):
        self.client.force_login(self.trainer)

        response = self.client.get(reverse('projects:create'))

        self.assertEqual(response.status_code, 200)
        content = response.content.decode()
        self.assertLess(content.index('id="edChecklist"'), content.index('editor-templates-desktop'))
        self.assertLess(content.index('editor-templates-desktop'), content.index('id="lblSummary"'))
        self.assertLess(content.index('id="edCoverHost"'), content.index('editor-templates-mobile'))
        self.assertIn('editor-checklist-box', content)
        self.assertEqual(content.count('data-editor-templates'), 2)
        self.assertNotContains(response, 'id="edGallery"')
        self.assertNotContains(response, 'id="edIdeas"')
        self.assertNotContains(response, 'id="edIdeaRefresh"')
        self.assertNotContains(response, 'id="edSocialPreview"')
        self.assertNotContains(response, 'class="slug-row"')

    def test_non_admin_cannot_assign_project_to_another_user(self):
        self.client.force_login(self.student)
        response = self.client.post(
            reverse('projects:save'),
            data=json.dumps({
                'id': '',
                'ownerId': str(self.trainer.pk),
                'title': 'مشروعي',
                'status': 'draft',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        project = Project.objects.get(slug=response.json()['id'])
        self.assertEqual(project.owner, self.student)

    def test_owner_portfolio_shows_both_visibilities(self):
        Project.objects.create(
            owner=self.trainer, title='عام', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        Project.objects.create(
            owner=self.trainer, title='دورات', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
        )
        self.client.force_login(self.trainer)
        res = self.client.get(reverse('portfolio:home'))
        titles = [p['title'] for p in res.context['projects_json']]
        self.assertIn('عام', titles)
        self.assertIn('دورات', titles)

    def test_courses_project_reachable_by_authenticated_user(self):
        project = Project.objects.create(
            owner=self.trainer, title='دورات', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
        )
        self.client.force_login(self.student)
        res = self.client.get(reverse('projects:detail', kwargs={'pk': project.slug}))
        self.assertEqual(res.status_code, 200)

    def test_courses_project_hidden_from_anonymous(self):
        project = Project.objects.create(
            owner=self.trainer, title='دورات', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
        )
        res = self.client.get(reverse('projects:detail', kwargs={'pk': project.slug}))
        self.assertEqual(res.status_code, 404)

    def test_copy_for_student_is_public(self):
        # نسخة الطالب من مشروع دورة تبقى «عامة» لتظهر في بروفايله.
        project = Project.objects.create(owner=self.trainer, title='دورات')
        self.assertEqual(project.visibility, ProjectVisibility.PUBLIC)

    def test_project_like_toggles_and_updates_count(self):
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع إعجاب',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        self.client.force_login(self.student)
        url = reverse('projects:interaction')

        liked = self.client.post(
            url,
            data=json.dumps({'id': project.slug, 'field': 'like'}),
            content_type='application/json',
        )
        self.assertEqual(liked.status_code, 200)
        self.assertEqual(liked.json(), {'ok': True, 'liked': True, 'saved': False, 'likes': 1})

        unliked = self.client.post(
            url,
            data=json.dumps({'id': project.slug, 'field': 'like'}),
            content_type='application/json',
        )
        self.assertEqual(unliked.status_code, 200)
        self.assertEqual(unliked.json()['likes'], 0)
        self.assertFalse(unliked.json()['liked'])
        project.refresh_from_db()
        self.assertEqual(project.likes, 0)

    def test_project_save_state_is_returned_on_detail(self):
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع محفوظ',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        self.client.force_login(self.student)
        response = self.client.post(
            reverse('projects:interaction'),
            data=json.dumps({'id': project.slug, 'field': 'save'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['saved'])

        detail = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )
        project_data = detail.context['projects_json'][0]
        self.assertTrue(project_data['saved'])
        self.assertFalse(project_data['liked'])
        self.assertTrue(
            ProjectInteraction.objects.filter(
                project=project, user=self.student, saved=True
            ).exists()
        )

    def test_project_interaction_requires_login(self):
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع خاص بالتفاعل',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC,
        )
        response = self.client.post(
            reverse('projects:interaction'),
            data=json.dumps({'id': project.slug, 'field': 'like'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 302)
