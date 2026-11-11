(function () {
  'use strict';

  var page = document.body.getAttribute('data-page');
  var activeAdminEditorId = '';
  var activeAdminCourseType = '';
  var activeAdminCourseKind = '';
  var activeWorkshopEditor = false;
  function replaceCourseText(value) {
    var text = String(value == null ? '' : value);
    if (!activeWorkshopEditor) return text;
    return text
      .replace(/\bcourses?\b/gi, function (match) {
        var replacement = match.toLowerCase() === 'courses' ? 'workshops' : 'workshop';
        if (match === match.toUpperCase()) return replacement.toUpperCase();
        if (match.charAt(0) === match.charAt(0).toUpperCase()) {
          return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement;
      })
      .replace(/الدورات/g, 'الورشات')
      .replace(/الدورة/g, 'الورشة')
      .replace(/دورات/g, 'ورشات')
      .replace(/دورة/g, 'ورشة')
      .replace(/دوريتك/g, 'ورشتك');
  }
  function t(k, params) { return replaceCourseText(I18n.t(k, params)); }
  function e(s) { return UI.esc(s); }
  function durationHours(value, fallback) {
    var raw = String(value || fallback || '')
      .replace(/[٠-٩]/g, function (digit) { return String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)); })
      .replace(/[۰-۹]/g, function (digit) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)); });
    var match = raw.match(/\d+(?:[.,]\d+)?/);
    return match ? match[0].replace(',', '.') : '';
  }

  function csrfToken() {
    if (window.CSRF_TOKEN) return window.CSRF_TOKEN;
    var m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }
  var editorCsrf = csrfToken;

  var PROJECT_IDEAS = [
    'اشرح المشكلة التي حلها مشروعك في جملة واحدة، ثم اعرض الحل قبل التفاصيل التقنية.',
    'أضف قسم «التحديات» — المشاريع التي تعرض صعوباتها تبني ثقة أكبر من المثاليات.',
    'اربط كل مهارة من مهاراتك بكيفية استخدمتها فعلياً داخل هذا المشروع.',
    'أضف أرقاماً: كم مستخدم؟ كم وقتاً وفّرت؟ كم ملفاً؟ الأرقام تُقنع أكثر من الصفات.',
    'اذكر شيئاً أعدت تصميمه أو غيّرته بعد ملاحظة — يُظهر نضجك التقني.',
    'أضف اقتباساً قصيراً من مراجع أو مستخدمين جرّبوا مشروعك.',
    'صوّر «قبل وبعد»: كيف كان العمل قبل هذه الأداة وبعدها؟',
    'اسأل نفسك: ما القرار التقني الذي ستغيّره لو عاد بك الزمن؟ واكتب الجواب.',
    'وثّق حجم المشروع: عدد الملفات، عدد الصفحات، مدة التنفيذ — التفاصيل تصنع الفرق.',
    'اختم بدعوة واضحة: وين يقدر المتابع يجرّب مشروعك أو يساهم فيه؟'
  ];

  var DAILY_IDEAS = [
    'ما أصعب مفهوم تعلّمتها هذا الأسبوع؟ اشرحه بأسلوب بسيط كأنك تشرحه لصديق.',
    'شارك لقطة من مساحة عملك اليوم: مكتب، سبورة، أو شاشة الكود.',
    'ماذا قال مراجع مشروعك عن عملك؟ اقتباس صغير يبني مصداقية كبيرة.',
    'خطأ ارتكبته اليوم وماذا تعلّمت منه — الصدق يجلب تفاعلاً أكثر من الكمال.',
    'أي عادة صغيرة ساعدتك على إنجاز أكثر هذا الأسبوع؟',
    'أداة أو تاق اكتشفته اليوم لأول مرة — شاركه قد يفيد غيرك.',
    'أنهيت اليوم …… أكمل الجملة وشارك إنجازك ولو بدا صغيراً.',
    'سؤال تقني تبحث عن إجابته؟ اكتبه هنا قد يجيب عنه متابعوك.',
    'قارن توقعاتك للدورة/التدريب مع واقعه — ماذا تفوق وماذا خاب؟',
    'شارك مقطعاً من دفتر ملاحظاتك أو ملخص قصير تكتبه بخط اليد.'
  ];

  var TEMPLATES = [
    {
      icon: 'layers', label: 'عرض المشروع',
      labelEn: 'Project overview',
      html: '<h2>نبذة عن المشروع</h2><p>ما المشروع؟ وما فكرته أو مجاله؟</p>' +
        '<h2>الهدف</h2><p>ما الحاجة أو الهدف الذي يسعى المشروع إلى تلبيته؟</p>' +
        '<h2>الفئة المستفيدة</h2><p>من سيستفيد من هذا المشروع؟</p>' +
        '<h2>طريقة العمل</h2><p>اشرح الخطوات أو الأنشطة الرئيسية في تنفيذه.</p>' +
        '<h2>النتائج والأثر</h2><p>ما الذي تحقق؟ اذكر نتائج أو مؤشرات ملموسة إن توفرت.</p>'
    },
    {
      icon: 'sparkles', label: 'دراسة حالة',
      labelEn: 'Case study',
      html: '<h2>الخلفية والسياق</h2><p>ما الظروف أو الاحتياج الذي أدى إلى بدء المشروع؟</p>' +
        '<h2>التحدي</h2><p>ما أبرز التحديات أو القيود؟</p>' +
        '<h2>النهج المتبع</h2><p>كيف درست الخيارات واخترت طريقة التنفيذ؟</p>' +
        '<h2>التنفيذ</h2><p>صف مراحل العمل والقرارات المهمة.</p>' +
        '<h2>النتائج والدروس المستفادة</h2><p>ما النتائج؟ وما الذي تعلمته؟</p>'
    },
    {
      icon: 'briefcase', label: 'خطة ومراحل المشروع',
      labelEn: 'Project plan and stages',
      html: '<h2>الرؤية والأهداف</h2><p>ما الرؤية والنتائج التي تريد الوصول إليها؟</p>' +
        '<h2>المراحل الرئيسية</h2><ol><li>المرحلة الأولى: ……</li><li>المرحلة الثانية: ……</li><li>المرحلة الثالثة: ……</li></ol>' +
        '<h2>الموارد والشركاء</h2><p>ما الموارد أو الخبرات أو الجهات المشاركة؟</p>' +
        '<h2>قياس النجاح</h2><p>كيف ستقيّم تقدم المشروع وأثره؟</p>'
    }
  ];

  var COURSE_TEMPLATES = [
    {
      icon: 'file-text',
      label: 'وصف تعريفي للدورة',
      labelEn: 'Course overview',
      html: '<h2>نبذة عن الدورة</h2><p>اكتب وصفاً موجزاً يوضح موضوع الدورة وأهميتها.</p>' +
        '<h2>ماذا ستتعلم؟</h2><ul><li>المهارة أو المفهوم الأول</li><li>المهارة أو المفهوم الثاني</li></ul>' +
        '<h2>لمن هذه الدورة؟</h2><p>حدد الفئة المناسبة ومستواها.</p>' +
        '<h2>المتطلبات السابقة</h2><p>اذكر المعارف أو الأدوات التي يحتاجها المتدرب.</p>'
    },
    {
      icon: 'award',
      label: 'مخرجات التعلم',
      labelEn: 'Learning outcomes',
      html: '<h2>أهداف الدورة</h2><p>بنهاية الدورة سيكون المتدرب قادراً على:</p>' +
        '<ul><li>تطبيق …</li><li>إنشاء …</li><li>تحليل …</li></ul>' +
        '<h2>المشروع التطبيقي</h2><p>صف المشروع أو التطبيق العملي الذي سينفذه المتدرب.</p>'
    },
    {
      icon: 'list',
      label: 'خطة ومحتوى الدورة',
      labelEn: 'Course outline',
      html: '<h2>محاور الدورة</h2><ol><li><b>المحور الأول:</b> الموضوعات والمهارات.</li>' +
        '<li><b>المحور الثاني:</b> الموضوعات والمهارات.</li><li><b>المحور الثالث:</b> التطبيق العملي.</li></ol>' +
        '<h2>طريقة التدريب</h2><p>اشرح أسلوب الشرح والتطبيق والواجبات أو التقييم.</p>'
    }
  ];

  var HASHTAG_SUGGEST = ['تطوير', 'تعلم', 'برمجة', 'تصميم', 'مشروع', 'تدريب', 'إنجاز', 'تحدي', 'React', 'JavaScript', 'Python', 'Figma', 'UX', 'Git'];

  /* ---------- shared editor pieces ---------- */

  function insertHTML(html) {
    if (document.execCommand('insertHTML', false, html)) return true;
    var selection = document.getSelection();
    var range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
    var activeEditable = range && range.startContainer.parentElement
      ? range.startContainer.parentElement.closest('.editable')
      : null;
    if (!range || !activeEditable) {
      activeEditable = document.activeElement && document.activeElement.closest
        ? document.activeElement.closest('.editable')
        : null;
      if (!activeEditable) return false;
      range = document.createRange();
      range.selectNodeContents(activeEditable);
      range.collapse(false);
    }
    range.deleteContents();
    var fragment = range.createContextualFragment(html);
    var lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return true;
  }

  function executeEditorCommand(command, value) {
    if (!document.execCommand(command, false, value || null)) {
      throw new Error('Editor command was not applied: ' + command);
    }
  }

  function initToolbar(toolbar, editable, onChange) {
    var defs = [
      { cmd: 'undo', icon: 'undo-2', title: 'editorUndo' },
      { cmd: 'redo', icon: 'redo-2', title: 'editorRedo' },
      { sep: true },
      { cmd: 'bold', icon: 'bold', title: 'editorBold' },
      { cmd: 'italic', icon: 'italic', title: 'editorItalic' },
      { cmd: 'h2', icon: 'heading', title: 'editorHeading' },
      { sep: true },
      { cmd: 'insertUnorderedList', icon: 'list', title: 'editorBulletedList' },
      { cmd: 'insertOrderedList', icon: 'list-ordered', title: 'editorNumberedList' },
      { cmd: 'quote', icon: 'quote', title: 'editorQuote' },
      { cmd: 'code', icon: 'code', title: 'editorCode' },
      { sep: true },
      { cmd: 'link', icon: 'link', title: 'editorLink' },
      { cmd: 'image', icon: 'image', title: 'editorImage' },
      { cmd: 'removeFormat', icon: 'x', title: 'editorRemoveFormatting' }
    ];
    toolbar.innerHTML = defs.map(function (d) {
      if (d.sep) return '<span class="tb-sep"></span>';
      return '<button type="button" class="tb-btn" data-cmd="' + d.cmd + '" title="' +
        e(t(d.title)) + '" aria-label="' + e(t(d.title)) + '">' + UI.icon(d.icon, 16) + '</button>';
    }).join('');

    var history = [editable.innerHTML];
    var historyIndex = 0;
    var historyTimer = null;
    var savedRange = null;

    function updateHistoryButtons() {
      var undoButton = toolbar.querySelector('[data-cmd="undo"]');
      var redoButton = toolbar.querySelector('[data-cmd="redo"]');
      var hasUncommittedChange = editable.innerHTML !== history[historyIndex];
      if (undoButton) {
        undoButton.disabled = historyIndex <= 0 && !hasUncommittedChange;
      }
      if (redoButton) {
        redoButton.disabled = hasUncommittedChange || historyIndex >= history.length - 1;
      }
    }

    function saveSelection() {
      var selection = document.getSelection();
      if (!selection || !selection.rangeCount ||
        !editable.contains(selection.anchorNode) || !editable.contains(selection.focusNode)) {
        return null;
      }
      return selection.getRangeAt(0).cloneRange();
    }

    function restoreSelection(range) {
      editable.focus();
      if (!range) return;
      var selection = document.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(range);
    }

    function pushHistory() {
      clearTimeout(historyTimer);
      historyTimer = null;
      var current = editable.innerHTML;
      if (current === history[historyIndex]) return false;
      history = history.slice(0, historyIndex + 1);
      history.push(current);
      if (history.length > 100) history.shift();
      historyIndex = history.length - 1;
      updateHistoryButtons();
      return true;
    }

    function scheduleHistory() {
      clearTimeout(historyTimer);
      updateHistoryButtons();
      historyTimer = window.setTimeout(pushHistory, 500);
    }

    function restoreHistory(index) {
      clearTimeout(historyTimer);
      historyTimer = null;
      if (index < 0 || index >= history.length || index === historyIndex) return;
      historyIndex = index;
      editable.innerHTML = history[historyIndex];
      updateHistoryButtons();
      editable.focus();
      var range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      var selection = document.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      if (onChange) onChange();
    }

    function undo() {
      pushHistory();
      if (historyIndex > 0) restoreHistory(historyIndex - 1);
    }

    function redo() {
      pushHistory();
      if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
    }

    function openLinkDialog(range) {
      var dialog = UI.modal({
        title: t('editorLinkDialogTitle'),
        size: 'sm',
        body:
          '<div class="editor-link-dialog">' +
          '<div class="editor-link-dialog-icon">' + UI.icon('link', 20) + '</div>' +
          '<p class="editor-link-dialog-copy">' + e(t('editorLinkDialogHint')) + '</p>' +
          '<label class="label" for="editorLinkUrl">' + e(t('editorLinkDialogLabel')) + '</label>' +
          '<input class="input editor-link-dialog-input" id="editorLinkUrl" type="url" inputmode="url" dir="ltr" ' +
          'autocomplete="url" placeholder="https://example.com" aria-describedby="editorLinkError">' +
          '<p class="hint error editor-link-dialog-error" id="editorLinkError" role="alert" hidden></p>' +
          '</div>',
        footer:
          '<button class="btn btn-ghost" type="button" data-link-cancel>' + e(t('cancel')) + '</button>' +
          '<button class="btn btn-primary" type="button" data-link-insert>' +
          UI.icon('link', 15) + ' ' + e(t('editorLinkDialogInsert')) + '</button>'
      });
      var input = dialog.body.querySelector('#editorLinkUrl');
      var error = dialog.body.querySelector('#editorLinkError');
      var insertButton = dialog.el.querySelector('[data-link-insert]');

      function submitLink() {
        var value = input.value.trim();
        var normalizedValue = /^[a-z][a-z0-9+.-]*:/i.test(value)
          ? value
          : 'https://' + value;
        var parsedUrl;
        try {
          parsedUrl = new URL(normalizedValue);
          if (!value || !parsedUrl.hostname ||
            (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:')) {
            throw new Error('Unsupported or incomplete link');
          }
        } catch (validationError) {
          error.textContent = t('editorInvalidLink');
          error.hidden = false;
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }

        dialog.close();
        restoreSelection(range);
        try {
          executeEditorCommand('createLink', parsedUrl.href);
          if (pushHistory() && onChange) onChange();
        } catch (commandError) {
          console.error('تعذر إدراج الرابط في الوصف.', commandError);
          UI.toast(t('editorCommandFailed'), 'error');
        }
      }

      input.addEventListener('input', function () {
        error.hidden = true;
        input.removeAttribute('aria-invalid');
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          submitLink();
        }
      });
      dialog.el.querySelector('[data-link-cancel]').addEventListener('click', dialog.close);
      insertButton.addEventListener('click', submitLink);
      window.requestAnimationFrame(function () { input.focus(); });
    }

    editable.addEventListener('input', scheduleHistory);
    editable.addEventListener('keydown', function (event) {
      if (!(event.ctrlKey || event.metaKey)) return;
      var key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (key === 'z') {
        event.preventDefault();
        undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    });
    updateHistoryButtons();

    toolbar.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    toolbar.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-cmd]');
      if (!btn) return;
      var cmd = btn.getAttribute('data-cmd');
      pushHistory();
      savedRange = saveSelection();
      if (cmd === 'undo') { undo(); return; }
      if (cmd === 'redo') { redo(); return; }
      restoreSelection(savedRange);
      try {
        if (cmd === 'bold' || cmd === 'italic' || cmd === 'insertUnorderedList' || cmd === 'insertOrderedList' || cmd === 'removeFormat') {
          executeEditorCommand(cmd);
        } else if (cmd === 'h2') {
          executeEditorCommand('formatBlock', '<h2>');
        } else if (cmd === 'quote') {
          executeEditorCommand('formatBlock', '<blockquote>');
        } else if (cmd === 'code') {
          executeEditorCommand('formatBlock', '<pre>');
        } else if (cmd === 'link') {
          openLinkDialog(savedRange);
          return;
        } else if (cmd === 'image') {
          pickImage(function (dataUrl) {
            restoreSelection(savedRange);
            if (!insertHTML('<img src="' + dataUrl + '" alt="">')) {
              throw new Error('Image could not be inserted into the editor');
            }
            pushHistory();
            if (onChange) onChange();
          });
          return;
        }
      } catch (error) {
        console.error('تعذر تنفيذ أداة تنسيق الوصف.', error);
        UI.toast(t('editorCommandFailed'), 'error');
        return;
      }
      if (pushHistory() && onChange) onChange();
    });

    document.addEventListener('selectionchange', function () {
      var sel = document.getSelection();
      if (!sel || !sel.anchorNode || !editable.contains(sel.anchorNode)) return;
      [['bold'], ['italic']].forEach(function (pair) {
        var b = toolbar.querySelector('[data-cmd="' + pair[0] + '"]');
        if (!b) return;
        try { b.classList.toggle('on', document.queryCommandState(pair[0])); } catch (err) { }
      });
    });
  }

  function pickImage(cb, multiple) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (multiple) input.multiple = true;
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length) return;
      Promise.all(files.map(function (f) { return UI.compressImage(f, 1400, 0.82); })).then(function (list) {
        if (multiple) cb(list); else cb(list[0]);
      }).catch(function (error) {
        console.error('تعذر تجهيز صورة المحرر.', error);
        UI.toast(t('editorImageFailed'), 'error');
      });
    });
    input.click();
  }

  function textOf(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function setupDropzone(zone, input, onFiles) {
    ['dragenter', 'dragover'].forEach(function (evName) {
      zone.addEventListener(evName, function (ev) { ev.preventDefault(); zone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (evName) {
      zone.addEventListener(evName, function (ev) { ev.preventDefault(); zone.classList.remove('dragover'); });
    });
    zone.addEventListener('drop', function (ev) {
      var files = Array.prototype.slice.call(ev.dataTransfer.files || []);
      if (files.length) onFiles(files);
    });
    if (input) input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      if (files.length) onFiles(files);
      input.value = '';
    });
  }

  function fillChrome(opts) {
    var dirRtl = document.documentElement.dir === 'rtl';
    var backLink = document.getElementById('edBack');
    backLink.innerHTML = UI.icon(dirRtl ? 'arrow-right' : 'arrow-left', 18);
    backLink.addEventListener('click', function (event) {
      if (document.body.getAttribute('data-admin-dashboard-editor') === 'true' &&
          window.Admin && typeof window.Admin.navigate === 'function') {
        event.preventDefault();
        var courseTypeInput = document.getElementById('edCourseType');
        var isInPersonCourse = document.body.classList.contains('in-person-course-editor') ||
          (courseTypeInput && courseTypeInput.value === 'in_person');
        var inPersonKindInput = document.getElementById('edInPersonKind');
        window.Admin.navigate(page === 'edit-course'
          ? (isInPersonCourse
            ? (inPersonKindInput && inPersonKindInput.value === 'workshop'
              ? 'workshops'
              : 'in-person-courses')
            : 'courses')
          : 'projects');
        return;
      }
      if (page === 'edit-course') {
        event.preventDefault();
        UI.confirm(t('editorLeaveWarning'), {
          title: t('editorLeaveTitle'),
          icon: 'alert-triangle',
          className: 'editor-leave-confirm',
          cancelLabel: t('editorStay'),
          confirmLabel: t('editorLeave'),
          confirmClass: 'btn-danger'
        }).then(function (confirmed) {
          if (!confirmed) return;
          if (typeof window.courseEditorDiscardPendingChanges !== 'function') {
            UI.toast(t('courseLeaveRestoreFailed'), 'error');
            return;
          }
          window.courseEditorDiscardPendingChanges().then(function () {
            var previousPage = null;
            try {
              previousPage = document.referrer ? new URL(document.referrer) : null;
            } catch (error) {
              console.warn('تعذر تحديد الصفحة السابقة لمحرر الدورة.', error);
            }
            var isEditorPage = previousPage &&
              (/\/courses\/edit(?:\/|$)/.test(previousPage.pathname) ||
                /\/projects\/edit(?:\/|$)/.test(previousPage.pathname));
            var isLoginPage = previousPage && /\/(?:login|accounts\/login)\/?$/.test(previousPage.pathname);
            var canGoBack = previousPage && previousPage.origin === window.location.origin &&
              !isEditorPage && !isLoginPage && window.history.length > 1;
            try {
              window.sessionStorage.removeItem('dc-page-transition');
            } catch (error) {
              console.warn('تعذر مسح حالة انتقال الصفحة.', error);
            }
            if (canGoBack) window.history.back();
            else window.location.href = backLink.href;
          }).catch(function (error) {
            console.error('تعذر استعادة آخر نسخة منشورة قبل مغادرة محرر الدورة.', error);
            UI.toast(t('courseLeaveRestoreFailed'), 'error');
          });
        });
        return;
      }
      if (page !== 'edit-project') {
        var previousPage;
        try {
          previousPage = document.referrer ? new URL(document.referrer) : null;
        } catch (error) {
          return;
        }
        var isEditorPage = previousPage &&
          (/\/courses\/edit(?:\/|$)/.test(previousPage.pathname) ||
            /\/projects\/edit(?:\/|$)/.test(previousPage.pathname));
        var isLoginPage = previousPage && /\/(?:login|accounts\/login)\/?$/.test(previousPage.pathname);
        if (!previousPage || previousPage.origin !== window.location.origin ||
            isEditorPage || isLoginPage || window.history.length <= 1) return;

        event.preventDefault();
        try {
          window.sessionStorage.removeItem('dc-page-transition');
        } catch (error) {
          console.warn('Page transition state could not be cleared.', error);
        }
        window.history.back();
        return;
      }
      event.preventDefault();
      UI.confirm(t('editorLeaveWarning'), {
        title: t('editorLeaveTitle'),
        icon: 'alert-triangle',
        className: 'editor-leave-confirm',
        cancelLabel: t('editorStay'),
        confirmLabel: t('editorLeave'),
        confirmClass: 'btn-danger'
      }).then(function (confirmed) {
        if (!confirmed) return;
        try {
          window.sessionStorage.removeItem('dc-page-transition');
        } catch (error) {
          console.warn('Page transition state could not be cleared.', error);
        }
        var previousPage;
        try {
          previousPage = document.referrer ? new URL(document.referrer) : null;
        } catch (error) {
          previousPage = null;
        }
        var isEditorPage = previousPage &&
          (/\/courses\/edit(?:\/|$)/.test(previousPage.pathname) ||
            /\/projects\/edit(?:\/|$)/.test(previousPage.pathname));
        var isLoginPage = previousPage && /\/(?:login|accounts\/login)\/?$/.test(previousPage.pathname);
        var canGoBack = previousPage && previousPage.origin === window.location.origin &&
          !isEditorPage && !isLoginPage && window.history.length > 1;
        if (canGoBack) window.history.back();
        else window.location.href = backLink.href;
      });
    });
    var isAdminCourseEditor = page === 'edit-course' &&
      document.body.getAttribute('data-admin-course-editor') === 'true';
    var btns = [
      { id: 'edPreviewBtn', icon: 'eye', label: t('preview') },
      {
        id: 'edDraftBtn',
        icon: isAdminCourseEditor ? 'archive' : 'save',
        label: isAdminCourseEditor ? t('archiveCourse') : t('saveDraft')
      },
      { id: 'edPublishBtn', icon: 'send', label: t('publish') }
    ];
    btns.forEach(function (b) {
      var el = document.getElementById(b.id);
      if (!el) return;
      el.querySelector('.ic-slot').outerHTML = UI.icon(b.icon, 15);
      el.querySelector('.lbl').textContent = b.label;
    });
    if (opts && opts.titles) {
      var mobileTemplateBox = document.querySelector('.editor-templates-mobile');
      var mobileChecklistBox = document.querySelector('.editor-checklist-mobile');
      var labels = Array.prototype.slice.call(document.querySelectorAll('.h3-label')).filter(function (label) {
        return (!mobileTemplateBox || !mobileTemplateBox.contains(label)) &&
          (!mobileChecklistBox || !mobileChecklistBox.contains(label));
      });
      var icons = Array.prototype.slice.call(document.querySelectorAll('.h3-ic')).filter(function (icon) {
        return (!mobileTemplateBox || !mobileTemplateBox.contains(icon)) &&
          (!mobileChecklistBox || !mobileChecklistBox.contains(icon));
      });
      opts.titles.forEach(function (item, i) {
        if (labels[i]) labels[i].textContent = item.title;
        if (icons[i]) icons[i].innerHTML = UI.icon(item.icon, 15);
      });
      if (mobileTemplateBox) {
        var mobileLabel = mobileTemplateBox.querySelector('.h3-label');
        var mobileIcon = mobileTemplateBox.querySelector('.h3-ic');
        if (mobileLabel) mobileLabel.textContent = t(page === 'edit-course' ? 'courseTemplates' : 'templates');
        if (mobileIcon) mobileIcon.innerHTML = UI.icon('layers', 15);
      }
      if (mobileChecklistBox) {
        var mobileChecklistLabel = mobileChecklistBox.querySelector('.h3-label');
        var mobileChecklistIcon = mobileChecklistBox.querySelector('.h3-ic');
        if (mobileChecklistLabel) mobileChecklistLabel.textContent = t('checklist');
        if (mobileChecklistIcon) mobileChecklistIcon.innerHTML = UI.icon('check-circle', 15);
      }
    }
    if (window.SiteChrome && SiteChrome.mount) SiteChrome.mount();
  }

    function setStatus(kind) {
      var el = document.getElementById('edStatus');
      var dot = el.querySelector('.dot');
      var label = el.querySelector('span:last-child');
      dot.className = kind === 'saving' ? 'dot dot-warn' : 'dot dot-ok';
      label.textContent = kind === 'saving' ? t('saving') : t('autosaved');
    }

    function setStatusDraft() {
      var el = document.getElementById('edStatus');
      el.querySelector('.dot').className = 'dot dot-warn';
      el.querySelector('span:last-child').textContent = t('draft');
    }

  /* ---------- project editor ---------- */

  function initProjectEditor() {
    var isCourse = page === 'edit-course';
    if (isCourse && !activeAdminCourseKind) {
      try {
        activeAdminCourseKind =
          new URLSearchParams(window.location.search).get('kind') === 'workshop'
            ? 'workshop'
            : '';
      } catch (error) {
        activeAdminCourseKind = '';
      }
    }
    document.body.classList.remove('in-person-course-editor');
    var mobileLayout = null;
    var syncMobileCourseMetaLayout = null;
    var syncMobileCourseAxesLayout = null;
    if (isCourse) {
      var mobileChecklist = document.querySelector('.editor-checklist-mobile');
      var editorGrid = document.querySelector('.editor-grid');
      var courseMetaBox = document.getElementById('edCourseMetaBox');
      var courseAxesBox = document.getElementById('edAxesBox');
      var coverHost = document.getElementById('edCoverHost');
      if (mobileChecklist && editorGrid && window.matchMedia) {
        var checklistPlaceholder = document.createComment('course-checklist-original-position');
        mobileChecklist.parentNode.insertBefore(checklistPlaceholder, mobileChecklist);
        var courseMetaPlaceholder = courseMetaBox
          ? document.createComment('course-meta-original-position')
          : null;
        var courseAxesPlaceholder = courseAxesBox
          ? document.createComment('course-axes-original-position')
          : null;
        if (courseMetaBox) {
          courseMetaBox.parentNode.insertBefore(courseMetaPlaceholder, courseMetaBox);
        }
        if (courseAxesBox) {
          courseAxesBox.parentNode.insertBefore(courseAxesPlaceholder, courseAxesBox);
        }
        mobileLayout = window.matchMedia('(max-width: 640px)');
        function syncMobileCourseEditorLayout() {
          if (mobileLayout.matches) {
            editorGrid.appendChild(mobileChecklist);
          } else {
            checklistPlaceholder.parentNode.insertBefore(
              mobileChecklist,
              checklistPlaceholder.nextSibling
            );
          }
        }
        syncMobileCourseMetaLayout = function () {
          if (!courseMetaBox || !coverHost || !courseMetaPlaceholder) return;
          if (mobileLayout.matches) {
            coverHost.parentNode.insertBefore(courseMetaBox, coverHost.nextSibling);
          } else {
            courseMetaPlaceholder.parentNode.insertBefore(
              courseMetaBox,
              courseMetaPlaceholder.nextSibling
            );
          }
        };
        syncMobileCourseAxesLayout = function () {
          if (!courseAxesBox || !courseAxesPlaceholder) return;
          if (mobileLayout.matches) {
            if (courseMetaBox && courseMetaBox.parentNode) {
              courseMetaBox.parentNode.insertBefore(courseAxesBox, courseMetaBox.nextSibling);
            }
          } else {
            courseAxesPlaceholder.parentNode.insertBefore(
              courseAxesBox,
              courseAxesPlaceholder.nextSibling
            );
          }
        };
        syncMobileCourseEditorLayout();
        if (mobileLayout.addEventListener) {
          mobileLayout.addEventListener('change', syncMobileCourseEditorLayout);
        } else if (mobileLayout.addListener) {
          mobileLayout.addListener(syncMobileCourseEditorLayout);
        }
      }
    }
    var COL = isCourse ? 'certificates' : 'projects';
    var coursePathId = isCourse ? window.location.pathname.match(/\/courses\/edit\/([^/]+)\/?$/) : null;
    var id = activeAdminEditorId || SITE.param('id') || (coursePathId ? coursePathId[1] : '');
    var editorObjectNode = document.getElementById('editor-object-data');
    var editorObject = null;
    if (editorObjectNode) {
      try {
        var editorObjects = JSON.parse(editorObjectNode.textContent);
        editorObject = Array.isArray(editorObjects) ? editorObjects[0] || null : null;
      } catch (error) {
        console.error('تعذر قراءة بيانات المحرر من الخادم.', error);
      }
    }
    var existing = editorObject || (id ? Store.find(COL, id) : null);
    var p = existing ? JSON.parse(JSON.stringify(existing)) : (isCourse ? {
      id: Store.uid('c'), title: '', slug: '', cover: '', summary: '', content: '',
        issuer: '', description: '', skills: [], image: '', credentialId: '', verifyUrl: '',
        price: '', currency: 'ILS', duration: '', period: '', syllabus: [],
        courseType: activeAdminCourseType === 'in_person' ? 'in_person' : 'online',
        inPersonKind: activeAdminCourseKind === 'workshop' ? 'workshop' : 'course',
        isComplete: true,
      category: '', date: new Date().toISOString().slice(0, 10),
      links: { github: '', demo: '' }, files: [], gallery: [],
      views: 0, likes: 0, comments: [],
      status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    } : {
      id: Store.uid('p'), title: '', slug: '', cover: '', summary: '', content: '',
      tags: [], category: '', role: '', date: new Date().toISOString().slice(0, 10),
      links: { github: '', demo: '' }, files: [], gallery: [],
      views: 0, likes: 0, liked: false, saved: false, comments: [],
      status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    p.gallery = Array.isArray(p.gallery) ? p.gallery : [];
    if (isCourse) {
      p.coverStorageName = p.coverStorageName || '';
      if (existing) {
        p.summary = existing.description || existing.summary || '';
        p.role = existing.instructor || existing.issuer || '';
        p.tags = (existing.skills || existing.tags || []).slice();
        p.cover = existing.cover || existing.image || '';
      }
      p.tags = p.tags || [];
      p.files = p.files || [];
      p.gallery = p.gallery || [];
      p.links = p.links || { github: '', demo: '' };
      p.syllabus = Array.isArray(p.syllabus) ? p.syllabus : [];
      p.summary = p.summary || '';
      p.role = p.role || '';
      p.price = p.price || '';
      p.currency = p.currency || 'ILS';
      p.duration = p.duration || '';
      p.period = p.period || '';
      p.credentialId = p.credentialId || '';
      p.verifyUrl = p.verifyUrl || '';
      p.inPersonKind = p.inPersonKind === 'workshop' ? 'workshop' : 'course';
    }
    var isNew = !existing;
    var isWorkshopEditor = isCourse &&
      (activeAdminCourseKind === 'workshop' || p.inPersonKind === 'workshop');
    activeWorkshopEditor = isWorkshopEditor &&
      !document.getElementById('edCourseTypeField') &&
      p.courseType !== 'in_person';
    function isFreeOnlineWorkshop() {
      return activeWorkshopEditor && priceEl && String(priceEl.value).trim() !== '' &&
        Number(priceEl.value) === 0;
    }
    function freeWorkshopSyllabusIssue() {
      var sections = (p.syllabus || []).filter(function (section) {
        return section && String(section.title || '').trim();
      });
      if (sections.length !== 1) return 'freeWorkshopSections';
      var lessons = (sections[0].lessons || []).filter(function (lesson) {
        return lesson && String(lesson.title || '').trim();
      });
      if (lessons.length < 2 || lessons.length > 3) return 'freeWorkshopLessons';
      var finalLesson = lessons[lessons.length - 1];
      if (finalLesson.type !== 'quiz') return 'freeWorkshopFinalQuiz';
      var questions = finalLesson.quiz && Array.isArray(finalLesson.quiz.questions)
        ? finalLesson.quiz.questions
        : [];
      var validQuestionCount = questions.filter(function (question) {
        return question && String(question.text || '').trim() &&
          Array.isArray(question.choices) &&
          question.choices.filter(function (choice) {
            return choice && String(choice.text || '').trim();
          }).length >= 2;
      }).length;
      return validQuestionCount >= 10 ? '' : 'freeWorkshopQuizQuestions';
    }
    var initialInPersonCourseEditor = isCourse && p.courseType === 'in_person';
    var isInPersonCourseEditor = function () {
      return isWorkshopEditor && courseTypeEl
        ? courseTypeEl.value === 'in_person'
        : initialInPersonCourseEditor;
    };
    var createdDuringSession = false;
    var initialCourseSnapshot = isCourse && existing
      ? JSON.parse(JSON.stringify(p))
      : null;
    var dirty = false;
    var syllabusDirty = false;
    var saveInFlight = false;
    var queuedSave = null;
    var changeVersion = 0;
    var syllabusVersion = 0;
    var pendingDeletionHistory = [];
    var deletionHistoryKey = isCourse ? 'dc-course-deletions:' + p.id : '';
    var renderDeletionHistory = function () {};
    var versionRestorePending = false;
    var leaveRequested = false;
    var SERVER_SAVE = (page === 'edit-project' || page === 'edit-course');
    var courseReturnUrl = '';
    if (isCourse) {
      var requestedReturnUrl = new URLSearchParams(window.location.search).get('returnTo');
      if (requestedReturnUrl) {
        try {
          var parsedReturnUrl = new URL(requestedReturnUrl, window.location.origin);
          if (parsedReturnUrl.origin === window.location.origin) {
            courseReturnUrl = parsedReturnUrl.pathname + parsedReturnUrl.search + parsedReturnUrl.hash;
          }
        } catch (error) {
          console.warn('تعذر قراءة مسار العودة من محرر الدورة.', error);
        }
      }
    }

    /* صناديق الدورة لا تظهر في محرر المشاريع (ولكنها تُحذف قبل ضبط عناوين البطاقات) */
    if (!isCourse) {
      var sylBox = document.getElementById('edSyllabusBox');
      if (sylBox) sylBox.remove();
      var metaBox = document.getElementById('edCourseMetaBox');
      if (metaBox) metaBox.remove();
    }

    var chromeTitles = [];
    if (isCourse) {
      chromeTitles.push({ icon: 'list', title: t('syllabusLabel') });
      chromeTitles.push({ icon: 'check-circle', title: t('checklist') });
      chromeTitles.push({ icon: 'layers', title: t('courseTemplates') });
      chromeTitles.push({ icon: 'award', title: t('courseMetaLabel') });
      chromeTitles.push({ icon: 'info', title: t('courseInfoLabel') });
      chromeTitles.push({ icon: 'hash', title: t('courseAxesLabel') });
    } else {
      chromeTitles.push({ icon: 'check-circle', title: t('checklist') });
      chromeTitles.push({ icon: 'layers', title: t('templates') });
      chromeTitles.push({ icon: 'sliders', title: t('projectMetaLabel') });
      chromeTitles.push({ icon: 'hash', title: t('tagsLabel') });
      chromeTitles.push({ icon: 'file', title: t('tagsLabel') });
    }

    fillChrome({ titles: chromeTitles });
    if (isCourse && syncMobileCourseMetaLayout) {
      syncMobileCourseMetaLayout();
      syncMobileCourseAxesLayout();
      if (mobileLayout.addEventListener) {
        mobileLayout.addEventListener('change', syncMobileCourseMetaLayout);
        mobileLayout.addEventListener('change', syncMobileCourseAxesLayout);
      } else if (mobileLayout.addListener) {
        mobileLayout.addListener(syncMobileCourseMetaLayout);
        mobileLayout.addListener(syncMobileCourseAxesLayout);
      }
    }
    if (isNew || p.status === 'draft') setStatusDraft(); else setStatus('saved');

    var titleEl = document.getElementById('edTitle');
    var titleValidationEl = document.getElementById('edTitleValidation');
    var titleEnglishEl = isCourse ? document.getElementById('edTitleEnglish') : null;
    var contentEl = document.getElementById('edContent');
    var syllabusToggle = isCourse ? document.getElementById('edSyllabusToggle') : null;
    var syllabusPanel = isCourse ? document.getElementById('edSyllabusPanel') : null;
    function syncCourseEditorFlow() {
      if (!isCourse) return;
      document.body.classList.add('course-editor-flow');
    }
    function setupSectionToggle(toggleId, panelId, labelId, labelKey, stateId, iconId) {
      var toggle = document.getElementById(toggleId);
      var panel = document.getElementById(panelId);
      if (!toggle || !panel) return;
      var label = document.getElementById(labelId);
      var state = document.getElementById(stateId);
      var icon = document.getElementById(iconId);
      if (label) label.textContent = t(labelKey);
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      if (state) state.textContent = t('openSection');
      if (icon) icon.innerHTML = UI.icon('chevron-down', 17);
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.hidden = !open;
        if (state) state.textContent = t(open ? 'closeSection' : 'openSection');
        if (icon) icon.style.transform = open ? 'rotate(180deg)' : '';
        syncCourseEditorFlow();
      });
    }
    if (isCourse) {
      syncCourseEditorFlow();
      setupSectionToggle(
        'edSyllabusToggle', 'edSyllabusPanel', 'edSyllabusToggleLabel',
        'syllabusLabel', 'edSyllabusToggleState', 'edSyllabusToggleIcon'
      );
    }
    var slugEl = document.getElementById('edSlug');
    var summaryEl = document.getElementById('edSummary');
    var courseTypeEl = document.getElementById('edCourseType');
    var courseTypeChoices = document.querySelectorAll('input[name="courseTypeChoice"]');
    var inPersonKindEl = document.getElementById('edInPersonKind');
    var inPersonKindField = document.getElementById('edInPersonKindField');
    var inPersonKindChoices = document.querySelectorAll('input[name="inPersonKindChoice"]');
    function syncCourseTypeChoices(value) {
      Array.prototype.forEach.call(courseTypeChoices, function (choice) {
        choice.checked = choice.value === value;
      });
    }
    function syncInPersonKindChoices(value) {
      Array.prototype.forEach.call(inPersonKindChoices, function (choice) {
        choice.checked = choice.value === value;
      });
    }
    function syncInPersonKindVisibility() {
      if (inPersonKindField && courseTypeEl) {
        inPersonKindField.hidden = courseTypeEl.value !== 'in_person';
      }
    }
    function configureWorkshopEditorChoices() {
      if (!isWorkshopEditor) return;
      var english = I18n.getLang() === 'en';
      var typeField = document.getElementById('edCourseTypeField');
      var typeLabel = typeField && typeField.querySelector('.label');
      var typeOptions = document.getElementById('edCourseTypeOptions');
      if (typeLabel) typeLabel.textContent = english ? 'Workshop format' : 'نوع الورشة';
      if (typeOptions) {
        typeOptions.setAttribute('aria-label', english ? 'Workshop format' : 'نوع الورشة');
      }
      Array.prototype.forEach.call(courseTypeChoices, function (choice) {
        var card = choice.parentElement.querySelector('.course-type-option-card');
        var strong = card && card.querySelector('strong');
        var small = card && card.querySelector('small');
        var isOnline = choice.value === 'online';
        if (strong) {
          strong.textContent = english
            ? (isOnline ? 'Online workshop' : 'In-person workshop')
            : (isOnline ? 'ورشة أونلاين' : 'ورشة وجاهية');
        }
        if (small) {
          small.textContent = english
            ? (isOnline ? 'Delivered online' : 'Attend at the location')
            : (isOnline ? 'تنفيذ عن بُعد' : 'حضور في الموقع');
        }
      });
    }
    var categoryEl = document.getElementById('edCategory');
    var categorySearchEl = document.getElementById('edCategorySearch');
    var categoryOptionsEl = document.getElementById('edCategoryOptions');
    var categoryValidationEl = document.getElementById('edCategoryValidation');
    var trainingCategories = [];
    var visibleTrainingCategories = [];
    var activeTrainingCategory = -1;
    var categoryTouched = false;
    var categoryUnavailable = false;
    var trainingCategoriesDataEl = document.getElementById('training-categories-data');
    if (trainingCategoriesDataEl) {
      try {
        var parsedTrainingCategories = JSON.parse(trainingCategoriesDataEl.textContent);
        if (Array.isArray(parsedTrainingCategories)) {
          trainingCategories = parsedTrainingCategories.filter(function (category) {
            return typeof category === 'string' && category.trim();
          }).map(function (category) { return category.trim(); });
        }
      } catch (error) {
        console.error('تعذر تحميل قائمة المجالات التدريبية.', error);
      }
    }
    if (!trainingCategories.length) {
      var adminTrainingCategoriesDataEl = document.getElementById('admin-training-categories-data');
      if (adminTrainingCategoriesDataEl) {
        try {
          var adminTrainingCategories = JSON.parse(adminTrainingCategoriesDataEl.textContent);
          if (Array.isArray(adminTrainingCategories)) {
            trainingCategories = adminTrainingCategories.filter(function (category) {
              return category && typeof category.name === 'string' && category.name.trim();
            }).map(function (category) {
              return category.name.trim();
            });
          }
        } catch (error) {
          console.error('تعذر تحميل مجالات لوحة الإدارة.', error);
        }
      }
    }
    function normalizeTrainingCategory(value) {
      return String(value || '').toLocaleLowerCase()
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .trim();
    }
    function isValidTrainingCategory() {
      return isInPersonCourseEditor() ||
        (!categoryUnavailable && trainingCategories.indexOf(categoryEl.value) !== -1);
    }
    function updateTrainingCategoryValidation(force) {
      if (!categorySearchEl || !categoryValidationEl) return isValidTrainingCategory();
      var valid = isValidTrainingCategory();
      var shouldShow = (force || categoryTouched) && !valid;
      if (shouldShow) {
        var query = normalizeTrainingCategory(categorySearchEl.value);
        var hasMatches = trainingCategories.some(function (category) {
          return normalizeTrainingCategory(category).indexOf(query) !== -1;
        });
        categoryValidationEl.textContent = categoryUnavailable
          ? t('categoryUnavailable')
          : (query && !hasMatches ? t('categoryNoResults') : t('categorySelectRequired'));
      } else {
        categoryValidationEl.textContent = '';
      }
      categoryValidationEl.hidden = !shouldShow;
      categorySearchEl.classList.toggle('is-invalid', shouldShow);
      if (shouldShow) categorySearchEl.setAttribute('aria-invalid', 'true');
      else categorySearchEl.removeAttribute('aria-invalid');
      return valid;
    }
    function renderTrainingCategoryOptions(query) {
      if (!categoryOptionsEl) return;
      var normalizedQuery = normalizeTrainingCategory(query);
      visibleTrainingCategories = trainingCategories.filter(function (category) {
        return normalizeTrainingCategory(category).indexOf(normalizedQuery) !== -1;
      });
      activeTrainingCategory = visibleTrainingCategories.length ? 0 : -1;
      categoryOptionsEl.innerHTML = visibleTrainingCategories.length
        ? visibleTrainingCategories.map(function (category, index) {
          var selected = category === categoryEl.value;
          return '<button type="button" class="training-category-option' +
            (selected ? ' is-selected' : '') + (index === activeTrainingCategory ? ' is-active' : '') +
            '" id="training-category-option-' + index + '" role="option" aria-selected="' +
            (selected ? 'true' : 'false') + '" tabindex="-1" data-category-index="' + index + '">' +
            '<span>' + e(category) + '</span>' +
            (selected ? UI.icon('check', 15) : '') +
            '</button>';
        }).join('')
        : '<div class="training-category-empty" role="status">' + e(t('categoryNoResults')) + '</div>';
      if (categorySearchEl && !categoryOptionsEl.hidden && activeTrainingCategory >= 0) {
        categorySearchEl.setAttribute(
          'aria-activedescendant',
          'training-category-option-' + activeTrainingCategory
        );
      } else if (categorySearchEl) {
        categorySearchEl.removeAttribute('aria-activedescendant');
      }
    }
    function closeTrainingCategoryOptions() {
      if (!categoryOptionsEl || !categorySearchEl) return;
      categoryOptionsEl.hidden = true;
      categorySearchEl.setAttribute('aria-expanded', 'false');
      categorySearchEl.removeAttribute('aria-activedescendant');
    }
    function openTrainingCategoryOptions(query) {
      if (!categoryOptionsEl || !categorySearchEl) return;
      categoryOptionsEl.hidden = false;
      categorySearchEl.setAttribute('aria-expanded', 'true');
      renderTrainingCategoryOptions(
        typeof query === 'string' ? query : categorySearchEl.value
      );
    }
    function chooseTrainingCategory(category) {
      var changed = categoryEl.value !== category;
      categoryUnavailable = false;
      categoryTouched = true;
      categoryEl.value = category;
      categorySearchEl.value = category;
      closeTrainingCategoryOptions();
      updateTrainingCategoryValidation();
      if (changed) markDirty();
    }
    if (categorySearchEl && categoryOptionsEl && categoryEl) {
      var currentTrainingCategory = String(p.category || '').trim();
      trainingCategories = trainingCategories.filter(function (category, index, list) {
        return !list.slice(0, index).some(function (previous) { return previous === category; });
      }).sort(function (left, right) {
        return left.localeCompare(right, I18n.getLang() === 'en' ? 'en' : 'ar');
      });
      categoryUnavailable = !!currentTrainingCategory &&
        trainingCategories.indexOf(currentTrainingCategory) === -1;
      categoryTouched = categoryUnavailable;
      categorySearchEl.placeholder = t('categorySearchPlaceholder');
      categorySearchEl.addEventListener('focus', function () {
        openTrainingCategoryOptions(categoryUnavailable ? '' : categorySearchEl.value);
      });
      categorySearchEl.addEventListener('input', function () {
        categoryTouched = true;
        categoryUnavailable = false;
        openTrainingCategoryOptions();
        var exactCategory = trainingCategories.filter(function (category) {
          return normalizeTrainingCategory(category) === normalizeTrainingCategory(categorySearchEl.value);
        })[0];
        if (exactCategory) {
          chooseTrainingCategory(exactCategory);
        } else {
          var hadSelectedCategory = !!categoryEl.value;
          categoryEl.value = '';
          if (hadSelectedCategory) markDirty();
          updateTrainingCategoryValidation();
        }
      });
      categorySearchEl.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeTrainingCategoryOptions();
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (categoryOptionsEl.hidden) openTrainingCategoryOptions();
          if (!visibleTrainingCategories.length) return;
          var direction = event.key === 'ArrowDown' ? 1 : -1;
          activeTrainingCategory = (activeTrainingCategory + direction + visibleTrainingCategories.length) %
            visibleTrainingCategories.length;
          categoryOptionsEl.querySelectorAll('.training-category-option').forEach(function (option, index) {
            option.classList.toggle('is-active', index === activeTrainingCategory);
          });
          categorySearchEl.setAttribute(
            'aria-activedescendant',
            'training-category-option-' + activeTrainingCategory
          );
          return;
        }
        if (event.key === 'Enter' && !categoryOptionsEl.hidden && activeTrainingCategory >= 0) {
          event.preventDefault();
          chooseTrainingCategory(visibleTrainingCategories[activeTrainingCategory]);
        }
      });
      categoryOptionsEl.addEventListener('click', function (event) {
        var option = event.target.closest('[data-category-index]');
        if (!option) return;
        chooseTrainingCategory(visibleTrainingCategories[Number(option.dataset.categoryIndex)]);
      });
      categorySearchEl.addEventListener('blur', function () {
        updateTrainingCategoryValidation();
      });
      document.addEventListener('click', function (event) {
        if (!event.target.closest('.training-category-picker')) closeTrainingCategoryOptions();
      });
    }
    var roleEl = document.getElementById('edRole');
    var trainerEl = isCourse && roleEl && roleEl.tagName === 'SELECT' ? roleEl : null;
    var ownerSearchEl = !isCourse ? document.getElementById('edOwnerSearch') : null;
    var ownerIdEl = !isCourse ? document.getElementById('edOwnerId') : null;
    var ownerOptionsEl = !isCourse ? document.getElementById('edOwnerOptions') : null;
    var adminProjectOwners = [];
    if (ownerSearchEl && ownerOptionsEl) {
      var ownerLabelEl = document.getElementById('lblProjectOwner');
      if (ownerLabelEl) {
        ownerLabelEl.textContent = I18n.getLang() === 'en' ? 'Project owner' : 'صاحب المشروع';
      }
      ownerSearchEl.placeholder = I18n.getLang() === 'en'
        ? 'Search by name, handle, or phone'
        : 'ابحث بالاسم أو المعرّف أو الهاتف';
      var ownersDataEl = document.getElementById('admin-project-owners-data');
      if (ownersDataEl) {
        try {
          adminProjectOwners = JSON.parse(ownersDataEl.textContent);
        } catch (err) {
          console.error('تعذر تحميل قائمة أصحاب المشاريع.', err);
        }
      }
      function ownerOptionLabel(owner) {
        return owner.name + ' (@' + owner.handle + ') · ' + owner.phone + ' · ' + owner.role;
      }
      function renderOwnerOptions(query) {
        var normalized = String(query || '').trim().toLocaleLowerCase();
        var matches = adminProjectOwners.filter(function (owner) {
          var text = [owner.name, owner.handle, owner.phone, owner.email, owner.role].join(' ').toLocaleLowerCase();
          return !normalized || text.indexOf(normalized) >= 0;
        }).slice(0, 50);
        ownerOptionsEl.innerHTML = matches.map(function (owner) {
          return '<option value="' + e(ownerOptionLabel(owner)) + '"></option>';
        }).join('');
      }
      var initialOwner = adminProjectOwners.filter(function (owner) {
        return String(owner.id) === String(ownerIdEl.value);
      })[0];
      if (initialOwner) ownerSearchEl.value = ownerOptionLabel(initialOwner);
      renderOwnerOptions('');
      ownerSearchEl.addEventListener('input', function () {
        renderOwnerOptions(ownerSearchEl.value);
        var selected = adminProjectOwners.filter(function (owner) {
          return ownerOptionLabel(owner) === ownerSearchEl.value;
        })[0];
        ownerIdEl.value = selected ? selected.id : '';
        markDirty();
      });
      ownerSearchEl.addEventListener('focus', function () { renderOwnerOptions(ownerSearchEl.value); });
    }
    var dateEl = document.getElementById('edDate');
    var demoEl = document.getElementById('edDemo');
    var tagsBox = document.getElementById('edTagsBox');
    var tagsInput = document.getElementById('edTagsInput');

    function isValidProjectUrl(value) {
      if (!value) return true;
      try {
        var parsed = new URL(value);
        return (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
          !!parsed.hostname;
      } catch (error) {
        return false;
      }
    }

    titleEl.placeholder = isCourse
      ? (I18n.getLang() === 'en' ? 'Course title in Arabic' : 'اسم الدورة بالعربية')
      : t('editorTitlePlaceholder');
    if (isWorkshopEditor) {
      titleEl.placeholder = I18n.getLang() === 'en'
        ? 'Workshop title in Arabic'
        : 'اسم الورشة بالعربية';
    }
    document.title = replaceCourseText(document.title);
    titleEl.value = p.title || '';
    function updateTitleValidation(force) {
      var valid = !!titleEl.value.trim();
      var shouldShow = !!force && !valid;
      if (titleValidationEl) {
        titleValidationEl.textContent = shouldShow ? t('titleRequired') : '';
        titleValidationEl.hidden = !shouldShow;
      }
      titleEl.classList.toggle('is-invalid', shouldShow);
      if (shouldShow) titleEl.setAttribute('aria-invalid', 'true');
      else titleEl.removeAttribute('aria-invalid');
      return valid;
    }
    updateTitleValidation(false);
    if (titleEnglishEl) {
      titleEnglishEl.placeholder = replaceCourseText(titleEnglishEl.placeholder);
      titleEnglishEl.value = titleEnglishEl.value || p.titleEnglish || p.title_en || '';
    }
    contentEl.setAttribute('data-ph', t('editorContentPlaceholder'));
    contentEl.innerHTML = p.content || '';
    summaryEl.placeholder = t('editorSummaryPlaceholder');
    summaryEl.value = p.summary || '';
    if (courseTypeEl) {
      courseTypeEl.value = p.courseType === 'in_person' ? 'in_person' : 'online';
      syncCourseTypeChoices(courseTypeEl.value);
      if (inPersonKindEl) {
        inPersonKindEl.value = p.inPersonKind;
        syncInPersonKindChoices(inPersonKindEl.value);
      }
      syncInPersonKindVisibility();
    }
    configureWorkshopEditorChoices();
    var savedTrainingCategory = String(p.category || '').trim();
    categoryUnavailable = !!savedTrainingCategory &&
      trainingCategories.indexOf(savedTrainingCategory) === -1;
    categoryTouched = categoryUnavailable;
    categoryEl.value = categoryUnavailable ? '' : savedTrainingCategory;
    if (categorySearchEl) categorySearchEl.value = p.category || '';
    updateTrainingCategoryValidation();
    if (roleEl) roleEl.value = p.role || '';
    dateEl.value = (p.date || '').slice(0, 10);
    demoEl.value = (p.links && p.links.demo) || '';

    document.getElementById('lblSummary').textContent = t('editorSummaryLabel');
    document.getElementById('lblCategory').textContent = t('categoryLabel');
    var roleLabelEl = document.getElementById('lblRole');
    if (roleLabelEl) roleLabelEl.textContent = isCourse ? t('instructorLabel') : t('roleLabel');
    document.getElementById('lblDate').textContent = t('dateLabel');
    document.getElementById('lblDemo').textContent = t('linkDemo');

    /* الظهور (عام / مخصّص للدورات) — يظهر للمدرب فقط في محرر المشاريع */
    var visibilityEl = document.getElementById('edVisibility');
    var visibilityField = document.getElementById('edVisibilityField');
    var isTrainerUser = !!(window.Store && Store.state.profile &&
      (Store.state.profile.isTrainer || Store.state.profile.roleKey === 'trainer'));
    if (!isCourse && visibilityEl) {
      if (isTrainerUser) {
        p.visibility = p.visibility === 'courses' ? 'courses' : 'personal';
      }
      visibilityEl.value = ['courses', 'personal'].indexOf(p.visibility) >= 0
        ? p.visibility
        : 'personal';
    }
    if (!isCourse && isTrainerUser && visibilityField && visibilityEl) {
      visibilityField.style.display = '';
      document.getElementById('lblVisibility').textContent = t('projectVisibilityLabel');
      document.getElementById('edVisibilityHint').textContent = t('projectVisibilityHint');
      visibilityEl.options[0].textContent = t('projectVisibilityPersonal');
      visibilityEl.options[1].textContent = t('projectVisibilityCourses');
      var personalOnly = document.body.getAttribute('data-personal-project-only') === 'true';
      if (personalOnly) {
        visibilityEl.innerHTML = '<option value="personal">' +
          e(t('projectVisibilityPersonal')) + '</option>';
        visibilityEl.value = 'personal';
        p.visibility = 'personal';
        document.getElementById('edVisibilityHint').textContent =
          t('projectVisibilityPersonalHint');
      }
    }

    /* بيانات الدورة (السعر/المدة/الفترة/الشهادة) — لحقلي المحرر فقط في صفحة الدورات */
    var priceEl = document.getElementById('edPrice');
    var currencyEl = document.getElementById('edCurrency');
    var isTrainerCourseEditor = isCourse &&
      document.body.getAttribute('data-trainer-course-editor') === 'true';
    var durationEl = document.getElementById('edDuration');
    var periodEl = document.getElementById('edPeriod');
    var courseCompletionEl = document.getElementById('edCourseCompletion');
    var courseMetaEls = [];
    var trainerCoursePriceHint = null;
    function trainerCourseMinimumPrice() {
      return currencyEl && currencyEl.value === 'USD' ? 16 : 50;
    }
    function updateTrainerCoursePriceMinimum() {
      if (!isTrainerCourseEditor || p.inPersonKind === 'workshop') return;
      var minimum = trainerCourseMinimumPrice();
      priceEl.min = String(minimum);
      if (!trainerCoursePriceHint) {
        trainerCoursePriceHint = document.createElement('span');
        trainerCoursePriceHint.className = 'tiny muted';
        priceEl.closest('.field').appendChild(trainerCoursePriceHint);
      }
      trainerCoursePriceHint.textContent = t('coursePriceMinimumHint')
        .replace('{amount}', String(minimum))
        .replace('{currency}', currencyEl && currencyEl.value === 'USD' ? '$' : '₪');
    }
    function trainerCoursePriceIsBelowMinimum() {
      if (!isTrainerCourseEditor || p.inPersonKind === 'workshop' || !priceEl.value.trim()) return false;
      return Number(priceEl.value) < trainerCourseMinimumPrice();
    }
    if (isCourse) {
      document.getElementById('lblPrice').textContent = t('priceLabel');
      document.getElementById('lblDuration').textContent = t('durationLabel');
      document.getElementById('lblPeriod').textContent = t('periodLabel');
      document.getElementById('lblCourseCompletion').textContent = t('courseCompletionLabel');
      if (activeWorkshopEditor) {
        var freeWorkshopPriceHint = document.createElement('span');
        freeWorkshopPriceHint.className = 'tiny muted';
        freeWorkshopPriceHint.textContent = t('freeWorkshopPriceHint');
        priceEl.closest('.field').appendChild(freeWorkshopPriceHint);
      }
      courseCompletionEl.options[0].textContent = t('courseCompletionComplete');
      courseCompletionEl.options[1].textContent = t('courseCompletionIncomplete');
      courseCompletionEl.options[2].textContent = t('courseCompletionComingSoon');
      courseCompletionEl.value = p.comingSoon
        ? 'coming_soon'
        : (p.isComplete === false ? 'incomplete' : 'complete');
      priceEl.value = String(p.price || '').replace(/[₪$\s]/g, '');
      if (currencyEl) {
        currencyEl.value = p.currency === 'USD' || String(p.price || '').indexOf('$') === 0
          ? 'USD'
          : 'ILS';
      }
      updateTrainerCoursePriceMinimum();
      if (currencyEl) currencyEl.addEventListener('change', updateTrainerCoursePriceMinimum);
      durationEl.value = durationHours(p.duration, p.durationEnglish);
      var periodDigits = String(p.period || '').match(/[0-9٠-٩۰-۹]+/);
      periodEl.value = periodDigits
        ? periodDigits[0].replace(/[٠-٩۰-۹]/g, function (digit) {
          return String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10);
        })
        : '';
      courseMetaEls = [
        priceEl, currencyEl, durationEl, periodEl, courseCompletionEl
      ];
      /* المدرّب هو صاحب الدورة — الحقل للعرض فقط، والدورات لا تملك روابط GitHub/تاريخ إصدار */
      if (trainerEl) {
        document.getElementById('lblRole').textContent = t('instructorLabel');
        var trainerPlaceholder = trainerEl.querySelector('[data-trainer-placeholder]');
        if (trainerPlaceholder) trainerPlaceholder.textContent = t('trainerSelectPlaceholder');
        trainerEl.value = existing ? String(existing.trainerId || '') : '';
        trainerEl.addEventListener('change', markDirty);
      } else if (roleEl) {
        roleEl.value = p.role || '';
        roleEl.readOnly = true;
        roleEl.classList.add('readonly');
      }
      dateEl.closest('.field').style.display = 'none';
      demoEl.closest('.field').style.display = 'none';
    }
    if (isInPersonCourseEditor() && !isWorkshopEditor) {
      document.body.classList.add('in-person-course-editor');
      document.getElementById('lblCourseDescription').textContent = t('ucDesc');
      var inPersonSummaryHost = document.getElementById('edInPersonSummaryHost');
      var summaryField = summaryEl.closest('.field');
      if (inPersonSummaryHost && summaryField) {
        inPersonSummaryHost.appendChild(summaryField);
        inPersonSummaryHost.hidden = false;
        document.getElementById('lblSummary').textContent = t('inPersonBannerSummaryLabel');
      }
      tagsInput.placeholder = I18n.getLang() === 'en'
        ? 'Add a course topic and press Enter'
        : 'أضف محوراً ثم اضغط Enter';
      if (trainerEl) {
        var trainerField = document.getElementById('edTrainerField');
        var courseMetaBox = document.getElementById('edCourseMetaBox');
        if (trainerField && courseMetaBox) courseMetaBox.appendChild(trainerField);
      }
    }
    var workshopSummaryField = isWorkshopEditor ? summaryEl.closest('.field') : null;
    var workshopSummaryParent = workshopSummaryField && workshopSummaryField.parentNode;
    var workshopSummaryNextSibling = workshopSummaryField && workshopSummaryField.nextSibling;
    var workshopTrainerField = isWorkshopEditor ? document.getElementById('edTrainerField') : null;
    var workshopTrainerParent = workshopTrainerField && workshopTrainerField.parentNode;
    var workshopTrainerNextSibling = workshopTrainerField && workshopTrainerField.nextSibling;
    var workshopSummaryHost = isWorkshopEditor
      ? document.getElementById('edInPersonSummaryHost')
      : null;
    var workshopCourseMetaBox = isWorkshopEditor
      ? document.getElementById('edCourseMetaBox')
      : null;
    var workshopDefaultTagPlaceholder = tagsInput.placeholder;
    function syncWorkshopCourseMode() {
      if (!isWorkshopEditor) return;
      var inPerson = (courseTypeEl ? courseTypeEl.value : p.courseType) === 'in_person';
      document.body.classList.toggle('in-person-course-editor', inPerson);
      document.getElementById('lblCourseDescription').textContent = t('ucDesc');
      if (inPerson) {
        if (workshopSummaryField && workshopSummaryHost &&
            workshopSummaryField.parentNode !== workshopSummaryHost) {
          workshopSummaryHost.appendChild(workshopSummaryField);
        }
        if (workshopSummaryHost) workshopSummaryHost.hidden = false;
        document.getElementById('lblSummary').textContent = t('inPersonBannerSummaryLabel');
        tagsInput.placeholder = I18n.getLang() === 'en'
          ? 'Add a workshop topic and press Enter'
          : 'أضف محوراً للورشة ثم اضغط Enter';
        if (workshopTrainerField && workshopCourseMetaBox &&
            workshopTrainerField.parentNode !== workshopCourseMetaBox) {
          workshopCourseMetaBox.appendChild(workshopTrainerField);
        }
      } else {
        if (workshopSummaryField && workshopSummaryParent &&
            workshopSummaryField.parentNode !== workshopSummaryParent) {
          workshopSummaryParent.insertBefore(
            workshopSummaryField,
            workshopSummaryNextSibling && workshopSummaryNextSibling.parentNode === workshopSummaryParent
              ? workshopSummaryNextSibling
              : null
          );
        }
        if (workshopSummaryHost) workshopSummaryHost.hidden = true;
        document.getElementById('lblSummary').textContent = t('editorSummaryLabel');
        tagsInput.placeholder = workshopDefaultTagPlaceholder;
        if (workshopTrainerField && workshopTrainerParent &&
            workshopTrainerField.parentNode !== workshopTrainerParent) {
          workshopTrainerParent.insertBefore(
            workshopTrainerField,
            workshopTrainerNextSibling && workshopTrainerNextSibling.parentNode === workshopTrainerParent
              ? workshopTrainerNextSibling
              : null
          );
        }
      }
      updateTrainingCategoryValidation(false);
    }

    initToolbar(document.getElementById('edToolbar'), contentEl, markDirty);

    function syncSlug() {
      p.slug = Store.slugify(titleEl.value || p.title, p.id);
      if (slugEl) slugEl.textContent = p.slug;
    }
    syncSlug();

    /* checklist */
    var isArabic = I18n.getLang() === 'ar';
    function projectTagCount() {
      var tags = p.tags.slice(0, 10);
      return tags.filter(function (tag, index) {
        return tags.findIndex(function (candidate) {
          return candidate.trim().toLocaleLowerCase() === tag.trim().toLocaleLowerCase();
        }) === index;
      }).length;
    }
    var CHECKS = isCourse ? [
      { label: isArabic ? (isWorkshopEditor ? 'اسم الورشة بالعربية' : 'اسم الدورة بالعربية') : (isWorkshopEditor ? 'Arabic workshop title' : 'Arabic course title'), done: function () { return !!titleEl.value.trim(); } },
      { label: isArabic ? (isWorkshopEditor ? 'اسم الورشة بالإنجليزية' : 'اسم الدورة بالإنجليزية') : (isWorkshopEditor ? 'English workshop title' : 'English course title'), done: function () { return !!titleEnglishEl.value.trim(); } },
      { label: isArabic ? (isWorkshopEditor ? 'صورة الورشة' : 'صورة الدورة') : (isWorkshopEditor ? 'Workshop image' : 'Course image'), done: function () { return !!p.cover; } },
      { label: isArabic ? 'الوصف القصير' : 'Short description', done: function () { return !!summaryEl.value.trim(); } },
      { label: isArabic ? 'الوصف الطويل (50 كلمة على الأقل)' : 'Long description (at least 50 words)', done: function () { return textOf(contentEl).trim().split(/\s+/).filter(Boolean).length >= 50; } },
      { label: isArabic ? 'التصنيف' : 'Category', done: function () { return !!categoryEl.value.trim(); } },
      { label: isArabic ? 'السعر' : 'Price', done: function () { return !!priceEl.value.trim(); } },
      { label: isArabic ? 'المدة' : 'Duration', done: function () { return Number(durationEl.value) > 0; } }
    ] : [
      { label: isArabic ? 'اسم المشروع' : 'Project title', done: function () { return !!titleEl.value.trim(); } },
      { label: isArabic ? 'صورة الغلاف' : 'Cover image', done: function () { return !!p.cover; } },
      { label: isArabic ? 'النبذة القصيرة' : 'Short summary', done: function () { return !!summaryEl.value.trim(); } },
      { label: isArabic ? 'وصف تفصيلي (50 كلمة على الأقل)' : 'Detailed description (at least 50 words)', done: function () { return textOf(contentEl).trim().split(/\s+/).filter(Boolean).length >= 50; } },
      { label: isArabic ? 'التصنيف' : 'Category', done: function () { return !!categoryEl.value.trim(); } },
      { label: isArabic ? 'ظهور المشروع' : 'Project visibility', done: function () { return ['public', 'courses', 'personal'].indexOf(visibilityEl && visibilityEl.value || p.visibility || 'public') >= 0; } },
      { label: isArabic ? 'ثلاثة تاقات على الأقل' : 'At least three tags', done: function () { return projectTagCount() >= 3; } },
      { label: isArabic ? 'التاريخ' : 'Date', done: function () { return !!dateEl.value; } }
    ];
    if (isCourse && (!isInPersonCourseEditor() || isWorkshopEditor)) {
      CHECKS.splice(CHECKS.length - 1, 0, {
        label: isArabic ? 'تاق واحد على الأقل' : 'At least one tag',
        done: function () { return p.tags.length > 0; },
        workshopOnlineOnly: isWorkshopEditor
      });
      CHECKS.push({
        label: isArabic ? 'قسم ودرس واحد على الأقل' : 'At least one section and lesson',
        done: function () {
          return p.syllabus.some(function (section) {
            return !!String(section.title || '').trim() &&
              (section.lessons || []).some(function (lesson) { return !!String(lesson.title || '').trim(); });
          });
        },
        workshopOnlineOnly: isWorkshopEditor
      });
    }
    function currentChecklist() {
      var checks = CHECKS.filter(function (check) {
        return !check.workshopOnlineOnly || !isInPersonCourseEditor();
      });
      if (!isCourse && roleEl && roleEl.value.trim()) {
        checks.push({
          label: isArabic ? 'دورك في المشروع (اختياري)' : 'Your project role (optional)',
          done: function () { return true; }
        });
      }
      if (!isCourse && demoEl.value.trim()) {
        checks.push({
          label: isArabic ? 'رابط المعاينة' : 'Preview link',
          done: function () { return isValidProjectUrl(demoEl.value.trim()); }
        });
      }
      if (isFreeOnlineWorkshop()) {
        checks.push({
          label: t('freeWorkshopSyllabusRule'),
          done: function () { return !freeWorkshopSyllabusIssue(); }
        });
      }
      return checks;
    }
    function updateChecklist() {
      var doneCount = 0;
      var checks = currentChecklist();
      var checklistHTML = checks.map(function (c) {
        var ok = !!c.done();
        if (ok) doneCount++;
        return '<div class="check-item' + (ok ? ' done' : '') + '"><span class="cbox">' + UI.icon('check', 12) + '</span>' + e(c.label) + '</div>';
      }).join('');
      var pct = checks.length ? Math.round(doneCount / checks.length * 100) : 0;
      document.querySelectorAll('[data-checklist-list], #edChecklist').forEach(function (list) { list.innerHTML = checklistHTML; });
      document.querySelectorAll('[data-checklist-bar], #edProgressBar').forEach(function (bar) { bar.style.width = pct + '%'; });
      document.querySelectorAll('[data-checklist-pct], #edProgressPct').forEach(function (label) {
        label.textContent = doneCount + '/' + checks.length + ' · ' + pct + '%';
        label.setAttribute('aria-label', isArabic
          ? doneCount + ' من ' + checks.length + ' متطلبات مكتملة'
          : doneCount + ' of ' + checks.length + ' requirements complete');
      });
    }
    if (isWorkshopEditor) syncWorkshopCourseMode();
    function coursePublishMissing() {
      var wordCount = textOf(contentEl).trim().split(/\s+/).filter(Boolean).length;
      var hasSyllabus = p.syllabus.some(function (section) {
        return !!String(section.title || '').trim() && (section.lessons || []).some(function (lesson) {
          return !!String(lesson.title || '').trim();
        });
      });
      var missing = [
        { key: 'title', missing: !titleEl.value.trim(), element: titleEl },
        { key: 'titleEnglish', missing: !titleEnglishEl.value.trim(), element: titleEnglishEl },
        { key: 'cover', missing: !p.cover, element: coverHost },
        { key: 'summary', missing: !summaryEl.value.trim(), element: summaryEl },
        { key: 'content', missing: !isInPersonCourseEditor() && wordCount < 50, element: contentEl },
        { key: 'category', missing: !isInPersonCourseEditor() && !categoryEl.value.trim(), element: categorySearchEl || categoryEl },
        { key: 'price', missing: !priceEl.value.trim(), element: priceEl },
        { key: 'priceMinimum', missing: trainerCoursePriceIsBelowMinimum(), element: priceEl },
        { key: 'duration', missing: !(Number(durationEl.value) > 0), element: durationEl },
        { key: 'tags', missing: !isInPersonCourseEditor() && !p.tags.length, element: tagsInput },
        { key: 'syllabus', missing: !isInPersonCourseEditor() && !hasSyllabus, element: document.getElementById('edSecAdd') }
      ].filter(function (field) { return field.missing; });
      var freeWorkshopIssue = isFreeOnlineWorkshop() ? freeWorkshopSyllabusIssue() : '';
      if (freeWorkshopIssue) {
        missing.unshift({
          key: freeWorkshopIssue,
          missing: true,
          element: document.getElementById('edSyllabus')
        });
      }
      return missing;
    }
    function coursePublishMessageKey(field) {
      var messages = {
        title: 'courseMissingTitle',
        titleEnglish: 'courseMissingTitleEnglish',
        cover: 'courseMissingCover',
        summary: 'courseMissingSummary',
        content: 'courseMissingContent',
        category: 'courseMissingCategory',
        price: 'courseMissingPrice',
        priceMinimum: 'coursePriceMinimum',
        duration: 'courseMissingDuration',
        tags: 'courseMissingTags',
        syllabus: 'courseMissingSyllabus',
        freeWorkshopSections: 'freeWorkshopSections',
        freeWorkshopLessons: 'freeWorkshopLessons',
        freeWorkshopFinalQuiz: 'freeWorkshopFinalQuiz',
        freeWorkshopQuizQuestions: 'freeWorkshopQuizQuestions'
      };
      return messages[field] || 'coursePublishFailure';
    }
    function projectPublishMissing() {
      var wordCount = textOf(contentEl).trim().split(/\s+/).filter(Boolean).length;
      var visibility = visibilityField && visibilityField.style.display !== 'none' && visibilityEl
        ? visibilityEl.value
        : (p.visibility || 'public');
      var fields = [
        { key: 'title', missing: !titleEl.value.trim(), element: titleEl },
        { key: 'cover', missing: !p.cover, element: coverHost },
        { key: 'summary', missing: !summaryEl.value.trim(), element: summaryEl },
        { key: 'content', missing: wordCount < 50, element: contentEl },
        { key: 'category', missing: !categoryEl.value.trim(), element: categorySearchEl || categoryEl },
        { key: 'demo', missing: !isValidProjectUrl(demoEl.value.trim()), element: demoEl },
        { key: 'visibility', missing: ['public', 'courses', 'personal'].indexOf(visibility) < 0, element: visibilityEl },
        { key: 'tags', missing: projectTagCount() < 3, element: tagsInput },
        { key: 'date', missing: !dateEl.value, element: dateEl }
      ];
      return fields.filter(function (field) { return field.missing; });
    }
    updateChecklist();

    /* cover */
    var coverHost = document.getElementById('edCoverHost');
    function renderCover() {
      if (p.cover) {
        coverHost.innerHTML = '<div class="cover-preview"><img src="' + e(p.cover) + '" alt="">' +
          '<div class="cover-tools">' +
          '<button class="btn-icon" id="cvReplace" title="' + e(t('replace')) + '">' + UI.icon('refresh-cw', 15) + '</button>' +
          '<button class="btn-icon" id="cvRemove" title="' + e(t('remove')) + '">' + UI.icon('trash', 15) + '</button>' +
          '</div></div>' +
          '<input type="file" accept="image/*" id="cvInput" class="hide">';
        coverHost.querySelector('#cvReplace').addEventListener('click', function () { coverHost.querySelector('#cvInput').click(); });
        coverHost.querySelector('#cvRemove').addEventListener('click', function () {
          p.cover = '';
          p.coverStorageName = '';
          renderCover();
          markDirty();
        });
        setupDropzone(coverHost.querySelector('.cover-preview'), coverHost.querySelector('#cvInput'), function (files) {
          UI.compressImage(files[0], 1600, 0.85).then(function (d) {
            p.cover = d;
            p.coverStorageName = '';
            renderCover();
            markDirty();
          });
        });
      } else {
        coverHost.innerHTML = '<div class="dropzone" id="cvDrop"><input type="file" accept="image/*">' +
          UI.icon('upload', 20) + '<span>' + e(t('dropImages')) + '</span><span class="tiny" style="color:var(--faint)">' + e(t('coverUpload')) + '</span></div>';
        setupDropzone(coverHost.querySelector('#cvDrop'), coverHost.querySelector('input'), function (files) {
          UI.compressImage(files[0], 1600, 0.85).then(function (d) {
            p.cover = d;
            p.coverStorageName = '';
            renderCover();
            markDirty();
          });
        });
      }
      updateChecklist();
      updateSocialPreview();
    }
    renderCover();

    /* tags */
    function renderTags() {
      tagsBox.querySelectorAll('.chip').forEach(function (c) { c.remove(); });
      p.tags.forEach(function (tag, i) {
        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = e(tag) + '<button class="chip-x" data-ti="' + i + '">' + UI.icon('x', 11) + '</button>';
        tagsBox.insertBefore(chip, tagsInput);
      });
      tagsBox.querySelectorAll('[data-ti]').forEach(function (b) {
        b.addEventListener('click', function () {
          p.tags.splice(+b.getAttribute('data-ti'), 1);
          renderTags(); markDirty();
        });
      });
      updateChecklist();
    }
    function addTag(val) {
      val = String(val || '').replace(/[#،,]/g, '').trim();
      if (val && p.tags.indexOf(val) < 0) { p.tags.push(val); renderTags(); markDirty(); }
    }
    tagsInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); addTag(tagsInput.value); tagsInput.value = ''; }
      else if (ev.key === 'Backspace' && !tagsInput.value && p.tags.length) { p.tags.pop(); renderTags(); markDirty(); }
    });
    tagsBox.addEventListener('click', function (ev) {
      if (ev.target === tagsBox || ev.target === tagsInput) tagsInput.focus();
    });
    renderTags();

    /* ---------- محرر الأقسام والدروس (لصفحة الدورات فقط) ---------- */

    function defaultQuiz() {
      return {
        instructions: '',
        maxAttempts: 3,
        questionsCount: 0,
        passScore: 60,
        shuffleQuestions: true,
        shuffleChoices: true,
        questions: [
          { text: '', explanation: '', choices: [{ text: '', correct: true }, { text: '', correct: false }] }
        ]
      };
    }

    function syllabusEntityKey(entity) {
      if (entity.id != null) return 'id:' + entity.id;
      if (!entity._editorKey) entity._editorKey = Store.uid('editor');
      return 'editor:' + entity._editorKey;
    }

    function lessonContentHTML(content) {
      var value = String(content || '');
      if (/<\/?[a-z][^>]*>/i.test(value)) {
        return UI.sanitize(value);
      }
      return e(value).replace(/\r?\n/g, '<br>');
    }

    function persistDeletionHistory() {
      try {
        if (pendingDeletionHistory.length) {
          localStorage.setItem(deletionHistoryKey, JSON.stringify(pendingDeletionHistory));
        } else {
          localStorage.removeItem(deletionHistoryKey);
        }
      } catch (error) {
        console.warn('تعذر حفظ سجل حذف الدورة محلياً.', error);
        UI.toast(t('deleteHistoryStorageFailed'), 'error');
      }
      renderDeletionHistory();
    }

    function clearDeletionHistory() {
      pendingDeletionHistory = [];
      persistDeletionHistory();
    }

    function quizBuilderHTML(ls, li, lessonKey, lessonOpen, freeWorkshopFinalQuiz) {
      var TYPE_OPTS = [
        { v: 'video', l: t('typeVideo') },
        { v: 'article', l: t('typeArticle') },
        { v: 'quiz', l: t('typeQuiz') },
        { v: 'project', l: t('typeProject') }
      ];
      var typeSel = '<select class="input syl-type" data-k="type">' +
        TYPE_OPTS.map(function (o) {
          return '<option value="' + o.v + '"' + (ls.type === o.v ? ' selected' : '') + '>' + e(o.l) + '</option>';
        }).join('') + '</select>';

      var body = '';
      if (ls.type === 'video' || ls.type === 'article') {
        var lessonToolbar = [
          { command: 'bold', icon: 'bold', title: 'editorBold' },
          { command: 'italic', icon: 'italic', title: 'editorItalic' },
          { command: 'formatBlock', value: '<h2>', icon: 'heading', title: 'editorHeading' },
          { command: 'insertUnorderedList', icon: 'list', title: 'editorBulletedList' },
          { command: 'insertOrderedList', icon: 'list-ordered', title: 'editorNumberedList' },
          { command: 'formatBlock', value: '<blockquote>', icon: 'quote', title: 'editorQuote' },
          { command: 'removeFormat', icon: 'x', title: 'editorRemoveFormatting' }
        ].map(function (item) {
          return '<button type="button" class="tb-btn" data-syl-cmd="' + item.command +
            '"' + (item.value ? ' data-syl-value="' + e(item.value) + '"' : '') +
            ' title="' + e(t(item.title)) + '" aria-label="' + e(t(item.title)) + '">' +
            UI.icon(item.icon, 16) + '</button>';
        }).join('');
        body = '<div class="syl-lesson-rich-editor">' +
          '<div class="editor-toolbar syl-lesson-toolbar" role="toolbar" aria-label="' +
          e(t('lessonContentLabel')) + '">' + lessonToolbar + '</div>' +
          '<div class="editable syl-lesson-editable" contenteditable="true" role="textbox" ' +
          'aria-multiline="true" spellcheck="true" data-k="content" data-ph="' +
          e(t('lessonContentLabel')) + '">' + lessonContentHTML(ls.content) + '</div>' +
          '</div>';
      } else {
        body = '<textarea class="textarea" rows="2" data-k="content" placeholder="' +
          e(ls.type === 'project' ? t('projectTaskLabel') : t('lessonContentLabel')) + '">' +
          e(ls.content || '') + '</textarea>';
      }
      if (ls.type === 'video') {
        body += '<input class="input" data-k="videoUrl" value="' + e(ls.videoUrl || '') + '" placeholder="' + e(t('lessonVideoLabel')) + '" dir="ltr">';
      }
      if (ls.type === 'project') {
        var projects = (typeof SITE.trainerProjects === 'function') ? SITE.trainerProjects() : [];
        projects = projects.filter(function (project) {
          return project.visibility !== 'personal';
        });
        var current = ls.projectId || '';
        if (current && !projects.some(function (pj) { return pj.id === current; })) {
          current = '';
        }
        var linked = projects.filter(function (pj) { return pj.id === current; })[0];
        body += '<div class="qzb-note proj-pick">' +
          '<label class="proj-pick-field"><span>' + UI.icon('briefcase', 14) + ' ' + e(t('projectPickLabel')) + '</span>' +
          '<div class="proj-picker" data-project-picker>' +
          '<input class="input proj-picker-search" type="search" role="combobox" ' +
          'aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" ' +
          'aria-controls="syl-project-options-' + e(lessonKey) + '" autocomplete="off" ' +
          'placeholder="' + e(t('projectPickSearchPlaceholder')) + '" value="' +
          e(linked ? (linked.title || linked.id) : '') + '" data-project-search>' +
          '<input type="hidden" data-k="projectId" value="' + e(current) + '">' +
          '<div class="proj-picker-options" id="syl-project-options-' + e(lessonKey) +
          '" role="listbox" hidden>' +
          '<button type="button" class="proj-picker-option" role="option" tabindex="-1" ' +
          'id="syl-project-option-' + e(lessonKey) + '-none" data-project-option data-project-id="" ' +
          'data-search="" aria-selected="' + (!current ? 'true' : 'false') + '">' +
          '<span class="proj-picker-option-icon">' + UI.icon('x', 15) + '</span>' +
          '<span class="proj-picker-option-meta"><b>' + e(t('projectPickNone')) + '</b></span></button>' +
          projects.map(function (pj, projectIndex) {
            var title = pj.title || pj.id;
            var searchable = [
              title,
              pj.summary || '',
              pj.category || '',
              Array.isArray(pj.tags) ? pj.tags.join(' ') : ''
            ].join(' ');
            return '<button type="button" class="proj-picker-option" role="option" tabindex="-1" ' +
              'id="syl-project-option-' + e(lessonKey) + '-' + projectIndex +
              '" data-project-option data-project-id="' + e(pj.id) + '" data-search="' +
              e(searchable.toLocaleLowerCase()) + '" aria-selected="' +
              (pj.id === current ? 'true' : 'false') + '">' +
              (pj.cover
                ? '<img class="proj-picker-option-cover" src="' + e(pj.cover) + '" alt="" loading="lazy" decoding="async">'
                : '<span class="proj-picker-option-icon">' + UI.icon('briefcase', 16) + '</span>') +
              '<span class="proj-picker-option-meta"><b>' + e(title) + '</b>' +
              (pj.summary ? '<span>' + e(pj.summary) + '</span>' : '') +
              '</span></button>';
          }).join('') +
          '<div class="proj-picker-empty" data-project-empty hidden>' +
          e(t('projectPickNoResults')) + '</div>' +
          '</div></div></label>';
        if (linked) {
          body += '<div class="proj-pick-preview">' +
            (linked.cover ? '<img class="proj-pick-cover" src="' + e(linked.cover) + '" alt="" loading="lazy" decoding="async">' : '') +
            '<div class="proj-pick-meta">' +
            '<b>' + e(linked.title) + '</b>' +
            (linked.summary ? '<span class="tiny muted">' + e(linked.summary) + '</span>' : '') +
            '<span class="tiny muted">' + e(t('projectPickCopyHint')) + '</span>' +
            '</div></div>';
        } else {
          body += '<div class="tiny muted">' + e(t('projectPickHint')) + '</div>';
        }
        body += '<div class="tiny muted">' + e(t('projectAutoHint')) + '</div>' +
          '</div>';
      }
      if (ls.type === 'quiz') {
        if (!ls.quiz) ls.quiz = defaultQuiz();
        var qz = ls.quiz;
        if (!qz.questions || !qz.questions.length) qz.questions = defaultQuiz().questions;
        var qCount = (qz.questions || []).length;
        var questionsHTML = (qz.questions || []).map(function (q, qi) {
          var choices = (q.choices || []).map(function (c, ci) {
            return '<div class="qzb-c' + (c.correct ? ' is-correct' : '') + '" data-qi="' + qi + '" data-ci="' + ci + '">' +
              '<button type="button" class="qzb-radio" data-qact="correct" role="radio" aria-checked="' + (c.correct ? 'true' : 'false') + '" title="' + e(t('quizCorrect')) + '">' +
              '<i></i></button>' +
              '<input class="input" data-cck="text" value="' + e(c.text || '') + '" placeholder="' + e(t('quizChoicePh')) + '">' +
              '<button type="button" class="btn-icon sm danger" data-qact="c-del" title="' + e(t('quizRemoveChoice')) + '">' + UI.icon('x', 13) + '</button>' +
              '</div>';
          }).join('');
          return '<div class="qzb-q" data-qi="' + qi + '">' +
            '<div class="qzb-q-head">' +
            '<span class="qzb-num">' + (qi + 1) + '</span>' +
            '<textarea class="textarea qzb-q-text" rows="2" data-qqk="text" placeholder="' + e(t('quizQuestionPh')) + '">' + e(q.text || '') + '</textarea>' +
            '<button type="button" class="btn-icon sm" data-qact="q-dup" title="' + e(t('quizDupQuestion')) + '">' + UI.icon('copy', 14) + '</button>' +
            '<button type="button" class="btn-icon sm danger" data-qact="q-del" title="' + e(t('quizRemoveQuestion')) + '">' + UI.icon('trash', 14) + '</button>' +
            '</div>' +
            '<div class="qzb-choices">' + choices + '</div>' +
            '<div class="qzb-q-foot">' +
            '<button type="button" class="btn btn-ghost btn-sm" data-qact="c-add"' + ((q.choices || []).length >= 6 ? ' disabled' : '') + '>' + UI.icon('plus', 13) + ' ' + e(t('quizAddChoice')) + '</button>' +
            '<input class="input qzb-expl" data-qqk="explanation" value="' + e(q.explanation || '') + '" placeholder="' + e(t('quizExplanation')) + '">' +
            '</div>' +
            '</div>';
        }).join('');

        body += '<div class="qzb">' +
          '<div class="qzb-head">' + UI.icon('help-circle', 16) + '<b>' + e(t('quizBuilder')) + '</b>' +
          '<span class="chip neutral">' + e(t('quizQCount', { n: qCount })) + '</span></div>' +
          '<div class="qzb-settings">' +
          '<label class="qzb-field"><span>' + e(t('quizMaxAttempts')) + '</span>' +
          '<input class="input" type="number" min="1" max="10" data-qk="maxAttempts" value="' + e(qz.maxAttempts != null ? qz.maxAttempts : 3) + '"></label>' +
          '<label class="qzb-field"><span>' + e(t('quizPassScore')) + '</span>' +
          '<input class="input" type="number" min="0" max="100" data-qk="passScore" value="' + e(qz.passScore != null ? qz.passScore : 60) + '"></label>' +
          '<label class="qzb-field qzb-wide"><span>' + e(t('quizPerAttempt')) + '</span>' +
          '<input class="input" type="number" min="0" data-qk="questionsCount" value="' + e(qz.questionsCount != null ? qz.questionsCount : 0) + '">' +
          '<i class="tiny muted">' + e(t('quizPerAttemptHint')) + '</i></label>' +
          '<label class="chip syl-free"><input type="checkbox" data-qk="shuffleQuestions"' + (qz.shuffleQuestions !== false ? ' checked' : '') + '> ' + e(t('quizShuffleQuestions')) + '</label>' +
          '<label class="chip syl-free"><input type="checkbox" data-qk="shuffleChoices"' + (qz.shuffleChoices !== false ? ' checked' : '') + '> ' + e(t('quizShuffleChoices')) + '</label>' +
          '</div>' +
          '<textarea class="textarea" rows="2" data-qk="instructions" placeholder="' + e(t('quizInstructions')) + '">' + e(qz.instructions || '') + '</textarea>' +
          '<div class="qzb-list">' + (qCount ? questionsHTML : '<div class="tiny muted">' + e(t('quizNoQuestions')) + '</div>') + '</div>' +
          '<button type="button" class="btn btn-soft btn-sm" data-qact="q-add">' + UI.icon('plus', 14) + ' ' + e(t('quizAddQuestion')) + '</button>' +
          '<div class="qzb-hint">' + UI.icon('info', 14) + ' ' + e(t('quizHint')) +
          (freeWorkshopFinalQuiz
            ? '<br>' + e(t('freeWorkshopQuizMinimum')) : '') + '</div>' +
          '</div>';
      }

      var lessonPanelId = 'edLessonDetails-' + li + '-' + String(lessonKey).replace(/[^a-zA-Z0-9_-]/g, '-');
      return '<div class="syl-lesson" data-li="' + (li != null ? li : 0) + '" data-lesson-key="' + e(lessonKey) + '">' +
        '<div class="syl-l-row">' +
        '<button type="button" class="btn-icon sm syl-lesson-toggle" data-act="lesson-toggle" aria-expanded="' + (lessonOpen ? 'true' : 'false') + '" aria-controls="' + lessonPanelId + '" title="' + e(t(lessonOpen ? 'closeSection' : 'openSection')) + '">' +
        '<span class="syl-lesson-toggle-icon" aria-hidden="true">' + UI.icon('chevron-down', 14) + '</span>' +
        '</button>' +
        '<input class="input syl-lesson-title" data-k="title" value="' + e(ls.title || '') + '" placeholder="' + e(t('lessonTitleLabel')) + '">' +
        '<button type="button" class="btn-icon sm danger" data-act="lesson-del" title="' + e(t('lessonDel')) + '">' + UI.icon('trash', 14) + '</button>' +
        '</div>' +
        '<div class="syl-lesson-details" id="' + lessonPanelId + '"' + (lessonOpen ? '' : ' hidden') + '>' +
        '<div class="syl-l-row syl-lesson-meta-row">' +
        '<input class="input syl-dur" data-k="duration" value="' + e(ls.duration || '') + '" placeholder="08:20" dir="ltr"' + (ls.type === 'video' ? '' : ' style="display:none"') + '>' +
        typeSel +
        '</div>' +
        body +
        '</div>' +
        '</div>';
    }

    var renderSyllabusBuilder = function () {};
    function initSyllabusBuilder() {
      var host = document.getElementById('edSyllabus');
      var secAddBtn = document.getElementById('edSecAdd');
      if (!host || !secAddBtn) return;
      var openSections = Object.create(null);
      var openLessons = Object.create(null);
      p.syllabus.forEach(function (section) {
        syllabusEntityKey(section);
        (section.lessons || []).forEach(syllabusEntityKey);
      });
      try {
        var savedDeletionHistory = JSON.parse(localStorage.getItem(deletionHistoryKey) || '[]');
        pendingDeletionHistory = Array.isArray(savedDeletionHistory)
          ? savedDeletionHistory.filter(function (item) {
            return item && (item.type === 'section' || item.type === 'lesson') &&
              item.snapshot && typeof item.sectionKey === 'string';
          })
          : [];
      } catch (error) {
        console.warn('تعذر تحميل سجل حذف الدورة المحلي.', error);
        pendingDeletionHistory = [];
      }

      function sectionByKey(key) {
        return p.syllabus.filter(function (section) {
          return syllabusEntityKey(section) === key;
        })[0] || null;
      }

      function replayDeletionHistory() {
        pendingDeletionHistory.forEach(function (entry) {
          var sectionIndex = p.syllabus.findIndex(function (section) {
            return syllabusEntityKey(section) === entry.sectionKey;
          });
          if (entry.type === 'section') {
            if (sectionIndex >= 0) p.syllabus.splice(sectionIndex, 1);
            return;
          }
          var section = sectionByKey(entry.sectionKey);
          if (!section) return;
          var lessonIndex = (section.lessons || []).findIndex(function (lesson) {
            return syllabusEntityKey(lesson) === entry.lessonKey;
          });
          if (lessonIndex >= 0) section.lessons.splice(lessonIndex, 1);
        });
      }

      function undoLastDeletion() {
        var historyEntry = pendingDeletionHistory[pendingDeletionHistory.length - 1];
        if (!historyEntry) return;
        if (historyEntry.type === 'section') {
          if (!sectionByKey(historyEntry.sectionKey)) {
            var restoredSection = JSON.parse(JSON.stringify(historyEntry.snapshot));
            p.syllabus.splice(
              Math.max(0, Math.min(historyEntry.sectionIndex, p.syllabus.length)),
              0,
              restoredSection
            );
            (restoredSection.lessons || []).forEach(function (lesson) {
              var isStillDeleted = pendingDeletionHistory.some(function (entry) {
                return entry.type === 'lesson' && entry.sectionKey === historyEntry.sectionKey &&
                  entry.lessonKey === syllabusEntityKey(lesson);
              });
              if (isStillDeleted) {
                restoredSection.lessons.splice(restoredSection.lessons.indexOf(lesson), 1);
              }
            });
          }
        } else {
          var parentSection = sectionByKey(historyEntry.sectionKey);
          if (parentSection) {
            var lessonExists = (parentSection.lessons || []).some(function (lesson) {
              return syllabusEntityKey(lesson) === historyEntry.lessonKey;
            });
            if (!lessonExists) {
              parentSection.lessons.splice(
                Math.max(0, Math.min(historyEntry.lessonIndex, parentSection.lessons.length)),
                0,
                JSON.parse(JSON.stringify(historyEntry.snapshot))
              );
            }
          } else {
            var deletedParent = pendingDeletionHistory.filter(function (entry) {
              return entry.type === 'section' && entry.sectionKey === historyEntry.sectionKey;
            })[0];
            if (!deletedParent) return;
            deletedParent.snapshot.lessons = deletedParent.snapshot.lessons || [];
            deletedParent.snapshot.lessons.splice(
              Math.max(0, Math.min(historyEntry.lessonIndex, deletedParent.snapshot.lessons.length)),
              0,
              JSON.parse(JSON.stringify(historyEntry.snapshot))
            );
          }
        }
        pendingDeletionHistory.pop();
        persistDeletionHistory();
        render();
        markSyllabusDirty();
      }

      replayDeletionHistory();
      if (pendingDeletionHistory.length) {
        syllabusDirty = true;
        dirty = true;
        setStatusDraft();
      }

      renderDeletionHistory = function () {
        var history = document.getElementById('edDeletionHistory');
        var title = document.getElementById('edDeletionHistoryTitle');
        var list = document.getElementById('edDeletionHistoryList');
        if (!history || !title || !list) return;
        history.hidden = !pendingDeletionHistory.length;
        title.textContent = t('deleteHistoryTitle');
        list.innerHTML = pendingDeletionHistory.map(function (entry, index) {
          var entryName = entry.name || t(entry.type === 'section' ? 'secDel' : 'lessonDel');
          var undo = index === pendingDeletionHistory.length - 1
            ? '<button class="btn btn-ghost btn-sm" type="button" data-act="delete-undo">' +
              UI.icon('undo-2', 14) + ' ' + e(t('deleteHistoryUndo')) + '</button>'
            : '<span class="tiny muted">' + e(t('deleteHistoryUndoLatest')) + '</span>';
          return '<div class="course-delete-history-item"><span>' +
            UI.icon('trash', 14) + ' ' + e(entryName) + '</span>' + undo + '</div>';
        }).join('');
      };
      var deletionHistoryList = document.getElementById('edDeletionHistoryList');
      if (deletionHistoryList) {
        deletionHistoryList.addEventListener('click', function (event) {
          var undoButton = event.target.closest('[data-act="delete-undo"]');
          if (undoButton) undoLastDeletion();
        });
      }
      document.addEventListener('course-editor:discard-pending-changes', clearDeletionHistory);

      secAddBtn.innerHTML = UI.icon('plus', 15) + e(t('secAdd'));

      function render() {
        var freeWorkshop = isFreeOnlineWorkshop();
        secAddBtn.disabled = freeWorkshop && p.syllabus.length >= 1;
        secAddBtn.title = secAddBtn.disabled ? t('freeWorkshopSections') : '';
        var freeWorkshopHint = freeWorkshop
          ? '<div class="tiny muted free-workshop-rule-hint">' +
            e(t('freeWorkshopStructureLimit')) + '</div>'
          : '';
        if (!p.syllabus.length) {
          host.innerHTML = freeWorkshopHint +
            '<div class="tiny muted" style="padding:8px 2px">' + UI.icon('list', 16) + ' ' + e(t('syllabusEmpty')) + '</div>';
          renderDeletionHistory();
          updateChecklist();
          return;
        }
        host.innerHTML = freeWorkshopHint + p.syllabus.map(function (sec, si) {
          var sectionKey = String(sec.id != null ? sec.id : 'new-' + si);
          var sectionOpen = openSections[sectionKey] === true;
          var lessonsPanelId = 'edSectionLessons-' + si;
          var lastTitledLessonIndex = -1;
          (sec.lessons || []).forEach(function (lesson, lessonIndex) {
            if (lesson && String(lesson.title || '').trim()) {
              lastTitledLessonIndex = lessonIndex;
            }
          });
          var lessons = (sec.lessons || []).map(function (ls, li) {
            if (ls.type == null) ls.type = 'video';
            var lessonKey = sectionKey + '-' + String(ls.id != null ? ls.id : 'new-' + li);
            var lessonOpen = openLessons[lessonKey] === true;
            return quizBuilderHTML(
              ls,
              li,
              lessonKey,
              lessonOpen,
              freeWorkshop && li === lastTitledLessonIndex
            );
          }).join('');
          return '<div class="syl-section" data-si="' + si + '">' +
            '<div class="syl-sec-head">' +
            '<input class="input syl-sec-title" data-sec="title" value="' + e(sec.title || '') + '" placeholder="' + e(t('secTitle')) + '">' +
            '<button type="button" class="btn btn-soft btn-sm syl-section-toggle" data-act="sec-toggle" aria-expanded="' + (sectionOpen ? 'true' : 'false') + '" aria-controls="' + lessonsPanelId + '">' +
            '<span>' + e(t('sectionLessons')) + ' (' + (sec.lessons || []).length + ')</span>' +
            '<span class="syl-section-toggle-icon" aria-hidden="true">' + UI.icon('chevron-down', 14) + '</span>' +
            '</button>' +
            '<button type="button" class="btn-icon sm danger" data-act="sec-del" title="' + e(t('secDel')) + '">' + UI.icon('trash', 14) + '</button>' +
            '</div>' +
            '<div class="syl-section-lessons" id="' + lessonsPanelId + '"' + (sectionOpen ? '' : ' hidden') + '>' +
            '<div class="syl-lessons">' + lessons + '</div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="sec-add-lesson"' +
            (freeWorkshop && (sec.lessons || []).length >= 3
              ? ' disabled title="' + e(t('freeWorkshopLessons')) + '"' : '') + '>' +
            UI.icon('plus', 14) + e(t('lessonAdd')) + '</button>' +
            '</div>' +
            '</div>';
        }).join('');
        host.querySelectorAll('.syl-lesson-toolbar').forEach(function (toolbar) {
          toolbar.addEventListener('pointerdown', function (event) {
            var editable = toolbar.parentElement.querySelector('[data-k="content"]');
            var selection = document.getSelection();
            if (editable && selection && selection.rangeCount &&
              editable.contains(selection.anchorNode) && editable.contains(selection.focusNode)) {
              toolbar._lessonSelection = selection.getRangeAt(0).cloneRange();
            }
            if (event.pointerType === 'mouse') event.preventDefault();
          });
          toolbar.addEventListener('mousedown', function (event) {
            event.preventDefault();
          });
        });
        renderDeletionHistory();
        updateChecklist();
      }
      renderSyllabusBuilder = render;

      host.addEventListener('course:restore-version', function (event) {
        p.syllabus = Array.isArray(event.detail) ? event.detail : [];
        p.syllabus.forEach(function (section) {
          syllabusEntityKey(section);
          (section.lessons || []).forEach(syllabusEntityKey);
        });
        render();
        markSyllabusDirty();
      });

      function lessonFromEl(el) {
        var secEl = el.closest('.syl-section');
        var lesEl = el.closest('.syl-lesson');
        if (!secEl || !lesEl) return null;
        var sec = p.syllabus[+secEl.getAttribute('data-si')];
        if (!sec) return null;
        var ls = (sec.lessons || [])[+lesEl.getAttribute('data-li')];
        return ls || null;
      }

      function onEdit(ev) {
        var el = ev.target;
        if (!el.closest) return;
        var secEl = el.closest('.syl-section');
        if (!secEl) return;
        var sec = p.syllabus[+secEl.getAttribute('data-si')];
        if (!sec) return;
        if (el.getAttribute('data-sec') === 'title') { sec.title = el.value; markSyllabusDirty(); return; }

        /* حقول الكويز: إعدادات ثم أسئلة ثم اختيارات */
        var qk = el.getAttribute('data-qk');
        var qqk = el.getAttribute('data-qqk');
        var cck = el.getAttribute('data-cck');
        if (qk || qqk || cck) {
          var ls = lessonFromEl(el);
          if (!ls) return;
          if (!ls.quiz) ls.quiz = defaultQuiz();
          if (qk) {
            ls.quiz[qk] = el.type === 'checkbox' ? el.checked
              : (el.type === 'number' ? (el.value === '' ? '' : +el.value) : el.value);
          } else if (qqk) {
            var qEl = el.closest('[data-qi]');
            var q = qEl && ls.quiz.questions[+qEl.getAttribute('data-qi')];
            if (q) q[qqk] = el.value;
          } else if (cck) {
            var cEl = el.closest('.qzb-c');
            var q2 = cEl && ls.quiz.questions[+cEl.getAttribute('data-qi')];
            var c = q2 && (q2.choices || [])[+cEl.getAttribute('data-ci')];
            if (c) c[cck] = el.value;
          }
          markSyllabusDirty();
          return;
        }

        if (el.matches('[data-project-search]')) {
          if (ev.type === 'input') updateProjectPicker(el, el.value);
          return;
        }

        var k = el.getAttribute('data-k');
        if (!k) return;
        var lesEl = el.closest('.syl-lesson');
        if (!lesEl) return;
        var lessons = sec.lessons || [];
        var ls2 = lessons[+lesEl.getAttribute('data-li')];
        if (!ls2) return;
        if (k === 'free') ls2.free = !!el.checked;
        else if (k === 'content' && el.isContentEditable) ls2[k] = UI.sanitize(el.innerHTML);
        else ls2[k] = el.value;
        if (k === 'type') {
          if (ls2.type === 'quiz' && !ls2.quiz) ls2.quiz = defaultQuiz();
          if (ls2.type !== 'project') ls2.projectId = '';
          render();
        } else if (k === 'projectId') {
          render();
        }
        markSyllabusDirty();
      }
      host.addEventListener('input', onEdit);
      host.addEventListener('change', onEdit);

      function updateProjectPicker(input, query) {
        var picker = input.closest('[data-project-picker]');
        if (!picker) return;
        var options = picker.querySelector('.proj-picker-options');
        var empty = picker.querySelector('[data-project-empty]');
        var normalized = String(query || '').trim().toLocaleLowerCase();
        var terms = normalized ? normalized.split(/\s+/) : [];
        var visibleCount = 0;
        options.querySelectorAll('[data-project-option]').forEach(function (option) {
          var searchable = option.getAttribute('data-search') || '';
          var matches = terms.every(function (term) {
            return searchable.indexOf(term) >= 0;
          });
          option.hidden = !matches;
          option.classList.remove('is-active');
          if (matches) visibleCount += 1;
        });
        empty.hidden = visibleCount > 0;
        options.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        input.removeAttribute('aria-activedescendant');
      }

      function closeProjectPicker(picker) {
        var input = picker.querySelector('[data-project-search]');
        var options = picker.querySelector('.proj-picker-options');
        var selected = picker.querySelector('[data-k="projectId"]');
        var selectedOption = Array.prototype.find.call(
          picker.querySelectorAll('[data-project-option]'),
          function (option) {
            return option.getAttribute('data-project-id') === selected.value;
          }
        );
        options.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        input.value = selectedOption
          ? selectedOption.querySelector('.proj-picker-option-meta b').textContent
          : '';
      }

      host.addEventListener('focusin', function (event) {
        var input = event.target.closest && event.target.closest('[data-project-search]');
        if (input) {
          if (input.value) input.select();
          updateProjectPicker(input, '');
        }
      });

      host.addEventListener('focusout', function (event) {
        var picker = event.target.closest && event.target.closest('[data-project-picker]');
        if (picker && !picker.contains(event.relatedTarget)) {
          window.setTimeout(function () {
            if (!picker.contains(document.activeElement)) closeProjectPicker(picker);
          }, 0);
        }
      });

      host.addEventListener('keydown', function (event) {
        var input = event.target.closest && event.target.closest('[data-project-search]');
        if (!input) return;
        var picker = input.closest('[data-project-picker]');
        var options = picker.querySelector('.proj-picker-options');
        if (event.key === 'Escape') {
          closeProjectPicker(picker);
          return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
          if (event.key === 'Enter' && !options.hidden) {
            var activeId = input.getAttribute('aria-activedescendant');
            var activeOption = activeId && document.getElementById(activeId);
            if (activeOption) {
              event.preventDefault();
              activeOption.click();
            }
          }
          return;
        }
        event.preventDefault();
        if (options.hidden) updateProjectPicker(input, input.value);
        var visibleOptions = Array.prototype.slice.call(
          options.querySelectorAll('[data-project-option]:not([hidden])')
        );
        if (!visibleOptions.length) return;
        var activeIndex = visibleOptions.findIndex(function (option) {
          return option.id === input.getAttribute('aria-activedescendant');
        });
        activeIndex = event.key === 'ArrowDown'
          ? Math.min(activeIndex + 1, visibleOptions.length - 1)
          : Math.max(activeIndex - 1, 0);
        visibleOptions.forEach(function (option, index) {
          option.classList.toggle('is-active', index === activeIndex);
        });
        input.setAttribute('aria-activedescendant', visibleOptions[activeIndex].id);
        visibleOptions[activeIndex].scrollIntoView({ block: 'nearest' });
      });

      host.addEventListener('click', function (ev) {
        if (!ev.target.closest('[data-project-picker]')) {
          host.querySelectorAll('[data-project-picker]').forEach(closeProjectPicker);
        }
        var projectOption = ev.target.closest ? ev.target.closest('[data-project-option]') : null;
        if (projectOption) {
          ev.preventDefault();
          var projectLesson = lessonFromEl(projectOption);
          if (!projectLesson) return;
          projectLesson.projectId = projectOption.getAttribute('data-project-id') || '';
          markSyllabusDirty();
          render();
          return;
        }
        var formatButton = ev.target.closest ? ev.target.closest('[data-syl-cmd]') : null;
        if (formatButton) {
          ev.preventDefault();
          var lessonEditor = formatButton.closest('.syl-lesson-rich-editor');
          var editable = lessonEditor && lessonEditor.querySelector('[data-k="content"]');
          var lesson = lessonFromEl(formatButton);
          if (!editable || !lesson) return;
          editable.focus();
          var toolbar = formatButton.closest('.syl-lesson-toolbar');
          var selection = document.getSelection();
          if (toolbar && toolbar._lessonSelection && selection) {
            selection.removeAllRanges();
            selection.addRange(toolbar._lessonSelection);
            toolbar._lessonSelection = null;
          }
          try {
            executeEditorCommand(
              formatButton.getAttribute('data-syl-cmd'),
              formatButton.getAttribute('data-syl-value')
            );
            lesson.content = UI.sanitize(editable.innerHTML);
            markSyllabusDirty();
          } catch (error) {
            console.error('تعذر تنسيق محتوى الدرس.', error);
            UI.toast(t('editorCommandFailed'), 'error');
          }
          return;
        }
        var qBtn = ev.target.closest ? ev.target.closest('[data-qact]') : null;
        if (qBtn) {
          var lesEl = qBtn.closest('.syl-lesson');
          var ls = lesEl ? lessonFromEl(qBtn) : null;
          if (!ls) return;
          if (!ls.quiz) ls.quiz = defaultQuiz();
          var qz = ls.quiz;
          qz.questions = qz.questions || [];
          var act = qBtn.getAttribute('data-qact');
          var qWrap = qBtn.closest('[data-qi]');
          var qi = qWrap ? +qWrap.getAttribute('data-qi') : -1;
          if (act === 'q-add') {
            qz.questions.push({ text: '', explanation: '', choices: [{ text: '', correct: true }, { text: '', correct: false }] });
          } else if (act === 'q-del' && qi >= 0) {
            qz.questions.splice(qi, 1);
          } else if (act === 'q-dup' && qi >= 0) {
            var src = qz.questions[qi];
            qz.questions.splice(qi + 1, 0, JSON.parse(JSON.stringify(src)));
          } else if (qi >= 0 && qz.questions[qi]) {
            var q = qz.questions[qi];
            q.choices = q.choices || [];
            var cWrap = qBtn.closest('.qzb-c');
            var ci = cWrap ? +cWrap.getAttribute('data-ci') : -1;
            if (act === 'c-add' && q.choices.length < 6) {
              q.choices.push({ text: '', correct: false });
            } else if (act === 'c-del' && ci >= 0) {
              if (q.choices.length > 2) q.choices.splice(ci, 1);
              else { UI.toast(t('quizMinChoices'), 'info'); return; }
            } else if (act === 'correct' && ci >= 0) {
              q.choices.forEach(function (c, i) { c.correct = i === ci; });
            } else {
              return;
            }
          } else {
            return;
          }
          render();
          markSyllabusDirty();
          return;
        }

        var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
        if (!btn) return;
        if (btn.getAttribute('data-act') === 'lesson-toggle') {
          var lessonEl = btn.closest('.syl-lesson');
          if (!lessonEl) return;
          var lessonKey = lessonEl.getAttribute('data-lesson-key');
          openLessons[lessonKey] = openLessons[lessonKey] !== true;
          render();
          return;
        }
        var secEl = btn.closest('.syl-section');
        if (!secEl) return;
        var sec = p.syllabus[+secEl.getAttribute('data-si')];
        if (!sec) return;
        var act2 = btn.getAttribute('data-act');
        if (act2 === 'sec-toggle') {
          var sectionKey = String(sec.id != null ? sec.id : 'new-' + secEl.getAttribute('data-si'));
          openSections[sectionKey] = openSections[sectionKey] !== true;
          render();
          return;
        } else if (act2 === 'sec-del') {
          var sectionIndex = +secEl.getAttribute('data-si');
          var sectionToDelete = p.syllabus[sectionIndex];
          if (!sectionToDelete) return;
          UI.confirm(t('sectionDeleteConfirm')).then(function (confirmed) {
            if (!confirmed || p.syllabus[sectionIndex] !== sectionToDelete) return;
            pendingDeletionHistory.push({
              type: 'section',
              sectionKey: syllabusEntityKey(sectionToDelete),
              sectionIndex: sectionIndex,
              name: sectionToDelete.title || t('secDel'),
              snapshot: JSON.parse(JSON.stringify(sectionToDelete)),
              deletedAt: new Date().toISOString()
            });
            p.syllabus.splice(sectionIndex, 1);
            persistDeletionHistory();
            render();
            markSyllabusDirty();
          });
          return;
        } else if (act2 === 'sec-add-lesson') {
          sec.lessons = sec.lessons || [];
          if (isFreeOnlineWorkshop() && sec.lessons.length >= 3) {
            UI.toast(t('freeWorkshopLessons'), 'info');
            return;
          }
          sec.lessons.push({ title: '', duration: '', type: 'video', free: false, content: '', videoUrl: '' });
        } else if (act2 === 'lesson-del') {
          var lesEl2 = btn.closest('.syl-lesson');
          if (lesEl2) {
            var lessonIndex = +lesEl2.getAttribute('data-li');
            var lessonToDelete = (sec.lessons || [])[lessonIndex];
            if (!lessonToDelete) return;
            UI.confirm(t('lessonDeleteConfirm')).then(function (confirmed) {
              if (!confirmed) return;
              if (p.syllabus.indexOf(sec) === -1 || sec.lessons[lessonIndex] !== lessonToDelete) return;
              pendingDeletionHistory.push({
                type: 'lesson',
                sectionKey: syllabusEntityKey(sec),
                lessonKey: syllabusEntityKey(lessonToDelete),
                sectionIndex: p.syllabus.indexOf(sec),
                lessonIndex: lessonIndex,
                name: lessonToDelete.title || t('lessonDel'),
                snapshot: JSON.parse(JSON.stringify(lessonToDelete)),
                deletedAt: new Date().toISOString()
              });
              sec.lessons.splice(lessonIndex, 1);
              persistDeletionHistory();
              render();
              markSyllabusDirty();
            });
            return;
          }
        } else {
          return;
        }
        render();
        markSyllabusDirty();
      });

      secAddBtn.addEventListener('click', function () {
        if (isFreeOnlineWorkshop() && p.syllabus.length >= 1) {
          UI.toast(t('freeWorkshopSections'), 'info');
          return;
        }
        p.syllabus.push({
          title: '',
          lessons: [{ title: '', duration: '', type: 'video', free: false, content: '', videoUrl: '' }]
        });
        render();
        markSyllabusDirty();
      });

      render();
    }
    if (isCourse) initSyllabusBuilder();
    if (activeWorkshopEditor) {
      var previousFreeWorkshopPrice = isFreeOnlineWorkshop();
      priceEl.addEventListener('input', function () {
        var freeWorkshop = isFreeOnlineWorkshop();
        if (freeWorkshop !== previousFreeWorkshopPrice) {
          previousFreeWorkshopPrice = freeWorkshop;
          renderSyllabusBuilder();
          updateChecklist();
        }
      });

      priceEl.addEventListener('change', function () {
        var freeWorkshop = isFreeOnlineWorkshop();
        if (freeWorkshop !== previousFreeWorkshopPrice) {
          previousFreeWorkshopPrice = freeWorkshop;
          renderSyllabusBuilder();
          updateChecklist();
        }
      });
    }

    function initCourseVersionHistory() {
      var historyHost = document.getElementById('edVersionHistory');
      var syllabusHost = document.getElementById('edSyllabus');
      var versionSelect = document.getElementById('edVersionSelect');
      var previousButton = document.getElementById('edVersionPrev');
      var nextButton = document.getElementById('edVersionNext');
      var loadButton = document.getElementById('edVersionLoad');
      var versionTitle = document.getElementById('edVersionTitle');
      var versionCount = document.getElementById('edVersionCount');
      if (!historyHost || !versionSelect || !previousButton || !nextButton || !loadButton) return;

      var versions = [];
      var selectedIndex = -1;
      versionSelect.setAttribute(
        'aria-label',
        replaceCourseText(versionSelect.getAttribute('aria-label'))
      );
      versionTitle.textContent = t('versionHistoryTitle');
      previousButton.innerHTML = UI.icon('chevron-right', 14);
      previousButton.title = t('versionHistoryPrevious');
      nextButton.innerHTML = UI.icon('chevron-left', 14);
      nextButton.title = t('versionHistoryNext');
      loadButton.textContent = t('versionHistoryLoad');

      function updateControls() {
        historyHost.hidden = !versions.length;
        versionCount.textContent = t('versionHistoryCount', { count: versions.length });
        versionSelect.innerHTML = versions.map(function (version, index) {
          var publishedAt = new Date(version.createdAt);
          var dateLabel = isNaN(publishedAt.getTime())
            ? ''
            : ' · ' + publishedAt.toLocaleString(I18n.getLang() === 'en' ? 'en' : 'ar');
          return '<option value="' + index + '">' + e('#' + version.number + dateLabel) + '</option>';
        }).join('');
        if (selectedIndex >= 0) versionSelect.value = String(selectedIndex);
        previousButton.disabled = selectedIndex <= 0;
        nextButton.disabled = selectedIndex < 0 || selectedIndex >= versions.length - 1;
      }

      function selectVersion(index) {
        if (index < 0 || index >= versions.length) return;
        selectedIndex = index;
        versionSelect.value = String(index);
        updateControls();
      }

      function loadSelectedVersion() {
        if (selectedIndex < 0 || !versions[selectedIndex]) return;
        var confirmLoad = pendingDeletionHistory.length
          ? UI.confirm(t('versionHistoryDiscardDeletes'))
          : Promise.resolve(true);
        confirmLoad.then(function (allowPendingDeleteDiscard) {
          if (!allowPendingDeleteDiscard) return false;
          return UI.confirm(t('versionHistoryConfirm'));
        }).then(function (confirmed) {
          if (!confirmed) return;
          var url = SITE.u('courseVersions', p.id) + '?version=' +
            encodeURIComponent(versions[selectedIndex].number);
          fetch(url, { credentials: 'same-origin' })
            .then(function (response) {
              if (!response.ok) throw new Error('version_load_failed');
              return response.json();
            })
            .then(function (result) {
              if (!result.ok || !result.snapshot) throw new Error('version_snapshot_missing');
              if (pendingDeletionHistory.length) clearDeletionHistory();
              var snapshot = result.snapshot;
              p.title = snapshot.title || '';
              p.titleEnglish = snapshot.titleEnglish || '';
              p.summary = snapshot.summary || snapshot.description || '';
              p.description = p.summary;
              p.courseType = snapshot.courseType === 'in_person' ? 'in_person' : 'online';
              p.inPersonKind = snapshot.inPersonKind === 'workshop' ? 'workshop' : 'course';
              p.category = snapshot.category || '';
              p.content = snapshot.content || '';
              p.price = snapshot.price || '';
              p.currency = snapshot.currency === 'USD' || String(snapshot.price || '').indexOf('$') === 0
                ? 'USD'
                : 'ILS';
              p.duration = snapshot.duration || '';
              p.period = snapshot.period || '';
              p.isComplete = snapshot.isComplete !== false;
              p.comingSoon = snapshot.comingSoon === true;
              p.credentialId = snapshot.credentialId || '';
              p.verifyUrl = snapshot.verifyUrl || '';
              p.tags = Array.isArray(snapshot.skills) ? snapshot.skills.slice() : [];
              p.cover = snapshot.cover || '';
              p.coverStorageName = snapshot.coverStorageName || '';
              p.status = 'draft';

              titleEl.value = p.title;
              if (titleEnglishEl) titleEnglishEl.value = p.titleEnglish;
              summaryEl.value = p.summary;
              if (courseTypeEl) {
                courseTypeEl.value = p.courseType;
                syncCourseTypeChoices(courseTypeEl.value);
                if (inPersonKindEl) {
                  inPersonKindEl.value = p.inPersonKind;
                  syncInPersonKindChoices(inPersonKindEl.value);
                }
                syncInPersonKindVisibility();
              }
              categoryEl.value = p.category;
              contentEl.innerHTML = p.content;
              priceEl.value = String(p.price).replace(/[₪$\s]/g, '');
              if (currencyEl) currencyEl.value = p.currency;
              durationEl.value = durationHours(p.duration, snapshot.durationEnglish);
              var periodMatch = String(p.period).match(/[0-9٠-٩۰-۹]+/);
              periodEl.value = periodMatch
                ? periodMatch[0].replace(/[٠-٩۰-۹]/g, function (digit) {
                  return String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10);
                })
                : '';
              if (courseCompletionEl) {
                courseCompletionEl.value = p.comingSoon
                  ? 'coming_soon'
                  : (p.isComplete ? 'complete' : 'incomplete');
              }
              if (trainerEl && snapshot.trainerId) trainerEl.value = String(snapshot.trainerId);
              renderCover();
              renderTags();
              syllabusHost.dispatchEvent(new CustomEvent('course:restore-version', {
                detail: Array.isArray(snapshot.syllabus) ? snapshot.syllabus : []
              }));
              versionRestorePending = true;
              markDirty();
              setStatusDraft();
              UI.toast(t('versionHistoryLoaded'), 'success');
            })
            .catch(function (error) {
              console.error('تعذر تحميل نسخة الدورة.', error);
              UI.toast(t('versionHistoryFailed'), 'error');
            });
        });
      }

      versionSelect.addEventListener('change', function () {
        selectVersion(+versionSelect.value);
      });
      previousButton.addEventListener('click', function () { selectVersion(selectedIndex - 1); });
      nextButton.addEventListener('click', function () { selectVersion(selectedIndex + 1); });
      loadButton.addEventListener('click', loadSelectedVersion);

      if (!existing) return;
      fetch(SITE.u('courseVersions', p.id), { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('version_list_failed');
          return response.json();
        })
        .then(function (result) {
          if (!result.ok || !Array.isArray(result.versions)) throw new Error('version_list_missing');
          versions = result.versions;
          selectedIndex = versions.length - 1;
          updateControls();
        })
        .catch(function (error) {
          console.error('تعذر تحميل سجل نسخ الدورة.', error);
        });
    }

    if (isCourse) initCourseVersionHistory();

    if (!isCourse) {
      var projectGalleryInput = document.getElementById('edProjectGalleryInput');
      var projectGalleryDrop = document.getElementById('edProjectGalleryDrop');
      var projectGalleryList = document.getElementById('edProjectGalleryList');
      var projectGalleryCount = document.getElementById('edProjectGalleryCount');
      var projectGalleryMax = Number(projectGalleryInput.getAttribute('data-max-images')) || 5;
      var projectGalleryProcessing = false;
      document.getElementById('lblProjectGallery').textContent = t('projectGalleryLabel');
      projectGalleryDrop.querySelector('.dz-ic').innerHTML = UI.icon('image', 20);
      projectGalleryDrop.querySelector('.dz-label').textContent = t('projectGalleryAdd');
      function renderProjectGallery() {
        projectGalleryCount.textContent = t('projectGalleryCount')
          .replace('{count}', String(p.gallery.length))
          .replace('{max}', String(projectGalleryMax));
        projectGalleryList.innerHTML = p.gallery.map(function (src, index) {
          return '<div class="gallery-edit-item">' +
            '<img src="' + e(src) + '" alt="" loading="lazy" decoding="async">' +
            '<button type="button" class="gi-x" data-project-gallery-remove="' + index +
            '" aria-label="' + e(t('projectGalleryRemove')) + '">' + UI.icon('x', 12) + '</button>' +
            '</div>';
        }).join('');
        projectGalleryList.querySelectorAll('[data-project-gallery-remove]').forEach(function (button) {
          button.addEventListener('click', function () {
            p.gallery.splice(Number(button.getAttribute('data-project-gallery-remove')), 1);
            renderProjectGallery();
            markDirty();
          });
        });
        projectGalleryDrop.hidden = p.gallery.length >= projectGalleryMax;
      }
      function addProjectGalleryFiles(files) {
        if (projectGalleryProcessing) return;
        var imageFiles = files.filter(function (file) {
          return file && (file.type || '').indexOf('image/') === 0;
        });
        if (imageFiles.length !== files.length) {
          UI.toast(t('projectGalleryImagesOnly'), 'error');
          return;
        }
        if (p.gallery.length + imageFiles.length > projectGalleryMax) {
          UI.toast(t('projectGalleryLimit').replace('{max}', String(projectGalleryMax)), 'error');
          return;
        }
        if (!imageFiles.length) return;
        projectGalleryProcessing = true;
        projectGalleryInput.disabled = true;
        Promise.all(imageFiles.map(function (file) {
          return UI.compressImage(file, 1600, 0.84).then(function (dataUrl) {
            if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:image/jpeg;base64,') !== 0) {
              throw new Error('gallery_image_compression_failed');
            }
            return dataUrl;
          });
        })).then(function (compressedImages) {
          p.gallery = p.gallery.concat(compressedImages);
          renderProjectGallery();
          markDirty();
        }).catch(function (error) {
          console.error('تعذر تجهيز صور معرض المشروع.', error);
          UI.toast(t('editorImageFailed'), 'error');
        }).then(function () {
          projectGalleryProcessing = false;
          projectGalleryInput.disabled = false;
        });
      }
      setupDropzone(projectGalleryDrop, projectGalleryInput, addProjectGalleryFiles);
      renderProjectGallery();

      /* files */
      var filesList = document.getElementById('edFilesList');
      function renderFiles() {
        filesList.innerHTML = p.files.map(function (f, i) {
          return '<div class="file-row"><span class="file-ic">' + UI.icon('file-text', 16) + '</span>' +
            '<div class="file-meta"><b>' + e(f.name) + '</b><span>' + e(UI.fileSize(f.size)) + (f.dataUrl ? '' : ' · ' + e(t('optional'))) + '</span></div>' +
            '<button class="btn-icon sm danger" data-fi="' + i + '">' + UI.icon('trash', 14) + '</button></div>';
        }).join('');
        filesList.querySelectorAll('[data-fi]').forEach(function (b) {
          b.addEventListener('click', function () {
            p.files.splice(+b.getAttribute('data-fi'), 1);
            renderFiles(); markDirty();
          });
        });
        updateChecklist();
      }
      var filesDrop = document.getElementById('edFilesDrop');
      filesDrop.querySelector('.dz-ic').innerHTML = UI.icon('upload', 20);
      filesDrop.querySelector('.dz-label').textContent = t('filesDrop');
      setupDropzone(filesDrop, document.getElementById('edFilesInput'), function (files) {
        Promise.all(files.map(function (f) {
          if (f.size <= 2 * 1024 * 1024) {
            return UI.readFileDataURL(f).then(function (d) {
              return { id: Store.uid('f'), name: f.name, size: f.size, type: f.type, dataUrl: d };
            });
          }
          UI.toast(t('fileTooBig'), 'info');
          return Promise.resolve({ id: Store.uid('f'), name: f.name, size: f.size, type: f.type, dataUrl: '' });
        })).then(function (list) {
          p.files = p.files.concat(list);
          renderFiles(); markDirty();
        });
      });
      renderFiles();
    }

    /* templates */
    var tplEls = Array.prototype.slice.call(document.querySelectorAll('[data-editor-templates]'));
    var availableTemplates = isCourse ? COURSE_TEMPLATES : TEMPLATES;
    var templatesHTML = availableTemplates.map(function (tpl, i) {
      var label = replaceCourseText(
        I18n.getLang() === 'en' && tpl.labelEn ? tpl.labelEn : tpl.label
      );
      return '<button class="tpl-btn" data-tpl="' + i + '">' + UI.icon(tpl.icon, 15) + e(label) + '</button>';
    }).join('');
    tplEls.forEach(function (tplEl) {
      tplEl.innerHTML = templatesHTML;
      tplEl.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-tpl]');
        if (!b) return;
        contentEl.focus();
        insertHTML(replaceCourseText(availableTemplates[+b.getAttribute('data-tpl')].html));
        UI.toast(t('templateInserted'), 'success');
        markDirty();
      });
    });

    if (!isCourse && document.getElementById('edIdeas')) {
      /* ideas */
      var ideaOffset = Math.floor(Math.random() * PROJECT_IDEAS.length);
      var ideasEl = document.getElementById('edIdeas');
      document.getElementById('edIdeaRefresh').innerHTML = UI.icon('refresh-cw', 15);
      function renderIdeas() {
        var items = [];
        for (var i = 0; i < 3; i++) items.push(PROJECT_IDEAS[(ideaOffset + i) % PROJECT_IDEAS.length]);
        ideasEl.innerHTML = items.map(function (x) {
          return '<button class="idea-card">' + UI.icon('sparkles', 14) + '<span>' + e(x) + '</span></button>';
        }).join('');
      }
      renderIdeas();
      document.getElementById('edIdeaRefresh').addEventListener('click', function () {
        ideaOffset = (ideaOffset + 3 + Math.floor(Math.random() * PROJECT_IDEAS.length)) % PROJECT_IDEAS.length;
        renderIdeas();
      });
      ideasEl.addEventListener('click', function (ev) {
        var card = ev.target.closest('.idea-card');
        if (!card) return;
        var text = card.querySelector('span').textContent;
        contentEl.focus();
        insertHTML('<blockquote>' + e(text) + '</blockquote><p>……</p>');
        markDirty();
      });
    }

    /* social preview */
    function updateSocialPreview() {
      var host = document.getElementById('edSocialPreview');
      if (!host) return;
      var title = titleEl.value.trim();
      var sum = summaryEl.value.trim();
      if (!title && !sum) { host.innerHTML = '<div style="padding:16px" class="tiny muted">' + e(t('noPreviewYet')) + '</div>'; return; }
      host.innerHTML =
        (p.cover ? '<img src="' + e(p.cover) + '" alt="">' : '<div style="aspect-ratio:1.91/1;background:var(--grad);display:grid;place-items:center;color:#fff">' + UI.icon('layers', 30) + '</div>') +
        '<div class="sp-body"><div class="sp-domain">' + e((p.slug || 'portfolio') + ' · ' + (p.category || 'project')) + '</div>' +
        '<div class="sp-title">' + e(title || '—') + '</div>' +
        '<div class="sp-desc">' + e(sum || textOf(contentEl).slice(0, 120)) + '</div></div>';
    }
    updateSocialPreview();

    function updateMeta() {
      var words = textOf(contentEl).split(' ').filter(Boolean).length;
      var mins = Math.max(1, Math.round(words / 200));
      document.getElementById('edMeta').innerHTML =
        UI.icon('file-text', 13) + ' ' + words + ' ' + e(t('wordCount')) +
        ' <span style="opacity:.5">·</span> ' + UI.icon('clock', 13) + ' ' + mins + ' ' + e(t('readTime'));
    }
    updateMeta();

    var auto = UI.debounce(function () {
      if (leaveRequested) return;
      var status = p.status === 'published' ? 'published' : 'draft';
      if (isCourse) {
        if (versionRestorePending) return;
        serverSave(status, false, true);
        return;
      }
      persist(status, true);
    }, 1100);

    function markDirty() {
      dirty = true;
      changeVersion += 1;
      setStatus('saving');
      syncSlug();
      updateChecklist();
      updateSocialPreview();
      updateMeta();
      auto();
    }

    function markSyllabusDirty() {
      syllabusDirty = true;
      syllabusVersion += 1;
      markDirty();
    }

    [titleEl, titleEnglishEl, summaryEl, courseTypeEl, categoryEl, roleEl, dateEl, demoEl].concat(courseMetaEls).filter(Boolean).forEach(function (el) {
      el.addEventListener('input', markDirty);
      el.addEventListener('change', markDirty);
    });
    Array.prototype.forEach.call(courseTypeChoices, function (choice) {
      choice.addEventListener('change', function () {
        if (!courseTypeEl) return;
        courseTypeEl.value = choice.value;
        syncInPersonKindVisibility();
        if (isWorkshopEditor) syncWorkshopCourseMode();
        courseTypeEl.dispatchEvent(new Event('change', { bubbles: true }));
        updateChecklist();
      });
    });
    Array.prototype.forEach.call(inPersonKindChoices, function (choice) {
      choice.addEventListener('change', function () {
        if (!inPersonKindEl) return;
        inPersonKindEl.value = choice.value;
        inPersonKindEl.dispatchEvent(new Event('change', { bubbles: true }));
        markDirty();
      });
    });
    titleEl.addEventListener('input', function () {
      updateTitleValidation(true);
    });
    titleEl.addEventListener('blur', function () {
      updateTitleValidation(true);
    });
    if (visibilityEl && visibilityField && visibilityField.style.display !== 'none') {
      visibilityEl.addEventListener('change', markDirty);
    }
    contentEl.addEventListener('input', markDirty);

    function collect() {
      p.title = titleEl.value.trim();
      if (titleEnglishEl) p.titleEnglish = titleEnglishEl.value.trim();
      p.summary = summaryEl.value.trim();
      if (isCourse && courseTypeEl) p.courseType = courseTypeEl.value;
      if (isCourse && inPersonKindEl) {
        p.inPersonKind = isWorkshopEditor && courseTypeEl.value !== 'in_person'
          ? 'workshop'
          : inPersonKindEl.value;
      }
      p.category = isInPersonCourseEditor()
        ? (categoryEl.value.trim() || p.category)
        : categoryEl.value.trim();
      p.role = roleEl ? roleEl.value.trim() : '';
      if (!isCourse && visibilityEl && visibilityField && visibilityField.style.display !== 'none') {
        p.visibility = visibilityEl.value;
      }
      p.date = dateEl.value;
      p.links = { github: (p.links && p.links.github) || '', demo: demoEl.value.trim() };
      p.content = UI.sanitize(contentEl.innerHTML);
      p.slug = Store.slugify(p.title || p.slug || '', p.id);
      if (isCourse) {
        p.description = p.summary;
        p.skills = p.tags;
        p.image = p.cover;
        p.price = priceEl.value.trim();
        p.currency = currencyEl ? currencyEl.value : 'ILS';
        p.duration = durationEl.value.trim();
        p.period = periodEl.value;
        if (courseCompletionEl.value !== 'coming_soon') {
          p.isComplete = courseCompletionEl.value === 'complete';
        }
        p.comingSoon = courseCompletionEl.value === 'coming_soon';
        if (syllabusDirty) {
          p.syllabus = (p.syllabus || []).map(function (sec) {
            var cleanSection = Object.assign({}, sec, {
              lessons: (sec.lessons || []).map(function (ls) {
                var lesson = Object.assign({}, ls);
                if (lesson.type !== 'quiz') delete lesson.quiz;
                if (lesson.type !== 'project') delete lesson.projectId;
                delete lesson.project;
                return lesson;
              })
            });
            return cleanSection;
          });
        }
      }
      p.updatedAt = new Date().toISOString();
    }

    function persist(status, silent) {
      collect();
      p.status = status;
      Store.upsert(COL, p);
      dirty = false;
      if (!silent) return;
      setStatus('saved');
    }

    function serverSave(status, redirect, silent) {
      if (leaveRequested) return;
      if (!redirect && !silent && !dirty && !syllabusDirty && status === p.status) {
        return;
      }
      var hadChanges = dirty || syllabusDirty;
      if (!updateTitleValidation(true)) {
        setStatusDraft();
        if (!silent) titleEl.focus();
        return;
      }
      if (!isValidTrainingCategory()) {
        updateTrainingCategoryValidation(true);
        setStatusDraft();
        if (!silent && categorySearchEl) categorySearchEl.focus();
        return;
      }
      p.status = status;
      if (saveInFlight) {
        queuedSave = {
          status: status,
          redirect: !!redirect || !!(queuedSave && queuedSave.redirect && status === 'published'),
          silent: !!silent
        };
        dirty = true;
        setStatus('saving');
        return;
      }
      collect();
      if (isCourse && trainerCoursePriceIsBelowMinimum()) {
        setStatusDraft();
        if (!silent) {
          UI.toast(t('coursePriceMinimum'), 'error');
          priceEl.focus();
        }
        return;
      }
      if (!isCourse && ownerIdEl && !ownerIdEl.value) {
        setStatusDraft();
        UI.toast(I18n.getLang() === 'en'
          ? 'Select a project owner from the list.'
          : 'اختر صاحب المشروع من القائمة.', 'error');
        return;
      }
      if (isCourse && trainerEl && !trainerEl.value) {
        setStatusDraft();
        if (!redirect) UI.toast(t('trainer_required'), 'error');
        return;
      }
      setStatus('saving');
      saveInFlight = true;
      var submittedVersion = changeVersion;
      var submittedSyllabusVersion = syllabusVersion;
      var syllabusIncluded = isCourse && syllabusDirty &&
        !(silent && pendingDeletionHistory.length);
      var payload = isCourse ? {
        id: existing ? p.id : '',
        trainerId: trainerEl ? trainerEl.value : '',
        title: p.title,
        titleEnglish: p.titleEnglish || '',
        summary: p.summary,
        courseType: p.courseType || 'online',
        inPersonKind: p.inPersonKind || 'course',
        content: p.content,
        category: isInPersonCourseEditor() ? undefined : p.category,
        price: p.price,
        currency: p.currency || 'ILS',
        duration: p.duration,
        period: p.period,
        isComplete: p.isComplete,
        comingSoon: p.comingSoon,
        credentialId: p.credentialId,
        verifyUrl: p.verifyUrl,
        tags: p.tags,
        cover: p.cover,
        coverStorageName: p.coverStorageName || '',
        recordVersion: !silent,
        status: status
      } : {
        id: existing ? p.id : '',
        title: p.title,
        summary: p.summary,
        content: p.content,
        category: p.category,
        role: p.role,
        date: p.date,
        visibility: p.visibility || 'public',
        ownerId: ownerIdEl ? ownerIdEl.value : '',
        github: (p.links && p.links.github) || '',
        demo: (p.links && p.links.demo) || '',
        tags: p.tags,
        cover: p.cover,
        gallery: p.gallery,
        files: p.files,
        status: status
      };
      if (syllabusIncluded) {
        payload.syllabus = p.syllabus.map(function (section) {
          var cleanSection = Object.assign({}, section);
          delete cleanSection._editorKey;
          cleanSection.lessons = (section.lessons || []).map(function (lesson) {
            var cleanLesson = Object.assign({}, lesson);
            delete cleanLesson._editorKey;
            return cleanLesson;
          });
          return cleanSection;
        });
      }
      var submittedCover = isCourse ? p.cover : '';
      fetch(SITE.u(isCourse ? 'courseSave' : 'projectSave'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': editorCsrf()
        },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return { ok: false }; });
      }).then(function (res) {
        if (!res || !res.ok) {
          var errorKey = (res && res.error) || 'required';
          if (errorKey === 'course_price_below_minimum') {
            errorKey = 'coursePriceMinimum';
          }
          if (errorKey === 'project_gallery_limit_exceeded') {
            errorKey = 'projectGalleryLimitReached';
          }
          if (errorKey === 'invalid_category') {
            trainingCategories = trainingCategories.filter(function (category) {
              return category !== p.category;
            });
            p.category = '';
            categoryEl.value = '';
            categoryUnavailable = true;
            categoryTouched = true;
            if (!categoryOptionsEl.hidden) renderTrainingCategoryOptions(categorySearchEl.value);
            updateTrainingCategoryValidation(true);
            if (categorySearchEl) categorySearchEl.focus();
            errorKey = 'categoryUnavailable';
          }
          if (errorKey === 'title_required') {
            updateTitleValidation(true);
            titleEl.focus();
            errorKey = 'titleRequired';
          }
          if (errorKey === 'project_incomplete') errorKey = 'projectPublishRequirements';
          if (errorKey === 'invalid_project_url') errorKey = 'invalidProjectUrl';
          if (errorKey === 'course_incomplete') {
            var serverMissing = res && res.missing || [];
            errorKey = coursePublishMessageKey(serverMissing[0]);
            var focusByField = {
              title: titleEl,
              titleEnglish: titleEnglishEl,
              cover: coverHost,
              summary: summaryEl,
              content: contentEl,
              category: categoryEl,
              demo: demoEl,
              price: priceEl,
              duration: durationEl,
              tags: tagsInput,
              syllabus: document.getElementById('edSecAdd')
            };
            var focusTarget = serverMissing.length && focusByField[serverMissing[0]];
            if (focusTarget === coverHost) {
              focusTarget = coverHost.querySelector('input[type="file"]');
            }
            if (focusTarget) focusTarget.focus();
          }
          if (errorKey === 'invalid_cover_version') errorKey = 'versionHistoryCoverMissing';
          throw { saveError: errorKey, response: res };
        }
        var previousId = p.id;
        p.id = res.id;
        if (isCourse && previousId !== p.id) {
          createdDuringSession = true;
          var previousHistoryKey = deletionHistoryKey;
          deletionHistoryKey = 'dc-course-deletions:' + p.id;
          try {
            if (pendingDeletionHistory.length) {
              localStorage.setItem(deletionHistoryKey, JSON.stringify(pendingDeletionHistory));
            } else {
              localStorage.removeItem(deletionHistoryKey);
            }
            localStorage.removeItem(previousHistoryKey);
          } catch (error) {
            console.warn('تعذر تحديث مفتاح سجل حذف الدورة.', error);
          }
        }
        existing = true;
        if (isCourse && res.cover && p.cover === submittedCover) {
          p.cover = res.cover;
          p.image = res.cover;
          if (document.body.getAttribute('data-admin-dashboard-editor') === 'true' &&
              window.Store && typeof window.Store.find === 'function') {
            var savedCourse = window.Store.find('certificates', previousId || p.id);
            if (savedCourse) {
              savedCourse.cover = res.cover;
              savedCourse.image = res.cover;
            }
          }
        }
        if (submittedVersion === changeVersion) {
          dirty = isCourse && syllabusDirty && !syllabusIncluded;
        } else {
          dirty = true;
        }
        if (syllabusIncluded && submittedSyllabusVersion === syllabusVersion) {
          syllabusDirty = false;
          versionRestorePending = false;
          if (pendingDeletionHistory.length) clearDeletionHistory();
        }
        if (redirect && !queuedSave && submittedVersion === changeVersion) {
          if (isCourse && status === 'published') {
            try {
              window.sessionStorage.setItem('dc-course-published-toast', '1');
            } catch (error) {
              console.warn('تعذر حفظ تنبيه نشر الدورة.', error);
            }
          }
          if (isCourse && courseReturnUrl) {
            location.href = courseReturnUrl;
            return;
          }
          if (document.body.getAttribute('data-admin-dashboard-editor') === 'true' &&
              window.Admin && typeof window.Admin.navigate === 'function') {
            window.Admin.navigate(isCourse
              ? (p.inPersonKind === 'workshop'
                ? 'workshops'
                : (p.courseType === 'in_person' ? 'in-person-courses' : 'courses'))
              : 'projects');
            return;
          }
          location.href = res.url;
          return;
        }
        if (!queuedSave && submittedVersion === changeVersion) {
          if (dirty) setStatusDraft();
          else setStatus('saved');
          if (!silent && hadChanges) UI.toast(t('savedOk'), 'success');
        }
      }).catch(function (error) {
        setStatusDraft();
        UI.toast(t(error && error.saveError ? error.saveError : 'required'), 'error');
      }).then(function () {
        saveInFlight = false;
        if (queuedSave) {
          var nextSave = queuedSave;
          queuedSave = null;
          serverSave(nextSave.status, nextSave.redirect, nextSave.silent);
        }
      });
    }

    function waitForSaveIdle() {
      return new Promise(function (resolve) {
        function check() {
          if (!saveInFlight && !queuedSave) {
            resolve();
            return;
          }
          window.setTimeout(check, 30);
        }
        check();
      });
    }

    if (isCourse) {
      window.courseEditorDiscardPendingChanges = function () {
        leaveRequested = true;
        queuedSave = null;
        return waitForSaveIdle().then(function () {
          if (isNew && !createdDuringSession) {
            clearDeletionHistory();
            return { ok: true };
          }
          return fetch(SITE.u('courseDiscard'), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': editorCsrf()
            },
            body: JSON.stringify({
              id: p.id,
              discardNew: createdDuringSession,
              baseline: initialCourseSnapshot
            })
          }).then(function (response) {
            return response.json().catch(function () { return { ok: false }; });
          }).then(function (result) {
            if (!result || !result.ok) {
              throw new Error((result && result.error) || 'restore_failed');
            }
            clearDeletionHistory();
            return result;
          });
        }).catch(function (error) {
          leaveRequested = false;
          throw error;
        }).then(function (result) {
          dirty = false;
          syllabusDirty = false;
          return result;
        });
      };
    }

    document.getElementById('edPreviewBtn').addEventListener('click', function () {
      collect();
      var previewCourse = Object.assign({}, p, {
        image: p.cover || p.image || '',
        description: p.summary || p.description || '',
        skills: Array.isArray(p.tags) ? p.tags : (Array.isArray(p.skills) ? p.skills : []),
        status: 'published'
      });
      var numericPrice = Number(String(p.price || '').replace(/[^\d.]/g, ''));
      previewCourse.isFree = !!p.isFree || (String(p.price).trim() !== '' && numericPrice === 0);
      previewCourse.price = previewCourse.isFree
        ? ''
        : p.price
          ? (/[$₪]/.test(String(p.price))
            ? String(p.price)
            : (p.currency === 'USD' ? '$' : '₪') + p.price)
          : '';
      var courseCardHTML = window.AppPage && typeof window.AppPage.certCard === 'function'
        ? window.AppPage.certCard(previewCourse, {
          course: true,
          homeCourseCard: true,
          courseListingBadge: true,
          viewOnly: true
        })
        : '<article class="cert-card course-home-card"><div class="course-home-media">' +
          (previewCourse.image
            ? '<img class="course-home-image" src="' + e(previewCourse.image) + '" alt="">'
            : '<div class="course-home-image-placeholder">' + UI.icon('book-open', 40) + '</div>') +
          '</div><div class="course-home-content"><h3>' + e(previewCourse.title || '—') + '</h3></div></article>';
      var instructorName = roleEl && roleEl.tagName === 'SELECT'
        ? (roleEl.options[roleEl.selectedIndex] && roleEl.options[roleEl.selectedIndex].textContent) || ''
        : (p.issuer || p.instructor || (roleEl && roleEl.value) || '');
      var summary = String(p.summary || '').trim();
      var descriptionHTML = UI.sanitize(p.content || '');
      var learnHTML = previewCourse.skills.length
        ? '<section class="cd-card"><h2 class="cd-h2">' + UI.icon('check-circle', 18) +
          e(t('ucLearn')) + '</h2><div class="cd-learn">' +
          previewCourse.skills.map(function (skill) {
            return '<div class="cd-learn-item">' + UI.icon('check', 16) +
              '<span>' + e(skill) + '</span></div>';
          }).join('') + '</div></section>'
        : '';
      var descriptionSection = (descriptionHTML || (previewCourse.courseType !== 'in_person' && summary))
        ? '<section class="cd-card"><h2 class="cd-h2">' + UI.icon('file-text', 18) +
          e(t('ucDesc')) + '</h2>' +
          (descriptionHTML
            ? '<div class="prose cd-course-description">' + descriptionHTML + '</div>'
            : '<p class="cd-course-summary">' + e(summary) + '</p>') + '</section>'
        : '';
      var instructorSection = instructorName
        ? '<section class="cd-card"><h2 class="cd-h2">' + UI.icon('user', 18) +
          e(t('ucInstructor')) + '</h2><div class="cd-inst">' +
          '<img class="cd-inst-av" src="' + e(UI.userLetterAvatar(instructorName, 56)) + '" alt="">' +
          '<div><div class="cd-inst-name">' + e(instructorName) + '</div>' +
          '<div class="cd-inst-sub">' + e(t('ucInstSub')) +
          (p.category ? ' · ' + e(p.category) : '') + '</div></div></div></section>'
        : '';
      var linkedProjects = [];
      (p.syllabus || []).forEach(function (section) {
        (section.lessons || []).forEach(function (lesson) {
          if (lesson.type !== 'project') return;
          var project = lesson.project || (typeof SITE.trainerProjects === 'function'
            ? SITE.trainerProjects().filter(function (item) {
              return String(item.id) === String(lesson.projectId);
            })[0]
            : null);
          if (project && !linkedProjects.some(function (item) { return item.id === project.id; })) {
            linkedProjects.push(project);
          }
        });
      });
      var projectsSection = linkedProjects.length
        ? '<section class="cd-card"><h2 class="cd-h2">' + UI.icon('briefcase', 18) +
          e(t('ucLinkedProjects')) + '</h2><div class="cd-projects">' +
          linkedProjects.map(function (project) {
            return '<article class="cd-project-card">' +
              (project.cover
                ? '<div class="cd-project-cover"><img src="' + e(project.cover) + '" alt=""></div>'
                : '') +
              '<div class="cd-project-body"><h3 class="cd-project-title">' +
              e(project.title || '') + '</h3>' +
              (project.summary
                ? '<p class="cd-project-summary">' + e(project.summary) + '</p>'
                : '') + '</div></article>';
          }).join('') + '</div></section>'
        : '';
      var heroStyle = previewCourse.image
        ? ' style="background-image:url(&quot;' + e(previewCourse.image) + '&quot;),linear-gradient(135deg,#2563eb,#7c3aed)"'
        : ' style="background-image:linear-gradient(135deg,#2563eb,#7c3aed)"';
      var detailHeroHTML =
        '<section class="cd-hero"' + heroStyle + '><div class="cd-hero-overlay"><div class="cd-hero-inner">' +
        '<nav class="cd-crumb"><span>' + e(t('ucCourses')) + '</span><span class="cd-crumb-sep">›</span>' +
        '<span>' + e(p.category || '') + '</span></nav>' +
        '<h1 class="cd-title">' + e(p.title || '—') + '</h1>' +
        (summary ? '<p class="cd-sub">' + e(summary) + '</p>' : '') +
        (instructorName
          ? '<div class="cd-author"><img class="cd-author-av" src="' +
            e(UI.userLetterAvatar(instructorName, 44)) + '" alt="">' +
            '<span>' + e(p.courseType === 'in_person' ? t('ucCourseTrainer') : t('ucBy')) +
            ' <b>' + e(instructorName) + '</b></span></div>'
          : '') +
        '<div class="cd-pills">' +
        '<span class="cd-pill">' + UI.icon('clock', 14) + e(p.duration || '—') + '</span>' +
        '<span class="cd-pill">' + UI.icon('calendar', 14) + e(p.period || '—') + '</span>' +
        '<span class="cd-pill">' + UI.icon('award', 14) + e(t('ucCert')) + '</span>' +
        '</div></div></div></section>';
      var detailHTML = detailHeroHTML + (previewCourse.courseType === 'in_person'
        ? '<div class="cd-inperson-learn">' + descriptionSection + learnHTML +
          '<section class="cd-card cd-registration-card">' +
          '<h2 class="cd-h2">' + UI.icon('user', 18) +
          (p.inPersonKind === 'workshop' ? 'طلب التسجيل في الورشة' : 'طلب التسجيل في الدورة') +
          '</h2><p class="cd-registration-intro">عبّئ البيانات التالية لإرسال طلب تسجيلك.</p>' +
          '<div class="cd-registration-fields">' +
          '<label>الاسم الكامل<input class="input" type="text" disabled></label>' +
          '<label>رقم الهاتف / واتساب<input class="input" type="tel" disabled></label>' +
          '<label>التخصص<input class="input" type="text" disabled></label>' +
          '<label>السنة الدراسية<select class="input" disabled><option>اختر السنة الدراسية</option></select></label>' +
          '<fieldset class="cd-registration-governorate"><legend>المحافظة / طريقة الحضور</legend>' +
          '<div class="cd-registration-governorate-options">' +
          '<span class="cd-registration-governorate-button">غزة</span>' +
          '<span class="cd-registration-governorate-button">الوسطى</span>' +
          '<span class="cd-registration-governorate-button">أونلاين</span>' +
          '</div></fieldset>' +
          '</div><div class="cd-btn cd-btn-buy">حفظ طلب التسجيل</div></section></div>'
        : '<div class="cd-grid"><div class="cd-main">' +
        learnHTML + descriptionSection + instructorSection + projectsSection +
        '</div><aside class="cd-side"><div class="cd-buy">' +
        '<div class="cd-thumb">' +
        (previewCourse.image
          ? '<img src="' + e(previewCourse.image) + '" alt="">'
          : '<div class="course-preview-thumb-placeholder">' + UI.icon('book-open', 40) + '</div>') +
        '</div><div class="cd-buy-body"><div class="cd-price"><b>' +
        e(previewCourse.isFree ? t('courseFreePrice') : (previewCourse.price || t('ucFree'))) +
        '</b><span>' + e(t('ucPriceNote')) + '</span></div>' +
        '<div class="cd-btn cd-btn-buy">' + UI.icon('user', 16) + e(t('ucEnroll')) + '</div>' +
        '<ul class="cd-includes">' +
        '<li>' + UI.icon('clock', 15) + '<span>' + e(t('ucDuration')) +
        ': <b>' + e(p.duration || '—') + '</b></span></li>' +
        '<li>' + UI.icon('calendar', 15) + '<span>' + e(t('ucSessions')) +
        ': <b>' + e(p.period || '—') + '</b></span></li>' +
        '<li>' + UI.icon('award', 15) + '<span>' + e(t('ucCert')) + '</span></li>' +
        '</ul></div></div></aside></div>');
      var modal = UI.modal({
        title: t('preview'),
        size: 'lg',
        body: '<div class="course-preview-frame">' +
          '<section class="course-preview-card-section"><h3>' + e(t('previewCourseCard')) + '</h3>' +
          '<div class="course-preview-card-grid">' + courseCardHTML + '</div></section>' +
          '<section class="course-preview-detail-section"><h3>' + e(t('previewCourseDetails')) + '</h3>' +
          '<div class="course-preview-detail">' + detailHTML + '</div></section></div>'
      });
      modal.el.classList.add('preview-overlay');
      modal.el.classList.add('course-preview-overlay');
    });

    var draftButton = document.getElementById('edDraftBtn');
    if (draftButton) {
      draftButton.addEventListener('click', function () {
        if (SERVER_SAVE) { serverSave('draft', false); return; }
        persist('draft');
        setStatusDraft();
        UI.toast(t('savedOk'), 'success');
      });
    }

    document.getElementById('edPublishBtn').addEventListener('click', function () {
      collect();
      if (!updateTitleValidation(true)) {
        titleEl.focus();
        return;
      }
      if (!isValidTrainingCategory()) {
        updateTrainingCategoryValidation(true);
        if (categorySearchEl) categorySearchEl.focus();
        return;
      }
      if (isCourse) {
        var courseMissing = coursePublishMissing();
        if (courseMissing.length) {
          UI.toast(t(coursePublishMessageKey(courseMissing[0].key)), 'error');
          if (courseMissing[0].key === 'cover') {
            var courseCoverInput = coverHost.querySelector('input[type="file"]');
            if (courseCoverInput) courseCoverInput.focus();
          } else if (courseMissing[0].element) {
            courseMissing[0].element.focus();
          }
          return;
        }
      } else {
        var missing = projectPublishMissing();
        if (missing.length) {
          UI.toast(t('projectPublishRequirements'), 'error');
          if (missing[0].key === 'cover') {
            var coverInput = coverHost.querySelector('input[type="file"]');
            if (coverInput) coverInput.focus();
          } else if (missing[0].element) {
            missing[0].element.focus();
          }
          return;
        }
      }
      if (!isCourse && !p.title) { UI.toast(t('required'), 'error'); titleEl.focus(); return; }
      if (!isCourse && textOf(contentEl).length < 10) { UI.toast(t('required'), 'error'); contentEl.focus(); return; }
      if (SERVER_SAVE) { serverSave('published', true); return; }
      p.status = 'published';
      Store.upsert(COL, p);
      location.href = SITE.u(isCourse ? 'course' : 'project', p.id);
    });

    window.addEventListener('beforeunload', function (ev) {
      if (dirty && isCourse && SERVER_SAVE) {
        if (window.courseEditorLeaveConfirmed) {
          window.courseEditorLeaveConfirmed = false;
          return;
        }
        ev.preventDefault();
        ev.returnValue = '';
        return;
      }
      if (dirty) { collect(); Store.upsert(COL, Object.assign({}, p, { status: p.status === 'published' ? 'published' : 'draft' })); }
    });

    if (document.body.getAttribute('data-admin-dashboard-editor') === 'true' &&
        window.Admin && typeof window.Admin.setEditorLeaveHandler === 'function') {
      window.Admin.setEditorLeaveHandler(function () {
        function confirmLeave() {
          if (!dirty && !syllabusDirty) return Promise.resolve(true);
          return UI.confirm(t('editorLeaveWarning'), {
            title: t('editorLeaveTitle'),
            icon: 'alert-triangle',
            className: 'editor-leave-confirm',
            cancelLabel: t('editorStay'),
            confirmLabel: t('editorLeave'),
            confirmClass: 'btn-danger'
          }).then(function (confirmed) {
            if (!confirmed) return false;
            if (!isCourse || typeof window.courseEditorDiscardPendingChanges !== 'function') return true;
            return window.courseEditorDiscardPendingChanges().then(function () {
              return true;
            }).catch(function (error) {
              console.error('تعذر استعادة آخر نسخة منشورة قبل مغادرة محرر الدورة.', error);
              UI.toast(t('courseLeaveRestoreFailed'), 'error');
              return false;
            });
          });
        }
        return waitForSaveIdle().then(confirmLeave);
      });
    }
  }

  /* ---------- daily editor ---------- */

  function initDailyEditor() {
    var id = SITE.param('id');
    var existing = id ? Store.find('posts', id) : null;
    var post = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: Store.uid('d'), content: '', images: [], tags: [],
      likes: 0, liked: false, saved: false, comments: [],
      status: 'draft', createdAt: new Date().toISOString()
    };
    var isNew = !existing;
    var dirty = false;
    var SERVER_SAVE = false;

    fillChrome({
      titles: [
        { icon: 'sparkles', title: t('ideas') }
      ]
    });
    if (isNew || post.status === 'draft') setStatusDraft(); else setStatus('saved');

    var prof = Store.state.profile;
    document.getElementById('edAuthorRow').innerHTML =
      UI.avatarOf(prof, 46) +
      '<div><div class="strong row gap-6">' + e(prof.name) + (prof.verified ? UI.verifiedBadge(14) : '') + '</div>' +
      '<div class="tiny muted">@' + e(prof.handle) + '</div></div>';

    var contentEl = document.getElementById('edContent');
    contentEl.setAttribute('data-ph', t('dailyPlaceholder'));
    contentEl.innerHTML = post.content || '';
    initToolbar(document.getElementById('edToolbar'), contentEl, markDirty);

    /* media — Instagram ratios & multi (images + video) */
    if (!post.media) post.media = (post.images || []).map(function (src) { return { type: 'image', src: src }; });
    if (!post.ratio) post.ratio = '1:1';

    var RATIOS = [
      { id: '1:1', label: t('ratioSquare') },
      { id: '4:5', label: t('ratioPortrait') },
      { id: '1.91:1', label: t('ratioLandscape') }
    ];
    var ratioEl = document.getElementById('edRatio');
    function renderRatio() {
      ratioEl.innerHTML = '<span class="tiny muted">' + e(t('ratioLabel')) + '</span>' +
        RATIOS.map(function (r) {
          return '<button class="chip chip-btn ratio-chip' + (post.ratio === r.id ? ' on' : '') + '" data-ratio="' + e(r.id) + '">' + e(r.label) + '</button>';
        }).join('');
    }
    renderRatio();
    ratioEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-ratio]');
      if (!b) return;
      post.ratio = b.getAttribute('data-ratio');
      renderRatio(); markDirty();
    });

    var galleryEl = document.getElementById('edGallery');
    function renderGallery() {
      var html = post.media.map(function (m, i) {
        var inner = m.type === 'video'
          ? '<video src="' + e(m.src) + '" preload="none" muted playsinline></video><span class="gi-play">' + UI.icon('play', 13) + '</span>'
          : '<img src="' + e(m.src) + '" alt="" loading="lazy" decoding="async">';
        return '<div class="gallery-edit-item' + (m.type === 'video' ? ' is-video' : '') + '">' + inner + '<button class="gi-x" data-gi="' + i + '">' + UI.icon('x', 12) + '</button></div>';
      }).join('');
      galleryEl.innerHTML = html;
      galleryEl.querySelectorAll('[data-gi]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          post.media.splice(+btn.getAttribute('data-gi'), 1);
          renderGallery(); markDirty();
        });
      });
    }
    renderGallery();
    var mediaInput = document.getElementById('edImagesInput');
    mediaInput.accept = 'image/*,video/*';
    var addMediaBtn = document.getElementById('edAddImage');
    addMediaBtn.innerHTML = UI.icon('image', 15) + e(t('addMedia'));
    addMediaBtn.addEventListener('click', function () { mediaInput.click(); });
    var VIDEO_MAX = 4 * 1024 * 1024;
    mediaInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(mediaInput.files || []);
      var tasks = files.map(function (f) {
        if ((f.type || '').indexOf('video/') === 0) {
          if (f.size > VIDEO_MAX) { UI.toast(t('videoTooBig'), 'error'); return Promise.resolve(null); }
          return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onerror = function () { resolve(null); };
            reader.onload = function () { resolve({ type: 'video', src: reader.result }); };
            reader.readAsDataURL(f);
          });
        }
        return UI.compressImage(f, 1400, 0.82).then(function (src) { return { type: 'image', src: src }; });
      });
      Promise.all(tasks).then(function (list) {
        post.media = post.media.concat(list.filter(Boolean));
        renderGallery(); markDirty();
        mediaInput.value = '';
      });
    });

    /* hashtags */
    var hashEl = document.getElementById('edHashtags');
    function renderHashtags() {
      var pool = HASHTAG_SUGGEST.concat(Store.allTags()).filter(function (x, i, arr) { return arr.indexOf(x) === i && post.tags.indexOf(x) < 0; });
      hashEl.innerHTML = '<span class="tiny muted" style="margin-inline-end:4px">' + e(t('hashtagsSuggest')) + '</span>' +
        pool.slice(0, 10).map(function (x) { return '<button class="chip chip-btn" data-tag="' + e(x) + '">#' + e(x) + '</button>'; }).join('');
    }
    renderHashtags();
    hashEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tag]');
      if (!b) return;
      var tag = b.getAttribute('data-tag');
      if (post.tags.indexOf(tag) < 0) post.tags.push(tag);
      renderHashtags(); markDirty();
      UI.toast('#' + tag, 'info');
    });

    /* ideas */
    var ideaOffset = Math.floor(Math.random() * DAILY_IDEAS.length);
    var ideasEl = document.getElementById('edIdeas');
    document.getElementById('edIdeaRefresh').innerHTML = UI.icon('refresh-cw', 15);
    function renderIdeas() {
      var items = [];
      for (var i = 0; i < 3; i++) items.push(DAILY_IDEAS[(ideaOffset + i) % DAILY_IDEAS.length]);
      ideasEl.innerHTML = items.map(function (x) {
        return '<button class="idea-card">' + UI.icon('sparkles', 14) + '<span>' + e(x) + '</span></button>';
      }).join('');
    }
    renderIdeas();
    document.getElementById('edIdeaRefresh').addEventListener('click', function () {
      ideaOffset = (ideaOffset + 3 + Math.floor(Math.random() * DAILY_IDEAS.length)) % DAILY_IDEAS.length;
      renderIdeas();
    });
    ideasEl.addEventListener('click', function (ev) {
      var card = ev.target.closest('.idea-card');
      if (!card) return;
      contentEl.focus();
      insertHTML('<p><strong>' + e(card.querySelector('span').textContent) + '</strong></p><p>……</p>');
      markDirty();
    });

    function updateMeta() {
      var words = textOf(contentEl).split(' ').filter(Boolean).length;
      var tagsTxt = post.tags.map(function (x) { return '#' + x; }).join(' ');
      document.getElementById('edMeta').textContent =
        words + ' ' + t('wordCount') + (tagsTxt ? ' · ' + tagsTxt : '');
    }
    updateMeta();

    var auto = UI.debounce(function () { persist(post.status === 'published' ? 'published' : 'draft', true); }, 1100);

    function markSyllabusDirty() {
      syllabusDirty = true;
      syllabusVersion += 1;
      markDirty();
    }

    function markDirty() {
      dirty = true;
      changeVersion += 1;
      setStatus('saving');
      updateMeta();
      auto();
    }
    contentEl.addEventListener('input', markDirty);

    function collect() {
      post.content = UI.sanitize(contentEl.innerHTML);
      post.images = post.media.filter(function (m) { return m.type === 'image'; }).map(function (m) { return m.src; });
      post.updatedAt = new Date().toISOString();
    }

    function persist(status, silent) {
      collect();
      post.status = status;
      Store.upsert('posts', post);
      dirty = false;
      if (!silent) return;
      setStatus('saved');
    }

    document.getElementById('edPreviewBtn').addEventListener('click', function () {
      collect();
      var draft = Object.assign({}, post, { comments: post.comments || [] });
      UI.modal({
        title: t('preview'),
        size: 'md',
        body: '<div class="preview-frame">' + (window.AppPage ? AppPage.postCard(draft) : '<div class="prose">' + draft.content + '</div>') + '</div>'
      }).el.classList.add('preview-overlay');
    });

    document.getElementById('edDraftBtn').addEventListener('click', function () {
      persist('draft');
      setStatusDraft();
      UI.toast(t('savedOk'), 'success');
    });

    document.getElementById('edPublishBtn').addEventListener('click', function () {
      collect();
      if (textOf(contentEl).length < 2 && !post.images.length) { UI.toast(t('required'), 'error'); contentEl.focus(); return; }
      post.status = 'published';
      Store.upsert('posts', post);
      location.href = SITE.u('portfolio');
    });

    window.addEventListener('beforeunload', function () {
      if (dirty) { collect(); Store.upsert('posts', Object.assign({}, post, { status: post.status === 'published' ? 'published' : 'draft' })); }
    });
  }

  /* ---------- boot ---------- */

  window.ContentEditor = {
    mount: function (editorPage, id, courseType, courseKind) {
      page = editorPage;
      activeAdminEditorId = id || '';
      activeAdminCourseType = courseType || '';
      activeAdminCourseKind = courseKind || '';
      UI.init();
      initProjectEditor();
      activeAdminEditorId = '';
      activeAdminCourseType = '';
      activeAdminCourseKind = '';
    }
  };

  UI.init();
  if (page === 'edit-project' || page === 'edit-course') initProjectEditor();

  document.addEventListener('i18n:change', UI.debounce(function () {
    if (window.Admin && document.getElementById('admSide')) return;
    location.reload();
  }, 400));
})();
