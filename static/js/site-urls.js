/* ============================================================
   site-urls.js — واجهة مساعدة للروابط المولّدة من Django
   تُقرأ من window.SITE_URLS التي تحقنها partials/js_urls.html
   ============================================================ */
(function () {
  'use strict';

  var U = window.SITE_URLS || {};

  function build(key, value) {
    var t = U[key];
    if (!t) return '/';
    if (value == null || value === '') {
      return t.replace('__ID__', '').replace('HANDLE', '');
    }
    return t
      .replace('__ID__', encodeURIComponent(value))
      .replace('HANDLE', encodeURIComponent(value));
  }

  window.SITE = window.SITE || {};

  /* SITE.u('course', 12) → /courses/12/ */
  window.SITE.u = build;

  /* SITE.assets('images/logo.svg') → /static/images/logo.svg */
  window.SITE.assets = function (path) {
    return (U.assets || '/static/') + (path || '');
  };

  /* SITE.trainerProjects() — مشاريع المدرب لاختيار أحدها في محرر الدورة */
  window.SITE.trainerProjects = function () {
    var el = document.getElementById('trainer-projects-data');
    if (!el) return [];
    try {
      var d = JSON.parse(el.textContent);
      return Array.isArray(d) ? d : [];
    } catch (err) { return []; }
  };

  /*
   * SITE.param('id') — يقرأ المعامل من query string أولاً،
   * ثم يستنتجه من مسار الصفحة:
   *   /courses/c1/           → c1
   *   /courses/c1/certificate/ → c1 (يتجاهل أسماء المسارات الفرعية)
   *   /courses/ , /courses/edit/ , /panel/ → null
   */
  var ROUTE_SEG = {
    courses: 1, projects: 1, edit: 1, freelancers: 1,
    panel: 1, login: 1, signup: 1, portfolio: 1, landing: 1
  };
  var SUB_SEG = { certificate: 1, playlist: 1 };

  window.SITE.param = function (name) {
    try {
      var v = new URLSearchParams(location.search).get(name);
      if (v) return v;
    } catch (err) { /* ignore */ }
    var parts = location.pathname.split('/').filter(Boolean).map(function (seg) {
      try { return decodeURIComponent(seg); } catch (err) { return seg; }
    });
    if (!parts.length) return null;
    var last = parts[parts.length - 1];
    if (name === 'id') {
      if (SUB_SEG[last]) {
        var prev = parts[parts.length - 2];
        return prev && !ROUTE_SEG[prev] && !SUB_SEG[prev] ? prev : null;
      }
      if (ROUTE_SEG[last]) return null;
      return last;
    }
    if (name === 'handle') {
      if (ROUTE_SEG[last]) return null;
      return last;
    }
    return last;
  };
})();
