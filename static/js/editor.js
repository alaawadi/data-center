(function () {
  'use strict';

  var page = document.body.getAttribute('data-page');
  function t(k) { return I18n.t(k); }
  function e(s) { return UI.esc(s); }

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
      icon: 'layers', label: 'قالب مراجعة مشروع',
      html: '<h2>نظرة عامة</h2><p>……</p><h2>المشكلة</h2><p>……</p><h2>الحل</h2><p>……</p><h2>التقنيات المستخدمة</h2><ul><li>……</li></ul><h2>ما تعلّمته</h2><p>……</p><h2>الخطوة القادمة</h2><p>……</p>'
    },
    {
      icon: 'sparkles', label: 'قالب دراسة حالة',
      html: '<h2>الخلفية</h2><p>……</p><h2>التحدي</h2><p>……</p><h2>البحث والأبحاث</h2><p>……</p><h2>التصميم والتنفيذ</h2><p>……</p><h2>النتائج</h2><p>……</p>'
    },
    {
      icon: 'briefcase', label: 'قالب تقرير تدريب',
      html: '<h2>الجهة والمدة</h2><p>……</p><h2>المهام التي أدوّيها</h2><ol><li>……</li></ol><h2>المخرجات</h2><p>……</p><h2>المهارات التي طوّرتها</h2><p>……</p>'
    }
  ];

  var HASHTAG_SUGGEST = ['تطوير', 'تعلم', 'برمجة', 'تصميم', 'مشروع', 'تدريب', 'إنجاز', 'تحدي', 'React', 'JavaScript', 'Python', 'Figma', 'UX', 'Git'];

  /* ---------- shared editor pieces ---------- */

  function insertHTML(html) {
    document.execCommand('insertHTML', false, html);
  }

  function initToolbar(toolbar, editable, onChange) {
    var defs = [
      { cmd: 'undo', icon: 'undo-2' },
      { sep: true },
      { cmd: 'bold', icon: 'bold' },
      { cmd: 'italic', icon: 'italic' },
      { cmd: 'h2', icon: 'heading' },
      { sep: true },
      { cmd: 'insertUnorderedList', icon: 'list' },
      { cmd: 'insertOrderedList', icon: 'list-ordered' },
      { cmd: 'quote', icon: 'quote' },
      { cmd: 'code', icon: 'code' },
      { sep: true },
      { cmd: 'link', icon: 'link' },
      { cmd: 'image', icon: 'image' },
      { cmd: 'removeFormat', icon: 'x' }
    ];
    toolbar.innerHTML = defs.map(function (d) {
      if (d.sep) return '<span class="tb-sep"></span>';
      return '<button type="button" class="tb-btn" data-cmd="' + d.cmd + '" title="' + d.cmd + '">' + UI.icon(d.icon, 16) + '</button>';
    }).join('');

    toolbar.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    toolbar.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-cmd]');
      if (!btn) return;
      var cmd = btn.getAttribute('data-cmd');
      editable.focus();
      try {
        if (cmd === 'bold' || cmd === 'italic' || cmd === 'insertUnorderedList' || cmd === 'insertOrderedList' || cmd === 'removeFormat') {
          document.execCommand(cmd);
        } else if (cmd === 'h2') {
          document.execCommand('formatBlock', false, '<h2>');
        } else if (cmd === 'quote') {
          document.execCommand('formatBlock', false, '<blockquote>');
        } else if (cmd === 'code') {
          document.execCommand('formatBlock', false, '<pre>');
        } else if (cmd === 'link') {
          var url = prompt('https://…');
          if (url) document.execCommand('createLink', false, url);
        } else if (cmd === 'image') {
          pickImage(function (dataUrl) { insertHTML('<img src="' + dataUrl + '" alt="">'); });
        }
      } catch (err) { }
      if (onChange) onChange();
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
    document.getElementById('edBack').innerHTML = UI.icon(dirRtl ? 'arrow-right' : 'arrow-left', 18);
    var btns = [
      { id: 'edPreviewBtn', icon: 'eye', label: t('preview') },
      { id: 'edDraftBtn', icon: 'save', label: t('saveDraft') },
      { id: 'edPublishBtn', icon: 'send', label: t('publish') }
    ];
    btns.forEach(function (b) {
      var el = document.getElementById(b.id);
      el.querySelector('.ic-slot').outerHTML = UI.icon(b.icon, 15);
      el.querySelector('.lbl').textContent = b.label;
    });
    if (opts && opts.titles) {
      var labels = document.querySelectorAll('.h3-label');
      var icons = document.querySelectorAll('.h3-ic');
      opts.titles.forEach(function (item, i) {
        if (labels[i]) labels[i].textContent = item.title;
        if (icons[i]) icons[i].innerHTML = UI.icon(item.icon, 15);
      });
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
    var COL = isCourse ? 'certificates' : 'projects';
    var id = SITE.param('id');
    var existing = id ? Store.find(COL, id) : null;
    var p = existing ? JSON.parse(JSON.stringify(existing)) : (isCourse ? {
      id: Store.uid('c'), title: '', slug: '', cover: '', summary: '', content: '',
        issuer: '', description: '', skills: [], image: '', credentialId: '', verifyUrl: '',
        price: '', duration: '', period: '', syllabus: [],
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
    if (isCourse) {
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
      p.duration = p.duration || '';
      p.period = p.period || '';
      p.credentialId = p.credentialId || '';
      p.verifyUrl = p.verifyUrl || '';
    }
    var isNew = !existing;
    var dirty = false;
    var SERVER_SAVE = (page === 'edit-project' || page === 'edit-course');

    /* صناديق الدورة لا تظهر في محرر المشاريع (ولكنها تُحذف قبل ضبط عناوين البطاقات) */
    if (!isCourse) {
      var sylBox = document.getElementById('edSyllabusBox');
      if (sylBox) sylBox.remove();
      var metaBox = document.getElementById('edCourseMetaBox');
      if (metaBox) metaBox.remove();
    }

    var chromeTitles = [{ icon: 'image', title: t('projGallery') }];
    if (isCourse) chromeTitles.push({ icon: 'list', title: t('syllabusLabel') });
    chromeTitles.push({ icon: 'check-circle', title: t('checklist') });
    chromeTitles.push({ icon: 'sliders', title: t('certEditorTitle') });
    if (isCourse) chromeTitles.push({ icon: 'award', title: t('courseMetaLabel') });
    chromeTitles.push(
      { icon: 'hash', title: t('tagsLabel') },
      { icon: 'file', title: t('projFiles') },
      { icon: 'layers', title: t('templates') },
      { icon: 'sparkles', title: t('ideas') },
      { icon: 'link', title: t('socialPreview') }
    );

    fillChrome({ titles: chromeTitles });
    if (isNew || p.status === 'draft') setStatusDraft(); else setStatus('saved');

    var titleEl = document.getElementById('edTitle');
    var contentEl = document.getElementById('edContent');
    var slugEl = document.getElementById('edSlug');
    var summaryEl = document.getElementById('edSummary');
    var categoryEl = document.getElementById('edCategory');
    var roleEl = document.getElementById('edRole');
    var trainerEl = isCourse && roleEl.tagName === 'SELECT' ? roleEl : null;
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
    var githubEl = document.getElementById('edGithub');
    var demoEl = document.getElementById('edDemo');
    var tagsBox = document.getElementById('edTagsBox');
    var tagsInput = document.getElementById('edTagsInput');

    titleEl.placeholder = t('editorTitlePlaceholder');
    titleEl.value = p.title || '';
    contentEl.setAttribute('data-ph', t('editorContentPlaceholder'));
    contentEl.innerHTML = p.content || '';
    summaryEl.placeholder = t('editorContentPlaceholder');
    summaryEl.value = p.summary || '';
    categoryEl.value = p.category || '';
    roleEl.value = p.role || '';
    dateEl.value = (p.date || '').slice(0, 10);
    githubEl.value = (p.links && p.links.github) || '';
    demoEl.value = (p.links && p.links.demo) || '';

    document.getElementById('lblSummary').textContent = isCourse ? t('descriptionLabel') : t('fieldBio');
    document.getElementById('lblCategory').textContent = t('categoryLabel');
    document.getElementById('lblRole').textContent = isCourse ? t('instructorLabel') : t('roleLabel');
    document.getElementById('lblDate').textContent = t('dateLabel');
    document.getElementById('lblDemo').textContent = t('linkDemo');

    /* الظهور (عام / مخصّص للدورات) — يظهر للمدرب فقط في محرر المشاريع */
    var visibilityEl = document.getElementById('edVisibility');
    var visibilityField = document.getElementById('edVisibilityField');
    var isTrainerUser = !!(window.Store && Store.state.profile &&
      (Store.state.profile.isTrainer || Store.state.profile.roleKey === 'trainer'));
    if (!isCourse && isTrainerUser && visibilityField && visibilityEl) {
      visibilityField.style.display = '';
      document.getElementById('lblVisibility').textContent = t('projectVisibilityLabel');
      document.getElementById('edVisibilityHint').textContent = t('projectVisibilityHint');
      visibilityEl.options[0].textContent = t('projectVisibilityPublic');
      visibilityEl.options[1].textContent = t('projectVisibilityCourses');
      visibilityEl.value = (p.visibility === 'courses') ? 'courses' : 'public';
    }

    /* بيانات الدورة (السعر/المدة/الفترة/الشهادة) — لحقلي المحرر فقط في صفحة الدورات */
    var priceEl = document.getElementById('edPrice');
    var durationEl = document.getElementById('edDuration');
    var periodEl = document.getElementById('edPeriod');
    var credIdEl = document.getElementById('edCredId');
    var verifyUrlEl = document.getElementById('edVerifyUrl');
    var courseMetaEls = [];
    if (isCourse) {
      document.getElementById('lblPrice').textContent = t('priceLabel');
      document.getElementById('lblDuration').textContent = t('durationLabel');
      document.getElementById('lblPeriod').textContent = t('periodLabel');
      document.getElementById('lblCredId').textContent = t('credentialLabel');
      document.getElementById('lblVerifyUrl2').textContent = t('verifyUrlLabel');
      priceEl.value = p.price;
      durationEl.value = p.duration;
      periodEl.value = p.period;
      credIdEl.value = p.credentialId;
      verifyUrlEl.value = p.verifyUrl;
      courseMetaEls = [priceEl, durationEl, periodEl, credIdEl, verifyUrlEl];
      /* المدرّب هو صاحب الدورة — الحقل للعرض فقط، والدورات لا تملك روابط GitHub/تاريخ إصدار */
      if (trainerEl) {
        document.getElementById('lblRole').textContent = t('instructorLabel');
        var trainerPlaceholder = trainerEl.querySelector('[data-trainer-placeholder]');
        if (trainerPlaceholder) trainerPlaceholder.textContent = t('trainerSelectPlaceholder');
        trainerEl.value = existing ? String(existing.trainerId || '') : '';
        trainerEl.addEventListener('change', markDirty);
      } else {
        roleEl.value = p.role || '';
        roleEl.readOnly = true;
        roleEl.classList.add('readonly');
      }
      dateEl.closest('.field').style.display = 'none';
      githubEl.closest('.field').style.display = 'none';
      demoEl.closest('.field').style.display = 'none';
    }

    initToolbar(document.getElementById('edToolbar'), contentEl, markDirty);

    function syncSlug() {
      p.slug = Store.slugify(titleEl.value || p.title, p.id);
      slugEl.textContent = p.slug;
    }
    syncSlug();

    /* checklist */
    var CHECKS = [
      { label: I18n.getLang() === 'ar' ? 'صورة الغلاف' : 'Cover image', done: function () { return !!p.cover; } },
      { label: I18n.getLang() === 'ar' ? 'عنوان واضح' : 'Clear title', done: function () { return !!titleEl.value.trim(); } },
      { label: I18n.getLang() === 'ar' ? 'ملخص مختصر' : 'Short summary', done: function () { return !!summaryEl.value.trim(); } },
      { label: I18n.getLang() === 'ar' ? 'وصف تفصيلي (50+ كلمة)' : 'Detailed description (50+ words)', done: function () { return textOf(contentEl).split(' ').length >= 50; } },
      { label: I18n.getLang() === 'ar' ? 'تاق واحد على الأقل' : 'At least one tag', done: function () { return p.tags.length >= 1; } },
      { label: I18n.getLang() === 'ar' ? 'تصنيف ودور وتاريخ' : 'Category, role & date', done: function () { return categoryEl.value.trim() && roleEl.value.trim() && dateEl.value; } },
      { label: I18n.getLang() === 'ar' ? 'رابط GitHub أو معاينة' : 'GitHub or demo link', done: function () { return githubEl.value.trim() || demoEl.value.trim(); } },
      { label: I18n.getLang() === 'ar' ? 'ملفات أو صور مرفقة' : 'Files or gallery attached', done: function () { return p.files.length || p.gallery.length; } }
    ];
    if (isCourse) {
      CHECKS[5] = { label: I18n.getLang() === 'ar' ? 'تصنيف واضح' : 'Clear category', done: function () { return !!categoryEl.value.trim(); } };
      CHECKS[6] = {
        label: I18n.getLang() === 'ar' ? 'قسم ودروس واحدة على الأقل' : 'At least one section with lessons',
        done: function () {
          return p.syllabus.some(function (s) { return (s.lessons || []).length > 0; });
        }
      };
      CHECKS[7] = {
        label: I18n.getLang() === 'ar' ? 'سعر أو مدة الدورة' : 'Price or duration',
        done: function () { return !!(priceEl.value.trim() || durationEl.value.trim()); }
      };
    }
    var checklistEl = document.getElementById('edChecklist');
    function updateChecklist() {
      var doneCount = 0;
      checklistEl.innerHTML = CHECKS.map(function (c) {
        var ok = !!c.done();
        if (ok) doneCount++;
        return '<div class="check-item' + (ok ? ' done' : '') + '"><span class="cbox">' + UI.icon('check', 12) + '</span>' + e(c.label) + '</div>';
      }).join('');
      var pct = Math.round(doneCount / CHECKS.length * 100);
      document.getElementById('edProgressBar').style.width = pct + '%';
      document.getElementById('edProgressPct').textContent = pct + '%';
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
        coverHost.querySelector('#cvRemove').addEventListener('click', function () { p.cover = ''; renderCover(); markDirty(); });
        setupDropzone(coverHost.querySelector('.cover-preview'), coverHost.querySelector('#cvInput'), function (files) {
          UI.compressImage(files[0], 1600, 0.85).then(function (d) { p.cover = d; renderCover(); markDirty(); });
        });
      } else {
        coverHost.innerHTML = '<div class="dropzone" id="cvDrop"><input type="file" accept="image/*">' +
          UI.icon('upload', 20) + '<span>' + e(t('dropImages')) + '</span><span class="tiny" style="color:var(--faint)">' + e(t('coverUpload')) + '</span></div>';
        setupDropzone(coverHost.querySelector('#cvDrop'), coverHost.querySelector('input'), function (files) {
          UI.compressImage(files[0], 1600, 0.85).then(function (d) { p.cover = d; renderCover(); markDirty(); });
        });
      }
      updateChecklist();
      updateSocialPreview();
    }
    renderCover();

    /* gallery */
    var galleryEl = document.getElementById('edGallery');
    function renderGallery() {
      var html = p.gallery.map(function (g, i) {
        return '<div class="gallery-edit-item"><img src="' + e(g) + '" alt=""><button class="gi-x" data-gi="' + i + '">' + UI.icon('x', 12) + '</button></div>';
      }).join('');
      html += '<label class="gallery-add">' + UI.icon('plus', 20) + '<input type="file" accept="image/*" multiple id="galInput"></label>';
      galleryEl.innerHTML = html;
      galleryEl.querySelector('#galInput').addEventListener('change', function (ev) {
        var files = Array.prototype.slice.call(ev.target.files || []);
        Promise.all(files.map(function (f) { return UI.compressImage(f, 1300, 0.8); })).then(function (list) {
          p.gallery = p.gallery.concat(list);
          renderGallery(); markDirty();
        });
      });
      galleryEl.querySelectorAll('[data-gi]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          p.gallery.splice(+btn.getAttribute('data-gi'), 1);
          renderGallery(); markDirty();
        });
      });
      updateChecklist();
    }
    renderGallery();

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
      var sug = document.getElementById('edTagsSuggest');
      var known = Store.allTags().concat(['React', 'JavaScript', 'Node.js', 'Python', 'Figma', 'UI/UX', 'Git', 'PWA']).filter(function (x, i, arr) { return arr.indexOf(x) === i; });
      sug.innerHTML = known.slice(0, 10).filter(function (x) { return p.tags.indexOf(x) < 0; }).map(function (x) {
        return '<button class="chip chip-btn" data-sug="' + e(x) + '">+ ' + e(x) + '</button>';
      }).join('');
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
    document.getElementById('edTagsSuggest').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-sug]');
      if (b) addTag(b.getAttribute('data-sug'));
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

    function quizBuilderHTML(ls, li) {
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

      var body = '<textarea class="textarea" rows="2" data-k="content" placeholder="' +
        e(ls.type === 'project' ? t('projectTaskLabel') : t('lessonContentLabel')) + '">' + e(ls.content || '') + '</textarea>';
      if (ls.type === 'video') {
        body += '<input class="input" data-k="videoUrl" value="' + e(ls.videoUrl || '') + '" placeholder="' + e(t('lessonVideoLabel')) + '" dir="ltr">';
      }
      if (ls.type === 'project') {
        var projects = (typeof SITE.trainerProjects === 'function') ? SITE.trainerProjects() : [];
        var current = ls.projectId || '';
        if (current && !projects.some(function (pj) { return pj.id === current; })) {
          current = '';
        }
        var options = '<option value="">' + e(t('projectPickNone')) + '</option>' +
          projects.map(function (pj) {
            return '<option value="' + e(pj.id) + '"' + (pj.id === current ? ' selected' : '') + '>' +
              e(pj.title || pj.id) + '</option>';
          }).join('');
        var linked = projects.filter(function (pj) { return pj.id === current; })[0];
        body += '<div class="qzb-note proj-pick">' +
          '<label class="proj-pick-field"><span>' + UI.icon('briefcase', 14) + ' ' + e(t('projectPickLabel')) + '</span>' +
          '<div class="proj-pick-row">' +
          '<select class="input syl-project" data-k="projectId">' + options + '</select>' +
          '<a class="btn btn-soft btn-sm proj-pick-new" href="' + SITE.u('projectCreate') + '" target="_blank" rel="noopener">' + UI.icon('plus', 14) + ' ' + e(t('projectPickNew')) + '</a>' +
          '</div></label>';
        if (linked) {
          body += '<div class="proj-pick-preview">' +
            (linked.cover ? '<img class="proj-pick-cover" src="' + e(linked.cover) + '" alt="">' : '') +
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
          '<div class="qzb-hint">' + UI.icon('info', 14) + ' ' + e(t('quizHint')) + '</div>' +
          '</div>';
      }

      return '<div class="syl-lesson" data-li="' + (li != null ? li : 0) + '">' +
        '<div class="syl-l-row">' +
        '<input class="input" data-k="title" value="' + e(ls.title || '') + '" placeholder="' + e(t('lessonTitleLabel')) + '">' +
        '<input class="input syl-dur" data-k="duration" value="' + e(ls.duration || '') + '" placeholder="08:20" dir="ltr"' + (ls.type === 'video' ? '' : ' style="display:none"') + '>' +
        typeSel +
        '<label class="chip syl-free"><input type="checkbox" data-k="free"' + (ls.free ? ' checked' : '') + '> ' + e(t('lessonFreeLabel')) + '</label>' +
        '<button type="button" class="btn-icon sm danger" data-act="lesson-del" title="' + e(t('lessonDel')) + '">' + UI.icon('trash', 14) + '</button>' +
        '</div>' +
        body +
        '</div>';
    }

    function initSyllabusBuilder() {
      var host = document.getElementById('edSyllabus');
      var secAddBtn = document.getElementById('edSecAdd');
      if (!host || !secAddBtn) return;
      secAddBtn.innerHTML = UI.icon('plus', 15) + e(t('secAdd'));

      function render() {
        if (!p.syllabus.length) {
          host.innerHTML = '<div class="tiny muted" style="padding:8px 2px">' + UI.icon('list', 16) + ' ' + e(t('syllabusEmpty')) + '</div>';
          updateChecklist();
          return;
        }
        host.innerHTML = p.syllabus.map(function (sec, si) {
          var lessons = (sec.lessons || []).map(function (ls, li) {
            if (ls.type == null) ls.type = 'video';
            return quizBuilderHTML(ls, li);
          }).join('');
          return '<div class="syl-section" data-si="' + si + '">' +
            '<div class="syl-sec-head">' +
            '<input class="input syl-sec-title" data-sec="title" value="' + e(sec.title || '') + '" placeholder="' + e(t('secTitle')) + '">' +
            '<button type="button" class="btn-icon sm danger" data-act="sec-del" title="' + e(t('secDel')) + '">' + UI.icon('trash', 14) + '</button>' +
            '</div>' +
            '<div class="syl-lessons">' + lessons + '</div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-act="sec-add-lesson">' + UI.icon('plus', 14) + e(t('lessonAdd')) + '</button>' +
            '</div>';
        }).join('');
        updateChecklist();
      }

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
        if (el.getAttribute('data-sec') === 'title') { sec.title = el.value; markDirty(); return; }

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
          markDirty();
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
        else ls2[k] = el.value;
        if (k === 'type') {
          if (ls2.type === 'quiz' && !ls2.quiz) ls2.quiz = defaultQuiz();
          if (ls2.type !== 'project') ls2.projectId = '';
          render();
        } else if (k === 'projectId') {
          render();
        }
        markDirty();
      }
      host.addEventListener('input', onEdit);
      host.addEventListener('change', onEdit);

      host.addEventListener('click', function (ev) {
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
          markDirty();
          return;
        }

        var btn = ev.target.closest ? ev.target.closest('[data-act]') : null;
        if (!btn) return;
        var secEl = btn.closest('.syl-section');
        if (!secEl) return;
        var sec = p.syllabus[+secEl.getAttribute('data-si')];
        if (!sec) return;
        var act2 = btn.getAttribute('data-act');
        if (act2 === 'sec-del') {
          p.syllabus.splice(+secEl.getAttribute('data-si'), 1);
        } else if (act2 === 'sec-add-lesson') {
          sec.lessons = sec.lessons || [];
          sec.lessons.push({ title: '', duration: '', type: 'video', free: false, content: '', videoUrl: '' });
        } else if (act2 === 'lesson-del') {
          var lesEl2 = btn.closest('.syl-lesson');
          if (lesEl2) (sec.lessons || []).splice(+lesEl2.getAttribute('data-li'), 1);
        } else {
          return;
        }
        render();
        markDirty();
      });

      secAddBtn.addEventListener('click', function () {
        p.syllabus.push({
          title: '',
          lessons: [{ title: '', duration: '', type: 'video', free: false, content: '', videoUrl: '' }]
        });
        render();
        markDirty();
      });

      render();
    }
    if (isCourse) initSyllabusBuilder();

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

    /* templates */
    var tplEl = document.getElementById('edTemplates');
    tplEl.innerHTML = TEMPLATES.map(function (tpl, i) {
      return '<button class="tpl-btn" data-tpl="' + i + '">' + UI.icon(tpl.icon, 15) + e(tpl.label) + '</button>';
    }).join('');
    tplEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tpl]');
      if (!b) return;
      contentEl.focus();
      insertHTML(TEMPLATES[+b.getAttribute('data-tpl')].html);
      UI.toast(t('templateInserted'), 'success');
      markDirty();
    });

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

    /* social preview */
    function updateSocialPreview() {
      var host = document.getElementById('edSocialPreview');
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

    var auto = UI.debounce(function () { persist(p.status === 'published' ? 'published' : 'draft', true); }, 1100);

    function markDirty() {
      dirty = true;
      setStatus('saving');
      syncSlug();
      updateChecklist();
      updateSocialPreview();
      updateMeta();
      auto();
    }

    [titleEl, summaryEl, categoryEl, roleEl, dateEl, githubEl, demoEl].concat(courseMetaEls).forEach(function (el) {
      el.addEventListener('input', markDirty);
      el.addEventListener('change', markDirty);
    });
    if (visibilityEl && visibilityField && visibilityField.style.display !== 'none') {
      visibilityEl.addEventListener('change', markDirty);
    }
    contentEl.addEventListener('input', markDirty);

    function collect() {
      p.title = titleEl.value.trim();
      p.summary = summaryEl.value.trim();
      p.category = categoryEl.value.trim();
      p.role = roleEl.value.trim();
      if (!isCourse && visibilityEl && visibilityField && visibilityField.style.display !== 'none') {
        p.visibility = visibilityEl.value === 'courses' ? 'courses' : 'public';
      }
      p.date = dateEl.value;
      p.links = { github: githubEl.value.trim(), demo: demoEl.value.trim() };
      p.content = UI.sanitize(contentEl.innerHTML);
      p.slug = Store.slugify(p.title || p.slug || '', p.id);
      if (isCourse) {
        p.description = p.summary;
        p.skills = p.tags;
        p.image = p.cover;
        p.price = priceEl.value.trim();
        p.duration = durationEl.value.trim();
        p.period = periodEl.value.trim();
        p.credentialId = credIdEl.value.trim();
        p.verifyUrl = verifyUrlEl.value.trim();
        p.syllabus = (p.syllabus || []).map(function (sec) {
          return Object.assign({}, sec, {
            lessons: (sec.lessons || []).map(function (ls) {
              var lesson = Object.assign({}, ls);
              if (lesson.type !== 'quiz') delete lesson.quiz;
              if (lesson.type !== 'project') delete lesson.projectId;
              delete lesson.project;
              return lesson;
            })
          });
        });
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

    function serverSave(status, redirect) {
      collect();
      p.status = status;
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
      var payload = isCourse ? {
        id: existing ? p.id : '',
        trainerId: trainerEl ? trainerEl.value : '',
        title: p.title,
        summary: p.summary,
        content: p.content,
        category: p.category,
        price: p.price,
        duration: p.duration,
        period: p.period,
        credentialId: p.credentialId,
        verifyUrl: p.verifyUrl,
        tags: p.tags,
        cover: p.cover,
        syllabus: p.syllabus,
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
          setStatusDraft();
          UI.toast(t((res && res.error) || 'required'), 'error');
          return;
        }
        p.id = res.id;
        existing = true;
        dirty = false;
        if (redirect) { location.href = res.url; return; }
        setStatus('saved');
        UI.toast(t('savedOk'), 'success');
      }).catch(function () {
        setStatusDraft();
        UI.toast(t('required'), 'error');
      });
    }

    document.getElementById('edPreviewBtn').addEventListener('click', function () {
      collect();
      var modal = UI.modal({
        title: t('preview'),
        size: 'md',
        body: '<div class="preview-frame"><div class="card" style="max-width:640px;margin-inline:auto;overflow:hidden">' +
          (p.cover ? '<img src="' + e(p.cover) + '" alt="" style="aspect-ratio:16/9;object-fit:cover;width:100%">' : '<div style="aspect-ratio:16/9;background:var(--grad);display:grid;place-items:center;color:#fff">' + UI.icon('layers', 40) + '</div>') +
          '<div style="padding:18px 20px">' +
          '<h3 style="font-size:18px;margin-bottom:8px">' + e(p.title || '—') + '</h3>' +
          (p.summary ? '<p class="muted small" style="margin-bottom:10px">' + e(p.summary) + '</p>' : '') +
          (p.tags.length ? '<div class="row gap-6" style="flex-wrap:wrap;margin-bottom:12px">' + p.tags.map(function (x) { return '<span class="chip">' + e(x) + '</span>'; }).join('') + '</div>' : '') +
          '<div class="prose">' + (p.content || '<p class="muted">…</p>') + '</div>' +
          '</div></div></div>'
      });
      modal.el.classList.add('preview-overlay');
    });

    document.getElementById('edDraftBtn').addEventListener('click', function () {
      if (SERVER_SAVE) { serverSave('draft', false); return; }
      persist('draft');
      setStatusDraft();
      UI.toast(t('savedOk'), 'success');
    });

    document.getElementById('edPublishBtn').addEventListener('click', function () {
      collect();
      if (!p.title) { UI.toast(t('required'), 'error'); titleEl.focus(); return; }
      if (textOf(contentEl).length < 10) { UI.toast(t('required'), 'error'); contentEl.focus(); return; }
      if (SERVER_SAVE) { serverSave('published', true); return; }
      p.status = 'published';
      Store.upsert(COL, p);
      location.href = SITE.u(isCourse ? 'course' : 'project', p.id);
    });

    window.addEventListener('beforeunload', function (ev) {
      if (dirty) { collect(); Store.upsert(COL, Object.assign({}, p, { status: p.status === 'published' ? 'published' : 'draft' })); }
    });
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
          ? '<video src="' + e(m.src) + '" preload="metadata" muted playsinline></video><span class="gi-play">' + UI.icon('play', 13) + '</span>'
          : '<img src="' + e(m.src) + '" alt="">';
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

    function markDirty() {
      dirty = true;
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

  UI.init();
  if (page === 'edit-project' || page === 'edit-course') initProjectEditor();

  document.addEventListener('i18n:change', UI.debounce(function () {
    location.reload();
  }, 400));
})();
