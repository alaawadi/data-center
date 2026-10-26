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

  function matchesSearch(project, query) {
    if (!query) return true;
    var searchable = normalizeSearchText([
      project.title,
      project.summary,
      project.category,
      project.role,
      project.content,
      (project.tags || []).join(' ')
    ].join(' '));
    return query.split(/\s+/).every(function (term) {
      return searchable.indexOf(term) !== -1;
    });
  }

  function renderProjects() {
    var host = document.getElementById('allProjectsGrid');
    if (!host) return;
    var query = normalizeSearchText(searchQuery);
    var list = Store.collection('projects').filter(function (project) {
      return project.status === 'published' && matchesSearch(project, query);
    });
    var resultCount = document.getElementById('projectsResultCount');
    if (resultCount) {
      resultCount.textContent = I18n.t('projectsSearchCount', {
        shown: Math.min(visibleLimit, list.length),
        total: list.length
      });
    }
    host.innerHTML = list.length
      ? list.slice(0, visibleLimit).map(function (project) {
          return AppPage.projCard(project, { viewOnly: true });
        }).join('')
      : UI.emptyState(
        'folder',
        query ? I18n.t('emptySearch') : I18n.t('projectsEmpty'),
        '',
        ''
      );
    var moreWrap = document.getElementById('projectsMoreWrap');
    if (moreWrap) moreWrap.hidden = list.length <= visibleLimit;
  }

  SiteChrome.mount();
  renderProjects();

  var searchInput = document.getElementById('projectsSearch');
  if (searchInput) {
    searchInput.addEventListener('input', UI.debounce(function () {
      searchQuery = searchInput.value;
      visibleLimit = INITIAL_LIMIT;
      renderProjects();
    }, 180));
  }

  var moreButton = document.getElementById('projectsMore');
  function loadMore() {
    if (isLoadingMore) return;
    isLoadingMore = true;
    visibleLimit += PAGE_SIZE;
    renderProjects();
    isLoadingMore = false;
  }
  if (moreButton) {
    moreButton.addEventListener('click', loadMore);
    UI.observeNearViewport(document.getElementById('projectsMoreWrap'), loadMore);
  }

  document.addEventListener('i18n:change', UI.debounce(function () {
    if (searchInput) searchQuery = searchInput.value;
    renderProjects();
  }, 60));
})();
