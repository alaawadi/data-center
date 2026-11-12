"""Authentication views: login, signup, logout and profile editing."""
import base64
import binascii
import hashlib
import json
import re
import unicodedata
import uuid

from django.contrib import messages
from django.contrib.auth import login as auth_login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView as BaseLoginView
from django.contrib.auth.views import LogoutView as BaseLogoutView
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.files.base import ContentFile
from django.core.validators import URLValidator
from django.db import IntegrityError, transaction
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from django.utils.decorators import method_decorator
from django.views.generic import FormView, TemplateView, UpdateView

from core.context_processors import get_platform_settings
from courses.models import StudentReferral, StudentReferralLink
from .forms import (
    LoginForm,
    ProfileEditForm,
    SignupForm,
    SocialLinkFormSet,
)
from .models import (
    FreelancerCategory,
    Profile,
    ProfileSkill,
    SignupVerification,
    StudentSetupLink,
    Skill,
    SocialLink,
    SocialPlatform,
    User,
    UserRole,
    validate_arabic_three_part_name,
    validate_english_three_part_name,
)

from .security import (
    PHONE_RE,
    client_ip,
    clear_failed_logins,
    device_login_allowed,
    login_phone_key,
    login_lock_status,
    normalize_palestinian_phone,
    phone_lookup_values,
    rate_limited,
    record_failed_login,
    register_device_session,
    unregister_device_session,
)


class LoginView(BaseLoginView):
    """Phone + password login with throttling and a 2-device limit."""

    template_name = 'users/login.html'
    authentication_form = LoginForm
    redirect_authenticated_user = True

    def get_default_redirect_url(self):
        if self.request.user.role == UserRole.ADMIN:
            return reverse('dashboard:home')
        return reverse('portfolio:home')

    def post(self, request, *args, **kwargs):
        phone = login_phone_key(request.POST.get('username'))
        ip = client_ip(request)
        locked, minutes = login_lock_status(phone, ip)
        if locked:
            form = self.authentication_form(request=request)
            form.cleaned_data = {}
            form.add_error(None, f'تم إيقاف تسجيل الدخول مؤقتاً بعد عدة محاولات. أعد المحاولة بعد {minutes} دقيقة.')
            response = self.render_to_response(self.get_context_data(form=form))
            response.status_code = 429
            return response
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        user = form.get_user()
        if user.role == UserRole.STUDENT and not device_login_allowed(
            user, getattr(self.request, 'device_id', '')
        ):
            form.add_error(
                None,
                'يُسمح بتسجيل الدخول من جهازين فقط لنفس الحساب. '
                'سجّل الخروج من أحد الجهازين ثم أعد المحاولة.',
            )
            return self.form_invalid(form)
        response = super().form_valid(form)
        if user.role == UserRole.STUDENT:
            register_device_session(user, self.request)
        clear_failed_logins(user.phone)
        return response

    def form_invalid(self, form):
        phone = login_phone_key(form.data.get('username')) if hasattr(form, 'data') else ''
        # form.get_user() is only set when credentials were accepted, so device
        # limit / lockout rejections never count as extra failed attempts.
        if not form.get_user() and phone:
            record_failed_login(phone, client_ip(self.request))
        return super().form_invalid(form)


class LegalPageView(TemplateView):
    template_name = 'users/legal.html'
    page_title = ''
    sections = ()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['page_title'] = self.page_title
        context['sections'] = self.sections
        return context


