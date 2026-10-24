"""Seed demo users + profiles so the public pages have real data.

Usage: python manage.py seed_demo
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import (
    Interest,
    Language,
    Profile,
    ProfileLanguage,
    ProfileSkill,
    Skill,
    SocialLink,
    User,
)

DEMO_PASSWORD = 'Demo#2026'

DEMO_USERS = [
    {
        'phone': '0591000001',
        'full_name': 'أحمد خالد الحسن',
        'handle': 'ahmadkhaled',
        'role': 'student',
        'is_verified': True,
        'email': 'ahmad@example.com',
        'profile': {
            'headline': 'مطوّر واجهات أمامية · طالب هندسة برمجيات',
            'bio': 'أبني واجهات سريعة وجميلة، وأوثّق رحلة التعلّم عبر الشهادات والمشاريع اليومية. مهتم بتجربة المستخدم والمنتجات الرقمية.',
            'city': 'الرياض',
            'country': 'السعودية',
            'website': 'https://ahmadkhaled.dev',
            'education_stage': 'bachelor',
            'school': 'جامعة الملك سعود',
            'grade': 'السنة الثالثة',
            'learning_goals': 'إتقان تطوير الواجهات والوصول إلى مستوى مطوّر متوسط.',
            'skills': [('HTML & CSS', 92), ('JavaScript', 86), ('React', 74), ('UI/UX Design', 70), ('Node.js', 62), ('Git & GitHub', 80), ('Figma', 68), ('Python', 55)],
            'languages': [('العربية', 'native'), ('الإنجليزية', 'fluent')],
            'interests': ['تطوير الويب', 'تصميم الواجهات', 'التعلّم الذاتي'],
            'socials': [('github', 'https://github.com/ahmadkhaled'), ('linkedin', 'https://linkedin.com/in/ahmadkhaled')],
        },
    },
    {
        'phone': '0591000002',
        'full_name': 'سارة المطيري',
        'handle': 'sara.m',
        'role': 'trainer',
        'is_verified': True,
        'email': 'sara@example.com',
        'profile': {
            'headline': 'مدربة تصميم تجربة المستخدم',
            'bio': 'مدربة تصميم UX بخبرة عملية، أدرّب على أبحاث المستخدم والنماذج التفاعلية في Figma.',
            'city': 'جدة',
            'country': 'السعودية',
            'specialization': 'تصميم تجربة المستخدم',
            'experience_years': 7,
            'hourly_rate': 120,
            'availability': 'available',
            'skills': [('Figma', 95), ('User Research', 90), ('Prototyping', 88)],
            'languages': [('العربية', 'native'), ('الإنجليزية', 'fluent')],
            'interests': ['تجربة المستخدم', 'التدريب'],
            'socials': [('behance', 'https://behance.net/sara')],
        },
    },
    {
        'phone': '0591000003',
        'full_name': 'خالد العنزي',
        'handle': 'khaled.a',
        'role': 'student',
        'email': 'khaled@example.com',
        'profile': {
            'headline': 'طالب هندسة برمجيات',
            'bio': 'مهتم بتطوير الويب وأنظمة البيانات.',
            'city': 'الدمام',
            'country': 'السعودية',
            'education_stage': 'bachelor',
            'school': 'جامعة الإمام عبدالرحمن بن فيصل',
            'grade': 'السنة الثانية',
            'skills': [('JavaScript', 70), ('Python', 65)],
            'languages': [('العربية', 'native')],
            'interests': ['البيانات', 'تطوير الويب'],
        },
    },
    {
        'phone': '0591000004',
        'full_name': 'ريم القحطاني',
        'handle': 'reem.o',
        'role': 'trainer',
        'email': 'reem@example.com',
        'profile': {
            'headline': 'مدربة تحليل البيانات',
            'bio': 'أدرّب على Python وتحليل البيانات وتمثيلها بصرياً.',
            'city': 'الرياض',
            'country': 'السعودية',
            'specialization': 'تحليل البيانات',
            'experience_years': 5,
            'hourly_rate': 100,
            'availability': 'open',
            'skills': [('Python', 93), ('Pandas', 90), ('Data Visualization', 84)],
            'languages': [('العربية', 'native'), ('الإنجليزية', 'conversational')],
            'interests': ['البيانات', 'التعليم'],
        },
    },
    {
        'phone': '0591000005',
        'full_name': 'نورة الشمري',
        'handle': 'noura.s',
        'role': 'student',
        'email': 'noura@example.com',
        'profile': {
            'headline': 'طالبة تصميم جرافيك',
            'bio': 'أحب التصميم والهويات البصرية.',
            'city': 'حائل',
            'country': 'السعودية',
            'education_stage': 'diploma',
            'school': 'الكلية التقنية',
            'skills': [('Figma', 72), ('Illustrator', 66)],
            'languages': [('العربية', 'native')],
            'interests': ['التصميم', 'الهوية البصرية'],
        },
    },
    {
        'phone': '0591000006',
        'full_name': 'عبدالله باوزير',
        'handle': 'abdullah.b',
        'role': 'employee',
        'email': 'abdullah@example.com',
        'profile': {
            'headline': 'منسّق برامج تدريبية',
            'bio': 'أنسّق البرامج التدريبية وأتابع رحلة المتدربين.',
            'city': 'مكة المكرمة',
            'country': 'السعودية',
            'whatsapp': '966591000006',
            'skills': [('إدارة المشاريع', 78), ('التواصل', 85)],
            'languages': [('العربية', 'native'), ('الإنجليزية', 'conversational')],
            'interests': ['التدريب', 'تنظيم الفعاليات'],
        },
    },
    {
        'phone': '0591000007',
        'full_name': 'ماجد الدوسري',
        'handle': 'majed.d',
        'role': 'student',
        'email': 'majed@example.com',
        'profile': {
            'headline': 'طالب علوم حاسب',
            'bio': 'أتعلم تطوير التطبيقات وأحب الهاكاثونات.',
            'city': 'الخبر',
            'country': 'السعودية',
            'education_stage': 'bachelor',
            'school': 'جامعة الملك فهد للبترول والمعادن',
            'grade': 'السنة الأولى',
            'skills': [('Python', 60), ('Git & GitHub', 55)],
            'languages': [('العربية', 'native')],
            'interests': ['الهاكاثون', 'تطوير التطبيقات'],
        },
    },
]


class Command(BaseCommand):
    help = 'ينشئ مستخدمين وبروفايلات تجريبية لتعبئة الصفحات العامة'

    @transaction.atomic
    def handle(self, *args, **options):
        created_count = 0
        for data in DEMO_USERS:
            profile_data = data.get('profile', {})
            user, created = User.objects.get_or_create(
                phone=data['phone'],
                defaults={
                    'full_name': data['full_name'],
                    'handle': data['handle'],
                    'role': data['role'],
                    'is_verified': data.get('is_verified', False),
                    'email': data.get('email', ''),
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
                created_count += 1

            profile = user.profile
            profile.headline = profile_data.get('headline', '')
            profile.bio = profile_data.get('bio', '')
            profile.city = profile_data.get('city', '')
            profile.country = profile_data.get('country', '')
            profile.website = profile_data.get('website', '')
            profile.whatsapp = profile_data.get('whatsapp', '')
            profile.specialization = profile_data.get('specialization', '')
            profile.experience_years = profile_data.get('experience_years')
            profile.hourly_rate = profile_data.get('hourly_rate')
            profile.availability = profile_data.get('availability', '')
            profile.education_stage = profile_data.get('education_stage', '')
            profile.school = profile_data.get('school', '')
            profile.grade = profile_data.get('grade', '')
            profile.learning_goals = profile_data.get('learning_goals', '')
            profile.save()

            for name, level in profile_data.get('skills', []):
                skill, _ = Skill.objects.get_or_create(name=name)
                ProfileSkill.objects.update_or_create(
                    profile=profile, skill=skill, defaults={'level': level}
                )

            for name, level in profile_data.get('languages', []):
                language, _ = Language.objects.get_or_create(name=name)
                ProfileLanguage.objects.update_or_create(
                    profile=profile, language=language, defaults={'level': level}
                )

            for name in profile_data.get('interests', []):
                interest, _ = Interest.objects.get_or_create(name=name)
                profile.interests.add(interest)

            for platform, url in profile_data.get('socials', []):
                SocialLink.objects.update_or_create(
                    profile=profile, platform=platform, defaults={'url': url}
                )

        self.stdout.write(self.style.SUCCESS(
            f'تم إنشاء {created_count} مستخدم جديد من أصل {len(DEMO_USERS)} — كلمة المرور: {DEMO_PASSWORD}'
        ))
