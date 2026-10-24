/* ============================================================
   landing.js — منطق صفحة هبوط مركز داتا (Vanilla JS بلا مكتبات)
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     ثوابت عامة
     ---------------------------------------------------------- */
  var WHATSAPP = '972594810786';
  var INSTAGRAM = 'https://www.instagram.com/data_center.ps';
  var EMAIL = 'datacenteracademy1@gmail.com';
  var THEME_KEY = 'dc-theme';
  var STORE_KEY = 'student_portfolio_v2';

  /* ----------------------------------------------------------
     أيقونات SVG (lucide-style)
     ---------------------------------------------------------- */
  var ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    'sign-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    'sign-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    'book-open': '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    'graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    laptop: '<rect width="18" height="12" x="3" y="4" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    whatsapp: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
  };

  var halfStarId = 0;

  function icon(name, size, cls) {
    size = size || 18;
    var p = ICONS[name] || '';
    return '<svg class="ic ' + (cls || '') + '" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function iconFilled(name, size, cls) {
    size = size || 18;
    var p = ICONS[name] || '';
    return '<svg class="ic ' + (cls || '') + '" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  function starRow() {
    var id = 'halfStar' + (++halfStarId);
    var full = '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + ICONS.star + '</svg>';
    var half = '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '"><stop offset="50%" stop-color="currentColor"/>' +
      '<stop offset="50%" stop-color="currentColor" stop-opacity=".28"/></linearGradient></defs>' +
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#' + id + ')"/></svg>';
    return full + full + full + full + half;
  }

  /* ----------------------------------------------------------
     أدوات مساعدة
     ---------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function waLink(msg) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg);
  }

  /* ----------------------------------------------------------
     التنبيهات (Toast)
     ---------------------------------------------------------- */
  var toastRoot = null;
  function toast(message, type) {
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.className = 'toast-root';
      document.body.appendChild(toastRoot);
    }
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    var ico = type === 'success' ? 'check' : (type === 'error' ? 'alert' : 'alert');
    el.innerHTML = icon(ico, 18) + '<span>' + esc(message) + '</span>';
    toastRoot.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 300);
    }, 2600);
  }

  /* ----------------------------------------------------------
     النافذة المنبثقة (Modal)
     ---------------------------------------------------------- */
  var modalWrap = null;

  function ensureModal() {
    if (modalWrap) return modalWrap;
    modalWrap = document.createElement('div');
    modalWrap.className = 'modal-wrap';
    modalWrap.setAttribute('aria-hidden', 'true');
    modalWrap.innerHTML =
      '<div class="modal-overlay" data-close></div>' +
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<button class="m-close" type="button" data-close aria-label="إغلاق">' + icon('x', 18) + '</button>' +
        '<div class="modal-body"></div>' +
      '</div>';
    document.body.appendChild(modalWrap);

    modalWrap.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeModal();
    });
    return modalWrap;
  }

  function openModal(html) {
    var w = ensureModal();
    $('.modal-body', w).innerHTML = html;
    w.classList.add('open');
    w.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    if (!modalWrap) return;
    modalWrap.classList.remove('open');
    modalWrap.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }

  /* نافذة تفاصيل الدورة */
  function openCourseModal(id) {
    var entry = COURSES[id];
    if (!entry || !entry.card) return;
    var c = entry.card;
    var msg = 'مرحبا مركز داتا\nبدي اسجل اونلاين على منصة Data Center التعليمية في دورة ' + c.title;

    openModal(
      '<div class="m-emblem">' + icon('book-open', 34) + '</div>' +
      '<h3 class="m-title">' + esc(c.title) + '</h3>' +
      '<span class="m-chip">' + icon('award', 15) + ' ' + esc(c.price) + '</span>' +
      '<div class="m-meta">' +
        '<span class="m-chip">' + icon('clock', 15) + ' ' + esc(c.duration) + '</span>' +
        '<span class="m-chip">' + icon('calendar', 15) + ' ' + esc(c.period) + '</span>' +
        '<span class="m-chip">' + icon('list', 15) + ' ' + esc(c.lectures) + '</span>' +
      '</div>' +
      '<p class="m-text">' + esc(c.description) + '</p>' +
      '<p class="m-sub">سجّل في الدورة الآن عبر واتساب وسيتواصل معك فريقنا لإتمام التسجيل.</p>' +
      '<div class="m-actions">' +
        '<a class="m-btn m-btn-wa" href="' + waLink(msg) + '" target="_blank" rel="noopener">' +
          icon('whatsapp', 18) + ' التسجيل عبر واتساب</a>' +
        '<button class="m-btn m-btn-cancel" type="button" data-close>إغلاق</button>' +
      '</div>'
    );
  }

  /* ----------------------------------------------------------
     بطاقات الدورات
     ---------------------------------------------------------- */
  function renderCourses() {
    var container = $('#course-cards-container');
    if (!container || typeof COURSES === 'undefined') return;

    container.innerHTML = Object.keys(COURSES).map(function (key) {
      var c = COURSES[key].card;
      return '' +
        '<div class="box" role="button" tabindex="0" data-course="' + esc(c.id) + '">' +
          '<img src="' + esc(c.image) + '" alt="' + esc(c.alt) + '" loading="lazy">' +
          '<span class="price">' + esc(c.price) + '</span>' +
          '<div class="content">' +
            '<div class="stars">' + starRow() + '</div>' +
            '<h3 class="title">' + esc(c.title) + '</h3>' +
            '<div class="info">' +
              '<h3>' + icon('clock', 13) + esc(c.duration) + '</h3>' +
              '<h3>' + icon('calendar', 13) + esc(c.period) + '</h3>' +
              '<h3>' + icon('list', 13) + esc(c.lectures) + '</h3>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  /* ----------------------------------------------------------
     فتح تفاصيل الدورة عند النقر على البطاقة
     ---------------------------------------------------------- */
  function initCourseCards() {
    var container = $('#course-cards-container');
    if (!container) return;
    container.addEventListener('click', function (e) {
      var card = e.target.closest('[data-course]');
      if (card) openCourseModal(card.dataset.course);
    });
    container.addEventListener('keydown', function (e) {
      var card = e.target.closest('[data-course]');
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openCourseModal(card.dataset.course); }
    });
  }

  /* ----------------------------------------------------------
     قائمة الدورات المنبثقة (Bottom Sheet)
     ---------------------------------------------------------- */
  function renderSheetCourses() {
    var list = $('#coursesSheetList');
    if (!list || typeof Store === 'undefined') return;
    var certs = Store.collection('certificates');
    if (!certs.length) {
      list.innerHTML = '<div class="csi-empty">لا توجد دورات حالياً</div>';
      return;
    }
    list.innerHTML = certs.map(function (c) {
      return '' +
        '<a class="course-sheet-item" href="' + SITE.u('course', esc(c.id)) + '?from=landing">' +
          '<img class="csi-thumb" src="' + esc(c.image) + '" alt="' + esc(c.title) + '" loading="lazy">' +
          '<div class="csi-main">' +
            '<div class="csi-title">' + esc(c.title) + '</div>' +
            '<div class="csi-sub">' +
              (c.duration ? '<span>' + icon('clock', 13) + esc(c.duration) + '</span>' : '') +
              (c.period ? '<span>' + icon('calendar', 13) + esc(c.period) + '</span>' : '') +
            '</div>' +
          '</div>' +
          (c.price ? '<span class="csi-price">' + esc(c.price) + '</span>' : '') +
          '<span class="csi-chev">' + icon('chevron-left', 18) + '</span>' +
        '</a>';
    }).join('');
  }

  function initSheet() {
    var overlay = $('#coursesSheetOverlay');
    var fab = $('#coursesFabBtn');
    if (!overlay || !fab) return;

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
      if (item && e.key === ' ') { e.preventDefault(); close(); location.href = item.getAttribute('href'); }
    });

    /* سحب لأسفل لإغلاق القائمة */
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

    /* سحب بالماوس لأسفل لإغلاق القائمة */
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

  /* ----------------------------------------------------------
     تقييمات الطلاب (Carousel بلا مكتبات)
     ---------------------------------------------------------- */
  function initReviews() {
    var track = $('.reviews-track');
    if (!track) return;

    $$('.review-slide .stars', track).forEach(function (el) { el.innerHTML = starRow(); });

    var slides = $$('.review-slide', track);

    function updateActive() {
      if (!slides.length) return;
      var mid = track.getBoundingClientRect().left + track.clientWidth / 2;
      var best = null, bestD = Infinity;
      slides.forEach(function (s) {
        var r = s.getBoundingClientRect();
        var d = Math.abs((r.left + r.right) / 2 - mid);
        if (d < bestD) { bestD = d; best = s; }
      });
      slides.forEach(function (s) { s.classList.toggle('active', s === best); });
    }
    updateActive();
    track.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);

    function step() {
      var slide = $('.review-slide', track);
      return slide ? slide.getBoundingClientRect().width + 20 : track.clientWidth;
    }

    var timer = setInterval(function () {
      var rtl = getComputedStyle(track).direction === 'rtl';
      var max = track.scrollWidth - track.clientWidth - 4;
      var atEnd = rtl ? track.scrollLeft <= -max : track.scrollLeft >= max;
      if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: (rtl ? -step() : step()), behavior: 'smooth' });
    }, 3000);

    track.addEventListener('pointerdown', function () { clearInterval(timer); }, { once: true });
  }

  /* ----------------------------------------------------------
     شريط الشركاء (Marquee)
     ---------------------------------------------------------- */
  function initBrands() {
    var marquee = $('.brand-marquee');
    if (!marquee) return;
    var logos = [
      ['swb_org.avif', 'SWB'],
      ['msf_org.svg', 'MSF'],
      ['eac_org.svg', 'EAC'],
      ['interpal_org.svg', 'Interpal']
    ];
    var html = logos.map(function (l) {
      return '<img src="' + SITE.assets('images/' + l[0]) + '" alt="' + l[1] + '" loading="lazy">';
    }).join('');
    marquee.innerHTML = '<div class="bm-set">' + html + '</div>' +
      '<div class="bm-set">' + html + '</div>';
  }

  /* ----------------------------------------------------------
     نموذج التسجيل
     ---------------------------------------------------------- */
  function initNav() {
    var headerLinks = $$('.navbar a:not([data-goto-tab]), .bottom-navbar a[href^="#"], .bottom-navbar a[href*="#"]');
    var sections = $$('section[id]');
    var bottomTabs = $$('.bottom-navbar a');
    var indicator = $('#bottomTabIndicator');

    function moveIndicator(tab) {
      if (!indicator || !tab) return;
      indicator.style.opacity = '1';
      indicator.style.width = tab.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    }

    function setActive(id) {
      headerLinks.forEach(function (a) {
        var href = a.getAttribute('href') || '';
        a.classList.toggle('active', href.indexOf('#' + id) !== -1);
      });
      bottomTabs.forEach(function (a) {
        var href = a.getAttribute('href') || '';
        var on = href.indexOf('#' + id) !== -1;
        a.classList.toggle('active', on);
        if (on) moveIndicator(a);
      });
    }

    function onScroll() {
      var current = sections.length ? sections[0].id : '';
      sections.forEach(function (s) {
        if (s.getBoundingClientRect().top <= 160) current = s.id;
      });
      setActive(current);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      var active = $('.bottom-navbar a.active');
      if (active) moveIndicator(active);
    });
    onScroll();
  }

  /* ----------------------------------------------------------
     تبديل الوضع الليلي / النهاري
     ---------------------------------------------------------- */
  function storedTheme() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var st = JSON.parse(raw);
        if (st && st.ui && st.ui.theme) return st.ui.theme === 'dark' ? 'dark' : 'light';
      }
    } catch (e) { /* ignore */ }
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  }

  /* ----------------------------------------------------------
     زر واتساب العائم + تاب التسجيل
     ---------------------------------------------------------- */
  function initWhatsapp() {
    var msg = 'مرحبا اريد معلومات عن';
    var waTab = $('#waTabBtn');
    if (waTab) {
      var go = function () { window.open(waLink(msg), '_blank'); };
      waTab.addEventListener('click', go);
      waTab.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    }
  }

  /* ----------------------------------------------------------
     حماية المحتوى (نسخ/قص/قائمة السياق)
     ---------------------------------------------------------- */
  function initProtect() {
    ['copy', 'cut', 'contextmenu'].forEach(function (evt) {
      document.addEventListener(evt, function (e) { e.preventDefault(); });
    });
  }

  /* ----------------------------------------------------------
     شاشة التحميل
     ---------------------------------------------------------- */
  function initLoader() {
    var loader = $('#siteLoader');
    if (!loader) return;
    function done() { loader.classList.add('done'); setTimeout(function () { loader.remove(); }, 400); }
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', function () { setTimeout(done, 300); });
  }

  /* ----------------------------------------------------------
     الإقلاع
     ---------------------------------------------------------- */
  function init() {
    document.documentElement.setAttribute('data-theme', storedTheme());

    renderCourses();
    initCourseCards();
    initSheet();
    initReviews();
    initBrands();
    initNav();
    initWhatsapp();
    initProtect();
    initLoader();

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
