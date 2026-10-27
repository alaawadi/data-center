/* ============================================================
   playlist.js — قائمة دروس الدورة (على طريقة صفحات مشاهدة الدورات)
   ============================================================ */
(function () {
  'use strict';

  var PKEY = 'dc_playlist_progress_v1';

  var course = null, syllabus = [], flat = [], progress = {}, currentKey = null;
  var openedSectionIndex = 0;
  var trainerMode = false;
  var serverProgress = null;      /* {done: [lesson ids], complete: bool} من السيرفر */
  var idKeyMap = {};              /* معرّف الدرس في قاعدة البيانات ← المفتاح الموضعي */
  var completeFlag = false;       /* أنهى الدورة (تُظهر شارة الشهادة وتمنع تكرار التهنئة) */
  var quizStatus = {};            /* حالة محاولات الكويز لكل درس (id → {...}) */
  var quizState = null;           /* الحالة الحية للكويز المعروض حالياً */
  var quizCooldownTimer = null;
  var projectFlag = {};           /* دروس «مشروع» أُنشئ لها مشروع في هذه الجلسة */
  var activePlyr = null;          /* نسخة Plyr النشطة (تُدمَّر عند تغيير الدرس) */
  var params = new URLSearchParams(location.search);
  var courseId = SITE.param('id') || '';
  var rawCourseId = courseId;      /* المعرّف كما ورد في الرابط (slug أو pk) */
  var from = params.get('from') || '';

  function e(s) { return UI.esc(s == null ? '' : s); }
  function t(k, v) { return I18n.t(k, v); }

  /* استخراج معرّف فيديو يوتيوب من أي صيغة رابط — دالة مشتركة مع صفحة تفاصيل الدورة */
  function youtubeId(url) {
    return UI.youtubeId(url);
  }

  /* رابط تضمين يوتيوب مع بارامترات تُخفي علامات يوتيوب وتُسلّم التحكّم لـ Plyr */
  function youtubeEmbed(id) {
    var q = [
      'rel=0',              /* لا فيديوهات مقترحة من قنوات أخرى */
      'modestbranding=1',   /* إخفاء شعار يوتيوب في شريط التحكّم */
      'playsinline=1',
      'iv_load_policy=3',   /* إخفاء بطاقات الشرح */
      'fs=1',
      'controls=1'
    ].join('&');
    return 'https://www.youtube.com/embed/' + id + '?' + q;
  }

  function certUrl() { return SITE.u('certificate', courseId); }

  /* زر الشهادة — يظهر أسفل صندوق التقدّم بعد إتمام كل دروس الدورة */
  function certBtnHTML() {
    if (trainerMode || !completeFlag) return '';
    return '<a class="pl-cert-btn" href="' + certUrl() + '">' +
      UI.icon('award', 16) + ' ' + e(t('plCertBtn')) + '</a>';
  }

  /* يضيف/يزيل زر الشهادة في صندوق التقدّم حسب حالة إتمام الدورة */
  function syncCertBtn() {
    var box = document.querySelector('.pl-progress-box');
    if (!box) return;
    var btn = box.querySelector('.pl-cert-btn');
    if (completeFlag) {
      if (!btn) box.insertAdjacentHTML('beforeend', certBtnHTML());
    } else if (btn && btn.parentNode) {
      btn.parentNode.removeChild(btn);
    }
  }

  function readServerProgress() {
    var el = document.getElementById('course-progress');
    if (!el) return null;
    try {
      var d = JSON.parse(el.textContent);
      return d && typeof d === 'object' ? d : null;
    } catch (err) { return null; }
  }

  function readQuizStatus() {
    var el = document.getElementById('course-quiz');
    if (!el) return null;
    try {
      var d = JSON.parse(el.textContent);
      return d && typeof d === 'object' ? d : null;
    } catch (err) { return null; }
  }

  function csrf() {
    if (window.CSRF_TOKEN) return window.CSRF_TOKEN;
    var m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m ? m[1] : '';
  }

  /* ---------- أدوات ---------- */

  function parseDur(str) {
    if (!str) return 0;
    var p = String(str).split(':').map(function (x) { return parseInt(x, 10) || 0; });
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return p[0] || 0;
  }

  function fmtTotal(sec) {
    if (!sec) return '';
    var h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    var parts = [];
    if (h) parts.push(h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : h <= 10 ? h + ' ساعات' : h + ' ساعة');
    if (m) parts.push(m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتان' : m <= 10 ? m + ' دقائق' : m + ' دقيقة');
    return parts.join(' و ');
  }

  function arCount(n, one, two, few, many) {
    if (n === 1) return one;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return n + ' ' + few;
    return n + ' ' + many;
  }

  function lessonsLabel(n) {
    if (document.documentElement.lang === 'en') return n + (n === 1 ? ' lesson' : ' lessons');
    return arCount(n, 'لقاء واحد', 'لقاءان', 'لقاءات', 'لقاءً');
  }

  function sectionsLabel(n) {
    if (document.documentElement.lang === 'en') return n + (n === 1 ? ' section' : ' sections');
    return arCount(n, 'قسم واحد', 'قسمان', 'أقسام', 'قسماً');
  }

  function secLessons(sec) { return (sec.lessons || []).length; }

  function secDuration(sec) {
    return (sec.lessons || []).reduce(function (s, l) { return s + parseDur(l.duration); }, 0);
  }

  function courseBackHref() {
    return SITE.u('course', courseId) + (from ? '?from=' + encodeURIComponent(from) : '');
  }

  /* ---------- التقدّم (محلي) ---------- */

  function loadProgress() {
    try {
      var all = JSON.parse(localStorage.getItem(PKEY) || '{}');
      var out = all[courseId] ? Object.assign({}, all[courseId]) : {};
      /* دمج التقدّم المحفوظ بالمعرّف القديم (pk) حتى لا يضيع */
      if (rawCourseId && rawCourseId !== courseId && all[rawCourseId]) {
        Object.keys(all[rawCourseId]).forEach(function (k) {
          if (!out[k]) out[k] = all[rawCourseId][k];
        });
      }
      return out;
    }
    catch (err) { return {}; }
  }

  function saveProgress() {
    try {
      var all = JSON.parse(localStorage.getItem(PKEY) || '{}');
      all[courseId] = progress;
      localStorage.setItem(PKEY, JSON.stringify(all));
    } catch (err) { /* ignore */ }
  }

  function doneCount() {
    return flat.filter(function (f) { return progress[f.key]; }).length;
  }

  function pct() {
    return flat.length ? Math.round(doneCount() * 100 / flat.length) : 0;
  }

  function sectionIsDone(sectionIndex) {
    var lessons = syllabus[sectionIndex] && syllabus[sectionIndex].lessons || [];
    if (!lessons.length) return false;
    return lessons.every(function (_lesson, lessonIndex) {
      return !!progress['s' + sectionIndex + 'l' + lessonIndex];
    });
  }

  function syncSections() {
    document.querySelectorAll('.pl-sec').forEach(function (section, index) {
      var isOpen = index === openedSectionIndex;
      var head = section.querySelector('.pl-sec-head');
      var list = section.querySelector('.pl-sec-list');
      var complete = section.querySelector('.pl-sec-complete');
      if (head) {
        head.classList.toggle('collapsed', !isOpen);
        head.classList.toggle('is-complete', sectionIsDone(index));
        head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
      if (list) list.classList.toggle('collapsed', !isOpen);
      if (complete) complete.hidden = !sectionIsDone(index);
    });
  }

  /* ---------- بناء القائمة المسطّحة ---------- */

  function flatten() {
    flat = [];
    idKeyMap = {};
    syllabus.forEach(function (sec, si) {
      (sec.lessons || []).forEach(function (ls, li) {
        var key = 's' + si + 'l' + li;
        flat.push({ key: key, sec: sec, si: si, li: li, lesson: ls, num: flat.length + 1 });
        if (ls && ls.id != null) idKeyMap[String(ls.id)] = key;
      });
    });
  }

  /* ---------- عرض ---------- */

  function lessonIcon(type) {
    if (type === 'article') return UI.icon('file-text', 13);
    if (type === 'quiz') return UI.icon('help-circle', 13);
    if (type === 'project') return UI.icon('briefcase', 13);
    return UI.icon('play', 13);
  }

  function lessonMetaLabel(ls) {
    if (ls.type === 'article') return t('plRead');
    if (ls.type === 'quiz') return t('plQuizType');
    if (ls.type === 'project') return t('plProjectType');
    return ls.duration || '';
  }

  function idOf(key) {
    var f = flat.find(function (x) { return x.key === key; });
    return f && f.lesson ? f.lesson.id : null;
  }

  function qStatusFor(key) {
    var id = idOf(key);
    if (id == null) return null;
    return quizStatus[String(id)] || null;
  }

  /* ---------- تدفّق الكويز ---------- */

  function resetQuiz(key) {
    if (idOf(currentKey) !== idOf(key)) quizState = null;
  }

  function htmlQuizIntro(ls) {
    var st = qStatusFor(currentKey) || { attempts: 0, best: 0, passed: false, max: (ls.quiz && ls.quiz.maxAttempts) || 3, remaining: (ls.quiz && ls.quiz.maxAttempts) || 3 };
    var canStart = st.passed ? true : st.remaining > 0;
    if (st.passed) {
      return '<div class="qz-intro">' +
        '<span class="qz-emoji">' + UI.icon('check-circle', 34) + '</span>' +
        '<h3>' + e(t('quizTitle')) + '</h3>' +
        '<p class="qz-lead">' + e(t('quizResultPass')) + '</p>' +
        '<div class="qz-stats">' +
        '<span class="qz-stat is-pass">' + UI.icon('check-circle', 14) + ' ' + e(t('quizPassed')) + '</span>' +
        '<span class="qz-stat">' + UI.icon('award', 14) + ' ' + e(t('quizBest', { n: st.best })) + '</span>' +
        '</div>' +
        '</div>';
    }
    return '<div class="qz-intro">' +
      '<span class="qz-emoji">' + UI.icon('help-circle', 34) + '</span>' +
      '<h3>' + e(t('quizTitle')) + '</h3>' +
      '<p class="qz-lead">' + e(t('quizIntro', { n: (ls.quiz && ls.quiz.questionsTotal) || st.total || 0, attempts: st.max, pass: (ls.quiz && ls.quiz.passScore) || 60 })) + '</p>' +
      (ls.quiz && ls.quiz.instructions ? '<p class="qz-note">' + e(ls.quiz.instructions) + '</p>' : '') +
      '<div class="qz-stats">' +
      '<span class="qz-stat">' + UI.icon('rotate-ccw', 14) + ' ' + e(t('quizAttemptsLeft', { n: st.remaining })) + '</span>' +
      '<span class="qz-stat">' + UI.icon('award', 14) + ' ' + e(t('quizBest', { n: st.best })) + '</span>' +
      '</div>' +
      '<button type="button" class="btn btn-primary qz-start" data-act="quiz-start"' + (canStart ? '' : ' disabled') + '>' +
      UI.icon('play', 16) + ' ' + e(st.attempts && !st.passed ? t('quizRetry') : t('quizStart')) + '</button>' +
      (!canStart ? quizLockedMessage(st) : '') +
      '</div>';
  }

  function quizLockedMessage(st) {
    var countdown = st.retryAt
      ? '<p class="qz-locked">' + e(t('quizCooldown')) + ' <span data-quiz-countdown></span></p>'
      : '';
    return '<p class="qz-locked">' + e(t('quizNoAttempts')) + '</p>' + countdown;
  }

  function formatQuizCountdown(retryAt) {
    var seconds = Math.max(0, Math.ceil((Date.parse(retryAt) - Date.now()) / 1000));
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;
    return (minutes < 10 ? '0' : '') + minutes + ':' +
      (remainingSeconds < 10 ? '0' : '') + remainingSeconds;
  }

  function htmlQuizQuestion(qz, index, total) {
    var answered = quizState.answers[qz.id] != null;
    var choices = qz.choices.map(function (c) {
      var on = quizState.answers[qz.id] === c.id;
      return '<button type="button" class="qz-choice' + (on ? ' is-on' : '') + '" data-act="quiz-choose" data-choice="' + c.id + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '">' +
        '<i class="qz-radio"></i><span>' + e(c.text) + '</span></button>';
    }).join('');
    return '<div class="qz-question">' +
      '<div class="qz-q-head"><span class="qz-q-num">' + e(t('quizQuestionOf', { i: index + 1, n: total })) + '</span></div>' +
      '<h4 class="qz-q-text">' + e(qz.text) + '</h4>' +
      '<div class="qz-choices">' + choices + '</div>' +
      '</div>';
  }

  function htmlQuizForm() {
    var qz = quizState.payload.questions.filter(function (q) { return q.id === quizState.currentId; })[0];
    if (!qz) return '';
    var index = quizState.payload.questions.indexOf(qz);
    var total = quizState.payload.questions.length;
    var answered = quizState.answers[qz.id] != null;
    var isLast = index === total - 1;
    return '<div class="qz-form">' +
      '<div class="qz-progress"><div class="qz-bar"><span style="width:' + Math.round((index) * 100 / total) + '%"></span></div>' +
      '<span>' + e(t('quizProgress', { done: index, n: total })) + '</span></div>' +
      htmlQuizQuestion(qz, index, total) +
      '<div class="qz-nav">' +
      '<button type="button" class="btn btn-ghost" data-act="quiz-prev"' + (index === 0 ? ' disabled' : '') + '>' + UI.icon(document.documentElement.dir === 'rtl' ? 'chevron-right' : 'chevron-left', 15) + ' ' + e(t('plPrev')) + '</button>' +
      (isLast
        ? '<button type="button" class="btn btn-primary" data-act="quiz-submit"' + (answered ? '' : ' disabled') + '>' + e(t('quizSubmit')) + ' ' + UI.icon('send', 15) + '</button>'
        : '<button type="button" class="btn btn-primary" data-act="quiz-next"' + (answered ? '' : ' disabled') + '>' + e(t('plNext')) + ' ' + UI.icon(document.documentElement.dir === 'rtl' ? 'chevron-left' : 'chevron-right', 15) + '</button>') +
      '</div>' +
      '<div class="qz-dots">' + quizState.payload.questions.map(function (q, i) {
        var cls = 'qz-dot' + (i === index ? ' is-current' : '') + (quizState.answers[q.id] != null ? ' is-answered' : '');
        return '<button type="button" class="' + cls + '" data-act="quiz-goto" data-index="' + i + '">' + (i + 1) + '</button>';
      }).join('') + '</div>' +
      '</div>';
  }

  function htmlQuizResult() {
    var r = quizState.result || {};
    var results = 'results' in r ? r.results : [];
    var rows = results.map(function (res) {
      var qz = (quizState.payload ? quizState.payload.questions : []).filter(function (q) { return q.id === res.id; })[0]
        || { text: '', choices: [] };
      var chosen = (qz.choices || []).filter(function (c) { return c.id === res.your; })[0];
      var right = (qz.choices || []).filter(function (c) { return c.id === res.correctChoice; })[0];
      return '<div class="qz-review ' + (res.correct ? 'is-pass' : 'is-fail') + '">' +
        '<div class="qz-review-head">' + UI.icon(res.correct ? 'check-circle' : 'x', 15) + '<b>' + e(qz.text) + '</b></div>' +
        (chosen ? '<div class="qz-review-line"><span>' + e(t('quizYourAnswer')) + '</span><b>' + e(chosen.text) + '</b></div>' : '') +
        (!res.correct && right ? '<div class="qz-review-line is-right"><span>' + e(t('quizCorrectAnswer')) + '</span><b>' + e(right.text) + '</b></div>' : '') +
        (res.explanation ? '<div class="qz-review-exp">' + UI.icon('info', 13) + ' ' + e(res.explanation) + '</div>' : '') +
        '</div>';
    }).join('');
    var st = qStatusFor(currentKey);

    if (r.passed) {
      /* عند النجاح ١٠٠٪ لا نعرض زر المحاولات المتبقية ولا إعادة المحاولة */
      return '<div class="qz-result' + (r.passed ? ' is-pass' : ' is-fail') + '">' +
        '<span class="qz-result-emoji">' + '🎉' + '</span>' +
        '<div class="qz-result-score"><b>' + (r.score || 0) + '%</b><span>' + e(t('quizScoreLabel')) + '</span></div>' +
        '<h3>' + e(t('quizResultPass')) + '</h3>' +
        '<p class="qz-lead">' + e(t('quizResultSub', { correct: r.correct || 0, total: r.total || 0, pass: r.passScore || 0 })) + '</p>' +
        '<div class="qz-result-actions">' +
        '<button type="button" class="btn btn-primary" data-act="quiz-close">' + UI.icon('check-circle', 16) + ' ' + e(t('quizContinue')) + '</button>' +
        '</div>' +
        '</div>';
    }

    return '<div class="qz-result' + (r.passed ? ' is-pass' : ' is-fail') + '">' +
      '<span class="qz-result-emoji">' + (r.passed ? '🎉' : '🙈') + '</span>' +
      '<div class="qz-result-score"><b>' + (r.score || 0) + '%</b><span>' + e(t('quizScoreLabel')) + '</span></div>' +
      '<h3>' + e(r.passed ? t('quizResultPass') : t('quizResultFail')) + '</h3>' +
      '<p class="qz-lead">' + e(t('quizResultSub', { correct: r.correct || 0, total: r.total || 0, pass: r.passScore || 0 })) + '</p>' +
      (results.length ? '<div class="qz-review-list">' + rows + '</div>' : '') +
      '<div class="qz-result-actions">' +
      (st && st.remaining > 0
        ? '<button type="button" class="btn btn-primary" data-act="quiz-again">' + UI.icon('refresh-cw', 16) + ' ' + e(t('quizTryAgain')) + '</button>'
        : (st ? quizLockedMessage(st) : '<p class="qz-locked">' + e(t('quizNoAttempts')) + '</p>')) +
      '</div>' +
      '</div>';
  }

  function quizSectionHTML(ls) {
    /* درس اختبار داخل صفحة المعاينة العامة: عرض تعريفي + دعوة لعرض الدورة للمدرب */
    if (!serverProgress) {
      return '<div class="qz-intro">' +
        '<span class="qz-emoji">' + UI.icon('help-circle', 34) + '</span>' +
        '<h3>' + e(t('quizTitle')) + '</h3>' +
        '<p class="qz-lead">' + e(t('quizBrowseHint')) + '</p>' +
        '</div>';
    }
    if (!quizState || quizState.lessonId !== ls.id) {
      return htmlQuizIntro(ls);
    }
    if (quizState.view === 'loading') {
      return '<div class="qz-loading">' + UI.icon('refresh-cw', 26) + '<span>' + e(t('quizLoading')) + '</span></div>';
    }
    if (quizState.view === 'quiz') return htmlQuizForm();
    if (quizState.view === 'result') return htmlQuizResult();
    return '';
  }

  function projectCardHTML(pj, key) {
    if (!pj) return '';
    var links = pj.links || {};
    var tags = (pj.tags || []).map(function (tg) {
      return '<span class="pl-proj-tag">' + e(tg) + '</span>';
    }).join('');
    var meta = [];
    if (pj.role) meta.push(UI.icon('user', 13) + ' ' + e(pj.role));
    if (pj.category) meta.push(UI.icon('folder', 13) + ' ' + e(pj.category));
    var files = (pj.files || []).map(function (f) {
      return '<a class="pl-proj-file" href="' + e(f.url || f.dataUrl || '#') + '" target="_blank" rel="noopener">' +
        UI.icon('file-text', 14) + ' ' + e(f.name) + '</a>';
    }).join('');
    var actions = '';
    if (links.github) actions += '<a class="btn btn-ghost btn-sm" href="' + e(links.github) + '" target="_blank" rel="noopener">' + UI.icon('github', 15) + ' ' + e(t('source')) + '</a>';
    if (links.demo) actions += '<a class="btn btn-soft btn-sm" href="' + e(links.demo) + '" target="_blank" rel="noopener">' + UI.icon('external-link', 15) + ' ' + e(t('demo')) + '</a>';
    actions += '<button type="button" class="btn btn-primary btn-sm" data-act="open-project" data-url="' + e(SITE.u('project', pj.id)) + '"' + (key != null ? ' data-key="' + e(key) + '"' : '') + '>' + UI.icon('briefcase', 15) + ' ' + e(t('plProjectOpen')) + '</button>';

    return '<div class="pl-proj-card">' +
      (pj.cover ? '<div class="pl-proj-cover"><img src="' + e(pj.cover) + '" alt="' + e(pj.title) + '" loading="lazy" decoding="async"></div>' : '') +
      '<div class="pl-proj-head">' +
      '<span class="pl-proj-badge">' + UI.icon('briefcase', 14) + ' ' + e(t('plProjectType')) + '</span>' +
      '<h3 class="pl-proj-title">' + e(pj.title) + '</h3>' +
      (meta.length ? '<div class="pl-proj-meta">' + meta.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' : '') +
      '</div>' +
      (pj.summary ? '<p class="pl-proj-summary">' + e(pj.summary) + '</p>' : '') +
      (tags ? '<div class="pl-proj-tags">' + tags + '</div>' : '') +
      (pj.content ? '<div class="pl-proj-content prose">' + pj.content + '</div>' : '') +
      (files ? '<div class="pl-proj-files">' + files + '</div>' : '') +
      '<div class="pl-proj-actions">' + actions + '</div>' +
      '</div>';
  }

  /* مشغّل الفيديو: Plyr فوق يوتيوب (تضمين) أو ملف فيديو مباشر، مع بديل احتياطي */
  function videoHeroHTML(ls) {
    var url = UI.videoUrl(ls);
    var player = UI.playerHTML(url, { id: 'plMedia' });
    if (player) return '<div class="pl-video-player">' + player + '</div>';
    /* لا يوجد رابط تشغيل صالح: صورة غلاف مع شارة مدة */
    return '<div class="pl-video">' +
      '<img src="' + e(course.courseImage || course.image) + '" alt="' + e(course.title) + '" fetchpriority="high">' +
      '<button type="button" class="pl-video-btn" data-act="play" aria-label="' + e(t('play')) + '">' + UI.icon('play', 26) + '</button>' +
      '<span class="pl-video-badge">' + e(ls.duration || '') + '</span>' +
      '</div>';
  }

  function playerHTML() {
    var f = flat.find(function (x) { return x.key === currentKey; });
    if (!f) return '';
    var done = !trainerMode && !!progress[f.key];
    var idx = flat.indexOf(f);
    var prev = flat[idx - 1], next = flat[idx + 1];
    var ls = f.lesson;
    var isQuiz = ls.type === 'quiz';
    var isArticle = ls.type === 'article';
    var isProject = ls.type === 'project';

    var hero = isQuiz
      ? ''
      : (isArticle
        ? ''
        : (isProject
          ? '<div class="pl-hero pl-hero-project">' + UI.icon('briefcase', 28) + '<span>' + e(t('plProjectType')) + '</span></div>'
          : videoHeroHTML(ls)));

    var isLinkedProject = isProject && !!ls.project;

    var contentBlock = isQuiz
      ? '<div class="pl-quiz-host" id="plQuiz">' + quizSectionHTML(ls) + '</div>'
      : (isProject && ls.project
        ? projectCardHTML(ls.project, f.key)
        : (ls.content ? '<div class="pl-lesson-text prose">' + e(ls.content) + '</div>' : '<p class="pl-lesson-text">—</p>'));

    if (isProject && ls.project && ls.content && !isLinkedProject) {
      contentBlock = '<div class="pl-lesson-text prose">' + e(ls.content) + '</div>' + contentBlock;
    }

    /* درس مشروع مرتبط بمشروع المدرب: يُعرض اسم الدرس ووصفه مع المشروع بلا فيديو */
    if (isLinkedProject) {
      return '' +
        '<div class="pl-player-body">' +
        '<h2 class="pl-lesson-title">' + e(ls.title) + '</h2>' +
        (ls.content ? '<div class="pl-lesson-text prose">' + e(ls.content) + '</div>' : '') +
        contentBlock +
        '<div class="pl-actions">' +
        (done
          ? '<span class="pl-note is-pass">' + UI.icon('check-circle', 15) + ' ' + e(t('plProjectAdded')) + '</span>'
          : '<span class="pl-note">' + UI.icon('info', 15) + ' ' + e(t('plProjectHint')) + '</span>') +
        '<div class="pl-nav">' +
        '<button type="button" class="pl-btn pl-btn-ghost" data-act="prev"' + (prev ? '' : ' disabled') + '>' + UI.icon('chevron-right', 15) + ' ' + e(t('plPrev')) + '</button>' +
        '<button type="button" class="pl-btn pl-btn-ghost" data-act="next"' + (next ? '' : ' disabled') + '>' + e(t('plNext')) + ' ' + UI.icon('chevron-left', 15) + '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    }

    return '' +
      hero +
      '<div class="pl-player-body">' +
      '<div class="pl-kicker">' + e(f.sec.title) + ' · ' + e(t('plOf')) + ' ' + lessonsLabel(flat.length) + ' · ' + e(t('plContent')) + '</div>' +
      '<h2 class="pl-lesson-title">' + e(ls.title) + '</h2>' +
      '<div class="pl-lesson-meta">' +
      '<span>' + lessonIcon(ls.type) + ' ' + e(lessonMetaLabel(ls)) + '</span>' +
      (!isArticle && !isQuiz && !isProject && ls.duration ? '<span>' + UI.icon('clock', 13) + ' ' + e(ls.duration) + '</span>' : '') +
      '<span class="pl-num-chip">' + e(String(f.num)) + ' / ' + flat.length + '</span>' +
      '</div>' +
      contentBlock +
      '<div class="pl-actions">' +
      (isQuiz
        ? '<span class="pl-note">' + UI.icon('award', 15) + ' ' + e(t('plQuizNote')) + '</span>'
        : (isLinkedProject
          ? (done
            ? '<span class="pl-note is-pass">' + UI.icon('check-circle', 15) + ' ' + e(t('plProjectAdded')) + '</span>'
            : '<span class="pl-note">' + UI.icon('info', 15) + ' ' + e(t('plProjectHint')) + '</span>')
          : (trainerMode ? '' :
            '<button type="button" class="pl-btn ' + (done ? 'pl-btn-done' : 'pl-btn-primary') + '" data-act="done">' +
            UI.icon(done ? 'check-circle' : 'check', 16) + ' ' + e(done ? t('plDone') : t('plMark')) +
            '</button>'))) +
      (isProject && !isLinkedProject && (done || projectFlag[f.key]) ? '<span class="pl-note is-pass">' + UI.icon('briefcase', 15) + ' ' + e(t('plProjectAdded')) + '</span>' : '') +
      '<div class="pl-nav">' +
      '<button type="button" class="pl-btn pl-btn-ghost" data-act="prev"' + (prev ? '' : ' disabled') + '>' + UI.icon('chevron-right', 15) + ' ' + e(t('plPrev')) + '</button>' +
      '<button type="button" class="pl-btn pl-btn-ghost" data-act="next"' + (next ? '' : ' disabled') + '>' + e(t('plNext')) + ' ' + UI.icon('chevron-left', 15) + '</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  function sideHTML() {
    var secs = syllabus.map(function (sec, si) {
      var items = (sec.lessons || []).map(function (ls, li) {
        var key = 's' + si + 'l' + li;
        var done = !trainerMode && !!progress[key];
        var active = key === currentKey;
        return '' +
          '<li><button type="button" class="pl-lesson' + (active ? ' is-active' : '') + (done ? ' is-done' : '') + '" data-act="lesson" data-key="' + key + '">' +
          '<span class="pl-lnum">' + (done ? UI.icon('check', 13) : lessonIcon(ls.type)) + '</span>' +
          '<span class="pl-lmain">' +
          '<span class="pl-ltitle">' + e(ls.title) + '</span>' +
          '<span class="pl-lmeta">' + lessonIcon(ls.type) + ' ' + e(lessonMetaLabel(ls)) +
          (ls.free ? ' <span class="pl-free">' + e(t('plFree')) + '</span>' : '') + '</span>' +
          '</span>' +
          (trainerMode
            ? ''
            : ((ls.type === 'project' && ls.project)
              ? (done ? '<span class="pl-ldone is-on" aria-hidden="true">' + UI.icon('check-circle', 17) + '</span>' : '')
              : '<span class="pl-ldone" data-act="toggle" data-key="' + key + '" role="checkbox" aria-checked="' + (done ? 'true' : 'false') + '" aria-label="' + e(t('plDone')) + '">' +
                UI.icon('check-circle', 17) + '</span>')) +
          '</button></li>';
      }).join('');

      var d = secDuration(sec);
      var isOpen = si === openedSectionIndex;
      var isComplete = sectionIsDone(si);
      return '' +
        '<section class="pl-sec">' +
        '<button type="button" class="pl-sec-head' + (isOpen ? '' : ' collapsed') + (isComplete ? ' is-complete' : '') +
          '" data-act="sec" data-si="' + si + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
        UI.icon('chevron-down', 16) +
        '<span class="pl-sec-main"><b>' + e(sec.title) + '</b>' +
        '<span>' + lessonsLabel(secLessons(sec)) + (d ? ' · ' + e(fmtTotal(d)) : '') + '</span></span>' +
        '<span class="pl-sec-complete" aria-label="' + e(t('plSectionComplete')) + '"' + (isComplete ? '' : ' hidden') + '>' +
          UI.icon('check-circle', 17) + '</span>' +
        '</button>' +
        '<ul class="pl-sec-list' + (isOpen ? '' : ' collapsed') + '">' + items + '</ul>' +
        '</section>';
    }).join('');

    return '' +
      '<div class="pl-list-card">' +
      '<div class="pl-list-head">' +
      '<h3>' + UI.icon('list', 17) + ' ' + e(t('plTitle')) + '</h3>' +
      '<span class="pl-list-count">' + lessonsLabel(flat.length) + '</span>' +
      '</div>' +
      (trainerMode ? '' :
        '<div class="pl-list-progress">' +
        '<div class="pl-bar"><span style="width:' + pct() + '%"></span></div>' +
        '<span class="pl-list-pct">' + pct() + '%</span>' +
        '</div>') +
      secs +
      '</div>';
  }

  function topHTML() {
    var total = syllabus.reduce(function (s, sec) { return s + secDuration(sec); }, 0);
    var meta = [lessonsLabel(flat.length), sectionsLabel(syllabus.length)];
    if (total) meta.push(fmtTotal(total));
    return '' +
      '<div class="pl-top">' +
      '<a class="pl-back" href="' + courseBackHref() + '">' + UI.icon(document.documentElement.dir === 'rtl' ? 'arrow-right' : 'arrow-left', 15) + ' ' + e(t('plBack')) + '</a>' +
      '<div class="pl-top-row">' +
      '<div class="pl-top-info">' +
      '<h1 class="pl-title">' + e(course.title) + '</h1>' +
      '<div class="pl-meta">' + e(course.category || '') + (course.category ? ' · ' : '') + e(meta.join(' · ')) + '</div>' +
      '</div>' +
      (trainerMode ? '' :
        '<div class="pl-progress-box">' +
        '<div class="pl-progress-label">' + e(t('plProgress')) + ' <b>' + pct() + '%</b> · ' + doneCount() + ' ' + e(t('plOf')) + ' ' + flat.length + '</div>' +
        '<div class="pl-bar"><span style="width:' + pct() + '%"></span></div>' +
        certBtnHTML() +
        '</div>') +
      '</div>' +
      '</div>';
  }

  function render() {
    var host = document.getElementById('plHost');
    if (!host) return;

    if (!course) {
      host.innerHTML = '<div class="pl-empty-card">' + UI.icon('search', 34) +
        '<h3>' + e(t('plEmpty')) + '</h3><p>' + e(t('plEmptySub')) + '</p>' +
        '<a class="btn btn-primary" href="' + SITE.u('courses') + '">' + e(t('ucCourses')) + '</a></div>';
      return;
    }

    document.title = course.title + ' — ' + t('plTitle');

    if (!flat.length) {
      host.innerHTML = topHTML() +
        '<div class="pl-empty-card">' + UI.icon('list', 34) +
        '<h3>' + e(t('plEmpty')) + '</h3><p>' + e(t('plEmptySub')) + '</p>' +
        '<a class="btn btn-primary" href="' + courseBackHref() + '">' + e(t('plBack')) + '</a></div>';
      return;
    }

    host.innerHTML =
      topHTML() +
      '<div class="pl-grid">' +
      '<div class="pl-main"><div class="pl-player" id="plPlayer">' + playerHTML() + '</div></div>' +
      '<aside class="pl-side">' + sideHTML() + '</aside>' +
      '</div>';
    mountMedia();
    syncQuizCooldownTimer();
  }

  /* تهيئة Plyr على عنصر الفيديو الظاهر حالياً (يوتيوب أو ملف مباشر) */
  function mountMedia() {
    try {
      var host = document.getElementById('plMedia');
      if (!host || !window.Plyr) return;
      if (activePlyr) {
        try { activePlyr.destroy(); } catch (err) { /* ignore */ }
        activePlyr = null;
      }
      var f = flat.find(function (x) { return x.key === currentKey; });
      var ls = f ? f.lesson : null;
      activePlyr = UI.mountPlyr(host);
      if (!activePlyr) return;
      /* ملء مدة الدرس تلقائياً إن كانت فارغة */
      activePlyr.on('loadedmetadata', function () {
        if (ls && !ls.duration && activePlyr.duration) {
          ls.duration = clock(activePlyr.duration);
        }
      });
    } catch (err) {
      if (window.console && console.error) console.error('[playlist] mountMedia error:', err);
    }
  }

  function clock(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function renderPlayer() {
    try {
      var p = document.getElementById('plPlayer');
      if (p) p.innerHTML = playerHTML();
      mountMedia();
      document.querySelectorAll('.pl-lesson').forEach(function (b) {
        var k = b.getAttribute('data-key');
        b.classList.toggle('is-active', k === currentKey);
        var done = !trainerMode && !!progress[k];
        b.classList.toggle('is-done', done);
        var chk = b.querySelector('.pl-ldone');
        if (chk) chk.setAttribute('aria-checked', done ? 'true' : 'false');
        var num = b.querySelector('.pl-lnum');
        if (num) {
          var f = flat.find(function (x) { return x.key === k; });
          num.innerHTML = done ? UI.icon('check', 13) : lessonIcon(f ? f.lesson.type : 'video');
        }
      });
      syncSections();
      var q = pct();
      document.querySelectorAll('.pl-progress-box .pl-bar span, .pl-list-progress .pl-bar span').forEach(function (s) {
        s.style.width = q + '%';
      });
      var lbl = document.querySelector('.pl-progress-label');
      if (lbl) lbl.innerHTML = e(t('plProgress')) + ' <b>' + q + '%</b> · ' + doneCount() + ' ' + e(t('plOf')) + ' ' + flat.length;
      var lp = document.querySelector('.pl-list-pct');
      if (lp) lp.textContent = q + '%';
      syncCertBtn();
    } catch (err) {
      if (window.console && console.error) console.error('[playlist] renderPlayer error:', err);
    }
  }

  function syncURL() {
    try {
      var u = new URL(location.href);
      u.searchParams.set('id', courseId);
      if (from) u.searchParams.set('from', from);
      u.searchParams.set('l', currentKey);
      history.replaceState(null, '', u.pathname + u.search);
    } catch (err) { /* ignore */ }
  }

  function selectLesson(key, scroll) {
    if (!flat.some(function (x) { return x.key === key; })) return;
    currentKey = key;
    var selected = flat.find(function (x) { return x.key === key; });
    if (selected) openedSectionIndex = selected.si;
    if (quizState && quizState.lessonId !== idOf(key)) quizState = null;
    syncURL();
    renderPlayer();
    if (window.PlaylistUI) PlaylistUI.refreshSheet();
    if (scroll && window.innerWidth <= 991) {
      var p = document.getElementById('plPlayer');
      if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function celebrate() {
    if (trainerMode || completeFlag) return;
    completeFlag = true;
    progress._complete = 1;
    saveProgress();
    render(); /* يُظهر شارة الشهادة في صندوق التقدّم */

    var onServer = !!serverProgress;
    UI.toast(t(onServer ? 'plCertCreated' : 'plAllDone'), 'success');

    var m = UI.modal({
      title: t('plCongratsTitle'),
      size: 'sm',
      body: '<div class="pl-congrats">' +
        '<span class="pl-congrats-emoji">🎓</span>' +
        '<p class="pl-congrats-text">' + e(t(onServer ? 'plCongratsBody' : 'plCongratsBodyLocal', { course: course ? course.title : '' })) + '</p>' +
        '</div>',
      footer: '<button type="button" class="btn btn-ghost" data-congrats="close">' + e(t('plCongratsClose')) + '</button>' +
        '<a class="btn btn-primary" href="' + (onServer ? certUrl() : courseBackHref()) + '">' +
        UI.icon('award', 16) + ' ' + e(t(onServer ? 'plCongratsCta' : 'plCongratsCtaCourse')) + '</a>'
    });
    m.el.querySelectorAll('[data-congrats]').forEach(function (b) {
      b.addEventListener('click', function () { m.close(); });
    });
  }

  function markLessonDone(key) {
    if (trainerMode || progress[key]) return;
    progress[key] = 1;
    saveProgress();
    renderPlayer();
    if (window.PlaylistUI) PlaylistUI.refreshSheet();
    UI.toast(t('plDone'), 'success');
  }

  function quizRender() {
    var host = document.getElementById('plQuiz');
    if (!host) return;
    var f = flat.find(function (x) { return x.key === currentKey; });
    if (f) host.innerHTML = quizSectionHTML(f.lesson);
    syncQuizCooldownTimer();
  }

  function syncQuizCooldownTimer() {
    if (quizCooldownTimer) {
      window.clearInterval(quizCooldownTimer);
      quizCooldownTimer = null;
    }
    var st = qStatusFor(currentKey);
    if (!st || !st.retryAt || st.remaining > 0) return;

    function updateCountdown() {
      var seconds = Math.ceil((Date.parse(st.retryAt) - Date.now()) / 1000);
      if (seconds <= 0) {
        st.remaining = st.max || 3;
        st.attempts = 0;
        st.retryAt = null;
        quizStatus[String(idOf(currentKey))] = st;
        window.clearInterval(quizCooldownTimer);
        quizCooldownTimer = null;
        quizRender();
        return;
      }
      var element = document.querySelector('#plQuiz [data-quiz-countdown]');
      if (element) element.textContent = formatQuizCountdown(st.retryAt);
    }

    updateCountdown();
    if (st.retryAt) quizCooldownTimer = window.setInterval(updateCountdown, 1000);
  }

  function quizFetch(which, body) {
    return fetch(SITE.u(which === 'start' ? 'courseQuizStart' : 'courseQuizSubmit'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); });
  }

  function startQuiz() {
    var lessonId = idOf(currentKey);
    if (lessonId == null) return;
    quizState = { lessonId: lessonId, view: 'loading', payload: null, answers: {}, currentId: null, result: null };
    quizRender();
    quizFetch('start', { id: courseId, lesson: lessonId }).then(function (res) {
      if (!res || !res.ok) {
        if (res && res.error === 'no_attempts' && res.retryAt) {
          var lockedStatus = quizStatus[String(lessonId)] || {};
          lockedStatus.max = lockedStatus.max || 3;
          lockedStatus.remaining = 0;
          lockedStatus.retryAt = res.retryAt;
          quizStatus[String(lessonId)] = lockedStatus;
        }
        UI.toast(t((res && res.error === 'no_attempts') ? 'quizNoAttempts' : 'required'), 'error');
        quizState = null;
        quizRender();
        return;
      }
      quizState.payload = res;
      quizState.answers = {};
      quizState.currentId = res.questions.length ? res.questions[0].id : null;
      quizState.view = 'quiz';
      quizState.result = null;
      quizRender();
      syncQuizStatusFromPayload(res);
    }).catch(function () {
      quizState = null;
      quizRender();
      UI.toast(t('required'), 'error');
    });
  }

  function syncQuizStatusFromPayload(res) {
    var lessonId = idOf(currentKey);
    if (lessonId == null) return;
    var st = quizStatus[String(lessonId)] || { attempts: 0, best: 0, passed: false, max: res.maxAttempts };
    st.max = res.maxAttempts;
    st.remaining = res.attemptsLeft;
    st.retryAt = res.retryAt || null;
    quizStatus[String(lessonId)] = st;
  }

  function submitQuiz() {
    if (!quizState || quizState.view !== 'quiz') return;
    var payload = { id: courseId, lesson: quizState.lessonId, answers: quizState.answers };
    quizState.view = 'loading';
    quizRender();
    quizFetch('submit', payload).then(function (res) {
      if (!res || !res.ok) {
        quizState.view = 'result';
        quizState.result = { passed: false, score: 0, correct: 0, total: 0, passScore: 0, error: true };
        quizRender();
        return;
      }
      quizState.result = res;
      quizState.view = 'result';
      quizStatus[String(quizState.lessonId)] = {
        attempts: (quizStatus[String(quizState.lessonId)] || {}).attempts != null
          ? (quizStatus[String(quizState.lessonId)].attempts + 1) : 1,
        best: Math.max(res.score || 0, (quizStatus[String(quizState.lessonId)] || {}).best || 0),
        passed: !!res.passed,
        max: res.maxAttempts,
        remaining: res.attemptsLeft,
        retryAt: res.retryAt || null
      };
      quizRender();
      if (res.passed) {
        var pkey2 = currentKey;
        markLessonDone(pkey2);
        /* يضمن حفظ الدرس كـمكتمل عند نجاح الاختبار بغض النظر عن حالة التقدم */
        if (serverProgress && typeof serverProgress.done !== 'undefined') {
          var pid2 = idOf(pkey2);
          if (pid2 != null && serverProgress.done.indexOf(pid2) === -1) serverProgress.done.push(pid2);
        }
        if (res.newlyCompleted) celebrate();
        else if (res.complete) { completeFlag = true; syncCertBtn(); }
        UI.toast(t('quizPassedToast'), 'success');
      } else {
        UI.toast(t('quizFailToast'), 'info');
      }
    }).catch(function () {
      quizState.view = 'quiz';
      quizRender();
      UI.toast(t('required'), 'error');
    });
  }

  /* ---------- تنبيه مغادرة الاختبار الجاري ---------- */

  /* true عندما يكون الطالب داخل محاولة اختبار جارية (يحلّ الأسئلة فعلاً) */
  function quizInProgress() {
    return !!(quizState && quizState.view === 'quiz' && quizState.lessonId === idOf(currentKey));
  }

  /* يعرض تأكيداً؛ ويُكمل عبر onOk إذا وافق الطالب على المغادرة. */
  function confirmLeaveQuiz(onOk) {
    UI.confirm(t('quizLeaveConfirm')).then(function (ok) {
      if (ok) {
        quizState = null;
        onOk && onOk();
      }
    });
  }

  /* اعتراض روابط/أزرار التنقّل داخل الصفحة أثناء محاولة جارية */
  function handleLeaveClick(ev) {
    if (!quizInProgress()) return;
    if (ev.target.closest('.qz-choices, .qz-nav, .qz-dots, .qz-start, .qz-result')) return;
    var link = ev.target.closest('a[href]');
    var navBtn = ev.target.closest('[data-act="lesson"], [data-act="prev"], [data-act="next"], [data-pl-key]');
    if (!link && !navBtn) return;
    /* تجاهل الروابط التي تفتح في تبويب جديد أو روابط خارجية داخل الكويز نفسه */
    if (link && (link.target === '_blank' || link.getAttribute('href').indexOf('#') === 0)) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    confirmLeaveQuiz(function () {
      if (link) window.location.href = link.href;
      else if (navBtn) navBtn.click();
    });
  }

  document.addEventListener('click', handleLeaveClick, true);

  window.addEventListener('beforeunload', function (ev) {
    if (!quizInProgress()) return;
    ev.preventDefault();
    ev.returnValue = t('quizLeaveConfirm');
    return ev.returnValue;
  });

  function pushProgress(lessonId, done, key) {
    fetch(SITE.u('courseProgress'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
      body: JSON.stringify({ id: courseId, lesson: lessonId, done: done })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) return;
        if (res.newlyCompleted) celebrate();
        else if (res.complete) { completeFlag = true; syncCertBtn(); }
        if (res.projectCreated) UI.toast(t('plProjectAdded'), 'success');
        if (res.project) {
          var flagKey = key != null ? key : idOf(currentKey);
          if (flagKey != null) {
            projectFlag[flagKey] = true;
            if (flagKey === currentKey) renderPlayer();
          }
        }
      })
      .catch(function () { /* تعذّر الاتصال — يبقى التقدّم محفوظاً محلياً */ });
  }

  function toggleDone(key) {
    if (trainerMode) return;
    var f = flat.find(function (x) { return x.key === key; });
    /* الإكمال اتجاه واحد: الدرس المكتمل لا يُلغى بالضغط مرة أخرى */
    if (progress[key]) return;
    if (f && f.lesson && f.lesson.type === 'quiz') {
      UI.toast(t('plQuizNote'), 'info');
      return;
    }
    progress[key] = 1;
    saveProgress();
    renderPlayer();
    if (window.PlaylistUI) PlaylistUI.refreshSheet();

    var lessonId = f && f.lesson ? f.lesson.id : null;

    if (serverProgress && lessonId != null) {
      pushProgress(lessonId, true);
    } else if (flat.length && doneCount() === flat.length) {
      celebrate();
    }
    UI.toast(t('plDone'), 'success');
  }

  /* ---------- محتوى ورقة التاب بار (تستدعيها site-chrome) ---------- */

  function sheetItems() {
    if (!flat.length) return '<div class="csi-empty">لا توجد دروس حالياً</div>';
    return flat.map(function (f) {
      var done = !trainerMode && !!progress[f.key];
      var active = f.key === currentKey;
      var ls = f.lesson;
      return '' +
        '<button type="button" class="course-sheet-item csi-lesson' + (active ? ' is-active' : '') + (done ? ' is-done' : '') + '" data-pl-key="' + f.key + '">' +
        '<span class="csi-lnum">' + (done ? UI.icon('check', 13) : e(String(f.num))) + '</span>' +
        '<div class="csi-main">' +
        '<div class="csi-title">' + e(ls.title) + '</div>' +
        '<div class="csi-sub"><span>' + lessonIcon(ls.type) + ' ' + e(lessonMetaLabel(ls)) + '</span>' +
        (ls.free ? '<span>' + e(t('plFree')) + '</span>' : '') + '</div>' +
        '</div>' +
        (active ? '<span class="csi-chev">' + UI.icon('play', 16) + '</span>' : '') +
        '</button>';
    }).join('');
  }

  window.PlaylistUI = {
    sheetTitle: function () { return course ? course.title : 'قائمة الدروس'; },
    sheetItems: sheetItems,
    refreshSheet: function () {
      if (window.SiteChrome && SiteChrome.refreshSheet) SiteChrome.refreshSheet();
    }
  };

  /* ---------- الأحداث ---------- */

  document.addEventListener('click', function (ev) {
    var sheetItem = ev.target.closest('[data-pl-key]');
    if (sheetItem) {
      selectLesson(sheetItem.getAttribute('data-pl-key'), true);
      return;
    }
    var el = ev.target.closest('[data-act]');
    if (!el || !document.getElementById('plHost').contains(el)) return;
    var act = el.getAttribute('data-act');

    if (act === 'sec') {
      var sectionIndex = parseInt(el.getAttribute('data-si'), 10);
      openedSectionIndex = openedSectionIndex === sectionIndex ? -1 : sectionIndex;
      syncSections();
      if (openedSectionIndex === sectionIndex) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (act === 'toggle') {
      ev.stopPropagation();
      toggleDone(el.getAttribute('data-key'));
      return;
    }
    if (act === 'lesson') {
      selectLesson(el.getAttribute('data-key'), true);
      return;
    }
    if (act === 'done') {
      toggleDone(currentKey);
      return;
    }
    if (act === 'open-project') {
      var url = el.getAttribute('data-url');
      var pkey = el.getAttribute('data-key') || currentKey;
      var pf = flat.find(function (x) { return x.key === pkey; });
      if (!trainerMode && pf && !progress[pkey]) {
        progress[pkey] = 1;
        saveProgress();
        renderPlayer();
        if (window.PlaylistUI) PlaylistUI.refreshSheet();
        var pid = pf.lesson ? pf.lesson.id : null;
        if (serverProgress && pid != null) pushProgress(pid, true, pkey);
      }
      if (url) window.open(url, '_blank');
      return;
    }
    if (act === 'prev' || act === 'next') {
      var i = flat.findIndex(function (x) { return x.key === currentKey; });
      var target = act === 'prev' ? flat[i - 1] : flat[i + 1];
      if (target) selectLesson(target.key, true);
      return;
    }
    if (act === 'play') {
      UI.toast(t('plVideoNa'));
      return;
    }

    /* ---------- أحداث الكويز ---------- */
    if (act === 'quiz-start' || act === 'quiz-again') {
      if (act === 'quiz-again') quizState = null;
      startQuiz();
      return;
    }
    if (!quizState) return;
    if (act === 'quiz-choose') {
      quizState.answers[quizState.currentId] = +el.getAttribute('data-choice');
      quizRender();
      return;
    }
    if (act === 'quiz-prev' || act === 'quiz-next') {
      var idxQ = quizState.payload.questions.map(function (q) { return q.id; }).indexOf(quizState.currentId);
      var nq = quizState.payload.questions[idxQ + (act === 'quiz-prev' ? -1 : 1)];
      if (nq) { quizState.currentId = nq.id; quizRender(); }
      return;
    }
    if (act === 'quiz-goto') {
      var gq = quizState.payload.questions[+el.getAttribute('data-index')];
      if (gq) { quizState.currentId = gq.id; quizRender(); }
      return;
    }
    if (act === 'quiz-submit') {
      submitQuiz();
      return;
    }
    if (act === 'quiz-close') {
      quizState = null;
      renderPlayer();
    }
  });

  /* ---------- الإقلاع ---------- */

  var trainerData = document.getElementById('course-trainer-data');
  if (trainerData) {
    try { trainerMode = JSON.parse(trainerData.textContent) === true; } catch (err) { trainerMode = false; }
  }
  course = Store.find('certificates', courseId) || null;
  if (course) {
    /* المعايدة إلى المعرّف الرسمي (slug) حتى تكون الروابط ومفاتيح التخزين موحّدة */
    courseId = course.id || courseId;
    syllabus = course.syllabus || [];
    flatten();
    progress = trainerMode ? {} : loadProgress();
    serverProgress = trainerMode ? null : readServerProgress();
    quizStatus = readQuizStatus() || {};
    if (serverProgress) {
      (serverProgress.done || []).forEach(function (id) {
        var k = idKeyMap[String(id)];
        if (k) progress[k] = 1;
      });
      completeFlag = !!serverProgress.complete;
      saveProgress();
    } else if (progress._complete) {
      completeFlag = true;
    }
    var wanted = params.get('l');
    var firstOpen = flat.find(function (x) { return !progress[x.key]; }) || flat[flat.length - 1];
    currentKey = (wanted && flat.some(function (x) { return x.key === wanted; }) ? wanted : (firstOpen ? firstOpen.key : ''));
    var activeLesson = flat.find(function (x) { return x.key === currentKey; });
    openedSectionIndex = activeLesson ? activeLesson.si : 0;
  }
  SiteChrome.mount();
  render();
  PlaylistUI.refreshSheet();
})();
