(function () {
  'use strict';

  var INITIAL_LIMIT = 21;
  var PAGE_SIZE = 18;
  var visibleLimit = INITIAL_LIMIT;
  var searchQuery = '';
  var isLoadingMore = false;
  var reorderTools = document.getElementById('freelancerReorderTools');
  var reorderMode = false;
  var orderedUsers = null;
  var originalOrder = [];
  var draggedUserHandle = '';

  function addPerson(map, p) {
    if (!p || !p.handle) return;
    var key = String(p.handle).toLowerCase();
    if (!map[key]) {
      map[key] = {
        name: p.name || p.author || p.handle,
        handle: p.handle,
        avatar: p.avatar || '',
        verified: !!p.verified,
        title: p.title || '',
        roleKey: p.roleKey || '',
        isTrainer: !!p.isTrainer,
        courses: 0,
        isMe: false,
        certificates: 0,
        projects: 0
      };
    }
    var rec = map[key];
    if (!rec.avatar && p.avatar) rec.avatar = p.avatar;
    if (!rec.title && p.title) rec.title = p.title;
  }

  function scanComments(list, map) {
    (list || []).forEach(function (item) {
      (item.comments || []).forEach(function walk(c) {
        addPerson(map, c);
        (c.replies || []).forEach(walk);
      });
    });
  }

  function ownerKey(item, prof) {
    if (item && item.handle) return String(item.handle).toLowerCase();
    return prof && prof.handle ? String(prof.handle).toLowerCase() : null;
  }

  var EMBEDDED_USERS = (function () {
    var el = document.getElementById('users-data');
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      return Array.isArray(data) ? data : null;
    } catch (err) { return null; }
  })();

  function collectDbUsers() {
    return EMBEDDED_USERS.map(function (u) {
      return {
        name: u.name || u.handle,
        handle: u.handle,
        avatar: u.avatar || '',
        verified: !!u.verified || u.roleKey === 'trainer',
        title: u.title || '',
        roleKey: u.roleKey || '',
        isTrainer: u.roleKey === 'trainer',
        courses: Number(u.courses) || 0,
        isMe: false,
        certificates: Number(u.certificates) || 0,
        projects: Number(u.projects) || 0
      };
    });
  }

  function collect() {
    if (orderedUsers) return orderedUsers.slice();
    var map = {};
    var prof = Store.state.profile;

    addPerson(map, prof);
    if (prof && prof.handle) map[String(prof.handle).toLowerCase()].isMe = true;

    Store.collection('posts').forEach(function (p) { addPerson(map, p); });

    scanComments(Store.collection('posts'), map);
    scanComments(Store.collection('certificates'), map);
    scanComments(Store.collection('projects'), map);

    Store.collection('certificates').forEach(function (c) {
      var key = ownerKey(c, prof);
      if (key && map[key]) map[key].certificates++;
    });

    Store.collection('projects').forEach(function (p) {
      if (p.status === 'draft') return;
      var key = ownerKey(p, prof);
      if (key && map[key]) map[key].projects++;
    });

    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) {
        if (a.isTrainer !== b.isTrainer) return a.isTrainer ? -1 : 1;
        return (b.certificates + b.projects) - (a.certificates + a.projects);
      });
  }

  if (EMBEDDED_USERS) orderedUsers = collectDbUsers();

  function normalizeSearchText(value) {
    return String(value || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .trim();
  }

  function matchesSearch(user, query) {
    if (!query) return true;
    var roleText = user.roleKey === 'trainer'
      ? 'مدرب معتمد trainer certified'
      : 'طالب student';
    var searchable = normalizeSearchText([
      user.name,
      user.handle,
      user.title,
      user.roleKey,
      roleText,
      user.certificates,
      user.projects,
      user.courses
    ].join(' '));
    return query.split(/\s+/).every(function (term) {
      return searchable.indexOf(term) !== -1;
    });
  }

  function renderCard(u) {
    var href = SITE.u('profile', u.handle);
    var trainer = u.roleKey === 'trainer' || u.isTrainer;
    return '<article class="card user-card' + (trainer ? ' trainer-card' : '') + '" data-goto="' + href + '">' +
      (trainer ? '<span class="trainer-card-badge">مدرب معتمد</span>' : '') +
      '<div class="uc-top">' + UI.avatarOf(u, 42) +
      '<div class="uc-info"><div class="uc-name">' + UI.esc(u.name) +
      (u.verified ? UI.verifiedBadge(15) : '') + '</div>' +
      '<div class="uc-handle">' + (u.title ? UI.esc(u.title) : '@' + UI.esc(u.handle)) + '</div></div></div>' +
      '<div class="uc-stats">' +
      (trainer
        ? '<span>' + UI.icon('graduation-cap', 14) + u.courses + ' ' + UI.esc(I18n.t('statTrainerCourses')) + '</span>'
        : '<span>' + UI.icon('award', 14) + u.certificates + ' ' + UI.esc(I18n.t('statCertificates')) + '</span>') +
      '<span>' + UI.icon('folder', 14) + u.projects + ' ' + UI.esc(I18n.t('statProjects')) + '</span>' +
      '</div></article>';
  }

  function renderUsers() {
    var host = document.getElementById('allUsersGrid');
    if (!host) return;
    var query = normalizeSearchText(searchQuery);
    host.classList.toggle('is-reordering', reorderMode);
    var list = collect().filter(function (user) {
      return matchesSearch(user, query);
    });
    var resultCount = document.getElementById('freelancersResultCount');
    if (resultCount) {
      resultCount.textContent = I18n.t('freelancersSearchCount', {
        shown: Math.min(visibleLimit, list.length),
        total: list.length
      });
    }
    if (!list.length) {
      host.innerHTML = UI.emptyState(
        'users',
        query ? I18n.t('emptySearch') : 'لا يوجد مستقلون بعد',
        '',
        ''
      );
      var emptyMoreWrap = document.getElementById('freelancersMoreWrap');
      if (emptyMoreWrap) emptyMoreWrap.hidden = true;
      return;
    }
    var visibleUsers = reorderMode ? list : list.slice(0, visibleLimit);
    host.innerHTML = visibleUsers.map(renderCard).join('');
    if (reorderMode) addReorderControls(host, visibleUsers);
    var moreWrap = document.getElementById('freelancersMoreWrap');
    if (moreWrap) moreWrap.hidden = reorderMode || list.length <= visibleLimit;
    if (resultCount && reorderMode) {
      resultCount.textContent = 'اسحب مقبض البطاقة أو استخدم أزرار التحريك لتغيير ترتيب المستقلين.';
    }
  }

  function addReorderControls(host, users) {
    host.querySelectorAll('.user-card').forEach(function (card, index) {
      var user = users[index];
      if (!user) return;
      card.dataset.userHandle = user.handle;
      var controls = document.createElement('div');
      controls.className = 'freelancer-sort-controls';
      controls.setAttribute('aria-label', 'أدوات ترتيب ' + user.name);
      controls.innerHTML =
        '<button class="course-drag-handle" type="button" draggable="true" aria-label="اسحب لإعادة ترتيب ' +
        escapeAttribute(user.name) + '" title="اسحب لإعادة الترتيب">⠿</button>' +
        '<button class="course-move-button" type="button" data-freelancer-move="-1" aria-label="تحريك لأعلى" title="تحريك لأعلى"' +
        (index === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="course-move-button" type="button" data-freelancer-move="1" aria-label="تحريك لأسفل" title="تحريك لأسفل"' +
        (index === users.length - 1 ? ' disabled' : '') + '>↓</button>';
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

  function moveUser(sourceHandle, targetHandle, after) {
    var sourceIndex = orderedUsers.findIndex(function (user) {
      return user.handle === sourceHandle;
    });
    if (sourceIndex < 0) return;
    var moved = orderedUsers.splice(sourceIndex, 1)[0];
    var targetIndex = targetHandle
      ? orderedUsers.findIndex(function (user) { return user.handle === targetHandle; })
      : orderedUsers.length;
    if (targetIndex < 0) targetIndex = orderedUsers.length;
    orderedUsers.splice(targetIndex + (after && targetHandle ? 1 : 0), 0, moved);
    renderUsers();
  }

  function setReorderMode(enabled) {
    reorderMode = enabled;
    searchQuery = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.disabled = enabled;
    }
    document.getElementById('freelancerReorderStart').hidden = enabled;
    document.getElementById('freelancerReorderSave').hidden = !enabled;
    document.getElementById('freelancerReorderCancel').hidden = !enabled;
    var status = document.getElementById('freelancerReorderStatus');
    if (status) {
      status.textContent = enabled
        ? 'اسحب مقبض البطاقة أو استخدم أزرار التحريك، ثم احفظ الترتيب.'
        : '';
    }
    renderUsers();
  }

  SiteChrome.mount();
  renderUsers();

  var searchInput = document.getElementById('freelancersSearch');
  if (searchInput) {
    searchInput.addEventListener('input', UI.debounce(function () {
      searchQuery = searchInput.value;
      visibleLimit = INITIAL_LIMIT;
      renderUsers();
    }, 180));
  }

  var moreButton = document.getElementById('freelancersMore');
  function loadMore() {
    if (isLoadingMore) return;
    isLoadingMore = true;
    visibleLimit += PAGE_SIZE;
    renderUsers();
    isLoadingMore = false;
  }
  if (moreButton) {
    moreButton.addEventListener('click', loadMore);
    UI.observeNearViewport(document.getElementById('freelancersMoreWrap'), loadMore);
  }

  if (reorderTools) {
    var startButton = document.getElementById('freelancerReorderStart');
    var saveButton = document.getElementById('freelancerReorderSave');
    var cancelButton = document.getElementById('freelancerReorderCancel');
    var status = document.getElementById('freelancerReorderStatus');
    var grid = document.getElementById('allUsersGrid');

    startButton.addEventListener('click', function () {
      originalOrder = orderedUsers.map(function (user) { return user.handle; });
      setReorderMode(true);
    });

    cancelButton.addEventListener('click', function () {
      var usersByHandle = {};
      orderedUsers.forEach(function (user) { usersByHandle[user.handle] = user; });
      orderedUsers = originalOrder.map(function (handle) {
        return usersByHandle[handle];
      }).filter(Boolean);
      setReorderMode(false);
    });

    saveButton.addEventListener('click', async function () {
      saveButton.disabled = true;
      status.textContent = 'جارٍ حفظ الترتيب...';
      try {
        var response = await fetch(SITE_URLS.freelancerReorder, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({
            order: orderedUsers.map(function (user) { return user.handle; })
          })
        });
        var result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'تعذر حفظ الترتيب.');
        }
        setReorderMode(false);
        status.textContent = 'تم حفظ ترتيب المستقلين.';
      } catch (error) {
        status.textContent = 'تعذر حفظ الترتيب. ' +
          (error.message || 'يرجى المحاولة مرة أخرى.');
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
      var button = event.target.closest('[data-freelancer-move]');
      if (!button || button.disabled || !reorderMode) return;
      event.preventDefault();
      event.stopPropagation();
      var card = button.closest('.user-card');
      var index = orderedUsers.findIndex(function (user) {
        return card && user.handle === card.dataset.userHandle;
      });
      var target = orderedUsers[index + Number(button.dataset.freelancerMove)];
      if (target) {
        moveUser(card.dataset.userHandle, target.handle, Number(button.dataset.freelancerMove) > 0);
      }
    });

    grid.addEventListener('dragstart', function (event) {
      var handle = event.target.closest('.course-drag-handle');
      if (!reorderMode || !handle) {
        event.preventDefault();
        return;
      }
      var card = handle.closest('.user-card');
      draggedUserHandle = card && card.dataset.userHandle;
      if (!draggedUserHandle) {
        event.preventDefault();
        return;
      }
      card.classList.add('freelancer-card-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedUserHandle);
    });

    grid.addEventListener('dragover', function (event) {
      if (!reorderMode || !draggedUserHandle) return;
      var card = event.target.closest('.user-card');
      if (card && card.dataset.userHandle !== draggedUserHandle) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      } else if (event.target === grid) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    });

    grid.addEventListener('drop', function (event) {
      if (!reorderMode || !draggedUserHandle) return;
      var card = event.target.closest('.user-card');
      if (card) {
        event.preventDefault();
        if (card.dataset.userHandle === draggedUserHandle) return;
        var rect = card.getBoundingClientRect();
        moveUser(
          draggedUserHandle,
          card.dataset.userHandle,
          event.clientY > rect.top + rect.height / 2
        );
      } else if (event.target === grid) {
        event.preventDefault();
        moveUser(draggedUserHandle, '', false);
      }
    });

    grid.addEventListener('dragend', function () {
      draggedUserHandle = '';
      grid.querySelectorAll('.freelancer-card-dragging').forEach(function (card) {
        card.classList.remove('freelancer-card-dragging');
      });
    });
  }

  document.addEventListener('click', function (ev) {
    var card = ev.target.closest('.user-card');
    if (!card) return;
    if (ev.target.closest('a, button, [data-act]')) return;
    if (reorderMode) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    var href = card.getAttribute('data-goto');
    if (!href) return;
    ev.preventDefault();
    ev.stopPropagation();
    location.href = href;
  }, true);

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var card = ev.target.closest('.user-card');
    if (!card) return;
    var href = card.getAttribute('data-goto');
    if (href) {
      ev.preventDefault();
      location.href = href;
    }
  });

  document.addEventListener('i18n:change', UI.debounce(function () {
    if (searchInput) searchQuery = searchInput.value;
    renderUsers();
  }, 60));
})();
