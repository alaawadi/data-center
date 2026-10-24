(function () {
  'use strict';

  var urls = window.SITE_URLS || {};
  var menu;
  var trigger;

  function icon(name) {
    var paths = {
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
      theme: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
      login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/>'
    };
    return '<svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
  }

  function menuMarkup() {
    var actions = urls.authenticated
      ? '<form method="post" action="' + urls.logout + '">' +
        '<input type="hidden" name="csrfmiddlewaretoken" value="' + (window.CSRF_TOKEN || '') + '">' +
        '<button class="account-menu-item account-menu-logout" type="submit" role="menuitem">' + icon('logout') + '<span>تسجيل الخروج</span></button></form>'
      : '<a class="account-menu-item" href="' + urls.login + '" role="menuitem">' + icon('login') + '<span>تسجيل الدخول</span></a>' +
        '<a class="account-menu-item" href="' + urls.signup + '" role="menuitem">' + icon('user') + '<span>إنشاء حساب</span></a>';

    return '<nav class="account-menu" id="accountMenu" aria-label="خيارات الحساب" role="menu">' +
      actions +
      '<button class="account-menu-item" type="button" data-account-theme role="menuitem">' + icon('theme') +
      '<span>الثيم</span><span class="account-menu-theme-state"></span></button>' +
      '</nav>';
  }

  function syncThemeLabel() {
    if (!menu) return;
    var label = menu.querySelector('.account-menu-theme-state');
    if (label) {
      label.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? 'داكن' : 'فاتح';
    }
  }

  function positionMenu() {
    if (!menu || !trigger || !menu.classList.contains('is-open')) return;
    var rect = trigger.getBoundingClientRect();
    var menuRect = menu.getBoundingClientRect();
    var left = Math.max(8, Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - 8));
    var top = rect.bottom + 8;
    if (top + menuRect.height > window.innerHeight - 8 && rect.top > menuRect.height + 8) {
      top = rect.top - menuRect.height - 8;
      menu.classList.add('opens-up');
    } else {
      menu.classList.remove('opens-up');
    }
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.setProperty('--menu-arrow-offset', Math.max(14, Math.min(rect.right - left - 17, menuRect.width - 28)) + 'px');
  }

  function openMenu(button) {
    trigger = button;
    if (!menu) {
      document.body.insertAdjacentHTML('beforeend', menuMarkup());
      menu = document.getElementById('accountMenu');
    }
    syncThemeLabel();
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    positionMenu();
    var firstAction = menu.querySelector('[role="menuitem"]');
    if (firstAction) firstAction.focus();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
  }

  function closeMenu(restoreFocus) {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.classList.remove('opens-up');
    menu.setAttribute('aria-hidden', 'true');
    window.removeEventListener('resize', positionMenu);
    window.removeEventListener('scroll', positionMenu, true);
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    }
  }

  function toggleTheme() {
    if (window.UI && UI.toggleTheme) {
      UI.toggleTheme();
    } else {
      var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('dc-theme', next); } catch (err) { /* Theme remains applied for this page. */ }
    }
    syncThemeLabel();
  }

  function isProfilePage() {
    var page = document.body.getAttribute('data-page');
    return page === 'home' || page === 'user-profile';
  }

  document.addEventListener('click', function (event) {
    var accountButton = event.target.closest('#account-btn');
    if (accountButton) {
      event.preventDefault();
      if (!isProfilePage()) {
        window.location.href = urls.authenticated ? urls.portfolio : urls.login;
        return;
      }
      if (menu && menu.classList.contains('is-open') && trigger === accountButton) {
        closeMenu(false);
      } else {
        openMenu(accountButton);
      }
      return;
    }
    if (!menu || !menu.classList.contains('is-open')) return;
    if (event.target.closest('[data-account-theme]')) {
      toggleTheme();
    } else if (!menu.contains(event.target)) {
      closeMenu(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (!menu || !menu.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      closeMenu(true);
      return;
    }
    if (event.key === 'Tab') {
      var focusable = menu.querySelectorAll('a[href], button:not([disabled])');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();