class TermsView(LegalPageView):
    page_title = 'شروط الاستخدام'
    sections = (
        ('قبول الشروط', (
            'باستخدامك منصة مركز داتا للتدريب والتطوير أو إنشاء حساب فيها، فإنك توافق على هذه الشروط. إذا لم توافق عليها، يرجى عدم استخدام الخدمات التي تتطلب حساباً.',
        )),
        ('الحساب والمسؤولية عنه', (
            'قد تتطلب بعض الخدمات إنشاء حساب برقم جوال وبريد إلكتروني. يجب تقديم معلومات صحيحة والمحافظة على سرية كلمة المرور، وإبلاغ المركز عند الاشتباه باستخدام الحساب دون إذن.',
            'أنت مسؤول عن الأنشطة التي تتم عبر حسابك. يجوز للمركز تعليق الحساب أو تقييد الوصول عند إساءة الاستخدام أو مخالفة هذه الشروط، مع مراعاة الأنظمة المعمول بها.',
        )),
        ('الدورات والخدمات', (
            'تعرض المنصة معلومات عن الدورات ومحتواها ومدربيها. قد يتطلب التسجيل في بعض الدورات التواصل مع المركز عبر واتساب أو استكمال إجراءات التسجيل والدفع التي يوضحها المركز.',
            'يقتصر الوصول إلى الدروس والمواد على الحسابات المخولة أو المسجلة في الدورة. لا يجوز نسخ المواد التعليمية أو إعادة نشرها أو استخدامها تجارياً دون إذن من أصحاب الحقوق.',
        )),
        ('المحتوى والملفات الشخصية', (
            'تحتفظ بحقوقك في المحتوى الذي تنشئه. وعند نشر مشروع أو معلومات في جزء عام من ملفك، تمنح المركز الإذن اللازم لعرض ذلك المحتوى داخل المنصة وتقديم وظائفها. تأكد من امتلاكك الحق في نشر أي مواد تضيفها.',
            'لا تنشر محتوى ينتهك حقوق الآخرين أو خصوصيتهم، ولا تستخدم المنصة للإساءة أو التضليل أو تعطيل خدماتها.',
        )),
        ('توفر الخدمة والتواصل', (
            'نسعى إلى إبقاء المنصة متاحة ودقيقة، لكن قد تطرأ أعمال صيانة أو تغييرات أو انقطاعات. يمكن التواصل مع مركز داتا للاستفسارات أو المساعدة عبر قنوات التواصل المنشورة في المنصة.',
        )),
    )


class PrivacyView(LegalPageView):
    page_title = 'سياسة الخصوصية'
    sections = (
        ('المعلومات التي نعالجها', (
            'قد نعالج المعلومات التي تقدمها عند إنشاء الحساب أو تحديث ملفك، مثل الاسم ورقم الجوال والبريد الإلكتروني والصورة ومعلومات الملف الشخصي.',
            'عند استخدام المنصة، قد تُعالج بيانات مرتبطة بالدورات والتقدم التعليمي والشهادات والمشاريع والتفاعلات اللازمة لتشغيل الخدمات.',
        )),
        ('كيف نستخدم المعلومات', (
            'نستخدم المعلومات لإنشاء الحساب وإدارته، وتقديم الدورات والملفات الشخصية، وحفظ التقدم والشهادات، وتحسين موثوقية المنصة، والرد على طلبات الدعم.',
            'لا نعرض كلمة المرور للآخرين؛ تُخزن بيانات المصادقة باستخدام آليات الحماية المعتمدة في النظام.',
        )),
        ('المعلومات الظاهرة للآخرين', (
            'قد تظهر معلومات الملف الشخصي والمشاريع والشهادات التي تختار نشرها في الصفحات العامة. راجع محتوى ملفك وإعدادات ظهوره قبل نشر معلومات لا ترغب بمشاركتها.',
            'لا نرسل بياناتك إلى واتساب تلقائياً. عند اختيار التواصل أو التسجيل عبر واتساب، يفتح رابط برسالة طلب جاهزة، ويمكنك مراجعتها قبل إرسالها إلى مركز داتا.',
        )),
        ('الحفظ والحماية والمشاركة', (
            'نستخدم تدابير تقنية وتنظيمية مناسبة لحماية المعلومات، ونقصر الوصول إليها على ما يلزم لتشغيل المنصة وإدارة الخدمات. لا توجد وسيلة نقل أو تخزين إلكترونية خالية تماماً من المخاطر.',
            'قد نشارك المعلومات عند الحاجة لتقديم الخدمة، أو عند وجود التزام نظامي، أو لحماية حقوق المستخدمين والمنصة. ولا تُباع المعلومات الشخصية لأغراض إعلانية.',
        )),
        ('حقوقك والتواصل', (
            'يمكنك تحديث بيانات ملفك من أدوات الحساب المتاحة، كما يمكنك التواصل مع مركز داتا لطلب المساعدة بشأن معلوماتك أو حسابك. قد نحتاج إلى التحقق من هويتك قبل تنفيذ الطلب.',
            'قد تُحدّث هذه السياسة عند تغيير الخدمات أو المتطلبات. سننشر النسخة المعدلة على هذه الصفحة، ويُعد استمرار استخدام المنصة بعد نشر التحديث قبولاً بها.',
        )),
    )


