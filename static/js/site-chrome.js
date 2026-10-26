/* ============================================================
   site-chrome.js — يحقن هيدر وفوتر وتاب بار اللاندنج في كل صفحات المشروع
   الاستخدام: SiteChrome.mount()
   ============================================================ */
(function () {
  'use strict';

  var LOGO = SITE.assets('images/logo.svg');
  function siteSettings() {
    var el = document.getElementById('site-settings-data');
    return el ? JSON.parse(el.textContent) : {};
  }

  function whatsappLink() {
    var phone = String(siteSettings().whatsapp || '972594810786').replace(/\D/g, '');
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent('مرحبا اريد معلومات عن');
  }

  var IC = {
    theme: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    wa: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>',
    ig: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>',
    mail: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    phone: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3.08 5.18 2 2 0 0 1 5.06 3h3a2 2 0 0 1 2 1.72c.12.96.34 1.9.66 2.8a2 2 0 0 1-.45 2.11L9 10.91a16 16 0 0 0 4.09 4.09l1.28-1.27a2 2 0 0 1 2.11-.45c.9.32 1.84.54 2.8.66A2 2 0 0 1 22 16.92z"/></svg>',
    website: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };

  /* أيقونات التاب بار (نفس أيقونات لاندنج تماماً) */
  var TIC = {
    home: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    cap: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>',
    grid: '<svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    folder: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    users: '<svg class="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    x: '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };

  /* تبويب الصفحة الحالية → الرابط النشط في الهيدر والتاب بار */
  var TAB_OF = {
    'all-courses': 'courses', 'course': 'courses', 'certificate': 'courses', 'playlist': 'courses',
    'edit-course': 'courses',
    'all-projects': 'projects', 'project': 'projects', 'edit-project': 'projects',
    'all-users': 'users', 'user-profile': 'users',
    'admin': 'admin'
  };

  function currentTabKey() {
    var f = (location.pathname.split('/').pop() || '').toLowerCase().replace(/\.html?$/, '');
    return TAB_OF[f] || '';
  }

  function esc(s) {
    if (window.UI && UI.esc) return UI.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function ic(name, size) {
    if (window.UI && UI.icon) return UI.icon(name, size || 16);
    return '';
  }

  function act(active, key) { return active === key ? ' class="active"' : ''; }

  function headerHTML() {
    var active = currentTabKey();
    return '<header class="header">' +
      '<a href="' + SITE.u('landing') + '" aria-label="' + esc(siteSettings().name || 'مركز داتا للتدريب والتطوير') + '">' +
      '<h1 class="logo">' +
      '<img src="' + LOGO + '" alt="' + esc(siteSettings().name || 'مركز داتا للتدريب والتطوير') + '">' +
      '<span class="logo-text">' + esc(siteSettings().name || 'مركز داتا للتدريب والتطوير') + '</span>' +
      '</h1></a>' +
      '<nav class="navbar">' +
      '<a href="' + SITE.u('landing') + '">الرئيسية</a>' +
      '<a href="' + SITE.u('courses') + '"' + act(active, 'courses') + '>الدورات</a>' +
      '<a href="' + SITE.u('projects') + '"' + act(active, 'projects') + '>المشاريع</a>' +
      '<a href="' + SITE.u('users') + '"' + act(active, 'users') + '>المستقلين</a>' +
      '<a href="' + SITE.u('panel') + '"' + act(active, 'admin') + '>لوحة التحكم</a>' +
      '</nav>' +
      '<div class="icons">' +
      '<button type="button" id="account-btn" class="i-account" title="خيارات الحساب" aria-label="خيارات الحساب" aria-haspopup="dialog" aria-expanded="false">' +
      '<img class="account-av" src="' + SITE.assets('images/avatar-grad.svg') + '" alt="" width="34" height="34">' +
      '</button>' +
      '</div></header>';
  }

  function tabbarHTML() {
    var active = currentTabKey();
    return '<nav class="bottom-navbar" id="bottomNavbar">' +
      '<a href="' + SITE.u('landing') + '"' + act(active, 'home') + '>' + TIC.home + '<span>الرئيسية</span></a>' +
      '<a href="' + SITE.u('courses') + '"' + act(active, 'courses') + '>' + TIC.cap + '<span>الدورات</span></a>' +
      '<button type="button" class="tab-fab" id="coursesFabBtn" aria-label="كل الدورات">' + TIC.grid + '</button>' +
      '<a href="' + SITE.u('projects') + '"' + act(active, 'projects') + '>' + TIC.folder + '<span>المشاريع</span></a>' +
      '<a href="' + SITE.u('users') + '"' + act(active, 'users') + '>' + TIC.users + '<span>المستقلين</span></a>' +
      '</nav>';
  }

  function sheetHTML() {
    return '<div class="sheet-overlay" id="coursesSheetOverlay" aria-hidden="true">' +
      '<div class="courses-sheet" role="dialog" aria-modal="true" aria-label="كل الدورات">' +
      '<div class="sheet-handle"></div>' +
      '<div class="sheet-head">' +
      '<h3 class="sheet-title">دورات مركز داتا</h3>' +
      '<button class="sheet-close" id="coursesSheetClose" type="button" aria-label="إغلاق">' + TIC.x + '</button>' +
      '</div>' +
      '<div id="coursesSheetList"></div>' +
      '</div></div>';
  }

  function footerHTML() {
    return '<div class="icons">' +
      '<a href="' + whatsappLink() + '" target="_blank" rel="noopener" aria-label="واتساب">' + IC.wa + '</a>' +
      '<a href="https://www.instagram.com/data_center.ps" target="_blank" rel="noopener" aria-label="انستجرام">' + IC.ig + '</a>' +
      '<a href="mailto:' + encodeURIComponent(siteSettings().email || 'datacenteracademy1@gmail.com') + '" rel="noopener" aria-label="البريد الإلكتروني">' + IC.mail + '</a>' +
      '<a href="tel:' + String(siteSettings().phone || '0594810786').replace(/[^0-9+]/g, '') + '" rel="noopener" aria-label="الهاتف">' + IC.phone + '</a>' +
      (siteSettings().website ? '<a href="' + esc(siteSettings().website) + '" target="_blank" rel="noopener noreferrer" aria-label="الموقع الإلكتروني">' + IC.website + '</a>' : '') +
      '</div>' +
      '<div class="credit">created by <span>Alaa Wadi</span> | all rights reserved.</div>';
  }

  /* مزامنة متغيّر ارتفاع الشريط مع الهيدر الفعلي (يستخدمه شريط المحرر واللوحات الجانبية الثابتة) */
  function syncTopbarVar() {
    var h = document.querySelector('.header');
    if (!h) return;
    var hh = h.offsetHeight;
    if (hh) document.documentElement.style.setProperty('--topbar-h', hh + 'px');
  }

  /* ----------------------------------------------------------
     ورقة الدورات المنبثقة (نفس سلوك لاندنج)
     ---------------------------------------------------------- */
  function renderSheetCourses() {
    var list = document.getElementById('coursesSheetList');
    if (!list || !window.Store) return;
    var titleEl = document.querySelector('.courses-sheet .sheet-title');

    /* على صفحة البلاي ليست: تعرض الورقة دروس الدورة الحالية بدل الدورات */
    var pl = window.PlaylistUI;
    if (document.body.dataset.page === 'playlist' && pl && pl.sheetItems) {
      list.dataset.mode = 'lessons';
      if (titleEl && pl.sheetTitle) titleEl.textContent = pl.sheetTitle();
      list.innerHTML = pl.sheetItems();
      return;
    }
    list.dataset.mode = 'courses';
    if (titleEl) titleEl.textContent = 'دورات مركز داتا';

    var certs = Store.collection('certificates');
    if (!certs.length) {
      list.innerHTML = '<div class="csi-empty">لا توجد دورات حالياً</div>';
      return;
    }
    list.innerHTML = certs.map(function (c) {
      return '' +
        '<a class="course-sheet-item" href="' + SITE.u('course', esc(c.id)) + '">' +
          '<img class="csi-thumb" src="' + esc(c.image) + '" alt="' + esc(c.title) + '" loading="lazy" decoding="async">' +
          '<div class="csi-main">' +
            '<div class="csi-title">' + esc(c.title) + '</div>' +
            '<div class="csi-sub">' +
              (c.duration ? '<span>' + ic('clock', 13) + esc(c.duration) + '</span>' : '') +
              (c.period ? '<span>' + ic('calendar', 13) + esc(c.period) + '</span>' : '') +
            '</div>' +
          '</div>' +
          (c.price ? '<span class="csi-price">' + esc(c.price) + '</span>' : '') +
          '<span class="csi-chev">' + ic('chevron-left', 18) + '</span>' +
        '</a>';
    }).join('');
  }

  function initSheet() {
    var overlay = document.getElementById('coursesSheetOverlay');
    var fab = document.getElementById('coursesFabBtn');
    if (!overlay || !fab || overlay.dataset.bound) return;
    overlay.dataset.bound = '1';

    renderSheetCourses();

    function open() { overlay.classList.add('open'); document.body.classList.add('no-scroll'); }
    function close() { overlay.classList.remove('open'); document.body.classList.remove('no-scroll'); }

    fab.addEventListener('click', open);
    overlay.addEventListener('click', function (e) {
      if (Date.now() - swipedAt < 500) return;
      if (e.target === overlay || e.target.closest('#coursesSheetClose')) close();
      var item = e.target.closest('.course-sheet-item');
      if (item) close();
    });
    overlay.addEventListener('keydown', function (e) {
      var item = e.target.closest('.course-sheet-item');
      if (item && e.key === ' ' && item.hasAttribute('href')) { e.preventDefault(); close(); location.href = item.getAttribute('href'); }
    });

    /* سحب لأسفل لإغلاق القائمة (لمس + ماوس) */
    var sheet = overlay.querySelector('.courses-sheet');
    var drag = false, pull = false, startY = 0, dy = 0, swipedAt = 0;

    function endDrag() {
      if (!drag) return;
      drag = false;
      sheet.style.transition = '';
      var wasPull = pull;
      pull = false;
      sheet.style.transform = '';
      if (wasPull) {
        swipedAt = Date.now();
        if (dy > 80) close();
      }
    }

    overlay.addEventListener('touchstart', function (ev) {
      if (!overlay.classList.contains('open') || ev.touches.length !== 1) return;
      drag = true; pull = false; dy = 0;
      startY = ev.touches[0].clientY;
      sheet.style.transition = 'none';
    }, { passive: true });

    overlay.addEventListener('touchmove', function (ev) {
      if (!drag || ev.touches.length !== 1) return;
      dy = ev.touches[0].clientY - startY;
      if (sheet.scrollTop <= 0 && dy > 0) {
        pull = true;
        if (ev.cancelable) ev.preventDefault();
        sheet.style.transform = 'translateY(' + Math.min(dy, 320) + 'px)';
      } else if (pull) {
        if (ev.cancelable) ev.preventDefault();
        sheet.style.transform = 'translateY(' + Math.max(0, Math.min(dy, 320)) + 'px)';
      }
    }, { passive: false });

    overlay.addEventListener('touchend', endDrag);
    overlay.addEventListener('touchcancel', endDrag);

    function mouseMove(ev) {
      if (!drag) return;
      dy = ev.clientY - startY;
      if (sheet.scrollTop <= 0 && dy > 6) {
        pull = true;
        sheet.style.transform = 'translateY(' + Math.min(dy, 320) + 'px)';
      } else if (pull) {
        sheet.style.transform = 'translateY(' + Math.max(0, Math.min(dy, 320)) + 'px)';
      }
    }

    function mouseUp() {
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
      sheet.style.userSelect = '';
      endDrag();
    }

    overlay.addEventListener('mousedown', function (ev) {
      if (!overlay.classList.contains('open') || ev.button !== 0) return;
      if (ev.target.closest('.sheet-close')) return;
      drag = true; pull = false; dy = 0;
      startY = ev.clientY;
      sheet.style.transition = 'none';
      sheet.style.userSelect = 'none';
      if (ev.target.tagName === 'IMG') ev.preventDefault();
      document.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', mouseUp);
    });
  }

  function mount() {
    var host = document.getElementById('topbarHost');
    if (host) host.innerHTML = headerHTML();

    if (!document.getElementById('siteFooter')) {
      var f = document.createElement('section');
      f.id = 'siteFooter';
      f.className = 'footer';
      f.innerHTML = footerHTML();
      document.body.appendChild(f);
    }

    if (!document.getElementById('bottomNavbar')) {
      document.body.insertAdjacentHTML('beforeend', tabbarHTML());
    }
    if (!document.getElementById('coursesSheetOverlay')) {
      document.body.insertAdjacentHTML('beforeend', sheetHTML());
    }
    document.body.classList.add('has-tabbar');

    initSheet();
    syncTopbarVar();
    if (!mount._bound) {
      mount._bound = true;
      window.addEventListener('resize', syncTopbarVar);
      window.addEventListener('load', syncTopbarVar);
    }
  }

  window.SiteChrome = { mount: mount, headerHTML: headerHTML, footerHTML: footerHTML, refreshSheet: renderSheetCourses };
})();
