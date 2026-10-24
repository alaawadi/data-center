from django.contrib.auth.hashers import make_password
from django.core import mail
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone
from .models import DeviceSession, LoginAttempt, SignupVerification, User, UserRole
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

        for phone in ('123456789', '12345678901', '12345abc90'):
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

    def test_student_login_keeps_default_redirect(self):
        response = self._post()

        self.assertRedirects(response, reverse('portfolio:home'), fetch_redirect_response=False)

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

    def test_logout_frees_device_slot(self):
        self._post()
        response = self.client.post(reverse('users:logout'))
        self.assertEqual(response.status_code, 302)
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

        self.assertEqual(self._post().status_code, 302)
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