class LogoutView(BaseLogoutView):
    """POST logout — redirects to the login page."""

    next_page = reverse_lazy('users:login')

    def post(self, request, *args, **kwargs):
        unregister_device_session(request.user, request.session.session_key)
        return super().post(request, *args, **kwargs)


@require_http_methods(['GET', 'POST'])
def student_setup(request, token):
    """Set a new student's password from a short-lived, single-use link."""
    token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
    errors = []
    link = None
    user = None
    redirect_url = None

    with transaction.atomic():
        link = (
            StudentSetupLink.objects.select_for_update()
            .select_related('user')
            .filter(token_hash=token_hash)
            .first()
        )
        if (
            link is None
            or link.consumed_at is not None
            or link.expires_at <= timezone.now()
            or link.user.has_usable_password()
            or not link.user.is_active
        ):
            link = None
        elif request.method == 'POST':
            user = link.user
            password = request.POST.get('password', '')
            password_confirm = request.POST.get('password_confirm', '')
            if password != password_confirm:
                errors.append('كلمتا المرور غير متطابقتين.')
            if not errors:
                try:
                    validate_password(password, user)
                except ValidationError as exc:
                    errors.extend(exc.messages)

            device_id = getattr(request, 'device_id', '')
            if not errors and device_id and not device_login_allowed(user, device_id):
                errors.append(
                    'لا يمكن تسجيل الدخول من هذا الجهاز؛ تم بلوغ الحد المسموح للأجهزة.'
                )

            if not errors:
                user.set_password(password)
                user.save(update_fields=['password'])
                link.consumed_at = timezone.now()
                link.save(update_fields=['consumed_at'])
                redirect_url = reverse(
                    'accounts:profile',
                    kwargs={'handle': user.handle},
                )

    if link is None:
        return render(
            request,
            'users/student_setup.html',
            {'invalid_link': True},
            status=410,
        )

    if redirect_url:
        auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        register_device_session(user, request)
        return redirect(redirect_url)

    return render(
        request,
        'users/student_setup.html',
        {
            'invalid_link': False,
            'expires_at': link.expires_at,
            'errors': errors,
        },
        status=400 if errors else 200,
    )


@require_GET
def check_phone_ajax(request):
    """Live availability check for the signup phone field (rate limited)."""
    if rate_limited(f'phonecheck:{client_ip(request)}', 30, 60):
        return JsonResponse({'ok': False, 'error': 'rate_limited'}, status=429)
    phone = (request.GET.get('phone') or '').strip()
    if not PHONE_RE.match(phone):
        return JsonResponse({'ok': False, 'error': 'invalid'}, status=400)
    available = not User.objects.filter(phone__in=phone_lookup_values(phone)).exists()
    return JsonResponse({'ok': True, 'phone': phone, 'available': available})


