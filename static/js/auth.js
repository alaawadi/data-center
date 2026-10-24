/* ===== منطق صفحات الدخول والتسجيل (واجهة فقط — المصادقة على السيرفر) ===== */
(function () {
  'use strict';

  var PHONE_RE = /^0(59|56)\d{7}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- أدوات ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function e(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg, type) {
    var root = document.getElementById('toastRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toastRoot';
      document.body.appendChild(root);
    }
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.innerHTML = '<span>' + e(msg) + '</span>';
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 300);
    }, 2600);
  }

  function digitsOnly(input, max) {
    if (!input) return;
    var cap = max || 10;
    input.addEventListener('input', function () {
      var pos = input.selectionStart === input.selectionEnd;
      var before = input.value;
      var v = before.replace(/\D/g, '').slice(0, cap);
      if (v !== before) {
        var at = input.selectionStart || v.length;
        input.value = v;
        if (pos) { try { input.setSelectionRange(at - (before.length - v.length), at - (before.length - v.length)); } catch (err) { /* ignore */ } }
      }
    });
    input.addEventListener('keydown', function (ev) {
      if (!/^[0-9]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) {
        ev.preventDefault();
      }
    });
  }

  function setLoading(btn) {
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>';
  }

  function validPhone(v) { return PHONE_RE.test(String(v || '').trim()); }

  function validEmail(v) { return EMAIL_RE.test(String(v || '').trim()); }

  function validPassword(v) { return String(v || '').length >= 8; }

  function strengthOf(pw) {
    var s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
    if (!pw) s = 0;
    return Math.min(s, 4);
  }

  var STRENGTH_LABELS = ['', 'ضعيفة', 'متوسطة', 'قوية', 'ممتازة'];

  function mountStrength(pwInput) {
    if (!pwInput) return;
    var form = pwInput.closest('form');
    var meter = form && form.querySelector('.strength');
    if (!meter) return;
    var txt = meter.querySelector('.strength-txt');
    function update() {
      var s = strengthOf(pwInput.value);
      meter.className = 'strength s' + s;
      txt.textContent = s ? 'قوة كلمة المرور: ' + STRENGTH_LABELS[s] : 'استخدم 8 أحرف على الأقل مع أرقام ورموز';
    }
    pwInput.addEventListener('input', update);
    update();
  }

  function toggleEyes() {
    $$('.pw-eye').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.getAttribute('data-for'));
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
        btn.innerHTML = show
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
      });
    });
  }

  /* ---------- المظهر ---------- */
  (function initTheme() {
    var t = 'light';
    try { t = localStorage.getItem('dc-theme') || 'light'; } catch (err) { /* ignore */ }
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('dc-theme', next); } catch (err) { /* ignore */ }
    });
  })();

  /* ================= صفحة إنشاء حساب ================= */
  var signupForm = document.getElementById('signupForm');
  if (signupForm) {
    var nameInput = document.getElementById('suName');
    var phoneInput = document.getElementById('suPhone');
    digitsOnly(phoneInput);
    var emailInput = document.getElementById('suEmail');
    var pwInput = document.getElementById('suPassword');
    var pw2Input = document.getElementById('suPassword2');
    mountStrength(pwInput);

    var phoneTaken = false;
    var phoneReqId = 0;
    var phoneTimer = null;

    function setPhoneHint(text, cls) {
      var hint = document.getElementById('suPhoneHint');
      if (!hint) return;
      hint.textContent = text;
      hint.classList.remove('error', 'ok');
      if (cls) hint.classList.add(cls);
    }

    function nameWords() {
      return nameInput ? nameInput.value.trim().split(/\s+/).filter(Boolean) : [];
    }

    function setNameHint(text, cls) {
      var hint = document.getElementById('suNameHint');
      if (!hint) return;
      hint.textContent = text;
      hint.classList.remove('error', 'ok');
      if (cls) hint.classList.add(cls);
    }

    function checkNameLive() {
      if (!nameInput) return true;
      var n = nameWords().length;
      if (n === 0) { setNameHint('من كلمتين إلى ثلاث كلمات'); return true; }
      if (n < 2) { setNameHint('الاسم يجب أن يتكوّن من كلمتين على الأقل', 'error'); return false; }
      if (n > 3) { setNameHint('الاسم يجب ألا يزيد عن ثلاث كلمات', 'error'); return false; }
      setNameHint('الاسم صحيح ✓', 'ok');
      return true;
    }

    if (nameInput) nameInput.addEventListener('input', checkNameLive);

    function checkPhoneLive() {
      if (!phoneInput) return true;
      var box = phoneInput.closest('.phone-box');
      var v = phoneInput.value;
      if (!v) { box.classList.remove('bad'); setPhoneHint('يبدأ بـ 059 أو 056 — 10 أرقام'); return true; }
      if (!validPhone(v)) {
        box.classList.add('bad');
        setPhoneHint('الرقم غير صحيح — يجب أن يبدأ بـ 059 أو 056 ويتكوّن من 10 أرقام', 'error');
        return false;
      }
      box.classList.remove('bad');
      return true;
    }

    function lookupPhone() {
      if (!phoneInput) return;
      var v = phoneInput.value.trim();
      if (!validPhone(v)) return;
      var id = ++phoneReqId;
      var base = (window.SITE_URLS && SITE_URLS.phoneCheck) || '/phone-available/';
      setPhoneHint('جارٍ التحقق من الرقم...');
      fetch(base + '?phone=' + encodeURIComponent(v), { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) {
          if (r.status === 429) return { limited: true };
          if (!r.ok) return { ok: false };
          return r.json();
        })
        .then(function (data) {
          if (id !== phoneReqId || !data) return;
          if (data.limited) { setPhoneHint('عذراً، تجاوزت عدد الطلبات — حاول مرة أخرى بعد قليل'); return; }
          if (!data.ok) { setPhoneHint(''); return; }
          phoneTaken = !data.available;
          if (data.available) setPhoneHint('الرقم متاح ✓', 'ok');
          else setPhoneHint('هذا الرقم مستخدم بالفعل', 'error');
        })
        .catch(function () { if (id === phoneReqId) setPhoneHint(''); });
    }

    if (phoneInput) phoneInput.addEventListener('input', function () {
      checkPhoneLive();
      phoneTaken = false;
      phoneReqId++;
      if (phoneTimer) clearTimeout(phoneTimer);
      if (validPhone(phoneInput.value.trim())) phoneTimer = setTimeout(lookupPhone, 350);
    });

    signupForm.addEventListener('submit', function (ev) {
      var phone = phoneInput ? phoneInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var pw = pwInput ? pwInput.value : '';
      var pw2 = pw2Input ? pw2Input.value : '';

      var words = nameWords().length;
      if (!words) { ev.preventDefault(); toast('أدخل اسمك الكامل', 'error'); if (nameInput) nameInput.focus(); return; }
      if (words < 2) { ev.preventDefault(); checkNameLive(); toast('الاسم الكامل يجب أن يتكوّن من كلمتين على الأقل', 'error'); if (nameInput) nameInput.focus(); return; }
      if (words > 3) { ev.preventDefault(); checkNameLive(); toast('الاسم الكامل يجب ألا يزيد عن ثلاث كلمات', 'error'); if (nameInput) nameInput.focus(); return; }
      if (!validPhone(phone)) { ev.preventDefault(); checkPhoneLive(); toast('رقم الجوال غير صحيح', 'error'); if (phoneInput) phoneInput.focus(); return; }
      if (phoneTaken) { ev.preventDefault(); toast('هذا الرقم مستخدم بالفعل', 'error'); if (phoneInput) phoneInput.focus(); return; }
      if (!validEmail(email)) { ev.preventDefault(); toast('أدخل بريداً إلكترونياً صحيحاً', 'error'); if (emailInput) emailInput.focus(); return; }
      if (!validPassword(pw)) { ev.preventDefault(); toast('كلمة المرور يجب ألا تقل عن 8 أحرف', 'error'); if (pwInput) pwInput.focus(); return; }
      if (strengthOf(pw) < 2) { ev.preventDefault(); toast('كلمة المرور ضعيفة — أضف أرقاماً ورموزاً', 'error'); if (pwInput) pwInput.focus(); return; }
      if (pw !== pw2) { ev.preventDefault(); toast('كلمتا المرور غير متطابقتين', 'error'); if (pw2Input) pw2Input.focus(); return; }

      setLoading(signupForm.querySelector('button[type="submit"]'));
    });
  }

  /* ================= صفحة تأكيد البريد ================= */
  var verifyForm = document.getElementById('verifyForm');
  if (verifyForm) {
    var codeInput = document.getElementById('vcCode');
    digitsOnly(codeInput, 6);

    var resendBtn = document.getElementById('resendBtn');
    if (resendBtn && resendBtn.dataset.wait) {
      var left = parseInt(resendBtn.dataset.wait, 10) || 0;
      var label = 'إعادة إرسال الرمز';
      (function tick() {
        if (left <= 0) { resendBtn.disabled = false; resendBtn.textContent = label; return; }
        resendBtn.textContent = label + ' (' + left + ')';
        left -= 1;
        setTimeout(tick, 1000);
      })();
    }
  }

  /* ================= صفحة تسجيل الدخول ================= */
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    var lPhone = document.getElementById('liPhone');
    digitsOnly(lPhone);
    var lPw = document.getElementById('liPassword');

    loginForm.addEventListener('submit', function (ev) {
      var phone = lPhone ? lPhone.value.trim() : '';
      var pw = lPw ? lPw.value : '';

      if (!validPhone(phone)) { ev.preventDefault(); toast('رقم الجوال غير صحيح — 059 أو 056 و10 أرقام', 'error'); if (lPhone) lPhone.focus(); return; }
      if (!pw) { ev.preventDefault(); toast('أدخل كلمة المرور', 'error'); if (lPw) lPw.focus(); return; }

      setLoading(loginForm.querySelector('button[type="submit"]'));
    });
  }

  toggleEyes();
})();
