(function () {
  'use strict';

  document.querySelectorAll('.listing-search-sticky').forEach(function (searchWrap) {
    var searchId = searchWrap.dataset.listingSearch;
    var searchPanel = document.getElementById(searchId + 'SearchPanel');
    var searchContent = searchWrap.querySelector('.listing-search-content');
    var searchToggle = document.getElementById(searchId + 'SearchToggle');
    if (!searchPanel || !searchContent || !searchToggle) return;

    function syncSearchWrapHeight() {
      var style = window.getComputedStyle(searchWrap);
      var height = searchContent.scrollHeight +
        parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) +
        parseFloat(style.borderBottomWidth);
      searchWrap.style.setProperty('--listing-search-expanded-height', height + 'px');
    }

    function setSearchPanelExpanded(expanded) {
      searchWrap.classList.toggle('is-collapsed', !expanded);
      searchPanel.inert = !expanded;
      searchPanel.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      searchToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      searchToggle.setAttribute('aria-label', expanded ? 'إغلاق البحث والفئات' : 'فتح البحث والفئات');
    }

    var searchPanelPreference = null;
    searchToggle.addEventListener('click', function () {
      var isExpanded = !searchWrap.classList.contains('is-collapsed');
      searchPanelPreference = !isExpanded;
      setSearchPanelExpanded(!isExpanded);
    });

    var previousScrollY = window.scrollY;
    window.addEventListener('scroll', function () {
      var currentScrollY = window.scrollY;
      var scrollingDown = currentScrollY > previousScrollY;
      var stickyTop = parseFloat(window.getComputedStyle(searchWrap).top) || 0;
      var isStuck = searchWrap.getBoundingClientRect().top <= stickyTop + 1;
      searchWrap.classList.toggle('is-stuck', isStuck);
      previousScrollY = currentScrollY;

      if (!isStuck) {
        searchPanelPreference = null;
        setSearchPanelExpanded(true);
      } else if (scrollingDown && searchPanelPreference !== false) {
        setSearchPanelExpanded(false);
      }
    }, { passive: true });

    var stickyTop = parseFloat(window.getComputedStyle(searchWrap).top) || 0;
    searchWrap.classList.toggle('is-stuck', searchWrap.getBoundingClientRect().top <= stickyTop + 1);
    syncSearchWrapHeight();
    if ('ResizeObserver' in window) {
      new ResizeObserver(syncSearchWrapHeight).observe(searchContent);
    } else {
      window.addEventListener('resize', syncSearchWrapHeight);
    }
  });
})();