@login_required
@require_GET
def check_profile_whatsapp_ajax(request):
    """Check that a profile WhatsApp number is not another user's account phone."""
    if rate_limited(f'profilewhatsapp:{client_ip(request)}', 30, 60):
        return JsonResponse({'ok': False, 'error': 'rate_limited'}, status=429)

    target_user_id = request.GET.get('target_user_id')
    if target_user_id:
        if not (request.user.is_staff or request.user.is_admin_role):
            return JsonResponse({'ok': False, 'error': 'permission_denied'}, status=403)
        if not target_user_id.isdigit():
            return JsonResponse({'ok': False, 'error': 'invalid_target'}, status=400)
        target_user = get_object_or_404(
            User,
            pk=target_user_id,
            role__in=(UserRole.TRAINER, UserRole.STUDENT),
        )
    else:
        target_user = request.user

    phone = normalize_palestinian_phone(request.GET.get('phone'))
    if not PHONE_RE.fullmatch(phone):
        return JsonResponse({'ok': False, 'error': 'invalid_phone'}, status=400)
    belongs_to_another_user = User.objects.filter(
        phone__in=phone_lookup_values(phone)
    ).exclude(pk=target_user.pk).exists()
    return JsonResponse({
        'ok': True,
        'available': not belongs_to_another_user,
        'belongsToAnotherUser': belongs_to_another_user,
    })


class SignupView(FormView):
    """Create an active student account without email verification."""

    template_name = 'users/signup.html'
    form_class = SignupForm
    success_url = reverse_lazy('users:login')

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect('portfolio:home')
        if not get_platform_settings()['allowSignup']:
            messages.error(request, 'التسجيل الجديد متوقف حالياً.')
            return redirect('landing:home')
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        if rate_limited(f'signup:{client_ip(request)}', 10, 3600):
            form = self.get_form()
            form.cleaned_data = {}
            form.add_error(None, 'عدد كبير من المحاولات. حاول مرة أخرى بعد قليل.')
            return self.render_to_response(self.get_context_data(form=form), status=429)
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        data = form.cleaned_data
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    phone=data['phone'],
                    password=data['password1'],
                    full_name=data['full_name'],
                    email=data['email'],
                    role=UserRole.STUDENT,
                    is_active=True,
                )
                referral_code = self.request.session.get(
                    'student_course_referral_code'
                )
                if referral_code:
                    referral_link = (
                        StudentReferralLink.objects.filter(code=referral_code)
                        .exclude(referrer=user)
                        .first()
                    )
                    if referral_link:
                        StudentReferral.objects.create(
                            link=referral_link,
                            referred_user=user,
                        )
        except IntegrityError:
            form.add_error(
                None,
                'رقم الهاتف أو البريد الإلكتروني مستخدم بالفعل. تحقق من البيانات وحاول مرة أخرى.',
            )
            return self.form_invalid(form)

        messages.success(
            self.request,
            'تم إنشاء حسابك وتفعيله بنجاح. يمكنك تسجيل الدخول الآن.',
        )
        return super().form_valid(form)


@require_http_methods(['GET', 'POST'])
def verify_signup(request):
    pending_id = request.session.pop('signup_verification_id', None)
    request.session.pop('signup_verification_ip', None)
    if pending_id:
        SignupVerification.objects.filter(pk=pending_id).delete()
    messages.info(
        request,
        'تم إيقاف تفعيل البريد مؤقتاً. أنشئ حسابك مباشرة من صفحة التسجيل.',
    )
    return redirect('users:signup')


