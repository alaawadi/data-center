import hashlib
import json
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.core import mail
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone
from .forms import COUNTRY_CALLING_CODES, COUNTRY_CALLING_CODE_CHOICES, ProfileEditForm
from .models import (
    DEFAULT_STUDENT_CATEGORY_NAME,
    DeviceSession,
    FreelancerCategory,
    FreelancerCategory,
    LoginAttempt,
    Profile,
    SignupVerification,
    StudentSetupLink,
    User,
    UserRole,
)
from .models import SignupRateLimit

PHONE = '0591000010'
PASSWORD = 'Demo#2026'

SIGNUP_DATA = {
    'full_name': 'Ahmed Khaled',
    'phone': '0591000040',
    'email': 'ahmed@example.com',
    'password1': 'Sup3r$ecret1',
    'password2': 'Sup3r$ecret1',
}


class UserPhoneValidationTests(TestCase):
    def test_user_phone_requires_exactly_ten_valid_digits(self):
        phone_field = User._meta.get_field('phone')
        self.assertEqual(phone_field.clean('0591234567', None), '0591234567')
        self.assertEqual(phone_field.clean('1234567890', None), '1234567890')
        self.assertEqual(phone_field.clean('+12025550123', None), '+12025550123')

        for phone in ('123456789', '12345678901', '12345abc90', '+02025550123'):
            with self.subTest(phone=phone):
                with self.assertRaises(ValidationError):
                    phone_field.clean(phone, None)


class LoginSecurityTests(TestCase):
    """Brute-force throttling and the 2-device-per-account limit."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse('users:login')
        self.user = User.objects.create(phone=PHONE)
        self.user.set_password(PASSWORD)
        self.user.save()

    def _post(self, phone=PHONE, password=PASSWORD, client=None):
        return (client or self.client).post(self.url, {'username': phone, 'password': password})

    def test_login_page_includes_country_code_picker(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="loginCountryCodePicker"')
        self.assertContains(response, 'id="liCountryCode"')
        self.assertContains(response, 'id="liPhoneValue"')
        self.assertContains(response, 'class="country-code-search"')
        self.assertContains(response, '🇵🇸 +970')
        self.assertGreater(
            len(response.context['form'].fields['country_code'].choices), 200
        )

    def test_successful_login_registers_device(self):
        response = self._post()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(DeviceSession.objects.filter(user=self.user).count(), 1)
        self.assertIn('dc_device', self.client.cookies)

    def test_admin_login_redirects_to_dashboard(self):
        admin = User.objects.create_user(
            phone='0591000012',
            password=PASSWORD,
            full_name='مدير النظام',
            role=UserRole.ADMIN,
        )

        response = self._post(phone=admin.phone)

        self.assertRedirects(response, reverse('dashboard:home'), fetch_redirect_response=False)

    def test_student_login_redirects_to_personal_profile(self):
        response = self._post()

        self.assertRedirects(
            response,
            reverse('portfolio:home'),
            fetch_redirect_response=False,
        )

    def test_existing_palestinian_account_can_log_in_with_international_prefix(self):
        response = self._post(phone='+970' + self.user.phone[1:])

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.wsgi_request.user.is_authenticated)
        self.assertEqual(response.wsgi_request.user.pk, self.user.pk)

    def test_existing_palestinian_account_can_log_in_with_alternate_international_prefix(self):
        response = self._post(phone='+972' + self.user.phone[1:])

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.wsgi_request.user.is_authenticated)
        self.assertEqual(response.wsgi_request.user.pk, self.user.pk)

    def test_plus_970_account_can_log_in_with_plus_972_prefix(self):
        user = User.objects.create_user(
            phone='+970591000043',
            password=PASSWORD,
            full_name='طالب برقم دولي',
        )

        response = self._post(phone='+972591000043')

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.wsgi_request.user.is_authenticated)
        self.assertEqual(response.wsgi_request.user.pk, user.pk)

    def test_plus_972_account_can_log_in_with_plus_970_prefix(self):
        user = User.objects.create_user(
            phone='+972591000044',
            password=PASSWORD,
            full_name='طالب برقم بديل',
        )

        response = self._post(phone='+970591000044')

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.wsgi_request.user.is_authenticated)
        self.assertEqual(response.wsgi_request.user.pk, user.pk)

    def test_local_and_international_numbers_share_login_lockout(self):
        international_phone = '+970' + self.user.phone[1:]
        for _ in range(4):
            self._post(password='wrong')
        self._post(phone=international_phone, password='wrong')

        self.assertEqual(LoginAttempt.objects.filter(phone=PHONE).count(), 5)
        self.assertEqual(self._post().status_code, 429)

    def test_trainer_login_redirects_to_personal_profile(self):
        trainer = User.objects.create_user(
            phone='0591000015',
            password=PASSWORD,
            full_name='مدرب تجربة',
            role=UserRole.TRAINER,
        )

        response = self._post(phone=trainer.phone)

        self.assertRedirects(
            response,
            reverse('portfolio:home'),
            fetch_redirect_response=False,
        )

    def test_login_preserves_local_next_redirect(self):
        next_url = '/projects/target-project/'

        login_page = self.client.get(self.url, {'next': next_url})
        self.assertEqual(login_page.context['next'], next_url)

        response = self.client.post(self.url, {
            'username': PHONE,
            'password': PASSWORD,
            'next': next_url,
        })

        self.assertRedirects(response, next_url, fetch_redirect_response=False)

    def test_same_device_can_login_again(self):
        self._post()
        response = self._post()
        self.assertEqual(response.status_code, 302)
        self.assertEqual(DeviceSession.objects.filter(user=self.user).count(), 1)

    def test_two_devices_allowed_third_blocked(self):
        self._post()
        second = Client()
        self.assertEqual(self._post(client=second).status_code, 302)
        self.assertEqual(DeviceSession.objects.filter(user=self.user).count(), 2)

        third = Client()
        response = self._post(client=third)
        self.assertEqual(response.status_code, 200)
        self.assertIn('جهازين فقط', response.content.decode('utf-8'))
        self.assertEqual(DeviceSession.objects.filter(user=self.user).count(), 2)
        self.assertFalse(response.wsgi_request.user.is_authenticated)

    def test_trainer_can_log_in_from_more_than_two_devices(self):
        trainer = User.objects.create_user(
            phone='0591000013',
            password=PASSWORD,
            full_name='مدرب تجربة',
            role=UserRole.TRAINER,
        )

        clients = [Client(), Client(), Client()]
        responses = [
            self._post(phone=trainer.phone, client=client)
            for client in clients
        ]

        self.assertTrue(all(response.status_code == 302 for response in responses))
        self.assertEqual(DeviceSession.objects.filter(user=trainer).count(), 0)

    def test_admin_can_log_in_from_more_than_two_devices(self):
        admin = User.objects.create_user(
            phone='0591000014',
            password=PASSWORD,
            full_name='مدير تجريبي',
            role=UserRole.ADMIN,
        )

        clients = [Client(), Client(), Client()]
        responses = [
            self._post(phone=admin.phone, client=client)
            for client in clients
        ]

        self.assertTrue(all(response.status_code == 302 for response in responses))
        self.assertEqual(DeviceSession.objects.filter(user=admin).count(), 0)

    def test_logout_frees_device_slot(self):
        self._post()
        response = self.client.post(reverse('users:logout'))
        self.assertEqual(response.status_code, 302)
        self.assertRedirects(
            response,
            reverse('users:login'),
            fetch_redirect_response=False,
        )
        self.assertEqual(DeviceSession.objects.filter(user=self.user).count(), 0)

    def test_failed_attempts_are_recorded(self):
        self._post(password='wrong')
        self.assertEqual(
            LoginAttempt.objects.filter(phone=PHONE, successful=False).count(), 1
        )

    def test_lockout_after_max_attempts(self):
        for _ in range(5):
            response = self._post(password='wrong')
            self.assertEqual(response.status_code, 200)
        self.assertEqual(LoginAttempt.objects.filter(phone=PHONE).count(), 5)

        # Still locked even with the correct password.
        response = self._post(password=PASSWORD)
        self.assertEqual(response.status_code, 429)
        self.assertIn('إيقاف تسجيل الدخول', response.content.decode('utf-8'))
        self.assertFalse(response.wsgi_request.user.is_authenticated)

    def test_successful_login_clears_previous_failures(self):
        for _ in range(4):
            self._post(password='wrong')
        self.assertEqual(LoginAttempt.objects.filter(phone=PHONE).count(), 4)

        self.assertEqual(
            self._post(phone='+970' + self.user.phone[1:]).status_code, 302
        )
        self.assertEqual(LoginAttempt.objects.filter(phone=PHONE).count(), 0)

    def test_failed_login_does_not_authenticate(self):
        response = self._post(password='wrong')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.wsgi_request.user.is_authenticated)

    def test_inactive_account_with_correct_password_gets_actionable_error(self):
        inactive_user = User.objects.create_user(
            phone='0591000011',
            password=PASSWORD,
            full_name='طالب غير نشط',
            is_active=False,
        )

        response = self.client.post(self.url, {
            'username': inactive_user.phone,
            'password': PASSWORD,
        })

        self.assertEqual(response.status_code, 200)
        self.assertIn('الحساب غير نشط', response.content.decode('utf-8'))
        self.assertFalse(response.wsgi_request.user.is_authenticated)


class PhoneCheckTests(TestCase):
    """The live phone-availability endpoint is rate limited."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse('users:phone-check')

    def test_existing_and_free_numbers(self):
        User.objects.create(phone=PHONE)
        taken = self.client.get(self.url, {'phone': PHONE})
        self.assertEqual(taken.status_code, 200)
        self.assertEqual(taken.json(), {'ok': True, 'phone': PHONE, 'available': False})

        free = self.client.get(self.url, {'phone': '0591000020'})
        self.assertEqual(free.json()['available'], True)

    def test_invalid_number_rejected(self):
        self.assertEqual(self.client.get(self.url, {'phone': '123'}).status_code, 400)

    def test_international_number_is_checked_against_legacy_local_number(self):
        User.objects.create(phone='0591000021')

        response = self.client.get(self.url, {'phone': '+970591000021'})

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['available'])

    def test_equivalent_palestinian_international_prefixes_are_unavailable(self):
        User.objects.create(phone='+970591000022')

        plus_972_response = self.client.get(
            self.url, {'phone': '+972591000022'}
        )
        self.assertEqual(plus_972_response.status_code, 200)
        self.assertFalse(plus_972_response.json()['available'])

        User.objects.create(phone='+972591000023')

        plus_970_response = self.client.get(
            self.url, {'phone': '+970591000023'}
        )
        self.assertEqual(plus_970_response.status_code, 200)
        self.assertFalse(plus_970_response.json()['available'])

    def test_rate_limited(self):
        for _ in range(30):
            response = self.client.get(self.url, {'phone': '0591000030'})
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get(self.url, {'phone': '0591000030'}).status_code, 429)


