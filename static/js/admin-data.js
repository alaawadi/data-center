(function () {
  'use strict';

  function uid(p) { return Store.uid(p); }

  function ago(days, h) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    if (h != null) d.setHours(h, 20, 0, 0);
    return d.toISOString();
  }

  function back(n) {
    var d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setDate(12);
    return d.toISOString();
  }

  function seedUsers() {
    var rows = [
      { name: 'أحمد خالد الحسن', handle: 'ahmadkhaled', email: 'ahmad@example.com', phone: '0591234567', role: 'admin', verified: true, joined: back(14), bio: 'مؤسس المنصة ومشرف عام.' },
      { name: 'سارة المطيري', handle: 'sara.m', email: 'sara.m@example.com', phone: '0592233445', role: 'student', verified: true, joined: back(10), bio: 'مطورة واجهات، شغوفة بالتفاصيل.' },
      { name: 'خالد العنزي', handle: 'khaled.a', email: 'khaled.a@example.com', phone: '0563344556', role: 'student', verified: false, joined: back(8), bio: '' },
      { name: 'ريم القحطاني', handle: 'reem.o', email: 'reem.o@example.com', phone: '0594455667', role: 'student', verified: true, joined: back(7), bio: 'مصممة جرافيك ومهتمة بالبرمجة.' },
      { name: 'نورة الشمري', handle: 'noura.s', email: 'noura.s@example.com', phone: '0565566778', role: 'student', verified: false, joined: back(6), bio: '' },
      { name: 'ماجد الدوسري', handle: 'majed.d', email: 'majed.d@example.com', phone: '0596677889', role: 'student', verified: false, joined: back(5), bio: '' },
      { name: 'عبدالله باوزير', handle: 'abdullah.b', email: 'abdullah.b@example.com', phone: '0567788990', role: 'student', verified: false, joined: back(4), status: 'suspended', bio: 'حساب موقوف مؤقتاً لمخالفة قواعد المشاركة.' },
      { name: 'منى الزهراني', handle: 'mona.z', email: 'mona.z@example.com', phone: '0598899001', role: 'moderator', verified: true, joined: back(11), bio: 'مشرفة محتوى ومتابعة للتعليقات.' },
      { name: 'ليلى عبد الرحمن', handle: 'layla.a', email: 'layla@example.com', phone: '0591122334', role: 'trainer', verified: true, joined: back(16), bio: 'مدرّبة واجهات أمامية بخبرة 8 سنوات.' },
      { name: 'عمر الشهري', handle: 'omar.s', email: 'omar@example.com', phone: '0561122334', role: 'trainer', verified: true, joined: back(15), bio: 'مدرّب خلفيات وتكاملات API.' },
      { name: 'هبة نصار', handle: 'heba.n', email: 'heba@example.com', phone: '0592233441', role: 'trainer', verified: true, joined: back(13), bio: 'مدرّبة تجربة المستخدم وتصميم الواجهات.' },
      { name: 'خالد مصطفى', handle: 'khaled.m', email: 'khaled.m@example.com', phone: '0563344552', role: 'trainer', verified: true, joined: back(12), bio: 'مدرّب بايثون وتحليل البيانات.' }
    ];
    return rows.map(function (r, i) {
      return {
        id: 'usr_' + (i + 1),
        name: r.name,
        handle: r.handle,
        avatar: '',
        email: r.email,
        phone: r.phone,
        role: r.role,
        status: r.status || 'active',
        verified: !!r.verified,
        joined: r.joined,
        lastActive: ago(Math.floor(Math.random() * 5)),
        bio: r.bio || ''
      };
    });
  }

  function seedTrainers() {
    var rows = [
      { id: 'tr1', name: 'ليلى عبد الرحمن', handle: 'layla.a', specialty: 'تطوير الواجهات الأمامية', rating: 4.9, email: 'layla@example.com', phone: '0591122334', bio: 'مدرّبة واجهات أمامية بخبرة 8 سنوات في React وJavaScript، درّبت أكثر من 1200 متدرّب.', linkedin: 'https://linkedin.com/in/layla', github: 'https://github.com/layla' },
      { id: 'tr2', name: 'عمر الشهري', handle: 'omar.s', specialty: 'هندسة البرمجيات والخلفيات', rating: 4.8, email: 'omar@example.com', phone: '0561122334', bio: 'مهندس برمجيات يركّز على Node.js وتصميم الأنظمة السحابية، مهتم بأفضل ممارسات مراجعة الكود.', linkedin: '', github: 'https://github.com/omar' },
      { id: 'tr3', name: 'هبة نصار', handle: 'heba.n', specialty: 'تصميم تجربة المستخدم UI/UX', rating: 4.9, email: 'heba@example.com', phone: '0592233441', bio: 'مصممة منتجات رقمية، خبرتها في أبحاث المستخدم والنماذج التفاعلية في Figma.', linkedin: 'https://linkedin.com/in/heba', github: '' },
      { id: 'tr4', name: 'خالد مصطفى', handle: 'khaled.m', specialty: 'بايثون وتحليل البيانات', rating: 4.7, email: 'khaled.m@example.com', phone: '0563344552', bio: 'محلّل بيانات يبني مسارات تعلّم عملية حول Pandas والتصور البصري.', linkedin: '', github: 'https://github.com/khaledm' },
      { id: 'tr5', name: 'رنا الحربي', handle: 'reem.h', specialty: 'التسويق وإدارة المحتوى', rating: 4.6, email: 'reem.h@example.com', phone: '0594455678', bio: 'خبيرة تسويق رقمي ومحتوى، تشرف على مسار المحتوى والدعاية.', linkedin: '', github: '' }
    ];
    return rows.map(function (r, i) {
      r.avatar = '';
      r.status = i === 4 ? 'paused' : 'active';
      r.verified = true;
      r.joined = back(16 - i);
      r.lastActive = ago(i);
      return r;
    });
  }

  function defaultSettings() {
    return {
      name: 'مركز داتا للتدريب والتطوير',
      homepageTitle: 'مركز داتا للتدريب والتطوير',
      tagline: 'بوابة التعلّم والتطوير المهني',
      email: 'datacenteracademy1@gmail.com',
      phone: '0594810786',
      whatsapp: '972594810786',
      website: '',
      maintenance: false,
      allowSignup: true,
      defaultLang: 'ar',
      brandPalette: 'current'
    };
  }

  var COURSE_TRAINERS = ['tr1', 'tr2', 'tr3', 'tr4', 'tr2'];

  function seedEnrollments(st) {
    var students = (st.users || []).filter(function (u) { return u.role === 'student'; });
    var out = [];
    (st.certificates || []).forEach(function (c, i) {
      students.forEach(function (u, j) {
        if ((i + j) % 2 !== 0) return;
        out.push({
          id: uid('en'),
          courseId: c.id,
          userId: u.id,
          joinedAt: ago((i * 5 + j * 3) % 45 + 2),
          progress: ((i * 17 + j * 23) % 86) + 10,
          status: 'active'
        });
      });
    });
    return out;
  }

  function lessonIdsOf(courseId) {
    var c = Store.find('certificates', courseId);
    var ids = [];
    if (!c) return ids;
    (c.syllabus || []).forEach(function (sec) {
      (sec.lessons || []).forEach(function (l) { if (l.id) ids.push(l.id); });
    });
    return ids;
  }

  function seedCompletions(st) {
    var out = [];
    (st.enrollments || []).forEach(function (en) {
      var ids = lessonIdsOf(en.courseId);
      if (!ids.length) return;
      var done = Math.round(ids.length * (en.progress || 0) / 100);
      var base = new Date(en.joinedAt || Date.now());
      for (var i = 0; i < done && i < ids.length; i++) {
        var when = new Date(base.getTime());
        when.setDate(when.getDate() + i + 1);
        out.push({ id: uid('cp'), lessonId: ids[i], courseId: en.courseId, userId: en.userId, completedAt: when.toISOString() });
      }
    });
    return out;
  }

  var adminProjects = [];
  var adminStudentCertificates = [];
  var adminPointRedemptions = [];
  var adminPointRedemptionCourses = [];
  var adminWorkshops = [];
  var platformSettings = null;
  var platformSummary = {};

  function ensure() {
    var st = Store.init();
    var dirty = false;
    var trainersData = document.getElementById('admin-trainers-data');
    var databaseTrainers = trainersData ? JSON.parse(trainersData.textContent) : null;
    var studentsData = document.getElementById('admin-students-data');
    var databaseStudentsList = studentsData ? JSON.parse(studentsData.textContent) : null;
    var coursesData = document.getElementById('admin-courses-data');
    var databaseCourses = coursesData ? JSON.parse(coursesData.textContent) : null;
    var courseProgressData = document.getElementById('admin-course-progress-data');
    var databaseCourseProgress = courseProgressData ? JSON.parse(courseProgressData.textContent) : null;
    var adminProjectsEl = document.getElementById('admin-projects-data');
    adminProjects = adminProjectsEl ? JSON.parse(adminProjectsEl.textContent) : [];
    var studentCertificatesEl = document.getElementById('admin-student-certificates-data');
    adminStudentCertificates = studentCertificatesEl ? JSON.parse(studentCertificatesEl.textContent) : [];
    var pointRedemptionsEl = document.getElementById('admin-point-redemptions-data');
    adminPointRedemptions = pointRedemptionsEl ? JSON.parse(pointRedemptionsEl.textContent) : [];
    var pointRedemptionCoursesEl = document.getElementById('admin-point-redemption-courses-data');
    adminPointRedemptionCourses = pointRedemptionCoursesEl ? JSON.parse(pointRedemptionCoursesEl.textContent) : [];
    var workshopsEl = document.getElementById('admin-workshops-data');
    adminWorkshops = workshopsEl ? JSON.parse(workshopsEl.textContent) : [];
    var platformSettingsEl = document.getElementById('admin-platform-settings');
    platformSettings = platformSettingsEl ? JSON.parse(platformSettingsEl.textContent) : defaultSettings();
    var platformSummaryEl = document.getElementById('admin-settings-summary');
    platformSummary = platformSummaryEl ? JSON.parse(platformSummaryEl.textContent) : {};

    if (!Array.isArray(st.users) || !st.users.length) { st.users = seedUsers(); dirty = true; }
    if (Array.isArray(databaseTrainers)) {
      st.trainers = databaseTrainers;
      dirty = true;
    } else if (!Array.isArray(st.trainers) || !st.trainers.length) {
      st.trainers = seedTrainers();
      dirty = true;
    }
    if (Array.isArray(databaseStudentsList)) {
      st.users = databaseStudentsList;
      dirty = true;
    }
    if (Array.isArray(databaseCourses)) {
      st.certificates = databaseCourses;
      dirty = true;
    }
    if (Array.isArray(databaseCourseProgress)) {
      var databaseStudents = {};
      st.enrollments = databaseCourseProgress.map(function (progress) {
        databaseStudents[progress.user.id] = progress.user;
        return {
          id: 'db-enrollment-' + progress.id,
          databaseProgressId: progress.id,
          courseId: progress.courseId,
          userId: 'db-user-' + progress.userId,
          joinedAt: progress.joinedAt,
          progress: progress.progress,
          status: 'active'
        };
      });
      Object.keys(databaseStudents).forEach(function (id) {
        var progressUser = databaseStudents[id];
        var userId = 'db-user-' + id;
        var existingUser = st.users.filter(function (existing) { return existing.id === userId; })[0];
        if (existingUser) {
          Object.keys(progressUser).forEach(function (key) {
            if (progressUser[key] != null && progressUser[key] !== '') existingUser[key] = progressUser[key];
          });
        } else {
          progressUser.id = userId;
          progressUser.databaseId = id;
          st.users.push(progressUser);
        }
      });
      st.completions = [];
      databaseCourseProgress.forEach(function (progress) {
        (progress.completedIds || []).forEach(function (lessonId) {
          st.completions.push({
            id: 'db-completion-' + progress.id + '-' + lessonId,
            lessonId: lessonId,
            courseId: progress.courseId,
            userId: 'db-user-' + progress.userId,
            completedAt: progress.updatedAt
          });
        });
      });
      dirty = true;
    }
    if (!Array.isArray(st.activity)) { st.activity = []; dirty = true; }

    try {
      var auth = JSON.parse(localStorage.getItem('dc-auth-users') || '[]');
      if (Array.isArray(auth)) {
        auth.forEach(function (a) {
          if (!a || !a.phone) return;
          var exists = st.users.some(function (u) { return u.phone === a.phone; });
          if (exists) return;
          st.users.push({
            id: uid('usr'),
            name: a.name || ('طالب ' + String(a.phone).slice(-4)),
            handle: 's' + String(a.phone).slice(-4),
            avatar: '',
            email: '',
            phone: a.phone,
            role: 'student',
            status: 'active',
            verified: false,
            joined: new Date(a.createdAt || Date.now()).toISOString(),
            lastActive: new Date(a.createdAt || Date.now()).toISOString(),
            bio: '',
            source: 'auth'
          });
          dirty = true;
        });
      }
    } catch (err) { /* ignore */ }

    var trainerIds = st.trainers.map(function (x) { return x.id; });
    (st.certificates || []).forEach(function (c, i) {
      if (c.trainerId == null && trainerIds.length) {
        c.trainerId = COURSE_TRAINERS[i] || trainerIds[i % trainerIds.length];
        dirty = true;
      }
      if (c.status == null) { c.status = 'published'; dirty = true; }
      (c.syllabus || []).forEach(function (sec) {
        (sec.lessons || []).forEach(function (l) {
          if (!l.id) { l.id = uid('l'); dirty = true; }
        });
      });
    });
    (st.projects || []).forEach(function (p) { if (p.status == null) { p.status = 'published'; dirty = true; } });
    (st.posts || []).forEach(function (p) { if (p.status == null) { p.status = 'published'; dirty = true; } });

    if (Array.isArray(databaseCourseProgress)) {
      st.enrollments = st.enrollments.filter(function (en) {
        return en && en.courseId && en.userId && Store.find('users', en.userId) && Store.find('certificates', en.courseId);
      });
    } else if (!Array.isArray(st.enrollments) || !st.enrollments.length) { st.enrollments = seedEnrollments(st); dirty = true; }
    else {
      st.enrollments = st.enrollments.filter(function (en) {
        return en && en.courseId && en.userId && Store.find('users', en.userId) && Store.find('certificates', en.courseId);
      });
    }

    if (Array.isArray(databaseCourseProgress)) {
      st.completions = st.completions.filter(function (cp) {
        return cp && cp.lessonId && cp.userId && Store.find('users', cp.userId) && findLesson(cp.lessonId);
      });
    } else if (!Array.isArray(st.completions) || !st.completions.length) { st.completions = seedCompletions(st); dirty = true; }
    else {
      st.completions = st.completions.filter(function (cp) {
        return cp && cp.lessonId && cp.userId && Store.find('users', cp.userId) && findLesson(cp.lessonId);
      });
    }

    if (dirty) Store.save(true);
    return st;
  }

  function settings() { return platformSettings || defaultSettings(); }

  function settingsSummary() { return platformSummary; }

  function updateSettings(data) {
    platformSettings = Object.assign({}, defaultSettings(), data || {});
  }

  function logActivity(kind, entity, text) {
    var st = Store.init();
    if (!Array.isArray(st.activity)) st.activity = [];
    st.activity.unshift({ id: uid('act'), kind: kind, entity: entity, text: text, at: new Date().toISOString() });
    if (st.activity.length > 80) st.activity.length = 80;
    Store.save(true);
  }

  function lessonList() {
    var rows = [];
    Store.collection('certificates').forEach(function (c) {
      (c.syllabus || []).forEach(function (sec, si) {
        (sec.lessons || []).forEach(function (l, li) {
          rows.push({ id: l.id, course: c, section: sec, si: si, li: li, lesson: l });
        });
      });
    });
    return rows;
  }

  function findLesson(id) {
    var found = lessonList().filter(function (r) { return String(r.id) === String(id); })[0];
    return found || null;
  }

  function addLesson(courseId, sectionTitle, data) {
    var c = Store.find('certificates', courseId);
    if (!c) return null;
    c.syllabus = c.syllabus || [];
    var sec = c.syllabus.filter(function (s) { return s.title === sectionTitle; })[0];
    if (!sec) { sec = { title: sectionTitle, lessons: [] }; c.syllabus.push(sec); }
    sec.lessons = sec.lessons || [];
    var l = {
      id: uid('l'),
      title: data.title,
      duration: data.duration || '00:00',
      type: data.type || 'video',
      free: !!data.free,
      content: data.content || ''
    };
    sec.lessons.push(l);
    Store.save(true);
    logActivity('create', 'lessons', l.title);
    return l;
  }

  function updateLesson(id, data) {
    var row = findLesson(id);
    if (!row) return null;
    var l = row.lesson;
    l.title = data.title;
    l.duration = data.duration;
    l.type = data.type;
    l.free = !!data.free;
    l.content = data.content || '';
    if (data.sectionTitle && data.sectionTitle !== row.section.title) {
      row.section.lessons.splice(row.li, 1);
      var c = row.course;
      c.syllabus = c.syllabus || [];
      var sec = c.syllabus.filter(function (s) { return s.title === data.sectionTitle; })[0];
      if (!sec) { sec = { title: data.sectionTitle, lessons: [] }; c.syllabus.push(sec); }
      sec.lessons = sec.lessons || [];
      sec.lessons.push(l);
    }
    Store.save(true);
    logActivity('update', 'lessons', l.title);
    return l;
  }

  function removeLesson(id) {
    var row = findLesson(id);
    if (!row) return false;
    row.section.lessons.splice(row.li, 1);
    if (!row.section.lessons.length) row.course.syllabus.splice(row.si, 1);
    if (Array.isArray(Store.state.completions)) {
      Store.state.completions = Store.state.completions.filter(function (cp) { return cp.lessonId !== id; });
    }
    Store.save(true);
    logActivity('delete', 'lessons', row.lesson.title);
    return true;
  }

  function enrollments(courseId) {
    var rows = Store.collection('enrollments');
    if (courseId) rows = rows.filter(function (en) { return en.courseId === courseId; });
    return rows.slice();
  }

  function enrolledCount(courseId) {
    var course = Store.find('certificates', courseId);
    if (course && typeof course.enrollmentCount === 'number') return course.enrollmentCount;
    return enrollments(courseId).length;
  }

  function studentsOf(courseId) {
    return enrollments(courseId).map(function (en) {
      var u = Store.find('users', en.userId);
      return u ? { enrollment: en, user: u } : null;
    }).filter(Boolean).sort(function (a, b) {
      return new Date(a.enrollment.joinedAt || 0) - new Date(b.enrollment.joinedAt || 0);
    });
  }

  function isEnrolled(courseId, userId) {
    return Store.collection('enrollments').some(function (en) {
      return en.courseId === courseId && en.userId === userId;
    });
  }

  function enrollableUsers(courseId) {
    return Store.collection('users').filter(function (u) {
      return u.status === 'active' && u.role !== 'trainer' && !isEnrolled(courseId, u.id);
    });
  }

  function enroll(courseId, userId) {
    if (!Store.find('certificates', courseId) || !Store.find('users', userId)) return null;
    if (isEnrolled(courseId, userId)) return null;
    var en = { id: uid('en'), courseId: courseId, userId: userId, joinedAt: new Date().toISOString(), progress: 0, status: 'active' };
    if (!Array.isArray(Store.state.enrollments)) Store.state.enrollments = [];
    Store.state.enrollments.push(en);
    Store.save(true);
    var u = Store.find('users', userId);
    logActivity('create', 'enrollments', (u ? u.name : userId) + ' ← ' + courseId);
    return en;
  }

  function unenroll(id) {
    var idx = -1;
    Store.collection('enrollments').forEach(function (en, i) { if (en.id === id) idx = i; });
    if (idx < 0) return false;
    var en = Store.state.enrollments[idx];
    var u = Store.find('users', en.userId);
    Store.state.enrollments.splice(idx, 1);
    if (Array.isArray(Store.state.completions)) {
      Store.state.completions = Store.state.completions.filter(function (cp) {
        return !(cp.userId === en.userId && cp.courseId === en.courseId);
      });
    }
    Store.save(true);
    logActivity('delete', 'enrollments', (u ? u.name : en.userId) + ' ← ' + en.courseId);
    return true;
  }

  function completions(lessonId) {
    var rows = Store.collection('completions');
    if (lessonId) rows = rows.filter(function (cp) { return String(cp.lessonId) === String(lessonId); });
    return rows.slice();
  }

  function lessonCompleteCount(lessonId) {
    return completions(lessonId).length;
  }

  function lessonCompleters(lessonId) {
    return completions(lessonId).map(function (cp) {
      var u = Store.find('users', cp.userId);
      return u ? { completion: cp, user: u } : null;
    }).filter(Boolean).sort(function (a, b) {
      return new Date(a.completion.completedAt || 0) - new Date(b.completion.completedAt || 0);
    });
  }

  function stats() {
    var st = Store.state;
    var lessons = lessonList().length;
    var students = (st.users || []).filter(function (u) { return u.role === 'student'; });
    var projects = st.projects || [];
    var posts = st.posts || [];
    var certs = st.certificates || [];
    var comments = 0, likes = 0, views = 0;
    projects.forEach(function (p) { comments += (p.comments || []).length; likes += (p.likes || 0); views += (p.views || 0); });
    posts.forEach(function (p) { comments += (p.comments || []).length; likes += (p.likes || 0); views += (p.shares || 0); });
    var published = certs.filter(function (c) { return c.status !== 'draft'; }).length +
      projects.filter(function (p) { return p.status === 'published'; }).length +
      posts.filter(function (p) { return p.status === 'published'; }).length;
    var drafts = (st.users ? 0 : 0) +
      projects.filter(function (p) { return p.status === 'draft'; }).length +
      posts.filter(function (p) { return p.status === 'draft'; }).length +
      certs.filter(function (c) { return c.status === 'draft'; }).length;
    return {
      users: students.length,
      activeUsers: students.filter(function (u) { return u.status === 'active'; }).length,
      trainers: (st.trainers || []).length,
      courses: certs.length,
      lessons: lessons,
      projects: projects.length,
      dailies: posts.length,
      enrolled: (st.enrollments || []).length,
      comments: comments,
      likes: likes,
      views: views,
      published: published,
      drafts: drafts
    };
  }

  function growth(n) {
    var out = [];
    var now = new Date();
    var i;
    for (i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ y: d.getFullYear(), m: d.getMonth(), courses: 0, projects: 0, dailies: 0 });
    }
    function bucket(value) {
      if (!value) return null;
      var dd = new Date(value);
      if (isNaN(dd.getTime())) return null;
      for (var j = 0; j < out.length; j++) {
        if (out[j].y === dd.getFullYear() && out[j].m === dd.getMonth()) return out[j];
      }
      return null;
    }
    Store.collection('certificates').forEach(function (c) { var b = bucket(c.addedAt || c.date); if (b) b.courses++; });
    Store.collection('projects').forEach(function (p) { var b = bucket(p.createdAt || p.date); if (b) b.projects++; });
    Store.collection('posts').forEach(function (p) { var b = bucket(p.createdAt); if (b) b.dailies++; });
    return out;
  }

  function countBy(list, fn) {
    var map = {};
    list.forEach(function (item) {
      var k = fn(item);
      if (!k) return;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).map(function (k) { return { key: k, count: map[k] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function trainerName(st, id) {
    if (!id) return null;
    var tr = (st.trainers || []).filter(function (x) { return x.id === id; })[0];
    return tr || null;
  }

  function courseTrainerCount(id) {
    return Store.collection('certificates').filter(function (c) { return c.trainerId === id; }).length;
  }

  function recentItems(n) {
    var out = [];
    Store.collection('certificates').forEach(function (c) {
      out.push({ icon: 'graduation-cap', title: c.title, at: c.addedAt || c.date, href: SITE.u('course', c.id), kind: 'courses' });
    });
    Store.collection('projects').forEach(function (p) {
      out.push({ icon: 'folder', title: p.title, at: p.createdAt || p.date, href: SITE.u('project', p.id), kind: 'projects' });
    });
    Store.collection('posts').forEach(function (p) {
      var tmp = document.createElement('div');
      tmp.innerHTML = p.content || '';
      out.push({ icon: 'newspaper', title: (tmp.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80), at: p.createdAt, href: SITE.u('panel'), kind: 'dailies' });
    });
    out.sort(function (a, b) { return new Date(b.at || 0) - new Date(a.at || 0); });
    return out.slice(0, n || 6);
  }

  window.AdminData = {
    ensure: ensure,
    settings: settings,
    defaultSettings: defaultSettings,
    projects: function () { return Array.isArray(adminProjects) ? adminProjects.slice() : []; },
    studentCertificates: function () {
      return Array.isArray(adminStudentCertificates) ? adminStudentCertificates.slice() : [];
    },
    pointRedemptions: function () {
      return Array.isArray(adminPointRedemptions) ? adminPointRedemptions.slice() : [];
    },
    pointRedemptionCourses: function () {
      return Array.isArray(adminPointRedemptionCourses) ? adminPointRedemptionCourses.slice() : [];
    },
    workshops: function () {
      return Array.isArray(adminWorkshops) ? adminWorkshops.slice() : [];
    },
    updateWorkshop: function (workshop) {
      if (!Array.isArray(adminWorkshops)) adminWorkshops = [];
      var index = adminWorkshops.findIndex(function (item) {
        return String(item.id) === String(workshop.id);
      });
      if (index === -1) adminWorkshops.unshift(workshop);
      else adminWorkshops[index] = workshop;
    },
    removeWorkshop: function (id) {
      adminWorkshops = adminWorkshops.filter(function (item) {
        return String(item.id) !== String(id);
      });
    },
    addPointRedemption: function (redemption) {
      if (!Array.isArray(adminPointRedemptions)) adminPointRedemptions = [];
      if (!redemption || adminPointRedemptions.some(function (item) { return item.id === redemption.id; })) return;
      adminPointRedemptions.unshift(redemption);
    },
    logActivity: logActivity,
    lessonList: lessonList,
    findLesson: findLesson,
    addLesson: addLesson,
    updateLesson: updateLesson,
    removeLesson: removeLesson,
    enrollments: enrollments,
    enrolledCount: enrolledCount,
    studentsOf: studentsOf,
    isEnrolled: isEnrolled,
    enrollableUsers: enrollableUsers,
    enroll: enroll,
    unenroll: unenroll,
    completions: completions,
    lessonCompleteCount: lessonCompleteCount,
    lessonCompleters: lessonCompleters,
    stats: stats,
    growth: growth,
    countBy: countBy,
    trainerName: trainerName,
    courseTrainerCount: courseTrainerCount,
    settingsSummary: settingsSummary,
    updateSettings: updateSettings,
    recentItems: recentItems
  };
})();