class ProfileUpdateView(LoginRequiredMixin, UpdateView):
    """Edit the logged-in user's profile or a trainer/student profile as admin."""

    template_name = 'users/profile_edit.html'
    form_class = ProfileEditForm

    def _is_admin(self):
        return self.request.user.is_staff or self.request.user.is_admin_role

    def _target_user(self, lock=False):
        target_id = self.request.GET.get('user_id')
        if not target_id:
            return self.request.user
        if not self._is_admin():
            raise PermissionDenied
        if not str(target_id).isdigit():
            raise Http404
        users = User.objects
        if lock:
            users = users.select_for_update()
        return get_object_or_404(
            users, pk=target_id, role__in=(UserRole.TRAINER, UserRole.STUDENT)
        )

    def get_object(self, queryset=None):
        user = self._target_user(lock=self.request.method == 'POST')
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.setdefault('socials', SocialLinkFormSet(instance=self.object, prefix='socials'))
        context['freelancer_category_options'] = context['form'].freelancer_category_names
        context['profile_editing_other'] = self.object.user_id != self.request.user.pk
        context['profile_target_name'] = self.object.user.display_name
        context['profile_cancel_url'] = (
            reverse('accounts:profile', kwargs={'handle': self.object.user.handle})
            if self.object.user.handle and self.object.is_public
            else reverse('accounts:list')
        )
        return context

    @method_decorator(transaction.atomic)
    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        form = self.get_form()
        socials = SocialLinkFormSet(request.POST, instance=self.object, prefix='socials')
        if form.is_valid() and socials.is_valid():
            return self.forms_valid(form, socials)
        return self.forms_invalid(form, socials)

    def forms_valid(self, form, socials):
        response = super().form_valid(form)
        form.save_lists(self.object)
        socials.save()
        return response

    def forms_invalid(self, form, socials):
        return self.render_to_response(self.get_context_data(form=form, socials=socials))

    def get_success_url(self):
        if self.object.user_id != self.request.user.pk:
            if self.object.user.handle and self.object.is_public:
                return reverse('accounts:profile', kwargs={'handle': self.object.user.handle})
            return reverse('accounts:list')
        return reverse('portfolio:home') + '?saved=1'


def _decode_data_url(data_url):
    """Turn a base64 image data URL into (filename, bytes) or None."""
    if not data_url or not data_url.startswith('data:image'):
        return None
    try:
        header, encoded = data_url.split(',', 1)
    except ValueError:
        return None
    ext = 'png'
    if 'image/jpeg' in header or 'image/jpg' in header:
        ext = 'jpg'
    elif 'image/webp' in header:
        ext = 'webp'
    elif 'image/gif' in header:
        ext = 'gif'
    try:
        content = base64.b64decode(encoded)
    except (binascii.Error, ValueError):
        return None
    if not content:
        return None
    return f'{uuid.uuid4().hex}.{ext}', content


