/* ============================================================
   landing-nav.js — يعرض قسم "الدورات التدريبية" داخل صفحة الهبوط:
   بدون تبويبات، ويعرض الشهادات فقط، بنفس بنية platform.js
   وبنفس البيانات الحقيقية من Store وبأيقونات UI،
   مع أنماط محصورة في css/plat-nav.css.
   ============================================================ */
(function () {
  'use strict';

  var TEXT = {
    navTitle: 'الدورات التدريبية',
    navSub: 'استعرض الدورات التدريبية المعتمدة في مركز داتا',
    viewAll: 'كل الدورات',
    certVerified: 'موثقة',
    certApproved: 'شهادة معتمدة',
    footer: 'دورات تدريبية عملية مع شهادات معتمدة — من مركز داتا للتدريب والتطوير.'
  };

  var e = UI.esc;
  function t(key) { return TEXT[key] || key; }

  function certCard(c, from) {
    var skills = (c.skills || []).slice(0, 2).map(function (s) { return '<span class="chip sm cert-skill">' + e(s) + '</span>'; }).join('');
    var params = [];
    if (from) params.push('from=' + encodeURIComponent(from));
    if (from === 'landing') {
      params.push('return=' + encodeURIComponent(location.pathname + location.search + '#nav'));
    }
    return '<a class="cert-card" href="' + SITE.u('course', e(c.id)) + (params.length ? '?' + params.join('&') : '') + '">' +
      '<div class="cert-thumb">' +
      (c.image ? '<img src="' + e(c.image) + '" alt="" loading="lazy" decoding="async">' : '') +
      '<span class="cert-cat">' + e(c.category || '') + '</span>' +
      (c.price ? '<span class="cert-price-tag">' + e(c.price) + '</span>' : '') +
      '</div>' +
      '<div class="cert-body">' +
      '<h3>' + e(c.title) + '</h3>' +
      ((c.skills && c.skills.length) ? '<div class="cert-skills">' + skills + '</div>' : '') +
      '<div class="cert-foot">' +
        (c.duration ? '<span class="cert-meta">' + UI.icon('clock', 13) + e(c.duration) + '</span>' : '') +
        '<span class="verified-mini">' + UI.verifiedBadge(14) + e(t('certApproved')) + '</span>' +
      '</div>' +
      '</div></a>';
  }

  function renderNav() {
    var host = document.getElementById('nav');
    if (!host) return;
    var grid = Store.collection('certificates').slice(0, 9).map(function (c) {
      return certCard(c, 'landing');
    }).join('');
    host.innerHTML =
      '<div class="card nav-card">' +
      '<div class="sec-head" style="padding:20px 20px 0"><div>' +
      '<h2>' + UI.icon('award', 20) + e(t('navTitle')) + '</h2>' +
      '<p>' + e(t('navSub')) + '</p></div></div>' +
      '<div class="nav-panels">' +
      '<section class="nav-panel active" data-panel="certificates">' +
      '<div class="card-grid">' + grid + '</div>' +
      '<div class="panel-foot"><a class="pn-btn pn-btn-soft" href="' + SITE.u('courses') + '">' +
      UI.icon('external-link', 15) + e(t('viewAll')) + '</a></div>' +
      '</section>' +
      '</div>' +
      '</div>' +
      '<p class="plat-footer">' + e(t('footer')) + '</p>';
  }

  function gotoLinks() {
    return document.querySelectorAll('.navbar a[data-goto-tab]');
  }

  function syncHeaderActive() {
    var section = document.getElementById('nav');
    var r = section ? section.getBoundingClientRect() : null;
    var inView = r && r.top <= 160 && r.bottom > 160;
    gotoLinks().forEach(function (a) {
      a.classList.toggle('active', !!inView && a.getAttribute('data-goto-tab') === 'certificates');
    });
  }

  function init() {
    if (window.Store && Store.init) Store.init();
    if (window.I18n && I18n.init) I18n.init();
    renderNav();
    document.addEventListener('click', function (ev) {
      var go = ev.target.closest ? ev.target.closest('[data-goto-tab]') : null;
      if (go) {
        ev.preventDefault();
        var el = document.getElementById('nav');
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    window.addEventListener('scroll', syncHeaderActive, { passive: true });
    window.addEventListener('resize', syncHeaderActive);
    syncHeaderActive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
