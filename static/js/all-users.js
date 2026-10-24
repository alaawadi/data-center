(function () {
  'use strict';

  var INITIAL_LIMIT = 21;
  var PAGE_SIZE = 18;
  var visibleLimit = INITIAL_LIMIT;
  var searchQuery = '';

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
    if (EMBEDDED_USERS) return collectDbUsers();
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
    host.innerHTML = list.slice(0, visibleLimit).map(renderCard).join('');
    var moreWrap = document.getElementById('freelancersMoreWrap');
    if (moreWrap) moreWrap.hidden = list.length <= visibleLimit;
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
  if (moreButton) {
    moreButton.addEventListener('click', function () {
      visibleLimit += PAGE_SIZE;
      renderUsers();
    });
  }

  document.addEventListener('click', function (ev) {
    var card = ev.target.closest('.user-card');
    if (!card) return;
    var href = card.getAttribute('data-goto');
    if (!href) return;
    if (ev.target.closest('a, button, [data-act]')) {
      if (ev.target.closest('.user-card') !== card) return;
    }
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
