(function () {
  'use strict';

  var root = document.documentElement;
  var transitionClass = 'is-page-transitioning';
  var settlingClass = 'is-page-transition-settling';
  var pendingAttribute = 'data-page-transition-pending';
  var fadeDuration = 100;

  function clearTransition() {
    root.classList.remove(transitionClass);
    root.classList.remove(settlingClass);
    root.removeAttribute(pendingAttribute);
  }

  function finishTransition() {
    root.removeAttribute(pendingAttribute);
    if (!root.classList.contains(transitionClass)) return;
    root.classList.add(settlingClass);
    window.setTimeout(clearTransition, fadeDuration);
  }

  if (root.hasAttribute(pendingAttribute)) {
    window.setTimeout(function () {
      if (root.hasAttribute(pendingAttribute) || root.classList.contains(transitionClass)) {
        clearTransition();
      }
    }, 2500);
    if (document.readyState === 'complete') {
      finishTransition();
    } else {
      document.addEventListener('DOMContentLoaded', finishTransition, { once: true });
    }
  }

  window.addEventListener('pageshow', finishTransition);

  function isInternalPageNavigation(href, link, event) {
    if (!href || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link && (link.hasAttribute('download') ||
          link.target && link.target !== '_self' ||
          link.hasAttribute('data-no-page-transition'))) return false;

    if (!href || href.charAt(0) === '#') return false;

    var destination;
    try {
      destination = new URL(href, location.href);
    } catch (error) {
      return false;
    }
    if (destination.origin !== location.origin) return false;
    return destination.pathname !== location.pathname ||
      destination.search !== location.search;
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('a');
    var href = link && link.getAttribute('href');
    if (!link) {
      var action = event.target.closest('[data-act="goto"], [data-act="edit-goto"]');
      var card = event.target.closest('[data-goto]');
      if (action) href = action.getAttribute('data-url');
      else if (card && !event.target.closest('button, [data-act]')) {
        href = card.getAttribute('data-goto');
      }
    }
    if (!isInternalPageNavigation(href, link, event)) return;
    try {
      var destination = new URL(href, location.href);
      if (/\/courses\/edit(?:\/|$)/.test(destination.pathname)) {
        sessionStorage.removeItem('dc-page-transition');
        return;
      }
      sessionStorage.setItem('dc-page-transition', destination.href);
    } catch (error) {
      console.warn('Page transition state could not be saved.', error);
    }
  }, true);

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) clearTransition();
  });
})();
