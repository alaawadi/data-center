(function () {
  'use strict';

  var page = document.body.getAttribute('data-page');
  var searchQuery = '';
  var activeTab = 'certificates';
  var skillsExpanded = false;
  var lastGalleryDrag = 0;

  /* البيانات الحقيقية للمستخدم المسجّل (من السيرفر) تحل مكان بيانات العرض التوضيحي */
  var SERVER_PROFILE = null;
  (function applyServerProfile() {
    var el = document.getElementById('my-profile-data');
    if (!el || !window.Store) return;
    var data;
    try { data = JSON.parse(el.textContent); } catch (err) { return; }
    if (!data || !data.handle) return;
    var skills = data.skills;
    delete data.skills;
    Object.assign(Store.state.profile, data);
    if (Array.isArray(skills)) Store.state.skills = skills;
    SERVER_PROFILE = data;
  })();

  function t(k, v) { return I18n.t(k, v); }
  function e(s) { return UI.esc(s); }

  /* هل المستخدم المسجّل مدرب؟ (يُبدَّل قسم الشهادات بقسم «الدورات التدريبية») */
  var IS_TRAINER = !!(SERVER_PROFILE && (SERVER_PROFILE.isTrainer || SERVER_PROFILE.roleKey === 'trainer'));

  /* أزرار التعديل والحذف تظهر فقط لصاحب المشروع نفسه */
  function isOwner(p) {
    return !!(SERVER_PROFILE && SERVER_PROFILE.handle && p && p.handle && SERVER_PROFILE.handle === p.handle);
  }

  /* الدورات: صاحب الدورة فقط يعدّلها ويحذفها (الدورات المحلية بلا handle تبقى كما كانت) */
  function canManageCourse(c) {
    return !!(c && (!c.handle || isOwner(c)));
  }

  /* شهادات الطالب المكتسبة فعلياً (null لزائر غير مسجّل → بيانات العرض التوضيحي) */
  function earnedCerts() {
    return (window.Store && Store.myCerts) ? Store.myCerts() : null;
  }

  /* عدد شهادات الطالب في بطاقته: الشهادات المكتسبة فقط (لا كل الدورات المنشورة) */
  function certStatCount() {
    var mine = earnedCerts();
    if (mine) return mine.length;
    return Store.totals().certificates;
  }

  /* ---------- shared cards ---------- */

  function earnedCertificateSheet(c, studentName, compact) {
    var instructor = c.instructor || c.issuer || '';
    var issued = c.date ? UI.formatDate(c.date) : '—';
    return '<div class="cert-sheet' + (compact ? ' cert-sheet-preview' : '') + '">' +
      '<img class="cert-sheet-stamp" src="' + SITE.assets('images/cert-stamp.jpeg') + '" alt="' + e(t('certPageStamp')) + '">' +
      '<div class="cert-sheet-seal">' + UI.icon('award', compact ? 18 : 28) + '</div>' +
      '<div class="cert-sheet-brand">' + UI.verifiedBadge(compact ? 12 : 16) + e(t('certPageBrand')) + '</div>' +
      '<div class="cert-sheet-kicker">' + e(t('certPageKicker')) + '</div>' +
      '<h2 class="cert-sheet-title">' + e(c.title) + '</h2>' +
      '<div class="cert-sheet-to">' + e(t('certPageAwarded')) + '</div>' +
      '<div class="cert-sheet-name">' + e(studentName || '—') + '</div>' +
      '<div class="cert-sheet-course">' + e(t('certPageCompleted')) + ' «' + e(c.title) + '»</div>' +
      '<div class="cert-sheet-meta">' +
      '<div>' + e(t('certPageIssued')) + '<b>' + e(issued) + '</b></div>' +
      '<div>' + e(t('certPageTrainer')) + '<b>' + e(instructor || '—') + '</b></div>' +
      '<div>' + e(t('certPageStatus')) + '<b>' + e(t('certPageStatusValid')) + '</b></div>' +
      '</div></div>';
  }

  function certCard(c, opts) {
    if (!opts || typeof opts !== 'object') opts = {};
    var returnTo = opts.returnTo
      ? '?return=' + encodeURIComponent(opts.returnTo)
      : '';
    var courseParams = [];
    if (opts.from) courseParams.push('from=' + encodeURIComponent(opts.from));
    if (opts.returnTo) courseParams.push('return=' + encodeURIComponent(opts.returnTo));
    var detailUrl = opts.course
      ? SITE.u('course', e(c.id)) + (courseParams.length ? '?' + courseParams.join('&') : '')
      : SITE.u('certificate', e(c.id)) + returnTo;
    if (opts.imageOnly) {
      return '<article class="cert-card cert-card-preview" data-goto="' + detailUrl + '" data-search="' +
        e((c.title + ' ' + c.issuer + ' ' + (c.category || '') + ' ' + (c.studentName || '')).toLowerCase()) + '">' +
        earnedCertificateSheet(c, c.studentName || (SERVER_PROFILE && SERVER_PROFILE.fullName) || '', true) +
        '</article>';
    }
    if (opts.manualImage) {
      return '<article class="cert-card cert-card-uploaded" data-goto="' + detailUrl + '" data-search="' +
        e((c.title + ' ' + c.issuer + ' ' + (c.category || '') + ' ' + (c.studentName || '')).toLowerCase()) + '">' +
        '<img src="' + e(c.image || '') + '" alt="' + e(c.title) + '" loading="lazy">' +
        (c.status === 'pending' ? '<span class="manual-cert-status">' + e(c.statusLabel || t('certPendingReviewStatus')) + '</span>' : '') +
        '</article>';
    }
    var cat = e(c.category || t('certCategory'));
    var skills = (c.skills || []).slice(0, 2).map(function (s) { return '<span class="chip sm cert-skill">' + e(s) + '</span>'; }).join('');
    var desc = c.description ? c.description.replace(/\s+/g, ' ').trim() : '';
    var isCourse = !!opts.course;
    var isDraftCourse = isCourse && c.status === 'draft';
    var foot = isCourse
      ? '<div class="cert-foot">' +
          (c.duration ? '<span class="cert-meta">' + UI.icon('clock', 13) + e(c.duration) + '</span>' : '') +
          (isDraftCourse
            ? '<span class="chip warn">' + e(t('draft')) + '</span>'
            : '<span class="verified-mini">' + UI.verifiedBadge(14) + e(t('certApproved')) + '</span>') +
        '</div>'
      : '<div class="cert-foot"><time>' + e(UI.formatDate(c.date)) + '</time><span class="verified-mini">' + UI.verifiedBadge(14) + e(t('certVerified')) + '</span></div>';
    return '<article class="cert-card" data-goto="' + detailUrl + '" data-search="' + e((c.title + ' ' + c.issuer + ' ' + (c.category || '') + ' ' + (desc) + ' ' + (c.skills || []).join(' ')).toLowerCase()) + '">' +
      (opts.viewOnly || c.earned || !canManageCourse(c) ? '' : '<div class="card-actions">' +
          '<button class="btn-icon" data-act="goto" data-url="' + SITE.u('courseEdit', e(c.id)) + '" title="' + e(t('edit')) + '">' + UI.icon('pencil', 15) + '</button>' +
      (isCourse ? '' : '<button class="btn-icon danger" data-act="del-cert" data-id="' + e(c.id) + '" title="' + e(t('delete')) + '">' + UI.icon('trash', 15) + '</button>') +
      '</div>') +
      '<div class="cert-thumb" style="background-image:url(\'' + c.image + '\')">' +
      '<span class="cert-cat">' + cat + '</span>' +
      (isCourse
        ? (c.price ? '<span class="cert-price-tag">' + e(c.price) + '</span>' : '')
        : '<span class="cert-seal">' + UI.verifiedBadge(19) + '</span>') +
      '</div>' +
      '<div class="cert-body">' +
      '<h3>' + e(c.title) + '</h3>' +
      (isCourse ? '' : '<div class="cert-issuer"><span class="issuer-dot">' + e((c.issuer || '?').charAt(0)) + '</span><span>' + e(c.issuer) + '</span></div>') +
      (isCourse || !desc ? '' : '<p class="cert-desc">' + e(desc) + '</p>') +
      ((c.skills && c.skills.length) ? '<div class="cert-skills">' + skills + '</div>' : '') +
      foot +
      '</div></article>';
  }

  function projectDetailUrl(id) {
    var source = location.pathname + location.search + location.hash;
    return SITE.u('project', e(id)) + '?return=' + encodeURIComponent(source);
  }

  function projCard(p, opts) {
    if (!opts || typeof opts !== 'object') opts = {};
    var tags = (p.tags || []).slice(0, 3).map(function (x) { return '<span class="chip">' + e(x) + '</span>'; }).join('');
    var cover = p.cover ? '<img src="' + e(p.cover) + '" alt="">' : '<div class="no-cover">' + UI.icon('layers', 34) + '</div>';
    var draft = p.status === 'draft' ? '<span class="chip warn" style="position:absolute;top:10px;inset-inline-start:10px;z-index:1">' + e(t('draft')) + '</span>' : '';
    var courseBadge = (p.visibility === 'courses' && p.status !== 'draft')
      ? '<span class="chip course-badge" style="position:absolute;top:10px;inset-inline-start:10px;z-index:1">' + UI.icon('award', 12) + ' ' + e(t('projectCourseBadge')) + '</span>'
      : '';
    return '<article class="proj-card" data-goto="' + projectDetailUrl(p.id) + '" data-search="' + e((p.title + ' ' + (p.summary || '') + ' ' + (p.tags || []).join(' ')).toLowerCase()) + '">' +
      (!opts.viewOnly && isOwner(p) ? '<div class="card-actions">' +
      '<button class="btn-icon" data-act="goto" data-url="' + SITE.u('projectEdit', e(p.id)) + '" title="' + e(t('edit')) + '">' + UI.icon('pencil', 15) + '</button>' +
      '<button class="btn-icon danger" data-act="del-project" data-id="' + e(p.id) + '" title="' + e(t('delete')) + '">' + UI.icon('trash', 15) + '</button>' +
      '</div>' : '') +
      '<div class="proj-cover">' + cover + draft + courseBadge + '<div class="proj-tags">' + tags + '</div></div>' +
      '<div class="proj-body"><h3>' + e(p.title) + '</h3><p>' + e(p.summary || '') + '</p>' +
      '<div class="proj-meta">' +
      '<span class="pm">' + UI.icon('calendar', 13) + e(UI.formatDate(p.date)) + '</span>' +
      (p.role ? '<span class="pm">' + UI.icon('briefcase', 13) + e(p.role) + '</span>' : '') +
      (p.files && p.files.length ? '<span class="pm">' + UI.icon('file', 13) + p.files.length + '</span>' : '') +
      '</div></div>' +
      '<div class="proj-foot">' +
      '<span class="stat' + (p.liked ? ' like-on' : '') + '">' + UI.iconFilled('heart', 14) + ' ' + (p.likes || 0) + '</span>' +
      '<span class="spacer"></span>' +
      '<span class="stat">' + UI.icon('eye', 14) + ' ' + (p.views || 0) + '</span>' +
      '</div></article>';
  }

  function postMedia(post) {
    if (post.media && post.media.length) return post.media;
    return (post.images || []).map(function (src) { return { type: 'image', src: src }; });
  }

  var RATIO_CLASS = { '1:1': 'ratio-1-1', '4:5': 'ratio-4-5', '1.91:1': 'ratio-191' };

  function mediaCarouselHTML(post) {
    var media = postMedia(post);
    if (!media.length) return '';
    var ratio = RATIO_CLASS[post.ratio] || 'ratio-1-1';
    var slides = media.map(function (m) {
      if (m.type === 'video') {
        return '<div class="mc-slide"><video src="' + e(m.src) + '" controls playsinline preload="metadata" onclick="event.stopPropagation()"></video></div>';
      }
      return '<div class="mc-slide"><img src="' + e(m.src) + '" alt="" draggable="false"></div>';
    }).join('');
    var multi = media.length > 1;
    var dots = multi ? '<div class="mc-dots">' + media.map(function (_, i) { return '<i class="' + (i === 0 ? 'on' : '') + '"></i>'; }).join('') + '</div>' : '';
    var arrows = multi
      ? '<button class="mc-arrow mc-prev" data-mc="-1" aria-label="prev">' + UI.icon('chevron-left', 15) + '</button>' +
        '<button class="mc-arrow mc-next" data-mc="1" aria-label="next">' + UI.icon('chevron-right', 15) + '</button>'
      : '';
    return '<div class="post-media ' + ratio + '">' + dots + arrows + '<div class="mc-track">' + slides + '</div></div>';
  }

  function tagsRow(tags) {
    if (!tags || !tags.length) return '';
    return '<div class="post-tags">' + tags.map(function (x) {
      return '<button class="tag" data-act="search-tag" data-tag="' + e(x) + '">#' + e(x) + '</button>';
    }).join('') + '</div>';
  }

  function commentHTML(c, postId, depth, readOnly) {
    var isMe = c.handle === Store.state.profile.handle;
    var replies = (c.replies || []).map(function (r) { return commentHTML(r, postId, depth + 1, readOnly); }).join('');
    return '<div class="comment' + (depth ? ' comment-reply' : '') + '" data-comment="' + e(c.id) + '" data-post="' + e(postId) + '">' +
      UI.avatarOf({ name: c.author, avatar: c.avatar }, depth ? 28 : 34) +
      '<div class="comment-main">' +
      '<div class="comment-text"><span class="comment-name">' + e(c.author) + (isMe ? ' ' + UI.verifiedBadge(12) : '') + '</span>' + e(c.text) + '</div>' +
      '<div class="comment-meta">' +
      '<span>' + e(UI.timeAgo(c.createdAt)) + '</span>' +
      (c.likes ? '<span class="cm-likes">' + e(UI.countFmt('likes', c.likes)) + '</span>' : '') +
      (!readOnly && depth < 1 ? '<button data-act="reply">' + e(t('reply')) + '</button>' : '') +
      '</div>' +
      (replies ? '<div class="comment-replies">' + replies + '</div>' : '') +
      (!readOnly ? '<div class="reply-box hide">' +
      UI.avatarOf(Store.state.profile, 26) +
      '<input class="input" placeholder="' + e(t('replyPlaceholder')) + '" data-reply-input>' +
      '<button class="btn-icon sm" data-act="send-reply" title="' + e(t('send')) + '">' + UI.icon('send', 15) + '</button>' +
      '</div>' : '') +
      '</div>' +
      (readOnly ? '' : '<button class="c-like' + (c.liked ? ' liked' : '') + '" data-act="like-comment" title="' + e(t('like')) + '">' + UI.icon('heart', 14) + '</button>') +
      '</div>';
  }

  function commentsSectionHTML(post, full, opts) {
    opts = opts || {};
    var comments = post.comments || [];
    var html = '';
    if (full && !comments.length) {
      html += '<p class="tiny muted" style="padding:2px 0 10px">' + e(t('noComments')) + '</p>';
    }
    var shown = full ? comments : comments.slice(0, 2);
    html += shown.map(function (c) { return commentHTML(c, post.id, 0, opts.readOnly); }).join('');
    if (!opts.noInput) {
      html += '<div class="comment-input-row">' +
        UI.avatarOf(Store.state.profile, 32) +
        '<input class="input" placeholder="' + e(t('commentPlaceholder')) + '" data-comment-input>' +
        '<button class="ci-send" data-act="send-comment">' + e(t('post')) + '</button>' +
        '</div>';
    }
    return html;
  }


  var SHARE_NETS = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'x', label: 'X' },
    { id: 'threads', label: 'Threads' }
  ];

  function shareMenuHTML() {
    return SHARE_NETS.map(function (n) {
      return '<button data-act="share-to" data-net="' + n.id + '"><span class="sw-ic sw-' + n.id + '">' + UI.icon(n.id, 17) + '</span>' + n.label + '</button>';
    }).join('');
  }

  function postCard(post, opts) {
    opts = opts || {};
    var prof = Store.state.profile;
    var likedCls = post.liked ? ' liked' : '';
    var savedCls = post.saved ? ' saved-on' : '';
    var nComments = (post.comments || []).length;
    var serverPost = Store.usingServerPosts;
    var canManage = !serverPost && !opts.viewOnly && isOwner(post);
    var menuHtml = canManage ? '<div class="post-menu-wrap">' +
      '<button class="btn-icon" data-act="menu">' + UI.icon('more-horizontal', 18) + '</button>' +
      '<div class="post-menu">' +
      '<button data-act="share" data-url="' + e(location.href) + '">' + UI.icon('share-2', 15) + e(t('shareCta')) + '</button>' +
      '<button class="danger" data-act="del-post" data-id="' + e(post.id) + '">' + UI.icon('trash', 15) + e(t('delete')) + '</button>' +
      '</div></div>' : '';
    var author = post.author || prof.name;
    var authorHandle = post.handle || prof.handle;
    var authorAvatar = post.avatar || prof.avatar;
    return '<article class="post" data-post="' + e(post.id) + '">' +
      '<header class="post-head">' +
      UI.avatarOf({ name: author, avatar: authorAvatar }, 36) +
      '<div class="grow">' +
      '<div class="post-author">' + e(author) + (prof.verified && (!post.handle || post.handle === prof.handle) ? UI.verifiedBadge(14) : '') + '</div>' +
      '<div class="post-sub"><span>@' + e(authorHandle) + '</span><span class="dot"></span><span>' + e(UI.timeAgo(post.createdAt)) + '</span>' +
      (post.editedAt ? '<span class="dot"></span><span>' + e(t('edit')) + '</span>' : '') + '</div>' +
      '</div>' + menuHtml +
      '</header>' +
      mediaCarouselHTML(post) +
      '<div class="post-actions">' +
      (serverPost
        ? '<span class="pa-btn">' + UI.iconFilled('heart', 23) + '<span class="pa-n">' + (post.likes || 0) + '</span></span>' +
          '<span class="pa-btn">' + UI.icon('message-circle', 23) + '<span class="pa-n">' + nComments + '</span></span>'
        : '<button data-act="like-post" class="pa-btn' + likedCls + '" title="' + e(post.liked ? t('liked') : t('like')) + '">' + UI.iconFilled('heart', 23) + '<span class="pa-n">' + (post.likes || 0) + '</span></button>' +
          '<button data-act="focus-comment" class="pa-btn" title="' + e(t('comment')) + '">' + UI.icon('message-circle', 23) + '<span class="pa-n">' + nComments + '</span></button>') +
      '<div class="share-wrap">' +
      '<button data-act="share-menu" class="pa-btn" title="' + e(t('shareCta')) + '">' + UI.icon('send', 23) + '<span class="pa-n">' + (post.shares || 0) + '</span></button>' +
      '<div class="share-menu">' + shareMenuHTML() + '</div>' +
      '</div>' +
      (serverPost
        ? '<span class="pa-btn pa-save">' + UI.icon('bookmark', 23) + '<span class="pa-n">' + (post.saves || 0) + '</span></span>'
        : '<button data-act="save-post" class="pa-btn pa-save' + savedCls + '" title="' + e(post.saved ? t('saved') : t('save')) + '">' + UI.icon('bookmark', 23) + '<span class="pa-n">' + (post.saves || 0) + '</span></button>') +
      '</div>' +
      '<div class="post-likes">' + e(UI.countFmt('likes', post.likes)) + '</div>' +
      '<div class="post-caption prose">' +
      '<div class="cap-text"><span class="cap-name">' + e(author) + '</span>' + UI.sanitize(post.content) + '</div>' +
      tagsRow(post.tags) +
      '<button class="cap-more hide">' + e(t('showMore')) + '</button>' +
      '</div>' +
      (opts.full ? '<div class="post-comments">' + commentsSectionHTML(post, true, { readOnly: serverPost, noInput: serverPost }) + '</div>' : '') +
      '</article>';
  }

  function initCaptions(root) {
    (root || document).querySelectorAll('.post-caption').forEach(function (cap) {
      var text = cap.querySelector('.cap-text');
      var more = cap.querySelector('.cap-more');
      if (!text || !more) return;
      if (text.scrollHeight <= text.clientHeight + 2) { more.classList.add('hide'); return; }
      more.classList.remove('hide');
      more.onclick = function () {
        cap.classList.add('expanded');
        more.classList.add('hide');
      };
    });
  }

  /* ---------- chrome ---------- */

  function mountChrome() {
    if (window.SiteChrome && SiteChrome.mount) SiteChrome.mount();
  }

  /* ---------- home ---------- */

  function renderProfile() {
    var p = Store.state.profile;
    var host = document.getElementById('profileCard');
    host.innerHTML =
      '<div class="profile-banner"' + (p.cover ? ' style="background-image:url(\'' + e(p.cover) + '\')"' : '') + '>' +
      '<span class="bub" style="width:160px;height:160px;top:-60px;inset-inline-end:12%"></span>' +
      '<span class="bub" style="width:90px;height:90px;bottom:-30px;inset-inline-start:18%"></span>' +
      '</div>' +
      '<div class="profile-body">' +
      '<div class="profile-top">' +
      '<div class="profile-avatar-wrap">' +
      '<img class="profile-avatar" src="' + e(p.avatar || UI.initialsAvatar(p.name, 220)) + '" alt="' + e(p.name) + '">' +
      '<button class="avatar-edit" data-act="edit-profile" title="' + e(t('profileEdit')) + '">' + UI.icon('camera', 14) + '</button>' +
      '</div>' +
      '<div class="profile-head">' +
      '<div class="name-row"><h1>' + e(p.name) + '</h1>' + (p.verified ? UI.verifiedBadge(20) : '') + '</div>' +
      (p.title ? '<div class="profile-handle"><span class="profile-title-pill">' + e(p.title) + '</span></div>' : '') +
      '</div>' +
      '<div class="profile-actions">' +
      '<button class="btn btn-soft btn-sm" data-act="edit-profile">' + UI.icon('pencil', 15) + e(t('profileEdit')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="share-profile">' + UI.icon('share-2', 15) + e(t('profileShare')) + '</button>' +
      '</div>' +
      '</div>' +
      (p.bio ? '<p class="bio">' + e(p.bio) + '</p>' : '') +
      '<div class="profile-meta">' +
      (p.website ? '<a class="pm" href="https://' + e(p.website.replace(/^https?:\/\//, '')) + '" target="_blank" rel="noopener">' + UI.icon('link', 14) + e(p.website) + '</a>' : '') +
      (p.email ? '<span class="pm">' + UI.icon('message-circle', 14) + e(p.email) + '</span>' : '') +
      '<span class="pm">' + UI.icon('calendar', 14) + e(t('joined')) + ' ' + e(UI.formatDate(p.joined)) + '</span>' +
      '</div></div>' +
      (SERVER_PROFILE && SERVER_PROFILE.roleKey === 'student'
        ? '<div class="referral-summary" aria-label="إحصائيات الإحالة">' +
          '<div class="referral-stat referral-stat-points">' +
          '<span class="referral-stat-icon referral-stat-star" aria-hidden="true">⭐</span>' +
          '<span class="referral-stat-copy"><span class="referral-stat-label">إجمالي نقاط الإحالة</span><b>' + (SERVER_PROFILE.referral_points || 0) + '</b></span>' +
          '</div>' +
          '<div class="referral-stat referral-stat-visits">' +
          '<span class="referral-stat-icon">' + UI.icon('globe', 21) + '</span>' +
          '<span class="referral-stat-copy"><span class="referral-stat-label">زيارات روابطك</span><b>' + (SERVER_PROFILE.referral_visits || 0) + '</b></span>' +
          '</div></div>'
        : '');
  }

  function renderProfileTabs() {
    var host = document.getElementById('profileTabs');
    if (!host) return;
    var tabs = [
      {
        id: 'certificates',
        count: IS_TRAINER ? (Store.myCourses() || []).length : certStatCount(),
        label: IS_TRAINER ? 'statTrainerCourses' : 'statCertificates',
        icon: IS_TRAINER ? 'graduation-cap' : 'award'
      },
      { id: 'projects', count: Store.totals().projects, label: 'statProjects', icon: 'folder' }
    ];
    if (SERVER_PROFILE) {
      tabs.push({
        id: 'saved',
        count: Store.collection('savedProjects').length,
        label: 'savedProjects',
        icon: 'bookmark'
      });
    }

    host.innerHTML = tabs.map(function (tab) {
      var selected = activeTab === tab.id;
      return '<button class="profile-tab' + (selected ? ' is-active' : '') + '" type="button" role="tab" ' +
        'data-act="tab" data-tab="' + tab.id + '" aria-selected="' + selected + '" ' +
        'aria-controls="panel-' + tab.id + '">' +
        UI.icon(tab.icon, 18) +
        '<span class="profile-tab-label">' + e(t(tab.label)) + '</span>' +
        '<span class="profile-tab-count">' + tab.count + '</span>' +
        '</button>';
    }).join('');
  }

  function renderSkills() {
    var skills = Store.collection('skills');
    var host = document.getElementById('skillsCard');
    var shown = skillsExpanded ? skills : skills.slice(0, 4);
    host.innerHTML =
      '<div class="card-head">' +
      '<h2>' + UI.icon('zap', 17) + e(t('skills')) + '</h2>' +
      '<span class="spacer"></span>' +
      (skills.length > 4 ? '<button class="link-btn" data-act="toggle-skills">' + e(skillsExpanded ? t('showLess') : t('showAll')) + UI.icon('chevron-down', 14) + '</button>' : '') +
      '</div>' +
      (skills.length ? '<div class="skills-grid ' + (skillsExpanded ? 'is-expanded' : 'is-collapsed') + '">' + shown.map(function (s) {
        return '<div class="skill-item' + (skillsExpanded ? '' : ' skill-tag') + '">' +
          (skillsExpanded
            ? '<div class="skill-top"><span class="sk-name">' + e(s.name) + '</span><span class="sk-pct">' + (s.level || 0) + '%</span></div>' +
              '<div class="skill-bar"><i style="width:' + (s.level || 0) + '%"></i></div>'
            : '<span class="sk-name">' + e(s.name) + '</span>') +
          '</div>';
      }).join('') + '</div>' : '<p class="tiny muted">' + e(t('skillsEmpty')) + '</p>');
  }

  function syncProfileTabs() {
    document.querySelectorAll('#profileTabs [data-tab]').forEach(function (el) {
      var on = el.getAttribute('data-tab') === activeTab;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', on);
    });
  }

  function matches(item) {
    if (!searchQuery) return true;
    var el = document.createElement('div');
    if (item.content) el.innerHTML = item.content;
    var hay = [item.title, item.issuer, item.summary, item.category, (item.tags || []).join(' '), item.content ? el.textContent : ''].join(' ').toLowerCase();
    return hay.indexOf(searchQuery.toLowerCase()) >= 0;
  }

  function filterItems(kind) {
    var list;
    if (kind === 'certificates') list = Store.certificatesWithEarned().filter(function (x) { return matches(x); });
    else if (kind === 'projects') list = Store.collection('projects').filter(function (x) { return matches(x); });
    else if (kind === 'savedProjects') list = Store.collection('savedProjects').filter(function (x) { return matches(x); });
    else list = Store.collection('posts').filter(function (x) { return matches(x); });
    return list;
  }

  function renderPanels() {
    if (IS_TRAINER) {
      var myCourses = (Store.myCourses() || []).filter(matches);
      document.getElementById('panel-certificates').innerHTML = myCourses.length
        ? '<div class="card-grid profile-course-grid">' + myCourses.map(function (c) { return certCard(c, { course: true }); }).join('') + '</div>'
        : UI.emptyState('graduation-cap', searchQuery ? t('emptySearch') : t('trainerCoursesEmpty'), searchQuery ? '' : t('trainerCoursesEmptySub'),
          searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('courseCreate') + '">' + UI.icon('plus', 16) + e(t('addCourse')) + '</a>');

      renderOtherPanels();

      document.querySelectorAll('.panel').forEach(function (el) {
        el.classList.toggle('active', el.id === 'panel-' + activeTab);
      });
      syncProfileTabs();
      return;
    }

    /* الطالب: يعرض شهاداته المكتسبة فقط (المدرب يعرض دوراته) */
    var mine = earnedCerts();
    var certs = mine ? mine.filter(matches) : filterItems('certificates');
    var profileReturn = location.pathname + location.search + location.hash;

    document.getElementById('panel-certificates').innerHTML = certs.length
      ? '<div class="card-grid profile-certificate-grid">' + certs.map(function (cert) {
          if (cert.workshop) return workshopCertificateCard(cert);
          return cert.manual
            ? certCard(cert, { manualImage: true })
            : certCard(cert, { returnTo: profileReturn, imageOnly: true });
        }).join('') + '</div>'
      : (mine
        ? UI.emptyState('award', searchQuery ? t('emptySearch') : t('myCertsEmpty'), searchQuery ? '' : t('myCertsEmptySub'),
          searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('courses') + '">' + UI.icon('play', 16) + e(t('myCertsCta')) + '</a>')
        : UI.emptyState('award', searchQuery ? t('emptySearch') : t('certEmpty'), searchQuery ? '' : t('certEmptySub'),
          searchQuery ? '' : '<button class="btn btn-primary" data-act="new-cert">' + UI.icon('plus', 16) + e(t('addCert')) + '</button>'));

    renderOtherPanels();

    document.querySelectorAll('.panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + activeTab);
    });
    syncProfileTabs();
  }

  function workshopCertificateCard(certificate) {
    var isEnglish = I18n.getLang() === 'en';
    return '<article class="workshop-certificate-card" aria-label="' +
      e(isEnglish ? 'Workshop attendance certificate' : 'شهادة حضور ورشة') + '">' +
      '<div class="workshop-certificate-mark">' + UI.icon('award', 25) + '</div>' +
      '<div class="workshop-certificate-label">' +
      e(isEnglish ? 'In-person workshop attendance certificate' : 'شهادة حضور ورشة وجاهية') + '</div>' +
      '<h3>' + e(certificate.title) + '</h3>' +
      '<p>' + e(certificate.studentName) + '</p>' +
      '<div class="workshop-certificate-meta"><span>' +
      e(isEnglish ? 'Date' : 'التاريخ') + ': ' + e(UI.formatDate(certificate.date)) + '</span><span>' +
      e(isEnglish ? 'Duration' : 'المدة') + ': ' + e(certificate.duration) + ' ' +
      e(isEnglish ? 'minutes' : 'دقيقة') + '</span></div>' +
      '<small dir="ltr">' + e(certificate.code) + '</small></article>';
  }

  /* Project and saved-project panels on the personal portfolio. */
  function renderOtherPanels() {
    var projs = filterItems('projects');
    var savedProjects = filterItems('savedProjects');

    document.getElementById('panel-projects').innerHTML = projs.length
      ? '<div class="card-grid profile-project-grid">' + projs.map(function (p) { return projCard(p); }).join('') + '</div>'
      : UI.emptyState('folder', searchQuery ? t('emptySearch') : t('projEmpty'), searchQuery ? '' : t('projEmptySub'),
        searchQuery ? '' : '<a class="btn btn-primary" href="' + SITE.u('projectCreate') + '">' + UI.icon('plus', 16) + e(t('addProject')) + '</a>');

    var savedHost = document.getElementById('panel-saved');
    if (savedHost) {
      savedHost.innerHTML = savedProjects.length
        ? '<div class="card-grid profile-project-grid profile-saved-grid">' + savedProjects.map(function (p) { return projCard(p, { viewOnly: true }); }).join('') + '</div>'
        : UI.emptyState('bookmark', searchQuery ? t('emptySearch') : t('savedProjectsEmpty'), searchQuery ? '' : t('savedProjectsEmptySub'), '');
    }
  }

  function setTab(id) {
    activeTab = id;
    document.querySelectorAll('.panel').forEach(function (el) {
      el.classList.toggle('active', el.id === 'panel-' + id);
    });
    syncProfileTabs();
    try { history.replaceState(null, '', '#' + id); } catch (err) { }
  }

  function renderHome() {
    mountChrome({ search: true });
    renderProfile();
    renderSkills();
    renderProfileTabs();
    renderPanels();
    initFab();
  }

  /* ---------- FAB ---------- */

  function initFab() {
    var fab = document.getElementById('fab');
    var menu = document.getElementById('fabMenu');
    if (!fab) return;
    fab.innerHTML = UI.icon('plus', 24);
    menu.innerHTML =
      '<button class="fab-item" data-act="goto" data-url="' + SITE.u('projectCreate') + '">' + UI.icon('folder', 17) + e(t('createProjectCta')) + '</button>' +
      (IS_TRAINER
        ? '<button class="fab-item" data-act="goto" data-url="' + SITE.u('courseCreate') + '">' + UI.icon('graduation-cap', 17) + e(t('createCourseCta')) + '</button>'
        : '<button class="fab-item" data-act="new-cert">' + UI.icon('award', 17) + e(t('createCertCta')) + '</button>') +
      (SERVER_PROFILE && SERVER_PROFILE.canScanWorkshops && window.WorkshopScanner
        ? WorkshopScanner.menuItemHTML() + WorkshopScanner.panelHTML()
        : '');
    if (fab.dataset.bound) return;
    fab.dataset.bound = '1';
    fab.addEventListener('click', function (ev) {
      ev.stopPropagation();
      fab.classList.toggle('open');
      menu.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      fab.classList.remove('open');
      menu.classList.remove('open');
    });
  }

  /* ---------- interactions ---------- */

  function closeMenus() {
    document.querySelectorAll('.post-menu.open, .share-menu.open').forEach(function (m) { m.classList.remove('open'); });
  }

  /* ---------- comments bottom sheet ---------- */

  var sheetState = null;

  function closeCommentsSheet() {
    if (!sheetState) return;
    var wrap = sheetState.wrap;
    sheetState = null;
    wrap.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { wrap.remove(); }, 280);
  }

  function renderSheetContent() {
    if (!sheetState) return;
    var post = Store.find('posts', sheetState.postId);
    if (!post) { closeCommentsSheet(); return; }
    var n = (post.comments || []).length;
    sheetState.wrap.querySelector('.sheet-title').textContent = t('commentsTitle') + ' (' + n + ')';
    sheetState.wrap.querySelector('.sheet-body').innerHTML = commentsSectionHTML(post, true, {
      noInput: true,
      readOnly: Store.usingServerPosts
    });
    sheetState.wrap.querySelector('.sheet-foot').innerHTML = Store.usingServerPosts ? '' :
      '<div class="comment-input-row" data-post="' + e(post.id) + '">' +
      UI.avatarOf(Store.state.profile, 32) +
      '<input class="input" placeholder="' + e(t('commentPlaceholder')) + '" data-comment-input>' +
      '<button class="ci-send" data-act="send-comment">' + e(t('post')) + '</button>' +
      '</div>';
  }

  function refreshSheet(postId) {
    if (sheetState && sheetState.postId === postId) renderSheetContent();
  }

  function openCommentsSheet(postId) {
    var post = Store.find('posts', postId);
    if (!post) return;
    if (sheetState && sheetState.postId === postId) return;
    closeCommentsSheet();
    var wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML =
      '<div class="sheet-backdrop"></div>' +
      '<div class="sheet">' +
      '<div class="sheet-grab"><i></i></div>' +
      '<div class="sheet-head">' +
      '<button class="btn-icon sheet-x" data-act="close-sheet" title="' + e(t('cancel')) + '">' + UI.icon('close', 19) + '</button>' +
      '<div class="sheet-title"></div>' +
      '</div>' +
      '<div class="sheet-body"></div>' +
      '<div class="sheet-foot"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    sheetState = { wrap: wrap, postId: postId };
    renderSheetContent();
    requestAnimationFrame(function () { wrap.classList.add('open'); });
    document.body.classList.add('no-scroll');

    wrap.querySelector('.sheet-backdrop').addEventListener('click', closeCommentsSheet);
    wrap.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeCommentsSheet(); });

    var sheet = wrap.querySelector('.sheet');
    var grab = wrap.querySelector('.sheet-grab');
    var head = wrap.querySelector('.sheet-head');
    var startY = null, dy = 0;
    function dragDown(y) { startY = y; dy = 0; sheet.classList.add('dragging'); }
    function dragMove(y) {
      if (startY == null) return;
      dy = Math.max(0, y - startY);
      sheet.style.transform = 'translate(-50%, ' + dy + 'px)';
    }
    function dragUp() {
      if (startY == null) return;
      startY = null;
      sheet.classList.remove('dragging');
      sheet.style.transform = '';
      if (dy > 90) closeCommentsSheet();
    }
    [grab, head].forEach(function (el) {
      el.addEventListener('touchstart', function (ev) { dragDown(ev.touches[0].clientY); }, { passive: true });
      el.addEventListener('mousedown', function (ev) { ev.preventDefault(); dragDown(ev.clientY); });
    });
    document.addEventListener('touchmove', function (ev) { if (startY != null) dragMove(ev.touches[0].clientY); }, { passive: true });
    document.addEventListener('touchend', dragUp);
    document.addEventListener('mousemove', function (ev) { if (startY != null) dragMove(ev.clientY); });
    document.addEventListener('mouseup', dragUp);
  }

  function updatePostDOM(postId) {
    var post = Store.find('posts', postId);
    if (!post) return;
    document.querySelectorAll('[data-post="' + postId + '"]').forEach(function (card) {
      if (card.classList.contains('post')) {
        var oldTrack = card.querySelector('.mc-track');
        var keepLeft = oldTrack ? oldTrack.scrollLeft : 0;
        var tmp = document.createElement('div');
        tmp.innerHTML = postCard(post, { full: card.closest('#detailHost') != null });
        var fresh = tmp.firstChild;
        card.replaceWith(fresh);
        var newTrack = fresh.querySelector('.mc-track');
        if (newTrack && keepLeft) newTrack.scrollLeft = keepLeft;
        initCaptions(fresh);
      }
    });
    refreshSheet(postId);
  }

  function updateCommentLike(postId, commentId) {
    var post = Store.find('posts', postId);
    if (!post) return;
    function walk(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === commentId) {
          list[i].liked = !list[i].liked;
          list[i].likes = (list[i].likes || 0) + (list[i].liked ? 1 : -1);
          return true;
        }
        if (walk(list[i].replies || [])) return true;
      }
      return false;
    }
    walk(post.comments || []);
    Store.save(true);
  }

  function findComment(postId, commentId) {
    var post = Store.find('posts', postId);
    if (!post) return null;
    function walk(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === commentId) return list[i];
        var f = walk(list[i].replies || []);
        if (f) return f;
      }
      return null;
    }
    return walk(post.comments || []);
  }

  document.addEventListener('click', function (ev) {
    var target = ev.target;

    var smartBackEl = target.closest('[data-smart-back]');
    if (smartBackEl) {
      var canReturnToHistoryEntry = false;
      try {
        var returnPath = new URLSearchParams(location.search).get('return');
        if (returnPath && document.referrer && history.length > 1) {
          var returnUrl = new URL(returnPath, location.origin);
          var referrerUrl = new URL(document.referrer);
          canReturnToHistoryEntry = returnUrl.origin === location.origin &&
            referrerUrl.origin === location.origin &&
            returnUrl.pathname === referrerUrl.pathname &&
            returnUrl.search === referrerUrl.search;
        }
      } catch (err) { }
      if (canReturnToHistoryEntry) {
        ev.preventDefault();
        history.back();
        return;
      }
    }

    var gotoEl = target.closest('[data-goto]');
    var actEl = target.closest('[data-act]');
    var act = actEl && actEl.getAttribute('data-act');

    if (!target.closest('.post-menu') && !target.closest('[data-act="menu"]') &&
      !target.closest('.share-menu') && !target.closest('[data-act="share-menu"]') &&
      !target.closest('[data-act="share-to"]')) closeMenus();

    if (actEl && (act === 'goto' || act === 'menu' || act === 'like-post' || act === 'save-post' ||
      act === 'like-comment' || act === 'reply' || act === 'send-reply' || act === 'send-comment' ||
      act === 'focus-comment' || act === 'like-stats' || act === 'share' || act === 'del-post' ||
      act === 'del-cert' || act === 'edit-cert' || act === 'del-project' || act === 'tab' ||
      act === 'toggle-skills' || act === 'edit-profile' || act === 'share-profile' ||
      act === 'new-cert' || act === 'search-tag' || act === 'copy-id' || act === 'lightbox' ||
      act === 'print-cert' ||
      act === 'del-file' || act === 'like-post-detail' || act === 'save-post-detail' ||
      act === 'share-menu' || act === 'share-to' || act === 'close-sheet')) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    if (!actEl) {
      if (gotoEl) { location.href = gotoEl.getAttribute('data-goto'); return; }
      var arrowBtn = target.closest('[data-mc]');
      if (arrowBtn) {
        var mcMedia = arrowBtn.closest('.post-media');
        var mcTrack = mcMedia && mcMedia.querySelector('.mc-track');
        if (mcTrack) {
          var mcDir = +arrowBtn.getAttribute('data-mc');
          var mcRtl = document.documentElement.dir === 'rtl';
          mcTrack.scrollBy({ left: mcDir * mcTrack.clientWidth * (mcRtl ? -1 : 1), behavior: 'smooth' });
        }
        return;
      }
      var galItem = target.closest('.gal-item');
      var img = galItem ? galItem.querySelector('img') : target.closest('.gallery-grid img, .detail-hero img');
      if (img) {
        if (Date.now() - lastGalleryDrag < 320) return;
        var cardScope = img.closest('.post');
        var list, idx;
        if (cardScope) {
          var p = Store.find('posts', cardScope.getAttribute('data-post'));
          var imgs = postMedia(p || {}).filter(function (m) { return m.type === 'image'; });
          list = imgs.map(function (m) { return m.src; });
          idx = list.indexOf(img.src);
        } else {
          var scope = img.closest('.detail-hero, .gallery-grid, .gallery-row') || document;
          list = Array.prototype.map.call(scope.querySelectorAll('.gallery-grid img, .detail-cover, .detail-hero img, .gallery-row img'), function (x) { return x.src; });
          idx = list.indexOf(img.src);
        }
        UI.lightbox.open(list, idx < 0 ? 0 : idx);
        return;
      }
      return;
    }

    switch (act) {
      case 'goto':
        location.href = actEl.getAttribute('data-url');
        break;

      case 'enroll-course': {
        confirmCourseRegistration(actEl.getAttribute('data-title') || '');
        break;
      }

      case 'redeem-course-points': {
        UI.confirm('هل تريد استبدال 100 نقطة والحصول على اشتراك مجاني في هذه الدورة؟').then(function (ok) {
          if (!ok) return;
          fetch(actEl.getAttribute('data-url'), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-CSRFToken': csrfToken(), 'X-Requested-With': 'XMLHttpRequest' }
          }).then(function (response) {
            return response.json().then(function (data) {
              return { ok: response.ok, data: data };
            });
          }).then(function (result) {
            if (!result.ok || !result.data.ok) {
              UI.toast(result.data.error || t('required'), 'error');
              return;
            }
            UI.toast('تم استبدال النقاط وتفعيل اشتراكك في الدورة.', 'success');
            location.reload();
          }).catch(function () {
            UI.toast(t('required'), 'error');
          });
        });
        break;
      }

      case 'tab':
        setTab(actEl.getAttribute('data-tab'));
        break;

      case 'toggle-skills':
        skillsExpanded = !skillsExpanded;
        renderSkills();
        break;

      case 'edit-profile':
        openProfileModal();
        break;

      case 'share-profile': {
        var sp = Store.state.profile || {};
        var shareUrl = sp.handle
          ? location.origin + SITE.u('profile', sp.handle)
          : location.origin + location.pathname;
        UI.shareLink(shareUrl, t('copiedLink'));
        break;
      }

      case 'new-cert':
        openCertModal(null);
        break;

      case 'edit-cert':
        openCertModal(actEl.getAttribute('data-id'));
        break;

      case 'del-cert':
        UI.confirm(t('deleteConfirm')).then(function (ok) {
          if (!ok) return;
          var certId = actEl.getAttribute('data-id');
          if (Store.usingServerCourses) {
            fetch(SITE.u('courseDelete'), {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
              body: JSON.stringify({ id: certId })
            }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); }).then(function (res) {
              if (!res || !res.ok) { UI.toast(t((res && res.error) || 'required'), 'error'); return; }
              if (page === 'home') renderHome(); else location.href = SITE.u('courses');
              UI.toast(t('delete'), 'success');
            }).catch(function () { UI.toast(t('required'), 'error'); });
            return;
          }
          Store.remove('certificates', certId);
          if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
          UI.toast(t('delete'), 'success');
        });
        break;

      case 'del-project':
        var delId = actEl.getAttribute('data-id');
        UI.confirm(t('deleteConfirm')).then(function (ok) {
          if (!ok) return;
          if (Store.usingServerProjects) {
            fetch(SITE.u('projectDelete'), {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
              body: JSON.stringify({ id: delId })
            }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); }).then(function (res) {
              if (!res || !res.ok) { UI.toast(t((res && res.error) || 'required'), 'error'); return; }
              if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
              UI.toast(t('delete'), 'success');
            }).catch(function () { UI.toast(t('required'), 'error'); });
            return;
          }
          Store.remove('projects', delId);
          if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
          UI.toast(t('delete'), 'success');
        });
        break;

      case 'del-post':
        var delPostId = actEl.getAttribute('data-id');
        UI.confirm(t('deleteConfirm')).then(function (ok) {
          if (!ok) return;
          Store.remove('posts', delPostId);
          closeCommentsSheet();
          if (page === 'home') renderHome(); else location.href = SITE.u('portfolio');
          UI.toast(t('delete'), 'success');
        });
        break;

      case 'menu':
        var menu = actEl.parentElement.querySelector('.post-menu');
        var wasOpen = menu.classList.contains('open');
        closeMenus();
        if (!wasOpen) menu.classList.add('open');
        break;

      case 'like-post':
      case 'like-post-detail': {
        var card = actEl.closest('[data-post]');
        var pid = card.getAttribute('data-post');
        var post = Store.find('posts', pid);
        if (!post) break;
        post.liked = !post.liked;
        post.likes = Math.max(0, (post.likes || 0) + (post.liked ? 1 : -1));
        Store.save(true);
        actEl.classList.add('pop');
        updatePostDOM(pid);
        break;
      }

      case 'save-post':
      case 'save-post-detail': {
        var card2 = actEl.closest('[data-post]');
        var pid2 = card2.getAttribute('data-post');
        var post2 = Store.find('posts', pid2);
        if (!post2) break;
        post2.saved = !post2.saved;
        post2.saves = Math.max(0, (post2.saves || 0) + (post2.saved ? 1 : -1));
        Store.save(true);
        UI.toast(post2.saved ? t('saved') : t('save'), 'success');
        updatePostDOM(pid2);
        break;
      }

      case 'share': {
        var url = actEl.getAttribute('data-url');
        UI.shareLink(new URL(url, location.origin).href);
        break;
      }

      case 'share-menu': {
        var smWrap = actEl.closest('.share-wrap');
        var smMenu = smWrap && smWrap.querySelector('.share-menu');
        if (!smMenu) break;
        var smWas = smMenu.classList.contains('open');
        closeMenus();
        if (!smWas) smMenu.classList.add('open');
        break;
      }

      case 'share-to': {
        var net = actEl.getAttribute('data-net');
        var shCard = actEl.closest('[data-post]');
        var shPid = shCard && shCard.getAttribute('data-post');
        var shPost = shPid && Store.find('posts', shPid);
        var shUrl = location.href;
        var shEnc = encodeURIComponent(shUrl);
        if (net === 'instagram') {
          UI.shareLink(shUrl, t('copied'));
        } else if (net === 'whatsapp') {
          window.open('https://wa.me/?text=' + shEnc, '_blank', 'noopener');
        } else if (net === 'facebook') {
          window.open('https://www.facebook.com/sharer/sharer.php?u=' + shEnc, '_blank', 'noopener');
        } else if (net === 'x') {
          window.open('https://twitter.com/intent/tweet?url=' + shEnc, '_blank', 'noopener');
        } else if (net === 'threads') {
          window.open('https://www.threads.net/intent/post?text=' + shEnc, '_blank', 'noopener');
        }
        if (shPost) {
          shPost.shares = (shPost.shares || 0) + 1;
          Store.save(true);
          updatePostDOM(shPid);
        }
        closeMenus();
        break;
      }

      case 'close-sheet':
        closeCommentsSheet();
        break;

      case 'focus-comment': {
        var fcCard = actEl.closest('[data-post]');
        if (!fcCard) break;
        if (!actEl.closest('#detailHost')) {
          openCommentsSheet(fcCard.getAttribute('data-post'));
          break;
        }
        var c = fcCard.querySelector('[data-comment-input]');
        if (c) { c.focus(); c.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        break;
      }

      case 'like-stats': {
        var card3 = actEl.closest('[data-post]');
        var p3 = Store.find('posts', card3.getAttribute('data-post'));
        if (p3 && (p3.comments || []).length) card3.querySelector('.post-comments').scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }

      case 'like-comment': {
        var cEl = actEl.closest('[data-comment]');
        updateCommentLike(cEl.getAttribute('data-post'), cEl.getAttribute('data-comment'));
        actEl.classList.toggle('liked');
        var cobj = findComment(cEl.getAttribute('data-post'), cEl.getAttribute('data-comment'));
        if (cobj && cobj.liked) actEl.classList.add('pop');
        break;
      }

      case 'reply': {
        var box = actEl.closest('.comment-main').querySelector('.reply-box');
        box.classList.toggle('hide');
        if (!box.classList.contains('hide')) box.querySelector('input').focus();
        break;
      }

      case 'send-reply': {
        var box2 = actEl.closest('.reply-box');
        sendReply(box2);
        break;
      }

      case 'send-comment': {
        var row = actEl.closest('.comment-input-row');
        sendComment(row);
        break;
      }

      case 'search-tag': {
        searchQuery = actEl.getAttribute('data-tag');
        if (page !== 'home') { location.href = SITE.u('portfolio'); break; }
        var si = document.getElementById('globalSearch');
        if (si) si.value = searchQuery;
        renderProfile();
    renderSkills();
    renderPanels();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }

      case 'copy-id': {
        UI.shareLink(actEl.getAttribute('data-value'));
        break;
      }

      case 'print-cert': {
        var sheet = document.querySelector('.cert-sheet');
        var manualImage = document.querySelector('.manual-certificate-detail-image');
        if ((!sheet && !manualImage) || !window.print) break;
        var wrap = document.createElement('div');
        wrap.id = 'certPrintRoot';
        if (sheet) {
          wrap.appendChild(sheet.cloneNode(true));
        } else {
          var printCard = document.createElement('div');
          printCard.className = 'manual-certificate-print';
          var title = document.querySelector('.cd-title');
          printCard.innerHTML = (title ? '<h1>' + e(title.textContent) + '</h1>' : '') +
            '<img src="' + e(manualImage.src) + '" alt="' + e(manualImage.alt) + '">';
          wrap.appendChild(printCard);
        }
        document.body.appendChild(wrap);
        document.body.classList.add('printing-cert');
        var cleanup = function () {
          document.body.classList.remove('printing-cert');
          wrap.remove();
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
        setTimeout(cleanup, 1500);
        break;
      }
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    if (ev.target.matches('[data-comment-input]')) {
      ev.preventDefault();
      sendComment(ev.target.closest('.comment-input-row'));
    } else if (ev.target.matches('[data-reply-input]')) {
      ev.preventDefault();
      sendReply(ev.target.closest('.reply-box'));
    }
  });

  document.addEventListener('scroll', function (ev) {
    var track = ev.target;
    if (!track || !track.classList || !track.classList.contains('mc-track')) return;
    var media = track.closest('.post-media');
    if (!media) return;
    var slides = track.children;
    if (!slides.length) return;
    var w = slides[0].offsetWidth || 1;
    var idx = Math.min(slides.length - 1, Math.round(Math.abs(track.scrollLeft) / w));
    var dots = media.querySelectorAll('.mc-dots i');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === idx);
  }, true);

  document.addEventListener('dblclick', function (ev) {
    var mediaEl = ev.target.closest('.post-media');
    if (!mediaEl || ev.target.closest('video') || ev.target.closest('button')) return;
    var card = mediaEl.closest('.post');
    if (!card) return;
    var post = Store.find('posts', card.getAttribute('data-post'));
    var btn = card.querySelector('[data-act="like-post"]');
    if (!post || post.liked || !btn) return;
    btn.click();
    var burst = document.createElement('div');
    burst.className = 'ig-burst';
    burst.innerHTML = UI.iconFilled('heart', 84);
    mediaEl.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 900);
  });

  function sendComment(row) {
    if (!row) return;
    var input = row.querySelector('[data-comment-input]');
    var text = input.value.trim();
    if (!text) return;
    var pid = row.closest('[data-post]').getAttribute('data-post');
    var post = Store.find('posts', pid);
    if (!post) return;
    var prof = Store.state.profile;
    post.comments = post.comments || [];
    post.comments.push({
      id: Store.uid('c'), author: prof.name, handle: prof.handle, avatar: prof.avatar,
      text: text, createdAt: new Date().toISOString(), likes: 0, liked: false, replies: []
    });
    Store.save(true);
    input.value = '';
    updatePostDOM(pid);
    refreshSheet(pid);
    UI.toast(t('newComment'), 'success');
  }

  function sendReply(box) {
    var input = box.querySelector('[data-reply-input]');
    var text = input.value.trim();
    if (!text) return;
    var cEl = box.closest('[data-comment]');
    var pid = cEl.getAttribute('data-post');
    var cid = cEl.getAttribute('data-comment');
    var parent = findComment(pid, cid);
    if (!parent) return;
    var prof = Store.state.profile;
    parent.replies = parent.replies || [];
    parent.replies.push({
      id: Store.uid('r'), author: prof.name, handle: prof.handle, avatar: prof.avatar,
      text: text, createdAt: new Date().toISOString(), likes: 0, liked: false, replies: []
    });
    Store.save(true);
    input.value = '';
    updatePostDOM(pid);
    refreshSheet(pid);
  }

  /* ---------- carousel / gallery row: mouse drag (touch uses native scroll) ---------- */
  (function () {
    var SEL = '.mc-track, .gallery-row';
    var drag = null;
    var touch = null;

    var rtlModelCache = 0;
    function rtlScrollModel(el) {
      if (rtlModelCache) return rtlModelCache;
      var prev = el.scrollLeft;
      var prevSnap = el.style.scrollSnapType;
      el.style.scrollSnapType = 'none';
      el.scrollLeft = -1;
      rtlModelCache = el.scrollLeft < 0 ? -1 : 1;
      el.scrollLeft = prev;
      el.style.scrollSnapType = prevSnap;
      return rtlModelCache;
    }
    function dragMult(track) {
      return 1;
    }
    function snapSign(track) {
      return -1;
    }

    document.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0) return;
      var track = ev.target.closest(SEL);
      if (!track) return;
      if (ev.target.closest('video') || ev.target.closest('.lb-img')) return;
      var btn = ev.target.closest('button');
      if (btn && !btn.classList.contains('gal-item')) return;
      ev.preventDefault();
      drag = { track: track, x: ev.clientX, left: track.scrollLeft, moved: false, mult: dragMult(track) };
      track.style.scrollSnapType = 'none';
      track.classList.add('dragging');
    });

    document.addEventListener('mousemove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x;
      if (Math.abs(dx) > 4) drag.moved = true;
      drag.track.scrollLeft = drag.left + drag.mult * dx;
    });

    document.addEventListener('mouseup', function () {
      if (!drag) return;
      finish(drag);
      drag = null;
    });

    function finish(d) {
      var track = d.track;
      track.style.scrollSnapType = '';
      track.classList.remove('dragging');
      if (d.moved && track.classList.contains('mc-track') && track.children.length) {
        var w = track.children[0].offsetWidth || 1;
        var idx = Math.round(Math.abs(track.scrollLeft) / w);
        track.scrollTo({ left: snapSign(track) * idx * w, behavior: 'smooth' });
      }
      if (d.moved) lastGalleryDrag = Date.now();
    }

    document.addEventListener('touchstart', function (ev) {
      if (ev.touches.length !== 1) return;
      var track = ev.target.closest(SEL);
      if (!track) return;
      if (ev.target.closest('video') || ev.target.closest('.lb-img')) return;
      var btn = ev.target.closest('button');
      if (btn && !btn.classList.contains('gal-item')) return;
      touch = { x: ev.touches[0].clientX, moved: false };
    }, { passive: true });

    document.addEventListener('touchmove', function (ev) {
      if (!touch || ev.touches.length !== 1) return;
      if (Math.abs(ev.touches[0].clientX - touch.x) > 6) touch.moved = true;
    }, { passive: true });

    document.addEventListener('touchend', function () {
      if (!touch) return;
      if (touch.moved) lastGalleryDrag = Date.now();
      touch = null;
    });
  })();
  /* ---------- profile modal ---------- */

  function csrfToken() {
    if (window.CSRF_TOKEN) return window.CSRF_TOKEN;
    var m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = parts[0].match(/data:([^;]+)/)[1];
    var binary = atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function submitProfileUpdate(payload, onOk, onFail) {
    var url = SITE.u('profileUpdate');
    if (!url || url === '/') { onFail('no-endpoint'); return; }
    var fd = new FormData();
    fd.append('full_name', payload.name || '');
    fd.append('handle', (payload.handle || '').replace(/^@/, ''));
    fd.append('headline', payload.title || '');
    fd.append('bio', payload.bio || '');
    fd.append('website', payload.website || '');
    fd.append('email', payload.email || '');
    if (payload.github) fd.append('github', payload.github);
    fd.append('skills', JSON.stringify(payload.skills || []));
    if (payload.avatarData && payload.avatarData.indexOf('data:image') === 0) {
      fd.append('avatar_data', payload.avatarData);
    }
    fetch(url, {
      method: 'POST',
      headers: { 'X-CSRFToken': csrfToken(), 'X-Requested-With': 'XMLHttpRequest' },
      body: fd,
      credentials: 'same-origin'
    }).then(function (res) {
      if (res.redirected && /\/login\//.test(res.url)) { onFail('login'); return null; }
      return res.json().catch(function () { return { ok: false, error: 'server' }; });
    }).then(function (data) {
      if (!data) return;
      if (data.ok) onOk(data); else onFail(data.error || 'server');
    }).catch(function () { onFail('network'); });
  }

  function openProfileModal() {
    var p = Object.assign({}, Store.state.profile);
    var skills = Store.collection('skills').map(function (s) { return Object.assign({}, s); });
    var avatarDraft = p.avatar || '';

    var bioInitial = (p.bio || '').slice(0, 150);
    var titleInitial = (p.title || '').slice(0, 35);

    var body =
      '<div class="pe-avatar-row">' +
      '<div class="pe-avatar-big"><img id="peAvatar" src="' + e(avatarDraft || UI.initialsAvatar(p.name, 200)) + '" alt="">' +
      '<button class="btn-icon" id="peAvatarBtn" title="' + e(t('fieldAvatar')) + '">' + UI.icon('camera', 13) + '</button>' +
      '<input type="file" id="peAvatarFile" accept="image/*" class="hide"></div>' +
      '<div><div class="strong">' + e(t('fieldAvatar')) + '</div><div class="hint">' + e(t('avatarHint')) + '</div></div>' +
      '</div>' +
      '<div class="field"><label class="label">' + e(t('fieldName')) + '</label><input class="input" id="peName" value="' + e(p.name) + '">' +
      '<p class="hint" id="peNameHint"></p></div>' +
      '<div class="field"><label class="label">' + e(t('fieldTitle')) + '</label><input class="input" id="peTitle" maxlength="35" value="' + e(titleInitial) + '"></div>' +
      '<div class="field"><label class="label">' + e(t('fieldEmail')) + ' <span class="opt">(' + e(t('optional')) + ')</span></label><input class="input" id="peEmail" type="email" dir="ltr" placeholder="name@example.com" value="' + e(p.email || '') + '">' +
      '<p class="hint" id="peEmailHint"></p></div>' +
      '<div class="field"><label class="label">' + e(t('fieldBio')) + '</label>' +
      '<textarea class="textarea" id="peBio" rows="3" maxlength="150">' + e(bioInitial) + '</textarea>' +
      '<p class="hint" id="peBioCount"></p></div>' +
      '<div class="field">' +
      '<label class="label">' + e(t('fieldWebsite')) + ' <span class="opt">(' + e(t('optional')) + ')</span></label><input class="input" id="peWebsite" type="url" dir="ltr" placeholder="https://example.com" value="' + e(p.website || '') + '">' +
      '<p class="hint" id="peWebsiteHint"></p></div>' +
      '<hr class="divider">' +
      '<div class="row gap-8" style="margin-bottom:10px"><h3 class="strong" style="font-size:14px;display:flex;gap:7px;align-items:center">' + UI.icon('zap', 15) + e(t('manageSkills')) + '</h3><span class="spacer"></span><span class="hint">' + e(t('skillsMaxHint')) + '</span></div>' +
      '<div id="peSkills"></div>' +
      '<button class="btn btn-ghost btn-sm" id="peAddSkill">' + UI.icon('plus', 14) + e(t('addSkill')) + '</button>' +
      '<p class="hint error" id="peSkillAlert" style="display:none"></p>';

    var m = UI.modal({
      title: t('editProfileTitle'),
      size: 'md',
      body: body,
      footer: '<button class="btn btn-ghost" id="peCancel">' + e(t('cancel')) + '</button>' +
        '<button class="btn btn-primary" id="peSave">' + UI.icon('check', 15) + e(t('saveChanges')) + '</button>'
    });

    var MAX_SKILLS = 8;

    function renderSkillsEdit() {
      var host = m.body.querySelector('#peSkills');
      host.innerHTML = skills.length ? skills.map(function (s, i) {
        return '<div class="skill-edit-row" data-i="' + i + '">' +
          '<input class="input" data-sk-name value="' + e(s.name) + '">' +
          '<div class="row gap-8"><input type="range" class="range" min="10" max="100" step="5" data-sk-level value="' + (s.level || 50) + '"><span class="pct-badge" data-sk-pct>' + (s.level || 50) + '%</span></div>' +
          '<button class="btn-icon sm danger" data-sk-del>' + UI.icon('trash', 14) + '</button>' +
          '</div>';
      }).join('') : '<p class="tiny muted" style="margin-bottom:8px">' + e(t('skillsEmpty')) + '</p>';
    }
    renderSkillsEdit();

    m.body.querySelector('#peSkills').addEventListener('input', function (ev) {
      var row = ev.target.closest('.skill-edit-row');
      if (!row) return;
      var i = +row.getAttribute('data-i');
      if (ev.target.matches('[data-sk-name]')) skills[i].name = ev.target.value;
      if (ev.target.matches('[data-sk-level]')) {
        skills[i].level = +ev.target.value;
        row.querySelector('[data-sk-pct]').textContent = skills[i].level + '%';
      }
    });
    m.body.querySelector('#peSkills').addEventListener('click', function (ev) {
      var del = ev.target.closest('[data-sk-del]');
      if (!del) return;
      skills.splice(+del.closest('.skill-edit-row').getAttribute('data-i'), 1);
      renderSkillsEdit();
      hideSkillAlert();
    });
    m.body.querySelector('#peAddSkill').addEventListener('click', function () {
      var alertEl = m.body.querySelector('#peSkillAlert');
      if (skills.length >= MAX_SKILLS) {
        alertEl.textContent = t('skillsMaxReached');
        alertEl.style.display = 'block';
        return;
      }
      alertEl.style.display = 'none';
      skills.push({ id: Store.uid('sk'), name: '', level: 60 });
      renderSkillsEdit();
      var rows = m.body.querySelectorAll('.skill-edit-row input[data-sk-name]');
      if (rows.length) rows[rows.length - 1].focus();
    });

    function hideSkillAlert() {
      var alertEl = m.body.querySelector('#peSkillAlert');
      if (alertEl) alertEl.style.display = 'none';
    }

    var BIO_MAX = 150;
    var bioEl = m.body.querySelector('#peBio');
    var bioCountEl = m.body.querySelector('#peBioCount');
    function updateBioCount() {
      var left = BIO_MAX - (bioEl.value ? bioEl.value.length : 0);
      if (left <= 0) {
        bioCountEl.textContent = t('bioLimitReached');
        bioCountEl.classList.add('error');
      } else {
        bioCountEl.textContent = t('bioRemaining', { n: left });
        bioCountEl.classList.remove('error');
      }
    }
    bioEl.addEventListener('input', updateBioCount);
    updateBioCount();

    var nameEl = m.body.querySelector('#peName');
    var nameHintEl = m.body.querySelector('#peNameHint');
    var emailEl = m.body.querySelector('#peEmail');
    var emailHintEl = m.body.querySelector('#peEmailHint');
    var websiteEl = m.body.querySelector('#peWebsite');
    var websiteHintEl = m.body.querySelector('#peWebsiteHint');
    var saveEl = m.el.querySelector('#peSave');

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var URL_RE = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}([:/?#]\S*)?$/i;

    var nameValid = true, emailValid = true, websiteValid = true;

    function setHint(el, msg, cls) {
      el.textContent = msg;
      el.classList.remove('error', 'ok');
      if (cls) el.classList.add(cls);
    }

    function refreshSave() {
      saveEl.disabled = !(nameValid && emailValid && websiteValid);
    }

    function nameWordCount() {
      return (nameEl.value.trim() || p.name || '').split(/\s+/).filter(Boolean).length;
    }

    function checkNameLive() {
      var n = nameWordCount();
      nameValid = true;
      if (n === 0) setHint(nameHintEl, t('nameWordsHint'), '');
      else if (n < 2) { setHint(nameHintEl, t('nameTooShort'), 'error'); nameValid = false; }
      else if (n > 3) { setHint(nameHintEl, t('nameTooLong'), 'error'); nameValid = false; }
      else setHint(nameHintEl, t('nameValid'), 'ok');
      refreshSave();
      return nameValid;
    }

    function checkEmailLive() {
      var v = emailEl.value.trim();
      emailValid = true;
      if (!v) setHint(emailHintEl, '', '');
      else if (EMAIL_RE.test(v)) setHint(emailHintEl, t('emailValid'), 'ok');
      else { setHint(emailHintEl, t('emailInvalid'), 'error'); emailValid = false; }
      refreshSave();
      return emailValid;
    }

    function checkWebsiteLive() {
      var v = websiteEl.value.trim();
      websiteValid = true;
      if (!v) setHint(websiteHintEl, '', '');
      else if (URL_RE.test(v)) setHint(websiteHintEl, t('websiteValid'), 'ok');
      else { setHint(websiteHintEl, t('websiteInvalid'), 'error'); websiteValid = false; }
      refreshSave();
      return websiteValid;
    }

    nameEl.addEventListener('input', checkNameLive);
    emailEl.addEventListener('input', checkEmailLive);
    websiteEl.addEventListener('input', checkWebsiteLive);
    checkNameLive();
    checkEmailLive();
    checkWebsiteLive();

    m.body.querySelector('#peAvatarBtn').addEventListener('click', function () { m.body.querySelector('#peAvatarFile').click(); });
    m.body.querySelector('#peAvatarFile').addEventListener('change', function (ev) {
      var f = ev.target.files[0];
      if (!f) return;
      UI.compressImage(f, 480, 0.85).then(function (dataUrl) {
        avatarDraft = dataUrl;
        m.body.querySelector('#peAvatar').src = dataUrl;
      });
    });

    m.el.querySelector('#peCancel').addEventListener('click', m.close);
    m.el.querySelector('#peSave').addEventListener('click', function () {
      var btn = m.el.querySelector('#peSave');
      if (btn.disabled) return;

      var name = nameEl.value.trim() || p.name;
      if (!checkNameLive()) { nameEl.focus(); return; }
      if (!checkEmailLive()) { emailEl.focus(); return; }
      if (!checkWebsiteLive()) { websiteEl.focus(); return; }
      var cleanSkills = skills.filter(function (s) { return s.name && s.name.trim(); }).map(function (s) {
        return { id: s.id || Store.uid('sk'), name: s.name.trim(), level: s.level || 50 };
      });
      var payload = {
        name: name,
        title: m.body.querySelector('#peTitle').value.trim(),
        bio: m.body.querySelector('#peBio').value.trim(),
        website: m.body.querySelector('#peWebsite').value.trim(),
        email: m.body.querySelector('#peEmail').value.trim(),
        avatarData: avatarDraft,
        skills: cleanSkills
      };

      btn.disabled = true;
      submitProfileUpdate(payload, function (res) {
        var prof = res.profile || {};
        Store.updateProfile({
          name: prof.name || name,
          handle: prof.handle || p.handle,
          title: prof.title || payload.title,
          bio: typeof prof.bio === 'string' ? prof.bio : payload.bio,
          location: typeof prof.location === 'string' ? prof.location : (p.location || ''),
          website: typeof prof.website === 'string' ? prof.website : (p.website || ''),
          email: prof.email || payload.email,
          verified: !!prof.verified,
          avatar: prof.avatar || avatarDraft,
          socials: prof.socials || (p.socials || {})
        });
        Store.state.skills = Array.isArray(res.skills) ? res.skills : cleanSkills;
        Store.commit();
        m.close();
        renderHome();
        UI.toast(t('savedOk'), 'success');
      }, function (err) {
        btn.disabled = false;
        if (err === 'invalid_name') UI.toast(t('nameInvalid'), 'error');
        else if (err === 'login') UI.toast(t('loginRequiredSave'), 'error');
        else UI.toast(t('saveFailed'), 'error');
      });
    });
  }

  /* ---------- certificate modal ---------- */

  function openCertModal(id) {
    var c = id ? Store.find('certificates', id) : null;
    var draft = c ? Object.assign({}, c) : {
      id: Store.uid('c'), title: '', issuer: '', category: '', date: new Date().toISOString().slice(0, 10),
      image: '', credentialId: '', verifyUrl: '', description: '', skills: [], addedAt: new Date().toISOString()
    };
    var imgDraft = '';

    var body =
      '<div class="field"><label class="label">' + e(t('certTitleLabel')) + ' <span class="req">*</span></label><input class="input" id="cmTitle" value="' + e(draft.title) + '" placeholder="' + e(t('certTitleLabel')) + '"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label class="label">' + e(t('issuerLabel')) + ' <span class="req">*</span></label><input class="input" id="cmIssuer" value="' + e(draft.issuer) + '"></div>' +
      '<div class="field"><label class="label">' + e(t('certCategory')) + '</label><input class="input" id="cmCategory" value="' + e(draft.category || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label class="label">' + e(t('certDate')) + '</label><input type="date" class="input" id="cmDate" value="' + e((draft.date || '').slice(0, 10)) + '"></div>' +
      '<div class="field"><label class="label">' + e(t('descriptionLabel')) + '</label><textarea class="textarea" id="cmDesc" rows="4" minlength="150" maxlength="5000">' + e(draft.description || '') + '</textarea>' +
      '<small class="cert-description-count" id="cmDescCount"></small></div>' +
      '<div class="field"><label class="label">' + e(t('skillsUsed')) + '</label>' +
      '<div class="cert-skill-field" id="cmSkills"><div class="cert-skill-chips"></div>' +
      '<input class="input cert-skill-input" id="cmSkillInput" type="text" placeholder="' + e(t('certSkillsPlaceholder')) + '" autocomplete="off"></div></div>' +
      '<div class="field"><label class="label">' + e(t('imageLabel')) + '</label>' +
      '<div class="cover-preview hide" id="cmPreviewWrap" style="margin-bottom:8px"><img id="cmPreview" src="" alt=""></div>' +
      '<div class="dropzone compact" id="cmDrop"><input type="file" accept="image/*">' + UI.icon('upload', 17) + '<span>' + e(t('dropImages')) + '</span></div></div>';

    var m = UI.modal({
      title: c ? t('editCert') : t('addCert'),
      size: 'md',
      body: body + '<p class="hint">' + e(t('certPendingReviewNotice')) + '</p>',
      footer: '<button class="btn btn-ghost" id="cmCancel">' + e(t('cancel')) + '</button>' +
        '<button class="btn btn-primary" id="cmSave">' + UI.icon('check', 15) + e(t('publish')) + '</button>'
    });

    var skills = (draft.skills || []).slice(0, 20);
    var skillField = m.body.querySelector('#cmSkills');
    var skillInput = skillField.querySelector('#cmSkillInput');
    var descriptionInput = m.body.querySelector('#cmDesc');
    var descriptionCount = m.body.querySelector('#cmDescCount');

    function renderSkills() {
      skillField.querySelector('.cert-skill-chips').innerHTML = skills.map(function (skill, index) {
        return '<span class="chip cert-skill-chip">' + e(skill) +
          '<button class="chip-x" type="button" data-remove-skill="' + index + '" aria-label="' +
          e(t('certRemoveSkill')) + '">' + UI.icon('x', 11) + '</button></span>';
      }).join('');
    }

    function addSkills(value) {
      value.split(/[,\u060c]/).forEach(function (rawSkill) {
        var skill = rawSkill.trim().slice(0, 80);
        if (!skill || skills.some(function (existing) {
          return existing.toLocaleLowerCase() === skill.toLocaleLowerCase();
        })) return;
        if (skills.length >= 20) {
          UI.toast(t('certSkillsLimit'), 'error');
          return;
        }
        skills.push(skill);
      });
      renderSkills();
    }

    function updateDescriptionCount() {
      descriptionCount.textContent = t('certDescriptionCount', {
        count: descriptionInput.value.length,
        minimum: 150
      });
      descriptionCount.classList.toggle('is-valid', descriptionInput.value.trim().length >= 150);
    }

    renderSkills();
    updateDescriptionCount();
    descriptionInput.addEventListener('input', updateDescriptionCount);
    skillField.addEventListener('click', function (ev) {
      var removeButton = ev.target.closest('[data-remove-skill]');
      if (removeButton) {
        skills.splice(Number(removeButton.getAttribute('data-remove-skill')), 1);
        renderSkills();
        return;
      }
      if (ev.target === skillField || ev.target.classList.contains('cert-skill-chips')) {
        skillInput.focus();
      }
    });
    skillInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ',') {
        ev.preventDefault();
        addSkills(skillInput.value);
        skillInput.value = '';
      } else if (ev.key === 'Backspace' && !skillInput.value && skills.length) {
        skills.pop();
        renderSkills();
      }
    });

    m.body.querySelector('#cmDrop input').addEventListener('change', function (ev) {
      var f = ev.target.files[0];
      if (!f) return;
      UI.compressImage(f, 1200, 0.82).then(function (d) {
        imgDraft = d;
        m.body.querySelector('#cmPreview').src = d;
        m.body.querySelector('#cmPreviewWrap').classList.remove('hide');
      }).catch(function () {
        UI.toast(t('saveFailed'), 'error');
      });
    });
    m.el.querySelector('#cmCancel').addEventListener('click', m.close);
    m.el.querySelector('#cmSave').addEventListener('click', function () {
      var title = m.body.querySelector('#cmTitle').value.trim();
      var issuer = m.body.querySelector('#cmIssuer').value.trim();
      if (!title || !issuer) { UI.toast(t('required'), 'error'); return; }
      if (descriptionInput.value.trim().length < 150) {
        UI.toast(t('certDescriptionTooShort'), 'error');
        descriptionInput.focus();
        return;
      }
      if (!imgDraft) { UI.toast(t('certImageRequired'), 'error'); return; }
      draft.title = title;
      draft.issuer = issuer;
      draft.category = m.body.querySelector('#cmCategory').value.trim();
      draft.date = m.body.querySelector('#cmDate').value;
      draft.description = descriptionInput.value.trim();
      draft.skills = skills.slice();
      var saveButton = m.el.querySelector('#cmSave');
      saveButton.disabled = true;
      var formData = new FormData();
      formData.append('title', draft.title);
      formData.append('issuer', draft.issuer);
      formData.append('category', draft.category);
      formData.append('date', draft.date);
      formData.append('description', draft.description);
      formData.append('skills', JSON.stringify(draft.skills));
      var imageBlob = dataUrlToBlob(imgDraft);
      var extension = imageBlob.type.split('/')[1] || 'jpg';
      formData.append('image', imageBlob, 'certificate.' + extension);
      fetch(SITE.u('manualCertificateSubmit'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-CSRFToken': csrfToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
      }).then(function (response) {
        return response.text().then(function (body) {
          var data;
          try {
            data = JSON.parse(body);
          } catch (error) {
            var responseError = new Error('Certificate submission returned a non-JSON response');
            responseError.status = response.status;
            throw responseError;
          }
          if (!response.ok || !data.ok) {
            if (data.error === 'student_only') UI.toast(t('certStudentOnly'), 'error');
            else if (data.error === 'image_required' || data.error === 'invalid_image') UI.toast(t('certImageRequired'), 'error');
            else if (data.error === 'image_too_large') UI.toast(t('certImageTooLarge'), 'error');
            else if (data.error === 'invalid_date') UI.toast(t('certInvalidDate'), 'error');
            else if (data.error === 'invalid_url') UI.toast(t('certInvalidUrl'), 'error');
            else if (data.error === 'description_too_short') UI.toast(t('certDescriptionTooShort'), 'error');
            else if (data.error === 'required') UI.toast(t('required'), 'error');
            else UI.toast(t('saveFailed') + ' (' + (data.error || response.status) + ')', 'error');
            saveButton.disabled = false;
            return null;
          }
          return data;
        });
      }).then(function (data) {
        if (!data) return;
        var addedToCurrentPage = Store.addManualCertificate(data.certificate);
        m.close();
        if (page === 'home' && addedToCurrentPage) renderHome(); else location.reload();
        UI.toast(t('certPendingReview'), 'success');
      }).catch(function (error) {
        console.error('Manual certificate submission failed:', error);
        saveButton.disabled = false;
        var status = error.status ? 'HTTP ' + error.status : t('networkError');
        UI.toast(t('saveFailed') + ' (' + status + ')', 'error');
      });
    });
  }

  /* ---------- detail: not found ---------- */

  function renderNotFound(host) {
    host.innerHTML = '<div class="notfound">' +
      '<div class="empty-ic">' + UI.icon('inbox', 30) + '</div>' +
      '<h2 style="margin:10px 0 6px">' + e(t('notFound')) + '</h2>' +
      '<p class="muted" style="margin-bottom:18px">' + e(t('notFoundSub')) + '</p>' +
      '<a class="btn btn-primary" href="' + SITE.u('users') + '">' + UI.icon('arrow-left', 15) + e(t('back')) + '</a></div>';
  }

  function backLink(label, smart) {
    var from = '';
    try { from = new URLSearchParams(location.search).get('from') || ''; } catch (err) { }
    var dest = from === 'landing' || from === 'platform' ? SITE.u('landing')
      : from === 'all-courses' ? SITE.u('courses')
      : smart ? SITE.u('projects')
      : SITE.u('portfolio');
    try {
      var returnPath = new URLSearchParams(location.search).get('return');
      if (returnPath) {
        var returnUrl = new URL(returnPath, location.origin);
        if (returnUrl.origin === location.origin && returnUrl.pathname !== location.pathname) {
          dest = returnUrl.pathname + returnUrl.search + returnUrl.hash;
        }
      }
    } catch (err) { }
    return '<a class="detail-back" href="' + dest + '"' + (smart ? ' data-smart-back' : '') + '>' + UI.icon(document.documentElement.dir === 'rtl' ? 'arrow-right' : 'arrow-left', 16) + e(label || t('back')) + '</a>';
  }

  /* ---------- detail: certificate ---------- */

  function renderEarnedCertificate(host, c) {
    if (c.manual) {
      renderManualCertificate(host, c);
      return;
    }
    var from = '';
    try { from = new URLSearchParams(location.search).get('from') || ''; } catch (err) { }
    var instName = c.instructor || c.issuer || '';
    var skills = c.skills || [];
    var heroImg = c.courseImage || c.image || '';
    var code = c.certificateCode || c.code || c.credentialId || '';
    var issued = c.date ? UI.formatDate(c.date) : '—';
    var studentName = c.studentName || (SERVER_PROFILE && SERVER_PROFILE.fullName) || '';
    var shareUrl = location.origin + SITE.u('certificate', e(c.id));
    var backDest = SITE.u('course', e(c.id));

    host.innerHTML =
      backLink(t('certPageBack')) +
      '<section class="cd-hero cert-hero' + (heroImg ? '' : '') + '"' + (heroImg ? ' style="background-image:url(\'' + e(heroImg) + '\'),linear-gradient(135deg,#2563eb,#7c3aed)"' : '') + '>' +
      '<div class="cd-hero-overlay"><div class="cd-hero-inner">' +
      '<span class="cert-hero-seal">' + UI.verifiedBadge(15) + e(t('certPageStatusValid')) + '</span>' +
      '<h1 class="cd-title">' + e(c.title) + '</h1>' +
      '<div class="cd-author">' +
      '<img class="cd-author-av" src="' + UI.userLetterAvatar(instName, 64) + '" alt="">' +
      '<span>' + e(t('ucBy')) + ' <b>' + e(instName) + '</b></span>' +
      '</div>' +
      '<div class="cd-pills">' +
      '<span class="cd-pill">' + UI.icon('calendar', 14) + e(issued) + '</span>' +
      (c.duration ? '<span class="cd-pill">' + UI.icon('clock', 14) + e(c.duration) + '</span>' : '') +
      '<span class="cd-pill">' + UI.icon('award', 14) + e(t('ucCert')) + '</span>' +
      '</div>' +
      '</div></div>' +
      '</section>' +

      '<div class="cd-grid">' +
      '<div class="cd-main">' +
      '<section class="cd-card">' +
      earnedCertificateSheet(c, studentName, false) +
      (code ? '<div class="cert-code-row"><span class="lbl">' + e(t('certPageCode')) + '</span>' +
        '<span class="cert-code" dir="ltr">' + e(code) + '</span>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-act="copy-id" data-value="' + e(code) + '">' + UI.icon('copy', 14) + e(t('certPageCopyLink')) + '</button></div>' : '') +
      '</section>' +

      (skills.length ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('check-circle', 18) + e(t('certPageLearn')) + '</h2>' +
      '<div class="cd-learn">' + skills.map(function (s) {
        return '<div class="cd-learn-item">' + UI.icon('check', 16) + '<span>' + e(s) + '</span></div>';
      }).join('') + '</div>' +
      '</section>' : '') +

      (c.description ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('file-text', 18) + e(t('certPageAbout')) + '</h2>' +
      '<div class="prose"><p>' + e(c.description) + '</p></div>' +
      '</section>' : '') +
      '</div>' +

      '<aside class="cd-side">' +
      '<div class="cd-buy">' +
      '<div class="cd-buy-body">' +
      '<div class="cd-price"><b>' + e(t('certPageStatusValid')) + '</b><span>' + e(t('certPageKicker')) + '</span></div>' +
      '<button class="cd-btn cd-btn-buy" type="button" data-act="print-cert">' + UI.icon('download', 16) + e(t('certPagePrint')) + '</button>' +
      '<button class="cd-btn cd-btn-share" type="button" data-act="share" data-url="' + e(shareUrl) + '">' + UI.icon('share-2', 16) + e(t('shareCta')) + '</button>' +
      '<a class="cd-btn cd-btn-edit" href="' + backDest + '">' + UI.icon('arrow-right', 15) + e(t('certPageBack')) + '</a>' +
      '<ul class="cd-includes">' +
      '<li>' + UI.icon('award', 15) + '<span>' + e(t('ucCert')) + '</span></li>' +
      '<li>' + UI.icon('calendar', 15) + '<span>' + e(t('certPageIssued')) + ': <b>' + e(issued) + '</b></span></li>' +
      (code ? '<li>' + UI.icon('hash', 15) + '<span class="cd-cred" dir="ltr">' + e(code) + '</span></li>' : '') +
      '</ul>' +
      '</div></div>' +
      '</aside>' +
      '</div>';
  }

  function renderManualCertificate(host, c) {
    var issued = c.date ? UI.formatDate(c.date) : '—';
    var returnPath = '';
    try { returnPath = new URLSearchParams(location.search).get('return') || ''; } catch (err) { }

    host.innerHTML =
      backLink(t('back')) +
      '<section class="cd-hero cert-hero"' +
      (c.image ? ' style="background-image:url(\'' + e(c.image) + '\'),linear-gradient(135deg,#2563eb,#7c3aed)"' : '') +
      '><div class="cd-hero-overlay"><div class="cd-hero-inner">' +
      '<span class="cert-hero-seal">' + UI.verifiedBadge(15) + e(t('certPageStatusValid')) + '</span>' +
      '<h1 class="cd-title">' + e(c.title) + '</h1>' +
      '<div class="cd-author"><img class="cd-author-av" src="' + UI.userLetterAvatar(c.issuer, 64) + '" alt="">' +
      '<span>' + e(t('ucBy')) + ' <b>' + e(c.issuer || '—') + '</b></span></div>' +
      '<div class="cd-pills"><span class="cd-pill">' + UI.icon('calendar', 14) + e(issued) + '</span>' +
      '<span class="cd-pill">' + UI.icon('user', 14) + e(c.studentName || '—') + '</span>' +
      '<span class="cd-pill">' + UI.icon('award', 14) + e(c.statusLabel || t('certApproved')) + '</span></div>' +
      '</div></div></section>' +
      '<div class="cd-grid"><div class="cd-main">' +
      '<section class="cd-card manual-certificate-image-card">' +
      '<h2 class="cd-h2">' + UI.icon('image', 18) + e(t('imageLabel')) + '</h2>' +
      (c.image ? '<img class="manual-certificate-detail-image" src="' + e(c.image) + '" alt="' + e(c.title) + '">' : '') +
      '</section>' +
      (c.skills && c.skills.length ? '<section class="cd-card"><h2 class="cd-h2">' +
        UI.icon('check-circle', 18) + e(t('certPageLearn')) + '</h2><div class="cd-learn">' +
        c.skills.map(function (skill) {
          return '<div class="cd-learn-item">' + UI.icon('check', 16) + '<span>' + e(skill) + '</span></div>';
        }).join('') + '</div></section>' : '') +
      (c.description ? '<section class="cd-card"><h2 class="cd-h2">' +
        UI.icon('file-text', 18) + e(t('certPageAbout')) + '</h2><div class="prose"><p>' +
        e(c.description) + '</p></div></section>' : '') +
      '</div><aside class="cd-side"><div class="cd-buy"><div class="cd-buy-body">' +
      '<div class="cd-price"><b>' + e(c.title) + '</b><span>' + e(c.issuer || '—') + '</span></div>' +
      (c.credentialId ? '<ul class="cd-includes"><li>' + UI.icon('hash', 15) +
        '<span class="cd-cred" dir="ltr">' + e(c.credentialId) + '</span></li></ul>' : '') +
      '<button class="cd-btn cd-btn-buy" type="button" data-act="print-cert">' +
        UI.icon('download', 16) + e(t('certPagePrint')) + '</button>' +
      '<button class="cd-btn cd-btn-share" type="button" data-act="share" data-url="' +
        e(SITE.u('certificate', c.id) + (returnPath ? '?return=' + encodeURIComponent(returnPath) : '')) +
        '">' + UI.icon('share-2', 16) + e(t('shareCta')) + '</button>' +
      '</div></div></aside></div>';
  }

  function courseProjectCard(pj) {
    if (!pj) return '';
    var links = pj.links || {};
    var tags = (pj.tags || []).slice(0, 4).map(function (tg) {
      return '<span class="chip">' + e(tg) + '</span>';
    }).join('');
    var actions = '';
    if (links.github) actions += '<a class="btn btn-ghost btn-sm" href="' + e(links.github) + '" target="_blank" rel="noopener">' + UI.icon('github', 14) + ' ' + e(t('source')) + '</a>';
    if (links.demo) actions += '<a class="btn btn-soft btn-sm" href="' + e(links.demo) + '" target="_blank" rel="noopener">' + UI.icon('external-link', 14) + ' ' + e(t('demo')) + '</a>';
    actions += '<a class="btn btn-primary btn-sm" href="' + projectDetailUrl(pj.id) + '">' + UI.icon('eye', 14) + ' ' + e(t('plProjectOpen')) + '</a>';

    return '<article class="cd-project-card">' +
      (pj.cover ? '<div class="cd-project-cover"><img src="' + e(pj.cover) + '" alt="' + e(pj.title) + '"></div>' : '') +
      '<div class="cd-project-body">' +
      '<div class="cd-project-head">' +
      '<span class="cd-project-badge">' + UI.icon('briefcase', 13) + ' ' + e(t('plProjectType')) + '</span>' +
      (pj.role ? '<span class="cd-project-role">' + UI.icon('user', 13) + ' ' + e(pj.role) + '</span>' : '') +
      '</div>' +
      '<h3 class="cd-project-title">' + e(pj.title) + '</h3>' +
      (pj.summary ? '<p class="cd-project-summary">' + e(pj.summary) + '</p>' : '') +
      (tags ? '<div class="cd-project-tags">' + tags + '</div>' : '') +
      '<div class="cd-project-actions">' + actions + '</div>' +
      '</div>' +
      '</article>';
  }

  function confirmCourseRegistration(courseTitle) {
    var centerAddress = 'السرايا - مقابل شركة جوال - عمارة عنان - الطابق الاول (بجوار حلويات ابو بكر ساق الله)';
    function registrationUrl(mode) {
      var modeLabel = mode === 'online' ? 'أونلاين' : 'وجاهي';
      return 'https://wa.me/972594810786?text=' +
        encodeURIComponent('مرحبا شركة داتا، ارغب في التسجيل ' + modeLabel + ' في دورة ' + courseTitle);
    }

    var enrollModal = UI.modal({
      title: t('ucEnroll'),
      size: 'sm',
      body: '',
      footer: '<span></span>'
    });
    enrollModal.el.querySelector('.modal-foot').classList.add('course-enroll-modal-foot');

    function renderModeChoice() {
      enrollModal.body.innerHTML = '<p class="modal-text">اختر طريقة التسجيل في دورة <b>' + e(courseTitle) + '</b>.</p>';
      enrollModal.el.querySelector('.modal-foot').innerHTML =
        '<button class="btn btn-soft" type="button" data-enroll-mode="in-person">وجاهي</button>' +
        '<a class="btn btn-primary" href="' + e(registrationUrl('online')) + '" target="_blank" rel="noopener" data-enroll-confirm>' +
        'أونلاين ' + UI.icon('whatsapp', 16) + '</a>';
      enrollModal.el.querySelector('[data-enroll-confirm]').addEventListener('click', enrollModal.close);
      enrollModal.el.querySelector('[data-enroll-mode="in-person"]').addEventListener('click', renderInPerson);
    }

    function renderInPerson() {
      enrollModal.body.innerHTML = '<p class="modal-text">عنوان مركز داتا:</p><p class="modal-text"><b>' +
        e(centerAddress) + '</b></p>';
      enrollModal.el.querySelector('.modal-foot').innerHTML =
        '<button class="btn btn-ghost" type="button" data-enroll-back>رجوع</button>' +
        '<a class="btn btn-primary" href="' + e(registrationUrl('in-person')) + '" target="_blank" rel="noopener" data-enroll-confirm>' +
        UI.icon('whatsapp', 16) + ' التسجيل عبر واتساب</a>';
      enrollModal.el.querySelector('[data-enroll-back]').addEventListener('click', renderModeChoice);
      enrollModal.el.querySelector('[data-enroll-confirm]').addEventListener('click', enrollModal.close);
    }

    renderModeChoice();
  }

  function renderCourseDetail() {
    var host = document.getElementById('detailHost');
    var id = SITE.param('id');
    var enrolled = false;
    var enrollmentData = document.getElementById('course-enrollment-data');
    if (enrollmentData) {
      try { enrolled = JSON.parse(enrollmentData.textContent) === true; } catch (err) { enrolled = false; }
    }
    var rewardsData = {};
    var rewardsEl = document.getElementById('course-rewards-data');
    if (rewardsEl) {
      try { rewardsData = JSON.parse(rewardsEl.textContent) || {}; } catch (err) { rewardsData = {}; }
    }
    var from = '';
    try { from = new URLSearchParams(location.search).get('from') || ''; } catch (err) { }
    var c = Store.find('certificates', id);
    if (!c) { renderNotFound(host); return; }
    if (c.earned) { renderEarnedCertificate(host, c); return; }
    var related = Store.collection('certificates').filter(function (x) { return x.id !== c.id; }).slice(0, 3);
    var backDest = from === 'landing' || from === 'platform' ? SITE.u('landing') : from === 'all-courses' ? SITE.u('courses') : SITE.u('portfolio');
    var registrationRequired = false;
    try {
      registrationRequired = new URLSearchParams(location.search).get('registration') === 'required';
    } catch (err) { }
    if (registrationRequired) {
      try {
        var cleanUrl = new URL(location.href);
        cleanUrl.searchParams.delete('registration');
        history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      } catch (err) { }
    }
    var sub = (c.description || '').replace(/\s+/g, ' ').trim();
    if (sub.length > 130) sub = sub.slice(0, 127).trim() + '…';
    var skills = c.skills || [];
   var heroImg = c.courseImage || c.image;
   var instName = c.instructor || c.issuer;

   /* أول درس في الدورة (وفيديوه) لعرضه في صفحة التفاصيل بنفس آلية مشغّل الدروس */
   /* كل هذا داخل try/catch: أي خلل هنا لا يجوز أن يُفرغ الصفحة */
   var previewLesson = null;
   var previewUrl = '';
   try {
     var lessons = [];
     (c.syllabus || []).forEach(function (sec) {
       (sec.lessons || []).forEach(function (ls) { if (ls) lessons.push(ls); });
     });
     /* فيديو أول درس، وإن لم يكن قابلاً للتشغيل فأول درس فيه فيديو قابل */
     for (var i = 0; i < lessons.length; i++) {
       var playable = UI.playableUrl(UI.videoUrl(lessons[i]));
       if (playable) { previewLesson = lessons[i]; previewUrl = playable; break; }
     }
   } catch (err) { previewLesson = null; previewUrl = ''; }

   var heroPlayerHTML = '';
   if (previewUrl) {
     try { heroPlayerHTML = UI.playerHTML(previewUrl, { id: 'cdHeroPlayer' }); } catch (err) { heroPlayerHTML = ''; }
   }
   if (!heroPlayerHTML) {
     heroPlayerHTML = '<img src="' + e(heroImg) + '" alt="' + e(c.title) + '"><span class="cd-play" aria-hidden="true">' + UI.icon('play', 24) + '</span>';
   }
   var previewLabel = '';
   if (previewLesson) {
     previewLabel = '<span class="cd-preview">' +
       UI.icon('play', 14) +
       '<span class="cd-preview-t">' + e(previewLesson.title || '') + '</span>' +
       (previewLesson.duration ? '<span class="cd-preview-d">' + e(previewLesson.duration) + '</span>' : '') +
       '</span>';
   }
    var linkedProjects = [];
    var seenProj = {};
     (c.syllabus || []).forEach(function (sec) {
      (sec.lessons || []).forEach(function (ls) {
        if (ls.type === 'project' && ls.project && ls.project.id && !seenProj[ls.project.id]) {
          seenProj[ls.project.id] = true;
          linkedProjects.push(ls.project);
        }
      });
    });

    host.innerHTML =
      backLink(null, true) +
      '<section class="cd-hero" style="background-image:url(\'' + heroImg + '\')">' +
      '<div class="cd-hero-overlay"><div class="cd-hero-inner">' +
      '<nav class="cd-crumb"><a href="' + backDest + '">' + e(t('ucCourses')) + '</a><span class="cd-crumb-sep">›</span><span>' + e(c.category || '') + '</span></nav>' +
      '<h1 class="cd-title">' + e(c.title) + '</h1>' +
      (sub ? '<p class="cd-sub">' + e(sub) + '</p>' : '') +
      '<div class="cd-author">' +
      '<img class="cd-author-av" src="' + UI.userLetterAvatar(instName, 64) + '" alt="">' +
      '<span>' + e(t('ucBy')) + ' <b>' + e(instName) + '</b></span>' +
      '<span class="cd-verified">' + UI.verifiedBadge(14) + e(t('certVerified')) + '</span>' +
      '</div>' +
      '<div class="cd-pills">' +
      '<span class="cd-pill">' + UI.icon('clock', 14) + e(c.duration || '—') + '</span>' +
      '<span class="cd-pill">' + UI.icon('calendar', 14) + e(c.period || '—') + '</span>' +
      '<span class="cd-pill">' + UI.icon('award', 14) + e(t('ucCert')) + '</span>' +
      '</div>' +
      '</div></div>' +
      '</section>' +

      '<div class="cd-grid">' +
      '<div class="cd-main">' +
      (skills.length ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('check-circle', 18) + e(t('ucLearn')) + '</h2>' +
      '<div class="cd-learn">' + skills.map(function (s) {
        return '<div class="cd-learn-item">' + UI.icon('check', 16) + '<span>' + e(s) + '</span></div>';
      }).join('') + '</div>' +
      '</section>' : '') +
      (c.description ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('file-text', 18) + e(t('ucDesc')) + '</h2>' +
      '<div class="prose"><p>' + e(c.description) + '</p></div>' +
      (c.verifyUrl ? '<a class="btn btn-ghost" style="margin-top:12px" href="' + e(c.verifyUrl) + '" target="_blank" rel="noopener">' + UI.icon('external-link', 15) + e(t('certVerify')) + '</a>' : '') +
      '</section>' : '') +
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('user', 18) + e(t('ucInstructor')) + '</h2>' +
      '<div class="cd-inst">' +
      '<img class="cd-inst-av" src="' + UI.userLetterAvatar(instName, 112) + '" alt="">' +
      '<div><div class="cd-inst-name">' + e(instName) + ' <span class="cd-verified">' + UI.verifiedBadge(14) + '</span></div>' +
      '<div class="cd-inst-sub">' + e(t('ucInstSub')) + (c.category ? ' · ' + e(c.category) : '') + '</div></div>' +
      '</div>' +
      '</section>' +
      (linkedProjects.length ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('briefcase', 18) + e(t('ucLinkedProjects')) + '</h2>' +
      '<div class="cd-projects">' + linkedProjects.map(function (pj) { return courseProjectCard(pj); }).join('') + '</div>' +
      '</section>' : '') +
      (related.length ?
      '<section class="cd-card">' +
      '<h2 class="cd-h2">' + UI.icon('layers', 18) + e(t('relatedCerts')) + '</h2>' +
      '<div class="cd-related">' + related.map(function (x) { return certCard(x, { course: true, from: from }); }).join('') + '</div>' +
      '</section>' : '') +
      '</div>' +

       '<aside class="cd-side">' +
       '<div class="cd-buy">' +
       '<div class="cd-thumb">' + heroPlayerHTML + previewLabel + '</div>' +
      '<div class="cd-buy-body">' +
      '<div class="cd-price">' +
      '<b>' + e(c.price || t('ucFree')) + '</b>' +
      '<span>' + e(t('ucPriceNote')) + '</span>' +
      '</div>' +
      (enrolled
        ? '<a class="cd-btn cd-btn-buy" href="' + SITE.u('playlist', e(c.id)) + (from ? '?from=' + e(from) : '') + '">' + UI.icon('play', 16) + e(t('plStart')) + '</a>'
        : '<button class="cd-btn cd-btn-wa" type="button" data-act="enroll-course" data-title="' + e(c.title) + '">' + UI.icon('whatsapp', 17) + e(t('ucEnroll')) + '</button>') +
      '<button class="cd-btn cd-btn-share" type="button" data-act="share" data-url="' + e(rewardsData.shareUrl || SITE.u('course', e(c.id))) + '">' + UI.icon('share-2', 16) + e(t('shareCta')) + '</button>' +
      (rewardsData.canRedeem
        ? '<button class="cd-btn cd-btn-redeem" type="button" data-act="redeem-course-points" data-url="' + e(rewardsData.redeemUrl) + '">' + UI.icon('award', 16) + 'استبدل 100 نقطة باشتراك مجاني</button>'
        : '') +
      (canManageCourse(c)
        ? '<button class="cd-btn cd-btn-edit" type="button" data-act="goto" data-url="' + SITE.u('courseEdit', e(c.id)) + '">' + UI.icon('pencil', 15) + e(t('edit')) + '</button>'
        : '') +
      '<ul class="cd-includes">' +
      '<li>' + UI.icon('clock', 15) + '<span>' + e(t('ucDuration')) + ': <b>' + e(c.duration || '—') + '</b></span></li>' +
      '<li>' + UI.icon('calendar', 15) + '<span>' + e(t('ucSessions')) + ': <b>' + e(c.period || '—') + '</b></span></li>' +
      '<li>' + UI.icon('award', 15) + '<span>' + e(t('ucCert')) + '</span></li>' +
      '<li>' + UI.icon('globe', 15) + '<span>' + e(t('ucAccess')) + '</span></li>' +
      '</ul>' +
      '</div></div>' +
      '</aside>' +
      '</div>';

    mountCourseHeroPlayer();
    if (registrationRequired && !enrolled) confirmCourseRegistration(c.title);
  }

  /* تهيئة مشغّل Plyr لمعاينة أول درس في صفحة تفاصيل الدورة (نفس آلية مشغّل الدروس) */
  var heroPlyr = null;
  function mountCourseHeroPlayer() {
    var host = document.getElementById('cdHeroPlayer');
    if (!host || !window.Plyr) return;
    if (heroPlyr) { try { heroPlyr.destroy(); } catch (err) { /* ignore */ } heroPlyr = null; }
    try { heroPlyr = UI.mountPlyr(host); } catch (err) { heroPlyr = null; }
  }

  /* ---------- detail: project ---------- */

  function renderProjectDetail() {
    var host = document.getElementById('detailHost');
    var id = SITE.param('id');
    var p = Store.find('projects', id);
    if (!p) { renderNotFound(host); return; }
    if (!p._viewed) { p.views = (p.views || 0) + 1; p._viewed = true; Store.save(true); }
    var related = Store.collection('projects').filter(function (x) { return x.id !== p.id && x.status !== 'draft'; }).slice(0, 3);
    var tags = (p.tags || []).map(function (x) { return '<span class="chip">' + e(x) + '</span>'; }).join('');
    var galleryItems = p.gallery || [];
    var gallery = galleryItems.length
      ? '<h2 style="font-size:17px;margin:26px 0 12px">' + UI.icon('image', 16) + ' ' + e(t('projGallery')) + '</h2><div class="gallery-row" id="projGalleryRow">' +
        galleryItems.map(function (g, i) { return '<button class="gal-item" data-gal="' + i + '" type="button"><img src="' + e(g) + '" alt="" draggable="false"></button>'; }).join('') +
        '</div>'
      : '';
    var files = (p.files || []).length
      ? '<h2 style="font-size:17px;margin:26px 0 12px">' + UI.icon('file', 16) + ' ' + e(t('projFiles')) + '</h2><div class="file-list">' +
      p.files.map(function (f) {
        return '<div class="file-item"><span class="file-ic">' + UI.icon('file-text', 17) + '</span>' +
          '<div class="file-meta"><b>' + e(f.name) + '</b><span>' + e(UI.fileSize(f.size)) + '</span></div>' +
          (f.dataUrl ? '<a class="btn btn-soft btn-sm" download="' + e(f.name) + '" href="' + e(f.downloadUrl || f.dataUrl) + '">' + UI.icon('download', 14) + e(t('download')) + '</a>'
            : '<button class="btn btn-ghost btn-sm" disabled title="' + e(t('fileTooBig')) + '">' + UI.icon('download', 14) + e(t('download')) + '</button>') +
          '</div>';
      }).join('') + '</div>'
      : '';

    host.innerHTML =
      backLink(null, true) +
      (p.status !== 'published' ? '<div style="margin-bottom:14px"><span class="chip warn">' + e(p.status === 'inactive' ? (I18n.getLang() === 'en' ? 'Inactive' : 'غير نشط') : t('draft')) + '</span></div>' : '') +
      (p.cover ? '<div class="detail-hero reveal" style="margin-bottom:16px"><img class="detail-cover" src="' + e(p.cover) + '" alt=""></div>' : '') +
      '<div class="detail-grid">' +
      '<div class="detail-main">' +
      '<div class="detail-title-row reveal reveal-1"><h1>' + e(p.title) + '</h1>' +
      (isOwner(p) ? '<div class="detail-actions">' +
      '<button class="btn btn-ghost btn-sm" data-act="edit-goto" data-url="' + SITE.u('projectEdit', e(p.id)) + '">' + UI.icon('pencil', 14) + e(t('edit')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="del-project" data-id="' + e(p.id) + '">' + UI.icon('trash', 14) + e(t('delete')) + '</button>' +
      '</div>' : '') + '</div>' +
      (p.summary ? '<p class="muted" style="font-size:15.5px;line-height:1.9;margin-bottom:12px">' + e(p.summary) + '</p>' : '') +
      '<div class="detail-meta">' +
      (p.role ? '<span class="pm">' + UI.icon('briefcase', 15) + e(p.role) + '</span>' : '') +
      '<span class="pm">' + UI.icon('calendar', 15) + e(UI.formatDate(p.date)) + '</span>' +
      (p.category ? '<span class="pm">' + UI.icon('folder', 15) + e(p.category) + '</span>' : '') +
      '<span class="pm">' + UI.icon('eye', 15) + (p.views || 0) + ' ' + e(t('views')) + '</span>' +
      '</div>' +
      (tags ? '<div class="stat-chips" style="margin-bottom:18px">' + tags + '</div>' : '') +
      '<div class="prose">' + UI.sanitize(p.content) + '</div>' +
      gallery + files +
      '</div>' +
      '<aside class="detail-side">' +
      '<div class="card side-card reveal reveal-2">' +
      '<div class="stat-chips" style="margin-bottom:12px">' +
      '<button class="stat-chip' + (p.liked ? ' liked' : '') + '" data-act="like-project" data-id="' + e(p.id) + '">' + UI.iconFilled('heart', 15) + ' ' + (p.likes || 0) + '</button>' +
      '<button class="stat-chip' + (p.saved ? ' liked' : '') + '" data-act="save-project" data-id="' + e(p.id) + '">' + UI.icon('bookmark', 15) + ' ' + e(p.saved ? t('saved') : t('save')) + '</button>' +
      '<button class="stat-chip" data-act="share" data-url="' + SITE.u('project', e(p.id)) + '">' + UI.icon('share-2', 15) + e(t('shareCta')) + '</button>' +
      '</div>' +
      ((p.links && (p.links.github || p.links.demo)) ?
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        (p.links.github ? '<a class="btn btn-ghost btn-block" href="' + e(p.links.github) + '" target="_blank" rel="noopener">' + UI.icon('github', 16) + e(t('source')) + '</a>' : '') +
        (p.links.demo ? '<a class="btn btn-grad btn-block" href="' + e(p.links.demo) + '" target="_blank" rel="noopener">' + UI.icon('external-link', 16) + e(t('demo')) + '</a>' : '') +
        '</div>' : '') +
      '</div>' +
      ((p.files || []).length ? '<div class="card side-card"><h3>' + UI.icon('file', 16) + e(t('projFiles')) + '</h3><div class="file-list">' +
        p.files.map(function (f) {
          return '<div class="file-item"><span class="file-ic">' + UI.icon('file-text', 16) + '</span><div class="file-meta"><b>' + e(f.name) + '</b><span>' + e(UI.fileSize(f.size)) + '</span></div>' +
            (f.dataUrl ? '<a class="btn-icon sm" download="' + e(f.name) + '" href="' + e(f.downloadUrl || f.dataUrl) + '">' + UI.icon('download', 15) + '</a>' : '') + '</div>';
        }).join('') + '</div></div>' : '') +
      '<div class="card side-card"><h3>' + UI.icon('calendar', 16) + e(t('projectUpdated')) + '</h3><p class="small muted">' + e(UI.formatDate(p.updatedAt || p.createdAt)) + '</p></div>' +
      '</aside></div>' +
      (related.length ? '<h2 style="font-size:17px;margin:30px 0 14px">' + e(t('relatedProjects')) + '</h2><div class="related-scroll">' + related.map(projCard).join('') + '</div>' : '');
  }

  document.addEventListener('click', function (ev) {
    var actEl = ev.target.closest('[data-act]');
    if (!actEl) return;
    var act = actEl.getAttribute('data-act');
    if (act === 'edit-goto') { location.href = actEl.getAttribute('data-url'); return; }
    if (act === 'like-project' || act === 'save-project') {
      var p = Store.find('projects', actEl.getAttribute('data-id'));
      if (!p) return;
      if (Store.usingServerProjects) {
        fetch(SITE.u('projectInteraction'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() },
          body: JSON.stringify({
            id: p.id,
            field: act === 'like-project' ? 'like' : 'save'
          })
        }).then(function (response) {
          if (response.redirected) {
            location.href = response.url;
            return null;
          }
          return response.json().catch(function () {
            return { ok: false, error: 'required' };
          });
        }).then(function (result) {
          if (!result) return;
          if (!result.ok) {
            UI.toast(t(result.error || 'required'), 'error');
            return;
          }
          p.liked = result.liked;
          p.saved = result.saved;
          p.likes = result.likes;
          if (act === 'save-project') UI.toast(p.saved ? t('saved') : t('save'), 'success');
          renderProjectDetail();
        }).catch(function () {
          UI.toast(t('required'), 'error');
        });
        return;
      }
      if (act === 'like-project') {
        p.liked = !p.liked;
        p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1));
        actEl.classList.add('pop');
      } else {
        p.saved = !p.saved;
        UI.toast(p.saved ? t('saved') : t('save'), 'success');
      }
      Store.save(true);
      renderProjectDetail();
    }
  });

  /* ---------- boot ---------- */

  function boot() {
    UI.init();
    if (location.search.indexOf('saved=1') >= 0) {
      UI.toast(t('profileSaved'), 'success');
      if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.hash);
    }
    try {
      if (page === 'home') {
        var hash = (location.hash || '').replace('#', '');
        if (['certificates', 'projects'].indexOf(hash) >= 0 ||
          (hash === 'saved' && SERVER_PROFILE)) activeTab = hash;
        renderHome();
      } else if (page === 'course') {
        mountChrome({});
        renderCourseDetail();
      } else if (page === 'project') {
        mountChrome({});
        renderProjectDetail();
      }
    } catch (err) {
      /* لا تُترك الصفحة فارغة عند أي خطأ */
      var host = document.getElementById('detailHost');
      if (host) {
        host.innerHTML = '<div class="empty-state"><h3>' + e(t('notFound')) + '</h3></div>';
      }
      if (window.console && console.error) console.error('[app] render error:', err);
    }
  }

  document.addEventListener('i18n:change', UI.debounce(function () {
    closeCommentsSheet();
    if (page === 'home') renderHome();
    else if (page === 'course') { mountChrome({}); renderCourseDetail(); }
    else if (page === 'project') { mountChrome({}); renderProjectDetail(); }
  }, 60));

  window.AppPage = { renderHome: renderHome, openCertModal: openCertModal, renderNotFound: renderNotFound, backLink: backLink, postCard: postCard, certCard: certCard, projCard: projCard, initCaptions: initCaptions };

  boot();
})();
