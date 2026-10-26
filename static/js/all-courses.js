(function () {
  'use strict';

  var INITIAL_LIMIT = 18;
  var PAGE_SIZE = 9;
  var visibleLimit = INITIAL_LIMIT;
  var searchQuery = '';
  var isLoadingMore = false;

  function normalizeSearchText(value) {
    return String(value || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .trim();
  }

  function matchesSearch(course, query) {
    if (!query) return true;
    var searchable = normalizeSearchText([
      course.title,
      course.summary,
      course.description,
      course.category,
      course.instructor,
      course.issuer,
      course.owner && course.owner.name,
      (course.skills || []).join(' ')
    ].join(' '));
    return query.split(/\s+/).every(function (term) {
      return searchable.indexOf(term) !== -1;
    });
  }

  function renderCerts() {
    var host = document.getElementById('allCertsGrid');
    if (!host) return;
    var query = normalizeSearchText(searchQuery);
    var list = Store.collection('certificates').filter(function (course) {
      return matchesSearch(course, query);
    });
    var resultCount = document.getElementById('coursesResultCount');
    if (resultCount) {
      resultCount.textContent = I18n.t('coursesSearchCount', {
        shown: Math.min(visibleLimit, list.length),
        total: list.length
      });
    }
    host.innerHTML = list.length
      ? list.slice(0, visibleLimit).map(function (course) {
          return AppPage.certCard(course, {
            course: true,
            from: 'all-courses',
            returnTo: location.pathname + location.search + location.hash
          });
        }).join('')
      : UI.emptyState(
        'graduation-cap',
        query ? I18n.t('emptySearch') : I18n.t('coursesEmpty'),
        '',
        ''
      );
    var moreWrap = document.getElementById('coursesMoreWrap');
    if (moreWrap) moreWrap.hidden = list.length <= visibleLimit;
  }

  SiteChrome.mount();
  renderCerts();

  var searchInput = document.getElementById('coursesSearch');
  if (searchInput) {
    searchInput.addEventListener('input', UI.debounce(function () {
      searchQuery = searchInput.value;
      visibleLimit = INITIAL_LIMIT;
      renderCerts();
    }, 180));
  }

  var moreButton = document.getElementById('coursesMore');
  function loadMore() {
    if (isLoadingMore) return;
    isLoadingMore = true;
    visibleLimit += PAGE_SIZE;
    renderCerts();
    isLoadingMore = false;
  }
  if (moreButton) {
    moreButton.addEventListener('click', loadMore);
    UI.observeNearViewport(document.getElementById('coursesMoreWrap'), loadMore);
  }

  document.addEventListener('i18n:change', UI.debounce(function () {
    if (searchInput) searchQuery = searchInput.value;
    renderCerts();
  }, 60));
})();
