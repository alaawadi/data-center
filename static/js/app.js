(function () {
  'use strict';

  var page = document.body.getAttribute('data-page');
  var searchQuery = '';
  var activeTab = 'certificates';
  var skillsExpanded = false;
  var trainerProjectVisibility = 'public';
  var lastGalleryDrag = 0;
  var relatedCoursesAutoScroll = null;
  var certificateLanguage = 'ar';

  /* البيانات الحقيقية للمستخدم المسجّل (من السيرفر) تحل مكان بيانات العرض التوضيحي */
  var SERVER_PROFILE = null;
  (function applyServerProfile() {
    var el = document.getElementById('my-profile-data');
    if (!el || !window.Store) return;
    var data;
    try { data = JSON.parse(el.textContent); } catch (err) { return; }
    if (!data || !data.handle) return;
    var skills = data.skills;
    delete data.skills;
    Object.assign(Store.state.profile, data);
    if (Array.isArray(skills)) Store.state.skills = skills;
    SERVER_PROFILE = data;
  })();

  function t(k, v) { return I18n.t(k, v); }
  function e(s) { return UI.esc(s); }
  function courseLessonCount(period) {
    return String(period || '—').replace(/لقاءات?/g, 'درس');
  }

  function getCountryCallingCodeChoices() {
    var data = document.getElementById('country-calling-code-choices');
    if (!data) return [];
    try {
      var choices = JSON.parse(data.textContent);
      return Array.isArray(choices) ? choices : [];
    } catch (error) {
      console.error('Unable to read country calling code choices:', error);
      return [];
    }
  }

  function getProfileSetupData() {
    var data = document.getElementById('profile-setup-data');
    if (!data) return null;
    try {
      return JSON.parse(data.textContent);
    } catch (error) {
      console.error('Unable to read profile setup data:', error);
      return null;
    }
  }

  function splitPhoneNumber(value, choices) {
    var phone = String(value || '').trim();
    var digits = phone.replace(/\D/g, '');
    if (!digits) return { countryCode: '+970', nationalNumber: '' };
    if (/^0(?:59|56)\d{7}$/.test(digits)) {
      return { countryCode: '+970', nationalNumber: digits.slice(1) };
    }

    var normalized = '+' + digits;
    var prefixes = choices.map(function (choice) { return choice[0]; })
      .filter(function (code, index, list) { return list.indexOf(code) === index; })
      .sort(function (left, right) { return right.length - left.length; });
    var prefix = prefixes.find(function (code) { return normalized.indexOf(code) === 0; });
    if (prefix) {
      return { countryCode: prefix, nationalNumber: normalized.slice(prefix.length) };
    }
    if (digits.indexOf('0') === 0) digits = digits.replace(/^0+/, '');
    return { countryCode: '+970', nationalNumber: digits };
  }

  function dismissProfileSetupAlert(alert) {
    if (!alert || alert.dataset.dismissScheduled === 'true') return;
    alert.dataset.dismissScheduled = 'true';
    window.setTimeout(function () {
      alert.classList.add('is-dismissing');
      window.setTimeout(function () { alert.remove(); }, 450);
    }, 3500);
  }

  function updateProfileSetupAlert(setup, saved) {
    var alert = document.getElementById('profileSetupAlert');
    if (!alert || !setup) return;
    var percent = Math.max(0, Math.min(100, Number(setup.percent) || 0));
    var progress = alert.querySelector('[role="progressbar"]');
    var progressFill = progress && progress.querySelector('span');
    var percentLabel = alert.querySelector('[data-setup-percent]');
    var title = alert.querySelector('[data-setup-title]');
    var description = alert.querySelector('[data-setup-description]');
    var button = alert.querySelector('[data-act="edit-profile"]');

    if (progress) progress.setAttribute('aria-valuenow', String(percent));
    if (progressFill) progressFill.style.width = percent + '%';
    if (percentLabel) percentLabel.textContent = percent + '٪';

    if (percent === 100) {
      alert.classList.add('is-complete');
      if (title) title.textContent = 'تهانينا! اكتمل إعداد حسابك';
      if (description) description.textContent = 'أصبحت بيانات حسابك مكتملة بنسبة 100٪. أحسنت!';
      if (button) button.hidden = true;
      if (saved) dismissProfileSetupAlert(alert);
      return;
    }

    alert.classList.remove('is-complete');
    if (button) button.hidden = false;
    if (title) title.textContent = 'أكمل إعدادات حسابك';
    if (description) {
      var missing = Array.isArray(setup.missing) ? setup.missing : [];
      description.textContent = missing.length
        ? 'أضف البيانات الأساسية الناقصة لتحسين ملفك الشخصي: ' + missing.join('، ') + '.'
        : 'أضف البيانات الأساسية الناقصة لتحسين ملفك الشخصي.';
    }
  }

  /* هل المستخدم المسجّل مدرب؟ (يُبدَّل قسم الشهادات بقسم «الدورات التدريبية») */
  var IS_TRAINER = !!(SERVER_PROFILE && (SERVER_PROFILE.isTrainer || SERVER_PROFILE.roleKey === 'trainer'));
  if (IS_TRAINER) activeTab = 'trainer-courses';

  /* أزرار التعديل والحذف تظهر فقط لصاحب المشروع نفسه */
  function isOwner(p) {
    return !!(SERVER_PROFILE && SERVER_PROFILE.handle && p && p.handle && SERVER_PROFILE.handle === p.handle);
  }

  function canManageProject(p) {
    if (p && p.adminCanEdit) return true;
    if (!p || !isOwner(p)) return false;
    return !(
      IS_TRAINER &&
      SERVER_PROFILE.canPublishContent === false &&
      p.visibility !== 'personal'
    );
  }

  /* الدورات: صاحب الدورة فقط يعدّلها ويحذفها (الدورات المحلية بلا handle تبقى كما كانت) */
  function canManageCourse(c) {
    if (c && c.adminCanManageCourse) return true;
    if (
      IS_TRAINER &&
      SERVER_PROFILE.canPublishContent === false &&
      isOwner(c) &&
      c.profileOnly !== true
    ) return false;
    return !!(c && (!c.handle || isOwner(c)));
  }

  /* شهادات الطالب المكتسبة فعلياً (null لزائر غير مسجّل → بيانات العرض التوضيحي) */
  function earnedCerts() {
    return (window.Store && Store.myCerts) ? Store.myCerts() : null;
  }

  /* عدد شهادات الطالب في بطاقته: الشهادات المكتسبة فقط (لا كل الدورات المنشورة) */
  function certStatCount() {
    var mine = earnedCerts();
    if (mine) return mine.length;
    return Store.totals().certificates;
  }

  /* ---------- shared cards ---------- */

  function certificateDate(value, language) {
    if (!value) return '—';
    var normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00' : value;
    var date = new Date(normalized);
    if (isNaN(date.getTime())) return '—';
    try {
      return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return UI.formatDate(value);
    }
  }

  function earnedCertificateSheet(c, studentName, compact) {
    var lang = arguments.length > 3 ? arguments[3] : 'ar';
    var hideCode = arguments.length > 4 && arguments[4];
    var english = lang === 'en';
    var instructor = english
      ? (c.trainerNameEnglish || c.instructorEnglish || 'English instructor name not provided')
      : (c.trainerName || c.instructor || c.issuer || '');
    var title = english
      ? (c.titleEnglish || c.title_en || 'English title not provided')
      : (c.title || '');
    var issued = certificateDate(c.date, lang);
    var trainerLabel = english
      ? (c.workshop ? 'Workshop Trainer' : 'Course Instructor')
      : (c.workshop ? 'مدرب الورشة' : 'مدرب الدورة');
    var duration = c.workshop
      ? (c.duration ? c.duration + ' ' + (english ? 'minutes' : 'دقيقة') : '—')
      : (english ? (c.durationEnglish || 'Not specified') : (c.duration || '—'));
    var labels = english ? {
      title: 'Training Certificate',
      lead: 'Data Center for Training & Development certifies that',
      student: 'Student name:',
      activity: c.workshop ? 'has successfully completed the workshop:' : 'has successfully completed the training:',
      duration: 'Duration:',
      wish: 'We wish you continued success and excellence.',
      director: 'Data Center Director',
      issued: 'Issued',
      code: 'Certificate No.'
    } : {
      title: 'شهادة تدريب',
      lead: 'يشهد مركز داتا للتدريب والتطوير بأن',
      student: 'اسم الطالب/ة:',
      activity: c.workshop ? 'قد أتمّ بنجاح ورشة تدريبية بعنوان:' : 'قد أتمّ بنجاح دورة تدريبية بعنوان:',
      duration: 'المدة:',
      wish: 'نتمنى لكم دوام التوفيق والتميّز.',
      director: 'مدير مركز داتا',
      issued: 'تاريخ الإصدار',
      code: 'رقم الشهادة'
    };
    var code = c.certificateCode || c.code || c.credentialId || '';
    var gradientId = 'certificate-' + String(code || c.id || 'preview').replace(/[^A-Za-z0-9_-]/g, '');
    var textDir = english ? 'ltr' : 'rtl';
    return '<article class="cert-sheet' + (compact ? ' cert-sheet-preview' : '') + '" dir="rtl" lang="' + (english ? 'en' : 'ar') + '">' +
      '<svg class="cert-sheet-wave cert-sheet-wave-top" viewBox="0 0 520 300" aria-hidden="true">' +
      '<defs><linearGradient id="' + gradientId + '-blue-top" x1="0" x2="1"><stop offset="0" stop-color="#2f4b8f"/><stop offset="1" stop-color="#9aa7cc" stop-opacity=".15"/></linearGradient>' +
      '<linearGradient id="' + gradientId + '-red-top" x1="0" x2="1"><stop offset="0" stop-color="#c8383f"/><stop offset="1" stop-color="#e98a8f" stop-opacity=".2"/></linearGradient></defs>' +
      '<path d="M0 0H520C430 40 330 40 230 110 150 165 70 190 0 190Z" fill="url(#' + gradientId + '-blue-top)" opacity=".85"/>' +
      '<path d="M0 0H430C340 30 250 50 170 100 100 145 50 150 0 150Z" fill="url(#' + gradientId + '-red-top)"/>' +
      '<path d="M0 0H300C220 20 150 50 90 90 50 115 20 120 0 120Z" fill="#fff" opacity=".35"/></svg>' +
      '<svg class="cert-sheet-wave cert-sheet-wave-bottom" viewBox="0 0 520 300" aria-hidden="true">' +
      '<defs><linearGradient id="' + gradientId + '-blue-bottom" x1="0" x2="1"><stop offset="0" stop-color="#2f4b8f"/><stop offset="1" stop-color="#9aa7cc" stop-opacity=".15"/></linearGradient>' +
      '<linearGradient id="' + gradientId + '-red-bottom" x1="0" x2="1"><stop offset="0" stop-color="#c8383f"/><stop offset="1" stop-color="#e98a8f" stop-opacity=".2"/></linearGradient></defs>' +
      '<path d="M0 0H520C430 40 330 40 230 110 150 165 70 190 0 190Z" fill="url(#' + gradientId + '-blue-bottom)" opacity=".85"/>' +
      '<path d="M0 0H430C340 30 250 50 170 100 100 145 50 150 0 150Z" fill="url(#' + gradientId + '-red-bottom)"/></svg>' +
      '<div class="cert-sheet-frame"></div>' +
      '<div class="cert-sheet-content">' +
      '<img class="cert-sheet-logo" src="' + SITE.assets('images/certificate-design-logo.png') + '" alt="' + e(t('certPageBrand')) + '">' +
      '<h2 class="cert-sheet-title" dir="' + textDir + '">' + e(labels.title) + '</h2>' +
      '<div class="cert-sheet-ornament" aria-hidden="true"><i></i><b></b><i></i></div>' +
      '<p class="cert-sheet-lead" dir="' + textDir + '">' + e(labels.lead) + '</p>' +
      '<p class="cert-sheet-caption" dir="' + textDir + '">' + e(labels.student) + '</p>' +
      '<div class="cert-sheet-name" dir="' + textDir + '">' + e(studentName || '—') + '</div>' +
      '<p class="cert-sheet-caption" dir="' + textDir + '">' + e(labels.activity) + '</p>' +
      '<div class="cert-sheet-course" dir="' + textDir + '">' + e(title) + '</div>' +
      '<div class="cert-sheet-duration">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="#c8383f" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/></svg>' +
      '<span dir="' + textDir + '">' + e(labels.duration) + ' <b>' + e(duration) + '</b></span></div>' +
      '<p class="cert-sheet-wish" dir="' + textDir + '">' + e(labels.wish) + '</p>' +
      '</div>' +
      '<div class="cert-sheet-signature cert-sheet-signature-trainer"><b dir="' + textDir + '">' + e(instructor) + '</b>' +
      '<div class="cert-sheet-signature-line"></div><span dir="' + textDir + '">' + e(trainerLabel) + '</span></div>' +
      '<div class="cert-sheet-signature cert-sheet-signature-center"><div class="cert-sheet-signature-line"></div>' +
      '<span>' + e(labels.director) + '</span></div>' +
      '<img class="cert-sheet-stamp" src="' + SITE.assets('images/certificate-design-stamp.png') + '" alt="' + e(t('certPageStamp')) + '">' +
      '<svg class="cert-sheet-seal" viewBox="0 0 84 100" role="img" aria-label="' + e(t('certDesignSeal')) + '">' +
      '<path d="M26 58 14 96l16-9 8 13 8-36Z" fill="#2f4b8f"/><path d="M58 58 70 96l-16-9-8 13-8-36Z" fill="#c8383f"/>' +
      '<circle cx="42" cy="38" r="32" fill="#2f4b8f"/><circle cx="42" cy="38" r="26" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="2 3"/>' +
      '<path d="m42 22 4.6 9.6 10.4 1.4-7.6 7.3 1.9 10.4L42 45.6l-9.3 5.1 1.9-10.4-7.6-7.3 10.4-1.4Z" fill="#fff"/></svg>' +
      '<div class="cert-sheet-issued">' + e(labels.issued) + ' · ' + e(issued) + '</div>' +
      (code && !hideCode ? '<div class="cert-sheet-code" dir="ltr">' + e(labels.code) + ': ' + e(code) + '</div>' : '') +
      '</article>';
  }

  function certCard(c, opts) {
    if (!opts || typeof opts !== 'object') opts = {};
    var returnTo = opts.returnTo
      ? '?return=' + encodeURIComponent(opts.returnTo)
      : '';
    var courseParams = [];
    if (opts.from) courseParams.push('from=' + encodeURIComponent(opts.from));
    if (opts.returnTo) courseParams.push('return=' + encodeURIComponent(opts.returnTo));
    var detailUrl = opts.course
      ? SITE.u('course', e(c.id)) + (courseParams.length ? '?' + courseParams.join('&') : '')
      : SITE.u('certificate', e(c.certificateId || c.id)) + returnTo;
    if (opts.imageOnly) {
      return '<article class="cert-card cert-card-preview" data-goto="' + detailUrl + '" data-search="' +
        e((c.title + ' ' + c.issuer + ' ' + (c.category || '') + ' ' + (c.studentName || '')).toLowerCase()) + '">' +
        earnedCertificateSheet(c, c.studentNameArabic || (SERVER_PROFILE && SERVER_PROFILE.fullNameArabic) || c.studentName || '', true) +
        '</article>';
    }
    if (opts.manualImage) {
      var manualStatus = c.status || 'approved';
      var manualStatusLabel = c.statusLabel || t(
        manualStatus === 'rejected'
          ? 'certStatusRejected'
          : manualStatus === 'approved'
            ? 'certStatusApproved'
            : 'certStatusPending'
      );
      var needsStatusModal = manualStatus === 'pending' || manualStatus === 'rejected';
      var manualStatusBadge = '<span class="manual-cert-status manual-cert-status-' + e(manualStatus) + '">' +
        e(manualStatusLabel) + '</span>';
      return '<article class="cert-card cert-card-uploaded' + (needsStatusModal ? ' manual-cert-status-card' : '') + '"' +
        (needsStatusModal
          ? ' role="button" tabindex="0" data-act="manual-cert-status-info" data-status="' + e(manualStatus) +
            '" data-reason="' + e(c.rejectionReason || '') + '" aria-label="' +
            e((c.title || '') + ' — ' + manualStatusLabel) + '"'
          : ' data-goto="' + detailUrl + '"') +
        ' data-search="' +
        e((c.title + ' ' + c.issuer + ' ' + (c.category || '') + ' ' + (c.studentName || '')).toLowerCase()) + '">' +
        '<img src="' + e(c.image || '') + '" alt="' + e(c.title) + '" loading="lazy" decoding="async">' +
        manualStatusBadge +
        '</article>';
    }
    var cat = e(c.category || t('certCategory'));
    var skills = (c.skills || []).slice(0, 2).map(function (s) { return '<span class="chip sm cert-skill">' + e(s) + '</span>'; }).join('');
    var desc = c.description ? c.description.replace(/\s+/g, ' ').trim() : '';
    var isCourse = !!opts.course;
    var isComingSoon = isCourse && !!c.comingSoon;
    var cardNavigation = opts.profileInactiveCourse ? '' : ' data-goto="' + detailUrl + '"';
    var isDraftCourse = isCourse && c.status === 'draft';
    var trainerStudentsAction = opts.trainerCourse
      ? '<button class="btn-icon" data-act="trainer-course-students" data-id="' + e(c.id) +
        '" title="' + e(t('trainerCourseStudents')) + '" aria-label="' + e(t('trainerCourseStudents')) + '">' +
        UI.icon('users', 15) + '</button>'
      : '';
    var courseActions = opts.viewOnly || c.earned || !canManageCourse(c) ? '' :
      '<div class="card-actions">' +
        trainerStudentsAction +
        '<button class="btn-icon" data-act="goto" data-url="' + SITE.u('courseEdit', e(c.id)) + '" title="' + e(t('edit')) + '">' + UI.icon('pencil', 15) + '</button>' +
        (isCourse ? '' : '<button class="btn-icon danger" data-act="del-cert" data-id="' + e(c.id) + '" title="' + e(t('delete')) + '">' + UI.icon('trash', 15) + '</button>') +
      '</div>';
    if (isCourse && opts.homeCourseCard) {
      return '<article class="cert-card course-home-card' + (opts.activeCourse ? ' profile-active-course-card' : '') +
        (opts.pinnedInPersonCourse ? ' course-inperson-pinned' : '') +
        (isComingSoon ? ' is-coming-soon' : '') + '"' +
        cardNavigation + ' data-search="' + e((c.title + ' ' + c.category + ' ' + (desc) + ' ' + (c.skills || []).join(' ')).toLowerCase()) + '">' +
        courseActions +
        '<div class="course-home-media">' +
        (c.image
          ? '<img class="course-home-image" src="' + e(c.image) + '" alt="" loading="lazy" decoding="async">'
          : '<div class="course-home-image-placeholder">' + UI.icon('book-open', 40) + '</div>') +
        (opts.courseListingBadge
          ? '<span class="course-format-badge' +
            (c.courseType === 'in_person' ? '' : ' course-format-badge-online') + '">' +
            UI.icon(c.courseType === 'in_person' ? 'map-pin' : 'laptop', 14) +
            (c.courseType === 'in_person' ? ' دورة وجاهية' : ' دورة أونلاين') + '</span>'
          : '') +
        (opts.activeCourse
          ? '<span class="profile-active-course-badge">' + UI.icon('play', 12) + e(t('plContinue')) + '</span>'
          : '') +
        (isComingSoon ? '<span class="course-coming-soon-badge">' + e(t('courseComingSoon')) + '</span>' : '') +
        '</div>' +
        (c.price && !opts.activeCourse ? '<span class="course-home-price">' + e(c.price) + '</span>' : '') +
        '<div class="course-home-content"><h3>' + e(c.title) + '</h3><div class="course-home-info">' +
        (c.duration ? '<span>' + UI.icon('clock', 13) + e(c.duration) + '</span>' : '') +
        (c.period ? '<span>' + UI.icon('calendar', 13) + e(c.period) + '</span>' : '') +
        '</div>' +
        (opts.activeCourse
          ? '<a class="profile-active-course-link" href="' + e(detailUrl) + '">' +
            e(t('plContinue')) + UI.icon('arrow-left', 15) + '</a>'
          : '') +
        '</div></article>';
    }
    var foot = isCourse
      ? '<div class="cert-foot">' +
          (c.duration ? '<span class="cert-meta">' + UI.icon('clock', 13) + e(c.duration) + '</span>' : '') +
          (isDraftCourse
            ? '<span class="chip warn">' + e(opts.profileInactiveCourse ? t('courseNotActive') : t('draft')) + '</span>'
            : '<span class="verified-mini">' + UI.verifiedBadge(14) + e(t('certApproved')) + '</span>') +
        '</div>'
      : '<div class="cert-foot"><time>' + e(UI.formatDate(c.date)) + '</time><span class="verified-mini">' + UI.verifiedBadge(14) + e(t('certVerified')) + '</span></div>';
    return '<article class="cert-card' + (opts.profileInactiveCourse ? ' profile-inactive-course-card' : '') +
      (isComingSoon ? ' is-coming-soon' : '') + '"' +
      (opts.profileInactiveCourse ? ' aria-disabled="true"' : '') +
      cardNavigation + ' data-search="' + e((c.title + ' ' + c.issuer + ' ' + (c.category || '') + ' ' + (desc) + ' ' + (c.skills || []).join(' ')).toLowerCase()) + '">' +
      courseActions +
      '<div class="cert-thumb">' +
      (c.image ? '<img src="' + e(c.image) + '" alt="" loading="lazy" decoding="async">' : '') +
      '<span class="cert-cat">' + cat + '</span>' +
      (opts.profileInactiveCourse
        ? '<span class="profile-inactive-course-badge">' + e(t('courseNotActive')) + '</span>'
        : '') +
      (isCourse
        ? (c.price ? '<span class="cert-price-tag">' + e(c.price) + '</span>' : '')
        : '<span class="cert-seal">' + UI.verifiedBadge(19) + '</span>') +
      (isComingSoon ? '<span class="course-coming-soon-badge">' + e(t('courseComingSoon')) + '</span>' : '') +
      '</div>' +
      '<div class="cert-body">' +
      '<h3>' + e(c.title) + '</h3>' +
      (isCourse ? '' : '<div class="cert-issuer"><span class="issuer-dot">' + e((c.issuer || '?').charAt(0)) + '</span><span>' + e(c.issuer) + '</span></div>') +
      (isCourse || !desc ? '' : '<p class="cert-desc">' + e(desc) + '</p>') +
      ((c.skills && c.skills.length) ? '<div class="cert-skills">' + skills + '</div>' : '') +
      foot +
      '</div></article>';
  }

  function inPersonCourseCard(course, opts) {
    opts = opts || {};
    var returnPath = opts.returnTo
      ? '&return=' + encodeURIComponent(opts.returnTo)
      : '';
    var href = SITE.u('course', e(course.id)) + '?from=all-users' + returnPath;
    var image = course.image || course.cover || course.courseImage;
    var card =
      '<a class="box inperson-course-card profile-inperson-course-link" href="' + href + '">' +
      (image
        ? '<img src="' + e(image) + '" alt="' + e(course.title) + '" loading="lazy" decoding="async">'
        : '<div class="inperson-course-art">' + UI.icon('users', 40) + '<span>تعلّم وجهاً لوجه</span></div>') +
      '<span class="course-format-badge">' + UI.icon('map-pin', 14) + ' دورة وجاهية</span>' +
      (course.price ? '<span class="price">' + e(course.price) + '</span>' : '') +
      '<div class="content"><h3 class="title">' + e(course.title) + '</h3>' +
      '<div class="info">' +
      (course.duration ? '<h3>' + UI.icon('clock', 13) + e(course.duration) + '</h3>' : '') +
      (course.period ? '<h3>' + UI.icon('calendar', 13) + e(course.period) + '</h3>' : '') +
      '</div></div></a>';

    if (!opts.trainerCourse || !canManageCourse(course)) return card;

    var actions = '<div class="card-actions">' +
      '<button class="btn-icon" data-act="trainer-course-students" data-id="' + e(course.id) +
      '" title="' + e(t('trainerCourseStudents')) + '" aria-label="' + e(t('trainerCourseStudents')) + '">' +
      UI.icon('users', 15) + '</button>' +
      '<button class="btn-icon" data-act="goto" data-url="' +
      SITE.u('courseEdit', e(course.id)) + '" title="' + e(t('edit')) + '">' +
      UI.icon('pencil', 15) + '</button></div>';
    return '<article class="profile-inperson-course-item">' + actions + card + '</article>';
  }

  function projectDetailUrl(id) {
    var source = location.pathname + location.search + location.hash;
    return SITE.u('project', e(id)) + '?return=' + encodeURIComponent(source);
  }

  function projCard(p, opts) {
    if (!opts || typeof opts !== 'object') opts = {};
    var projectTags = (p.tags || []).filter(Boolean);
    var tags = projectTags.map(function (x) { return '<span class="chip">' + e(x) + '</span>'; }).join('');
    var tagStrip = tags
      ? '<div class="proj-tags" dir="' + (document.documentElement.dir || 'rtl') + '">' +
        '<div class="proj-tags-track"><div class="proj-tags-group">' + tags + '</div></div></div>'
      : '';
    var cover = p.cover ? '<img src="' + e(p.cover) + '" alt="" loading="lazy" decoding="async">' : '<div class="no-cover">' + UI.icon('layers', 34) + '</div>';
    var draft = p.status === 'draft' ? '<span class="chip warn" style="position:absolute;top:10px;inset-inline-start:10px;z-index:1">' + e(t('draft')) + '</span>' : '';
    var courseBadge = (p.visibility === 'courses' && p.status !== 'draft')
      ? '<span class="chip course-badge" style="position:absolute;top:10px;inset-inline-start:10px;z-index:1">' + UI.icon('award', 12) + ' ' + e(t('projectCourseBadge')) + '</span>'
      : '';
    var personalBadge = p.visibility === 'personal' && p.status !== 'draft'
      ? '<span class="chip" style="position:absolute;top:10px;inset-inline-start:10px;z-index:1">' + e(t('projectVisibilityPersonal')) + '</span>'
      : '';
    return '<article class="proj-card" data-goto="' + projectDetailUrl(p.id) + '" data-search="' + e((p.title + ' ' + (p.summary || '') + ' ' + (p.tags || []).join(' ')).toLowerCase()) + '">' +
      (!opts.viewOnly && canManageProject(p) ? '<div class="card-actions">' +
      '<button class="btn-icon" data-act="goto" data-url="' + SITE.u('projectEdit', e(p.id)) + '" title="' + e(t('edit')) + '">' + UI.icon('pencil', 15) + '</button>' +
      '<button class="btn-icon danger" data-act="del-project" data-id="' + e(p.id) + '" title="' + e(t('delete')) + '">' + UI.icon('trash', 15) + '</button>' +
      '</div>' : '') +
      '<div class="proj-cover">' + cover + draft + courseBadge + personalBadge + tagStrip + '</div>' +
      '<div class="proj-body"><h3>' + e(p.title) + '</h3><p>' + e(p.summary || '') + '</p>' +
      '<div class="proj-meta">' +
      ((Number.isFinite(Number(p.fileCount)) ? Number(p.fileCount) : (p.files || []).length)
        ? '<span class="pm">' + UI.icon('file', 13) +
          (Number.isFinite(Number(p.fileCount)) ? Number(p.fileCount) : (p.files || []).length) +
          '</span>'
        : '') +
      '</div></div>' +
      '<div class="proj-foot">' +
      '<span class="stat' + (p.liked ? ' like-on' : '') + '">' + UI.iconFilled('heart', 14) + ' ' + (p.likes || 0) + '</span>' +
      '<span class="spacer"></span>' +
      '<span class="stat">' + UI.icon('eye', 14) + ' ' + (p.views || 0) + '</span>' +
      '</div></article>';
  }

  function postMedia(post) {
    if (post.media && post.media.length) return post.media;
    return (post.images || []).map(function (src) { return { type: 'image', src: src }; });
  }

  var RATIO_CLASS = { '1:1': 'ratio-1-1', '4:5': 'ratio-4-5', '1.91:1': 'ratio-191' };

  function mediaCarouselHTML(post) {
    var media = postMedia(post);
    if (!media.length) return '';
    var ratio = RATIO_CLASS[post.ratio] || 'ratio-1-1';
    var slides = media.map(function (m) {
      if (m.type === 'video') {
        return '<div class="mc-slide"><video src="' + e(m.src) + '" controls playsinline preload="none" onclick="event.stopPropagation()"></video></div>';
      }
      return '<div class="mc-slide"><img src="' + e(m.src) + '" alt="" loading="lazy" decoding="async" draggable="false"></div>';
    }).join('');
    var multi = media.length > 1;
    var dots = multi ? '<div class="mc-dots">' + media.map(function (_, i) { return '<i class="' + (i === 0 ? 'on' : '') + '"></i>'; }).join('') + '</div>' : '';
    var arrows = multi
      ? '<button class="mc-arrow mc-prev" data-mc="-1" aria-label="prev">' + UI.icon('chevron-left', 15) + '</button>' +
        '<button class="mc-arrow mc-next" data-mc="1" aria-label="next">' + UI.icon('chevron-right', 15) + '</button>'
      : '';
    return '<div class="post-media ' + ratio + '">' + dots + arrows + '<div class="mc-track">' + slides + '</div></div>';
  }

  function tagsRow(tags) {
    if (!tags || !tags.length) return '';
    return '<div class="post-tags">' + tags.map(function (x) {
      return '<button class="tag" data-act="search-tag" data-tag="' + e(x) + '">#' + e(x) + '</button>';
    }).join('') + '</div>';
  }

  function commentHTML(c, postId, depth, readOnly) {
    var isMe = c.handle === Store.state.profile.handle;
    var replies = (c.replies || []).map(function (r) { return commentHTML(r, postId, depth + 1, readOnly); }).join('');
    return '<div class="comment' + (depth ? ' comment-reply' : '') + '" data-comment="' + e(c.id) + '" data-post="' + e(postId) + '">' +
      UI.avatarOf({ name: c.author, avatar: c.avatar }, depth ? 28 : 34) +
      '<div class="comment-main">' +
      '<div class="comment-text"><span class="comment-name">' + e(c.author) + (isMe ? ' ' + UI.verifiedBadge(12) : '') + '</span>' + e(c.text) + '</div>' +
      '<div class="comment-meta">' +
      '<span>' + e(UI.timeAgo(c.createdAt)) + '</span>' +
      (c.likes ? '<span class="cm-likes">' + e(UI.countFmt('likes', c.likes)) + '</span>' : '') +
      (!readOnly && depth < 1 ? '<button data-act="reply">' + e(t('reply')) + '</button>' : '') +
      '</div>' +
      (replies ? '<div class="comment-replies">' + replies + '</div>' : '') +
      (!readOnly ? '<div class="reply-box hide">' +
      UI.avatarOf(Store.state.profile, 26) +
      '<input class="input" placeholder="' + e(t('replyPlaceholder')) + '" data-reply-input>' +
      '<button class="btn-icon sm" data-act="send-reply" title="' + e(t('send')) + '">' + UI.icon('send', 15) + '</button>' +
      '</div>' : '') +
      '</div>' +
      (readOnly ? '' : '<button class="c-like' + (c.liked ? ' liked' : '') + '" data-act="like-comment" title="' + e(t('like')) + '">' + UI.icon('heart', 14) + '</button>') +
      '</div>';
  }

  function commentsSectionHTML(post, full, opts) {
    opts = opts || {};
    var comments = post.comments || [];
    var html = '';
    if (full && !comments.length) {
      html += '<p class="tiny muted" style="padding:2px 0 10px">' + e(t('noComments')) + '</p>';
    }
    var shown = full ? comments : comments.slice(0, 2);
    html += shown.map(function (c) { return commentHTML(c, post.id, 0, opts.readOnly); }).join('');
    if (!opts.noInput) {
      html += '<div class="comment-input-row">' +
        UI.avatarOf(Store.state.profile, 32) +
        '<input class="input" placeholder="' + e(t('commentPlaceholder')) + '" data-comment-input>' +
        '<button class="ci-send" data-act="send-comment">' + e(t('post')) + '</button>' +
        '</div>';
    }
    return html;
  }


  var SHARE_NETS = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'x', label: 'X' },
    { id: 'threads', label: 'Threads' }
  ];

  function shareMenuHTML() {
    return SHARE_NETS.map(function (n) {
      return '<button data-act="share-to" data-net="' + n.id + '"><span class="sw-ic sw-' + n.id + '">' + UI.icon(n.id, 17) + '</span>' + n.label + '</button>';
    }).join('');
  }

  function postCard(post, opts) {
    opts = opts || {};
    var prof = Store.state.profile;
    var likedCls = post.liked ? ' liked' : '';
    var savedCls = post.saved ? ' saved-on' : '';
    var nComments = (post.comments || []).length;
    var serverPost = Store.usingServerPosts;
    var canManage = !serverPost && !opts.viewOnly && isOwner(post);
    var menuHtml = canManage ? '<div class="post-menu-wrap">' +
      '<button class="btn-icon" data-act="menu">' + UI.icon('more-horizontal', 18) + '</button>' +
      '<div class="post-menu">' +
      '<button data-act="share" data-url="' + e(location.href) + '">' + UI.icon('share-2', 15) + e(t('shareCta')) + '</button>' +
      '<button class="danger" data-act="del-post" data-id="' + e(post.id) + '">' + UI.icon('trash', 15) + e(t('delete')) + '</button>' +
      '</div></div>' : '';
    var author = post.author || prof.name;
    var authorHandle = post.handle || prof.handle;
    var authorAvatar = post.avatar || prof.avatar;
    return '<article class="post" data-post="' + e(post.id) + '">' +
      '<header class="post-head">' +
      UI.avatarOf({ name: author, avatar: authorAvatar }, 36) +
      '<div class="grow">' +
      '<div class="post-author">' + e(author) + (prof.verified && (!post.handle || post.handle === prof.handle) ? UI.verifiedBadge(14) : '') + '</div>' +
      '<div class="post-sub"><span>@' + e(authorHandle) + '</span><span class="dot"></span><span>' + e(UI.timeAgo(post.createdAt)) + '</span>' +
      (post.editedAt ? '<span class="dot"></span><span>' + e(t('edit')) + '</span>' : '') + '</div>' +
      '</div>' + menuHtml +
      '</header>' +
      mediaCarouselHTML(post) +
      '<div class="post-actions">' +
      (serverPost
        ? '<span class="pa-btn">' + UI.iconFilled('heart', 23) + '<span class="pa-n">' + (post.likes || 0) + '</span></span>' +
          '<span class="pa-btn">' + UI.icon('message-circle', 23) + '<span class="pa-n">' + nComments + '</span></span>'
        : '<button data-act="like-post" class="pa-btn' + likedCls + '" title="' + e(post.liked ? t('liked') : t('like')) + '">' + UI.iconFilled('heart', 23) + '<span class="pa-n">' + (post.likes || 0) + '</span></button>' +
          '<button data-act="focus-comment" class="pa-btn" title="' + e(t('comment')) + '">' + UI.icon('message-circle', 23) + '<span class="pa-n">' + nComments + '</span></button>') +
      '<div class="share-wrap">' +
      '<button data-act="share-menu" class="pa-btn" title="' + e(t('shareCta')) + '">' + UI.icon('send', 23) + '<span class="pa-n">' + (post.shares || 0) + '</span></button>' +
      '<div class="share-menu">' + shareMenuHTML() + '</div>' +
      '</div>' +
      (serverPost
        ? '<span class="pa-btn pa-save">' + UI.icon('bookmark', 23) + '<span class="pa-n">' + (post.saves || 0) + '</span></span>'
        : '<button data-act="save-post" class="pa-btn pa-save' + savedCls + '" title="' + e(post.saved ? t('saved') : t('save')) + '">' + UI.icon('bookmark', 23) + '<span class="pa-n">' + (post.saves || 0) + '</span></button>') +
      '</div>' +
      '<div class="post-likes">' + e(UI.countFmt('likes', post.likes)) + '</div>' +
      '<div class="post-caption prose">' +
      '<div class="cap-text"><span class="cap-name">' + e(author) + '</span>' + UI.sanitize(post.content) + '</div>' +
      tagsRow(post.tags) +
      '<button class="cap-more hide">' + e(t('showMore')) + '</button>' +
      '</div>' +
      (opts.full ? '<div class="post-comments">' + commentsSectionHTML(post, true, { readOnly: serverPost, noInput: serverPost }) + '</div>' : '') +
      '</article>';
  }

  function initCaptions(root) {
    (root || document).querySelectorAll('.post-caption').forEach(function (cap) {
      var text = cap.querySelector('.cap-text');
      var more = cap.querySelector('.cap-more');
      if (!text || !more) return;
      if (text.scrollHeight <= text.clientHeight + 2) { more.classList.add('hide'); return; }
      more.classList.remove('hide');
      more.onclick = function () {
        cap.classList.add('expanded');
        more.classList.add('hide');
      };
    });
  }

  /* ---------- chrome ---------- */

  function mountChrome() {
    if (window.SiteChrome && SiteChrome.mount) SiteChrome.mount();
  }

  /* ---------- home ---------- */

  function renderProfile() {
    var p = Store.state.profile;
    var host = document.getElementById('profileCard');
    host.innerHTML =
      '<div class="profile-banner"' + (p.cover ? ' style="background-image:url(\'' + e(p.cover) + '\')"' : '') + '>' +
      '<span class="bub" style="width:160px;height:160px;top:-60px;inset-inline-end:12%"></span>' +
      '<span class="bub" style="width:90px;height:90px;bottom:-30px;inset-inline-start:18%"></span>' +
      '</div>' +
      '<div class="profile-body">' +
      '<div class="profile-top">' +
      '<div class="profile-avatar-wrap">' +
      '<img class="profile-avatar" src="' + e(p.avatar || UI.profileAvatarFallback(p.name, 220)) + '" alt="' + e(p.name) + '" fetchpriority="high">' +
      '<button class="avatar-edit" data-act="edit-profile" title="' + e(t('profileEdit')) + '">' + UI.icon('camera', 14) + '</button>' +
      '</div>' +
      '<div class="profile-head">' +
      '<div class="name-row"><h1>' + e(p.name) + '</h1>' + (p.verified ? UI.verifiedBadge(20) : '') + '</div>' +
      (p.title ? '<div class="profile-handle"><span class="profile-title-pill">' + e(p.title) + '</span></div>' : '') +
      '</div>' +
      '<div class="profile-actions">' +
      '<button class="btn btn-soft btn-sm" data-act="edit-profile">' + UI.icon('pencil', 15) + e(t('profileEdit')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="share-profile">' + UI.icon('share-2', 15) + e(t('profileShare')) + '</button>' +
      '</div>' +
      '</div>' +
      (p.bio ? '<p class="bio">' + e(p.bio) + '</p>' : '') +
      (p.website
        ? '<div class="profile-meta"><a class="pm" data-act="confirm-profile-website" href="https://' +
          e(p.website.replace(/^https?:\/\//, '')) + '" target="_blank" rel="noopener">' +
          UI.icon('link', 14) + e(p.website) + '</a></div>'
        : '') +
      UI.socialLinksHTML(p.social_links || p.socials) +
      '</div>' +
      (SERVER_PROFILE && SERVER_PROFILE.showReferralStats === true &&
        typeof SERVER_PROFILE.referral_points === 'number'
        ? '<div class="referral-summary" aria-label="إحصائيات الإحالة">' +
          '<div class="referral-stat referral-stat-points">' +
          '<span class="referral-stat-icon referral-stat-star" aria-hidden="true">⭐</span>' +
          '<span class="referral-stat-copy"><span class="referral-stat-label">إجمالي نقاط الإحالة</span><b>' + (SERVER_PROFILE.referral_points || 0) + '</b></span>' +
          '</div>' +
          '<div class="referral-stat referral-stat-visits">' +
          '<span class="referral-stat-icon">' + UI.icon('globe', 21) + '</span>' +
          '<span class="referral-stat-copy"><span class="referral-stat-label">زيارات روابطك</span><b>' + (SERVER_PROFILE.referral_visits || 0) + '</b></span>' +
          '</div></div>'
        : '');
  }

  function confirmProfileWebsiteOpen(url) {
    var dialog = UI.modal({
      title: t('websiteConfirmTitle'),
      body: '<div class="website-confirm-content">' +
        '<span class="website-confirm-icon" aria-hidden="true">' + UI.icon('external-link', 22) + '</span>' +
        '<p class="modal-text">' + e(t('websiteConfirm')) + '</p>' +
        '<span class="website-confirm-url" dir="ltr">' + e(url) + '</span>' +
        '</div>',
      footer: '<button class="btn btn-ghost" type="button" data-website-cancel>' + e(t('cancel')) + '</button>' +
        '<button class="btn btn-primary" type="button" data-website-confirm>' +
        UI.icon('external-link', 16) + e(t('websiteOpen')) + '</button>',
      size: 'sm'
    });
    dialog.el.querySelector('[data-website-cancel]').addEventListener('click', dialog.close);
    dialog.el.querySelector('[data-website-confirm]').addEventListener('click', function () {
      dialog.close();
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  function renderProfileTabs() {
    var host = document.getElementById('profileTabs');
    if (!host) return;
    var tabs = [];
    var trainerCertificates = IS_TRAINER ? (earnedCerts() || []) : [];
    if (SERVER_PROFILE && SERVER_PROFILE.roleKey === 'student') {
      tabs.push({
        id: 'active-courses',
        count: Store.activeCourses().length,
        label: 'studentActiveCourses',
        icon: 'play'
      });
    }
    tabs.push({
      id: 'certificates',
      count: IS_TRAINER ? trainerCertificates.length : certStatCount(),
      label: 'studentProfileCertificates',
      icon: 'award'
    });
    if (IS_TRAINER) {
      tabs.push({
        id: 'trainer-courses',
        count: (Store.myCourses() || []).length,
        label: 'trainerProfileCourses',
        icon: 'graduation-cap'
      });
    }
    tabs.push({
        id: 'projects',
        count: Store.totals().projects,
        label: IS_TRAINER
          ? 'trainerProfileProjects'
          : (SERVER_PROFILE && SERVER_PROFILE.roleKey === 'student'
            ? 'studentProfileProjects'
            : 'statProjects'),
        icon: 'folder'
      });
    if (SERVER_PROFILE) {
      tabs.push({
        id: 'saved',
        count: Store.collection('savedProjects').length,
        label: 'savedProjects',
        icon: 'bookmark'
      });
    }

    host.innerHTML = tabs.map(function (tab) {
      var selected = activeTab === tab.id;
      return '<button class="profile-tab' + (selected ? ' is-active' : '') + '" type="button" role="tab" ' +
        'data-act="tab" data-tab="' + tab.id + '" aria-selected="' + selected + '" ' +
        'aria-controls="panel-' + tab.id + '">' +
        UI.icon(tab.icon, 18) +
        '<span class="profile-tab-label">' + e(t(tab.label)) + '</span>' +
        '<span class="profile-tab-count">' + tab.count + '</span>' +
        '</button>';
    }).join('');
  }

  function initSkillTagScroller(scroller) {
    if (!scroller || scroller.dataset.skillScrollerInitialized === 'true') return;
    scroller.dataset.skillScrollerInitialized = 'true';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isRtl = window.getComputedStyle(scroller).direction === 'rtl';
    var dragging = false;
    var dragX = 0;
    var dragScrollLeft = 0;
    var pausedUntil = 0;
    var hovering = false;
    var direction = isRtl ? -1 : 1;
    var previousTime = 0;

    function pauseAutoScroll() {
      pausedUntil = performance.now() + 2800;
    }

    scroller.addEventListener('pointerdown', function (event) {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      dragging = true;
      dragX = event.clientX;
      dragScrollLeft = scroller.scrollLeft;
      scroller.classList.add('is-dragging');
      scroller.setPointerCapture(event.pointerId);
      pauseAutoScroll();
    });

    scroller.addEventListener('pointermove', function (event) {
      if (!dragging) return;
      scroller.scrollLeft = dragScrollLeft + (isRtl ? -1 : 1) * (event.clientX - dragX);
    });

    function endDrag() {
      dragging = false;
      scroller.classList.remove('is-dragging');
    }

    scroller.addEventListener('pointerup', endDrag);
    scroller.addEventListener('pointercancel', endDrag);
    scroller.addEventListener('mouseenter', function () { hovering = true; });
    scroller.addEventListener('mouseleave', function () { hovering = false; });
    scroller.addEventListener('wheel', pauseAutoScroll, { passive: true });
    scroller.addEventListener('touchstart', pauseAutoScroll, { passive: true });

    function animate(time) {
      if (!scroller.isConnected) return;
      if (scroller.scrollWidth > scroller.clientWidth && !reduceMotion && !document.hidden && !hovering && !dragging && time >= pausedUntil) {
        if (previousTime) {
          var maxScroll = scroller.scrollWidth - scroller.clientWidth;
          var step = Math.min((time - previousTime) * 0.012, 1.2);
          scroller.scrollLeft += direction * step;
          if (!isRtl && scroller.scrollLeft >= maxScroll - 1) direction = -1;
          else if (!isRtl && scroller.scrollLeft <= 1) direction = 1;
          else if (isRtl && scroller.scrollLeft <= -maxScroll + 1) direction = 1;
          else if (isRtl && scroller.scrollLeft >= -1) direction = -1;
        }
      }
      previousTime = time;
      window.requestAnimationFrame(animate);
    }

    window.requestAnimationFrame(animate);
  }

  function renderSkills() {
    var skills = Store.collection('skills');
    var host = document.getElementById('skillsCard');
    var shown = skills;
    host.innerHTML =
      '<div class="card-head">' +
      '<h2>' + UI.icon('zap', 17) + e(t('skills')) + '</h2>' +
      '<span class="spacer"></span>' +
      (skills.length > 4 ? '<button class="link-btn" data-act="toggle-skills">' + e(skillsExpanded ? t('showLess') : t('showAll')) + UI.icon('chevron-down', 14) + '</button>' : '') +
      '</div>' +
      (skills.length ? '<div class="skills-grid ' + (skillsExpanded ? 'is-expanded' : 'is-collapsed skill-tags-scroll') + '">' + shown.map(function (s) {
        return '<div class="skill-item' + (skillsExpanded ? '' : ' skill-tag') + '">' +
          (skillsExpanded
            ? '<div class="skill-top"><span class="sk-name">' + e(s.name) + '</span><span class="sk-pct">' + (s.level || 0) + '%</span></div>' +
              '<div class="skill-bar"><i style="width:' + (s.level || 0) + '%"></i></div>'
            : '<span class="sk-name">' + e(s.name) + '</span>') +
          '</div>';
      }).join('') + '</div>' : '<p class="tiny muted">' + e(t('skillsEmpty')) + '</p>');
    if (!skillsExpanded) initSkillTagScroller(host.querySelector('.skill-tags-scroll'));
  }

  function syncProfileTabs() {
    document.querySelectorAll('#profileTabs [data-tab]').forEach(function (el) {
      var on = el.getAttribute('data-tab') === activeTab;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', on);
    });
  }

  function matches(item) {
    if (!searchQuery) return true;
    var el = document.createElement('div');
    if (item.content) el.innerHTML = item.content;
    var hay = [item.title, item.issuer, item.summary, item.category, (item.tags || []).join(' '), item.content ? el.textContent : ''].join(' ').toLowerCase();
    return hay.indexOf(searchQuery.toLowerCase()) >= 0;
  }

  function filterItems(kind) {
    var list;
    if (kind === 'certificates') list = Store.certificatesWithEarned().filter(function (x) { return matches(x); });
    else if (kind === 'projects') list = Store.collection('projects').filter(function (x) { return matches(x); });
    else if (kind === 'savedProjects') list = Store.collection('savedProjects').filter(function (x) { return matches(x); });
    else list = Store.collection('posts').filter(function (x) { return matches(x); });
    return list;
  }

  function renderPanels() {
    var activeCoursesHost = document.getElementById('panel-active-courses');
    if (activeCoursesHost && SERVER_PROFILE && SERVER_PROFILE.roleKey === 'student') {
      var activeCourses = Store.activeCourses().filter(matches);
      activeCoursesHost.innerHTML = activeCourses.length
        ? '<div class="card-grid profile-course-grid active-courses-grid">' + activeCourses.map(function (course) {
            return certCard(course, { course: true, homeCourseCard: true, activeCourse: true });
          }).join('') + '</div>'
        : UI.emptyState('play', searchQuery ? t('emptySearch') : t('activeCoursesEmpty'),
          searchQuery ? '' : t('activeCoursesEmptySub'),
          searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('courses') + '">' + UI.icon('play', 16) + e(t('myCertsCta')) + '</a>');
    }

    if (IS_TRAINER) {
      var myCourses = (Store.myCourses() || []).filter(matches).sort(function (a, b) {
        return Number(b.courseType === 'in_person') - Number(a.courseType === 'in_person');
      });
      document.getElementById('panel-trainer-courses').innerHTML = myCourses.length
        ? '<div class="card-grid profile-course-grid trainer-profile-course-grid">' + myCourses.map(function (c) {
            return certCard(c, {
              course: true,
              homeCourseCard: true,
              trainerCourse: true,
              returnTo: location.pathname + location.search + location.hash
            });
          }).join('') + '</div>'
        : UI.emptyState('graduation-cap', searchQuery ? t('emptySearch') : t('trainerCoursesEmpty'), searchQuery ? '' : t('trainerCoursesEmptySub'),
          searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('courseCreate') + '">' + UI.icon('plus', 16) + e(t('addCourse')) + '</a>');
      var allTrainerCerts = earnedCerts() || [];
      var trainerCerts = allTrainerCerts.filter(matches);
      var certificateAddButton = '<button class="btn btn-primary" data-act="new-cert">' +
        UI.icon('plus', 15) + e(t('addCert')) + '</button>';
      document.getElementById('panel-certificates').innerHTML = !allTrainerCerts.length
        ? '<div class="trainer-certificates-empty">' +
          UI.emptyState('award', t('certEmpty'), t('certEmptySub'), certificateAddButton) +
          '</div>'
        : '<div class="trainer-certificates-toolbar">' + certificateAddButton + '</div>' +
          (trainerCerts.length
          ? '<div class="card-grid profile-certificate-grid">' + trainerCerts.map(function (cert) {
            if (cert.workshop) return workshopCertificateCard(cert);
            return cert.manual
              ? certCard(cert, { manualImage: true })
              : certCard(cert, { returnTo: location.pathname + location.search + location.hash, imageOnly: true });
          }).join('') + '</div>'
          : UI.emptyState('award', searchQuery ? t('emptySearch') : t('certEmpty'),
            searchQuery ? '' : t('certEmptySub')));

      renderOtherPanels();

      document.querySelectorAll('.panel').forEach(function (el) {
        el.classList.toggle('active', el.id === 'panel-' + activeTab);
      });
      syncProfileTabs();
      return;
    }

    /* الطالب: يعرض شهاداته المكتسبة فقط (المدرب يعرض دوراته) */
    var mine = earnedCerts();
    var certs = mine ? mine.filter(matches) : filterItems('certificates');
    var profileReturn = location.pathname + location.search + location.hash;

    document.getElementById('panel-certificates').innerHTML = certs.length
      ? '<div class="card-grid profile-certificate-grid">' + certs.map(function (cert) {
          if (cert.workshop) return workshopCertificateCard(cert);
          return cert.manual
            ? certCard(cert, { manualImage: true })
            : certCard(cert, { returnTo: profileReturn, imageOnly: true });
        }).join('') + '</div>'
      : (mine
        ? UI.emptyState('award', searchQuery ? t('emptySearch') : t('myCertsEmpty'), searchQuery ? '' : t('myCertsEmptySub'),
          searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('courses') + '">' + UI.icon('play', 16) + e(t('myCertsCta')) + '</a>')
        : UI.emptyState('award', searchQuery ? t('emptySearch') : t('certEmpty'), searchQuery ? '' : t('certEmptySub'),
          searchQuery ? '' : '<button class="btn btn-primary" data-act="new-cert">' + UI.icon('plus', 16) + e(t('addCert')) + '</button>'));

    renderOtherPanels();

    document.querySelectorAll('.panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + activeTab);
    });
    syncProfileTabs();
  }

  function openTrainerCourseStudents(courseId) {
    var course = (Store.myCourses() || []).filter(function (item) {
      return String(item.id) === String(courseId);
    })[0];
    if (!course) return;

    var modal = UI.modal({
      title: t('trainerCourseStudents') + ' — ' + course.title,
      size: 'md',
      body: '<p class="tiny muted">' + e(t('trainerCourseStudentsLoading')) + '</p>'
    });
    fetch(SITE.u('trainerCourseStudents', course.id), { credentials: 'same-origin' })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) {
            throw new Error(data.message || t('trainerCourseStudentsError'));
          }
          return data;
        });
      })
      .then(function (data) {
        if (!modal.el.isConnected) return;
        modal.body.innerHTML = data.students.length
          ? '<div class="trainer-course-students-list">' + data.students.map(function (student) {
            var percent = Math.max(0, Math.min(100, Number(student.progress) || 0));
            var progressText = t('trainerCourseLessonsProgress')
              .replace('{{done}}', String(student.completedLessons))
              .replace('{{total}}', String(student.totalLessons));
            if (student.completed) progressText = t('trainerCourseComplete');
            return '<article class="trainer-course-student">' +
              UI.avatarOf({ name: student.name, avatar: student.avatar }, 42) +
              '<div class="trainer-course-student-main"><div class="trainer-course-student-heading">' +
              '<b>' + e(student.name) + '</b>' +
              (student.handle ? '<span dir="ltr">@' + e(student.handle) + '</span>' : '') +
              '</div><div class="trainer-course-progress-label"><span>' +
              e(t('trainerCourseProgress')) + '</span><b>' + percent + '%</b></div>' +
              '<div class="trainer-course-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
              percent + '"><span style="width:' + percent + '%"></span></div>' +
              '<small>' + e(progressText) + '</small></div></article>';
          }).join('') + '</div>'
          : '<p class="tiny muted">' + e(t('trainerCourseStudentsEmpty')) + '</p>';
      })
      .catch(function (error) {
        if (modal.el.isConnected) {
          modal.body.innerHTML = '<p class="tiny muted">' +
            e(error.message || t('trainerCourseStudentsError')) + '</p>';
        }
      });
  }

  function workshopCertificateCard(certificate) {
    return '<article class="cert-card cert-card-preview workshop-certificate-preview" data-goto="' +
      e(SITE.u('certificate', certificate.id)) + '" aria-label="' +
      e(t('certPageWorkshopLabel')) + '">' +
      earnedCertificateSheet(
        certificate,
        certificate.studentNameArabic || (SERVER_PROFILE && SERVER_PROFILE.fullNameArabic) || certificate.studentName || '',
        true
      ) +
      '</article>';
  }

  /* Project and saved-project panels on the personal portfolio. */
  function renderOtherPanels() {
    var allProjects = Store.collection('projects');
    var trainerProjects = allProjects;
    var projects = trainerProjects;
    if (IS_TRAINER && trainerProjectVisibility !== 'all') {
      projects = trainerProjects.filter(function (project) {
        return project.visibility === trainerProjectVisibility;
      });
    }
    var projs = projects.filter(matches);
    var savedProjects = filterItems('savedProjects');
    var filterControl = IS_TRAINER
      ? '<div class="row gap-12" style="justify-content:flex-end;margin-bottom:16px"><select class="input" id="trainerProjectVisibilityFilter" aria-label="' + e(t('trainerProjectFilterLabel')) + '" style="width:auto;min-width:190px">' +
        '<option value="all"' + (trainerProjectVisibility === 'all' ? ' selected' : '') + '>' + e(t('trainerProjectFilterAll')) + ' (' + trainerProjects.length + ')</option>' +
        '<option value="public"' + (trainerProjectVisibility === 'public' ? ' selected' : '') + '>' + e(t('trainerProjectFilterPublic')) + ' (' + trainerProjects.filter(function (project) { return project.visibility === 'public'; }).length + ')</option>' +
        '<option value="courses"' + (trainerProjectVisibility === 'courses' ? ' selected' : '') + '>' + e(t('trainerProjectFilterCourses')) + ' (' + trainerProjects.filter(function (project) { return project.visibility === 'courses'; }).length + ')</option>' +
        '<option value="personal"' + (trainerProjectVisibility === 'personal' ? ' selected' : '') + '>' + e(t('projectVisibilityPersonal')) + ' (' + trainerProjects.filter(function (project) { return project.visibility === 'personal'; }).length + ')</option>' +
        '</select></div>'
      : '';
    var projectGridClass = 'card-grid profile-project-grid' +
      (IS_TRAINER ? ' trainer-profile-project-grid' : '');
    var projectContent = projs.length
      ? '<div class="' + projectGridClass + '">' + projs.map(function (p) { return projCard(p); }).join('') + '</div>'
      : UI.emptyState('folder', searchQuery ? t('emptySearch') : t('projEmpty'), searchQuery ? '' : t('projEmptySub'),
        searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('projectCreate') + '">' + UI.icon('plus', 16) + e(t('addProject')) + '</a>');
    document.getElementById('panel-projects').innerHTML = filterControl + projectContent;

    var trainerProjectFilter = document.getElementById('trainerProjectVisibilityFilter');
    if (trainerProjectFilter) {
      trainerProjectFilter.addEventListener('change', function () {
        trainerProjectVisibility = trainerProjectFilter.value;
        renderOtherPanels();
      });
    }

    var savedHost = document.getElementById('panel-saved');
    if (savedHost) {
      savedHost.innerHTML = savedProjects.length
        ? '<div class="card-grid profile-project-grid profile-saved-grid">' + savedProjects.map(function (p) { return projCard(p, { viewOnly: true }); }).join('') + '</div>'
        : UI.emptyState(
          'bookmark',
          searchQuery ? t('emptySearch') : t('savedProjectsEmpty'),
          searchQuery ? '' : t('savedProjectsEmptySub'),
          searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('projects') + '">' +
            UI.icon('folder', 16) + e(t('browseProjects')) + '</a>'
        );
    }
  }

  function setTab(id) {
    activeTab = id;
    document.querySelectorAll('.panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + id);
    });
    syncProfileTabs();
    try { history.replaceState(null, '', '#' + id); } catch (err) { }
  }

  function renderHome() {
    mountChrome({ search: true });
    renderProfile();
    renderSkills();
    renderProfileTabs();
    renderPanels();
    initFab();
  }

  /* ---------- FAB ---------- */

  function initFab() {
    var fab = document.getElementById('fab');
    var menu = document.getElementById('fabMenu');
    if (!fab) return;
    fab.innerHTML = UI.icon('plus', 24);
    menu.innerHTML =
      '<button class="fab-item" data-act="goto" data-url="' + SITE.u('projectCreate') + '">' + UI.icon('folder', 17) + e(t('createProjectCta')) + '</button>' +
      (IS_TRAINER
        ? '<button class="fab-item" data-act="goto" data-url="' + SITE.u('courseCreate') + '">' + UI.icon('graduation-cap', 17) + e(t('createCourseCta')) + '</button>' +
          '<button class="fab-item" data-act="new-cert">' + UI.icon('award', 17) + e(t('createCertCta')) + '</button>'
        : '<button class="fab-item" data-act="new-cert">' + UI.icon('award', 17) + e(t('createCertCta')) + '</button>') +
      (SERVER_PROFILE && SERVER_PROFILE.canScanWorkshops && window.WorkshopScanner
        ? WorkshopScanner.menuItemHTML() + WorkshopScanner.panelHTML()
        : '');
    if (fab.dataset.bound) return;
    fab.dataset.bound = '1';
    fab.addEventListener('click', function (ev) {
      ev.stopPropagation();
      fab.classList.toggle('open');
      menu.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      fab.classList.remove('open');
      menu.classList.remove('open');
    });
  }

  /* ---------- interactions ---------- */

  function closeMenus() {
    document.querySelectorAll('.post-menu.open, .share-menu.open').forEach(function (m) { m.classList.remove('open'); });
  }

  /* ---------- comments bottom sheet ---------- */

  var sheetState = null;

  function closeCommentsSheet() {
    if (!sheetState) return;
    var wrap = sheetState.wrap;
    sheetState = null;
    wrap.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { wrap.remove(); }, 280);
  }

  function renderSheetContent() {
    if (!sheetState) return;
    var post = Store.find('posts', sheetState.postId);
    if (!post) { closeCommentsSheet(); return; }
    var n = (post.comments || []).length;
    sheetState.wrap.querySelector('.sheet-title').textContent = t('commentsTitle') + ' (' + n + ')';
    sheetState.wrap.querySelector('.sheet-body').innerHTML = commentsSectionHTML(post, true, {
      noInput: true,
      readOnly: Store.usingServerPosts
    });
    sheetState.wrap.querySelector('.sheet-foot').innerHTML = Store.usingServerPosts ? '' :
      '<div class="comment-input-row" data-post="' + e(post.id) + '">' +
      UI.avatarOf(Store.state.profile, 32) +
      '<input class="input" placeholder="' + e(t('commentPlaceholder')) + '" data-comment-input>' +
      '<button class="ci-send" data-act="send-comment">' + e(t('post')) + '</button>' +
      '</div>';
  }

  function refreshSheet(postId) {
    if (sheetState && sheetState.postId === postId) renderSheetContent();
  }

  function openCommentsSheet(postId) {
    var post = Store.find('posts', postId);
    if (!post) return;
    if (sheetState && sheetState.postId === postId) return;
    closeCommentsSheet();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML =
      '<div class="sheet-backdrop"></div>' +
      '<div class="sheet">' +
      '<div class="sheet-grab"><i></i></div>' +
      '<div class="sheet-head">' +
      '<button class="btn-icon sheet-x" data-act="close-sheet" title="' + e(t('cancel')) + '">' + UI.icon('close', 19) + '</button>' +
      '<div class="sheet-title"></div>' +
      '</div>' +
      '<div class="sheet-body"></div>' +
      '<div class="sheet-foot"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    sheetState = { wrap: wrap, postId: postId };
    renderSheetContent();
    requestAnimationFrame(function () { wrap.classList.add('open'); });
    document.body.classList.add('no-scroll');

    wrap.querySelector('.sheet-backdrop').addEventListener('click', closeCommentsSheet);
    wrap.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeCommentsSheet(); });

    var sheet = wrap.querySelector('.sheet');
    var grab = wrap.querySelector('.sheet-grab');
    var head = wrap.querySelector('.sheet-head');
    var startY = null, dy = 0;
    function dragDown(y) { startY = y; dy = 0; sheet.classList.add('dragging'); }
    function dragMove(y) {
      if (startY == null) return;
      dy = Math.max(0, y - startY);
      sheet.style.transform = 'translate(-50%, ' + dy + 'px)';
    }
    function dragUp() {
      if (startY == null) return;
      startY = null;
      sheet.classList.remove('dragging');
      sheet.style.transform = '';
      if (dy > 90) closeCommentsSheet();
    }
    [grab, head].forEach(function (el) {
      el.addEventListener('touchstart', function (ev) { dragDown(ev.touches[0].clientY); }, { passive: true });
      el.addEventListener('mousedown', function (ev) { ev.preventDefault(); dragDown(ev.clientY); });
    });
    document.addEventListener('touchmove', function (ev) { if (startY != null) dragMove(ev.touches[0].clientY); }, { passive: true });
    document.addEventListener('touchend', dragUp);
    document.addEventListener('mousemove', function (ev) { if (startY != null) dragMove(ev.clientY); });
    document.addEventListener('mouseup', dragUp);
  }

  function updatePostDOM(postId) {
    var post = Store.find('posts', postId);
    if (!post) return;
    document.querySelectorAll('[data-post="' + postId + '"]').forEach(function (card) {
      if (card.classList.contains('post')) {
        var oldTrack = card.querySelector('.mc-track');
        var keepLeft = oldTrack ? oldTrack.scrollLeft : 0;
        var tmp = document.createElement('div');
        tmp.innerHTML = postCard(post, { full: card.closest('#detailHost') != null });
        var fresh = tmp.firstChild;
        card.replaceWith(fresh);
        var newTrack = fresh.querySelector('.mc-track');
        if (newTrack && keepLeft) newTrack.scrollLeft = keepLeft;
        initCaptions(fresh);
      }
    });
    refreshSheet(postId);
  }

  function updateCommentLike(postId, commentId) {
    var post = Store.find('posts', postId);
    if (!post) return;
    function walk(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === commentId) {
          list[i].liked = !list[i].liked;
          list[i].likes = (list[i].likes || 0) + (list[i].liked ? 1 : -1);
          return true;
        }
        if (walk(list[i].replies || [])) return true;
      }
      return false;
    }
    walk(post.comments || []);
    Store.save(true);
  }

  function findComment(postId, commentId) {
    var post = Store.find('posts', postId);
    if (!post) return null;
    function walk(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === commentId) return list[i];
        var f = walk(list[i].replies || []);
        if (f) return f;
      }
      return null;
    }
    return walk(post.comments || []);
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var statusCard = ev.target.closest
      ? ev.target.closest('[data-act="manual-cert-status-info"]')
      : null;
    if (!statusCard) return;
    ev.preventDefault();
    statusCard.click();
  });

  document.addEventListener('click', function (ev) {
    var target = ev.target;

    var workshopBackEl = target.closest('[data-workshop-back]');
    if (workshopBackEl) {
      try {
        var referrerUrl = new URL(document.referrer);
        if (referrerUrl.origin === location.origin &&
          (referrerUrl.pathname !== location.pathname || referrerUrl.search !== location.search) &&
          history.length > 1) {
          ev.preventDefault();
          history.back();
          return;
        }
      } catch (err) { }
    }

    var smartBackEl = target.closest('[data-smart-back]');
    if (smartBackEl) {
      var canReturnToHistoryEntry = false;
      try {
        var returnPath = new URLSearchParams(location.search).get('return');
        if (returnPath && document.referrer && history.length > 1) {
          var returnUrl = new URL(returnPath, location.origin);
          var referrerUrl = new URL(document.referrer);
          canReturnToHistoryEntry = returnUrl.origin === location.origin &&
            referrerUrl.origin === location.origin &&
            returnUrl.pathname === referrerUrl.pathname &&
            returnUrl.search === referrerUrl.search;
        }
      } catch (err) { }
      if (canReturnToHistoryEntry) {
        ev.preventDefault();
        history.back();
        return;
      }
    }

    var gotoEl = target.closest('[data-goto]');
    var actEl = target.closest('[data-act]');
    var act = actEl && actEl.getAttribute('data-act');
    if (gotoEl && target.closest('.cd-related-scroll, .related-projects-scroll, .proj-tags') && Date.now() - lastGalleryDrag < 320) {
      ev.preventDefault();
      return;
    }

    if (!target.closest('.post-menu') && !target.closest('[data-act="menu"]') &&
      !target.closest('.share-menu') && !target.closest('[data-act="share-menu"]') &&
      !target.closest('[data-act="share-to"]')) closeMenus();

    if (actEl && (act === 'goto' || act === 'menu' || act === 'like-post' || act === 'save-post' ||
      act === 'like-comment' || act === 'reply' || act === 'send-reply' || act === 'send-comment' ||
      act === 'focus-comment' || act === 'like-stats' || act === 'share' || act === 'del-post' ||
      act === 'del-cert' || act === 'edit-cert' || act === 'del-project' || act === 'tab' ||
      act === 'toggle-skills' || act === 'edit-profile' || act === 'share-profile' ||
      act === 'confirm-profile-website' ||
      act === 'trainer-course-students' ||
      act === 'manual-cert-rejection-reason' || act === 'manual-cert-status-info' ||
      act === 'new-cert' || act === 'search-tag' || act === 'copy-id' || act === 'lightbox' ||
      act === 'print-cert' || act === 'certificate-language' ||
      act === 'del-file' || act === 'like-post-detail' || act === 'save-post-detail' ||
      act === 'share-menu' || act === 'share-to' || act === 'close-sheet')) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    if (!actEl) {
      if (gotoEl) { location.href = gotoEl.getAttribute('data-goto'); return; }
      var arrowBtn = target.closest('[data-mc]');
      if (arrowBtn) {
        var mcMedia = arrowBtn.closest('.post-media');
        var mcTrack = mcMedia && mcMedia.querySelector('.mc-track');
        if (mcTrack) {
          var mcDir = +arrowBtn.getAttribute('data-mc');
          var mcRtl = document.documentElement.dir === 'rtl';
          mcTrack.scrollBy({ left: mcDir * mcTrack.clientWidth * (mcRtl ? -1 : 1), behavior: 'smooth' });
        }
        return;
      }
      var galItem = target.closest('.gal-item');
      var img = galItem ? galItem.querySelector('img') : target.closest('.gallery-grid img, .detail-hero img');
      if (img) {
        if (Date.now() - lastGalleryDrag < 320) return;
        var cardScope = img.closest('.post');
        var list, idx;
        if (cardScope) {
          var p = Store.find('posts', cardScope.getAttribute('data-post'));
          var imgs = postMedia(p || {}).filter(function (m) { return m.type === 'image'; });
          list = imgs.map(function (m) { return m.src; });
          idx = list.indexOf(img.src);
        } else {
          var scope = img.closest('.detail-hero, .gallery-grid, .gallery-row') || document;
          list = Array.prototype.map.call(scope.querySelectorAll('.gallery-grid img, .detail-cover, .detail-hero img, .gallery-row img'), function (x) { return x.src; });
          idx = list.indexOf(img.src);
        }
        UI.lightbox.open(list, idx < 0 ? 0 : idx);
        return;
      }
      return;
    }

    switch (act) {
      case 'confirm-profile-website':
        confirmProfileWebsiteOpen(actEl.href);
        break;

      case 'goto':
        location.href = actEl.getAttribute('data-url');
        break;

      case 'trainer-course-students':
        openTrainerCourseStudents(actEl.getAttribute('data-id'));
        break;

      case 'enroll-course': {
        confirmCourseRegistration(actEl.getAttribute('data-title') || '');
        break;
      }

      case 'tab':
        setTab(actEl.getAttribute('data-tab'));
        break;

      case 'toggle-skills':
        skillsExpanded = !skillsExpanded;
        renderSkills();
        break;

      case 'edit-profile':
        openProfileModal();
        break;

      case 'share-profile': {
        var sp = Store.state.profile || {};
        var shareUrl = sp.handle
          ? location.origin + SITE.u('profile', sp.handle)
          : location.origin + location.pathname;
        UI.shareLink(shareUrl, t('copiedLink'));
        break;
      }

      case 'new-cert':
        openCertModal(null);
        break;

      case 'edit-cert':
        openCertModal(actEl.getAttribute('data-id'));
        break;

      case 'manual-cert-rejection-reason':
        UI.modal({
          title: t('certRejectionReasonTitle'),
          size: 'sm',
          body: '<p class="modal-text">' + e(
            actEl.getAttribute('data-reason') || t('certRejectionReasonUnavailable')
          ) + '</p>'
        });
        break;

      case 'manual-cert-status-info': {
        var manualStatus = actEl.getAttribute('data-status');
        var rejected = manualStatus === 'rejected';
        UI.modal({
          title: t(rejected ? 'certRejectionReasonTitle' : 'certStatusPending'),
          size: 'sm',
          body: '<p class="modal-text">' + e(rejected
            ? (actEl.getAttribute('data-reason') || t('certRejectionReasonUnavailable'))
            : t('certPendingReviewMessage')) + '</p>'
        });
        break;
      }

      case 'del-cert':
        UI.confirm(t('deleteConfirm')).then(function (ok) {
          if (!ok) return;
          var certId = actEl.getAttribute('data-id');
          if (Store.usingServerCourses) {
            fetch(SITE.u('courseDelete'), {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
              body: JSON.stringify({ id: certId })
            }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); }).then(function (res) {
              if (!res || !res.ok) { UI.toast(t((res && res.error) || 'required'), 'error'); return; }
              if (page === 'home') renderHome(); else location.href = SITE.u('courses');
              UI.toast(t('delete'), 'success');
            }).catch(function () { UI.toast(t('required'), 'error'); });
            return;
          }
          Store.remove('certificates', certId);
          if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
          UI.toast(t('delete'), 'success');
        });
        break;

      case 'del-project':
        var delId = actEl.getAttribute('data-id');
        UI.confirm(t('deleteConfirm')).then(function (ok) {
          if (!ok) return;
          if (Store.usingServerProjects) {
            fetch(SITE.u('projectDelete'), {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
              body: JSON.stringify({ id: delId })
            }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); }).then(function (res) {
              if (!res || !res.ok) { UI.toast(t((res && res.error) || 'required'), 'error'); return; }
              if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
              UI.toast(t('delete'), 'success');
            }).catch(function () { UI.toast(t('required'), 'error'); });
            return;
          }
          Store.remove('projects', delId);
          if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
          UI.toast(t('delete'), 'success');
        });
        break;

      case 'del-post':
        var delPostId = actEl.getAttribute('data-id');
        UI.confirm(t('deleteConfirm')).then(function (ok) {
          if (!ok) return;
          Store.remove('posts', delPostId);
          closeCommentsSheet();
          if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
          UI.toast(t('delete'), 'success');
        });
        break;

      case 'menu':
        var menu = actEl.parentElement.querySelector('.post-menu');
        var wasOpen = menu.classList.contains('open');
        closeMenus();
        if (!wasOpen) menu.classList.add('open');
        break;

      case 'like-post':
      case 'like-post-detail': {
        var card = actEl.closest('[data-post]');
        var pid = card.getAttribute('data-post');
        var post = Store.find('posts', pid);
        if (!post) break;
        post.liked = !post.liked;
        post.likes = Math.max(0, (post.likes || 0) + (post.liked ? 1 : -1));
        Store.save(true);
        actEl.classList.add('pop');
        updatePostDOM(pid);
        break;
      }

      case 'save-post':
      case 'save-post-detail': {
        var card2 = actEl.closest('[data-post]');
        var pid2 = card2.getAttribute('data-post');
        var post2 = Store.find('posts', pid2);
        if (!post2) break;
        post2.saved = !post2.saved;
        post2.saves = Math.max(0, (post2.saves || 0) + (post2.saved ? 1 : -1));
        Store.save(true);
        UI.toast(post2.saved ? t('saved') : t('save'), 'success');
        updatePostDOM(pid2);
        break;
      }

      case 'share': {
        var url = actEl.getAttribute('data-url');
        UI.shareLink(new URL(url, location.origin).href);
        break;
      }

      case 'share-menu': {
        var smWrap = actEl.closest('.share-wrap');
        var smMenu = smWrap && smWrap.querySelector('.share-menu');
        if (!smMenu) break;
        var smWas = smMenu.classList.contains('open');
        closeMenus();
        if (!smWas) smMenu.classList.add('open');
        break;
      }

      case 'share-to': {
        var net = actEl.getAttribute('data-net');
        var shCard = actEl.closest('[data-post]');
        var shPid = shCard && shCard.getAttribute('data-post');
        var shPost = shPid && Store.find('posts', shPid);
        var shUrl = location.href;
        var shEnc = encodeURIComponent(shUrl);
        if (net === 'instagram') {
          UI.shareLink(shUrl, t('copied'));
        } else if (net === 'whatsapp') {
          window.open('https://wa.me/?text=' + shEnc, '_blank', 'noopener');
        } else if (net === 'facebook') {
          window.open('https://www.facebook.com/sharer/sharer.php?u=' + shEnc, '_blank', 'noopener');
        } else if (net === 'x') {
          window.open('https://twitter.com/intent/tweet?url=' + shEnc, '_blank', 'noopener');
        } else if (net === 'threads') {
          window.open('https://www.threads.net/intent/post?text=' + shEnc, '_blank', 'noopener');
        }
        if (shPost) {
          shPost.shares = (shPost.shares || 0) + 1;
          Store.save(true);
          updatePostDOM(shPid);
        }
        closeMenus();
        break;
      }

      case 'close-sheet':
        closeCommentsSheet();
        break;

      case 'focus-comment': {
        var fcCard = actEl.closest('[data-post]');
        if (!fcCard) break;
        if (!actEl.closest('#detailHost')) {
          openCommentsSheet(fcCard.getAttribute('data-post'));
          break;
        }
        var c = fcCard.querySelector('[data-comment-input]');
        if (c) { c.focus(); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        break;
      }

      case 'like-stats': {
        var card3 = actEl.closest('[data-post]');
        var p3 = Store.find('posts', card3.getAttribute('data-post'));
        if (p3 && (p3.comments || []).length) card3.querySelector('.post-comments').scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }

      case 'like-comment': {
        var cEl = actEl.closest('[data-comment]');
        updateCommentLike(cEl.getAttribute('data-post'), cEl.getAttribute('data-comment'));
        actEl.classList.toggle('liked');
        var cobj = findComment(cEl.getAttribute('data-post'), cEl.getAttribute('data-comment'));
        if (cobj && cobj.liked) actEl.classList.add('pop');
        break;
      }

      case 'reply': {
        var box = actEl.closest('.comment-main').querySelector('.reply-box');
        box.classList.toggle('hide');
        if (!box.classList.contains('hide')) box.querySelector('input').focus();
        break;
      }

      case 'send-reply': {
        var box2 = actEl.closest('.reply-box');
        sendReply(box2);
        break;
      }

      case 'send-comment': {
        var row = actEl.closest('.comment-input-row');
        sendComment(row);
        break;
      }

      case 'search-tag': {
        searchQuery = actEl.getAttribute('data-tag');
        if (page !== 'home') { location.href = SITE.u('portfolio'); break; }
        var si = document.getElementById('globalSearch');
        if (si) si.value = searchQuery;
        renderProfile();
    renderSkills();
    renderPanels();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }

      case 'copy-id': {
        UI.shareLink(actEl.getAttribute('data-value'));
        break;
      }

      case 'print-cert': {
        var sheet = document.querySelector('.cert-sheet');
        var manualImage = document.querySelector('.manual-certificate-detail-image');
        if ((!sheet && !manualImage) || !window.print) break;
        var wrap = document.createElement('div');
        wrap.id = 'certPrintRoot';
        if (sheet) {
          wrap.appendChild(sheet.cloneNode(true));
        } else {
          var printCard = document.createElement('div');
          printCard.className = 'manual-certificate-print';
          var title = document.querySelector('.cd-title');
          printCard.innerHTML = (title ? '<h1>' + e(title.textContent) + '</h1>' : '') +
            '<img src="' + e(manualImage.src) + '" alt="' + e(manualImage.alt) + '" fetchpriority="high">';
          wrap.appendChild(printCard);
        }
        document.body.appendChild(wrap);
        document.body.classList.add('printing-cert');
        var cleanup = function () {
          document.body.classList.remove('printing-cert');
          wrap.remove();
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
        setTimeout(cleanup, 1500);
        break;
      }

      case 'certificate-language':
        certificateLanguage = actEl.getAttribute('data-language') === 'en' ? 'en' : 'ar';
        renderCourseDetail();
        break;
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    if (ev.target.matches('[data-comment-input]')) {
      ev.preventDefault();
      sendComment(ev.target.closest('.comment-input-row'));
    } else if (ev.target.matches('[data-reply-input]')) {
      ev.preventDefault();
      sendReply(ev.target.closest('.reply-box'));
    }
  });

  document.addEventListener('scroll', function (ev) {
    var track = ev.target;
    if (!track || !track.classList || !track.classList.contains('mc-track')) return;
    var media = track.closest('.post-media');
    if (!media) return;
    var slides = track.children;
    if (!slides.length) return;
    var w = slides[0].offsetWidth || 1;
    var idx = Math.min(slides.length - 1, Math.round(Math.abs(track.scrollLeft) / w));
    var dots = media.querySelectorAll('.mc-dots i');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === idx);
  }, true);

  document.addEventListener('dblclick', function (ev) {
    var mediaEl = ev.target.closest('.post-media');
    if (!mediaEl || ev.target.closest('video') || ev.target.closest('button')) return;
    var card = mediaEl.closest('.post');
    if (!card) return;
    var post = Store.find('posts', card.getAttribute('data-post'));
    var btn = card.querySelector('[data-act="like-post"]');
    if (!post || post.liked || !btn) return;
    btn.click();
    var burst = document.createElement('div');
    burst.className = 'ig-burst';
    burst.innerHTML = UI.iconFilled('heart', 84);
    mediaEl.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 900);
  });

  function sendComment(row) {
    if (!row) return;
    var input = row.querySelector('[data-comment-input]');
    var text = input.value.trim();
    if (!text) return;
    var pid = row.closest('[data-post]').getAttribute('data-post');
    var post = Store.find('posts', pid);
    if (!post) return;
    var prof = Store.state.profile;
    post.comments = post.comments || [];
    post.comments.push({
      id: Store.uid('c'), author: prof.name, handle: prof.handle, avatar: prof.avatar,
      text: text, createdAt: new Date().toISOString(), likes: 0, liked: false, replies: []
    });
    Store.save(true);
    input.value = '';
    updatePostDOM(pid);
    refreshSheet(pid);
    UI.toast(t('newComment'), 'success');
  }

  function sendReply(box) {
    var input = box.querySelector('[data-reply-input]');
    var text = input.value.trim();
    if (!text) return;
    var cEl = box.closest('[data-comment]');
    var pid = cEl.getAttribute('data-post');
    var cid = cEl.getAttribute('data-comment');
    var parent = findComment(pid, cid);
    if (!parent) return;
    var prof = Store.state.profile;
    parent.replies = parent.replies || [];
    parent.replies.push({
      id: Store.uid('r'), author: prof.name, handle: prof.handle, avatar: prof.avatar,
      text: text, createdAt: new Date().toISOString(), likes: 0, liked: false, replies: []
    });
    Store.save(true);
    input.value = '';
    updatePostDOM(pid);
    refreshSheet(pid);
  }

  /* ---------- carousel / gallery row: mouse drag (touch uses native scroll) ---------- */
  (function () {
    var SEL = '.mc-track, .gallery-row, .cd-related-scroll, .related-projects-scroll, .proj-tags';
    var drag = null;
    var touch = null;

    function snapSign(track) {
      return -1;
    }

    document.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0) return;
      var track = ev.target.closest(SEL);
      if (!track) return;
      if (window.innerWidth > 720 && track.matches('.related-projects-scroll')) return;
      if (ev.target.closest('video') || ev.target.closest('.lb-img')) return;
      var btn = ev.target.closest('button');
      if (btn && !btn.classList.contains('gal-item')) return;
      ev.preventDefault();
      drag = {
        track: track,
        x: ev.clientX,
        left: track.matches('.cd-related-scroll, .related-projects-scroll, .proj-tags') ? relatedScrollPosition(track) : track.scrollLeft,
        moved: false,
        mult: track.classList.contains('gallery-row') ? -1 : 1
      };
      track.style.scrollSnapType = 'none';
      track.classList.add('dragging');
    });

    document.addEventListener('mousemove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      var position = drag.left + drag.mult * dx;
      if (drag.track.matches('.cd-related-scroll, .related-projects-scroll, .proj-tags')) relatedSetScrollPosition(drag.track, position);
      else drag.track.scrollLeft = position;
    });

    document.addEventListener('mouseup', function () {
      if (!drag) return;
      finish(drag);
      drag = null;
    });

    function finish(d) {
      var track = d.track;
      track.style.scrollSnapType = '';
      track.classList.remove('dragging');
      if (d.moved && track.classList.contains('mc-track') && track.children.length) {
        var w = track.children[0].offsetWidth || 1;
        var idx = Math.round(Math.abs(track.scrollLeft) / w);
        track.scrollTo({ left: snapSign(track) * idx * w, behavior: 'smooth' });
      }
      if (d.moved) lastGalleryDrag = Date.now();
    }

    document.addEventListener('touchstart', function (ev) {
      if (ev.touches.length !== 1) return;
      var track = ev.target.closest(SEL);
      if (!track) return;
      if (ev.target.closest('video') || ev.target.closest('.lb-img')) return;
      var btn = ev.target.closest('button');
      if (btn && !btn.classList.contains('gal-item')) return;
      touch = { x: ev.touches[0].clientX, moved: false };
    }, { passive: true });

    document.addEventListener('touchmove', function (ev) {
      if (!touch || ev.touches.length !== 1) return;
      if (Math.abs(ev.touches[0].clientX - touch.x) > 6) touch.moved = true;
    }, { passive: true });

    document.addEventListener('touchend', function () {
      if (!touch) return;
      if (touch.moved) lastGalleryDrag = Date.now();
      touch = null;
    });
  })();
  /* ---------- profile modal ---------- */

  function csrfToken() {
    if (window.CSRF_TOKEN) return window.CSRF_TOKEN;
    var m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = parts[0].match(/data:([^;]+)/)[1];
    var binary = atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function submitProfileUpdate(payload, onOk, onFail) {
    var url = SITE.u('profileUpdate');
    if (!url || url === '/') { onFail('no-endpoint'); return; }
    var fd = new FormData();
    fd.append('full_name', payload.name || '');
    if (IS_TRAINER || payload.isTrainerTarget) {
      fd.append('trainer_name_en', payload.trainerNameEnglish || '');
    } else {
      fd.append('full_name_ar', payload.fullNameArabic || '');
      fd.append('full_name_en', payload.fullNameEnglish || '');
    }
    fd.append('whatsapp', payload.whatsapp || '');
    fd.append('profile_form', '1');
    fd.append('handle', (payload.handle || '').replace(/^@/, ''));
    fd.append('headline', payload.title || '');
    if (typeof payload.studentSpecialization === 'string') {
      fd.append('student_specialization', payload.studentSpecialization);
    }
    fd.append('bio', payload.bio || '');
    if (Array.isArray(payload.socialLinks)) {
      fd.append('social_links', JSON.stringify(payload.socialLinks));
    }
    if (payload.github) fd.append('github', payload.github);
    fd.append('skills', JSON.stringify(payload.skills || []));
    if (payload.targetUserId) fd.append('target_user_id', String(payload.targetUserId));
    if (payload.avatarData && payload.avatarData.indexOf('data:image') === 0) {
      fd.append('avatar_data', payload.avatarData);
    }
    fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
      body: fd,
      credentials: 'same-origin'
    }).then(function (res) {
      if (res.redirected && /\/login\//.test(res.url)) { onFail('login'); return null; }
      return res.json().catch(function () { return { ok: false, error: 'server' }; });
    }).then(function (data) {
      if (!data) return;
      if (data.ok) onOk(data); else onFail(data.error || 'server');
    }).catch(function () { onFail('network'); });
  }

  function openProfileModal(targetProfile) {
    var isAdminTarget = !!(targetProfile && targetProfile.adminTargetUserId);
    var p = Object.assign({}, isAdminTarget ? targetProfile : Store.state.profile);
    var isTargetTrainer = isAdminTarget ? !!p.isTrainer : IS_TRAINER;
    var skills = isAdminTarget
      ? (p.skillsWithLevels || []).map(function (skill) { return Object.assign({}, skill); })
      : Store.collection('skills').map(function (s) { return Object.assign({}, s); });
    var avatarDraft = p.avatar || '';

    var bioInitial = (p.bio || '').slice(0, 150);
    var initialProfileSetup = getProfileSetupData();
    var profileSetupSaved = false;
    var titleCategories = Array.isArray(p.freelancerCategories) ? p.freelancerCategories : [];
    var countryCodeChoices = getCountryCallingCodeChoices();
    var accountPhoneParts = p.accountPhone
      ? splitPhoneNumber(p.accountPhone, countryCodeChoices)
      : null;
    var whatsappParts = splitPhoneNumber(p.whatsapp || p.accountPhone || '', countryCodeChoices);
    if (accountPhoneParts && whatsappParts.countryCode !== accountPhoneParts.countryCode) {
      whatsappParts = accountPhoneParts;
    }
    var countryCodeLocked = !!accountPhoneParts;
    var whatsappCountryCode = accountPhoneParts
      ? accountPhoneParts.countryCode
      : whatsappParts.countryCode;
    var countryCodeOptions = countryCodeChoices.map(function (choice) {
      return '<option value="' + e(choice[0]) + '"' +
        (choice[0] === whatsappCountryCode ? ' selected' : '') + '>' +
        e(choice[1]) + '</option>';
    }).join('');
    if (!countryCodeOptions) {
      countryCodeOptions = '<option value="+970" selected>🇵🇸 +970</option>';
    }
    var titleInitial = [p.specialization, p.headline].find(function (value) {
      return titleCategories.indexOf(value) >= 0;
    }) || '';
    var socialPlatforms = [
      { key: 'facebook', label: 'فيسبوك' },
      { key: 'linkedin', label: 'لينكدإن' },
      { key: 'github', label: 'GitHub' },
      { key: 'behance', label: 'Behance' },
      { key: 'x', label: 'X (تويتر)' },
      { key: 'instagram', label: 'إنستغرام' },
      { key: 'youtube', label: 'يوتيوب' },
      { key: 'telegram', label: 'تيليجرام' },
      { key: 'whatsapp', label: 'واتساب' },
      { key: 'other', label: 'أخرى' }
    ];
    var socialLinks = Array.isArray(p.social_links)
      ? p.social_links.filter(function (link) {
        return link.platform_key && link.platform_key !== 'website';
      }).map(function (link) {
        return { platform: link.platform_key, url: link.url || '' };
      })
      : Object.keys(p.socials || {}).map(function (platform) {
        return { platform: platform, url: p.socials[platform] || '' };
      }).filter(function (link) {
        return socialPlatforms.some(function (item) { return item.key === link.platform; });
      });

    var body =
      '<div class="pe-avatar-row">' +
      '<div class="pe-avatar-big"><img id="peAvatar" src="' + e(avatarDraft || UI.profileAvatarFallback(p.name, 200)) + '" alt="">' +
      '<button class="btn-icon" id="peAvatarBtn" title="' + e(t('fieldAvatar')) + '">' + UI.icon('camera', 13) + '</button>' +
      '<input type="file" id="peAvatarFile" accept="image/*" class="hide"></div>' +
      '<div><div class="strong">' + e(t('fieldAvatar')) + '</div><div class="hint">' + e(t('avatarHint')) + '</div></div>' +
      '</div>' +
      '<div class="field"><label class="label">' + e(t('fieldName')) + '</label><input class="input" id="peName" type="text" autocomplete="name" maxlength="150" value="' + e(p.name) + '">' +
      '<p class="hint" id="peNameHint"></p></div>' +
      (isTargetTrainer
        ? '<div class="field"><label class="label">اسم المدرب بالإنجليزية</label><input class="input" id="peTrainerNameEnglish" dir="ltr" autocomplete="name" maxlength="200" value="' + e(p.trainerNameEnglish || p.fullNameEnglish || '') + '" placeholder="Example: Ahmad Khaled">' +
          '<p class="hint">يظهر هذا الاسم على النسخة الإنجليزية من شهادات دوراتك.</p></div>'
        : '<div class="field"><label class="label">الاسم الكامل بالعربية</label><input class="input" id="peFullNameArabic" dir="rtl" lang="ar" autocomplete="name" maxlength="150" value="' + e(p.fullNameArabic || '') + '" placeholder="أحمد محمد خالد عبد الرحمن الحسن"' + (p.fullNameArabic && !isAdminTarget ? ' disabled' : '') + '>' +
          '<p class="hint">' + (isAdminTarget ? 'يمكنك تعديل الاسم من حساب الأدمن في أي وقت.' : 'يُحفظ مرة واحدة ويظهر على النسخة العربية من شهاداتك.') + '</p></div>' +
          '<div class="field"><label class="label">الاسم الكامل بالإنجليزية</label><input class="input" id="peFullNameEnglish" dir="ltr" lang="en" autocomplete="name" maxlength="150" value="' + e(p.fullNameEnglish || '') + '" placeholder="Ahmad Mohammad Khaled Abdul Rahman Alhasan"' + (p.fullNameEnglish && !isAdminTarget ? ' disabled' : '') + '>' +
          '<p class="hint">' + (isAdminTarget ? 'يمكنك تعديل الاسم من حساب الأدمن في أي وقت.' : 'يُحفظ مرة واحدة ويظهر على النسخة الإنجليزية من شهاداتك.') + '</p></div>') +
      '<div class="field"><label class="label">' + e(t('fieldTitle')) + '</label><input class="input" id="peTitle" maxlength="120" value="' + e(titleInitial) + '" placeholder="ابحث عن فئة المستقل">' +
      '<p class="hint">اكتب للبحث، ثم اختر فئة نشطة من القائمة.</p></div>' +
      (!isTargetTrainer
        ? '<div class="field"><label class="label">التخصص <span class="opt">(اختياري)</span></label><input class="input" id="peSpecialization" maxlength="30" value="' + e(p.studentSpecialization || '') + '" placeholder="أدخل تخصصك">' +
          '<p class="hint" id="peSpecializationHint"></p></div>'
        : '') +
      '<div class="field"><label class="label">' + e(t('fieldWhatsapp')) + ' <span class="req">*</span></label>' +
      '<div class="phone-box pe-whatsapp-phone-box" id="peWhatsappBox">' +
      '<div class="country-code-picker" id="peWhatsappCountryCodePicker">' +
      '<select class="input select" id="peWhatsappCountryCode"' + (countryCodeLocked ? ' disabled' : '') + '>' + countryCodeOptions + '</select>' +
      '<button class="country-code-trigger" type="button" aria-label="اختيار مقدمة الدولة" aria-haspopup="listbox" aria-expanded="false"' +
      (countryCodeLocked ? ' disabled' : '') + '>' +
      '<span class="country-code-current-flag" aria-hidden="true"></span><span class="country-code-current-prefix"></span>' +
      (countryCodeLocked ? '' : '<span class="country-code-chevron" aria-hidden="true"></span>') + '</button>' +
      '<div class="country-code-menu" hidden><input class="country-code-search" type="search" inputmode="search" autocomplete="off" placeholder="ابحث برقم المقدمة مثل 970" aria-label="ابحث برقم مقدمة الدولة">' +
      '<div class="country-code-options" role="listbox" aria-label="مقدمات الدول"></div>' +
      '<p class="country-code-empty" aria-live="polite" hidden>لا توجد مقدمة مطابقة</p></div></div>' +
      '<input class="input" id="peWhatsapp" type="tel" dir="ltr" inputmode="numeric" autocomplete="tel-national" required maxlength="14" value="' + e(whatsappParts.nationalNumber) + '" placeholder="رقمك المحلي بدون المقدمة">' +
      '</div>' +
      '<p class="hint" id="peWhatsappHint"></p></div>' +
      '<div class="field"><label class="label">' + e(t('fieldBio')) + '</label>' +
      '<textarea class="textarea" id="peBio" rows="3" maxlength="150">' + e(bioInitial) + '</textarea>' +
      '<p class="hint" id="peBioCount"></p></div>' +
      '<div class="field"><label class="label">حسابات التواصل الاجتماعي</label><div id="peSocialLinks"></div>' +
      '<button class="btn btn-ghost btn-sm" type="button" id="peAddSocialLink">' + UI.icon('plus', 14) + ' إضافة رابط</button>' +
      '<p class="hint error" id="peSocialLinksHint" style="display:none"></p></div>' +
      '<hr class="divider">' +
      '<div class="row gap-8" style="margin-bottom:10px"><h3 class="strong" style="font-size:14px;display:flex;gap:7px;align-items:center">' + UI.icon('zap', 15) + e(t('manageSkills')) + '</h3><span class="spacer"></span><span class="hint">' + e(t('skillsMaxHint')) + '</span></div>' +
      '<div id="peSkills"></div>' +
      '<button class="btn btn-ghost btn-sm" id="peAddSkill">' + UI.icon('plus', 14) + e(t('addSkill')) + '</button>' +
      '<p class="hint error" id="peSkillAlert" style="display:none"></p>';

    var m = UI.modal({
      title: t('editProfileTitle'),
      size: 'md',
      body: body,
      footer: '<button class="btn btn-ghost" id="peCancel">' + e(t('cancel')) + '</button>' +
        '<button class="btn btn-primary" id="peSave">' + UI.icon('check', 15) + e(t('saveChanges')) + '</button>'
    });
    function restoreProfileSetupPreview() {
      if (!profileSetupSaved && initialProfileSetup) {
        updateProfileSetupAlert(initialProfileSetup, false);
      }
    }
    m.el.addEventListener('click', function (event) {
      if (event.target.closest('.modal-x') || event.target.classList.contains('modal-overlay')) {
        restoreProfileSetupPreview();
      }
    });
    m.el.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') restoreProfileSetupPreview();
    });
    m.body.classList.add('pe-profile-edit');
    if (window.mountCountryCodePicker) {
      window.mountCountryCodePicker(m.body.querySelector('#peWhatsappCountryCodePicker'));
    }
    var titleInput = m.body.querySelector('#peTitle');
    var titleValidation = null;
    if (window.createFreelancerCategoryAutocomplete) {
      titleValidation = window.createFreelancerCategoryAutocomplete(titleInput, titleCategories);
    }

    var MAX_SKILLS = 8;

    function renderSkillsEdit() {
      var host = m.body.querySelector('#peSkills');
      host.innerHTML = skills.length ? skills.map(function (s, i) {
        return '<div class="skill-edit-row" data-i="' + i + '">' +
          '<input class="input" data-sk-name value="' + e(s.name) + '">' +
          '<div class="row gap-8"><input type="range" class="range" min="10" max="100" step="5" data-sk-level value="' + (s.level || 50) + '"><span class="pct-badge" data-sk-pct>' + (s.level || 50) + '%</span></div>' +
          '<button class="btn-icon sm danger" data-sk-del>' + UI.icon('trash', 14) + '</button>' +
          '</div>';
      }).join('') : '<p class="tiny muted" style="margin-bottom:8px">' + e(t('skillsEmpty')) + '</p>';
    }
    renderSkillsEdit();

    m.body.querySelector('#peSkills').addEventListener('input', function (ev) {
      var row = ev.target.closest('.skill-edit-row');
      if (!row) return;
      var i = +row.getAttribute('data-i');
      if (ev.target.matches('[data-sk-name]')) skills[i].name = ev.target.value;
      if (ev.target.matches('[data-sk-level]')) {
        skills[i].level = +ev.target.value;
        row.querySelector('[data-sk-pct]').textContent = skills[i].level + '%';
      }
      refreshSave();
    });
    m.body.querySelector('#peSkills').addEventListener('click', function (ev) {
      var del = ev.target.closest('[data-sk-del]');
      if (!del) return;
      skills.splice(+del.closest('.skill-edit-row').getAttribute('data-i'), 1);
      renderSkillsEdit();
      hideSkillAlert();
      refreshSave();
    });
    m.body.querySelector('#peAddSkill').addEventListener('click', function () {
      var alertEl = m.body.querySelector('#peSkillAlert');
      if (skills.length >= MAX_SKILLS) {
        alertEl.textContent = t('skillsMaxReached');
        alertEl.style.display = 'block';
        return;
      }
      alertEl.style.display = 'none';
      skills.push({ id: Store.uid('sk'), name: '', level: 60 });
      renderSkillsEdit();
      refreshSave();
      var rows = m.body.querySelectorAll('.skill-edit-row input[data-sk-name]');
      if (rows.length) rows[rows.length - 1].focus();
    });

    function hideSkillAlert() {
      var alertEl = m.body.querySelector('#peSkillAlert');
      if (alertEl) alertEl.style.display = 'none';
    }

    var BIO_MAX = 150;
    var bioEl = m.body.querySelector('#peBio');
    var bioCountEl = m.body.querySelector('#peBioCount');
    function updateBioCount() {
      var left = BIO_MAX - (bioEl.value ? bioEl.value.length : 0);
      if (left <= 0) {
        bioCountEl.textContent = t('bioLimitReached');
        bioCountEl.classList.add('error');
      } else {
        bioCountEl.textContent = t('bioRemaining', { n: left });
        bioCountEl.classList.remove('error');
      }
    }
    bioEl.addEventListener('input', updateBioCount);
    bioEl.addEventListener('input', refreshSave);
    updateBioCount();

    var nameEl = m.body.querySelector('#peName');
    var nameHintEl = m.body.querySelector('#peNameHint');
    var specializationEl = m.body.querySelector('#peSpecialization');
    var specializationHintEl = m.body.querySelector('#peSpecializationHint');
    var fullNameArabicEl = m.body.querySelector('#peFullNameArabic');
    var fullNameEnglishEl = m.body.querySelector('#peFullNameEnglish');
    var socialLinksEl = m.body.querySelector('#peSocialLinks');
    var socialLinksHintEl = m.body.querySelector('#peSocialLinksHint');
    var whatsappEl = m.body.querySelector('#peWhatsapp');
    var whatsappCountryCodeEl = m.body.querySelector('#peWhatsappCountryCode');
    var whatsappBox = m.body.querySelector('#peWhatsappBox');
    var whatsappHintEl = m.body.querySelector('#peWhatsappHint');
    var saveEl = m.el.querySelector('#peSave');
    var isSaving = false;
    var whatsappTaken = false;
    var whatsappCheckPending = false;
    var whatsappCheckFailed = false;
    var whatsappCheckTimer = null;
    var whatsappCheckRequestId = 0;

    function whatsappInternationalNumber() {
      var countryCode = whatsappCountryCodeEl.value;
      var nationalNumber = whatsappEl.value.replace(/\D/g, '');
      if ((countryCode === '+970' || countryCode === '+972') &&
          /^05\d{8}$/.test(nationalNumber)) {
        nationalNumber = nationalNumber.slice(1);
      }
      return countryCode + nationalNumber;
    }

    function syncWhatsappMaxLength() {
      var isPalestinianPrefix = whatsappCountryCodeEl.value === '+970' ||
        whatsappCountryCodeEl.value === '+972';
      var firstDigit = whatsappEl.value.replace(/\D/g, '').charAt(0);
      var maxLength = isPalestinianPrefix
        ? firstDigit === '5' ? 9 : firstDigit === '0' || !firstDigit ? 10 : 14
        : 14;
      whatsappEl.maxLength = maxLength;
      if (whatsappEl.value.length > maxLength) {
        whatsappEl.value = whatsappEl.value.slice(0, maxLength);
      }
    }

    var URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}([:/?#]\S*)?$/i;

    var nameValid = true;
    var specializationValid = true;
    var socialLinksValid = true;
    var whatsappValid = false;
    var titleValid = !titleInput.value.trim() || !!(titleValidation && titleValidation.isValid());

    function restrictNameCharacters(input, allowedPattern) {
      if (!input) return;
      input.addEventListener('input', function () {
        var start = input.selectionStart;
        var original = input.value;
        var sanitized = original.replace(allowedPattern, '');
        if (sanitized === original) return;
        var removedBeforeCursor = original.slice(0, start).replace(allowedPattern, '').length;
        input.value = sanitized;
        input.setSelectionRange(start - removedBeforeCursor, start - removedBeforeCursor);
      });
    }

    restrictNameCharacters(fullNameArabicEl, /[^\p{Script=Arabic}\p{M}\s]/gu);
    restrictNameCharacters(fullNameEnglishEl, /[^A-Za-z\s'-]/g);

    function setHint(el, msg, cls) {
      el.textContent = msg;
      el.classList.remove('error', 'ok');
      if (cls) el.classList.add(cls);
    }

    function refreshSave() {
      saveEl.disabled = isSaving || whatsappCheckPending ||
        whatsappTaken || whatsappCheckFailed;
      updateProfileSetupPreview();
    }

    function focusProfileEditField(input) {
      if (!input) return;
      m.body.querySelectorAll('.pe-validation-current').forEach(function (field) {
        field.classList.remove('pe-validation-current');
      });
      var field = input.closest('.field') || input.closest('.pe-social-row') || input;
      field.classList.add('pe-validation-current');
      var bodyRect = m.body.getBoundingClientRect();
      var fieldRect = field.getBoundingClientRect();
      var top = m.body.scrollTop + fieldRect.top - bodyRect.top -
        (m.body.clientHeight - fieldRect.height) / 2;
      m.body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      input.focus({ preventScroll: true });
    }

    titleInput.addEventListener('freelancer-category-validation', function (event) {
      titleValid = event.detail.valid;
      refreshSave();
    });
    titleInput.addEventListener('input', refreshSave);

    function checkNameLive() {
      var value = nameEl.value.trim();
      var words = value ? value.split(/\s+/).filter(Boolean) : [];
      var lettersOnly = /^[\p{L}\p{M}\s]+$/u.test(value) &&
        words.every(function (word) { return /\p{L}/u.test(word); });
      nameValid = false;
      if (!value) setHint(nameHintEl, t('nameWordsHint'), 'error');
      else if (!lettersOnly) setHint(nameHintEl, t('nameLettersOnly'), 'error');
      else if (words.length < 2) setHint(nameHintEl, t('nameTooShort'), 'error');
      else if (words.length > 3) setHint(nameHintEl, t('nameTooLong'), 'error');
      else {
        nameValid = true;
        setHint(nameHintEl, t('nameValid'), 'ok');
      }
      refreshSave();
      return nameValid;
    }

    function checkSpecializationLive() {
      if (!specializationEl) return true;
      var value = specializationEl.value.trim();
      specializationValid = value.length <= 30;
      setHint(
        specializationHintEl,
        value.length + '/30 حرفاً',
        specializationValid ? '' : 'error'
      );
      refreshSave();
      return specializationValid;
    }

    function renderSocialLinks() {
      if (!socialLinksEl) return;
      socialLinksEl.innerHTML = socialLinks.length
        ? socialLinks.map(function (link, index) {
          var selectedByOtherRows = {};
          socialLinks.forEach(function (otherLink, otherIndex) {
            if (otherIndex !== index && otherLink.platform) {
              selectedByOtherRows[otherLink.platform] = true;
            }
          });
          var options = '<option value="">اختر المنصة</option>' +
            socialPlatforms.filter(function (platform) {
              return !selectedByOtherRows[platform.key] || platform.key === link.platform;
            }).map(function (platform) {
              return '<option value="' + e(platform.key) + '"' +
                (platform.key === link.platform ? ' selected' : '') + '>' +
                e(platform.label) + '</option>';
            }).join('');
          var platformOptions = socialPlatforms.filter(function (platform) {
            return !selectedByOtherRows[platform.key] || platform.key === link.platform;
          });
          var platformMenu = platformOptions.map(function (platform) {
            return '<button class="social-platform-picker-option" type="button" role="option" data-platform-option="' +
              e(platform.key) + '" aria-label="' + e(platform.label) + '" title="' + e(platform.label) +
              '" aria-selected="' + (platform.key === link.platform ? 'true' : 'false') + '">' +
              UI.socialPlatformLogo(platform.key) + '</button>';
          }).join('');
          var selectedPlatform = socialPlatforms.find(function (platform) {
            return platform.key === link.platform;
          });
          return '<div class="pe-social-row" data-social-index="' + index + '">' +
              '<div class="social-platform-picker" data-platform-picker>' +
              '<button class="social-platform-picker-trigger" type="button" data-platform-trigger aria-label="' +
              (selectedPlatform ? e('المنصة المختارة: ' + selectedPlatform.label) : 'اختر المنصة') +
              '" aria-haspopup="listbox" aria-expanded="false">' +
              (link.platform ? UI.socialPlatformLogo(link.platform) : UI.icon('globe', 18)) +
              UI.icon('chevron-down', 12) + '</button>' +
              '<div class="social-platform-picker-menu" role="listbox" aria-label="المنصات">' + platformMenu + '</div>' +
              '<select class="input select" data-social-platform aria-label="اسم المنصة">' + options + '</select>' +
              '</div>' +
              '<input class="input" type="url" inputmode="url" dir="ltr" data-social-url value="' + e(link.url) + '" placeholder="https://example.com">' +
              '<button class="btn-icon sm danger" type="button" data-social-delete aria-label="حذف الرابط">' + UI.icon('trash', 14) + '</button>' +
              '<p class="hint error" data-social-error style="display:none"></p>' +
              '</div>';
        }).join('')
        : '<p class="tiny muted">لم تتم إضافة روابط بعد.</p>';
      m.body.querySelector('#peAddSocialLink').disabled =
        socialLinks.length >= socialPlatforms.length;
      validateSocialLinks();
    }

    function syncSocialLinksFromDOM() {
      if (!socialLinksEl) return;
      socialLinks = Array.prototype.map.call(
        socialLinksEl.querySelectorAll('.pe-social-row'),
        function (row) {
          return {
            platform: row.querySelector('[data-social-platform]').value,
            url: row.querySelector('[data-social-url]').value
          };
        }
      );
    }

    function refreshSocialPlatformOptions() {
      if (!socialLinksEl) return;
      socialLinksEl.querySelectorAll('.pe-social-row').forEach(function (row, index, rows) {
        var select = row.querySelector('[data-social-platform]');
        var current = select.value;
        var selectedByOtherRows = {};
        Array.prototype.forEach.call(rows, function (otherRow, otherIndex) {
          var otherPlatform = otherRow.querySelector('[data-social-platform]').value;
          if (otherIndex !== index && otherPlatform) selectedByOtherRows[otherPlatform] = true;
        });
        var options = '<option value="">اختر المنصة</option>' +
          socialPlatforms.filter(function (platform) {
            return !selectedByOtherRows[platform.key] || platform.key === current;
          }).map(function (platform) {
            return '<option value="' + e(platform.key) + '">' + e(platform.label) + '</option>';
          }).join('');
        select.innerHTML = options;
        select.value = current;
          var picker = row.querySelector('[data-platform-picker]');
          var platforms = socialPlatforms.filter(function (platform) {
            return !selectedByOtherRows[platform.key] || platform.key === current;
          });
          picker.querySelector('.social-platform-picker-menu').innerHTML =
            platforms.map(function (platform) {
              return '<button class="social-platform-picker-option" type="button" role="option" data-platform-option="' +
                e(platform.key) + '" aria-label="' + e(platform.label) + '" title="' + e(platform.label) +
                '" aria-selected="' + (platform.key === current ? 'true' : 'false') + '">' +
                UI.socialPlatformLogo(platform.key) + '</button>';
            }).join('');
          var selectedPlatform = socialPlatforms.find(function (platform) {
            return platform.key === current;
          });
          var trigger = picker.querySelector('[data-platform-trigger]');
          trigger.setAttribute('aria-label', selectedPlatform
            ? 'المنصة المختارة: ' + selectedPlatform.label
            : 'اختر المنصة');
          trigger.innerHTML = (current ? UI.socialPlatformLogo(current) : UI.icon('globe', 18)) +
            UI.icon('chevron-down', 12);
      });
    }

    function validateSocialLinks() {
      if (!socialLinksEl) return true;
      var valid = true;
      var usedPlatforms = {};
      socialLinksEl.querySelectorAll('.pe-social-row').forEach(function (row) {
        var platform = row.querySelector('[data-social-platform]').value;
        var urlInput = row.querySelector('[data-social-url]');
        var url = urlInput.value.trim();
        var errorEl = row.querySelector('[data-social-error]');
        var message = '';
        if (url) {
          if (!platform) message = 'اختر المنصة.';
          else if (usedPlatforms[platform]) message = 'اختر منصة مختلفة لكل رابط.';
          else if (
            (url.slice(0, 7).toLowerCase() !== 'http://' &&
              url.slice(0, 8).toLowerCase() !== 'https://') ||
            !URL_RE.test(url)
          ) {
            message = 'أدخل رابطاً صحيحاً يبدأ بـ https:// أو http://.';
          }
          if (!message) usedPlatforms[platform] = true;
        }
        errorEl.textContent = message;
        errorEl.style.display = message ? 'block' : 'none';
        urlInput.setAttribute('aria-invalid', message ? 'true' : 'false');
        if (message) valid = false;
      });
      socialLinksValid = valid;
      if (socialLinksHintEl) socialLinksHintEl.style.display = 'none';
      refreshSave();
      return valid;
    }

    function collectSocialLinks() {
      if (!socialLinksEl) return [];
      return Array.prototype.map.call(
        socialLinksEl.querySelectorAll('.pe-social-row'),
        function (row) {
          return {
            platform: row.querySelector('[data-social-platform]').value,
            url: row.querySelector('[data-social-url]').value.trim()
          };
        }
      ).filter(function (link) {
        return link.platform && link.url;
      });
    }

    if (socialLinksEl) {
      renderSocialLinks();
      socialLinksEl.addEventListener('input', function () {
        syncSocialLinksFromDOM();
        validateSocialLinks();
      });
      socialLinksEl.addEventListener('change', function () {
        syncSocialLinksFromDOM();
        refreshSocialPlatformOptions();
        validateSocialLinks();
      });
      socialLinksEl.addEventListener('click', function (event) {
        var optionButton = event.target.closest('[data-platform-option]');
        if (optionButton) {
          var optionRow = optionButton.closest('.pe-social-row');
          var optionSelect = optionRow.querySelector('[data-social-platform]');
          optionSelect.value = optionButton.dataset.platformOption;
          var optionPicker = optionRow.querySelector('[data-platform-picker]');
          optionPicker.classList.remove('is-open');
          var optionTrigger = optionPicker.querySelector('[data-platform-trigger]');
          optionTrigger.setAttribute('aria-expanded', 'false');
          optionTrigger.focus();
          optionSelect.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        var trigger = event.target.closest('[data-platform-trigger]');
        if (trigger) {
          var picker = trigger.closest('[data-platform-picker]');
          var shouldOpen = !picker.classList.contains('is-open');
          socialLinksEl.querySelectorAll('[data-platform-picker].is-open').forEach(function (openPicker) {
            openPicker.classList.remove('is-open');
            openPicker.querySelector('[data-platform-trigger]').setAttribute('aria-expanded', 'false');
          });
          picker.classList.toggle('is-open', shouldOpen);
          trigger.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
          return;
        }
        var deleteButton = event.target.closest('[data-social-delete]');
        if (!deleteButton) return;
        syncSocialLinksFromDOM();
        socialLinks.splice(+deleteButton.closest('.pe-social-row').dataset.socialIndex, 1);
        renderSocialLinks();
      });
      m.body.addEventListener('click', function (event) {
        if (event.target.closest('[data-platform-picker]')) return;
        socialLinksEl.querySelectorAll('[data-platform-picker].is-open').forEach(function (picker) {
          picker.classList.remove('is-open');
          picker.querySelector('[data-platform-trigger]').setAttribute('aria-expanded', 'false');
        });
      });
      m.body.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        var picker = socialLinksEl.querySelector('[data-platform-picker].is-open');
        if (!picker) return;
        picker.classList.remove('is-open');
        var trigger = picker.querySelector('[data-platform-trigger]');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      });
      m.body.querySelector('#peAddSocialLink').addEventListener('click', function () {
        if (socialLinks.length >= socialPlatforms.length) return;
        syncSocialLinksFromDOM();
        socialLinks.push({ platform: '', url: '' });
        renderSocialLinks();
        var lastInput = socialLinksEl.querySelector('.pe-social-row:last-child [data-social-url]');
        if (lastInput) lastInput.focus();
      });
    }

    function checkWhatsappLive() {
      var value = whatsappEl.value.trim();
      var fullNumber = whatsappInternationalNumber();
      var isPalestinianNumber = /^\+97[02]5\d{8}$/.test(fullNumber);
      var isOtherInternationalNumber =
        /^\+[1-9]\d{6,14}$/.test(fullNumber) && !/^\+97[02]/.test(fullNumber);
      var isValidFormat = isPalestinianNumber || isOtherInternationalNumber;
      whatsappValid = isValidFormat && !whatsappTaken &&
        !whatsappCheckPending && !whatsappCheckFailed;
      whatsappBox.classList.toggle('bad', !whatsappValid);
      var hint = '';
      var hintClass = '';
      if (!isValidFormat) {
        hint = value ? t('whatsappInvalid') : t('whatsappRequired');
        hintClass = 'error';
      } else if (whatsappTaken) {
        hint = t('whatsappBelongsToAnotherUser');
        hintClass = 'error';
      } else if (whatsappCheckPending) {
        hint = t('whatsappChecking');
      } else if (whatsappCheckFailed) {
        hint = t('whatsappCheckFailed');
        hintClass = 'error';
      }
      setHint(
        whatsappHintEl,
        hint,
        hintClass
      );
      refreshSave();
      return whatsappValid;
    }

    function checkWhatsappOwnership() {
      if (whatsappCheckTimer) window.clearTimeout(whatsappCheckTimer);
      var requestId = ++whatsappCheckRequestId;
      whatsappTaken = false;
      whatsappCheckFailed = false;
      var fullNumber = whatsappInternationalNumber();
      var isPalestinianNumber = /^\+97[02]5\d{8}$/.test(fullNumber);
      var isOtherInternationalNumber =
        /^\+[1-9]\d{6,14}$/.test(fullNumber) && !/^\+97[02]/.test(fullNumber);
      if (!isPalestinianNumber && !isOtherInternationalNumber) {
        whatsappCheckPending = false;
        checkWhatsappLive();
        return;
      }

      whatsappCheckPending = true;
      checkWhatsappLive();
      whatsappCheckTimer = window.setTimeout(function () {
        var url = SITE.u('profileWhatsappCheck') +
          '?phone=' + encodeURIComponent(fullNumber);
        if (isAdminTarget) {
          url += '&target_user_id=' + encodeURIComponent(p.adminTargetUserId);
        }
        fetch(url, { credentials: 'same-origin' })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok || !data.ok) {
                throw new Error(data.error || 'whatsapp_check_failed');
              }
              return data;
            });
          })
          .then(function (data) {
            if (requestId !== whatsappCheckRequestId) return;
            whatsappCheckPending = false;
            whatsappTaken = data.belongsToAnotherUser === true;
            checkWhatsappLive();
          })
          .catch(function () {
            if (requestId !== whatsappCheckRequestId) return;
            whatsappCheckPending = false;
            whatsappCheckFailed = true;
            checkWhatsappLive();
          });
      }, 300);
    }

    function updateProfileSetupPreview() {
      var checks = [
        ['الصورة الشخصية', !!avatarDraft],
        ['العنوان المهني', !!titleInput.value.trim() && titleValid],
        ['النبذة', !!bioEl.value.trim()],
        ['المهارات', skills.some(function (skill) {
          return !!(skill.name && skill.name.trim());
        })],
        ['رقم واتساب', whatsappValid]
      ];
      var completed = checks.filter(function (check) { return check[1]; }).length;
      updateProfileSetupAlert({
        percent: Math.round(completed * 100 / checks.length),
        missing: checks.filter(function (check) { return !check[1]; })
          .map(function (check) { return check[0]; })
      }, false);
    }

    whatsappEl.addEventListener('input', function () {
      var digits = whatsappEl.value.replace(/\D/g, '').slice(0, 14);
      if (whatsappEl.value !== digits) whatsappEl.value = digits;
      syncWhatsappMaxLength();
      checkWhatsappOwnership();
    });
    whatsappCountryCodeEl.addEventListener('change', function () {
      syncWhatsappMaxLength();
      checkWhatsappOwnership();
    });
    nameEl.addEventListener('input', checkNameLive);
    if (specializationEl) specializationEl.addEventListener('input', checkSpecializationLive);
    checkNameLive();
    checkSpecializationLive();
    syncWhatsappMaxLength();
    checkWhatsappOwnership();

    m.body.querySelector('#peAvatarBtn').addEventListener('click', function () { m.body.querySelector('#peAvatarFile').click(); });
    m.body.querySelector('#peAvatarFile').addEventListener('change', function (ev) {
      var f = ev.target.files[0];
      if (!f) return;
      UI.compressImage(f, 480, 0.85).then(function (dataUrl) {
        avatarDraft = dataUrl;
        m.body.querySelector('#peAvatar').src = dataUrl;
        refreshSave();
      });
    });

    m.el.querySelector('#peCancel').addEventListener('click', function () {
      restoreProfileSetupPreview();
      m.close();
    });
    m.el.querySelector('#peSave').addEventListener('click', function () {
      var btn = m.el.querySelector('#peSave');
      if (btn.disabled) return;

      var name = nameEl.value.trim() || p.name;
      if (!checkNameLive()) { focusProfileEditField(nameEl); return; }
      var fullNameArabicValue = fullNameArabicEl ? fullNameArabicEl.value.trim() : '';
      var fullNameEnglishValue = fullNameEnglishEl ? fullNameEnglishEl.value.trim() : '';
      if (Boolean(fullNameArabicValue) !== Boolean(fullNameEnglishValue)) {
        focusProfileEditField(fullNameArabicValue ? fullNameEnglishEl : fullNameArabicEl);
        return;
      }
      if (!titleValid) { focusProfileEditField(titleInput); return; }
      if (!checkSpecializationLive()) { focusProfileEditField(specializationEl); return; }
      if (!checkWhatsappLive()) { focusProfileEditField(whatsappEl); return; }
      if (!validateSocialLinks()) {
        var invalidSocialUrl = socialLinksEl.querySelector('[aria-invalid="true"]');
        if (invalidSocialUrl) {
          var invalidSocialRow = invalidSocialUrl.closest('.pe-social-row');
          var socialSelect = invalidSocialRow.querySelector('[data-social-platform]');
          focusProfileEditField(!socialSelect.value
            ? invalidSocialRow.querySelector('[data-platform-trigger]')
            : invalidSocialUrl);
        }
        return;
      }
      var cleanSkills = skills.filter(function (s) { return s.name && s.name.trim(); }).map(function (s) {
        return { id: s.id || Store.uid('sk'), name: s.name.trim(), level: s.level || 50 };
      });
      var fullNameArabic = isTargetTrainer ? '' : m.body.querySelector('#peFullNameArabic').value.trim();
      var fullNameEnglish = isTargetTrainer ? '' : m.body.querySelector('#peFullNameEnglish').value.trim();
      var trainerNameEnglish = isTargetTrainer
        ? m.body.querySelector('#peTrainerNameEnglish').value.trim()
        : '';
      var payload = {
        name: name,
        fullNameArabic: fullNameArabic,
        fullNameEnglish: fullNameEnglish,
        trainerNameEnglish: trainerNameEnglish,
        title: m.body.querySelector('#peTitle').value.trim(),
        studentSpecialization: specializationEl ? specializationEl.value.trim() : undefined,
        bio: m.body.querySelector('#peBio').value.trim(),
        socialLinks: socialLinksEl ? collectSocialLinks() : undefined,
        whatsapp: whatsappInternationalNumber(),
        avatarData: avatarDraft,
        skills: cleanSkills,
        isTrainerTarget: isTargetTrainer,
        targetUserId: isAdminTarget ? p.adminTargetUserId : null
      };

      isSaving = true;
      refreshSave();
      submitProfileUpdate(payload, function (res) {
        if (isAdminTarget) {
          m.close();
          UI.toast(t('savedOk'), 'success');
          location.reload();
          return;
        }
        var prof = res.profile || {};
        Store.updateProfile({
          name: prof.name || name,
          fullNameArabic: prof.fullNameArabic || fullNameArabic,
          fullNameEnglish: prof.fullNameEnglish || fullNameEnglish,
          trainerNameEnglish: prof.trainerNameEnglish || trainerNameEnglish,
          handle: prof.handle || p.handle,
          title: prof.title || payload.title,
          headline: typeof prof.headline === 'string' ? prof.headline : payload.title,
          specialization: typeof prof.specialization === 'string'
            ? prof.specialization
            : payload.title,
          studentSpecialization: typeof prof.studentSpecialization === 'string'
            ? prof.studentSpecialization
            : (payload.studentSpecialization || ''),
          bio: typeof prof.bio === 'string' ? prof.bio : payload.bio,
          location: typeof prof.location === 'string' ? prof.location : (p.location || ''),
          website: typeof prof.website === 'string' ? prof.website : (p.website || ''),
          email: typeof prof.email === 'string' ? prof.email : (p.email || ''),
          whatsapp: typeof prof.whatsapp === 'string' ? prof.whatsapp : payload.whatsapp,
          verified: !!prof.verified,
          avatar: prof.avatar || avatarDraft,
          socials: prof.socials || (p.socials || {}),
          social_links: prof.social_links || payload.socialLinks || p.social_links || []
        });
        Store.state.skills = Array.isArray(res.skills) ? res.skills : cleanSkills;
        Store.commit();
        profileSetupSaved = true;
        updateProfileSetupAlert(res.profile_setup, true);
        m.close();
        renderHome();
        UI.toast(t('savedOk'), 'success');
      }, function (err) {
        isSaving = false;
        refreshSave();
        if (err === 'invalid_name') {
          focusProfileEditField(nameEl);
          UI.toast(t('nameInvalid'), 'error');
        } else if (err === 'required_whatsapp' || err === 'invalid_whatsapp') {
          focusProfileEditField(whatsappEl);
          UI.toast(err === 'required_whatsapp' ? t('whatsappRequired') : t('whatsappInvalid'), 'error');
        } else if (err === 'whatsapp_belongs_to_another_user') {
          whatsappTaken = true;
          checkWhatsappLive();
          focusProfileEditField(whatsappEl);
          UI.toast(t('whatsappBelongsToAnotherUser'), 'error');
        } else if (err === 'invalid_headline') {
          focusProfileEditField(titleInput);
          UI.toast('اختر المسمى المهني من فئات المستقلين النشطة.', 'error');
        } else if (err === 'invalid_specialization') {
          focusProfileEditField(specializationEl);
          UI.toast('يجب ألا يتجاوز التخصص 30 حرفاً.', 'error');
        } else if (err === 'invalid_social_links') {
          var invalidSocial = socialLinksEl.querySelector('[aria-invalid="true"]');
          if (invalidSocial) focusProfileEditField(invalidSocial);
          UI.toast('تحقق من روابط ومنصات التواصل الاجتماعي.', 'error');
        } else if (err === 'legal_name_pair_required' || err === 'invalid_legal_name') {
          var legalNameTarget = !fullNameArabicValue
            ? fullNameArabicEl
            : !fullNameEnglishValue
              ? fullNameEnglishEl
              : fullNameArabicEl;
          focusProfileEditField(legalNameTarget);
          UI.toast('أدخل الاسم بالعربية والإنجليزية، من ثلاث إلى ست كلمات لكل لغة.', 'error');
        } else if (err === 'legal_name_locked') {
          focusProfileEditField(fullNameArabicEl || fullNameEnglishEl);
          UI.toast('لا يمكن تعديل الاسم الثلاثي بعد حفظه.', 'error');
        } else if (err === 'login') UI.toast(t('loginRequiredSave'), 'error');
        else UI.toast(t('saveFailed'), 'error');
      });
    });
  }

  /* ---------- certificate modal ---------- */

  function openCertModal(id) {
    var c = id ? Store.find('certificates', id) : null;
    var draft = c ? Object.assign({}, c) : {
      id: Store.uid('c'), title: '', issuer: '', category: '', date: new Date().toISOString().slice(0, 10),
      image: '', credentialId: '', verifyUrl: '', description: '', skills: [], addedAt: new Date().toISOString()
    };
    var imgDraft = '';

    var body =
      '<div class="field"><label class="label">' + e(t('certTitleLabel')) + ' <span class="req">*</span></label><input class="input" id="cmTitle" value="' + e(draft.title) + '" placeholder="' + e(t('certTitleLabel')) + '"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="label">' + e(t('issuerLabel')) + ' <span class="req">*</span></label><input class="input" id="cmIssuer" value="' + e(draft.issuer) + '"></div>' +
      '<div class="field"><label class="label">' + e(t('certCategory')) + '</label><input class="input" id="cmCategory" value="' + e(draft.category || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="label">' + e(t('certDate')) + '</label><input type="date" class="input" id="cmDate" value="' + e((draft.date || '').slice(0, 10)) + '"></div>' +
      '<div class="field"><label class="label">' + e(t('descriptionLabel')) + '</label><textarea class="textarea" id="cmDesc" rows="4" minlength="150" maxlength="5000">' + e(draft.description || '') + '</textarea>' +
      '<small class="cert-description-count" id="cmDescCount"></small></div>' +
      '<div class="field"><label class="label">' + e(t('skillsUsed')) + '</label>' +
      '<div class="cert-skill-field" id="cmSkills"><div class="cert-skill-chips"></div>' +
      '<input class="input cert-skill-input" id="cmSkillInput" type="text" placeholder="' + e(t('certSkillsPlaceholder')) + '" autocomplete="off"></div></div>' +
      '<div class="field"><label class="label">' + e(t('imageLabel')) + '</label>' +
      '<div class="cover-preview hide" id="cmPreviewWrap" style="margin-bottom:8px"><img id="cmPreview" src="" alt=""></div>' +
      '<div class="dropzone compact" id="cmDrop"><input type="file" accept="image/*">' + UI.icon('upload', 17) + '<span>' + e(t('dropImages')) + '</span></div></div>';

    var m = UI.modal({
      title: c ? t('editCert') : t('addCert'),
      size: 'md',
      body: body + '<p class="hint">' + e(t('certPendingReviewNotice')) + '</p>',
      footer: '<button class="btn btn-ghost" id="cmCancel">' + e(t('cancel')) + '</button>' +
        '<button class="btn btn-primary" id="cmSave">' + UI.icon('check', 15) + e(t('publish')) + '</button>'
    });

    var skills = (draft.skills || []).slice(0, 20);
    var skillField = m.body.querySelector('#cmSkills');
    var skillInput = skillField.querySelector('#cmSkillInput');
    var descriptionInput = m.body.querySelector('#cmDesc');
    var descriptionCount = m.body.querySelector('#cmDescCount');

    function renderSkills() {
      skillField.querySelector('.cert-skill-chips').innerHTML = skills.map(function (skill, index) {
        return '<span class="chip cert-skill-chip">' + e(skill) +
          '<button class="chip-x" type="button" data-remove-skill="' + index + '" aria-label="' +
          e(t('certRemoveSkill')) + '">' + UI.icon('x', 11) + '</button></span>';
      }).join('');
    }

    function addSkills(value) {
      value.split(/[,\u060c]/).forEach(function (rawSkill) {
        var skill = rawSkill.trim().slice(0, 80);
        if (!skill || skills.some(function (existing) {
          return existing.toLocaleLowerCase() === skill.toLocaleLowerCase();
        })) return;
        if (skills.length >= 20) {
          UI.toast(t('certSkillsLimit'), 'error');
          return;
        }
        skills.push(skill);
      });
      renderSkills();
    }

    function updateDescriptionCount() {
      descriptionCount.textContent = t('certDescriptionCount', {
        count: descriptionInput.value.length,
        minimum: 150
      });
      descriptionCount.classList.toggle('is-valid', descriptionInput.value.trim().length >= 150);
    }

    renderSkills();
    updateDescriptionCount();
    descriptionInput.addEventListener('input', updateDescriptionCount);
    skillField.addEventListener('click', function (ev) {
      var removeButton = ev.target.closest('[data-remove-skill]');
      if (removeButton) {
        skills.splice(Number(removeButton.getAttribute('data-remove-skill')), 1);
        renderSkills();
        return;
      }
      if (ev.target === skillField || ev.target.classList.contains('cert-skill-chips')) {
        skillInput.focus();
      }
    });
    skillInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ',') {
        ev.preventDefault();
        addSkills(skillInput.value);
        skillInput.value = '';
      } else if (ev.key === 'Backspace' && !skillInput.value && skills.length) {
        skills.pop();
        renderSkills();
      }
    });

    m.body.querySelector('#cmDrop input').addEventListener('change', function (ev) {
      var f = ev.target.files[0];
      if (!f) return;
      UI.compressImage(f, 1200, 0.82).then(function (d) {
        imgDraft = d;
        m.body.querySelector('#cmPreview').src = d;
        m.body.querySelector('#cmPreviewWrap').classList.remove('hide');
      }).catch(function () {
        UI.toast(t('saveFailed'), 'error');
      });
    });
    m.el.querySelector('#cmCancel').addEventListener('click', m.close);
    m.el.querySelector('#cmSave').addEventListener('click', function () {
      var title = m.body.querySelector('#cmTitle').value.trim();
      var issuer = m.body.querySelector('#cmIssuer').value.trim();
      if (!title || !issuer) { UI.toast(t('required'), 'error'); return; }
      if (descriptionInput.value.trim().length < 150) {
        UI.toast(t('certDescriptionTooShort'), 'error');
        descriptionInput.focus();
        return;
      }
      if (!imgDraft) { UI.toast(t('certImageRequired'), 'error'); return; }
      draft.title = title;
      draft.issuer = issuer;
      draft.category = m.body.querySelector('#cmCategory').value.trim();
      draft.date = m.body.querySelector('#cmDate').value;
      draft.description = descriptionInput.value.trim();
      draft.skills = skills.slice();
      var saveButton = m.el.querySelector('#cmSave');
      saveButton.disabled = true;
      var formData = new FormData();
      formData.append('title', draft.title);
      formData.append('issuer', draft.issuer);
      formData.append('category', draft.category);
      formData.append('date', draft.date);
      formData.append('description', draft.description);
      formData.append('skills', JSON.stringify(draft.skills));
      var imageBlob = dataUrlToBlob(imgDraft);
      var extension = imageBlob.type.split('/')[1] || 'jpg';
      formData.append('image', imageBlob, 'certificate.' + extension);
      fetch(SITE.u('manualCertificateSubmit'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-CSRFToken': csrfToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
      }).then(function (response) {
        return response.text().then(function (body) {
          var data;
          try {
            data = JSON.parse(body);
          } catch (error) {
            var responseError = new Error('Certificate submission returned a non-JSON response');
            responseError.status = response.status;
            throw responseError;
          }
          if (!response.ok || !data.ok) {
            if (data.error === 'student_only') UI.toast(t('certStudentOnly'), 'error');
            else if (data.error === 'image_required' || data.error === 'invalid_image') UI.toast(t('certImageRequired'), 'error');
            else if (data.error === 'image_too_large') UI.toast(t('certImageTooLarge'), 'error');
            else if (data.error === 'invalid_date') UI.toast(t('certInvalidDate'), 'error');
            else if (data.error === 'invalid_url') UI.toast(t('certInvalidUrl'), 'error');
            else if (data.error === 'description_too_short') UI.toast(t('certDescriptionTooShort'), 'error');
            else if (data.error === 'required') UI.toast(t('required'), 'error');
            else UI.toast(t('saveFailed') + ' (' + (data.error || response.status) + ')', 'error');
            saveButton.disabled = false;
            return null;
          }
          return data;
        });
      }).then(function (data) {
        if (!data) return;
        var addedToCurrentPage = Store.addManualCertificate(data.certificate);
        m.close();
        if (page === 'home' && addedToCurrentPage) renderHome(); else location.reload();
        UI.toast(t('certPendingReview'), 'success');
      }).catch(function (error) {
        console.error('Manual certificate submission failed:', error);
        saveButton.disabled = false;
        var status = error.status ? 'HTTP ' + error.status : t('networkError');
        UI.toast(t('saveFailed') + ' (' + status + ')', 'error');
      });
    });
  }

  /* ---------- detail: not found ---------- */

  function renderNotFound(host) {
    host.innerHTML = '<div class="notfound">' +
      '<div class="empty-ic">' + UI.icon('inbox', 30) + '</div>' +
      '<h2 style="margin:10px 0 6px">' + e(t('notFound')) + '</h2>' +
      '<p class="muted" style="margin-bottom:18px">' + e(t('notFoundSub')) + '</p>' +
      '<a class="btn btn-primary" href="' + SITE.u('users') + '">' + UI.icon('arrow-left', 15) + e(t('back')) + '</a></div>';
  }

  function backLink(label, smart, returnToPreviousPage) {
    var from = '';
    try { from = new URLSearchParams(location.search).get('from') || ''; } catch (err) { }
    var dest = from === 'landing' || from === 'platform' ? SITE.u('landing')
      : from === 'all-courses' ? SITE.u('courses')
      : smart ? SITE.u('projects')
      : SITE.u('portfolio');
    try {
      var returnPath = new URLSearchParams(location.search).get('return');
      if (returnPath) {
        var returnUrl = new URL(returnPath, location.origin);
        if (returnUrl.origin === location.origin && returnUrl.pathname !== location.pathname) {
          dest = returnUrl.pathname + returnUrl.search + returnUrl.hash;
        }
      }
    } catch (err) { }
    return '<a class="detail-back" href="' + dest + '"' +
      (smart ? ' data-smart-back' : '') +
      (returnToPreviousPage ? ' data-workshop-back' : '') +
      '>' + UI.icon(document.documentElement.dir === 'rtl' ? 'arrow-right' : 'arrow-left', 16) + e(label || t('back')) + '</a>';
  }

  function safeExternalUrl(value) {
    if (!value) return '';
    try {
      var url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  /* ---------- detail: certificate ---------- */

  function renderEarnedCertificate(host, c) {
    if (c.manual) {
      renderManualCertificate(host, c);
      return;
    }
    var from = '';
    try { from = new URLSearchParams(location.search).get('from') || ''; } catch (err) { }
    var isEnglish = certificateLanguage === 'en';
    var instName = isEnglish
      ? (c.instructorEnglish || 'English instructor name not provided')
      : (c.instructor || c.issuer || '');
    var certificateTitle = isEnglish
      ? (c.titleEnglish || c.title_en || 'English title not provided')
      : (c.title || '');
    var certificateDuration = isEnglish
      ? (c.durationEnglish || '')
      : (c.duration || '');
    var courseSummary = String(c.summary || c.description || '').trim();
    var verificationUrl = c.workshop ? '' : safeExternalUrl(c.verifyUrl);
    var skills = c.skills || [];
    var heroImg = c.courseImage || c.image || '';
    var issued = certificateDate(c.date, certificateLanguage);
    var studentName = certificateLanguage === 'en'
      ? (c.studentNameEnglish || (SERVER_PROFILE && SERVER_PROFILE.fullNameEnglish) || 'English full name not provided')
      : (c.studentNameArabic || (SERVER_PROFILE && SERVER_PROFILE.fullNameArabic) || c.studentName || '');
    var shareUrl = location.origin + SITE.u('certificate', e(c.certificateId || c.id));
    var backDest = c.workshop
      ? SITE.u('portfolio')
      : SITE.u('course', e(c.courseId || c.id));
    var workshopDetails = c.workshopDetails || {};
    var trainerAvatar = (c.owner && c.owner.avatar) || c.trainerAvatar || '';
    var trainerLabel = isEnglish ? 'Trainer:' : (c.workshop ? 'مدرب الورشة:' : 'المدرب:');
    var languageTabs =
      '<div class="cert-language-tabs" role="group" aria-label="Certificate language">' +
      '<button type="button" class="btn btn-sm ' + (certificateLanguage === 'ar' ? 'btn-primary' : 'btn-ghost') + '" data-act="certificate-language" data-language="ar" aria-pressed="' + (certificateLanguage === 'ar') + '">العربية</button>' +
      '<button type="button" class="btn btn-sm ' + (certificateLanguage === 'en' ? 'btn-primary' : 'btn-ghost') + '" data-act="certificate-language" data-language="en" aria-pressed="' + (certificateLanguage === 'en') + '">English</button>' +
      '</div>';

    host.innerHTML =
      backLink(c.workshop ? t('back') : t('certPageBack'), false, !!c.workshop) +
      '<section class="cd-hero cert-hero' + (heroImg ? '' : '') + '"' + (heroImg ? ' style="background-image:url(\'' + e(heroImg) + '\'),linear-gradient(135deg,#2563eb,#7c3aed)"' : '') + '>' +
      '<div class="cd-hero-overlay"><div class="cd-hero-inner">' +
      '<span class="cert-hero-seal">' + UI.verifiedBadge(15) + e(t('certPageStatusValid')) + '</span>' +
      '<h1 class="cd-title">' + e(certificateTitle) + '</h1>' +
      '<div class="cd-author">' +
      '<img class="cd-author-av" src="' + e(trainerAvatar || UI.userLetterAvatar(instName, 64)) + '" alt="">' +
      '<span>' + e(trainerLabel) + ' <b>' + e(instName) + '</b></span>' +
      '</div>' +
      '<div class="cd-pills">' +
      '<span class="cd-pill">' + UI.icon('calendar', 14) + e(issued) + '</span>' +
      (certificateDuration ? '<span class="cd-pill">' + UI.icon('clock', 14) + e(certificateDuration) + '</span>' : '') +
      '<span class="cd-pill">' + UI.icon('award', 14) + e(t('ucCert')) + '</span>' +
      '</div>' +
      '</div></div>' +
      '</section>' +

      '<div class="cd-grid">' +
      '<div class="cd-main">' +
      '<section class="cd-card">' +
      languageTabs +
      earnedCertificateSheet(c, studentName, false, certificateLanguage, true) +
      (verificationUrl
        ? '<a class="btn btn-ghost" style="margin-top:12px" href="' + e(verificationUrl) +
          '" target="_blank" rel="noopener">' + UI.icon('external-link', 15) +
          e(t('certVerify')) + '</a>'
        : '') +
      '</section>' +

      (c.workshop ? '<section class="cd-card"><h2 class="cd-h2">' + UI.icon('calendar', 18) +
        e(certificateLanguage === 'en' ? 'Workshop details' : 'معلومات الورشة') + '</h2>' +
        '<div class="prose"><p><b>' + e(certificateLanguage === 'en' ? 'Workshop:' : 'الورشة:') + '</b> ' + e(certificateLanguage === 'en' ? (workshopDetails.titleEnglish || c.titleEnglish || 'English title not provided') : (workshopDetails.title || c.title)) + '</p>' +
        '<p><b>' + e(certificateLanguage === 'en' ? 'Trainer:' : 'المدرب:') + '</b> ' + e(certificateLanguage === 'en' ? (workshopDetails.trainerEnglish || c.trainerNameEnglish || 'English trainer name not provided') : (workshopDetails.trainer || c.trainerName || '—')) + '</p>' +
        '<p><b>' + e(certificateLanguage === 'en' ? 'Date:' : 'التاريخ:') + '</b> ' + e(certificateDate(workshopDetails.date || c.date, certificateLanguage)) + '</p>' +
        '<p><b>' + e(certificateLanguage === 'en' ? 'Duration:' : 'المدة:') + '</b> ' + e(workshopDetails.duration || c.duration || '—') + ' ' + e(certificateLanguage === 'en' ? 'minutes' : 'دقيقة') + '</p>' +
        ((certificateLanguage === 'en' ? workshopDetails.locationEnglish : workshopDetails.location)
          ? '<p><b>' + e(certificateLanguage === 'en' ? 'Location:' : 'الموقع:') + '</b> ' + e(certificateLanguage === 'en' ? workshopDetails.locationEnglish : workshopDetails.location) + '</p>'
          : '') +
        ((certificateLanguage === 'en' ? workshopDetails.descriptionEnglish : workshopDetails.description)
          ? '<p>' + e(certificateLanguage === 'en' ? workshopDetails.descriptionEnglish : workshopDetails.description) + '</p>'
          : '') +
        '</div></section>' : '') +

      (skills.length ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('check-circle', 18) + e(t('certPageLearn')) + '</h2>' +
      '<div class="cd-learn">' + skills.map(function (s) {
        return '<div class="cd-learn-item">' + UI.icon('check', 16) + '<span>' + e(s) + '</span></div>';
      }).join('') + '</div>' +
      '</section>' : '') +

      (courseSummary ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('file-text', 18) + e(t('certPageAbout')) + '</h2>' +
      '<div class="prose"><p>' + e(courseSummary) + '</p></div>' +
      '</section>' : '') +
      '</div>' +

      '<aside class="cd-side">' +
      '<div class="cd-buy">' +
      '<div class="cd-buy-body">' +
      '<div class="cd-price"><b>' + e(t('certPageStatusValid')) + '</b><span>' + e(t('certPageKicker')) + '</span></div>' +
      '<button class="cd-btn cd-btn-buy" type="button" data-act="print-cert">' + UI.icon('download', 16) + e(t('certPagePrint')) + '</button>' +
      '<button class="cd-btn cd-btn-share" type="button" data-act="share" data-url="' + e(shareUrl) + '">' + UI.icon('share-2', 16) + e(t('shareCta')) + '</button>' +
      (!c.workshop
        ? '<a class="cd-btn cd-btn-edit" href="' + backDest + '">' + UI.icon('arrow-right', 15) + e(t('certPageBack')) + '</a>'
        : '') +
      '<ul class="cd-includes">' +
      '<li>' + UI.icon('award', 15) + '<span>' + e(t('ucCert')) + '</span></li>' +
      '<li>' + UI.icon('calendar', 15) + '<span>' + e(t('certPageIssued')) + ': <b>' + e(issued) + '</b></span></li>' +
      '</ul>' +
      '</div></div>' +
      '</aside>' +
      '</div>';
  }

  function renderManualCertificate(host, c) {
    var issued = c.date ? UI.formatDate(c.date) : '—';
    var returnPath = '';
    try { returnPath = new URLSearchParams(location.search).get('return') || ''; } catch (err) { }

    host.innerHTML =
      backLink(t('back')) +
      '<section class="cd-hero cert-hero"' +
      (c.image ? ' style="background-image:url(\'' + e(c.image) + '\'),linear-gradient(135deg,#2563eb,#7c3aed)"' : '') +
      '><div class="cd-hero-overlay"><div class="cd-hero-inner">' +
      '<span class="cert-hero-seal">' + UI.verifiedBadge(15) + e(t('certPageStatusValid')) + '</span>' +
      '<h1 class="cd-title">' + e(c.title) + '</h1>' +
      '<div class="cd-author"><img class="cd-author-av" src="' + UI.userLetterAvatar(c.issuer, 64) + '" alt="">' +
      '<span>' + e(t('ucBy')) + ' <b>' + e(c.issuer || '—') + '</b></span></div>' +
      '<div class="cd-pills"><span class="cd-pill">' + UI.icon('calendar', 14) + e(issued) + '</span>' +
      '<span class="cd-pill">' + UI.icon('user', 14) + e(c.studentName || '—') + '</span>' +
      '<span class="cd-pill">' + UI.icon('award', 14) + e(c.statusLabel || t('certApproved')) + '</span></div>' +
      '</div></div></section>' +
      '<div class="cd-grid"><div class="cd-main">' +
      '<section class="cd-card manual-certificate-image-card">' +
      '<h2 class="cd-h2">' + UI.icon('image', 18) + e(t('imageLabel')) + '</h2>' +
      (c.image ? '<img class="manual-certificate-detail-image" src="' + e(c.image) + '" alt="' + e(c.title) + '" fetchpriority="high">' : '') +
      '</section>' +
      (c.skills && c.skills.length ? '<section class="cd-card"><h2 class="cd-h2">' +
        UI.icon('check-circle', 18) + e(t('certPageLearn')) + '</h2><div class="cd-learn">' +
        c.skills.map(function (skill) {
          return '<div class="cd-learn-item">' + UI.icon('check', 16) + '<span>' + e(skill) + '</span></div>';
        }).join('') + '</div></section>' : '') +
      (c.description ? '<section class="cd-card"><h2 class="cd-h2">' +
        UI.icon('file-text', 18) + e(t('certPageAbout')) + '</h2><div class="prose"><p>' +
        e(c.description) + '</p></div></section>' : '') +
      '</div><aside class="cd-side"><div class="cd-buy"><div class="cd-buy-body">' +
      '<div class="cd-price"><b>' + e(c.title) + '</b><span>' + e(c.issuer || '—') + '</span></div>' +
      (c.credentialId ? '<ul class="cd-includes"><li>' + UI.icon('hash', 15) +
        '<span class="cd-cred" dir="ltr">' + e(c.credentialId) + '</span></li></ul>' : '') +
      '<button class="cd-btn cd-btn-buy" type="button" data-act="print-cert">' +
        UI.icon('download', 16) + e(t('certPagePrint')) + '</button>' +
      '<button class="cd-btn cd-btn-share" type="button" data-act="share" data-url="' +
        e(SITE.u('certificate', c.id) + (returnPath ? '?return=' + encodeURIComponent(returnPath) : '')) +
        '">' + UI.icon('share-2', 16) + e(t('shareCta')) + '</button>' +
      '</div></div></aside></div>';
  }

  function courseProjectCard(pj, hidden) {
    if (!pj) return '';
    var links = pj.links || {};
    var projectRole = String(pj.role || '').trim();
    var tags = (pj.tags || []).slice(0, 4).map(function (tg) {
      return '<span class="chip">' + e(tg) + '</span>';
    }).join('');
    var actions = '';
    if (links.github) actions += '<a class="btn btn-ghost btn-sm" href="' + e(links.github) + '" target="_blank" rel="noopener">' + UI.icon('github', 14) + ' ' + e(t('source')) + '</a>';
    if (links.demo) actions += '<a class="btn btn-soft btn-sm" href="' + e(links.demo) + '" target="_blank" rel="noopener">' + UI.icon('external-link', 14) + ' ' + e(t('demo')) + '</a>';
    actions += '<a class="btn btn-primary btn-sm" href="' + projectDetailUrl(pj.id) + '">' + UI.icon('eye', 14) + ' ' + e(t('plProjectOpen')) + '</a>';

    return '<article class="cd-project-card"' + (hidden ? ' hidden' : '') + '>' +
      (pj.cover ? '<div class="cd-project-cover"><img src="' + e(pj.cover) + '" alt="' + e(pj.title) + '" loading="lazy" decoding="async"></div>' : '') +
      '<div class="cd-project-body">' +
      '<div class="cd-project-head">' +
      '<span class="cd-project-badge">' + UI.icon('briefcase', 13) + ' ' + e(t('plProjectType')) + '</span>' +
      (projectRole && projectRole !== 'مشروع تدريبي' ? '<span class="cd-project-role">' + UI.icon('user', 13) + ' ' + e(projectRole) + '</span>' : '') +
      '</div>' +
      '<h3 class="cd-project-title">' + e(pj.title) + '</h3>' +
      (pj.summary ? '<p class="cd-project-summary">' + e(pj.summary) + '</p>' : '') +
      (tags ? '<div class="cd-project-tags">' + tags + '</div>' : '') +
      '<div class="cd-project-actions">' + actions + '</div>' +
      '</div>' +
      '</article>';
  }

  function confirmCourseRegistration(courseTitle) {
    var registrationUrl = 'https://wa.me/972594810786?text=' +
      encodeURIComponent('مرحبا شركة داتا، ارغب في التسجيل أونلاين في دورة ' + courseTitle);

    var enrollModal = UI.modal({
      title: t('ucEnroll'),
      size: 'sm',
      body: '<p class="modal-text">هل تريد تأكيد التسجيل في دورة <b>' + e(courseTitle) + '</b>؟</p>',
      footer: '<button class="btn btn-ghost" type="button" data-enroll-cancel>إلغاء</button>' +
        '<a class="btn btn-primary" href="' + e(registrationUrl) + '" target="_blank" rel="noopener" data-enroll-confirm>' +
        'تأكيد التسجيل ' + UI.icon('whatsapp', 16) + '</a>'
    });
    enrollModal.el.querySelector('.modal-foot').classList.add('course-enroll-modal-foot');
    enrollModal.el.querySelector('[data-enroll-cancel]').addEventListener('click', enrollModal.close);
    enrollModal.el.querySelector('[data-enroll-confirm]').addEventListener('click', enrollModal.close);
  }

  function renderCourseDetail() {
    var host = document.getElementById('detailHost');
    var id = SITE.param('id');
    var enrolled = false;
    var enrollmentData = document.getElementById('course-enrollment-data');
    if (enrollmentData) {
      try { enrolled = JSON.parse(enrollmentData.textContent) === true; } catch (err) { enrolled = false; }
    }
    var studentEnrolled = false;
    var studentEnrollmentData = document.getElementById('course-student-enrollment-data');
    if (studentEnrollmentData) {
      try { studentEnrolled = JSON.parse(studentEnrollmentData.textContent) === true; } catch (err) { studentEnrolled = false; }
    }
    var trainerOwner = false;
    var trainerOwnerData = document.getElementById('course-trainer-owner-data');
    if (trainerOwnerData) {
      try { trainerOwner = JSON.parse(trainerOwnerData.textContent) === true; } catch (err) { trainerOwner = false; }
    }
    var adminCourseManager = false;
    var adminCourseData = document.getElementById('course-admin-data');
    if (adminCourseData) {
      try { adminCourseManager = JSON.parse(adminCourseData.textContent) === true; } catch (err) { adminCourseManager = false; }
    }
    var rewardsData = {};
    var rewardsEl = document.getElementById('course-rewards-data');
    if (rewardsEl) {
      try { rewardsData = JSON.parse(rewardsEl.textContent) || {}; } catch (err) { rewardsData = {}; }
    }
    var from = '';
    try { from = new URLSearchParams(location.search).get('from') || ''; } catch (err) { }
    var c = null;
    var courseDetailDataEl = document.getElementById('course-detail-data');
    if (courseDetailDataEl) {
      try {
        c = JSON.parse(courseDetailDataEl.textContent);
      } catch (error) {
        console.error('Could not read the course detail data.', error);
      }
    }
    var coursesDataEl = document.getElementById('courses-data');
    if (!c && coursesDataEl) {
      try {
        var pageCourses = JSON.parse(coursesDataEl.textContent);
        if (Array.isArray(pageCourses)) {
          c = pageCourses.filter(function (item) {
            return item.id === id || item.slug === id || String(item.pk) === String(id);
          })[0] || null;
          if (!c && page === 'course') c = pageCourses[0] || null;
        }
      } catch (error) {
        console.error('Could not read the course list data.', error);
      }
    }
    if (!c) c = Store.find('certificates', id);
    if (!c) { renderNotFound(host); return; }
    if (adminCourseManager) c.adminCanManageCourse = true;
    var isComingSoon = !!c.comingSoon;
    if (c.earned) { renderEarnedCertificate(host, c); return; }
    var related = Store.collection('certificates').filter(function (x) { return x.id !== c.id; }).slice(0, 3);
    var backDest = from === 'landing' || from === 'platform' ? SITE.u('landing') : from === 'all-courses' ? SITE.u('courses') : SITE.u('portfolio');
    var registrationRequired = false;
    try {
      registrationRequired = new URLSearchParams(location.search).get('registration') === 'required';
    } catch (err) { }
    if (registrationRequired) {
      try {
        var cleanUrl = new URL(location.href);
        cleanUrl.searchParams.delete('registration');
        history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      } catch (err) { }
    }
    var courseSummary = String(c.summary || c.description || '').replace(/\s+/g, ' ').trim();
    var courseContent = UI.sanitize(c.content || '');
    var verificationUrl = safeExternalUrl(c.verifyUrl);
    var hasCourseDescription = c.courseType !== 'in_person' && !!(courseSummary || courseContent);
    var courseDescriptionHTML = hasCourseDescription
      ? '<section class="cd-card">' +
        '<h2 class="cd-h2">' + UI.icon('file-text', 18) + e(t('ucDesc')) + '</h2>' +
        (courseContent
          ? '<div class="prose cd-course-description">' + courseContent + '</div>'
          : '<p class="cd-course-summary">' + e(courseSummary) + '</p>') +
        (verificationUrl ? '<a class="btn btn-ghost" style="margin-top:12px" href="' + e(verificationUrl) + '" target="_blank" rel="noopener">' + UI.icon('external-link', 15) + e(t('certVerify')) + '</a>' : '') +
        '</section>'
      : '';
    var sub = courseSummary;
    if (sub.length > 130) sub = sub.slice(0, 127).trim() + '…';
    var skills = c.skills || [];
    var instName = c.instructor || c.issuer;
    var courseAuthorLabel = c.courseType === 'in_person'
      ? t('ucCourseTrainer')
      : t('ucBy');
    var instructor = c.owner || {};
    var instructorProfileUrl = instructor.handle || c.handle
      ? SITE.u('profile', instructor.handle || c.handle)
      : '';
    if (instructorProfileUrl) {
      instructorProfileUrl += '?return=' + encodeURIComponent(
        location.pathname + location.search + location.hash
      );
    }
    var instructorAvatar = instructor.avatar || UI.userLetterAvatar(instName, 112);
    var heroImg = c.courseImage || c.image;

   /* أول درس في الدورة (وفيديوه) لعرضه في صفحة التفاصيل بنفس آلية مشغّل الدروس */
   /* كل هذا داخل try/catch: أي خلل هنا لا يجوز أن يُفرغ الصفحة */
   var previewLesson = null;
   var previewUrl = '';
   try {
     var lessons = [];
     (c.syllabus || []).forEach(function (sec) {
       (sec.lessons || []).forEach(function (ls) { if (ls) lessons.push(ls); });
     });
     /* فيديو أول درس، وإن لم يكن قابلاً للتشغيل فأول درس فيه فيديو قابل */
     for (var i = 0; i < lessons.length; i++) {
       var playable = UI.playableUrl(UI.videoUrl(lessons[i]));
       if (playable) { previewLesson = lessons[i]; previewUrl = playable; break; }
     }
   } catch (err) { previewLesson = null; previewUrl = ''; }

   var heroPlayerHTML = '';
   if (previewUrl) {
     try { heroPlayerHTML = UI.playerHTML(previewUrl, { id: 'cdHeroPlayer' }); } catch (err) { heroPlayerHTML = ''; }
   }
   if (!heroPlayerHTML) {
     heroPlayerHTML = '<img src="' + e(heroImg) + '" alt="' + e(c.title) + '" fetchpriority="high"><span class="cd-play" aria-hidden="true">' + UI.icon('play', 24) + '</span>';
   }
   var previewLabel = '';
   if (previewLesson) {
     previewLabel = '<span class="cd-preview">' +
       UI.icon('play', 14) +
       '<span class="cd-preview-t">' + e(previewLesson.title || '') + '</span>' +
       (previewLesson.duration ? '<span class="cd-preview-d">' + e(previewLesson.duration) + '</span>' : '') +
       '</span>';
   }
    var linkedProjects = [];
    var seenProj = {};
     (c.syllabus || []).forEach(function (sec) {
      (sec.lessons || []).forEach(function (ls) {
        if (ls.type === 'project' && ls.project && ls.project.id && !seenProj[ls.project.id]) {
          seenProj[ls.project.id] = true;
          linkedProjects.push(ls.project);
        }
      });
    });
    var shareButtonHTML = '';
    if (c.courseType !== 'in_person' || rewardsData.shareUrl) {
      shareButtonHTML = '<button class="cd-btn cd-btn-share" type="button" data-act="share" data-url="' +
        e(rewardsData.shareUrl || SITE.u('course', e(c.id))) + '">' +
        UI.icon('share-2', 16) + e(t('shareCta')) + '</button>';
    }
    var courseEditButtonHTML = canManageCourse(c)
      ? '<button class="cd-btn cd-btn-edit" type="button" data-act="goto" data-url="' +
        SITE.u(adminCourseManager ? 'adminCourseEditorEdit' : 'courseEdit', e(c.id)) +
        '">' + UI.icon('pencil', 15) + e(t('edit')) + '</button>'
      : '';
    var registrationCounts = { new: 0, accepted: 0 };
    var registrationCountsElement = document.getElementById('course-registration-status-counts');
    if (registrationCountsElement) {
      try {
        registrationCounts = JSON.parse(registrationCountsElement.textContent) || registrationCounts;
      } catch (error) {
        console.error('Could not read course registration status counts.', error);
      }
    }
     var learnSection = skills.length
       ? '<section class="cd-card">' +
         '<h2 class="cd-h2">' + UI.icon('check-circle', 18) + e(t('ucLearn')) + '</h2>' +
         '<div class="cd-learn">' + skills.map(function (s) {
           return '<div class="cd-learn-item">' + UI.icon('check', 16) + '<span>' + e(s) + '</span></div>';
         }).join('') + '</div>' +
         '</section>'
       : '';
     var adminRegistrationRequestsLink = adminCourseManager
       ? '<a class="cd-btn cd-btn-edit" href="' + e(
         SITE.u('panel') + '?course=' + encodeURIComponent(c.id) + '#/course-registration-requests'
       ) + '">' + UI.icon('clipboard', 15) +
         'طلبات التسجيل — جديد: ' + e(registrationCounts.new || 0) +
         '، مقبول: ' + e(registrationCounts.accepted || 0) + '</a>'
       : '';
     var inPersonRegistrationForm = '<section class="cd-card cd-registration-card">' +
       '<h2 class="cd-h2">' + UI.icon('user', 18) + 'طلب التسجيل في الدورة</h2>' +
       adminRegistrationRequestsLink +
       '<p class="cd-registration-intro">عبّئ البيانات التالية لإرسال طلب تسجيلك.</p>' +
       '<form class="cd-registration-form" id="inPersonRegistrationForm">' +
       '<div class="cd-registration-fields">' +
       '<label>الاسم الكامل<input class="input" name="fullName" type="text" autocomplete="name" aria-describedby="registrationFullNameError" required><span class="cd-registration-field-error" id="registrationFullNameError" aria-live="polite"></span></label>' +
       '<label>رقم الهاتف / واتساب<span class="phone-box cd-registration-phone-box" id="registrationPhoneBox"><span class="country-code-picker" id="registrationCountryCodePicker">' +
       '<select class="input select" id="registrationCountryCode" aria-label="مقدمة الدولة">' +
       getCountryCallingCodeChoices().filter(function (choice) {
         return choice[0] === '+970' || choice[0] === '+972';
       }).map(function (choice) {
         return '<option value="' + e(choice[0]) + '"' + (choice[0] === '+970' ? ' selected' : '') + '>' +
           e(choice[1]) + '</option>';
       }).join('') +
       '</select><button class="country-code-trigger" type="button" aria-label="اختيار مقدمة الدولة" aria-haspopup="listbox" aria-expanded="false">' +
       '<span class="country-code-current-flag" aria-hidden="true"></span><span class="country-code-current-prefix"></span>' +
       '<span class="country-code-chevron" aria-hidden="true"></span></button><div class="country-code-menu" hidden>' +
       '<div class="country-code-options" role="listbox" aria-label="مقدمات الدول"></div><p class="country-code-empty" aria-live="polite" hidden>لا توجد مقدمة مطابقة</p></div></span>' +
       '<input class="input" id="registrationPhone" name="phone" type="tel" dir="ltr" inputmode="numeric" autocomplete="tel-national" autocapitalize="off" spellcheck="false" maxlength="10" placeholder="رقمك المحلي" aria-describedby="registrationPhoneHint registrationPhoneError" required></span>' +
       '<span class="cd-registration-phone-hint" id="registrationPhoneHint">اختر مقدمة الدولة، ثم أدخل رقمك المحلي بدون المقدمة.</span>' +
       '<span class="cd-registration-field-error" id="registrationPhoneError" aria-live="polite"></span></label>' +
       '<label>التخصص<input class="input" name="specialty" type="text" aria-describedby="registrationSpecialtyError" required><span class="cd-registration-field-error" id="registrationSpecialtyError" aria-live="polite"></span></label>' +
       '<label class="cd-registration-study-year-label">السنة الدراسية<span class="cd-registration-study-year-wrap">' +
       '<span class="cd-registration-study-year-icon" aria-hidden="true">' + UI.icon('graduation-cap', 19) + '</span>' +
       '<select class="input cd-registration-study-year" name="studyYear" aria-describedby="registrationStudyYearHint registrationStudyYearError" required>' +
       '<option value="" selected disabled>اختر السنة الدراسية</option>' +
       '<optgroup label="طالب"><option value="1">سنة أولى</option><option value="2">سنة ثانية</option><option value="3">سنة ثالثة</option><option value="4">سنة رابعة</option><option value="5">سنة خامسة</option></optgroup>' +
       '<optgroup label="الحالة الدراسية"><option value="graduate">خريج</option></optgroup></select>' +
       '<span class="cd-registration-study-year-chevron" aria-hidden="true"></span></span>' +
       '<span class="cd-registration-study-year-hint" id="registrationStudyYearHint">اختر السنة التي تدرس فيها، أو «خريج» إذا أنهيت دراستك.</span>' +
       '<span class="cd-registration-field-error" id="registrationStudyYearError" aria-live="polite"></span></label>' +
       '<fieldset class="cd-registration-governorate" aria-describedby="registrationGovernorateError"><legend>المحافظة</legend><div class="cd-registration-governorate-options">' +
       '<label class="cd-registration-governorate-option"><input class="cd-registration-governorate-input" type="radio" name="governorate" value="gaza" required><span class="cd-registration-governorate-button">غزة</span></label>' +
       '<label class="cd-registration-governorate-option"><input class="cd-registration-governorate-input" type="radio" name="governorate" value="central" required><span class="cd-registration-governorate-button">الوسطى</span></label>' +
       '</div><span class="cd-registration-field-error" id="registrationGovernorateError" aria-live="polite"></span></fieldset>' +
       '</div>' +
       '<p class="cd-registration-error" id="inPersonRegistrationError" role="alert" hidden></p>' +
       '<button class="cd-btn cd-btn-buy cd-registration-submit" type="submit" disabled>حفظ طلب التسجيل</button>' +
       '</form></section>';

     host.innerHTML =
       backLink(null, true) +
      '<section class="cd-hero" style="background-image:url(\'' + heroImg + '\')">' +
      '<div class="cd-hero-overlay"><div class="cd-hero-inner">' +
      '<nav class="cd-crumb"><a href="' + backDest + '">' + e(t('ucCourses')) + '</a><span class="cd-crumb-sep">›</span><span>' + e(c.category || '') + '</span></nav>' +
      '<h1 class="cd-title">' + e(c.title) + '</h1>' +
      (sub ? '<p class="cd-sub">' + e(sub) + '</p>' : '') +
      '<div class="cd-author">' +
      (instructorProfileUrl
        ? '<a class="cd-author-profile" href="' + e(instructorProfileUrl) + '">' +
          '<img class="cd-author-av" src="' + e(instructor.avatar || UI.userLetterAvatar(instName, 64)) + '" alt="">' +
          '<span>' + e(courseAuthorLabel) + ' <b>' + e(instName) + '</b> ' + UI.verifiedBadge(16) + '</span></a>'
        : '<img class="cd-author-av" src="' + e(UI.userLetterAvatar(instName, 64)) + '" alt="">' +
          '<span>' + e(courseAuthorLabel) + ' <b>' + e(instName) + '</b> ' + UI.verifiedBadge(16) + '</span>') +
      '</div>' +
      '<div class="cd-pills">' +
      '<span class="cd-pill">' + UI.icon('clock', 14) + e(c.duration || '—') + '</span>' +
      '<span class="cd-pill">' + UI.icon('calendar', 14) + e(courseLessonCount(c.period)) + '</span>' +
      '<span class="cd-pill">' + UI.icon('award', 14) + e(t('ucCert')) + '</span>' +
      '</div>' +
      '</div></div>' +
      '</section>' +

      (isComingSoon
        ? '<div class="cd-coming-soon-alert" role="status">' +
          UI.icon('clock', 18) + '<span>' + e(t('courseComingSoonNotice')) + '</span></div>'
        : '') +

      (c.courseType === 'in_person'
        ? '<div class="cd-inperson-learn">' + courseDescriptionHTML +
          learnSection +
          (shareButtonHTML || courseEditButtonHTML
            ? '<section class="cd-card cd-inperson-share">' + shareButtonHTML + courseEditButtonHTML + '</section>'
            : '') +
          (studentEnrolled
            ? '<section class="cd-card cd-registration-card"><a class="cd-btn cd-btn-buy" href="' +
              SITE.u('playlist', e(c.id)) + (from ? '?from=' + e(from) : '') + '">' +
              UI.icon('play', 16) + e(t('plContinue')) + '</a></section>'
            : inPersonRegistrationForm) + '</div>'
        : '<div class="cd-grid">' +
      '<div class="cd-main">' +
      learnSection +
      courseDescriptionHTML +
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('user', 18) + e(t('ucInstructor')) + '</h2>' +
      (instructorProfileUrl
        ? '<a class="cd-inst cd-inst-link" href="' + e(instructorProfileUrl) + '">'
        : '<div class="cd-inst">') +
      '<img class="cd-inst-av" src="' + e(instructorAvatar) + '" alt="">' +
      '<div><div class="cd-inst-name">' + e(instName) + ' <span class="cd-verified">' + UI.verifiedBadge(14) + '</span></div>' +
      '<div class="cd-inst-sub">' + e(t('ucInstSub')) + (c.category ? ' · ' + e(c.category) : '') + '</div></div>' +
      (instructorProfileUrl ? '</a>' : '</div>') +
      '</section>' +
      (linkedProjects.length ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('briefcase', 18) + e(t('ucLinkedProjects')) + '</h2>' +
      '<div class="cd-projects" id="cdCourseProjectsGrid">' + linkedProjects.map(function (pj, index) {
        return courseProjectCard(pj, index >= 4);
      }).join('') + '</div>' +
      (linkedProjects.length > 4
        ? '<div class="cd-projects-more-wrap"><button class="btn btn-soft" type="button" data-act="show-course-projects" aria-controls="cdCourseProjectsGrid" aria-expanded="false">' +
          e(t('courseProjectsShowMore', { total: linkedProjects.length })) + '</button></div>'
        : '') +
      '</section>' : '') +
      (related.length ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('layers', 18) + e(t('relatedCerts')) + '</h2>' +
      '<div class="cd-related-scroll" dir="' + (document.documentElement.dir || 'rtl') + '">' + related.map(function (x) { return certCard(x, { course: true, homeCourseCard: true, from: from }); }).join('') + '</div>' +
      '</section>' : '') +
      '</div>' +

       '<aside class="cd-side">' +
       '<div class="cd-buy">' +
       '<div class="cd-thumb">' + heroPlayerHTML + previewLabel + '</div>' +
      '<div class="cd-buy-body">' +
      '<div class="cd-price">' +
      '<b>' + e(isComingSoon ? t('courseComingSoon') : (c.price || t('ucFree'))) + '</b>' +
      '<span>' + e(t('ucPriceNote')) + '</span>' +
      '</div>' +
      (isComingSoon && !adminCourseManager && !trainerOwner
        ? '<div class="cd-btn cd-btn-buy cd-coming-soon-notice" role="status">' + UI.icon('clock', 16) + e(t('courseComingSoon')) + '</div>'
        : studentEnrolled
          ? '<a class="cd-btn cd-btn-buy" href="' + SITE.u('playlist', e(c.id)) + (from ? '?from=' + e(from) : '') + '">' + UI.icon('play', 16) + e(t('plContinue')) + '</a>'
          : enrolled || trainerOwner || adminCourseManager
            ? '<a class="cd-btn cd-btn-buy" href="' + SITE.u('playlist', e(c.id)) + (from ? '?from=' + e(from) : '') + '">' + UI.icon('play', 16) + e(t('plStart')) + '</a>'
          : '<button class="cd-btn cd-btn-wa" type="button" data-act="enroll-course" data-title="' + e(c.title) + '">' + UI.icon('whatsapp', 17) + e(t('ucEnroll')) + '</button>') +
      shareButtonHTML +
      courseEditButtonHTML +
      '<ul class="cd-includes">' +
      '<li>' + UI.icon('clock', 15) + '<span>' + e(t('ucDuration')) + ': <b>' + e(c.duration || '—') + '</b></span></li>' +
      '<li>' + UI.icon('calendar', 15) + '<span>' + e(t('ucSessions')) + ': <b>' + e(courseLessonCount(c.period)) + '</b></span></li>' +
      '<li>' + UI.icon('award', 15) + '<span>' + e(t('ucCert')) + '</span></li>' +
      (c.credentialId
        ? '<li>' + UI.icon('hash', 15) + '<span>' + e(t('certId')) + ': <b class="cd-cred" dir="ltr">' + e(c.credentialId) + '</b></span></li>'
        : '') +
      '<li>' + UI.icon('globe', 15) + '<span>' + e(t('ucAccess')) + '</span></li>' +
      '</ul>' +
      '</div></div>' +
      '</aside>' +
      '</div>');

    if (c.courseType === 'in_person' && !studentEnrolled) {
      var registrationForm = document.getElementById('inPersonRegistrationForm');
      var registrationError = document.getElementById('inPersonRegistrationError');
      var registrationSubmit = registrationForm.querySelector('[type="submit"]');
      var registrationPhoneInput = document.getElementById('registrationPhone');
      var registrationCountryCodeInput = document.getElementById('registrationCountryCode');
      var registrationCountryCodePicker = document.getElementById('registrationCountryCodePicker');
      if (window.mountCountryCodePicker) {
        window.mountCountryCodePicker(registrationCountryCodePicker);
      }
      function syncRegistrationPhoneMaxLength() {
        var isPalestinianPrefix = registrationCountryCodeInput.value === '+970' ||
          registrationCountryCodeInput.value === '+972';
        var firstDigit = registrationPhoneInput.value.replace(/\D/g, '').charAt(0);
        var maxLength = isPalestinianPrefix
          ? firstDigit === '5' ? 9 : firstDigit === '0' || !firstDigit ? 10 : 14
          : 14;
        registrationPhoneInput.maxLength = maxLength;
        if (registrationPhoneInput.value.length > maxLength) {
          registrationPhoneInput.value = registrationPhoneInput.value.slice(0, maxLength);
        }
      }
      function registrationPhoneValue() {
        var localNumber = registrationPhoneInput.value.replace(/\D/g, '');
        if (!/^0?(?:56|59)\d{7}$/.test(localNumber)) return '';
        var national = localNumber.replace(/^0/, '');
        var digits = registrationCountryCodeInput.value.slice(1) + national;
        return digits.length >= 7 && digits.length <= 15 ? '+' + digits : '';
      }
      syncRegistrationPhoneMaxLength();
      var registrationFields = {
        fullName: {
          error: document.getElementById('registrationFullNameError'),
          validate: function (value) {
            var parts = value.trim().split(/\s+/).filter(Boolean);
            if (parts.length < 3) return 'أدخل اسمك ثلاثي';
            return parts.length <= 6 && parts.every(function (part) {
              return /^[\p{L}\p{M}]+$/u.test(part);
            }) ? '' : 'يرجى التحقق من الاسم المدخل.';
          }
        },
        phone: {
          error: document.getElementById('registrationPhoneError'),
          validate: function () {
            return registrationPhoneValue()
              ? '' : 'أدخل رقماً يبدأ بـ056 أو 059 من 10 خانات، أو 56 أو 59 من 9 خانات.';
          }
        },
        specialty: {
          error: document.getElementById('registrationSpecialtyError'),
          validate: function (value) {
            return value.trim() ? '' : 'أدخل التخصص.';
          }
        },
        studyYear: {
          error: document.getElementById('registrationStudyYearError'),
          validate: function (value) {
            return /^(?:[1-5]|graduate)$/.test(value)
              ? '' : 'اختر السنة الدراسية.';
          }
        },
        governorate: {
          error: document.getElementById('registrationGovernorateError'),
          validate: function (value) {
            return value === 'gaza' || value === 'central' ? '' : 'اختر المحافظة.';
          }
        }
      };
      function validateRegistrationField(name) {
        var field = registrationForm.elements[name];
        var error = registrationFields[name].validate(field.value);
        registrationFields[name].error.textContent = error;
        if (name === 'phone') {
          document.getElementById('registrationPhoneBox').classList.toggle('bad', !!error);
        }
        Array.prototype.forEach.call(
          registrationForm.querySelectorAll('[name="' + name + '"]'),
          function (control) {
            if (error) control.setAttribute('aria-invalid', 'true');
            else control.removeAttribute('aria-invalid');
          }
        );
        return !error;
      }
      function validateRegistrationForm(revealErrors) {
        var valid = Object.keys(registrationFields).every(function (name) {
          if (revealErrors) return validateRegistrationField(name);
          return !registrationFields[name].validate(registrationForm.elements[name].value);
        });
        registrationSubmit.disabled = !valid;
        return valid;
      }
      var registrationCountData = document.getElementById('course-registration-count');
      var registrationCount = registrationCountData
        ? Math.max(0, Math.min(2, Number(registrationCountData.textContent) || 0))
        : 0;
      var registrationSuccessPanel = null;
      function showRegistrationSuccess(count) {
        registrationCount = Math.max(1, Math.min(2, Number(count) || 1));
        registrationForm.hidden = true;
        if (registrationSuccessPanel) registrationSuccessPanel.remove();
        registrationSuccessPanel = document.createElement('div');
        registrationSuccessPanel.className = 'course-registration-inline-success';
        registrationSuccessPanel.setAttribute('role', 'status');
        registrationSuccessPanel.innerHTML =
          '<div class="course-registration-success-art" aria-hidden="true">' +
          '<span class="course-registration-success-sparkle">✨</span>' +
          '<span class="course-registration-success-icon">' + UI.icon('check', 28) + '</span>' +
          '<span class="course-registration-success-confetti">🎉</span></div>' +
          '<h3>تم تسجيل طلبك بنجاح ✅</h3>' +
          '<p>سنتواصل معك خلال لحظات 📞</p>' +
          '<span class="course-registration-success-course">' + e(c.title) + '</span>' +
          (registrationCount < 2
            ? '<button class="btn btn-primary course-registration-another" type="button">' +
              UI.icon('user', 16) + 'سجّل لشخص آخر</button>'
            : '');
        registrationForm.parentNode.insertBefore(registrationSuccessPanel, registrationForm);
        var anotherButton = registrationSuccessPanel.querySelector('.course-registration-another');
        if (anotherButton) {
          anotherButton.addEventListener('click', function () {
            registrationSuccessPanel.remove();
            registrationSuccessPanel = null;
            registrationForm.hidden = false;
            registrationForm.reset();
            Object.keys(registrationFields).forEach(function (name) {
              registrationFields[name].error.textContent = '';
              Array.prototype.forEach.call(
                registrationForm.querySelectorAll('[name="' + name + '"]'),
                function (control) {
                  control.removeAttribute('aria-invalid');
                }
              );
            });
            document.getElementById('registrationPhoneBox').classList.remove('bad');
            syncRegistrationPhoneMaxLength();
            validateRegistrationForm(false);
            registrationForm.elements.fullName.focus();
          });
        }
      }
      registrationPhoneInput.addEventListener('input', function () {
        var digits = registrationPhoneInput.value.replace(/\D/g, '');
        if (registrationPhoneInput.value !== digits) registrationPhoneInput.value = digits;
        syncRegistrationPhoneMaxLength();
        validateRegistrationField('phone');
        registrationSubmit.disabled = !Object.keys(registrationFields).every(function (name) {
          return !registrationFields[name].validate(registrationForm.elements[name].value);
        });
        registrationError.hidden = true;
      });
      registrationCountryCodeInput.addEventListener('change', function () {
        syncRegistrationPhoneMaxLength();
        validateRegistrationField('phone');
        validateRegistrationForm(false);
        registrationError.hidden = true;
      });
      Object.keys(registrationFields).forEach(function (name) {
        var field = registrationForm.elements[name];
        var controls = registrationForm.querySelectorAll('[name="' + name + '"]');
        Array.prototype.forEach.call(controls, function (control) {
          control.addEventListener('input', function () {
            validateRegistrationField(name);
            registrationSubmit.disabled = !Object.keys(registrationFields).every(function (key) {
              return !registrationFields[key].validate(registrationForm.elements[key].value);
            });
            registrationError.hidden = true;
          });
          control.addEventListener('change', function () {
            validateRegistrationField(name);
            registrationSubmit.disabled = !Object.keys(registrationFields).every(function (key) {
              return !registrationFields[key].validate(registrationForm.elements[key].value);
            });
            registrationError.hidden = true;
          });
          control.addEventListener('blur', function () {
            validateRegistrationField(name);
          });
        });
      });
      registrationSubmit.disabled = !Object.keys(registrationFields).every(function (name) {
        return !registrationFields[name].validate(registrationForm.elements[name].value);
      });
      if (registrationCount > 0) showRegistrationSuccess(registrationCount);
      registrationForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!validateRegistrationForm(true)) {
          registrationForm.querySelector('[aria-invalid="true"]').focus();
          return;
        }
        var formData = new FormData(registrationForm);
        var fullName = String(formData.get('fullName') || '').trim().replace(/\s+/g, ' ');
        var phone = registrationPhoneValue();
        var specialty = String(formData.get('specialty') || '').trim();
        var studyYearValue = String(formData.get('studyYear') || '');
        var studyYear = studyYearValue === 'graduate' ? null : Number(studyYearValue);
        var governorate = String(formData.get('governorate') || '').trim();
        registrationError.hidden = true;
        registrationSubmit.disabled = true;
        registrationSubmit.textContent = 'جارٍ حفظ الطلب…';
        fetch(SITE.u('courseRegistration', c.id), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            fullName: fullName,
            phone: phone,
            specialty: specialty,
            studyYear: studyYear,
            studentStatus: studyYearValue === 'graduate' ? 'graduate' : 'student',
            governorate: governorate
          })
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) {
              var error = new Error(data.error || 'registration_failed');
              error.status = response.status;
              error.count = data.count;
              throw error;
            }
            return data;
          });
        }).then(function (data) {
          registrationForm.reset();
          Object.keys(registrationFields).forEach(function (name) {
            registrationFields[name].error.textContent = '';
            Array.prototype.forEach.call(
              registrationForm.querySelectorAll('[name="' + name + '"]'),
              function (control) {
                control.removeAttribute('aria-invalid');
              }
            );
          });
          registrationSubmit.disabled = true;
          showRegistrationSuccess(data.count || registrationCount + 1);
        }).catch(function (error) {
          if (error.status === 429) {
            registrationError.textContent = 'تم إرسال عدة طلبات. حاول مرة أخرى لاحقاً.';
          } else if (error.message === 'registration_limit_reached') {
            showRegistrationSuccess(error.count || 2);
          } else if (error.status === 404) {
            registrationError.textContent = 'هذه الدورة غير متاحة للتسجيل حالياً.';
          } else {
            registrationError.textContent = 'تعذر حفظ الطلب حالياً. تحقق من اتصالك وحاول مجدداً.';
            console.error('Course registration request failed:', error);
          }
          registrationError.hidden = false;
        }).finally(function () {
          registrationSubmit.textContent = 'حفظ طلب التسجيل';
          validateRegistrationForm(false);
        });
      });
    }

    mountRelatedCarousel('.cd-related-scroll', '.cert-card');
    mountCourseHeroPlayer();
    if (registrationRequired && !enrolled) confirmCourseRegistration(c.title);
  }

  function mountRelatedCarousel(selector, cardSelector) {
    if (relatedCarouselCleanup) relatedCarouselCleanup();
    var track = document.querySelector(selector);
    if (!track) return;

    var cards = Array.prototype.slice.call(track.querySelectorAll(cardSelector)).filter(function (card) {
      return !card.hasAttribute('data-related-carousel-clone');
    });
    if (cards.length < 2) return;
    function loopDistance() {
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return cards.reduce(function (width, card) {
        return width + card.getBoundingClientRect().width;
      }, 0) + gap * cards.length;
    }

    var active = false;
    var resumeTimer = null;
    var resizeHandler;
    function removeClones() {
      track.querySelectorAll('[data-related-carousel-clone]').forEach(function (clone) {
        clone.remove();
      });
    }

    function pauseAutoScroll() {
      paused = true;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(function () { paused = false; }, 4000);
    }

    var paused = false;
    function onScroll() {
      var position = relatedScrollPosition(track);
      var distance = loopDistance();
      if (distance && position >= distance) relatedSetScrollPosition(track, position - distance);
    }
    function onPointerEnter() { paused = true; }
    function onPointerLeave() { paused = false; }
    function onFocusOut(event) {
      if (!track.contains(event.relatedTarget)) paused = false;
    }

    function start() {
      if (active || window.innerWidth > 720 || !track.isConnected) return;
      removeClones();
      var distance = loopDistance();
      var cloneSets = 0;
      while (track.scrollWidth < track.clientWidth + distance && cloneSets < 20) {
        cards.forEach(function (card) {
          var clone = card.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.setAttribute('data-related-carousel-clone', '');
          clone.querySelectorAll('a, button, [tabindex]').forEach(function (item) {
            item.setAttribute('tabindex', '-1');
          });
          track.appendChild(clone);
        });
        cloneSets += 1;
      }

      paused = false;
      active = true;
      track.addEventListener('scroll', onScroll, { passive: true });
      track.addEventListener('pointerdown', pauseAutoScroll);
      track.addEventListener('wheel', pauseAutoScroll, { passive: true });
      track.addEventListener('mouseenter', onPointerEnter);
      track.addEventListener('mouseleave', onPointerLeave);
      track.addEventListener('focusin', onPointerEnter);
      track.addEventListener('focusout', onFocusOut);

      relatedCoursesAutoScroll = window.setInterval(function () {
        if (paused || track.matches(':hover') || track.contains(document.activeElement)) return;
        var firstCard = track.querySelector(cardSelector);
        var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
        var step = firstCard ? firstCard.getBoundingClientRect().width + gap : track.clientWidth;
        track.scrollTo({
          left: relatedRawScrollPosition(track, relatedScrollPosition(track) + step),
          behavior: 'smooth'
        });
      }, 3500);
    }

    function stop() {
      if (!active) return;
      active = false;
      window.clearInterval(relatedCoursesAutoScroll);
      relatedCoursesAutoScroll = null;
      window.clearTimeout(resumeTimer);
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('pointerdown', pauseAutoScroll);
      track.removeEventListener('wheel', pauseAutoScroll);
      track.removeEventListener('mouseenter', onPointerEnter);
      track.removeEventListener('mouseleave', onPointerLeave);
      track.removeEventListener('focusin', onPointerEnter);
      track.removeEventListener('focusout', onFocusOut);
      removeClones();
      relatedSetScrollPosition(track, 0);
    }

    resizeHandler = function () {
      if (window.innerWidth > 720) stop();
      else start();
    };
    window.addEventListener('resize', resizeHandler);
    relatedCarouselCleanup = function () {
      window.removeEventListener('resize', resizeHandler);
      stop();
      relatedCarouselCleanup = null;
    };
    resizeHandler();
  }

  var relatedRtlScrollModel = null;
  var relatedCarouselCleanup = null;
  function getRelatedRtlScrollModel(track) {
    if (relatedRtlScrollModel !== null) return relatedRtlScrollModel;
    var previous = track.scrollLeft;
    track.scrollLeft = 0;
    track.scrollLeft = -1;
    if (track.scrollLeft < 0) relatedRtlScrollModel = 'negative';
    else {
      track.scrollLeft = 1;
      relatedRtlScrollModel = track.scrollLeft > 0 ? 'reverse' : 'default';
    }
    track.scrollLeft = previous;
    return relatedRtlScrollModel;
  }

  function relatedScrollPosition(track) {
    var max = Math.max(0, track.scrollWidth - track.clientWidth);
    if ((track.getAttribute('dir') || document.documentElement.dir) !== 'rtl') {
      return Math.max(0, Math.min(max, track.scrollLeft));
    }
    var model = getRelatedRtlScrollModel(track);
    if (model === 'negative') return Math.max(0, Math.min(max, -track.scrollLeft));
    if (model === 'reverse') return Math.max(0, Math.min(max, track.scrollLeft));
    return Math.max(0, Math.min(max, max - track.scrollLeft));
  }

  function relatedSetScrollPosition(track, position) {
    var max = Math.max(0, track.scrollWidth - track.clientWidth);
    position = Math.max(0, Math.min(max, position));
    track.scrollLeft = relatedRawScrollPosition(track, position);
  }

  function relatedRawScrollPosition(track, position) {
    var max = Math.max(0, track.scrollWidth - track.clientWidth);
    position = Math.max(0, Math.min(max, position));
    if ((track.getAttribute('dir') || document.documentElement.dir) !== 'rtl') {
      return position;
    }
    var model = getRelatedRtlScrollModel(track);
    if (model === 'negative') return -position;
    if (model === 'reverse') return position;
    return max - position;
  }

  /* تهيئة مشغّل Plyr لمعاينة أول درس في صفحة تفاصيل الدورة (نفس آلية مشغّل الدروس) */
  var heroPlyr = null;
  function mountCourseHeroPlayer() {
    var host = document.getElementById('cdHeroPlayer');
    if (!host || !window.Plyr) return;
    if (heroPlyr) { try { heroPlyr.destroy(); } catch (err) { /* ignore */ } heroPlyr = null; }
    try { heroPlyr = UI.mountPlyr(host); } catch (err) { heroPlyr = null; }
  }

  /* ---------- detail: project ---------- */

  function renderProjectDetail() {
    var host = document.getElementById('detailHost');
    var id = SITE.param('id');
    var p = Store.find('projects', id);
    if (!p) { renderNotFound(host); return; }
    if (!p._viewed) { p.views = (p.views || 0) + 1; p._viewed = true; Store.save(true); }
    var related = Store.collection('projects').filter(function (x) { return x.id !== p.id && x.status !== 'draft'; }).slice(0, 3);
    var tags = (p.tags || []).map(function (x) { return '<span class="chip">' + e(x) + '</span>'; }).join('');
    var galleryItems = p.gallery || [];
    var gallery = galleryItems.length
      ? '<h2 style="font-size:17px;margin:26px 0 12px">' + UI.icon('image', 16) + ' ' + e(t('projGallery')) + '</h2><div class="gallery-row" id="projGalleryRow">' +
        galleryItems.map(function (g, i) { return '<button class="gal-item" data-gal="' + i + '" type="button"><img src="' + e(g) + '" alt="" loading="lazy" decoding="async" draggable="false"></button>'; }).join('') +
        '</div>'
      : '';
    var displayedViews = typeof p.displayViews === 'number' ? p.displayViews : (p.views || 0);
    var displayedLikes = typeof p.displayLikes === 'number' ? p.displayLikes : (p.likes || 0);

    host.innerHTML =
      backLink(null, true) +
      (p.status !== 'published' ? '<div style="margin-bottom:14px"><span class="chip warn">' + e(p.status === 'inactive' ? (I18n.getLang() === 'en' ? 'Inactive' : 'غير نشط') : t('draft')) + '</span></div>' : '') +
      (p.cover ? '<div class="detail-hero reveal" style="margin-bottom:16px"><img class="detail-cover" src="' + e(p.cover) + '" alt="" fetchpriority="high"></div>' : '') +
      '<div class="detail-grid">' +
      '<div class="detail-main">' +
      '<div class="detail-title-row reveal reveal-1"><h1>' + e(p.title) + '</h1>' +
      (canManageProject(p) ? '<div class="detail-actions">' +
      '<button class="btn btn-ghost btn-sm" data-act="edit-goto" data-url="' + SITE.u('projectEdit', e(p.id)) + '">' + UI.icon('pencil', 14) + e(t('edit')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="del-project" data-id="' + e(p.id) + '">' + UI.icon('trash', 14) + e(t('delete')) + '</button>' +
      '</div>' : '') + '</div>' +
      (p.summary ? '<p class="muted" style="font-size:15.5px;line-height:1.9;margin-bottom:12px">' + e(p.summary) + '</p>' : '') +
      '<div class="project-detail-stats" aria-label="' + e(t('projectStats')) + '">' +
      '<span class="project-detail-stat" data-project-stat="views">' + UI.icon('eye', 16) + '<b>' + displayedViews + '</b><span>' + e(t('views')) + '</span></span>' +
      (p.category ? '<span class="project-detail-stat">' + UI.icon('folder', 16) + '<span>' + e(p.category) + '</span></span>' : '') +
      '</div>' +
      (tags ? '<div class="stat-chips" style="margin-bottom:18px">' + tags + '</div>' : '') +
      '<div class="prose">' + UI.sanitize(p.content) + '</div>' +
      gallery +
      '</div>' +
      '<aside class="detail-side">' +
      '<div class="card side-card reveal reveal-2">' +
      '<div class="stat-chips" style="margin-bottom:12px">' +
      '<button class="stat-chip' + (p.liked ? ' liked' : '') + '" data-act="like-project" data-id="' + e(p.id) + '" aria-label="' + e(t(p.liked ? 'liked' : 'like')) + '" title="' + e(t(p.liked ? 'liked' : 'like')) + '">' + UI.iconFilled('heart', 15) + '<span class="project-like-count">' + displayedLikes + '</span></button>' +
      '<button class="stat-chip' + (p.saved ? ' liked' : '') + '" data-act="save-project" data-id="' + e(p.id) + '">' + UI.icon('bookmark', 15) + ' ' + e(p.saved ? t('saved') : t('save')) + '</button>' +
      '<button class="stat-chip" data-act="share" data-url="' + SITE.u('project', e(p.id)) + '">' + UI.icon('share-2', 15) + e(t('shareCta')) + '</button>' +
      '</div>' +
      ((p.links && (p.links.github || p.links.demo)) ?
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        (p.links.github ? '<a class="btn btn-ghost btn-block" href="' + e(p.links.github) + '" target="_blank" rel="noopener">' + UI.icon('github', 16) + e(t('source')) + '</a>' : '') +
        (p.links.demo ? '<a class="btn btn-grad btn-block" href="' + e(p.links.demo) + '" target="_blank" rel="noopener">' + UI.icon('external-link', 16) + e(t('demo')) + '</a>' : '') +
        '</div>' : '') +
      '</div>' +
      ((p.files || []).length ? '<div class="card side-card"><h3>' + UI.icon('file', 16) + e(t('projFiles')) + '</h3><div class="file-list">' +
        p.files.map(function (f) {
          return '<div class="file-item"><span class="file-ic">' + UI.icon('file-text', 16) + '</span><div class="file-meta"><b>' + e(f.name) + '</b><span>' + e(UI.fileSize(f.size)) + '</span></div>' +
            (p.canDownloadFiles
              ? '<a class="btn-icon sm" download="' + e(f.name) + '" href="' + e(f.downloadUrl || f.dataUrl) + '" aria-label="' + e(t('download')) + '">' + UI.icon('download', 15) + '</a>'
              : '<button class="btn-icon sm" type="button" disabled title="' + e(t('projectFilesEnrolledOnly')) + '" aria-label="' + e(t('projectFilesEnrolledOnly')) + '">' + UI.icon('download', 15) + '</button>') +
            '</div>';
        }).join('') + '</div></div>' : '') +
      '<div class="card side-card"><h3>' + UI.icon('calendar', 16) + e(t('projectUpdated')) + '</h3><p class="small muted">' + e(UI.formatDate(p.updatedAt || p.createdAt)) + '</p></div>' +
      '</aside></div>' +
      (related.length ? '<h2 style="font-size:17px;margin:30px 0 14px">' + e(t('relatedProjects')) + '</h2><div class="related-scroll related-projects-scroll" dir="' + (document.documentElement.dir || 'rtl') + '">' + related.map(projCard).join('') + '</div>' : '');
    mountRelatedCarousel('.related-projects-scroll', '.proj-card');
  }

  document.addEventListener('click', function (ev) {
    var actEl = ev.target.closest('[data-act]');
    if (!actEl) return;
    var act = actEl.getAttribute('data-act');
    if (act === 'show-course-projects') {
      var projectsGrid = document.getElementById(actEl.getAttribute('aria-controls'));
      if (!projectsGrid) return;
      projectsGrid.querySelectorAll('.cd-project-card[hidden]').forEach(function (card) {
        card.hidden = false;
      });
      actEl.setAttribute('aria-expanded', 'true');
      actEl.parentElement.classList.add('is-hidden');
      return;
    }
    if (act === 'edit-goto') { location.href = actEl.getAttribute('data-url'); return; }
    if (act === 'like-project' || act === 'save-project') {
      var p = Store.find('projects', actEl.getAttribute('data-id'));
      if (!p) return;
      if (Store.usingServerProjects) {
        fetch(SITE.u('projectInteraction'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
          body: JSON.stringify({
            id: p.id,
            field: act === 'like-project' ? 'like' : 'save'
          })
        }).then(function (response) {
          return response.json().catch(function () {
            return { ok: false, error: 'required' };
          });
        }).then(function (result) {
          if (!result) return;
          if (result.error === 'authentication_required') {
            var returnTo = location.pathname + location.search + location.hash;
            location.href = SITE.u('login') + '?next=' + encodeURIComponent(returnTo);
            return;
          }
          if (!result.ok) {
            UI.toast(t(result.error || 'required'), 'error');
            return;
          }
          p.liked = result.liked;
          p.saved = result.saved;
          p.likes = result.likes;
          if (typeof result.displayLikes === 'number') {
            p.displayLikes = result.displayLikes;
          }
          if (act === 'save-project') UI.toast(p.saved ? t('saved') : t('save'), 'success');
          renderProjectDetail();
        }).catch(function () {
          UI.toast(t('required'), 'error');
        });
        return;
      }
      if (act === 'like-project') {
        p.liked = !p.liked;
        p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1));
        actEl.classList.add('pop');
      } else {
        p.saved = !p.saved;
        UI.toast(p.saved ? t('saved') : t('save'), 'success');
      }
      Store.save(true);
      renderProjectDetail();
    }
  });

  /* ---------- boot ---------- */

  function boot() {
    UI.init();
    var completedSetupAlert = document.querySelector('#profileSetupAlert.is-complete');
    if (completedSetupAlert) dismissProfileSetupAlert(completedSetupAlert);
    if (location.search.indexOf('saved=1') >= 0) {
      UI.toast(t('profileSaved'), 'success');
      if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.hash);
    }
    try {
      if (page === 'home') {
        var hash = (location.hash || '').replace('#', '');
        if (SERVER_PROFILE && SERVER_PROFILE.roleKey === 'student') activeTab = 'active-courses';
        if (['certificates', 'projects'].indexOf(hash) >= 0 ||
          (hash === 'trainer-courses' && IS_TRAINER) ||
          (hash === 'active-courses' && SERVER_PROFILE && SERVER_PROFILE.roleKey === 'student') ||
          (hash === 'saved' && SERVER_PROFILE)) activeTab = hash;
        renderHome();
      } else if (page === 'course') {
        mountChrome({});
        renderCourseDetail();
      } else if (page === 'certificate') {
        mountChrome({});
        renderCourseDetail();
      } else if (page === 'project') {
        mountChrome({});
        renderProjectDetail();
      }
    } catch (err) {
      /* لا تُترك الصفحة فارغة عند أي خطأ */
      var host = document.getElementById('detailHost');
      if (host) {
        host.innerHTML = '<div class="empty-state"><h3>' + e(t('notFound')) + '</h3></div>';
      }
      if (window.console && console.error) console.error('[app] render error:', err);
    }
  }

  document.addEventListener('i18n:change', UI.debounce(function () {
    closeCommentsSheet();
    if (page === 'home') renderHome();
    else if (page === 'course' || page === 'certificate') { mountChrome({}); renderCourseDetail(); }
    else if (page === 'project') { mountChrome({}); renderProjectDetail(); }
  }, 60));

  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    var host = document.getElementById('detailHost');
    if (!host || host.childElementCount) return;
    if (page === 'course' || page === 'certificate') renderCourseDetail();
    else if (page === 'project') renderProjectDetail();
  });

  window.AppPage = { renderHome: renderHome, openProfileModal: openProfileModal, openCertModal: openCertModal, renderNotFound: renderNotFound, backLink: backLink, postCard: postCard, certCard: certCard, inPersonCourseCard: inPersonCourseCard, workshopCertificateCard: workshopCertificateCard, projCard: projCard, initCaptions: initCaptions, initSkillTagScroller: initSkillTagScroller };

  boot();
})();
