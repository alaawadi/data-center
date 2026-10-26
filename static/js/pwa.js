(function () {
  'use strict';

  var deferredInstallPrompt = null;
  var promptEl;
  var launcherEl;
  var installButton;
  var descriptionEl;

  function isInstalled() {
    var displayModes = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];
    var installedDisplayMode = window.matchMedia && displayModes.some(function (mode) {
      return window.matchMedia('(display-mode: ' + mode + ')').matches;
    });
    var previouslyInstalled = false;
    try {
      previouslyInstalled = window.localStorage.getItem('pwa-installed') === '1';
    } catch (error) {
      previouslyInstalled = false;
    }
    return installedDisplayMode || window.navigator.standalone === true || previouslyInstalled;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  }

  function closePrompt() {
    promptEl.hidden = true;
    launcherEl.hidden = false;
    launcherEl.setAttribute('aria-expanded', 'false');
  }

  function showPrompt() {
    if (isInstalled()) return;
    promptEl.hidden = false;
    launcherEl.hidden = true;
    launcherEl.setAttribute('aria-expanded', 'true');
    installButton.focus();
  }

  function renderInstructions() {
    if (deferredInstallPrompt) {
      descriptionEl.textContent = 'ثبّت التطبيق للوصول إليه بسرعة واستخدام الصفحات العامة التي زرتها عند انقطاع الإنترنت.';
      installButton.textContent = 'تحميل التطبيق';
    } else if (isIOS()) {
      descriptionEl.textContent = 'لتثبيت التطبيق على iPhone أو iPad: اضغط زر المشاركة في Safari، ثم اختر «إضافة إلى الشاشة الرئيسية».';
      installButton.textContent = 'طريقة التثبيت';
    } else {
      descriptionEl.textContent = 'يمكن تثبيت التطبيق من قائمة المتصفح باختيار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». الصفحات العامة التي زرتها وبعض ملفات الموقع ستتوفر دون إنترنت.';
      installButton.textContent = 'طريقة التثبيت';
    }
  }

  function appLogo() {
    return '<span class="pwa-logo-box"><img class="pwa-app-logo" src="/static/images/logo.svg" alt=""></span>';
  }

  function hideIfInstalled() {
    if (!isInstalled()) return;
    promptEl.hidden = true;
    launcherEl.hidden = true;
  }

  function handleAppInstalled() {
    deferredInstallPrompt = null;
    try {
      window.localStorage.setItem('pwa-installed', '1');
    } catch (error) {
      console.warn('Could not persist installed app state:', error);
    }
    hideIfInstalled();
  }

  function mount() {
    if (isInstalled()) return;
    document.body.insertAdjacentHTML('beforeend',
      '<section class="pwa-prompt" id="pwaPrompt" role="dialog" aria-labelledby="pwaPromptTitle" aria-describedby="pwaPromptDescription" hidden>' +
      '<div class="pwa-prompt-head">' +
      '<span class="pwa-prompt-icon" aria-hidden="true">' + appLogo() + '</span>' +
      '<div class="pwa-prompt-copy"><h2 id="pwaPromptTitle">Install Data Center</h2>' +
      '<p id="pwaPromptDescription"></p></div>' +
      '<button class="pwa-prompt-close" id="pwaPromptClose" type="button" aria-label="إغلاق">×</button>' +
      '</div>' +
      '<button class="pwa-install-button" id="pwaInstallButton" type="button"></button>' +
      '</section>' +
      '<button class="pwa-launcher" id="pwaLauncher" type="button" aria-label="Install Data Center app" aria-expanded="false">' + appLogo() + '</button>');

    promptEl = document.getElementById('pwaPrompt');
    launcherEl = document.getElementById('pwaLauncher');
    installButton = document.getElementById('pwaInstallButton');
    descriptionEl = document.getElementById('pwaPromptDescription');
    renderInstructions();

    launcherEl.addEventListener('click', function () {
      showPrompt();
      launcherEl.setAttribute('aria-expanded', 'true');
    });
    document.getElementById('pwaPromptClose').addEventListener('click', closePrompt);
    installButton.addEventListener('click', function () {
      if (!deferredInstallPrompt) {
        if (isIOS()) {
          descriptionEl.textContent = 'في Safari اضغط زر المشاركة أسفل الشاشة، ثم مرّر الخيارات واختر «إضافة إلى الشاشة الرئيسية».';
        } else {
          descriptionEl.textContent = 'افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».';
        }
        return;
      }

      deferredInstallPrompt.prompt().then(function () {
        var installPrompt = deferredInstallPrompt;
        return installPrompt.userChoice;
      }).then(function (choice) {
        deferredInstallPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          promptEl.hidden = true;
          launcherEl.hidden = true;
        } else {
          renderInstructions();
        }
      }).catch(function () {
        deferredInstallPrompt = null;
        renderInstructions();
      });
    });

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      renderInstructions();
    });
    window.addEventListener('appinstalled', handleAppInstalled);
    if (window.matchMedia) {
      var standaloneQuery = window.matchMedia('(display-mode: standalone)');
      if (standaloneQuery.addEventListener) standaloneQuery.addEventListener('change', hideIfInstalled);
      else if (standaloneQuery.addListener) standaloneQuery.addListener(hideIfInstalled);
    }

    var alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem('pwa-prompt-shown') === '1';
      if (!alreadyShown) window.sessionStorage.setItem('pwa-prompt-shown', '1');
    } catch (error) {
      alreadyShown = false;
    }
    if (!alreadyShown) window.setTimeout(showPrompt, 1200);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https:$/.test(window.location.protocol) &&
        window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return;
    }
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch(function (error) {
      console.error('Service worker registration failed:', error);
    });
  }

  registerServiceWorker();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
