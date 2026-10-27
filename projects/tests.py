"""Tests for project visibility (public vs. courses-only)."""
import json
from tempfile import TemporaryDirectory

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.urls import reverse

from users.models import User, UserRole
from courses.models import Course, CourseProgress, CourseSection, CourseStatus, Lesson

from .models import Project, ProjectImage, ProjectInteraction, ProjectStatus, ProjectVisibility


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

    def test_published_course_project_details_are_reachable_from_public_course(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة عامة',
            status=CourseStatus.PUBLISHED,
        )
        section = CourseSection.objects.create(course=course, title='المشاريع')
        lesson = Lesson.objects.create(section=section, title='المشروع')
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع تابع للدورة',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
            source_lesson=lesson,
        )

        response = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['projects_json'][0]['title'], project.title)
        self.assertFalse(response.context['projects_json'][0]['canDownloadFiles'])
        self.assertGreaterEqual(response.context['projects_json'][0]['displayLikes'], 200)
        self.assertGreaterEqual(response.context['projects_json'][0]['displayViews'], 1800)

    def test_course_project_display_counts_are_different_and_stable(self):
        projects = []
        for title in ('مشروع أول', 'مشروع ثان'):
            course = Course.objects.create(
                owner=self.trainer,
                title=f'دورة {title}',
                status=CourseStatus.PUBLISHED,
            )
            section = CourseSection.objects.create(course=course, title='المشاريع')
            lesson = Lesson.objects.create(section=section, title='مشروع')
            projects.append(Project.objects.create(
                owner=self.trainer,
                title=title,
                status=ProjectStatus.DRAFT,
                visibility=ProjectVisibility.COURSES,
                source_lesson=lesson,
            ))

        counts = []
        for project in projects:
            response = self.client.get(
                reverse('projects:detail', kwargs={'pk': project.slug})
            )
            self.assertEqual(response.status_code, 200)
            data = response.context['projects_json'][0]
            counts.append((data['displayLikes'], data['displayViews']))

        self.assertNotEqual(counts[0], counts[1])
        for likes, views in counts:
            self.assertGreaterEqual(likes, 200)
            self.assertGreaterEqual(views, 1800)

    def test_course_project_display_views_increment_on_each_new_visit(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة لمشاهدة المشروع',
            status=CourseStatus.PUBLISHED,
        )
        section = CourseSection.objects.create(course=course, title='المشاريع')
        lesson = Lesson.objects.create(section=section, title='مشروع')
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع يحسب المشاهدات',
            status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.COURSES,
            source_lesson=lesson,
            views=2,
        )
        detail_url = reverse('projects:detail', kwargs={'pk': project.slug})

        first_visit = self.client.get(detail_url)
        first_displayed_views = first_visit.context['projects_json'][0]['displayViews']
        project.refresh_from_db()
        self.assertEqual(project.views, 3)

        second_visit = self.client.get(detail_url)
        second_displayed_views = second_visit.context['projects_json'][0]['displayViews']
        project.refresh_from_db()

        self.assertEqual(project.views, 4)
        self.assertEqual(second_displayed_views, first_displayed_views + 1)

    def test_project_detail_shows_real_likes_and_incremented_view_count(self):
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع بإحصاءات',
            status=ProjectStatus.PUBLISHED,
            views=7,
            likes=3,
        )

        response = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )

        self.assertEqual(response.status_code, 200)
        project_data = response.context['projects_json'][0]
        self.assertEqual(project_data['views'], 8)
        self.assertEqual(project_data['likes'], 3)
        project.refresh_from_db()
        self.assertEqual(project.views, 8)

    def test_project_detail_includes_gallery_images_in_frontend_payload(self):
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع بمعرض صور',
            status=ProjectStatus.PUBLISHED,
        )
        ProjectImage.objects.create(
            project=project,
            image='projects/gallery/detail-preview.svg',
        )

        response = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )

        self.assertEqual(response.status_code, 200)
        project_data = response.context['projects_json'][0]
        self.assertEqual(
            project_data['gallery'],
            ['/media/projects/gallery/detail-preview.svg'],
        )

    def test_project_of_coming_soon_course_is_reachable_without_file_access(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة قريبًا',
            status=CourseStatus.PUBLISHED,
            is_coming_soon=True,
        )
        section = CourseSection.objects.create(course=course, title='المشاريع')
        lesson = Lesson.objects.create(section=section, title='المشروع')
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع قريبًا',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
            source_lesson=lesson,
        )

        response = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['projects_json'][0]['title'], project.title)
        self.assertFalse(response.context['projects_json'][0]['canDownloadFiles'])

    def test_logged_in_user_can_view_draft_project_of_coming_soon_course(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة مستقبلية',
            status=CourseStatus.PUBLISHED,
            is_coming_soon=True,
        )
        section = CourseSection.objects.create(course=course, title='المشاريع')
        lesson = Lesson.objects.create(section=section, title='مشروع مستقبلي')
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع دورة مستقبلية',
            status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.COURSES,
            source_lesson=lesson,
        )
        self.client.force_login(self.student)

        response = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context['projects_json'][0]['canDownloadFiles'])

    def test_draft_project_linked_to_published_course_can_be_viewed_and_liked(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة عامة قريبًا',
            status=CourseStatus.PUBLISHED,
            is_coming_soon=True,
        )
        section = CourseSection.objects.create(course=course, title='المشاريع')
        lesson = Lesson.objects.create(section=section, title='مشروع الدورة')
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع مسودة مرتبط بدورة عامة',
            status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.COURSES,
            source_lesson=lesson,
            views=2,
        )
        detail_url = reverse('projects:detail', kwargs={'pk': project.slug})

        detail = self.client.get(detail_url)

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.context['projects_json'][0]['views'], 3)
        self.assertFalse(detail.context['projects_json'][0]['canDownloadFiles'])

        self.client.force_login(self.student)
        interaction = self.client.post(
            reverse('projects:interaction'),
            data=json.dumps({'id': project.slug, 'field': 'like'}),
            content_type='application/json',
        )

        self.assertEqual(interaction.status_code, 200, interaction.content)
        self.assertTrue(interaction.json()['liked'])
        self.assertEqual(interaction.json()['likes'], 1)
        self.assertEqual(interaction.json()['displayLikes'], 200 + project.pk + 1)
        project.refresh_from_db()
        self.assertEqual(project.views, 3)
        self.assertEqual(project.likes, 1)

    def test_project_linked_to_unpublished_course_stays_hidden_from_anonymous(self):
        course = Course.objects.create(
            owner=self.trainer,
            title='دورة مسودة',
            status=CourseStatus.DRAFT,
            is_coming_soon=True,
        )
        section = CourseSection.objects.create(course=course, title='المشاريع')
        lesson = Lesson.objects.create(section=section, title='المشروع')
        project = Project.objects.create(
            owner=self.trainer,
            title='مشروع دورة مسودة',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
            source_lesson=lesson,
        )

        response = self.client.get(
            reverse('projects:detail', kwargs={'pk': project.slug})
        )

        self.assertEqual(response.status_code, 404)

    def test_course_project_file_requires_enrolled_student(self):
        course = Course.objects.create(
            owner=self.trainer, title='دورة الملفات', status=CourseStatus.PUBLISHED,
        )
        section = CourseSection.objects.create(course=course, title='مشاريع الدورة')
        lesson = Lesson.objects.create(section=section, title='المشروع')
        project = Project.objects.create(
            owner=self.trainer,
            title='ملفات مشروع الدورة',
            status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
            source_lesson=lesson,
        )
        project_file = project.files.create(original_name='guide.txt', size=4)
        project_file.file.save('guide.txt', ContentFile(b'test'), save=True)
        download_url = reverse('projects:file-download', args=[project_file.pk])
        detail_url = reverse('projects:detail', kwargs={'pk': project.slug})
        self.assertEqual(project.to_public_dict()['files'][0]['url'], download_url)
        self.assertEqual(project.to_public_dict()['files'][0]['dataUrl'], download_url)

        self.client.force_login(self.student)
        try:
            detail = self.client.get(detail_url)
            self.assertEqual(detail.status_code, 200)
            self.assertFalse(detail.context['projects_json'][0]['canDownloadFiles'])
            self.assertEqual(self.client.get(download_url).status_code, 404)

            CourseProgress.objects.create(student=self.student, course=course)
            enrolled_detail = self.client.get(detail_url)
            self.assertTrue(enrolled_detail.context['projects_json'][0]['canDownloadFiles'])
            response = self.client.get(download_url)
            self.assertEqual(response.status_code, 200)
            response.close()
        finally:
            project_file.file.delete(save=False)

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
        self.assertEqual(
            liked.json(),
            {
                'ok': True,
                'liked': True,
                'saved': False,
                'likes': 1,
                'displayLikes': 1,
            },
        )

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
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['error'], 'authentication_required')


