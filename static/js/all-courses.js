(function () {
  'use strict';

  var INITIAL_LIMIT = 18;
  var PAGE_SIZE = 9;
  var visibleLimit = INITIAL_LIMIT;
  var searchQuery = '';
  var selectedCategory = '';
  var isLoadingMore = false;
  var reorderTools = document.getElementById('courseReorderTools');
  var reorderMode = false;
  var orderedCourses = Store.collection('certificates').slice();
  var originalOrder = [];
  var draggedCourseId = '';

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

  function matchesCategory(course, category) {
    return !category || normalizeSearchText(course.category) === normalizeSearchText(category);
  }

  function populateCategoryFilter() {
    var select = document.getElementById('coursesCategoryFilter');
    if (!select) return;
    var categories = {};
    Store.collection('certificates').forEach(function (course) {
      var category = String(course.category || '').trim();
      if (category) categories[category] = true;
    });
    Object.keys(categories).sort(function (a, b) {
      return a.localeCompare(b, I18n.getLang() === 'en' ? 'en' : 'ar');
    }).forEach(function (category) {
      var option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
  }

  function renderCerts() {
    var host = document.getElementById('allCertsGrid');
    if (!host) return;
    host.classList.toggle('is-reordering', reorderMode);
    var query = normalizeSearchText(searchQuery);
    var list = orderedCourses.filter(function (course) {
      return matchesSearch(course, query) && matchesCategory(course, selectedCategory);
    });
    var resultCount = document.getElementById('coursesResultCount');
    if (resultCount) {
      resultCount.textContent = I18n.t('coursesSearchCount', {
        shown: Math.min(visibleLimit, list.length),
        total: list.length
      });
    }
    var visibleCourses = reorderMode ? list : list.slice(0, visibleLimit);
    host.innerHTML = visibleCourses.length
      ? visibleCourses.map(function (course) {
          return AppPage.certCard(course, {
            course: true,
            allowComingSoon: !!reorderTools,
            from: 'all-courses',
            returnTo: location.pathname + location.search + location.hash
          });
        }).join('')
      : UI.emptyState(
        'graduation-cap',
        query || selectedCategory ? I18n.t('coursesSearchEmpty') : I18n.t('coursesEmpty'),
        '',
        ''
      );
    if (reorderTools) addComingSoonControls(host, visibleCourses);
    if (reorderMode) addReorderControls(host, visibleCourses);
    var moreWrap = document.getElementById('coursesMoreWrap');
    if (moreWrap) moreWrap.hidden = reorderMode || list.length <= visibleLimit;
    if (resultCount && reorderMode) {
      resultCount.textContent = 'اسحب مقبض البطاقة أو استخدم أزرار التحريك لتغيير موضع الدورة.';
    }
  }

  function addComingSoonControls(host, courses) {
    host.querySelectorAll('.cert-card').forEach(function (card, index) {
      var course = courses[index];
      if (!course) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'course-coming-soon-toggle';
      button.dataset.comingSoonToggle = course.id;
      button.textContent = course.comingSoon
        ? I18n.t('courseRemoveComingSoon')
        : I18n.t('courseMarkComingSoon');
      button.setAttribute('aria-pressed', course.comingSoon ? 'true' : 'false');
      card.prepend(button);
    });
  }

  async function toggleComingSoon(course, button) {
    button.disabled = true;
    var status = document.getElementById('courseReorderStatus');
    if (status) status.textContent = I18n.t('courseComingSoonSaving');
    try {
      var response = await fetch(
        SITE_URLS.courseComingSoon.replace('__ID__', encodeURIComponent(course.id)),
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({ comingSoon: !course.comingSoon })
        }
      );
      var result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'تعذر تحديث حالة الدورة.');
      }
      course.comingSoon = result.comingSoon;
      renderCerts();
      if (status) {
        status.textContent = I18n.t(
          course.comingSoon ? 'courseComingSoonEnabled' : 'courseComingSoonDisabled'
        );
      }
    } catch (error) {
      button.disabled = false;
      if (status) {
        status.textContent = I18n.t('courseComingSoonError') +
          (error.message ? ' ' + error.message : '');
      }
    }
  }

  function addReorderControls(host, courses) {
    host.querySelectorAll('.cert-card').forEach(function (card, index) {
      var course = courses[index];
      if (!course) return;
      card.dataset.courseId = course.id;
      var controls = document.createElement('div');
      controls.className = 'course-sort-controls';
      controls.setAttribute('aria-label', 'أدوات ترتيب ' + course.title);
      controls.innerHTML =
      '<button class="course-drag-handle" type="button" draggable="true" aria-label="اسحب لإعادة ترتيب ' +
        escapeAttribute(course.title) + '" title="اسحب لإعادة الترتيب">⠿</button>' +
      '<button class="course-move-button" type="button" data-course-move="-1" aria-label="تحريك لأعلى" title="تحريك لأعلى"' +
        (index === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button class="course-move-button" type="button" data-course-move="1" aria-label="تحريك لأسفل" title="تحريك لأسفل"' +
        (index === courses.length - 1 ? ' disabled' : '') + '>↓</button>';
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

  function moveCourse(sourceId, targetId, after) {
    var sourceIndex = orderedCourses.findIndex(function (course) {
      return course.id === sourceId;
    });
    if (sourceIndex < 0) return;
    var moved = orderedCourses.splice(sourceIndex, 1)[0];
    var targetIndex = targetId
      ? orderedCourses.findIndex(function (course) { return course.id === targetId; })
      : orderedCourses.length;
    if (targetIndex < 0) targetIndex = orderedCourses.length;
    orderedCourses.splice(targetIndex + (after && targetId ? 1 : 0), 0, moved);
    renderCerts();
  }

  function setReorderMode(enabled) {
    reorderMode = enabled;
    searchQuery = '';
    selectedCategory = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.disabled = enabled;
    }
    if (categoryFilter) {
      categoryFilter.value = '';
      categoryFilter.disabled = enabled;
    }
    document.getElementById('courseReorderStart').hidden = enabled;
    document.getElementById('courseReorderSave').hidden = !enabled;
    document.getElementById('courseReorderCancel').hidden = !enabled;
    document.getElementById('courseReorderStatus').textContent = enabled
      ? 'اسحب مقبض البطاقة أو استخدم أزرار التحريك، ثم احفظ الترتيب.'
      : '';
    renderCerts();
  }

  SiteChrome.mount();
  var searchInput = document.getElementById('coursesSearch');
  var categoryFilter = document.getElementById('coursesCategoryFilter');
  populateCategoryFilter();
  renderCerts();

  if (searchInput) {
    searchInput.addEventListener('input', UI.debounce(function () {
      searchQuery = searchInput.value;
      visibleLimit = INITIAL_LIMIT;
      renderCerts();
    }, 180));
  }
  if (categoryFilter) {
    categoryFilter.addEventListener('change', function () {
      selectedCategory = categoryFilter.value;
      visibleLimit = INITIAL_LIMIT;
      renderCerts();
    });
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

  if (reorderTools) {
    var startButton = document.getElementById('courseReorderStart');
    var saveButton = document.getElementById('courseReorderSave');
    var cancelButton = document.getElementById('courseReorderCancel');
    var status = document.getElementById('courseReorderStatus');
    var grid = document.getElementById('allCertsGrid');
    var dragScrollFrame = null;
    var dragScrollSpeed = 0;
    var dragScrollEdge = 90;
    var dragScrollPauseTimeout = null;
    var dragScrollPausedUntil = 0;
    var lastDragClientY = 0;

    function scrollDuringDrag() {
      if (!draggedCourseId || !dragScrollSpeed) {
        dragScrollFrame = null;
        return;
      }
      window.scrollBy(0, dragScrollSpeed);
      dragScrollFrame = window.requestAnimationFrame(scrollDuringDrag);
    }

    function updateDragScroll(clientY) {
      lastDragClientY = clientY;
      if (Date.now() < dragScrollPausedUntil) {
        dragScrollSpeed = 0;
        return;
      }
      var viewportHeight = window.innerHeight;
      if (clientY < dragScrollEdge) {
        dragScrollSpeed = -Math.ceil((dragScrollEdge - clientY) / dragScrollEdge * 18);
      } else if (clientY > viewportHeight - dragScrollEdge) {
        dragScrollSpeed = Math.ceil((clientY - (viewportHeight - dragScrollEdge)) / dragScrollEdge * 18);
      } else {
        dragScrollSpeed = 0;
      }
      if (dragScrollSpeed && dragScrollFrame === null) {
        dragScrollFrame = window.requestAnimationFrame(scrollDuringDrag);
      }
    }

    function stopDragScroll() {
      dragScrollSpeed = 0;
      if (dragScrollFrame !== null) {
        window.cancelAnimationFrame(dragScrollFrame);
        dragScrollFrame = null;
      }
    }

    function handleDragWheel(event) {
      if (!reorderMode || !draggedCourseId) return;
      var scrollAmount = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        scrollAmount *= 16;
      } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        scrollAmount *= window.innerHeight;
      }
      if (event.cancelable) event.preventDefault();
      window.scrollBy(0, scrollAmount);
      dragScrollPausedUntil = Date.now() + 500;
      stopDragScroll();
      window.clearTimeout(dragScrollPauseTimeout);
      dragScrollPauseTimeout = window.setTimeout(function () {
        if (draggedCourseId) updateDragScroll(lastDragClientY);
      }, 500);
    }

    startButton.addEventListener('click', function () {
      originalOrder = orderedCourses.map(function (course) { return course.id; });
      setReorderMode(true);
    });
    cancelButton.addEventListener('click', function () {
      var coursesById = {};
      orderedCourses.forEach(function (course) { coursesById[course.id] = course; });
      orderedCourses = originalOrder.map(function (id) { return coursesById[id]; }).filter(Boolean);
      setReorderMode(false);
    });
    saveButton.addEventListener('click', async function () {
      saveButton.disabled = true;
      status.textContent = 'جارٍ حفظ الترتيب...';
      try {
        var response = await fetch(SITE_URLS.courseReorder, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({
            order: orderedCourses.map(function (course) { return course.id; })
          })
        });
        var result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'تعذر حفظ الترتيب.');
        }
        setReorderMode(false);
        status.textContent = 'تم حفظ ترتيب الدورات.';
      } catch (error) {
        status.textContent = 'تعذر حفظ الترتيب. ' + (error.message || 'يرجى المحاولة مرة أخرى.');
      } finally {
        saveButton.disabled = false;
      }
    });

    grid.addEventListener('click', function (event) {
      var comingSoonButton = event.target.closest('[data-coming-soon-toggle]');
      if (comingSoonButton) {
        event.preventDefault();
        event.stopPropagation();
        var course = orderedCourses.find(function (item) {
          return item.id === comingSoonButton.dataset.comingSoonToggle;
        });
        if (course) toggleComingSoon(course, comingSoonButton);
        return;
      }
      if (!reorderMode) return;
      var dragHandle = event.target.closest('.course-drag-handle');
      if (dragHandle) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      var button = event.target.closest('[data-course-move]');
      if (!button || button.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      var card = button.closest('.cert-card');
      var index = orderedCourses.findIndex(function (course) {
        return card && course.id === card.dataset.courseId;
      });
      var target = orderedCourses[index + Number(button.dataset.courseMove)];
      if (target) moveCourse(card.dataset.courseId, target.id, Number(button.dataset.courseMove) > 0);
    });

    grid.addEventListener('dragstart', function (event) {
      var handle = event.target.closest('.course-drag-handle');
      if (!reorderMode || !handle) {
        event.preventDefault();
        return;
      }
      var card = handle.closest('.cert-card');
      draggedCourseId = card && card.dataset.courseId;
      if (!draggedCourseId) {
        event.preventDefault();
        return;
      }
      card.classList.add('course-card-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedCourseId);
    });
    document.addEventListener('dragover', function (event) {
      if (!reorderMode || !draggedCourseId) return;
      event.preventDefault();
      updateDragScroll(event.clientY);
    });
    document.addEventListener('wheel', handleDragWheel, { passive: false });
    grid.addEventListener('dragover', function (event) {
      if (!reorderMode || !draggedCourseId) return;
      var card = event.target.closest('.cert-card');
      if (card && card.dataset.courseId !== draggedCourseId) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      } else if (event.target === grid) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    });
    grid.addEventListener('drop', function (event) {
      if (!reorderMode || !draggedCourseId) return;
      var card = event.target.closest('.cert-card');
      if (card) {
        event.preventDefault();
        if (card.dataset.courseId === draggedCourseId) return;
        var rect = card.getBoundingClientRect();
        moveCourse(draggedCourseId, card.dataset.courseId, event.clientY > rect.top + rect.height / 2);
      } else if (event.target === grid) {
        event.preventDefault();
        moveCourse(draggedCourseId, '', false);
      }
      stopDragScroll();
    });
    grid.addEventListener('dragend', function () {
      stopDragScroll();
      window.clearTimeout(dragScrollPauseTimeout);
      dragScrollPausedUntil = 0;
      draggedCourseId = '';
      grid.querySelectorAll('.course-card-dragging').forEach(function (card) {
        card.classList.remove('course-card-dragging');
      });
    });
  }

  document.addEventListener('i18n:change', UI.debounce(function () {
    if (searchInput) searchQuery = searchInput.value;
    renderCerts();
  }, 60));
})();