class LegalPageTests(TestCase):
    def test_login_has_whatsapp_password_recovery_link(self):
        response = self.client.get(reverse('users:login'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'https://wa.me/972594810786?text=')
        self.assertContains(response, 'نسيت كلمة المرور؟')

    def test_signup_links_to_terms_and_privacy_pages(self):
        response = self.client.get(reverse('users:signup'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, reverse('users:terms'))
        self.assertContains(response, reverse('users:privacy'))

    def test_terms_and_privacy_pages_render_platform_policies(self):
        terms = self.client.get(reverse('users:terms'))
        privacy = self.client.get(reverse('users:privacy'))

        self.assertEqual(terms.status_code, 200)
        self.assertContains(terms, 'الدورات والخدمات')
        self.assertContains(terms, 'كلمة المرور')
        self.assertEqual(privacy.status_code, 200)
        self.assertContains(privacy, 'المعلومات التي نعالجها')
        self.assertContains(privacy, 'واتساب')


class SignupStepOneTests(TestCase):
    """Create active student accounts that can sign in immediately."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse('users:signup')

    def _signup_data(self, number):
        phone = f'05910000{number:02d}'
        return {
            **SIGNUP_DATA,
            'phone': phone,
            'email': f'user{number}@example.com',
        }

    def test_signup_page_includes_all_country_calling_codes(self):
        response = self.client.get(self.url)
        choices = COUNTRY_CALLING_CODE_CHOICES

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="suCountryCode"')
        self.assertContains(response, 'class="country-code-search"')
        self.assertContains(response, 'ابحث برقم مقدمة الدولة')
        self.assertContains(response, '🇺🇸 +1')
        self.assertContains(response, '🇵🇸 +970')
        self.assertEqual(len(choices), len(COUNTRY_CALLING_CODES))
        for _, label in choices:
            with self.subTest(label=label):
                self.assertTrue(all(0x1F1E6 <= ord(letter) <= 0x1F1FF for letter in label[:2]))
        self.assertGreater(len(response.context['form'].fields['country_code'].choices), 200)

    def test_only_three_accounts_can_be_created_per_ip_in_rolling_24_hours(self):
        for number in range(41, 44):
            response = self.client.post(self.url, self._signup_data(number))
            self.assertEqual(response.status_code, 302)

        response = self.client.post(self.url, self._signup_data(44))

        self.assertEqual(response.status_code, 429)
        self.assertContains(response, 'الحد الأقصى لإنشاء 3 حسابات', status_code=429)
        self.assertEqual(User.objects.filter(role=UserRole.STUDENT).count(), 3)
        quota = SignupRateLimit.objects.get(ip_key='127.0.0.1')
        self.assertEqual(len(quota.signup_timestamps), 3)

    def test_signup_quota_expires_each_registration_after_24_hours(self):
        for number in range(41, 44):
            response = self.client.post(self.url, self._signup_data(number))
            self.assertEqual(response.status_code, 302)

        quota = SignupRateLimit.objects.get(ip_key='127.0.0.1')
        quota.signup_timestamps[0] = timezone.now().timestamp() - 24 * 60 * 60 - 1
        quota.save(update_fields=['signup_timestamps'])

        response = self.client.post(self.url, self._signup_data(44))

        self.assertEqual(response.status_code, 302)
        quota.refresh_from_db()
        self.assertEqual(len(quota.signup_timestamps), 3)

    def test_valid_signup_creates_active_account_and_allows_login_without_email_or_code(self):
        response = self.client.post(self.url, SIGNUP_DATA)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('users:login'))
        user = User.objects.get(phone=SIGNUP_DATA['phone'])
        self.assertEqual(user.email, SIGNUP_DATA['email'])
        self.assertEqual(user.full_name, SIGNUP_DATA['full_name'])
        self.assertEqual(user.role, UserRole.STUDENT)
        self.assertEqual(
            user.profile.specialization, DEFAULT_STUDENT_CATEGORY_NAME
        )
        self.assertTrue(
            FreelancerCategory.objects.filter(
                name=DEFAULT_STUDENT_CATEGORY_NAME, is_active=True
            ).exists()
        )
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password(SIGNUP_DATA['password1']))
        self.assertEqual(len(mail.outbox), 0)
        self.assertNotIn('signup_verification_id', self.client.session)
        self.assertFalse(SignupVerification.objects.exists())

        login_response = self.client.post(reverse('users:login'), {
            'username': SIGNUP_DATA['phone'],
            'password': SIGNUP_DATA['password1'],
        })
        self.assertEqual(login_response.status_code, 302)
        self.assertTrue(login_response.wsgi_request.user.is_authenticated)
        self.assertEqual(login_response.wsgi_request.user.pk, user.pk)
        self.assertEqual(DeviceSession.objects.filter(user=user).count(), 1)

    def test_signup_accepts_international_country_prefix_and_phone_login(self):
        response = self.client.post(self.url, {
            **SIGNUP_DATA,
            'country_code': '+1',
            'phone': '2025550198',
        })

        self.assertEqual(response.status_code, 302)
        user = User.objects.get(phone='+12025550198')
        login_response = self.client.post(reverse('users:login'), {
            'username': user.phone,
            'password': SIGNUP_DATA['password1'],
        })
        self.assertEqual(login_response.status_code, 302)
        self.assertEqual(login_response.wsgi_request.user.pk, user.pk)

    def test_signup_stores_selected_palestinian_prefix_with_national_number(self):
        response = self.client.post(self.url, {
            **SIGNUP_DATA,
            'country_code': '+970',
            'phone': '0591000042',
        })

        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(phone='+970591000042').exists())

    def test_signup_accepts_nine_digit_local_phone_with_country_code(self):
        response = self.client.post(self.url, {
            **SIGNUP_DATA,
            'country_code': '+970',
            'phone': '591000042',
        })

        self.assertEqual(response.status_code, 302)
        self.assertTrue(User.objects.filter(phone='+970591000042').exists())

    def test_signup_with_palestinian_prefix_rejects_existing_legacy_number(self):
        User.objects.create(phone='0591000040')

        response = self.client.post(self.url, {
            **SIGNUP_DATA,
            'country_code': '+970',
        })

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['form'].has_error('phone'))

    def test_signup_rejects_equivalent_palestinian_international_prefixes(self):
        cases = (
            ('+970591000045', '+972', '591000045'),
            ('+972591000046', '+970', '591000046'),
        )
        for existing_phone, submitted_prefix, submitted_phone in cases:
            with self.subTest(existing_phone=existing_phone):
                User.objects.create(phone=existing_phone)

                response = self.client.post(self.url, {
                    **SIGNUP_DATA,
                    'country_code': submitted_prefix,
                    'phone': submitted_phone,
                })

                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.context['form'].has_error('phone'))
                self.assertFalse(
                    User.objects.filter(phone='+' + submitted_prefix[1:] + submitted_phone).exists()
                )

    def test_signup_preserves_password_whitespace_for_login(self):
        password = ' Sup3r$ecret1 '
        response = self.client.post(self.url, {
            **SIGNUP_DATA,
            'phone': '0591000041',
            'email': 'spaced@example.com',
            'password1': password,
            'password2': password,
        })
        self.assertEqual(response.status_code, 302)

        user = User.objects.get(phone='0591000041')
        self.assertTrue(user.check_password(password))
        login_response = self.client.post(reverse('users:login'), {
            'username': user.phone,
            'password': password,
        })
        self.assertEqual(login_response.status_code, 302)
        self.assertTrue(login_response.wsgi_request.user.is_authenticated)

    def test_duplicate_phone_rejected(self):
        User.objects.create(phone=SIGNUP_DATA['phone'])
        response = self.client.post(self.url, SIGNUP_DATA)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(SignupVerification.objects.exists())
        self.assertFalse(User.objects.filter(email=SIGNUP_DATA['email']).exists())

    def test_duplicate_email_rejected(self):
        User.objects.create(phone='0591000099', email=SIGNUP_DATA['email'])
        response = self.client.post(self.url, SIGNUP_DATA)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(SignupVerification.objects.exists())

    def test_full_name_needs_two_to_three_words(self):
        for bad in ('Test', 'One Two Three Four'):
            response = self.client.post(self.url, {**SIGNUP_DATA, 'full_name': bad})
            self.assertEqual(response.status_code, 200)
        self.assertFalse(SignupVerification.objects.exists())

    def test_invalid_email_rejected(self):
        response = self.client.post(self.url, {**SIGNUP_DATA, 'email': 'not-an-email'})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(SignupVerification.objects.exists())


    def test_legacy_verification_endpoint_cannot_create_an_account(self):
        pending = SignupVerification.objects.create(
            phone=SIGNUP_DATA['phone'],
            full_name=SIGNUP_DATA['full_name'],
            email=SIGNUP_DATA['email'],
            password_hash=make_password(SIGNUP_DATA['password1']),
            code_hash=make_password('123456'),
        )
        session = self.client.session
        session['signup_verification_id'] = pending.pk
        session.save()

        response = self.client.post(reverse('users:verify-signup'), {'code': '123456'})

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('users:signup'))
        self.assertFalse(User.objects.filter(phone=SIGNUP_DATA['phone']).exists())
        self.assertFalse(SignupVerification.objects.filter(pk=pending.pk).exists())


class ProfileVerificationTests(TestCase):
    def test_profile_whatsapp_check_detects_other_user_across_palestinian_prefixes(self):
        current_user = User.objects.create_user(
            phone='0591000065',
            password='pass1234',
            full_name='المستخدم الحالي',
            role=UserRole.STUDENT,
        )
        User.objects.create_user(
            phone='+972599999997',
            password='pass1234',
            full_name='مستخدم آخر',
            role=UserRole.STUDENT,
        )
        self.client.force_login(current_user)

        response = self.client.get(
            reverse('users:profile-whatsapp-check'),
            {'phone': '+970599999997'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['available'])
        self.assertTrue(response.json()['belongsToAnotherUser'])

    def test_profile_whatsapp_check_allows_current_users_own_phone(self):
        user = User.objects.create_user(
            phone='+972599999996',
            password='pass1234',
            full_name='صاحب الرقم',
            role=UserRole.STUDENT,
        )
        self.client.force_login(user)

        response = self.client.get(
            reverse('users:profile-whatsapp-check'),
            {'phone': '+970599999996'},
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['available'])
        self.assertFalse(response.json()['belongsToAnotherUser'])

    def test_profile_update_rejects_whatsapp_owned_by_another_user(self):
        user = User.objects.create_user(
            phone='0591000064',
            password='pass1234',
            full_name='مستخدم تجربة',
            role=UserRole.STUDENT,
        )
        User.objects.create_user(
            phone='+970599999995',
            password='pass1234',
            full_name='مستخدم آخر',
            role=UserRole.STUDENT,
        )
        self.client.force_login(user)
        original_whatsapp = user.profile.whatsapp

        response = self.client.post(reverse('users:profile-update'), {
            'profile_form': '1',
            'full_name': user.full_name,
            'full_name_ar': '',
            'full_name_en': '',
            'whatsapp': '+972599999995',
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()['error'],
            'whatsapp_belongs_to_another_user',
        )
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.whatsapp, original_whatsapp)

    def test_profile_update_accepts_only_supported_whatsapp_formats_and_letter_names(self):
        user = User.objects.create_user(
            phone='0591000067',
            password='pass1234',
            full_name='مستخدم تجربة',
            role=UserRole.STUDENT,
        )
        self.client.force_login(user)
        url = reverse('users:profile-update')
        base_data = {
            'profile_form': '1',
            'full_name': 'محمد أحمد',
            'email': 'valid@example.com',
            'full_name_ar': '',
            'full_name_en': '',
        }

        for whatsapp in (
            '+972599999999',
            '+970599999999',
            '972599999999',
            '970599999999',
            '+12025550198',
        ):
            response = self.client.post(url, {**base_data, 'whatsapp': whatsapp})
            self.assertEqual(response.status_code, 200, whatsapp)
            self.assertEqual(response.json()['profile']['whatsapp'], whatsapp)
            self.assertIn('profile_setup', response.json())
            self.assertEqual(response.json()['profile_setup']['percent'], 20)

        for whatsapp, normalized in (
            ('+9720599999999', '+972599999999'),
            ('+9700599999999', '+970599999999'),
            ('9720599999999', '972599999999'),
            ('9700599999999', '970599999999'),
        ):
            response = self.client.post(url, {**base_data, 'whatsapp': whatsapp})
            self.assertEqual(response.status_code, 200, whatsapp)
            self.assertEqual(response.json()['profile']['whatsapp'], normalized)

        for whatsapp in (
            '+97259999999',
            '+972059999999',
            '9725999999999',
            '+02025550198',
            '0599999999',
        ):
            response = self.client.post(url, {**base_data, 'whatsapp': whatsapp})
            self.assertEqual(response.status_code, 400, whatsapp)
            self.assertEqual(response.json()['error'], 'invalid_whatsapp')

        for name in ('محمد أحمد2', 'محمد أحمد!', 'One'):
            response = self.client.post(url, {
                **base_data,
                'full_name': name,
                'whatsapp': '+972599999999',
            })
            self.assertEqual(response.status_code, 400, name)
            self.assertEqual(response.json()['error'], 'invalid_name')

    def test_profile_modal_saves_international_whatsapp_number(self):
        user = User.objects.create_user(
            phone='0591000066',
            password='pass1234',
            full_name='مستخدم تجربة',
            role=UserRole.STUDENT,
        )
        self.client.force_login(user)

        response = self.client.post(reverse('users:profile-update'), {
            'profile_form': '1',
            'full_name': user.full_name,
            'full_name_ar': '',
            'full_name_en': '',
            'whatsapp': '+12025550198',
        })

        self.assertEqual(response.status_code, 200, response.content)
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.whatsapp, '+12025550198')
        self.assertEqual(response.json()['profile']['whatsapp'], '+12025550198')

    def test_profile_modal_keeps_account_email_unchanged_for_trainers_and_students(self):
        for index, role in enumerate((UserRole.STUDENT, UserRole.TRAINER), start=1):
            user = User.objects.create_user(
                phone=f'059100006{index}',
                password='pass1234',
                full_name='مستخدم تجربة',
                email=f'before-{index}@example.com',
                role=role,
            )
            self.client.force_login(user)
            url = reverse('users:profile-update')
            common_data = {
                'profile_form': '1',
                'full_name': user.full_name,
            }
            if role == UserRole.STUDENT:
                common_data.update({'full_name_ar': '', 'full_name_en': ''})
            else:
                common_data['trainer_name_en'] = ''

            missing_whatsapp = self.client.post(url, common_data)
            self.assertEqual(missing_whatsapp.status_code, 400)
            self.assertEqual(missing_whatsapp.json()['error'], 'required_whatsapp')

            invalid_whatsapp = self.client.post(url, {
                **common_data,
                'whatsapp': 'not-a-number',
            })
            self.assertEqual(invalid_whatsapp.status_code, 400)
            self.assertEqual(invalid_whatsapp.json()['error'], 'invalid_whatsapp')

            valid_update = self.client.post(url, {
                **common_data,
                'whatsapp': '+970599999999',
                'email': 'changed@example.com',
            })
            self.assertEqual(valid_update.status_code, 200, valid_update.content)
            user.refresh_from_db()
            self.assertEqual(user.email, f'before-{index}@example.com')
            self.assertEqual(user.profile.whatsapp, '+970599999999')

    def test_trainer_profile_modal_saves_social_accounts(self):
        trainer = User.objects.create_user(
            phone='0591000071',
            password='pass1234',
            full_name='مدرب تجربة',
            email='trainer@example.com',
            role=UserRole.TRAINER,
        )
        trainer.profile.website = 'https://trainer.example'
        trainer.profile.save(update_fields=['website'])
        self.client.force_login(trainer)

        response = self.client.post(reverse('users:profile-update'), {
            'profile_form': '1',
            'full_name': trainer.full_name,
            'trainer_name_en': '',
            'headline': '',
            'whatsapp': '+970599999999',
            'email': 'changed@example.com',
            'website': 'https://changed.example',
            'social_links': json.dumps([
                {'platform': 'linkedin', 'url': 'https://linkedin.com/in/trainer'},
                {'platform': 'instagram', 'url': 'https://instagram.com/trainer'},
                {'platform': 'whatsapp', 'url': 'https://wa.me/970599999999'},
            ]),
        })

        self.assertEqual(response.status_code, 200, response.content)
        trainer.refresh_from_db()
        self.assertEqual(trainer.email, 'trainer@example.com')
        self.assertEqual(trainer.profile.website, 'https://trainer.example')
        self.assertEqual(
            list(trainer.profile.social_links.order_by('platform').values_list(
                'platform', 'url'
            )),
            [
                ('instagram', 'https://instagram.com/trainer'),
                ('linkedin', 'https://linkedin.com/in/trainer'),
                ('whatsapp', 'https://wa.me/970599999999'),
            ],
        )
        self.assertIn(
            {
                'platform': 'واتساب',
                'platform_key': 'whatsapp',
                'url': 'https://wa.me/970599999999',
            },
            response.json()['profile']['social_links'],
        )

    def test_student_profile_modal_saves_specialization_and_multiple_social_links_without_email(self):
        student = User.objects.create_user(
            phone='0591000068',
            password='pass1234',
            full_name='طالب تجربة',
            email='keep@example.com',
            role=UserRole.STUDENT,
        )
        self.client.force_login(student)
        category = FreelancerCategory.objects.create(name='البرمجة')

        response = self.client.post(reverse('users:profile-update'), {
            'profile_form': '1',
            'full_name': student.full_name,
            'full_name_ar': '',
            'full_name_en': '',
            'headline': category.name,
            'student_specialization': 'هندسة برمجيات',
            'whatsapp': '+970599999999',
            'social_links': json.dumps([
                {'platform': 'github', 'url': 'https://github.com/student'},
                {'platform': 'linkedin', 'url': 'https://linkedin.com/in/student'},
            ]),
        })

        self.assertEqual(response.status_code, 200, response.content)
        student.refresh_from_db()
        self.assertEqual(student.email, 'keep@example.com')
        self.assertEqual(student.profile.headline, category.name)
        self.assertEqual(student.profile.specialization, category.name)
        self.assertEqual(student.profile.student_specialization, 'هندسة برمجيات')
        self.assertEqual(response.json()['profile']['headline'], category.name)
        self.assertEqual(response.json()['profile']['specialization'], category.name)
        self.assertEqual(
            list(student.profile.social_links.order_by('platform').values_list(
                'platform', 'url'
            )),
            [
                ('github', 'https://github.com/student'),
                ('linkedin', 'https://linkedin.com/in/student'),
            ],
        )
        self.assertEqual(
            {item['platform_key'] for item in response.json()['profile']['social_links']},
            {'github', 'linkedin'},
        )

    def test_student_profile_modal_rejects_long_specialization_and_invalid_social_links(self):
        student = User.objects.create_user(
            phone='0591000069',
            password='pass1234',
            full_name='طالب تجربة',
            role=UserRole.STUDENT,
        )
        self.client.force_login(student)
        base_data = {
            'profile_form': '1',
            'full_name': student.full_name,
            'full_name_ar': '',
            'full_name_en': '',
            'whatsapp': '+970599999999',
            'student_specialization': 'س' * 31,
            'social_links': '[]',
        }

        response = self.client.post(reverse('users:profile-update'), base_data)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'invalid_specialization')

        response = self.client.post(reverse('users:profile-update'), {
            **base_data,
            'student_specialization': 'برمجة',
            'social_links': json.dumps([
                {'platform': 'github', 'url': 'not-a-url'},
            ]),
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'invalid_social_links')

    def test_student_profile_edit_page_uses_specialization_and_social_links_instead_of_email_website(self):
        student = User.objects.create_user(
            phone='0591000070',
            password='pass1234',
            full_name='طالب تجربة',
            email='student@example.com',
            role=UserRole.STUDENT,
        )
        self.client.force_login(student)

        response = self.client.get(reverse('users:profile-edit'))

        self.assertEqual(response.status_code, 200)
        self.assertNotIn('email', response.context['form'].fields)
        self.assertNotIn('website', response.context['form'].fields)
        self.assertContains(response, 'id="id_student_specialization"')
        self.assertContains(response, 'maxlength="30"')
        self.assertContains(response, 'id="add-social-link-btn"')
        self.assertNotContains(response, 'id="id_email"')
        self.assertNotContains(response, 'id="id_website"')

    def test_profile_update_does_not_allow_student_to_set_verified_badge(self):
        student = User.objects.create_user(
            phone='0591000050',
            password=PASSWORD,
            full_name='طالب تجربة',
            role=UserRole.STUDENT,
            is_verified=True,
        )
        self.client.force_login(student)

        response = self.client.post(reverse('users:profile-update'), {
            'full_name': student.full_name,
            'is_verified': '1',
        })

        self.assertEqual(response.status_code, 200)
        student.refresh_from_db()
        self.assertFalse(student.is_verified)
        self.assertFalse(response.json()['profile']['verified'])

    def test_profile_update_automatically_verifies_trainers(self):
        trainer = User.objects.create_user(
            phone='0591000051',
            password=PASSWORD,
            full_name='مدرب تجربة',
            role=UserRole.TRAINER,
            is_verified=False,
        )
        self.client.force_login(trainer)

        response = self.client.post(reverse('users:profile-update'), {
            'full_name': trainer.full_name,
        })

        self.assertEqual(response.status_code, 200)
        trainer.refresh_from_db()
        self.assertTrue(trainer.is_verified)
        self.assertTrue(response.json()['profile']['verified'])


class LegalCertificateNameTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone='0591000052',
            password=PASSWORD,
            full_name='طالب تجربة',
            role=UserRole.STUDENT,
        )

    def test_profile_update_saves_both_names_and_rejects_later_changes(self):
        self.client.force_login(self.user)
        url = reverse('users:profile-update')
        data = {
            'full_name': self.user.full_name,
            'full_name_ar': 'أحمد خالد الحسن',
            'full_name_en': 'Ahmad Khaled Alhasan',
        }

        response = self.client.post(url, data)

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name_ar, data['full_name_ar'])
        self.assertEqual(self.user.full_name_en, data['full_name_en'])
        self.assertEqual(response.json()['profile']['fullNameArabic'], data['full_name_ar'])
        self.assertEqual(response.json()['profile']['fullNameEnglish'], data['full_name_en'])

        changed = self.client.post(url, {
            **data,
            'full_name_ar': 'محمد علي حسن',
            'full_name_en': 'Mohammad Ali Hassan',
        })

        self.assertEqual(changed.status_code, 409)
        self.assertEqual(changed.json()['error'], 'legal_name_locked')
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name_ar, data['full_name_ar'])
        self.assertEqual(self.user.full_name_en, data['full_name_en'])

    def test_profile_update_requires_both_names_and_valid_three_part_names(self):
        self.client.force_login(self.user)
        url = reverse('users:profile-update')

        partial = self.client.post(url, {
            'full_name_ar': 'أحمد خالد الحسن',
        })
        invalid = self.client.post(url, {
            'full_name_ar': 'أحمد خالد الحسن',
            'full_name_en': 'Ahmad Khaled',
        })
        invalid_language_or_digits = [
            {
                'full_name_ar': 'أحمد خالد 3',
                'full_name_en': 'Ahmad Khaled Alhasan',
            },
            {
                'full_name_ar': 'أحمد خالد الحسن',
                'full_name_en': 'Ahmad Khaled 3',
            },
            {
                'full_name_ar': 'Ahmed Khaled Alhasan',
                'full_name_en': 'Ahmad Khaled Alhasan',
            },
            {
                'full_name_ar': 'أحمد خالد الحسن',
                'full_name_en': 'أحمد خالد الحسن',
            },
        ]

        self.assertEqual(partial.status_code, 400)
        self.assertEqual(partial.json()['error'], 'legal_name_pair_required')
        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(invalid.json()['error'], 'invalid_legal_name')
        for invalid_names in invalid_language_or_digits:
            with self.subTest(invalid_names=invalid_names):
                response = self.client.post(url, invalid_names)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()['error'], 'invalid_legal_name')
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name_ar, '')
        self.assertEqual(self.user.full_name_en, '')

    def test_profile_update_accepts_up_to_six_name_parts_and_rejects_more(self):
        self.client.force_login(self.user)
        url = reverse('users:profile-update')
        arabic_name = 'أحمد محمد خالد عبد الرحمن الحسن'
        english_name = 'Ahmad Mohammad Khaled Abdul Rahman Alhasan'

        rejected = self.client.post(url, {
            'full_name_ar': 'أحمد محمد خالد عبد الرحمن يوسف الحسن',
            'full_name_en': 'Ahmad Mohammad Khaled Abdul Rahman Yusuf Alhasan',
        })

        self.assertEqual(rejected.status_code, 400)
        self.assertEqual(rejected.json()['error'], 'invalid_legal_name')

        accepted = self.client.post(url, {
            'full_name_ar': arabic_name,
            'full_name_en': english_name,
        })

        self.assertEqual(accepted.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name_ar, arabic_name)
        self.assertEqual(self.user.full_name_en, english_name)

    def test_saved_names_are_disabled_in_profile_edit_form(self):
        self.user.full_name_ar = 'أحمد خالد الحسن'
        self.user.full_name_en = 'Ahmad Khaled Alhasan'
        self.user.save()
        profile, _ = Profile.objects.get_or_create(user=self.user)

        form = ProfileEditForm(instance=profile)

        self.assertTrue(form.fields['full_name_ar'].disabled)
        self.assertTrue(form.fields['full_name_en'].disabled)

    def test_professional_title_only_accepts_active_freelancer_categories(self):
        category = FreelancerCategory.objects.create(name='تصميم واجهات')
        inactive_category = FreelancerCategory.objects.create(
            name='تحليل بيانات', is_active=False
        )
        profile, _ = Profile.objects.get_or_create(user=self.user)

        valid_form = ProfileEditForm(
            data={
                'headline': category.name,
                'gender': 'unspecified',
                'skills_count': '1',
                'skill_1': '',
            },
            instance=profile,
        )
        self.assertTrue(valid_form.is_valid(), valid_form.errors)
        valid_form.save()
        profile.refresh_from_db()
        self.assertEqual(profile.headline, category.name)
        self.assertEqual(profile.specialization, category.name)

        for invalid_title in (inactive_category.name, 'مسمى غير مسجل'):
            with self.subTest(invalid_title=invalid_title):
                invalid_form = ProfileEditForm(
                    data={
                        'headline': invalid_title,
                        'gender': 'unspecified',
                        'skills_count': '1',
                        'skill_1': '',
                    },
                    instance=profile,
                )
                self.assertFalse(invalid_form.is_valid())
                self.assertIn('headline', invalid_form.errors)

    def test_profile_category_updates_freelancer_listing_and_admin_counts(self):
        category = FreelancerCategory.objects.create(name='تصميم واجهات')
        profile, _ = Profile.objects.get_or_create(user=self.user)
        self.client.force_login(self.user)

        saved = self.client.post(reverse('users:profile-edit'), {
            'full_name': self.user.full_name,
            'email': self.user.email,
            'headline': category.name,
            'student_specialization': 'هندسة برمجيات',
            'gender': 'unspecified',
            'is_public': 'on',
            'skills_count': '1',
            'skill_1': '',
            'socials-TOTAL_FORMS': '2',
            'socials-INITIAL_FORMS': '0',
            'socials-MIN_NUM_FORMS': '0',
            'socials-MAX_NUM_FORMS': '1000',
        })

        self.assertEqual(saved.status_code, 302)
        profile.refresh_from_db()
        self.assertEqual(profile.headline, category.name)
        self.assertEqual(profile.specialization, category.name)
        self.assertEqual(profile.student_specialization, 'هندسة برمجيات')

        listing = self.client.get(reverse('accounts:list'))
        self.assertEqual(listing.status_code, 200)
        self.assertIn(category.name, listing.context['training_categories_json'])
        listed_profile = next(
            item for item in listing.context['profiles_json']
            if item['handle'] == self.user.handle
        )
        self.assertEqual(listed_profile['title'], category.name)
        self.assertEqual(listed_profile['specialization'], category.name)

        trainer = User.objects.create_user(
            phone='0591000057',
            password='trainer-pass',
            full_name='مدرب تجربة',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)
        trainer_saved = self.client.post(reverse('users:profile-edit'), {
            'full_name': trainer.full_name,
            'email': trainer.email,
            'headline': category.name,
            'gender': 'unspecified',
            'is_public': 'on',
            'skills_count': '1',
            'skill_1': '',
            'socials-TOTAL_FORMS': '2',
            'socials-INITIAL_FORMS': '0',
            'socials-MIN_NUM_FORMS': '0',
            'socials-MAX_NUM_FORMS': '1000',
            'socials-0-platform': 'linkedin',
            'socials-0-url': 'https://linkedin.com/in/trainer',
        })
        self.assertEqual(trainer_saved.status_code, 302)
        self.assertEqual(
            list(trainer.profile.social_links.values_list('platform', 'url')),
            [('linkedin', 'https://linkedin.com/in/trainer')],
        )

        admin = User.objects.create_user(
            phone='0591000056',
            password='admin-pass',
            full_name='مدير الفئات',
            role=UserRole.ADMIN,
        )
        self.client.force_login(admin)
        counts = self.client.get(reverse('dashboard:freelancer-categories'))
        category_data = next(
            item for item in counts.json()['categories']
            if item['id'] == category.pk
        )
        self.assertEqual(category_data['students'], 1)
        self.assertEqual(category_data['trainers'], 1)

    def test_trainer_profile_explains_english_certificate_name(self):
        category = FreelancerCategory.objects.create(name='تطوير الويب')
        trainer = User.objects.create_user(
            phone='0591000053',
            password='pass1234',
            full_name='مدرب تجربة',
            email='trainer@example.com',
            full_name_ar='مدرب تجربة أول',
            full_name_en='Trainer Example Name',
            role=UserRole.TRAINER,
        )
        profile, _ = Profile.objects.get_or_create(user=trainer)
        profile.website = 'https://trainer.example'
        profile.save(update_fields=['website'])

        form = ProfileEditForm(instance=profile)

        self.assertNotIn('full_name_ar', form.fields)
        self.assertNotIn('full_name_en', form.fields)
        self.assertNotIn('email', form.fields)
        self.assertNotIn('website', form.fields)
        self.assertIn('بالإنجليزية', form.fields['trainer_name_en'].label)
        self.assertIn('شهادات دوراتك', form.fields['trainer_name_en'].help_text)
        self.assertEqual(form.fields['trainer_name_en'].initial, 'Trainer Example Name')
        self.assertIn('data-freelancer-category-combobox', form.fields['headline'].widget.attrs)

        self.client.force_login(trainer)
        response = self.client.get(reverse('users:profile-edit'))
        self.assertEqual(response.status_code, 200)
        self.assertIn(
            category.name, response.context['freelancer_category_options']
        )
        self.assertContains(response, 'id="freelancer-category-options"')
        self.assertContains(response, 'id="id_trainer_name_en"')
        self.assertContains(response, 'حسابات التواصل الاجتماعي')
        self.assertContains(response, 'id="add-social-link-btn"')
        self.assertContains(response, 'value="whatsapp"')
        self.assertNotContains(response, 'id="id_email"')
        self.assertNotContains(response, 'id="id_website"')
        self.assertNotContains(response, 'id="id_full_name_ar"')
        self.assertNotContains(response, 'id="id_full_name_en"')

        form = ProfileEditForm(
            data={
                'full_name': trainer.full_name,
                'trainer_name_en': 'Jordan Doe',
                'gender': 'unspecified',
                'skills_count': '1',
                'skill_1': '',
            },
            instance=profile,
        )
        self.assertTrue(form.is_valid(), form.errors)
        form.save()
        trainer.refresh_from_db()
        self.assertEqual(trainer.trainer_name_en, 'Jordan Doe')
        self.assertEqual(trainer.email, 'trainer@example.com')
        self.assertEqual(trainer.profile.website, 'https://trainer.example')
        self.assertEqual(trainer.full_name_ar, 'مدرب تجربة أول')
        self.assertEqual(trainer.full_name_en, 'Trainer Example Name')

    def test_trainer_ajax_updates_certificate_name_without_legal_name_fields(self):
        trainer = User.objects.create_user(
            phone='0591000054',
            password='pass1234',
            full_name='مدرب تجربة',
            full_name_ar='مدرب تجربة أول',
            full_name_en='Trainer Example Name',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)

        response = self.client.post(reverse('users:profile-update'), {
            'trainer_name_en': 'Jordan Doe',
            'whatsapp': '+970599999999',
            'full_name_ar': 'Changed Arabic Name',
            'full_name_en': 'Changed English Name',
        })

        self.assertEqual(response.status_code, 200)
        trainer.refresh_from_db()
        self.assertEqual(trainer.trainer_name_en, 'Jordan Doe')
        self.assertEqual(trainer.full_name_ar, 'مدرب تجربة أول')
        self.assertEqual(trainer.full_name_en, 'Trainer Example Name')
        self.assertEqual(trainer.profile.whatsapp, '+970599999999')
        self.assertEqual(response.json()['profile']['trainerNameEnglish'], 'Jordan Doe')
        self.assertEqual(response.json()['profile']['whatsapp'], '+970599999999')

    def test_trainer_ajax_rejects_invalid_whatsapp(self):
        trainer = User.objects.create_user(
            phone='0591000055',
            password='pass1234',
            full_name='مدرب تجربة',
            role=UserRole.TRAINER,
        )
        self.client.force_login(trainer)

        response = self.client.post(reverse('users:profile-update'), {
            'whatsapp': '+1234567890123',
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'invalid_whatsapp')
        self.assertEqual(trainer.profile.whatsapp, '')

    def test_model_rejects_changing_a_saved_legal_name(self):
        self.user.full_name_ar = 'أحمد خالد الحسن'
        self.user.full_name_en = 'Ahmad Khaled Alhasan'
        self.user.save()
        self.user.full_name_ar = 'محمد علي حسن'

        with self.assertRaises(ValidationError):
            self.user.save()


class AdminProfileEditingTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            phone='0591000091', password='pass1234', full_name='مدير النظام',
            role=UserRole.ADMIN,
        )
        self.trainer = User.objects.create_user(
            phone='0591000092', password='pass1234', full_name='مدرب تجريبي',
            role=UserRole.TRAINER,
        )
        self.profile, _ = Profile.objects.get_or_create(user=self.trainer)
        self.profile.is_public = True
        self.profile.save(update_fields=['is_public'])
        self.edit_url = reverse('users:profile-edit') + f'?user_id={self.trainer.pk}'

    def test_admin_can_open_another_trainer_profile_for_editing(self):
        self.client.force_login(self.admin)

        response = self.client.get(self.edit_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['object'].user, self.trainer)
        self.assertContains(response, 'تعديل بروفايل')
        self.assertContains(response, 'id="id_trainer_name_en"')

    def test_admin_can_save_another_trainer_profile(self):
        self.client.force_login(self.admin)

        response = self.client.post(self.edit_url, {
            'full_name': 'اسم المدرب المعدل',
            'email': '',
            'trainer_name_en': 'Trainer Example',
            'gender': 'unspecified',
            'skills_count': '1',
            'skill_1': 'برمجة',
            'socials-TOTAL_FORMS': '2',
            'socials-INITIAL_FORMS': '0',
            'socials-MIN_NUM_FORMS': '0',
            'socials-MAX_NUM_FORMS': '1000',
        })

        self.assertEqual(response.status_code, 302)
        self.trainer.refresh_from_db()
        self.assertEqual(self.trainer.full_name, 'اسم المدرب المعدل')
        self.assertEqual(self.trainer.trainer_name_en, 'Trainer Example')

    def test_admin_profile_modal_endpoint_updates_target_profile(self):
        self.client.force_login(self.admin)
        category = FreelancerCategory.objects.create(name='البرمجة')

        response = self.client.post(reverse('users:profile-update'), {
            'target_user_id': str(self.trainer.pk),
            'full_name': 'اسم المدرب المعدل',
            'trainer_name_en': 'Trainer Example',
            'headline': category.name,
            'bio': 'نبذة جديدة',
            'email': 'trainer@example.com',
            'website': 'https://example.com',
            'skills': '[{"name":"برمجة","level":80}]',
        })

        self.assertEqual(response.status_code, 200, response.content)
        self.trainer.refresh_from_db()
        self.profile.refresh_from_db()
        self.assertEqual(self.trainer.full_name, 'اسم المدرب المعدل')
        self.assertEqual(self.trainer.trainer_name_en, 'Trainer Example')
        self.assertEqual(self.profile.headline, category.name)
        self.assertEqual(self.profile.specialization, category.name)
        self.assertEqual(self.profile.bio, 'نبذة جديدة')
        self.assertEqual(
            list(self.profile.profile_skills.values_list('skill__name', flat=True)),
            ['برمجة'],
        )

    def test_profile_modal_rejects_inactive_professional_category(self):
        inactive_category = FreelancerCategory.objects.create(
            name='تصميم قديم', is_active=False
        )
        self.client.force_login(self.admin)

        response = self.client.post(reverse('users:profile-update'), {
            'target_user_id': str(self.trainer.pk),
            'headline': inactive_category.name,
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'invalid_headline')
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.headline, '')
        self.assertEqual(self.profile.specialization, '')

    def test_admin_can_change_student_legal_names_multiple_times(self):
        student = User.objects.create_user(
            phone='0591000093', password='pass1234', full_name='طالب تجريبي',
            role=UserRole.STUDENT,
        )
        self.client.force_login(self.admin)
        url = reverse('users:profile-update')
        names = [
            ('أحمد خالد الحسن', 'Ahmad Khaled Alhasan'),
            ('محمد علي حسن', 'Mohammad Ali Hassan'),
        ]

        for full_name_ar, full_name_en in names:
            response = self.client.post(url, {
                'target_user_id': str(student.pk),
                'full_name': 'طالب تجريبي',
                'full_name_ar': full_name_ar,
                'full_name_en': full_name_en,
            })
            self.assertEqual(response.status_code, 200, response.content)
            student.refresh_from_db()
            self.assertEqual(student.full_name_ar, full_name_ar)
            self.assertEqual(student.full_name_en, full_name_en)

    def test_non_admin_cannot_update_another_profile_through_modal_endpoint(self):
        self.client.force_login(self.trainer)

        response = self.client.post(reverse('users:profile-update'), {
            'target_user_id': str(self.admin.pk),
            'full_name': 'تم التغيير',
        })

        self.assertEqual(response.status_code, 403)
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.full_name, 'مدير النظام')

    def test_non_admin_cannot_select_another_profile_for_editing(self):
        self.client.force_login(self.trainer)

        response = self.client.get(
            reverse('users:profile-edit') + f'?user_id={self.admin.pk}'
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_edit_button_is_only_injected_for_admin(self):
        profile_url = reverse('accounts:profile', kwargs={'handle': self.trainer.handle})

        self.client.force_login(self.admin)
        admin_response = self.client.get(profile_url)
        self.assertIn('adminTargetUserId', admin_response.context['profile_json'])
        self.assertEqual(
            admin_response.context['profile_json']['accountPhone'],
            self.trainer.phone,
        )

        self.client.force_login(self.trainer)
        owner_response = self.client.get(profile_url)
        self.assertNotIn('adminTargetUserId', owner_response.context['profile_json'])
        self.assertNotIn('accountPhone', owner_response.context['profile_json'])


class StudentSetupLinkTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            phone='0594567891',
            full_name='محمد أحمد علي حسن',
            role=UserRole.STUDENT,
        )
        self.user.set_unusable_password()
        self.user.save(update_fields=['password'])
        self.token = 'test-student-setup-token'
        self.link = StudentSetupLink.objects.create(
            user=self.user,
            token_hash=hashlib.sha256(self.token.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(days=1),
        )
        self.url = reverse('users:student-setup', kwargs={'token': self.token})

    def test_setup_sets_password_logs_in_and_redirects_to_student_profile(self):
        response = self.client.post(self.url, {
            'password': 'Very-Strong!9-password',
            'password_confirm': 'Very-Strong!9-password',
        })

        self.assertEqual(response.status_code, 302)
        self.assertRedirects(
            response,
            reverse('accounts:profile', kwargs={'handle': self.user.handle}),
            fetch_redirect_response=False,
        )
        self.user.refresh_from_db()
        self.link.refresh_from_db()
        self.assertTrue(self.user.has_usable_password())
        self.assertIsNotNone(self.link.consumed_at)
        self.assertEqual(self.client.session['_auth_user_id'], str(self.user.pk))
        self.assertEqual(DeviceSession.objects.filter(user=self.user).count(), 1)

    def test_setup_link_is_single_use(self):
        self.client.post(self.url, {
            'password': 'Very-Strong!9-password',
            'password_confirm': 'Very-Strong!9-password',
        })

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 410)

    def test_expired_setup_link_is_rejected(self):
        self.link.expires_at = timezone.now() - timedelta(seconds=1)
        self.link.save(update_fields=['expires_at'])

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 410)

    def test_mismatched_passwords_do_not_consume_link(self):
        response = self.client.post(self.url, {
            'password': 'Very-Strong!9-password',
            'password_confirm': 'Different-Strong!8-password',
        })

        self.assertEqual(response.status_code, 400)
        self.assertContains(response, 'كلمتا المرور غير متطابقتين.', status_code=400)
        self.link.refresh_from_db()
        self.user.refresh_from_db()
        self.assertIsNone(self.link.consumed_at)
        self.assertFalse(self.user.has_usable_password())
