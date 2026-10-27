(function () {
  'use strict';

  var INITIAL_LIMIT = 18;
  var PAGE_SIZE = 9;
  var visibleLimit = INITIAL_LIMIT;
  var searchQuery = '';
  var isLoadingMore = false;
  var reorderTools = document.getElementById('projectReorderTools');
  var reorderMode = false;
  var orderedProjects = Store.collection('projects').filter(function (project) {
    return project.status === 'published';
  });
  var originalOrder = [];
  var draggedProjectId = '';

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
    host.classList.toggle('is-reordering', reorderMode);
    var list = orderedProjects.filter(function (project) {
      return matchesSearch(project, query);
    });
    var resultCount = document.getElementById('projectsResultCount');
    if (resultCount) {
      resultCount.textContent = I18n.t('projectsSearchCount', {
        shown: Math.min(visibleLimit, list.length),
        total: list.length
      });
    }
    var visibleProjects = reorderMode ? list : list.slice(0, visibleLimit);
    host.innerHTML = visibleProjects.length
      ? visibleProjects.map(function (project) {
          return AppPage.projCard(project, { viewOnly: true });
        }).join('')
      : UI.emptyState(
        'folder',
        query ? I18n.t('emptySearch') : I18n.t('projectsEmpty'),
        '',
        ''
      );
    if (reorderMode) addReorderControls(host, visibleProjects);
    var moreWrap = document.getElementById('projectsMoreWrap');
    if (moreWrap) moreWrap.hidden = reorderMode || list.length <= visibleLimit;
    var resultCount = document.getElementById('projectsResultCount');
    if (resultCount && reorderMode) {
      resultCount.textContent = 'اسحب مقبض البطاقة أو استخدم أزرار التحريك لتغيير موضع المشروع.';
    }
  }

  function addReorderControls(host, projects) {
    host.querySelectorAll('.proj-card').forEach(function (card, index) {
      var project = projects[index];
      if (!project) return;
      card.dataset.projectId = project.id;
      var controls = document.createElement('div');
      controls.className = 'project-sort-controls';
      controls.setAttribute('aria-label', 'أدوات ترتيب ' + project.title);
      controls.innerHTML =
        '<button class="course-drag-handle" type="button" draggable="true" aria-label="اسحب لإعادة ترتيب ' +
        escapeAttribute(project.title) + '" title="اسحب لإعادة الترتيب">⠿</button>' +
        '<button class="course-move-button" type="button" data-project-move="-1" aria-label="تحريك لأعلى" title="تحريك لأعلى"' +
        (index === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="course-move-button" type="button" data-project-move="1" aria-label="تحريك لأسفل" title="تحريك لأسفل"' +
        (index === projects.length - 1 ? ' disabled' : '') + '>↓</button>';
      card.prepend(controls);
    });
  }

  function escapeAttribute(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function moveProject(sourceId, targetId, after) {
    var sourceIndex = orderedProjects.findIndex(function (project) {
      return project.id === sourceId;
    });
    if (sourceIndex < 0) return;
    var moved = orderedProjects.splice(sourceIndex, 1)[0];
    var targetIndex = targetId
      ? orderedProjects.findIndex(function (project) { return project.id === targetId; })
      : orderedProjects.length;
    if (targetIndex < 0) targetIndex = orderedProjects.length;
    orderedProjects.splice(targetIndex + (after && targetId ? 1 : 0), 0, moved);
    renderProjects();
  }

  function setReorderMode(enabled) {
    reorderMode = enabled;
    searchQuery = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.disabled = enabled;
    }
    document.getElementById('projectReorderStart').hidden = enabled;
    document.getElementById('projectReorderSave').hidden = !enabled;
    document.getElementById('projectReorderCancel').hidden = !enabled;
    var status = document.getElementById('projectReorderStatus');
    if (status) {
      status.textContent = enabled
        ? 'اسحب مقبض البطاقة أو استخدم أزرار التحريك، ثم احفظ الترتيب.'
        : '';
    }
    renderProjects();
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

  if (reorderTools) {
    var startButton = document.getElementById('projectReorderStart');
    var saveButton = document.getElementById('projectReorderSave');
    var cancelButton = document.getElementById('projectReorderCancel');
    var status = document.getElementById('projectReorderStatus');
    var grid = document.getElementById('allProjectsGrid');

    startButton.addEventListener('click', function () {
      originalOrder = orderedProjects.map(function (project) { return project.id; });
      setReorderMode(true);
    });

    cancelButton.addEventListener('click', function () {
      var projectsById = {};
      orderedProjects.forEach(function (project) { projectsById[project.id] = project; });
      orderedProjects = originalOrder.map(function (id) { return projectsById[id]; }).filter(Boolean);
      setReorderMode(false);
    });

    saveButton.addEventListener('click', async function () {
      saveButton.disabled = true;
      status.textContent = 'جارٍ حفظ الترتيب...';
      try {
        var response = await fetch(SITE_URLS.projectReorder, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({
            order: orderedProjects.map(function (project) { return project.id; })
          })
        });
        var result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'تعذر حفظ الترتيب.');
        }
        setReorderMode(false);
        status.textContent = 'تم حفظ ترتيب المشاريع.';
      } catch (error) {
        status.textContent = 'تعذر حفظ الترتيب. ' + (error.message || 'يرجى المحاولة مرة أخرى.');
      } finally {
        saveButton.disabled = false;
      }
    });

    grid.addEventListener('click', function (event) {
      var handle = event.target.closest('.course-drag-handle');
      if (handle) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      var button = event.target.closest('[data-project-move]');
      if (!button || button.disabled || !reorderMode) return;
      event.preventDefault();
      event.stopPropagation();
      var card = button.closest('.proj-card');
      var index = orderedProjects.findIndex(function (project) {
        return card && project.id === card.dataset.projectId;
      });
      var target = orderedProjects[index + Number(button.dataset.projectMove)];
      if (target) {
        moveProject(card.dataset.projectId, target.id, Number(button.dataset.projectMove) > 0);
      }
    });

    grid.addEventListener('dragstart', function (event) {
      var handle = event.target.closest('.course-drag-handle');
      if (!reorderMode || !handle) {
        event.preventDefault();
        return;
      }
      var card = handle.closest('.proj-card');
      draggedProjectId = card && card.dataset.projectId;
      if (!draggedProjectId) {
        event.preventDefault();
        return;
      }
      card.classList.add('project-card-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedProjectId);
    });

    grid.addEventListener('dragover', function (event) {
      if (!reorderMode || !draggedProjectId) return;
      var card = event.target.closest('.proj-card');
      if (card && card.dataset.projectId !== draggedProjectId) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      } else if (event.target === grid) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    });

    grid.addEventListener('drop', function (event) {
      if (!reorderMode || !draggedProjectId) return;
      var card = event.target.closest('.proj-card');
      if (card) {
        event.preventDefault();
        if (card.dataset.projectId === draggedProjectId) return;
        var rect = card.getBoundingClientRect();
        moveProject(
          draggedProjectId,
          card.dataset.projectId,
          event.clientY > rect.top + rect.height / 2
        );
      } else if (event.target === grid) {
        event.preventDefault();
        moveProject(draggedProjectId, '', false);
      }
    });

    grid.addEventListener('dragend', function () {
      draggedProjectId = '';
      grid.querySelectorAll('.project-card-dragging').forEach(function (card) {
        card.classList.remove('project-card-dragging');
      });
    });
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
