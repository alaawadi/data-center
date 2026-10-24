(function () {
  'use strict';

  function e(s) { return UI.esc(s); }
  function t(k, v) { return I18n.t(k, v); }

  var activeTab = 'certificates';
  var userHandle = null;
  var userCounts = { certs: 0, projs: 0, posts: 0 };
  var isTrainerProfile = false;
  var isSelfProfile = false;

  function profileText(ar, en) {
    return I18n.getLang() === 'en' ? en : ar;
  }

  /* هل الزائر الحالي هو صاحب هذا البروفايل؟ عندها تُعرض المسودات وأزرار التحكم */
  function isSelfUser() {
    var prof = window.Store && Store.state ? Store.state.profile : null;
    if (!prof || !prof.handle || !userHandle) return false;
    return String(prof.handle).toLowerCase() === String(userHandle).toLowerCase();
  }

  function renderUserProfileHeader(p) {
    var host = document.getElementById('profileHost');
    if (!host) return;
    var cover = p.avatar || UI.initialsAvatar(p.name || p.handle, 280);

    host.innerHTML =
      '<a class="detail-back" href="' + SITE.u('users') + '">' + UI.icon(document.documentElement.dir === 'rtl' ? 'arrow-right' : 'arrow-left', 16) + e(t('back')) + '</a>' +
      '<section class="card profile-card">' +
      '<div class="profile-banner"' + (p.cover ? ' style="background-image:url(\'' + e(p.cover) + '\')"' : '') + '>' +
      '<span class="bub" style="width:160px;height:160px;top:-60px;inset-inline-end:12%"></span>' +
      '<span class="bub" style="width:90px;height:90px;bottom:-30px;inset-inline-start:18%"></span>' +
      '</div>' +
      '<div class="profile-body">' +
      '<div class="profile-top">' +
      '<div class="profile-avatar-wrap">' +
      '<img class="profile-avatar" src="' + e(cover) + '" alt="' + e(p.name || p.handle) + '">' +
      '</div>' +
      '<div class="profile-head">' +
      '<div class="name-row"><h1>' + e(p.name || p.handle) + '</h1>' + (p.verified ? UI.verifiedBadge(20) : '') + '</div>' +
      (p.title ? '<div class="profile-handle"><span class="profile-title-pill">' + e(p.title) + '</span></div>' : '') +
      '</div>' +
      '</div>' +
      (p.bio ? '<p class="bio">' + e(p.bio) + '</p>' : '') +
      '<div class="profile-meta">' +
      (p.website ? '<a class="pm" href="https://' + e(p.website.replace(/^https?:\/\//, '')) + '" target="_blank" rel="noopener">' + UI.icon('link', 14) + e(p.website) + '</a>' : '') +
      (p.email ? '<span class="pm">' + UI.icon('message-circle', 14) + e(p.email) + '</span>' : '') +
      (p.joined ? '<span class="pm">' + UI.icon('calendar', 14) + e(t('joined')) + ' ' + e(UI.formatDate(p.joined)) + '</span>' : '') +
      '</div></div>' +
      (typeof p.referral_points === 'number'
        ? '<div class="referral-summary" aria-label="إحصائيات الإحالة">' +
          '<div class="referral-stat referral-stat-points">' +
          '<span class="referral-stat-icon referral-stat-star" aria-hidden="true">⭐</span>' +
          '<span class="referral-stat-copy"><span class="referral-stat-label">إجمالي نقاط الإحالة</span><b>' + p.referral_points + '</b></span>' +
          '</div>' +
          '<div class="referral-stat referral-stat-visits">' +
          '<span class="referral-stat-icon">' + UI.icon('globe', 21) + '</span>' +
          '<span class="referral-stat-copy"><span class="referral-stat-label">زيارات روابطك</span><b>' + (p.referral_visits || 0) + '</b></span>' +
          '</div></div>'
        : '') +
      '</section>';
  }

  function renderUserSkills(p) {
    var host = document.getElementById('publicSkills');
    if (!host) return;
    var skills = Array.isArray(p.skills) ? p.skills : [];
    host.innerHTML = '<div class="card-head"><h2>' + UI.icon('zap', 17) + e(t('skills')) + '</h2></div>' +
      (skills.length
        ? '<div class="skills-grid is-collapsed">' + skills.map(function (skill) {
            return '<span class="skill-item skill-tag"><span class="sk-name">' + e(skill) + '</span></span>';
          }).join('') + '</div>'
        : '<p class="tiny muted">' + e(t('skillsEmpty')) + '</p>');
  }

  function renderProfileTabs() {
    var host = document.getElementById('profileTabs');
    if (!host) return;
    var tabs = [
      {
        id: 'certificates',
        count: userCounts.certs,
        label: isTrainerProfile ? 'statTrainerCourses' : 'statCertificates',
        icon: isTrainerProfile ? 'graduation-cap' : 'award'
      },
      { id: 'projects', count: userCounts.projs, label: 'statProjects', icon: 'folder' }
    ];
    host.innerHTML = tabs.map(function (tab) {
      var selected = activeTab === tab.id;
      return '<button class="profile-tab' + (selected ? ' is-active' : '') + '" type="button" role="tab" ' +
        'data-act="utab" data-tab="' + tab.id + '" aria-selected="' + selected + '" ' +
        'aria-controls="panel-' + tab.id + '">' +
        UI.icon(tab.icon, 18) +
        '<span class="profile-tab-label">' + e(t(tab.label)) + '</span>' +
        '<span class="profile-tab-count">' + tab.count + '</span>' +
        '</button>';
    }).join('');
  }

  function syncStatTabs() {
    document.querySelectorAll('#profileTabs [data-tab]').forEach(function (el) {
      var on = el.getAttribute('data-tab') === activeTab;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', on);
    });
  }

  function workshopCertificateCard(certificate) {
    return '<article class="workshop-certificate-card" aria-label="' +
      e(profileText('شهادة حضور ورشة', 'Workshop attendance certificate')) + '">' +
      '<div class="workshop-certificate-mark">' + UI.icon('award', 25) + '</div>' +
      '<div class="workshop-certificate-label">' +
      e(profileText('شهادة حضور ورشة وجاهية', 'In-person workshop attendance certificate')) + '</div>' +
      '<h3>' + e(certificate.title) + '</h3>' +
      '<p>' + e(certificate.studentName) + '</p>' +
      '<div class="workshop-certificate-meta"><span>' +
      e(profileText('التاريخ', 'Date')) + ': ' + e(UI.formatDate(certificate.date)) + '</span><span>' +
      e(profileText('المدة', 'Duration')) + ': ' + e(certificate.duration) + ' ' +
      e(profileText('دقيقة', 'minutes')) + '</span></div>' +
      '<small dir="ltr">' + e(certificate.code) + '</small></article>';
  }

  function renderPanels(items) {
    var certs = items.certs;
    var projs = items.projs;
    var profileReturn = location.pathname + location.search + location.hash;

    var certHost = document.getElementById('panel-certificates');
    var projHost = document.getElementById('panel-projects');
    var savedHost = document.getElementById('panel-saved');

    if (certHost) {
      if (isTrainerProfile) {
        /* بروفايل مدرب: نعرض دوراته هو فقط بدل الشهادات */
        certHost.innerHTML = certs.length
          ? '<div class="card-grid profile-course-grid">' + certs.map(function (c) {
              return window.AppPage ? AppPage.certCard(c, {
                course: true,
                from: 'all-users',
                returnTo: profileReturn
              }) : '';
            }).join('') + '</div>'
          : UI.emptyState('graduation-cap', t('trainerCoursesEmpty'), '', '');
      } else {
        certHost.innerHTML = certs.length
          ? '<div class="card-grid profile-certificate-grid">' + certs.map(function (c) {
              if (!window.AppPage) return '';
              if (c.workshop) return workshopCertificateCard(c);
              if (c.manual) return AppPage.certCard(c, { manualImage: true });
              return AppPage.certCard(c, c.earned
                ? { returnTo: profileReturn, imageOnly: true }
                : { course: true, from: 'all-users', returnTo: profileReturn });
            }).join('') + '</div>'
          : UI.emptyState('award', t('certEmpty'), '', '');
      }

    }

    if (projHost) {
      var showDrafts = isSelfUser();
      projHost.innerHTML = projs.length
        ? '<div class="card-grid profile-project-grid">' + projs.map(function (p) { return window.AppPage ? AppPage.projCard(p, { viewOnly: !showDrafts }) : ''; }).join('') + '</div>'
        : UI.emptyState('folder', t('projEmpty'), '', '');
    }

    if (savedHost) {
      var savedProjects = isSelfProfile && window.Store && Store.collection
        ? Store.collection('savedProjects')
        : [];
      savedHost.innerHTML = savedProjects.length
        ? '<div class="card-grid profile-project-grid profile-saved-grid">' + savedProjects.map(function (p) {
            return window.AppPage ? AppPage.projCard(p, { viewOnly: true }) : '';
          }).join('') + '</div>'
        : UI.emptyState('bookmark', t('savedProjectsEmpty'), t('savedProjectsEmptySub'), '');
    }

    document.querySelectorAll('.panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + activeTab);
    });
    syncStatTabs();
  }

  function setTab(id) {
    if (id === 'saved' && !isSelfProfile) return;
    activeTab = id;
    document.querySelectorAll('.panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + id);
    });
    syncStatTabs();
    try { history.replaceState(null, '', location.pathname + location.search + '#' + id); } catch (err) { }
  }

  var EMBEDDED_PROFILE = (function () {
    var el = document.getElementById('profile-data');
    if (!el) return null;
    try {
      var d = JSON.parse(el.textContent);
      return d && typeof d === 'object' ? d : null;
    } catch (err) { return null; }
  })();

  function boot() {
    var handle = SITE.param('handle');
    var host = document.getElementById('profileHost');
    if (!handle) {
      if (host && window.AppPage && AppPage.renderNotFound) AppPage.renderNotFound(host);
      return;
    }
    userHandle = handle;

    var map = {};
    var prof = window.Store && Store.state ? Store.state.profile : null;

    function add(u) {
      if (!u || !u.handle) return;
      var k = String(u.handle).toLowerCase();
      if (!map[k]) {
        map[k] = {
          name: u.name || u.author || u.handle,
          handle: u.handle,
          avatar: u.avatar || '',
          verified: !!u.verified,
          title: u.title || '',
          bio: u.bio || '',
          location: u.location || '',
          website: u.website || '',
          email: u.email || '',
          joined: u.joined || '',
          certificates: 0,
          projects: 0,
          posts: 0,
          likes: 0
        };
      }
      var r = map[k];
      if (!r.avatar && u.avatar) r.avatar = u.avatar;
      if (!r.title && u.title) r.title = u.title;
      if (!r.bio && u.bio) r.bio = u.bio;
      if (!r.location && u.location) r.location = u.location;
      if (!r.website && u.website) r.website = u.website;
      if (!r.email && u.email) r.email = u.email;
      if (!r.joined && u.joined) r.joined = u.joined;
      if (!r.name && (u.name || u.author)) r.name = u.name || u.author;
      if (u.verified) r.verified = true;
    }

    function scan(list) {
      (list || []).forEach(function (item) {
        (item.comments || []).forEach(function walk(c) {
          add(c);
          (c.replies || []).forEach(walk);
        });
      });
    }

    if (prof) add(prof);
    var postsAll = window.Store && Store.collection ? Store.collection('posts') : [];
    postsAll.forEach(add);
    scan(postsAll);
    scan(window.Store && Store.collection ? Store.collection('certificates') : []);
    scan(window.Store && Store.collection ? Store.collection('projects') : []);

    var keyProf = prof && prof.handle ? String(prof.handle).toLowerCase() : null;
    var kUser = String(handle).toLowerCase();
    var self = !!(prof && prof.handle && keyProf === kUser);
    isSelfProfile = self;
    var tabFromHash = (location.hash || '').slice(1);
    if (tabFromHash === 'projects') {
      activeTab = tabFromHash;
    }

    var certsAll = window.Store && Store.collection ? Store.collection('certificates') : [];
    var projsAll = window.Store && Store.collection ? Store.collection('projects') : [];

    certsAll.forEach(function (c) {
      var k = (c.handle ? String(c.handle).toLowerCase() : keyProf);
      if (k && map[k]) map[k].certificates++;
    });
    projsAll.forEach(function (p) {
      if (p && p.status === 'draft' && !self) return;
      var k = (p && p.handle ? String(p.handle).toLowerCase() : keyProf);
      if (k && map[k]) map[k].projects++;
    });
    postsAll.forEach(function (p) {
      if (p && p.status === 'draft' && !self) return;
      var k = (p && p.handle ? String(p.handle).toLowerCase() : keyProf);
      if (k && map[k]) {
        map[k].posts++;
        map[k].likes += (p.likes || 0);
      }
    });

    var user = map[kUser];
    if (EMBEDDED_PROFILE && EMBEDDED_PROFILE.handle && String(EMBEDDED_PROFILE.handle).toLowerCase() === kUser) {
      user = Object.assign({}, user || {}, {
        name: EMBEDDED_PROFILE.name,
        handle: EMBEDDED_PROFILE.handle,
        avatar: EMBEDDED_PROFILE.avatar,
        verified: !!EMBEDDED_PROFILE.verified,
        title: EMBEDDED_PROFILE.title,
        bio: EMBEDDED_PROFILE.bio,
        skills: EMBEDDED_PROFILE.skills,
        location: EMBEDDED_PROFILE.location,
        website: EMBEDDED_PROFILE.website,
        email: EMBEDDED_PROFILE.email,
        joined: EMBEDDED_PROFILE.joined,
        referral_points: EMBEDDED_PROFILE.referral_points,
        referral_visits: EMBEDDED_PROFILE.referral_visits
      });
    }
    if (!user) {
      if (host && window.AppPage && AppPage.renderNotFound) AppPage.renderNotFound(host);
      return;
    }

    /* هل صاحب البروفايل مدرب؟ عندها يُستبدل قسم الشهادات بقسم «الدورات التدريبية» */
    isTrainerProfile = !!(EMBEDDED_PROFILE && (EMBEDDED_PROFILE.isTrainer || EMBEDDED_PROFILE.roleKey === 'trainer'));

    var earnedCerts = window.Store && Store.profileCerts ? Store.profileCerts() : null;
    var earnedById = {};
    (earnedCerts || []).forEach(function (c) { earnedById[c.id] = c; });

    var userCerts;
    if (isTrainerProfile) {
      /* دورات المدرب المنشورة فقط (بدون أي شهادة أو دورات غيره) */
      userCerts = certsAll.filter(function (c) {
        return c && c.handle && String(c.handle).toLowerCase() === kUser;
      });
    } else {
      /* الشهادات المكتسبة لصاحب البروفايل (تُدمج مع دوراته — نفس الاسم ونفس التفاصيل) */
      userCerts = certsAll.filter(function (c) {
        var k = (c.handle ? String(c.handle).toLowerCase() : keyProf);
        return k === kUser;
      }).map(function (c) { return earnedById[c.id] || c; });
      if (earnedCerts && earnedCerts.length) {
        earnedCerts.forEach(function (c) {
          if (!userCerts.some(function (x) { return x.id === c.id; })) userCerts.push(c);
        });
      }
    }
    user.certificates = userCerts.length;

    if (window.SiteChrome && SiteChrome.mount) SiteChrome.mount();
    renderUserProfileHeader(user);
    renderUserSkills(user);

    var userProjs = projsAll.filter(function (p) {
      if (p && p.status === 'draft' && !self) return false;
      var k = (p && p.handle ? String(p.handle).toLowerCase() : keyProf);
      return k === kUser;
    });
    var userPosts = postsAll.filter(function (p) {
      if (p && p.status === 'draft' && !self) return false;
      var k = (p && p.handle ? String(p.handle).toLowerCase() : keyProf);
      return k === kUser;
    });

    userCounts = {
      certs: userCerts.length,
      projs: userProjs.length,
      posts: userPosts.length,
      saved: self && window.Store && Store.collection ? Store.collection('savedProjects').length : 0
    };
    renderProfileTabs();
    window.__upCounts = userCounts;
    renderPanels({ certs: userCerts, projs: userProjs });
    setTab(activeTab);
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('i18n:change', UI.debounce(boot, 60));
  document.addEventListener('click', function (ev) {
    var actEl = ev.target.closest('[data-act="utab"]');
    if (!actEl) return;
    ev.preventDefault();
    setTab(actEl.getAttribute('data-tab'));
  });
})();