@login_required
@require_POST
@transaction.atomic
def profile_update_ajax(request):
    """AJAX endpoint used by the client-side profile edit modal."""
    target_user_id = request.POST.get('target_user_id')
    if target_user_id:
        if not (request.user.is_staff or request.user.is_admin_role):
            return JsonResponse({'ok': False, 'error': 'permission_denied'}, status=403)
        if not target_user_id.isdigit():
            return JsonResponse({'ok': False, 'error': 'invalid_target'}, status=400)
        user = get_object_or_404(
            User.objects.select_for_update(),
            pk=target_user_id,
            role__in=(UserRole.TRAINER, UserRole.STUDENT),
        )
    else:
        user = User.objects.select_for_update().get(pk=request.user.pk)
    profile_form = request.POST.get('profile_form') == '1'
    whatsapp = (request.POST.get('whatsapp') or '').strip()
    if profile_form and not whatsapp:
        return JsonResponse({'ok': False, 'error': 'required_whatsapp'}, status=400)
    whatsapp = normalize_palestinian_phone(whatsapp)
    is_palestinian_whatsapp = bool(
        re.fullmatch(r'\+97[02]5\d{8}', whatsapp)
        or re.fullmatch(r'97[02]5\d{8}', whatsapp)
    )
    is_other_international_whatsapp = bool(
        re.fullmatch(r'\+[1-9]\d{6,14}', whatsapp)
        and not whatsapp.startswith(('+970', '+972'))
    )
    if whatsapp and not (is_palestinian_whatsapp or is_other_international_whatsapp):
        return JsonResponse({'ok': False, 'error': 'invalid_whatsapp'}, status=400)
    if whatsapp and User.objects.filter(
        phone__in=phone_lookup_values(whatsapp)
    ).exclude(pk=user.pk).exists():
        return JsonResponse({
            'ok': False,
            'error': 'whatsapp_belongs_to_another_user',
        }, status=400)

    profile, _ = Profile.objects.get_or_create(user=user)
    headline = (request.POST.get('headline') or '').strip()
    if headline and not FreelancerCategory.objects.filter(
        name=headline, is_active=True
    ).exists():
        return JsonResponse({'ok': False, 'error': 'invalid_headline'}, status=400)
    student_specialization = (request.POST.get('student_specialization') or '').strip()
    if (
        user.is_student
        and 'student_specialization' in request.POST
        and len(student_specialization) > 30
    ):
        return JsonResponse({'ok': False, 'error': 'invalid_specialization'}, status=400)

    social_links = None
    if (user.is_student or user.is_trainer) and 'social_links' in request.POST:
        try:
            submitted_links = json.loads(request.POST['social_links'])
        except (TypeError, ValueError):
            return JsonResponse({'ok': False, 'error': 'invalid_social_links'}, status=400)
        if (
            not isinstance(submitted_links, list)
            or len(submitted_links) > len(SocialPlatform.values) - 1
        ):
            return JsonResponse({'ok': False, 'error': 'invalid_social_links'}, status=400)
        social_links = []
        seen_platforms = set()
        validate_social_url = URLValidator(schemes=['http', 'https'])
        for item in submitted_links:
            if not isinstance(item, dict):
                return JsonResponse({'ok': False, 'error': 'invalid_social_links'}, status=400)
            platform = str(item.get('platform') or '').strip()
            url = str(item.get('url') or '').strip()
            if not platform and not url:
                continue
            if not url:
                continue
            if (
                platform not in SocialPlatform.values
                or platform == SocialPlatform.WEBSITE
                or platform in seen_platforms
                or len(url) > 200
            ):
                return JsonResponse({'ok': False, 'error': 'invalid_social_links'}, status=400)
            try:
                validate_social_url(url)
            except ValidationError:
                return JsonResponse({'ok': False, 'error': 'invalid_social_links'}, status=400)
            seen_platforms.add(platform)
            social_links.append({'platform': platform, 'url': url})

    handle = (request.POST.get('handle') or '').strip().lstrip('@')
    if handle and handle != user.handle:
        if User.objects.filter(handle=handle).exclude(pk=user.pk).exists():
            return JsonResponse({'ok': False, 'error': 'handle_taken'}, status=409)
        user.handle = handle[:40]

    full_name = (request.POST.get('full_name') or '').strip()
    if full_name:
        words = [w for w in full_name.split() if w]
        letters_only = all(
            char.isspace() or char.isalpha() or unicodedata.category(char).startswith('M')
            for char in full_name
        ) and all(any(char.isalpha() for char in word) for word in words)
        if not letters_only or len(words) < 2 or len(words) > 3:
            return JsonResponse(
                {'ok': False, 'error': 'invalid_name'},
                status=400,
            )
        user.full_name = full_name[:150]

    admin_legal_names = None
    if user.is_trainer and 'trainer_name_en' in request.POST:
        user.trainer_name_en = (request.POST.get('trainer_name_en') or '').strip()[:200]
    if 'whatsapp' in request.POST:
        profile.whatsapp = whatsapp
    if not user.is_trainer and (
        'full_name_ar' in request.POST or 'full_name_en' in request.POST
    ):
        full_name_ar = ' '.join((request.POST.get('full_name_ar') or '').split())
        full_name_en = ' '.join((request.POST.get('full_name_en') or '').split())
        if target_user_id:
            if bool(full_name_ar) != bool(full_name_en):
                return JsonResponse(
                    {'ok': False, 'error': 'legal_name_pair_required'}, status=400
                )
            if full_name_ar:
                try:
                    validate_arabic_three_part_name(full_name_ar)
                    validate_english_three_part_name(full_name_en)
                except ValidationError:
                    return JsonResponse(
                        {'ok': False, 'error': 'invalid_legal_name'}, status=400
                    )
            admin_legal_names = (full_name_ar, full_name_en)
        elif user.full_name_ar or user.full_name_en:
            if (
                full_name_ar and full_name_ar != user.full_name_ar
                or full_name_en and full_name_en != user.full_name_en
            ):
                return JsonResponse({'ok': False, 'error': 'legal_name_locked'}, status=409)
        elif full_name_ar or full_name_en:
            if not full_name_ar or not full_name_en:
                return JsonResponse({'ok': False, 'error': 'legal_name_pair_required'}, status=400)
            try:
                validate_arabic_three_part_name(full_name_ar)
                validate_english_three_part_name(full_name_en)
            except ValidationError:
                return JsonResponse({'ok': False, 'error': 'invalid_legal_name'}, status=400)
            user.full_name_ar = full_name_ar
            user.full_name_en = full_name_en

    user.is_verified = user.is_trainer
    user.save()
    if target_user_id and not user.is_trainer and admin_legal_names is not None:
        user.full_name_ar, user.full_name_en = admin_legal_names
        User.objects.filter(pk=user.pk).update(
            full_name_ar=user.full_name_ar,
            full_name_en=user.full_name_en,
        )

    profile.headline = headline
    if user.is_student:
        if 'student_specialization' in request.POST:
            profile.student_specialization = student_specialization
    profile.specialization = headline
    profile.bio = (request.POST.get('bio') or '').strip()[:150]
    if 'city' in request.POST:
        profile.city = (request.POST.get('city') or '').strip()[:80]
    avatar_file = request.FILES.get('avatar')
    if avatar_file:
        profile.avatar = avatar_file
    else:
        decoded = _decode_data_url(request.POST.get('avatar_data') or '')
        if decoded:
            name, content = decoded
            profile.avatar.save(name, ContentFile(content), save=False)

    profile.save()

    skills_raw = request.POST.get('skills')
    if skills_raw is not None:
        try:
            items = json.loads(skills_raw)
        except (TypeError, ValueError):
            items = []
        if not isinstance(items, list):
            items = []
        items = items[:8]
        profile.profile_skills.all().delete()
        seen = set()
        for item in items:
            if isinstance(item, dict):
                name = str(item.get('name') or '').strip()
                level = item.get('level', 60)
            else:
                name = str(item).strip()
                level = 60
            if not name:
                continue
            name = name[:80]
            if name.lower() in seen:
                continue
            seen.add(name.lower())
            try:
                level = max(0, min(100, int(level)))
            except (TypeError, ValueError):
                level = 60
            skill, _ = Skill.objects.get_or_create(name=name)
            ProfileSkill.objects.create(profile=profile, skill=skill, level=level)

    if social_links is not None:
        profile.social_links.exclude(platform=SocialPlatform.WEBSITE).delete()
        SocialLink.objects.bulk_create([
            SocialLink(profile=profile, **link) for link in social_links
        ])
    else:
        for platform in ('github', 'linkedin', 'behance'):
            if platform not in request.POST:
                continue
            url = (request.POST.get(platform) or '').strip()
            SocialLink.objects.filter(profile=profile, platform=platform).delete()
            if url:
                SocialLink.objects.create(profile=profile, platform=platform, url=url)

    data = profile.to_public_dict()
    data['whatsapp'] = profile.whatsapp
    data['fullNameArabic'] = user.full_name_ar
    data['fullNameEnglish'] = user.full_name_en
    data['trainerNameEnglish'] = user.trainer_name_en or user.full_name_en
    data['skills'] = [
        {'id': f'sk{link.pk}', 'name': link.skill.name, 'level': link.level}
        for link in profile.profile_skills.select_related('skill')
    ]
    socials = {}
    for link in profile.social_links.all():
        socials[link.platform] = link.url
    data['socials'] = socials

    return JsonResponse({
        'ok': True,
        'profile': data,
        'skills': data['skills'],
        'profile_setup': profile.completeness(),
    })