class ProjectReorderingTests(TestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            phone='059800001', password='pass1234', full_name='مدرب الترتيب',
            role=UserRole.TRAINER,
        )
        self.admin = User.objects.create_user(
            phone='059800002', password='pass1234', full_name='مدير الترتيب',
            is_staff=True,
        )
        self.first = Project.objects.create(
            owner=self.trainer, title='مشروع أول', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC, display_order=0,
        )
        self.second = Project.objects.create(
            owner=self.trainer, title='مشروع ثان', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.PUBLIC, display_order=1,
        )

    def test_only_admin_sees_project_reordering_controls(self):
        anonymous_response = self.client.get(reverse('projects:list'))
        self.assertFalse(anonymous_response.context['can_reorder_projects'])
        self.assertNotContains(anonymous_response, 'id="projectReorderTools"')

        self.client.force_login(self.trainer)
        trainer_response = self.client.get(reverse('projects:list'))
        self.assertFalse(trainer_response.context['can_reorder_projects'])
        self.assertNotContains(trainer_response, 'id="projectReorderTools"')

        self.client.force_login(self.admin)
        admin_response = self.client.get(reverse('projects:list'))
        self.assertTrue(admin_response.context['can_reorder_projects'])
        self.assertContains(admin_response, 'id="projectReorderTools"')
        self.assertContains(admin_response, 'id="projectReorderSave"')

    def test_admin_can_save_order_for_public_trainer_projects(self):
        private_project = Project.objects.create(
            owner=self.trainer, title='مشروع دورة', status=ProjectStatus.PUBLISHED,
            visibility=ProjectVisibility.COURSES,
        )
        draft = Project.objects.create(
            owner=self.trainer, title='مشروع مسودة', status=ProjectStatus.DRAFT,
            visibility=ProjectVisibility.PUBLIC,
        )
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse('projects:reorder'),
            data=json.dumps({'order': [self.second.slug, self.first.slug]}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['ok'])
        self.assertEqual(
            list(
                Project.objects.filter(
                    status=ProjectStatus.PUBLISHED,
                    visibility=ProjectVisibility.PUBLIC,
                    owner__role=UserRole.TRAINER,
                )
                .order_by('display_order')
                .values_list('slug', flat=True)
            ),
            [self.second.slug, self.first.slug],
        )
        listing = self.client.get(reverse('projects:list'))
        self.assertEqual(
            [project['id'] for project in listing.context['projects_json']],
            [self.second.slug, self.first.slug],
        )
        private_project.refresh_from_db()
        draft.refresh_from_db()
        self.assertIsNone(private_project.display_order)
        self.assertIsNone(draft.display_order)

    def test_non_admin_cannot_reorder_and_stale_or_duplicate_orders_are_rejected(self):
        url = reverse('projects:reorder')
        payload = json.dumps({'order': [self.first.slug, self.second.slug]})

        self.client.force_login(self.trainer)
        forbidden = self.client.post(url, data=payload, content_type='application/json')
        self.assertEqual(forbidden.status_code, 403)

        self.client.force_login(self.admin)
        stale = self.client.post(
            url, data=json.dumps({'order': [self.first.slug]}), content_type='application/json'
        )
        self.assertEqual(stale.status_code, 409)

        duplicate = self.client.post(
            url,
            data=json.dumps({'order': [self.first.slug, self.first.slug]}),
            content_type='application/json',
        )
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(duplicate.json()['error'], 'duplicate_projects')
        self.first.refresh_from_db()
        self.second.refresh_from_db()
        self.assertEqual((self.first.display_order, self.second.display_order), (0, 1))
