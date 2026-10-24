"""Authentication views: login, signup, logout and profile editing."""
import base64
import binascii
import json
import uuid

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView as BaseLoginView
from django.contrib.auth.views import LogoutView as BaseLogoutView
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from django.views.generic import FormView, TemplateView, UpdateView

from core.context_processors import get_platform_settings
from courses.models import StudentReferral, StudentReferralLink
from .forms import LoginForm, ProfileEditForm, SignupForm, SocialLinkFormSet
from .models import (
    Profile,
    ProfileSkill,
    SignupRateLimit,
    SignupVerification,
    Skill,
    SocialLink,
    User,
    UserRole,
)

from .security import (
    PHONE_RE,
    client_ip,
    clear_failed_logins,
    device_login_allowed,
    login_lock_status,
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
        return super().get_default_redirect_url()

    def post(self, request, *args, **kwargs):
        phone = (request.POST.get('username') or '').strip()
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
        if not device_login_allowed(user, getattr(self.request, 'device_id', '')):
            form.add_error(
                None,
                'يُسمح بتسجيل الدخول من جهازين فقط لنفس الحساب. '
                'سجّل الخروج من أحد الجهازين ثم أعد المحاولة.',
            )
            return self.form_invalid(form)
        response = super().form_valid(form)
        register_device_session(user, self.request)
        clear_failed_logins(user.phone)
        return response

    def form_invalid(self, form):
        phone = (form.data.get('username') or '').strip() if hasattr(form, 'data') else ''
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
    """POST logout — redirects back to the landing page."""

    next_page = reverse_lazy('landing:home')

    def post(self, request, *args, **kwargs):
        unregister_device_session(request.user, request.session.session_key)
        return super().post(request, *args, **kwargs)


@require_GET
def check_phone_ajax(request):
    """Live availability check for the signup phone field (rate limited)."""
    if rate_limited(f'phonecheck:{client_ip(request)}', 30, 60):
        return JsonResponse({'ok': False, 'error': 'rate_limited'}, status=429)
    phone = (request.GET.get('phone') or '').strip()
    if not PHONE_RE.match(phone):
        return JsonResponse({'ok': False, 'error': 'invalid'}, status=400)
    available = not User.objects.filter(phone=phone).exists()
    return JsonResponse({'ok': True, 'phone': phone, 'available': available})


SIGNUP_SESSION_KEY = 'signup_verification_id'


class SignupView(FormView):
    """Create an active student account that can sign in immediately."""

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
        ip_key = client_ip(self.request) or 'unknown'
        with transaction.atomic():
            quota, _ = SignupRateLimit.objects.get_or_create(ip_key=ip_key)
            quota = SignupRateLimit.objects.select_for_update().get(pk=quota.pk)
            now = timezone.now()
            cutoff = now.timestamp() - 24 * 60 * 60
            timestamps = [
                timestamp for timestamp in quota.signup_timestamps
                if isinstance(timestamp, (int, float)) and timestamp > cutoff
            ]
            if len(timestamps) >= 3:
                form.add_error(
                    None,
                    'تم الوصول إلى الحد الأقصى لإنشاء 3 حسابات خلال 24 ساعة من هذا الاتصال. حاول لاحقاً.',
                )
                return self.render_to_response(self.get_context_data(form=form), status=429)
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
                    referral_code = self.request.session.get('student_course_referral_code')
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
                form.add_error(None, 'رقم الجوال مستخدم بالفعل. تحقق من البيانات وحاول مرة أخرى.')
                return self.form_invalid(form)
            quota.signup_timestamps = timestamps + [now.timestamp()]
            quota.save(update_fields=['signup_timestamps'])
        messages.success(
            self.request,
            'تم إنشاء حسابك وتفعيله بنجاح. يمكنك تسجيل الدخول الآن.',
        )
        return super().form_valid(form)


@require_http_methods(['GET', 'POST'])
def verify_signup_disabled(request):
    """Close the legacy OTP endpoint so it cannot activate old sign-up sessions."""
    pending_id = request.session.pop(SIGNUP_SESSION_KEY, None)
    if pending_id:
        SignupVerification.objects.filter(pk=pending_id).delete()
    messages.info(request, 'لم يعد التسجيل يتطلب رمزاً. أكمل التسجيل من النموذج، ثم انتظر تفعيل الحساب من الإدارة.')
    return redirect('users:signup')


class ProfileUpdateView(LoginRequiredMixin, UpdateView):
    """The logged-in user edits their own profile (users/profile_edit.html)."""

    template_name = 'users/profile_edit.html'
    form_class = ProfileEditForm

    def get_object(self, queryset=None):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.setdefault('socials', SocialLinkFormSet(instance=self.object, prefix='socials'))
        return context

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
def profile_update_ajax(request):
    """AJAX endpoint used by the client-side profile edit modal."""
    user = request.user
    profile, _ = Profile.objects.get_or_create(user=user)

    handle = (request.POST.get('handle') or '').strip().lstrip('@')
    if handle and handle != user.handle:
        if User.objects.filter(handle=handle).exclude(pk=user.pk).exists():
            return JsonResponse({'ok': False, 'error': 'handle_taken'}, status=409)
        user.handle = handle[:40]

    full_name = (request.POST.get('full_name') or '').strip()
    if full_name:
        words = [w for w in full_name.split() if w]
        if len(words) < 2 or len(words) > 3:
            return JsonResponse(
                {'ok': False, 'error': 'invalid_name'},
                status=400,
            )
        user.full_name = full_name[:150]

    if 'email' in request.POST:
        user.email = (request.POST.get('email') or '').strip()

    user.is_verified = user.is_trainer
    user.save()

    profile.headline = (request.POST.get('headline') or '').strip()[:35]
    profile.bio = (request.POST.get('bio') or '').strip()[:150]
    if 'city' in request.POST:
        profile.city = (request.POST.get('city') or '').strip()[:80]
    if 'website' in request.POST:
        profile.website = (request.POST.get('website') or '').strip()

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

    for platform in ('github', 'linkedin', 'behance'):
        if platform not in request.POST:
            continue
        url = (request.POST.get(platform) or '').strip()
        SocialLink.objects.filter(profile=profile, platform=platform).delete()
        if url:
            SocialLink.objects.create(profile=profile, platform=platform, url=url)

    data = profile.to_public_dict()
    data['skills'] = [
        {'id': f'sk{link.pk}', 'name': link.skill.name, 'level': link.level}
        for link in profile.profile_skills.select_related('skill')
    ]
    socials = {}
    for link in profile.social_links.all():
        socials[link.platform] = link.url
    data['socials'] = socials

    return JsonResponse({'ok': True, 'profile': data, 'skills': data['skills']})
