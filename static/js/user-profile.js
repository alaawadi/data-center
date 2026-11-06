(function () {
  'use strict';

  function e(s) { return UI.esc(s); }
  function t(k, v) { return I18n.t(k, v); }

  var activeTab = 'certificates';
  var userHandle = null;
  var userCounts = { certs: 0, projs: 0, posts: 0 };
  var isTrainerProfile = false;
  var isSelfProfile = false;
  var profileSkillsExpanded = false;
  var profileSkillItems = [];

  function profileText(ar, en) {
    return I18n.getLang() === 'en' ? en : ar;
  }

  /* هل الزائر الحالي هو صاحب هذا البروفايل؟ عندها تُعرض المسودات وأزرار التحكم */
  function isSelfUser() {
    var prof = window.Store && Store.state ? Store.state.profile : null;
    if (!prof || !prof.handle || !userHandle) return false;
    return String(prof.handle).toLowerCase() === String(userHandle).toLowerCase();
  }

  function profileBackUrl() {
    try {
      var returnPath = new URLSearchParams(location.search).get('return');
      if (returnPath) {
        var returnUrl = new URL(returnPath, location.origin);
        if (returnUrl.origin === location.origin && returnUrl.pathname !== location.pathname) {
          return returnUrl.pathname + returnUrl.search + returnUrl.hash;
        }
      }
    } catch (err) { /* Use the profiles listing for invalid return URLs. */ }
    return SITE.u('users');
  }

  function confirmWebsiteOpen(url) {
    var dialog = UI.modal({
      title: t('websiteConfirmTitle'),
      body: '<div class="website-confirm-content">' +
        '<span class="website-confirm-icon" aria-hidden="true">' + UI.icon('external-link', 22) + '</span>' +
        '<p class="modal-text">' + e(t('websiteConfirm')) + '</p>' +
        '<span class="website-confirm-url" dir="ltr">' + e(url) + '</span>' +
        '</div>',
      footer: '<button class="btn btn-ghost" type="button" data-website-cancel>' + e(t('cancel')) + '</button>' +
        '<button class="btn btn-primary" type="button" data-website-confirm>' +
        UI.icon('external-link', 16) + e(t('websiteOpen')) + '</button>',
      size: 'sm'
    });
    dialog.el.querySelector('[data-website-cancel]').addEventListener('click', dialog.close);
    dialog.el.querySelector('[data-website-confirm]').addEventListener('click', function () {
      dialog.close();
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  function renderUserProfileHeader(p, selfProfile) {
    var host = document.getElementById('profileHost');
    if (!host) return;
    var avatar = p.avatar || UI.profileAvatarFallback(p.name || p.handle, 280);

    host.innerHTML =
      '<a class="detail-back" href="' + e(profileBackUrl()) + '">' + UI.icon(document.documentElement.dir === 'rtl' ? 'arrow-right' : 'arrow-left', 16) + e(t('back')) + '</a>' +
      (p.adminTargetUserId ? '<button class="btn btn-primary" style="margin-block:12px" type="button" data-act="edit-admin-profile">' + UI.icon('pencil', 16) + ' تعديل البروفايل</button>' : '') +
      '<section class="card profile-card">' +
      '<div class="profile-banner"' + (p.cover ? ' style="background-image:url(\'' + e(p.cover) + '\')"' : '') + '>' +
      '<span class="bub" style="width:160px;height:160px;top:-60px;inset-inline-end:12%"></span>' +
      '<span class="bub" style="width:90px;height:90px;bottom:-30px;inset-inline-start:18%"></span>' +
      '</div>' +
      '<div class="profile-body">' +
      '<div class="profile-top">' +
      '<div class="profile-avatar-wrap">' +
      '<img class="profile-avatar" src="' + e(avatar) + '" alt="' + e(p.name || p.handle) + '" fetchpriority="high" draggable="false">' +
      '</div>' +
      '<div class="profile-head">' +
      '<div class="name-row"><h1>' + e(p.name || p.handle) + '</h1>' + (p.verified ? UI.verifiedBadge(20) : '') + '</div>' +
      (p.title ? '<div class="profile-handle"><span class="profile-title-pill">' + e(p.title) + '</span></div>' : '') +
      '</div>' +
      '</div>' +
      (p.bio ? '<p class="bio">' + e(p.bio) + '</p>' : '') +
      (p.website
        ? '<div class="profile-meta"><a class="pm" data-act="open-profile-website" href="https://' +
          e(p.website.replace(/^https?:\/\//, '')) + '" target="_blank" rel="noopener">' +
          UI.icon('link', 14) + e(p.website) + '</a></div>'
        : '') +
      UI.socialLinksHTML(p.social_links || p.socials) +
      '</div>' +
      (p.showReferralStats === true && typeof p.referral_points === 'number'
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

    var avatarImage = host.querySelector('.profile-avatar');
    if (avatarImage) {
      avatarImage.addEventListener('contextmenu', function (event) { event.preventDefault(); });
      avatarImage.addEventListener('dragstart', function (event) { event.preventDefault(); });
    }
  }

  function renderUserSkills(p) {
    var host = document.getElementById('publicSkills');
    if (!host) return;
    var skills = Array.isArray(p.skills)
      ? p.skills.filter(function (skill) { return String(skill || '').trim(); })
      : [];
    var levelsByName = {};
    (Array.isArray(p.skillsWithLevels) ? p.skillsWithLevels : []).forEach(function (skill) {
      if (!skill || !skill.name) return;
      levelsByName[String(skill.name).trim().toLowerCase()] = skill.level;
    });
    profileSkillItems = skills.map(function (skill) {
      var name = String(skill).trim();
      var rawLevel = Number(levelsByName[name.toLowerCase()]);
      var level = Number.isFinite(rawLevel) ? Math.max(0, Math.min(100, rawLevel)) : 0;
      return { name: name, level: level };
    });
    renderUserSkillsContent(host);
  }

  function renderUserSkillsContent(host) {
    host = host || document.getElementById('publicSkills');
    if (!host) return;
    var skills = profileSkillItems;
    host.hidden = skills.length === 0;
    if (!skills.length) {
      host.innerHTML = '';
      return;
    }
    host.innerHTML = '<div class="card-head"><h2>' + UI.icon('zap', 17) + e(t('skills')) + '</h2>' +
      (skills.length > 4
        ? '<span class="spacer"></span><button class="link-btn" type="button" data-act="toggle-profile-skills" aria-expanded="' + profileSkillsExpanded + '">' +
          e(t(profileSkillsExpanded ? 'showLess' : 'showAll')) + UI.icon('chevron-down', 14) + '</button>'
        : '') + '</div>' +
      '<div class="skills-grid ' + (profileSkillsExpanded ? 'is-expanded' : 'is-collapsed skill-tags-scroll') + '">' +
      skills.map(function (skill) {
        return profileSkillsExpanded
          ? '<div class="skill-item"><div class="skill-top"><span class="sk-name">' + e(skill.name) + '</span><span class="sk-pct">' + skill.level + '%</span></div>' +
            '<div class="skill-bar"><i style="width:' + skill.level + '%"></i></div></div>'
          : '<span class="skill-item skill-tag"><span class="sk-name">' + e(skill.name) + '</span></span>';
      }).join('') + '</div>';
    if (!profileSkillsExpanded && window.AppPage && AppPage.initSkillTagScroller) {
      AppPage.initSkillTagScroller(host.querySelector('.skill-tags-scroll'));
    }
  }

  function renderProfileTabs() {
    var host = document.getElementById('profileTabs');
    if (!host) return;
    var tabs = [];
    host.classList.toggle('profile-tabs-trainer', isTrainerProfile);
    if (userCounts.certs > 0) tabs.push({
        id: 'certificates',
        count: userCounts.certs,
        label: isTrainerProfile ? 'statTrainerCourses' : 'studentProfileCertificates',
        icon: isTrainerProfile ? 'graduation-cap' : 'award'
      });
    if (isTrainerProfile) {
      if (userCounts.projs > 0) tabs.push({
        id: 'projects',
        count: userCounts.projs,
        label: 'trainerProfileProjects',
        icon: 'folder'
      });
      if (userCounts.reviewedCerts > 0) tabs.push({
        id: 'reviewed-certificates',
        count: userCounts.reviewedCerts,
        label: 'studentProfileCertificates',
        icon: 'award'
      });
    } else {
      if (userCounts.reviewedCerts > 0) tabs.push({
        id: 'reviewed-certificates',
        count: userCounts.reviewedCerts,
        label: 'studentProfileCertificates',
        icon: 'award'
      });
      if (userCounts.projs > 0) tabs.push({
        id: 'projects',
        count: userCounts.projs,
        label: 'studentProfileProjects',
        icon: 'folder'
      });
    }
    if (!tabs.some(function (tab) { return tab.id === activeTab; })) {
      activeTab = tabs.length ? tabs[0].id : '';
    }
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

  function renderPanels(items) {
    var certs = items.certs;
    var projs = items.projs;
    var profileReturn = location.pathname + location.search + location.hash;

    var certHost = document.getElementById('panel-certificates');
    var reviewedCertHost = document.getElementById('panel-reviewed-certificates');
    var projHost = document.getElementById('panel-projects');
    var savedHost = document.getElementById('panel-saved');

    if (certHost) {
      if (isTrainerProfile) {
        /* بروفايل مدرب: نعرض دوراته هو فقط بدل الشهادات */
        certHost.innerHTML = certs.length
          ? '<div class="card-grid profile-course-grid' +
            (certs.some(function (course) {
              return course.courseType === 'in_person' && course.status === 'published';
            }) ? ' profile-inperson-course-grid' : '') + '">' + certs.map(function (course) {
              if (!window.AppPage) return '';
              if (course.courseType === 'in_person' && course.status === 'published') {
                return AppPage.inPersonCourseCard(course, { returnTo: profileReturn });
              }
              return AppPage.certCard(course, {
                course: true,
                courseListingBadge: true,
                profileInactiveCourse: course.status !== 'published',
                viewOnly: true,
                from: 'all-users',
                returnTo: profileReturn
              });
            }).join('') + '</div>'
          : UI.emptyState('graduation-cap', t('trainerCoursesEmpty'), '', '');
      } else {
        certHost.innerHTML = certs.length
          ? '<div class="card-grid profile-certificate-grid">' + certs.map(function (c) {
              if (!window.AppPage) return '';
              if (c.workshop) return AppPage.workshopCertificateCard(c, { returnTo: profileReturn });
              if (c.manual) return AppPage.certCard(c, { manualImage: true, returnTo: profileReturn });
              return AppPage.certCard(c, c.earned
                ? { returnTo: profileReturn, imageOnly: true }
                : { course: true, from: 'all-users', returnTo: profileReturn });
            }).join('') + '</div>'
          : UI.emptyState('award', t('certEmpty'), '', '');
      }

      if (reviewedCertHost) {
        var reviewedCerts = items.reviewedCerts || [];
        reviewedCertHost.innerHTML = reviewedCerts.length
          ? '<div class="card-grid profile-certificate-grid">' + reviewedCerts.map(function (certificate) {
              return window.AppPage
                ? AppPage.certCard(certificate, { manualImage: true, returnTo: profileReturn })
                : '';
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
    if (id === 'certificates' && !userCounts.certs) return;
    if (id === 'reviewed-certificates' && !userCounts.reviewedCerts) return;
    if (id === 'projects' && !userCounts.projs) return;
    activeTab = id;
    document.querySelectorAll('.panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + id);
    });
    syncStatTabs();
    if (id) {
      try { history.replaceState(null, '', location.pathname + location.search + '#' + id); } catch (err) { }
    }
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
          social_links: u.social_links || u.socials || {},
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
      if ((!r.social_links || !Object.keys(r.social_links).length) &&
          (u.social_links || u.socials)) r.social_links = u.social_links || u.socials;
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
    if (EMBEDDED_PROFILE) add(EMBEDDED_PROFILE);
    scan(window.Store && Store.collection ? Store.collection('certificates') : []);
    scan(window.Store && Store.collection ? Store.collection('projects') : []);

    var keyProf = prof && prof.handle ? String(prof.handle).toLowerCase() : null;
    var kUser = String(handle).toLowerCase();
    var self = !!(prof && prof.handle && keyProf === kUser);
    isSelfProfile = self;
    var tabFromHash = (location.hash || '').slice(1);
    if (tabFromHash === 'projects' || tabFromHash === 'reviewed-certificates') {
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
        social_links: EMBEDDED_PROFILE.social_links || {},
        whatsapp: EMBEDDED_PROFILE.whatsapp,
        accountPhone: EMBEDDED_PROFILE.accountPhone,
        joined: EMBEDDED_PROFILE.joined,
        adminTargetUserId: EMBEDDED_PROFILE.adminTargetUserId,
        fullNameArabic: EMBEDDED_PROFILE.fullNameArabic,
        fullNameEnglish: EMBEDDED_PROFILE.fullNameEnglish,
        trainerNameEnglish: EMBEDDED_PROFILE.trainerNameEnglish,
        skillsWithLevels: EMBEDDED_PROFILE.skillsWithLevels,
        showReferralStats: EMBEDDED_PROFILE.showReferralStats,
        referral_points: EMBEDDED_PROFILE.referral_points,
        referral_visits: EMBEDDED_PROFILE.referral_visits,
        isTrainer: EMBEDDED_PROFILE.isTrainer,
        roleKey: EMBEDDED_PROFILE.roleKey
      });
    }
    if (!user) {
      if (host && window.AppPage && AppPage.renderNotFound) AppPage.renderNotFound(host);
      return;
    }

    /* هل صاحب البروفايل مدرب؟ عندها يُستبدل قسم الشهادات بقسم «الدورات التدريبية» */
    isTrainerProfile = !!(EMBEDDED_PROFILE && (EMBEDDED_PROFILE.isTrainer || EMBEDDED_PROFILE.roleKey === 'trainer'));
    if (
      isTrainerProfile &&
      tabFromHash !== 'projects' &&
      tabFromHash !== 'reviewed-certificates'
    ) {
      activeTab = 'certificates';
    }

    var earnedCerts = window.Store && Store.profileCerts ? Store.profileCerts() : null;
    var earnedById = {};
    (earnedCerts || []).forEach(function (c) { earnedById[c.id] = c; });

    var userCerts;
    var reviewedCerts = [];
    if (isTrainerProfile) {
      /* دورات هذا المدرب فقط، مع إخفاء غير المنشور عنه عندما يزور بروفايله */
      userCerts = certsAll.filter(function (c) {
        return c && c.handle && String(c.handle).toLowerCase() === kUser;
      });
      if (self) {
        userCerts = userCerts.filter(function (course) {
          return course.status === 'published';
        });
      }
      userCerts.sort(function (a, b) {
        return Number(b.courseType === 'in_person') - Number(a.courseType === 'in_person');
      });
      reviewedCerts = (earnedCerts || []).filter(function (certificate) {
        return certificate.manual && (self || (
          certificate.status === 'approved' &&
          certificate.active === true
        ));
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
    renderUserProfileHeader(user, self);
    renderUserSkills(user);

    var userProjs = projsAll.filter(function (p) {
      if (p && p.status === 'draft' && !self) return false;
      var k = (p && p.handle ? String(p.handle).toLowerCase() : keyProf);
      return k === kUser;
    });
    userCounts = {
      certs: userCerts.length,
      reviewedCerts: reviewedCerts.length,
      projs: userProjs.length,
      posts: 0,
      saved: self && window.Store && Store.collection ? Store.collection('savedProjects').length : 0
    };
    renderProfileTabs();
    window.__upCounts = userCounts;
    renderPanels({
      certs: userCerts,
      reviewedCerts: reviewedCerts,
      projs: userProjs
    });
    setTab(activeTab);
  }

  document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('i18n:change', UI.debounce(boot, 60));
  document.addEventListener('click', function (ev) {
    var websiteLink = ev.target.closest('[data-act="open-profile-website"]');
    if (websiteLink) {
      ev.preventDefault();
      confirmWebsiteOpen(websiteLink.href);
      return;
    }
    var copyEmailButton = ev.target.closest('[data-act="copy-profile-email"]');
    if (copyEmailButton) {
      ev.preventDefault();
      UI.shareLink(copyEmailButton.getAttribute('data-email'), t('copied'));
      return;
    }
    var skillsButton = ev.target.closest('[data-act="toggle-profile-skills"]');
    if (skillsButton) {
      profileSkillsExpanded = !profileSkillsExpanded;
      renderUserSkillsContent();
      return;
    }
    var adminEditButton = ev.target.closest('[data-act="edit-admin-profile"]');
    if (adminEditButton) {
      ev.preventDefault();
      if (window.AppPage && AppPage.openProfileModal && EMBEDDED_PROFILE) {
        AppPage.openProfileModal(EMBEDDED_PROFILE);
      }
      return;
    }
    var actEl = ev.target.closest('[data-act="utab"]');
    if (!actEl) return;
    ev.preventDefault();
    setTab(actEl.getAttribute('data-tab'));
  });
})();
