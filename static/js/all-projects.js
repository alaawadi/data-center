(function () {
  'use strict';

  var INITIAL_LIMIT = 18;
  var PAGE_SIZE = 9;
  var visibleLimit = INITIAL_LIMIT;
  var searchQuery = '';
  var selectedCategory = '';
  var isLoadingMore = false;
  var reorderTools = document.getElementById('projectReorderTools');
  var reorderMode = false;
  var orderedProjects = Store.collection('projects').filter(function (project) {
    return project.status === 'published';
  });
  var originalOrder = [];
  var draggedProjectId = '';
  var searchInput = document.getElementById('projectsSearch');
  var categoryTags = document.getElementById('projectsCategoryTags');

  document.addEventListener('click', function (event) {
    var requestLink = event.target.closest('[data-project-request-cta]');
    if (!requestLink) return;
    event.preventDefault();
    var confirmation = UI.modal({
      title: I18n.t('projectRequestConfirmTitle'),
      body: '<div class="confirm-message">' +
        '<span class="confirm-message-icon">' + UI.icon('message-circle', 22) + '</span>' +
        '<div><p class="modal-text">' + UI.esc(I18n.t('projectRequestConfirmMessage')) + '</p>' +
        '<p class="confirm-message-detail">' + UI.esc(I18n.t('projectRequestConfirmDetail')) + '</p></div></div>',
      footer: '<button class="btn btn-ghost" type="button" data-project-request-cancel>' +
        UI.esc(I18n.t('cancel')) + '</button>' +
        '<button class="btn btn-primary" type="button" data-project-request-confirm>' +
        UI.esc(I18n.t('projectRequestConfirmAction')) + '</button>',
      size: 'sm'
    });
    confirmation.el.classList.add('project-request-confirm');
    confirmation.el.querySelector('[data-project-request-cancel]').addEventListener('click', function () {
      confirmation.close();
    });
    confirmation.el.querySelector('[data-project-request-confirm]').addEventListener('click', function () {
      confirmation.close();
      window.open(requestLink.href, '_blank', 'noopener,noreferrer');
    });
  });

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

  function matchesCategory(project, category) {
    return !category || normalizeSearchText(project.category) === normalizeSearchText(category);
  }

  function updateCategoryTags() {
    if (!categoryTags) return;
    categoryTags.querySelectorAll('[data-project-category]').forEach(function (button) {
      var isSelected = normalizeSearchText(button.dataset.projectCategory) === normalizeSearchText(selectedCategory);
      button.classList.toggle('is-active', isSelected);
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      button.disabled = reorderMode;
    });
    updateCategoryResetVisibility();
  }

  function updateCategoryResetVisibility() {
    var resetButton = document.getElementById('projectsCategoryReset');
    var firstTag = categoryTags && categoryTags.querySelector('[data-project-category]');
    if (!categoryTags || !resetButton || !firstTag) return;
    var hostBounds = categoryTags.getBoundingClientRect();
    var tagBounds = firstTag.getBoundingClientRect();
    var isFirstTagVisible = tagBounds.left < hostBounds.right &&
      tagBounds.right > hostBounds.left;
    resetButton.hidden = reorderMode || isFirstTagVisible ||
      categoryTags.scrollWidth <= categoryTags.clientWidth;
  }

  function populateCategoryTags() {
    if (!categoryTags) return;
    var categories = {};
    var trainingCategories = SITE.trainingCategories();
    var orderedCategories = [];
    if (trainingCategories) {
      trainingCategories.forEach(function (category) {
        category = String(category || '').trim();
        if (category && !categories[category]) {
          categories[category] = true;
          orderedCategories.push(category);
        }
      });
    } else {
      orderedProjects.forEach(function (project) {
        var category = String(project.category || '').trim();
        if (category && !categories[category]) {
          categories[category] = true;
          orderedCategories.push(category);
        }
      });
    }
    if (!orderedCategories.length) {
      orderedCategories = Object.keys(categories);
    }
    var allCategories = document.createElement('button');
    allCategories.type = 'button';
    allCategories.className = 'course-category-tag is-active';
    allCategories.dataset.projectCategory = '';
    allCategories.textContent = I18n.t('coursesAllCategories');
    allCategories.setAttribute('aria-pressed', 'true');
    categoryTags.appendChild(allCategories);
    orderedCategories.forEach(function (category) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'course-category-tag';
      button.dataset.projectCategory = category;
      button.textContent = category;
      button.setAttribute('aria-pressed', 'false');
      categoryTags.appendChild(button);
    });
    updateCategoryResetVisibility();
  }

  function renderProjects() {
    var host = document.getElementById('allProjectsGrid');
    if (!host) return;
    var query = normalizeSearchText(searchQuery);
    host.classList.toggle('is-reordering', reorderMode);
    var list = orderedProjects.filter(function (project) {
      return matchesSearch(project, query) && matchesCategory(project, selectedCategory);
    });
    var visibleProjects = reorderMode ? list : list.slice(0, visibleLimit);
    host.innerHTML = visibleProjects.length
      ? visibleProjects.map(function (project) {
          return AppPage.projCard(project, { viewOnly: true });
        }).join('')
      : UI.emptyState(
        'folder',
        query || selectedCategory ? I18n.t('projectsSearchEmpty') : I18n.t('projectsEmpty'),
        '',
        ''
      );
    if (reorderMode) addReorderControls(host, visibleProjects);
    var moreWrap = document.getElementById('projectsMoreWrap');
    if (moreWrap) moreWrap.hidden = reorderMode || list.length <= visibleLimit;
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
    selectedCategory = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.disabled = enabled;
    }
    updateCategoryTags();
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
  populateCategoryTags();
  renderProjects();

  if (searchInput) {
    searchInput.addEventListener('input', UI.debounce(function () {
      searchQuery = searchInput.value;
      visibleLimit = INITIAL_LIMIT;
      renderProjects();
    }, 180));
  }
  if (categoryTags) {
    var categoryReset = document.getElementById('projectsCategoryReset');
    var categoryDrag = null;
    var suppressCategoryClick = false;

    categoryTags.addEventListener('mousedown', function (event) {
      if (event.button !== 0) return;
      categoryDrag = {
        startX: event.clientX,
        startScrollLeft: categoryTags.scrollLeft,
        moved: false
      };
    });

    document.addEventListener('mousemove', function (event) {
      if (!categoryDrag) return;
      var deltaX = event.clientX - categoryDrag.startX;
      if (Math.abs(deltaX) > 4) {
        categoryDrag.moved = true;
        categoryTags.classList.add('is-dragging');
      }
      if (categoryDrag.moved) {
        categoryTags.scrollLeft = categoryDrag.startScrollLeft - deltaX;
        event.preventDefault();
      }
    });

    document.addEventListener('mouseup', function () {
      if (!categoryDrag) return;
      suppressCategoryClick = categoryDrag.moved;
      categoryDrag = null;
      categoryTags.classList.remove('is-dragging');
      if (suppressCategoryClick) {
        window.setTimeout(function () { suppressCategoryClick = false; }, 0);
      }
    });

    categoryTags.addEventListener('click', function (event) {
      if (suppressCategoryClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      var button = event.target.closest('[data-project-category]');
      if (!button || reorderMode) return;
      selectedCategory = button.dataset.projectCategory;
      visibleLimit = INITIAL_LIMIT;
      updateCategoryTags();
      renderProjects();
    });

    categoryTags.addEventListener('scroll', updateCategoryResetVisibility, { passive: true });

    if (categoryReset) {
      categoryReset.addEventListener('click', function () {
        selectedCategory = '';
        visibleLimit = INITIAL_LIMIT;
        categoryTags.scrollTo({ left: 0, behavior: 'smooth' });
        updateCategoryTags();
        renderProjects();
      });
    }

    window.addEventListener('resize', updateCategoryResetVisibility);
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
