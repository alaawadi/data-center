(function () {
  'use strict';

  var t = Admin.t;
  var e = Admin.e;

  function editorRoute(type, id) {
    return '#/editor/' + type + '/' + (id ? encodeURIComponent(id) : 'new');
  }

  function stLabel(s) { return t('st' + s.charAt(0).toUpperCase() + s.slice(1)); }
  function stOpts(list) { return list.map(function (s) { return { v: s, l: stLabel(s) }; }); }
  var ROLE_OPTS = [
    { v: 'admin', l: t('roleAdmin') },
    { v: 'trainer', l: t('roleTrainer') },
    { v: 'moderator', l: t('roleModerator') },
    { v: 'student', l: t('roleStudent') }
  ];
  var TYPE_OPTS = [
    { v: 'video', l: t('typeVideo') },
    { v: 'article', l: t('typeArticle') },
    { v: 'quiz', l: t('typeQuiz') },
    { v: 'project', l: t('typeProject') }
  ];

  function lessonTypeLabel(type) {
    var labels = {
      video: 'typeVideo',
      article: 'typeArticle',
      quiz: 'typeQuiz',
      project: 'typeProject'
    };
    return t(labels[type] || 'typeVideo');
  }

  function defaultLessonQuiz() {
    return {
      instructions: '',
      maxAttempts: 3,
      questionsCount: 0,
      passScore: 60,
      shuffleQuestions: true,
      shuffleChoices: true,
      questions: [
        { text: '', explanation: '', choices: [{ text: '', correct: true }, { text: '', correct: false }] }
      ]
    };
  }

  function lessonQuizHTML(quiz) {
    var questions = quiz.questions || [];
    function quizText(key) { return I18n.t(key); }
    return '<div class="qzb" data-lesson-quiz>' +
      '<div class="qzb-head">' + UI.icon('help-circle', 16) + '<b>' + e(quizText('quizBuilder')) + '</b>' +
      '<span class="chip neutral">' + e(quizText('quizQCount').replace('{{n}}', questions.length)) + '</span></div>' +
      '<div class="qzb-settings">' +
      '<label class="qzb-field"><span>' + e(quizText('quizMaxAttempts')) + '</span>' +
      '<input class="input" type="number" min="1" max="10" data-quiz-setting="maxAttempts" value="' + e(quiz.maxAttempts) + '"></label>' +
      '<label class="qzb-field"><span>' + e(quizText('quizPassScore')) + '</span>' +
      '<input class="input" type="number" min="0" max="100" data-quiz-setting="passScore" value="' + e(quiz.passScore) + '"></label>' +
      '<label class="qzb-field qzb-wide"><span>' + e(quizText('quizPerAttempt')) + '</span>' +
      '<input class="input" type="number" min="0" data-quiz-setting="questionsCount" value="' + e(quiz.questionsCount) + '">' +
      '<i class="tiny muted">' + e(quizText('quizPerAttemptHint')) + '</i></label>' +
      '<label class="chip syl-free"><input type="checkbox" data-quiz-setting="shuffleQuestions"' + (quiz.shuffleQuestions ? ' checked' : '') + '> ' + e(quizText('quizShuffleQuestions')) + '</label>' +
      '<label class="chip syl-free"><input type="checkbox" data-quiz-setting="shuffleChoices"' + (quiz.shuffleChoices ? ' checked' : '') + '> ' + e(quizText('quizShuffleChoices')) + '</label>' +
      '</div>' +
      '<textarea class="textarea" rows="2" data-quiz-setting="instructions" placeholder="' + e(quizText('quizInstructions')) + '">' + e(quiz.instructions || '') + '</textarea>' +
      '<div class="qzb-list">' + questions.map(function (question, qi) {
        return '<div class="qzb-q" data-question="' + qi + '">' +
          '<div class="qzb-q-head"><span class="qzb-num">' + (qi + 1) + '</span>' +
          '<textarea class="textarea qzb-q-text" rows="2" data-question-text placeholder="' + e(quizText('quizQuestionPh')) + '">' + e(question.text || '') + '</textarea>' +
          '<button type="button" class="btn-icon sm danger" data-quiz-action="remove-question" title="' + e(quizText('quizRemoveQuestion')) + '">' + UI.icon('trash', 14) + '</button></div>' +
          '<div class="qzb-choices">' + (question.choices || []).map(function (choice, ci) {
            return '<div class="qzb-c' + (choice.correct ? ' is-correct' : '') + '" data-choice="' + ci + '">' +
              '<button type="button" class="qzb-radio" data-quiz-action="correct" title="' + e(quizText('quizCorrect')) + '"><i></i></button>' +
              '<input class="input" data-choice-text value="' + e(choice.text || '') + '" placeholder="' + e(quizText('quizChoicePh')) + '">' +
              '<button type="button" class="btn-icon sm danger" data-quiz-action="remove-choice" title="' + e(quizText('quizRemoveChoice')) + '">' + UI.icon('x', 13) + '</button>' +
              '</div>';
          }).join('') + '</div>' +
          '<div class="qzb-q-foot"><button type="button" class="btn btn-ghost btn-sm" data-quiz-action="add-choice"' +
          ((question.choices || []).length >= 6 ? ' disabled' : '') + '>' +
          UI.icon('plus', 13) + ' ' + e(quizText('quizAddChoice')) + '</button>' +
          '<input class="input qzb-expl" data-question-explanation value="' + e(question.explanation || '') + '" placeholder="' + e(quizText('quizExplanation')) + '"></div></div>';
      }).join('') + '</div>' +
      '<button type="button" class="btn btn-soft btn-sm" data-quiz-action="add-question"' +
      (questions.length >= 50 ? ' disabled' : '') + '>' + UI.icon('plus', 14) + ' ' + e(quizText('quizAddQuestion')) + '</button>' +
      '<div class="qzb-hint">' + UI.icon('info', 14) + ' ' + e(quizText('quizHint')) + '</div></div>';
  }

  function excerpt(html, n) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    var txt = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    n = n || 60;
    return txt.length > n ? txt.slice(0, n) + '…' : txt;
  }

  function tagsCell(tags) {
    if (!tags || !tags.length) return '<span class="tiny muted">—</span>';
    return '<div class="row-tags">' + tags.map(function (x) {
      return '<span class="chip neutral">' + e(x) + '</span>';
    }).join('') + '</div>';
  }

  function tagsVal(tags) { return (tags || []).join(', '); }
  function parseTags(s) {
    return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function iconBtn(act, id, icon, title, cls) {
    return '<button class="btn-icon ' + (cls || '') + '" data-act="' + act + '" data-id="' + e(id) + '" title="' + e(title) + '" aria-label="' + e(title) + '">' + UI.icon(icon, 15) + '</button>';
  }

  function linkBtn(href, icon, title) {
    return '<a class="btn-icon" href="' + e(href) + '" title="' + e(title) + '" aria-label="' + e(title) + '">' + UI.icon(icon, 15) + '</a>';
  }

  function viewersBtn(lessonId) {
    var rows = AdminData.lessonCompleters(lessonId);
    var n = rows.length;
    var max = 4;
    var avs = rows.slice(0, max).map(function (r) { return UI.avatarOf(r.user, 24); }).join('');
    var title = t('lessonComplete') + ' (' + n + ')';
    return '<button class="av-stack" data-act="lesson-viewers" data-id="' + e(lessonId) + '" title="' + e(title) + '" aria-label="' + e(title) + '">' +
      (n
        ? avs + (n > max ? '<span class="av-chip">+' + (n - max) + '</span>' : '')
        : '<span class="av-none">' + UI.icon('check-circle', 13) + ' 0</span>') +
      '</button>';
  }

  function bulkSet(key, entity, collection, prop, value) {
    var ids = Admin.selIds(key);
    if (!ids.length) return;
    ids.forEach(function (id) {
      var item = Store.find(collection, id);
      if (item) item[prop] = value;
    });
    Store.save(true);
    AdminData.logActivity('status', entity, ids.length + ' → ' + value);
    Admin.ts(key).sel = {};
    UI.toast(t('statusUpd'), 'success');
    Admin.renderAll();
  }

  function bulkSetStudentStatus(value) {
    var ids = Admin.selIds('users');
    if (!ids.length) return;
    var active = value === 'active';
    Promise.all(ids.map(function (id) {
      var user = Store.find('users', id);
      if (!user) return Promise.resolve();
      return fetch(SITE.u('studentStatus', user.databaseId || user.id), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ active: active })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          user.status = data.active ? 'active' : 'suspended';
        });
      });
    })).then(function () {
      Store.save(true);
      AdminData.logActivity('status', 'users', ids.length + ' → ' + value);
      Admin.ts('users').sel = {};
      UI.toast(t('statusUpd'), 'success');
      Admin.renderAll();
    }).catch(function (error) {
      Store.save(true);
      Admin.renderAll();
      UI.toast(error.message || t('saveError'), 'error');
    });
  }

  function bulkDel(key, entity, collection, after) {
    var ids = Admin.selIds(key);
    if (!ids.length) return;
    UI.confirm(t('confirmDelete')).then(function (ok) {
      if (!ok) return;
      ids.forEach(function (id) { Store.remove(collection, id); });
      if (after) after(ids);
      AdminData.logActivity('delete', entity, String(ids.length));
      Admin.ts(key).sel = {};
      UI.toast(t('deleted'), 'success');
      Admin.renderAll();
    });
  }

  function delItem(collection, id, entity, text, after) {
    UI.confirm(t('confirmDelete')).then(function (ok) {
      if (!ok) return;
      Store.remove(collection, id);
      if (after) after(id);
      AdminData.logActivity('delete', entity, text || '');
      UI.toast(t('deleted'), 'success');
      Admin.renderAll();
    });
  }

  function userCell(u) {
    return '<div class="cell-user">' + UI.avatarOf(u, 34) +
      '<div class="cu-b"><b>' + e(u.name) + (u.verified ? ' ' + UI.icon('badge-check', 14) : '') + '</b>' +
      '<span dir="ltr">@' + e(u.handle) + '</span></div></div>';
  }

  function displayOrdered(rows) {
    return rows.slice().map(function (row, index) {
      return { row: row, index: index };
    }).sort(function (left, right) {
      var leftOrder = Number(left.row.displayOrder);
      var rightOrder = Number(right.row.displayOrder);
      var leftMissing = left.row.displayOrder == null || !isFinite(leftOrder);
      var rightMissing = right.row.displayOrder == null || !isFinite(rightOrder);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (!leftMissing && leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.index - right.index;
    }).map(function (item) {
      return item.row;
    });
  }

  function orderDragHandle() {
    var label = I18n.getLang() === 'en' ? 'Drag to reorder' : 'اسحب لإعادة الترتيب';
    return '<span class="admin-order-drag-handle" aria-label="' + e(label) +
      '" title="' + e(label) + '">⠿</span>';
  }

  function trainerCell(tr) {
    return '<div class="cell-user">' + UI.avatarOf(tr, 34) +
      '<div class="cu-b"><b>' + e(tr.name) + '</b><span dir="ltr">@' + e(tr.handle) + '</span></div></div>';
  }

  function courseCell(c) {
    return '<div class="cell-cover"><img class="cc-img" src="' + e(c.image || StoreHelpers.grad('#1d4ed8', '#3b82f6', '🎓', 160, 110)) + '" alt="" loading="lazy" decoding="async">' +
      '<div class="cc-b"><b>' + e(c.title) + '</b><span>' + e(c.issuer || '') + '</span></div></div>';
  }

  function courseLessons(c) {
    var n = 0;
    (c.syllabus || []).forEach(function (s) { n += (s.lessons || []).length; });
    return n;
  }

  function trainerOpts(includePlaceholder) {
    var available = Store.collection('trainers').filter(function (tr) {
      return tr.status === 'active';
    }).map(function (tr) {
      return { v: tr.id, l: tr.name };
    });
    return [{ v: '', l: t(includePlaceholder ? 'cTrainerPick' : 'noTrainer') }].concat(available);
  }

  function freelancerSpecialtyOptions(currentValue) {
    var current = String(currentValue || '').trim();
    var categories = AdminData.freelancerCategories().filter(function (category) {
      return category && category.name &&
        (category.is_active !== false || category.name === current);
    }).slice().sort(function (left, right) {
      var leftOrder = left.display_order == null ? Number.MAX_SAFE_INTEGER : left.display_order;
      var rightOrder = right.display_order == null ? Number.MAX_SAFE_INTEGER : right.display_order;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left.name).localeCompare(String(right.name), I18n.getLang() === 'en' ? 'en' : 'ar');
    }).map(function (category) {
      return { v: category.name, l: category.name };
    });
    if (current && !categories.some(function (category) { return category.v === current; })) {
      categories.unshift({ v: current, l: current });
    }
    return [{
      v: '',
      l: I18n.getLang() === 'en' ? 'No specialization' : 'بدون تخصص'
    }].concat(categories);
  }

  function trainerLabel(id) {
    var tr = AdminData.trainerName(Store.state, id);
    return tr ? tr.name : t('noTrainer');
  }

  function courseOpts() {
    return Store.collection('certificates').map(function (c) { return { v: c.id, l: c.title }; });
  }

  function logUpd(entity, text) {
    AdminData.logActivity('update', entity, text || '');
    UI.toast(t('updated'), 'success');
    Admin.renderAll();
  }

  Admin.register('users', {
    render: function () {
      var inPersonStudentIds = {};
      var activeCohortIds = {};
      AdminData.inPersonCohorts().forEach(function (cohort) {
        if (cohort.active) activeCohortIds[String(cohort.id)] = true;
      });
      AdminData.courseRegistrationRequests().forEach(function (request) {
        if (
          request.status === 'accepted' &&
          request.studentId &&
          activeCohortIds[String(request.cohortId || '')]
        ) {
          inPersonStudentIds[String(request.studentId)] = true;
        }
      });
      return Admin.table({
        key: 'users',
        id: function (u) { return u.databaseId || u.id; },
        rows: displayOrdered(Store.collection('users').filter(function (u) { return u.role === 'student'; })),
        reorderKind: 'students',
        draggableRows: true,
        pageSize: 12,
        search: function (u) { return [u.name, u.handle, u.email, u.phone].join(' '); },
        filters: [
          { k: 'status', label: t('allStatus'), val: function (u) { return u.status; }, options: stOpts(['active', 'suspended']) },
          {
            k: 'studentType',
            label: t('studentTypeFilter'),
            filterRow: function (user, studentType) {
              var studentId = String(user.databaseId || user.id || '').replace(/^db-user-/, '');
              var isInPerson = !!inPersonStudentIds[studentId];
              return (studentType === 'in_person') === isInPerson ? user : null;
            },
            options: [
              { v: 'online', l: t('studentTypeOnline') },
              { v: 'in_person', l: t('studentTypeInPerson') }
            ]
          }
        ],
        add: { label: t('uAdd'), act: 'user-add', icon: 'user' },
        bulk: [
          { act: 'user-bulk-activate', label: t('bulkActivate'), icon: 'check' },
          { act: 'user-bulk-suspend', label: t('bulkSuspend'), icon: 'x', danger: true },
          { act: 'user-bulk-del', label: t('bulkDelete'), icon: 'trash', danger: true }
        ],
        empty: {
          icon: 'users', title: t('emptyUsers'), sub: t('emptyUsersSub'),
          action: '<button class="btn btn-primary btn-sm" data-act="user-add">' + UI.icon('plus', 15) + e(t('uAdd')) + '</button>'
        },
        columns: [
          {
            k: 'name', label: t('colName'), sortVal: function (u) { return u.name; },
            render: userCell, csv: function (u) { return u.name + ' (@' + u.handle + ')'; }
          },
          {
            k: 'contact', label: t('colContact'),
            render: function (u) {
              return '<div class="tiny muted" dir="ltr" style="text-align:start">' + e(u.email || '—') + '</div>' +
                (u.phone ? '<div class="tiny muted" dir="ltr" style="text-align:start">' + e(u.phone) + '</div>' : '');
            },
            csv: function (u) { return (u.email || '') + ' ' + (u.phone || ''); }
          },
          {
            k: 'status', label: t('colStatus'), sortVal: function (u) { return u.status; },
            render: function (u) {
              var active = u.status === 'active';
              return '<button type="button" class="st st-toggle ' + (active ? 'st-ok' : 'st-danger') +
                '" data-act="user-toggle" data-id="' + e(u.id) + '" aria-label="' +
                e(t(active ? 'studentSuspend' : 'studentActivate')) + '">' +
                e(t(active ? 'stActive' : 'stSuspended')) + '</button>';
            },
            csv: function (u) { return u.status; }
          },
          {
            k: 'certificates',
            label: t('studentCertificatesTitle'),
            sortVal: function (u) { return studentEarnedCertificates(u).length; },
            render: function (u) {
              var count = studentEarnedCertificates(u).length;
              return '<button type="button" class="chip neutral linkish" data-act="student-certificates-list" data-id="' +
                e(u.id) + '" aria-label="' + e(t('studentCertificatesTitle') + ' — ' + u.name) +
                '" style="font-weight:600">' + count + '</button>';
            },
            csv: function (u) { return studentEarnedCertificates(u).length; }
          },
          {
            k: 'activeCourses',
            label: t('studentActiveCoursesTitle'),
            sortVal: function (u) { return studentActiveCourses(u).length; },
            render: function (u) {
              var count = studentActiveCourses(u).length;
              return '<button type="button" class="chip neutral linkish" data-act="student-active-courses" data-id="' +
                e(u.id) + '" aria-label="' + e(t('studentActiveCoursesTitle') + ' — ' + u.name) +
                '" style="font-weight:600">' + count + '</button>';
            },
            csv: function (u) { return studentActiveCourses(u).length; }
          },
          {
            k: 'joined', label: t('colJoined'), sortVal: function (u) { return u.joined; },
            render: function (u) { return '<span class="tiny muted">' + e(UI.formatDate(u.joined)) + '</span>'; },
            csv: function (u) { return u.joined; }
          },
          {
            k: 'activeDevices', label: t('colRegisteredDevices'),
            sortVal: function (u) { return Number(u.activeDevices) || 0; },
            render: function (u) {
              return '<button type="button" class="chip neutral linkish" data-act="user-sessions" data-id="' +
                e(u.id) + '" aria-label="' + e(t('manageDevices') + ' — ' + u.name) +
                '" aria-haspopup="dialog" style="font-weight:600">' +
                (Number(u.activeDevices) || 0) + '</button>';
            },
            csv: function (u) { return Number(u.activeDevices) || 0; }
          },
          {
            k: 'referralVisits', label: t('colReferralVisits'),
            sortVal: function (u) { return Number(u.referralVisits) || 0; },
            render: function (u) { return '<span class="tiny">' + (Number(u.referralVisits) || 0) + '</span>'; },
            csv: function (u) { return Number(u.referralVisits) || 0; }
          },
          {
            k: 'referralPoints', label: t('colReferralPoints'),
            sortVal: function (u) { return Number(u.referralPoints) || 0; },
            render: function (u) { return '<span class="tiny">' + (Number(u.referralPoints) || 0) + '</span>'; },
            csv: function (u) { return Number(u.referralPoints) || 0; }
          },
          {
            k: 'showReferralStats',
            label: t('colReferralStatsVisibility'),
            sortVal: function (u) { return u.showReferralStats === true ? 1 : 0; },
            render: function (u) {
              var visible = u.showReferralStats === true;
              return '<button type="button" class="st st-toggle ' +
                (visible ? 'st-ok' : 'st-mute') + '" data-act="student-referral-stats-visibility" data-id="' +
                e(u.id) + '" aria-pressed="' + visible + '" aria-label="' +
                e(t(visible ? 'referralStatsVisible' : 'referralStatsHidden')) + '">' +
                e(t(visible ? 'referralStatsVisible' : 'referralStatsHidden')) + '</button>';
            },
            csv: function (u) {
              return u.showReferralStats === true ? t('referralStatsVisible') : t('referralStatsHidden');
            }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (u) {
              return orderDragHandle() +
                iconBtn('user-edit', u.id, 'pencil', t('edit')) +
                iconBtn('user-del', u.id, 'trash', t('delete'), 'danger');
            }
          }
        ].filter(Boolean)
      });
    }
  });

  function sectionField(label, hint) { return { type: 'section', label: label, hint: hint }; }
  function infoField(html) { return { type: 'info', html: html }; }
  function ifRow(k, v) {
    return '<div class="if-row"><span class="k">' + e(k) + '</span><span class="v">' + e(String(v)) + '</span></div>';
  }
  function relatedPanel(rows, chips) {
    var html = '<div class="form-info-rows">' + rows.map(function (r) { return ifRow(r[0], r[1]); }).join('') + '</div>';
    if (chips && chips.length) {
      html += '<div class="row-tags" style="margin-top:8px">' + chips.map(function (c) { return '<span class="chip neutral">' + e(String(c)) + '</span>'; }).join('') + '</div>';
    }
    return html;
  }
  function userEnrollments(u) {
    return AdminData.enrollments().filter(function (en) { return en.userId === u.id; }).map(function (en) {
      var c = Store.find('certificates', en.courseId);
      return c ? c.title : en.courseId;
    });
  }
  function userCompletionCount(u) {
    return AdminData.completions().filter(function (cp) { return cp.userId === u.id; }).length;
  }

  function studentEarnedCertificates(user) {
    var studentId = String(user.databaseId || '').replace(/^db-user-/, '');
    return AdminData.studentCertificates().filter(function (certificate) {
      if (certificate.type !== 'course' && certificate.type !== 'workshop') return false;
      if (certificate.studentId) return String(certificate.studentId) === studentId;
      return !!user.handle && certificate.studentHandle === user.handle;
    });
  }

  function studentActiveCourses(user) {
    var onlineCourses = AdminData.enrollments().filter(function (enrollment) {
      var progress = Number(enrollment.progress) || 0;
      return String(enrollment.userId) === String(user.id) &&
        enrollment.status === 'active' &&
        !enrollment.completed &&
        progress < 100 &&
        (!enrollment.expiresAt ||
          new Date(enrollment.expiresAt).getTime() > Date.now());
    }).map(function (enrollment) {
      return {
        enrollment: enrollment,
        course: Store.find('certificates', enrollment.courseId)
      };
    }).filter(function (item) {
      return !!item.course && item.course.courseType === 'online';
    });
    var studentId = String(user.databaseId || '').replace(/^db-user-/, '');
    var cohorts = AdminData.inPersonCohorts();
    var inPersonCourses = [];
    var seenCohorts = {};
    AdminData.courseRegistrationRequests().forEach(function (request) {
      if (request.status !== 'accepted' ||
          String(request.studentId || '') !== studentId ||
          !request.cohortId || seenCohorts[String(request.cohortId)]) return;
      var cohort = cohorts.find(function (item) {
        return String(item.id) === String(request.cohortId);
      });
      if (!cohort || !cohort.active) return;
      var course = Store.find('certificates', cohort.courseId);
      if (!course) return;
      seenCohorts[String(cohort.id)] = true;
      inPersonCourses.push({
        enrollment: { cohortId: cohort.id, cohortName: cohort.name },
        course: course
      });
    });
    return onlineCourses.concat(inPersonCourses);
  }

  function studentCourseHistory(user) {
    var studentId = String(user.databaseId || '').replace(/^db-user-/, '');
    var cohorts = AdminData.inPersonCohorts();
    var inPersonCourses = {};
    AdminData.courseRegistrationRequests().forEach(function (request) {
      if (request.status !== 'accepted' ||
          String(request.studentId || '') !== studentId ||
          !request.cohortId) return;
      var cohort = cohorts.find(function (item) {
        return String(item.id) === String(request.cohortId);
      });
      if (!cohort) return;
      var isCompleted = !cohort.active && cohorts.some(function (item) {
        return String(item.courseId) === String(cohort.courseId) &&
          item.active && Number(item.number) > Number(cohort.number);
      });
      if (!cohort.active && !isCompleted) return;
      var course = Store.find('certificates', cohort.courseId);
      var key = String(cohort.id);
      if (course && !inPersonCourses[key]) inPersonCourses[key] = {
        course: course,
        cohortName: cohort.name,
        completed: isCompleted
      };
    });

    var onlineCourses = AdminData.courseProgressHistory().filter(function (progress) {
      return String(progress.userId) === studentId;
    }).map(function (progress) {
      return {
        enrollment: progress,
        course: Store.find('certificates', progress.courseId)
      };
    }).filter(function (item) {
      return !!item.course && item.course.courseType === 'online';
    });

    return {
      inPerson: Object.keys(inPersonCourses).map(function (courseId) {
        return inPersonCourses[courseId];
      }),
      online: onlineCourses
    };
  }

  function userModal(id) {
    var u = id ? Store.find('users', id) : null;
    var currentSpecialty = u ? (u.specialty || u.specialization || '') : '';
    var specialtyField = {
      k: 'specialty',
      label: t('tSpecialty'),
      type: 'category-search',
      placeholder: I18n.getLang() === 'en' ? 'Search freelancer categories' : 'ابحث عن فئة',
      options: freelancerSpecialtyOptions(currentSpecialty),
      value: currentSpecialty
    };
    function isDuplicate(field, value) {
      return Store.collection('users').some(function (candidate) {
        return candidate.id !== (u && u.id) &&
          String(candidate[field] || '').toLowerCase() === value.toLowerCase();
      });
    }
    var fields = [
      sectionField(t('secBasic')),
      { k: 'name', label: t('uName'), type: 'text', required: true, maxLength: 150, value: u ? u.name : '' },
      {
        k: 'fullNameArabic', label: t('fullNameArabic'), type: 'text',
        maxLength: 150, value: u ? (u.fullNameArabic || '') : '',
        readonly: !!(u && u.fullNameArabic)
      },
      {
        k: 'fullNameEnglish', label: t('fullNameEnglish'), type: 'text',
        maxLength: 150, value: u ? (u.fullNameEnglish || '') : '', dir: 'ltr',
        readonly: !!(u && u.fullNameEnglish)
      },
      {
        k: 'role', label: t('colRole'), type: 'select',
        options: [
          { v: 'student', l: t('roleStudent') },
          { v: 'trainer', l: t('roleTrainer') }
        ],
        value: 'student'
      },
      specialtyField,
      {
        k: 'email', label: t('uEmail'), type: 'text', inputType: 'email', maxLength: 254, value: u ? u.email : '', dir: 'ltr',
        validate: function (value) {
          return value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? t('userEmailInvalid') : '';
        }
      },
      {
        k: 'phone', label: t('uPhone'), type: 'text', inputType: 'tel', required: true,
        value: u ? u.phone : '', dir: 'ltr', inputMode: 'numeric',
        autocomplete: 'off',
        pattern: '[0-9]+', numericOnly: true,
        validate: function (value) {
          if (!/^[0-9]+$/.test(value)) return t('userPhoneInvalid');
          if (isDuplicate('phone', value)) return t('userPhoneTaken');
          return '';
        }
      },
      {
        k: 'password', label: t('accountPassword'), type: 'text', inputType: 'password',
        required: !u, value: '', dir: 'ltr',
        hint: u ? t('passwordKeepHint') : ''
      },
      { k: 'avatar', label: t('uAvatar'), type: 'image', emoji: '👤', value: u ? u.avatar : '' },
      sectionField(t('secMeta')),
      { k: 'status', label: t('uStatus'), type: 'select', options: stOpts(['active', 'suspended']), value: u ? u.status : 'active' },
      { k: 'verified', label: t('uVerified'), type: 'switch', value: u ? !!u.verified : false }
    ];
    if (u) {
      var enrolled = userEnrollments(u);
      fields.push(sectionField(t('secRelated'), t('uRelatedHint')));
      fields.push(infoField(relatedPanel([
        [t('statCourses'), enrolled.length],
        [t('lessonComplete'), userCompletionCount(u)],
        [t('uSource'), u.source || '—']
      ], enrolled.slice(0, 8))));
    }
    var modal = Admin.formModal({
      title: u ? t('mUser') : t('uAdd'),
      size: 'lg',
      fields: fields,
      submit: u ? t('saveChanges') : t('uAdd'),
      onSubmit: function (v, m) {
        var isNew = !u;
        var saveButton = m.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        var isTrainer = v.role === 'trainer';
        var payload = {
          id: u ? (u.databaseId || u.id) : '',
          name: v.name,
          fullNameArabic: v.fullNameArabic,
          fullNameEnglish: v.fullNameEnglish,
          email: v.email,
          phone: v.phone,
          password: v.password || '',
          status: isTrainer && v.status === 'suspended' ? 'paused' : v.status,
          verified: v.verified,
          avatar: v.avatar
        };
        if (isTrainer) payload.specialty = v.specialty;
        else payload.specialization = v.specialty;
        fetch(SITE.u(isTrainer ? 'trainerSave' : 'studentSave'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify(payload)
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) {
              var details = data.fields
                ? Object.keys(data.fields).map(function (key) { return data.fields[key]; }).join(' ')
                : '';
              throw new Error(details || data.message || t('saveError'));
            }
            var user = isTrainer ? data.trainer : data.student;
            var users = Store.collection('users');
            var savedIndex = -1;
            for (var i = users.length - 1; i >= 0; i--) {
              if (String(users[i].databaseId || users[i].id).replace(/^db-user-/, '') === String(user.databaseId || user.id).replace(/^db-user-/, '')) {
                if (isTrainer) users.splice(i, 1);
                else savedIndex = i;
              }
            }
            if (!isTrainer) {
              if (savedIndex >= 0) users[savedIndex] = user;
              else users.unshift(user);
            } else {
              var trainers = Store.collection('trainers');
              var trainerIndex = -1;
              for (var j = 0; j < trainers.length; j++) {
                if (String(trainers[j].id) === String(user.id)) { trainerIndex = j; break; }
              }
              if (trainerIndex >= 0) trainers[trainerIndex] = user;
              else trainers.unshift(user);
            }
            Store.save(true);
            AdminData.logActivity(isNew ? 'create' : 'update', isTrainer ? 'trainers' : 'users', user.name);
            m.close();
            UI.toast(t(isNew ? 'created' : 'updated'), 'success');
            Admin.renderAll();
          });
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });
  }

  Admin.on('user-add', function () { userModal(null); });
  Admin.on('user-edit', function (el) { userModal(el.getAttribute('data-id')); });
  function openStudentSessions(user) {
    if (!user || !user.databaseId) return;
    var modal = UI.modal({
      title: t('deviceSessionsTitle') + ' — ' + user.name,
      size: 'md',
      body: '<div id="studentDeviceSessions" class="form-info-rows">' +
        e(t('deviceSessionsLoading')) + '</div>',
      footer: '<button type="button" class="btn btn-ghost" data-sessions-close>' + e(t('cancel')) + '</button>' +
        '<button type="button" class="btn btn-danger" data-sessions-revoke-all>' +
        UI.icon('log-out', 15) + e(t('deviceSessionsRevokeAll')) + '</button>'
    });
    var host = modal.body.querySelector('#studentDeviceSessions');
    var revokeAllButton = modal.el.querySelector('[data-sessions-revoke-all]');
    var sessionsUrl = SITE.u('studentSessions', user.databaseId);

    function loadSessions() {
      host.textContent = t('deviceSessionsLoading');
      fetch(sessionsUrl, { credentials: 'same-origin' })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            user.activeDevices = data.activeDevices;
            Store.save(true);
            Admin.renderAll();
            host.innerHTML = data.sessions.length
              ? data.sessions.map(function (session) {
                  return '<div class="form-info-row"><div>' +
                    '<b>' + e(session.userAgent || t('manageDevices')) + '</b>' +
                    '<div class="tiny muted">' + e(t('deviceIp')) + ': ' + e(session.ip || '—') +
                    ' · ' + e(t('deviceLastSeen')) + ': ' + e(UI.timeAgo(session.lastSeen)) + '</div></div>' +
                    '<button type="button" class="btn btn-ghost btn-sm danger" data-revoke-session="' + e(session.id) + '">' +
                    UI.icon('log-out', 14) + e(t('deviceSessionRevoke')) + '</button></div>';
                }).join('')
              : '<p class="tiny muted">' + e(t('noDeviceSessions')) + '</p>';
            revokeAllButton.disabled = data.sessions.length === 0;
          });
        })
        .catch(function (error) {
          host.textContent = error.message || t('saveError');
        });
    }

    function revokeSessions(payload, successMessage) {
      revokeAllButton.disabled = true;
      fetch(sessionsUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify(payload)
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          user.activeDevices = data.activeDevices;
          UI.toast(successMessage, 'success');
          loadSessions();
        });
      }).catch(function (error) {
        revokeAllButton.disabled = false;
        UI.toast(error.message || t('saveError'), 'error');
      });
    }

    modal.el.querySelector('[data-sessions-close]').addEventListener('click', modal.close);
    host.addEventListener('click', function (event) {
      var button = event.target.closest('[data-revoke-session]');
      if (!button) return;
      revokeSessions(
        { deviceSessionId: Number(button.getAttribute('data-revoke-session')) },
        t('deviceSessionsRevoked')
      );
    });
    revokeAllButton.addEventListener('click', function () {
      if (!user.activeDevices) return;
      UI.confirm(t('deviceSessionsConfirmAll')).then(function (confirmed) {
        if (confirmed) revokeSessions({ all: true }, t('deviceSessionsRevokedAll'));
      });
    });
    loadSessions();
  }

  Admin.on('user-sessions', function (el) {
    openStudentSessions(Store.find('users', el.getAttribute('data-id')));
  });
  Admin.on('student-referral-stats-visibility', function (el) {
    var user = Store.find('users', el.getAttribute('data-id'));
    if (!user || !user.databaseId) return;
    var visible = user.showReferralStats !== true;
    el.disabled = true;
    fetch(SITE.u('studentReferralStatsVisibility', user.databaseId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ visible: visible })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        user.showReferralStats = data.showReferralStats === true;
        Store.save(true);
        Admin.renderAll();
        UI.toast(t('referralStatsUpdated'), 'success');
      });
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });
  Admin.on('user-del', function (el) {
    var id = el.getAttribute('data-id');
    var u = Store.find('users', id);
    if (!u) return;
    var admins = Store.collection('users').filter(function (x) { return x.role === 'admin'; });
    if (u.role === 'admin' && admins.length <= 1) { UI.toast(t('guardOwner'), 'error'); return; }
    delItem('users', id, 'users', u.name);
  });
  Admin.on('user-toggle', function (el) {
    var u = Store.find('users', el.getAttribute('data-id'));
    if (!u) return;
    var active = u.status !== 'active';
    UI.confirm(t(active ? 'studentActivate' : 'studentSuspend') + '?').then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      return fetch(SITE.u('studentStatus', u.databaseId || u.id), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ active: active })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        u.status = data.active ? 'active' : 'suspended';
        Store.save(true);
        AdminData.logActivity('status', 'users', u.name + ' → ' + u.status);
        UI.toast(t('statusUpd'), 'success');
        Admin.renderAll();
      });
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });
  Admin.on('referral-points-reset', function (el) {
    var user = Store.find('users', el.getAttribute('data-id'));
    if (!user || !user.databaseId) return;
    UI.confirm(t('referralPointsResetConfirm')).then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      fetch(SITE.u('studentResetReferralPoints', user.databaseId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({})
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('referralPointsResetFailed'));
          user.referralPoints = data.points;
          AdminData.addReferralPointsReset(data.reset);
          Store.save(true);
          Admin.renderAll();
          UI.toast(t('referralPointsResetSuccess'), 'success');
        });
      }).catch(function (error) {
        el.disabled = false;
        UI.toast(error.message || t('referralPointsResetFailed'), 'error');
      });
    });
  });
  Admin.on('user-redeem-referral-points', function (el) {
    var user = Store.find('users', el.getAttribute('data-id'));
    if (!user || !user.databaseId) return;
    var courses = AdminData.pointRedemptionCourses();
    if (!courses.length) {
      UI.toast(t('redeemPointsNoCourses'), 'error');
      return;
    }

    var options = '<option value="">' + e(t('selectCourse')) + '</option>' +
      courses.map(function (course) {
        return '<option value="' + e(course.id) + '">' + e(course.title) + ' — ' + e(course.price) + '</option>';
      }).join('');
    var modal = UI.modal({
      title: t('redeemPointsTitle'),
      body: '<div class="form-note"><span>' + e(t('redeemPointsBalance')) + ': <b>' +
        (Number(user.referralPoints) || 0) + '</b></span></div>' +
        '<p class="tiny muted">' + e(t('redeemPointsHint')) + '</p>' +
        '<label class="label" for="point-redemption-course">' + e(t('redeemPointsCourse')) + '</label>' +
        '<select class="select" id="point-redemption-course">' + options + '</select>',
      footer: '<button type="button" class="btn btn-ghost" data-redemption-cancel>' + e(t('cancel')) + '</button>' +
        '<button type="button" class="btn btn-primary" data-redemption-submit>' +
        UI.icon('check', 15) + e(t('redeemPointsSubmit')) + '</button>'
    });
    modal.el.querySelector('[data-redemption-cancel]').addEventListener('click', modal.close);
    modal.el.querySelector('[data-redemption-submit]').addEventListener('click', function () {
      var submit = modal.el.querySelector('[data-redemption-submit]');
      var courseId = modal.body.querySelector('#point-redemption-course').value;
      if (!courseId) {
        UI.toast(t('selectCourse'), 'error');
        return;
      }
      submit.disabled = true;
      fetch(SITE.u('studentRedeemReferralPoints', user.databaseId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ courseId: courseId })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          user.referralPoints = data.points;
          AdminData.addPointRedemption(data.redemption);
          Store.save(true);
          AdminData.logActivity('update', 'users', user.name + ' — ' + data.redemption.courseTitle);
          modal.close();
          UI.toast(t('redeemPointsSuccess'), 'success');
          Admin.renderAll();
        });
      }).catch(function (error) {
        submit.disabled = false;
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });
  Admin.on('user-bulk-activate', function () { bulkSetStudentStatus('active'); });
  Admin.on('user-bulk-suspend', function () { bulkSetStudentStatus('suspended'); });
  Admin.on('user-bulk-del', function () {
    var ids = Admin.selIds('users');
    var admins = Store.collection('users').filter(function (x) { return x.role === 'admin'; });
    if (admins.length <= 1 && ids.indexOf('usr_1') >= 0) { UI.toast(t('guardOwner'), 'error'); return; }
    bulkDel('users', 'users', 'users');
  });

  Admin.register('trainers', {
    render: function () {
      return Admin.table({
        key: 'trainers',
        id: function (tr) { return tr.id; },
        rows: displayOrdered(Store.collection('trainers')),
        reorderKind: 'trainers',
        draggableRows: true,
        pageSize: 12,
        search: function (tr) { return [tr.name, tr.handle, tr.specialty, tr.email].join(' '); },
        filters: [
          { k: 'status', label: t('fTrainerStatus'), val: function (tr) { return tr.status; }, options: stOpts(['active', 'paused']) }
        ],
        add: { label: t('tAdd'), act: 'trainer-add', icon: 'award' },
        empty: {
          icon: 'award', title: t('emptyTrainers'), sub: t('emptyTrainersSub'),
          action: '<button class="btn btn-primary btn-sm" data-act="trainer-add">' + UI.icon('plus', 15) + e(t('tAdd')) + '</button>'
        },
        columns: [
          {
            k: 'name', label: t('colName'), sortVal: function (tr) { return tr.name; },
            render: trainerCell, csv: function (tr) { return tr.name + ' (@' + tr.handle + ')'; }
          },
          {
            k: 'specialty', label: t('colSpecialty'), sortVal: function (tr) { return tr.specialty; },
            render: function (tr) { return e(tr.specialty || '—'); }, csv: function (tr) { return tr.specialty || ''; }
          },
          {
            k: 'courses', label: t('statCourses'), sortVal: function (tr) { return AdminData.courseTrainerCount(tr.id); },
            render: function (tr) {
              var count = tr.coursesCount != null ? tr.coursesCount : AdminData.courseTrainerCount(tr.id);
              return '<button type="button" class="chip neutral linkish" data-act="trainer-courses" data-id="' +
                e(tr.id) + '" aria-label="' + e(t('trainerCoursesTitle') + ' — ' + tr.name) +
                '" style="font-weight:600">' + count + '</button>';
            },
            csv: function (tr) { return tr.coursesCount != null ? tr.coursesCount : AdminData.courseTrainerCount(tr.id); }
          },
          {
            k: 'contentPermission',
            label: t('trainerContentAllowed'),
            sortVal: function (tr) { return tr.canPublishContent === false ? 0 : 1; },
            render: function (tr) {
              var allowed = tr.canPublishContent !== false;
              var label = t(allowed ? 'trainerContentAllowed' : 'trainerContentDenied');
              return '<button type="button" class="st st-toggle ' + (allowed ? 'st-ok' : 'st-warn') +
                '" data-act="trainer-content-toggle" data-id="' + e(tr.id) + '" aria-label="' +
                e(allowed ? t('trainerDenyContent') : t('trainerAllowContent')) + '" title="' +
                e(allowed ? t('trainerDenyContent') : t('trainerAllowContent')) + '">' +
                e(label) + '</button>';
            },
            csv: function (tr) { return tr.canPublishContent === false ? t('trainerContentDenied') : t('trainerContentAllowed'); }
          },
          {
            k: 'status', label: t('colStatus'), sortVal: function (tr) { return tr.status; },
            render: function (tr) {
              var active = tr.status === 'active';
              return '<button type="button" class="st st-toggle ' + (active ? 'st-ok' : 'st-warn') +
                '" data-act="trainer-toggle" data-id="' + e(tr.id) + '" aria-label="' +
                e(t(active ? 'trainerDeactivate' : 'trainerActivate')) + '">' +
                e(t(active ? 'stActive' : 'stPaused')) + '</button>';
            },
            csv: function (tr) { return tr.status; }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (tr) {
              return orderDragHandle() +
                iconBtn('trainer-edit', tr.id, 'pencil', t('edit'));
            }
          }
        ]
      });
    }
  });

  function trainerModal(id) {
    var tr = id ? Store.find('trainers', id) : null;
    function isDuplicatePhone(value) {
      return Store.collection('trainers').some(function (candidate) {
        return candidate.id !== (tr && tr.id) && String(candidate.phone || '') === value;
      });
    }
    var fields = [
      sectionField(t('secBasic')),
      { k: 'name', label: t('uName'), type: 'text', required: true, value: tr ? tr.name : '' },
      {
        k: 'fullNameArabic', label: t('fullNameArabic'), type: 'text',
        maxLength: 150, value: tr ? (tr.fullNameArabic || '') : '',
        readonly: !!(tr && tr.fullNameArabic)
      },
      {
        k: 'fullNameEnglish', label: t('fullNameEnglish'), type: 'text',
        maxLength: 150, value: tr ? (tr.fullNameEnglish || '') : '', dir: 'ltr',
        readonly: !!(tr && tr.fullNameEnglish)
      },
      {
        k: 'specialty',
        label: t('tSpecialty'),
        type: 'category-search',
        placeholder: I18n.getLang() === 'en' ? 'Search freelancer categories' : 'ابحث عن فئة',
        options: freelancerSpecialtyOptions(tr ? tr.specialty : ''),
        value: tr ? tr.specialty : ''
      },
      { k: 'avatar', label: t('uAvatar'), type: 'image', emoji: '🎓', value: tr ? tr.avatar : '' },
      { k: 'email', label: t('uEmail'), type: 'text', value: tr ? tr.email : '', dir: 'ltr' },
      {
        k: 'phone', label: t('uPhone'), type: 'text', inputType: 'tel', required: true,
        value: tr ? tr.phone : '', dir: 'ltr', inputMode: 'numeric',
        autocomplete: 'off',
        pattern: '[0-9]+', numericOnly: true,
        validate: function (value) {
          if (!/^[0-9]+$/.test(value)) return t('userPhoneInvalid');
          if (isDuplicatePhone(value)) return t('userPhoneTaken');
          return '';
        }
      },
      {
        k: 'whatsapp', label: t('trainerWhatsapp'), type: 'text', inputType: 'tel',
        value: tr ? (tr.whatsapp || '') : '', dir: 'ltr', maxLength: 13, inputMode: 'tel',
        autocomplete: 'off', pattern: '\\+?[0-9]{1,12}',
        hint: t('trainerWhatsappHint'),
        validate: function (value) {
          return !value || /^\+?[0-9]{1,12}$/.test(value) ? '' : t('trainerWhatsappInvalid');
        }
      },
      sectionField(t('secMeta')),
      { k: 'status', label: t('uStatus'), type: 'select', options: stOpts(['active', 'paused']), value: tr ? tr.status : 'active' },
      { k: 'verified', label: t('uVerified'), type: 'switch', value: tr ? !!tr.verified : true },
      {
        k: 'password', label: t('accountPassword'), type: 'text', inputType: 'password',
        required: !tr, value: '', dir: 'ltr',
        hint: tr ? t('passwordKeepHint') : ''
      }
    ];
    if (tr) {
      fields.push(sectionField(t('secRelated'), t('tRelatedHint')));
      fields.push(infoField(relatedPanel([
        [t('statCourses'), tr.coursesCount || 0]
      ], [])));
    }
    Admin.formModal({
      title: tr ? t('mTrainer') : t('tAdd'),
      size: 'lg',
      fields: fields,
      submit: tr ? t('saveChanges') : t('tAdd'),
      onSubmit: function (v, m) {
        var isNew = !tr;
        var saveButton = m.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('trainerSave'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({
            id: tr ? tr.id : '',
            name: v.name,
            fullNameArabic: v.fullNameArabic,
            fullNameEnglish: v.fullNameEnglish,
            specialty: v.specialty,
            password: v.password || '',
            email: v.email,
            phone: v.phone,
            whatsapp: v.whatsapp,
            status: v.status,
            avatar: v.avatar,
            verified: v.verified
          })
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) {
              var details = data.fields
                ? Object.keys(data.fields).map(function (key) { return data.fields[key]; }).join(' ')
                : '';
              throw new Error(details || data.message || t('saveError'));
            }
            var rows = Store.collection('trainers');
            var savedIndex = -1;
            for (var i = 0; i < rows.length; i++) {
              if (rows[i].id === data.trainer.id) { savedIndex = i; break; }
            }
            if (savedIndex >= 0) rows[savedIndex] = data.trainer;
            else rows.unshift(data.trainer);
            Store.save(true);
            m.close();
            UI.toast(t(isNew ? 'created' : 'updated'), 'success');
            Admin.renderAll();
          });
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });
  }

  Admin.on('trainer-add', function () { trainerModal(null); });
  Admin.on('trainer-edit', function (el) { trainerModal(el.getAttribute('data-id')); });
  Admin.on('trainer-toggle', function (el) {
    var tr = Store.find('trainers', el.getAttribute('data-id'));
    if (!tr) return;
    var active = tr.status !== 'active';
    UI.confirm(t(active ? 'trainerActivate' : 'trainerDeactivate') + '?').then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      return fetch(SITE.u('trainerStatus', tr.id), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ active: active })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          tr.status = data.active ? 'active' : 'paused';
          Store.save(true);
          UI.toast(t('statusUpd'), 'success');
          Admin.renderAll();
        });
      }).catch(function (error) {
        el.disabled = false;
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });
  Admin.on('trainer-content-toggle', function (el) {
    var tr = Store.find('trainers', el.getAttribute('data-id'));
    if (!tr) return;
    var allowed = tr.canPublishContent === false;
    UI.confirm(t(allowed ? 'trainerAllowContent' : 'trainerDenyContent') + '?').then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      fetch(SITE.u('trainerContentPermission', tr.id), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ allowed: allowed })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          tr.canPublishContent = data.canPublishContent;
          Store.save(true);
          UI.toast(t('statusUpd'), 'success');
          Admin.renderAll();
        });
      }).catch(function (error) {
        el.disabled = false;
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });

  var trainingCategoryDrag = null;
  var trainingCategoryReorderSaving = false;

  function trainingCategoryRows(tbody) {
    return Array.prototype.slice.call(tbody.querySelectorAll('tr[data-row-id]'));
  }

  function trainingCategoryOrder() {
    return AdminData.trainingCategories().slice().sort(function (left, right) {
      var leftOrder = left.display_order == null ? Number.MAX_SAFE_INTEGER : left.display_order;
      var rightOrder = right.display_order == null ? Number.MAX_SAFE_INTEGER : right.display_order;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left.name || '').localeCompare(String(right.name || ''), I18n.getLang() === 'en' ? 'en' : 'ar');
    }).map(function (category) {
      return String(category.id);
    });
  }

  function animateTrainingCategoryRows(tbody, moveRows) {
    var before = new Map();
    trainingCategoryRows(tbody).forEach(function (row) {
      before.set(row, row.getBoundingClientRect().top);
    });
    moveRows();
    trainingCategoryRows(tbody).forEach(function (row) {
      if (row === (trainingCategoryDrag && trainingCategoryDrag.row)) return;
      var delta = before.get(row) - row.getBoundingClientRect().top;
      if (!delta) return;
      row.style.transition = 'none';
      row.style.transform = 'translateY(' + delta + 'px)';
      row.getBoundingClientRect();
      requestAnimationFrame(function () {
        row.style.transition = '';
        row.style.transform = '';
      });
    });
  }

  function setTrainingCategoryRowOrder(tbody, ids) {
    var rows = trainingCategoryRows(tbody);
    var rowsById = new Map();
    rows.forEach(function (row) { rowsById.set(row.getAttribute('data-row-id'), row); });
    animateTrainingCategoryRows(tbody, function () {
      ids.forEach(function (id) {
        var row = rowsById.get(String(id));
        if (row) tbody.appendChild(row);
      });
    });
  }

  function persistTrainingCategoryOrder(ids, tbody, previousIds) {
    if (trainingCategoryReorderSaving) return;
    trainingCategoryReorderSaving = true;
    var table = tbody.closest('[data-table-key="training-categories"]');
    if (table) table.classList.add('is-saving-order');
    fetch(SITE.u('trainingCategories'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ action: 'reorder', order: ids })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        AdminData.setTrainingCategories(Array.isArray(data.categories) ? data.categories : []);
        UI.toast(t('updated'), 'success');
      });
    }).catch(function (error) {
      setTrainingCategoryRowOrder(tbody, previousIds);
      UI.toast(error.message || t('saveError'), 'error');
    }).then(function () {
      trainingCategoryReorderSaving = false;
      if (table) table.classList.remove('is-saving-order');
    });
  }

  document.addEventListener('dragstart', function (event) {
    var row = event.target.closest && event.target.closest(
      'table[data-table-key="training-categories"] tbody tr[data-row-id]'
    );
    if (!row) return;
    if (trainingCategoryReorderSaving) {
      event.preventDefault();
      return;
    }
    var tbody = row.parentElement;
    trainingCategoryDrag = {
      row: row,
      tbody: tbody,
      originalIds: trainingCategoryRows(tbody).map(function (item) {
        return item.getAttribute('data-row-id');
      })
    };
    row.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.getAttribute('data-row-id'));
    }
  });

  document.addEventListener('dragover', function (event) {
    if (!trainingCategoryDrag) return;
    var target = event.target.closest && event.target.closest(
      'table[data-table-key="training-categories"] tbody tr[data-row-id]'
    );
    if (!target || target.parentElement !== trainingCategoryDrag.tbody) return;
    event.preventDefault();
    if (target === trainingCategoryDrag.row) return;
    var bounds = target.getBoundingClientRect();
    var after = event.clientY > bounds.top + bounds.height / 2;
    animateTrainingCategoryRows(trainingCategoryDrag.tbody, function () {
      trainingCategoryDrag.tbody.insertBefore(
        trainingCategoryDrag.row,
        after ? target.nextElementSibling : target
      );
    });
  });

  document.addEventListener('drop', function (event) {
    if (!trainingCategoryDrag) return;
    var targetTable = event.target.closest && event.target.closest(
      'table[data-table-key="training-categories"]'
    );
    if (!targetTable || targetTable.querySelector('tbody') !== trainingCategoryDrag.tbody) return;
    event.preventDefault();
    var drag = trainingCategoryDrag;
    trainingCategoryDrag = null;
    drag.row.classList.remove('is-dragging');
    var ids = trainingCategoryRows(drag.tbody).map(function (row) {
      return row.getAttribute('data-row-id');
    });
    if (ids.join(',') !== drag.originalIds.join(',')) {
      var fullOrder = trainingCategoryOrder();
      var page = Admin.ts('training-categories').page || 1;
      var pageStart = (page - 1) * 10;
      fullOrder.splice.apply(fullOrder, [pageStart, ids.length].concat(ids));
      persistTrainingCategoryOrder(fullOrder, drag.tbody, drag.originalIds);
    }
  });

  document.addEventListener('dragend', function () {
    if (!trainingCategoryDrag) return;
    var drag = trainingCategoryDrag;
    trainingCategoryDrag = null;
    drag.row.classList.remove('is-dragging');
    setTrainingCategoryRowOrder(drag.tbody, drag.originalIds);
  });

  Admin.register('training-categories', {
    render: function () {
      var rows = AdminData.trainingCategories().slice().sort(function (left, right) {
        var leftOrder = left.display_order == null ? Number.MAX_SAFE_INTEGER : left.display_order;
        var rightOrder = right.display_order == null ? Number.MAX_SAFE_INTEGER : right.display_order;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left.name || '').localeCompare(String(right.name || ''), I18n.getLang() === 'en' ? 'en' : 'ar');
      });
      return Admin.table({
        key: 'training-categories',
        id: function (category) { return category.id; },
        draggableRows: true,
        rows: rows,
        pageSize: Math.max(rows.length, 20),
        search: function (category) { return category.name; },
        add: { act: 'training-category-add', label: t('trainingCategoryAdd'), icon: 'plus' },
        empty: {
          icon: 'layers',
          title: t('emptyTitle'),
          sub: t('subTrainingCategories')
        },
        columns: [
          {
            k: 'name', label: t('trainingCategoryName'), sortVal: function (category) { return category.name; },
            render: function (category) { return '<b>' + e(category.name) + '</b>'; },
            csv: function (category) { return category.name; }
          },
          {
            k: 'courses', label: t('secCourses'), cls: 'num',
            sortVal: function (category) { return category.courses; },
            render: function (category) {
              return '<button type="button" class="chip neutral linkish" data-act="training-category-members" data-kind="courses" data-id="' +
                e(category.id) + '">' + (category.courses || 0) + '</button>';
            },
            csv: function (category) { return category.courses || 0; }
          },
          {
            k: 'projects', label: t('secProjects'), cls: 'num',
            sortVal: function (category) { return category.projects; },
            render: function (category) {
              return '<button type="button" class="chip neutral linkish" data-act="training-category-members" data-kind="projects" data-id="' +
                e(category.id) + '">' + (category.projects || 0) + '</button>';
            },
            csv: function (category) { return category.projects || 0; }
          },
          {
            k: 'trainers', label: t('trainingCategoryTrainers'), cls: 'num',
            sortVal: function (category) { return category.trainers; },
            render: function (category) {
              return '<button type="button" class="chip neutral linkish" data-act="training-category-members" data-kind="trainers" data-id="' +
                e(category.id) + '">' + (category.trainers || 0) + '</button>';
            },
            csv: function (category) { return category.trainers || 0; }
          },
          {
            k: 'students', label: t('trainingCategoryStudents'), cls: 'num',
            sortVal: function (category) { return category.students; },
            render: function (category) {
              return '<button type="button" class="chip neutral linkish" data-act="training-category-members" data-kind="students" data-id="' +
                e(category.id) + '">' + (category.students || 0) + '</button>';
            },
            csv: function (category) { return category.students || 0; }
          },
          {
            k: 'projects-filter',
            label: t('trainingCategoryProjectsFilter'),
            sortVal: function (category) { return category.show_in_projects_filter ? 1 : 0; },
            render: function (category) {
              var visible = category.show_in_projects_filter !== false;
              return '<button type="button" class="st st-toggle ' +
                (visible ? 'st-ok' : 'st-mute') +
                '" data-act="training-category-project-filter-toggle" data-id="' +
                e(category.id) + '">' +
                e(t(visible ? 'stActive' : 'stInactive')) + '</button>';
            },
            csv: function (category) {
              return category.show_in_projects_filter !== false ? t('stActive') : t('stInactive');
            }
          },
          {
            k: 'status', label: t('status'), sortVal: function (category) { return category.is_active ? 1 : 0; },
            render: function (category) {
              var active = category.is_active !== false;
              return '<button type="button" class="st st-toggle ' +
                (active ? 'st-ok' : 'st-mute') +
                '" data-act="training-category-toggle" data-id="' + e(category.id) + '">' +
                e(t(active ? 'stActive' : 'stInactive')) + '</button>';
            },
            csv: function (category) { return category.is_active !== false ? t('stActive') : t('stInactive'); }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (category) {
              return '<span class="training-category-drag-handle" aria-label="' + e(t('trainingCategoryDrag')) + '" title="' + e(t('trainingCategoryDrag')) + '">⠿</span>' +
                iconBtn('training-category-edit', category.id, 'pencil', t('edit')) +
                iconBtn('training-category-delete', category.id, 'trash', t('delete'), 'danger');
            }
          }
        ]
      });
    }
  });

  function trainingCategoryModal(category) {
    Admin.formModal({
      title: category ? t('trainingCategoryEdit') : t('trainingCategoryAdd'),
      fields: [
        {
          k: 'name',
          label: t('trainingCategoryName'),
          type: 'text',
          required: true,
          maxLength: 120,
          value: category ? category.name : ''
        }
      ],
      onSubmit: function (values, modal) {
        var saveButton = modal.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('trainingCategories'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({
            action: category ? 'update' : 'create',
            id: category ? category.id : '',
            name: values.name
          })
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            var rows = AdminData.trainingCategories();
            var savedIndex = rows.findIndex(function (item) {
              return String(item.id) === String(data.category.id);
            });
            if (savedIndex === -1) rows.unshift(data.category);
            else rows[savedIndex] = data.category;
            AdminData.setTrainingCategories(rows);
            modal.close();
            Admin.renderAll();
            UI.toast(t(category ? 'updated' : 'created'), 'success');
          });
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });
  }

  Admin.on('training-category-add', function () { trainingCategoryModal(null); });
  Admin.on('training-category-edit', function (el) {
    var category = AdminData.trainingCategories().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (category) trainingCategoryModal(category);
  });
  Admin.on('training-category-members', function (el) {
    var category = AdminData.trainingCategories().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!category) return;
    var kind = el.getAttribute('data-kind');
    var collection = kind === 'courses'
      ? 'certificates'
      : kind === 'projects'
        ? 'projects'
        : 'users';
    var records = Store.collection(collection).filter(function (item) {
      if (kind === 'courses' || kind === 'projects') return item.category === category.name;
      if (kind === 'trainers') return item.role === 'trainer' && item.specialty === category.name;
      if (kind === 'students') return item.role === 'student' && item.specialization === category.name;
      return false;
    });
    var title = t(kind === 'courses' ? 'secCourses'
      : kind === 'projects' ? 'secProjects'
        : kind === 'trainers' ? 'trainingCategoryTrainers' : 'trainingCategoryStudents');
    var body = records.length
      ? '<div class="enroll-list">' + records.map(function (item) {
        var name = item.title || item.name || item.fullNameArabic || item.handle || '';
        return '<div class="enroll-row">' +
          '<span class="lr-av">' + UI.icon(kind === 'courses' ? 'graduation-cap'
            : kind === 'projects' ? 'folder' : 'user', 16) + '</span>' +
          '<span class="er-b"><b>' + e(name) + '</b>' +
          (item.handle ? '<span dir="ltr">@' + e(item.handle) + '</span>' : '') +
          '</span></div>';
      }).join('') + '</div>'
      : '<p class="tiny muted">' + e(t('emptyTitle')) + '</p>';
    UI.modal({
      title: title + ' — ' + category.name,
      size: 'md',
      body: body
    });
  });
  Admin.on('training-category-toggle', function (el) {
    var category = AdminData.trainingCategories().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!category) return;
    var active = category.is_active === false;
    el.disabled = true;
    fetch(SITE.u('trainingCategories'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({
        action: 'set_active',
        id: category.id,
        active: active
      })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        var categories = AdminData.trainingCategories();
        var index = categories.findIndex(function (item) {
          return String(item.id) === String(data.category.id);
        });
        if (index !== -1) categories[index] = data.category;
        AdminData.setTrainingCategories(categories);
        Admin.renderAll();
        UI.toast(t('statusUpd'), 'success');
      });
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });
  Admin.on('training-category-project-filter-toggle', function (el) {
    var category = AdminData.trainingCategories().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!category) return;
    var visible = category.show_in_projects_filter === false;
    el.disabled = true;
    fetch(SITE.u('trainingCategories'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({
        action: 'set_projects_filter',
        id: category.id,
        visible: visible
      })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        var categories = AdminData.trainingCategories();
        var index = categories.findIndex(function (item) {
          return String(item.id) === String(data.category.id);
        });
        if (index !== -1) categories[index] = data.category;
        AdminData.setTrainingCategories(categories);
        Admin.renderAll();
        UI.toast(t('statusUpd'), 'success');
      });
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });
  Admin.on('training-category-delete', function (el) {
    UI.confirm(t('trainingCategoryDeleteConfirm')).then(function (confirmed) {
      if (!confirmed) return;
      fetch(SITE.u('trainingCategories'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ action: 'delete', id: el.getAttribute('data-id') })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          AdminData.setTrainingCategories(AdminData.trainingCategories().filter(function (category) {
            return String(category.id) !== String(data.id);
          }));
          Admin.renderAll();
          UI.toast(t('deleted'), 'success');
        });
      }).catch(function (error) {
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });

  var freelancerCategoryDrag = null;
  var freelancerCategoryReorderSaving = false;

  function freelancerCategoryOrder() {
    return AdminData.freelancerCategories().slice().sort(function (left, right) {
      var leftOrder = left.display_order == null ? Number.MAX_SAFE_INTEGER : left.display_order;
      var rightOrder = right.display_order == null ? Number.MAX_SAFE_INTEGER : right.display_order;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left.name || '').localeCompare(
        String(right.name || ''),
        I18n.getLang() === 'en' ? 'en' : 'ar'
      );
    }).map(function (category) {
      return String(category.id);
    });
  }

  function setFreelancerCategoryRowOrder(tbody, ids) {
    var rows = trainingCategoryRows(tbody);
    var rowsById = new Map();
    rows.forEach(function (row) {
      rowsById.set(row.getAttribute('data-row-id'), row);
    });
    animateTrainingCategoryRows(tbody, function () {
      ids.forEach(function (id) {
        var row = rowsById.get(String(id));
        if (row) tbody.appendChild(row);
      });
    });
  }

  function persistFreelancerCategoryOrder(ids, tbody, previousIds) {
    if (freelancerCategoryReorderSaving) return;
    freelancerCategoryReorderSaving = true;
    var table = tbody.closest('[data-table-key="freelancer-categories"]');
    if (table) table.classList.add('is-saving-order');
    fetch(SITE.u('freelancerCategories'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ action: 'reorder', order: ids })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        AdminData.setFreelancerCategories(
          Array.isArray(data.categories) ? data.categories : []
        );
        UI.toast(t('updated'), 'success');
      });
    }).catch(function (error) {
      setFreelancerCategoryRowOrder(tbody, previousIds);
      UI.toast(error.message || t('saveError'), 'error');
    }).then(function () {
      freelancerCategoryReorderSaving = false;
      if (table) table.classList.remove('is-saving-order');
    });
  }

  document.addEventListener('dragstart', function (event) {
    var row = event.target.closest && event.target.closest(
      'table[data-table-key="freelancer-categories"] tbody tr[data-row-id]'
    );
    if (!row) return;
    if (freelancerCategoryReorderSaving) {
      event.preventDefault();
      return;
    }
    var tbody = row.parentElement;
    freelancerCategoryDrag = {
      row: row,
      tbody: tbody,
      originalIds: trainingCategoryRows(tbody).map(function (item) {
        return item.getAttribute('data-row-id');
      })
    };
    row.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.getAttribute('data-row-id'));
    }
  });

  document.addEventListener('dragover', function (event) {
    if (!freelancerCategoryDrag) return;
    var target = event.target.closest && event.target.closest(
      'table[data-table-key="freelancer-categories"] tbody tr[data-row-id]'
    );
    if (!target || target.parentElement !== freelancerCategoryDrag.tbody) return;
    event.preventDefault();
    if (target === freelancerCategoryDrag.row) return;
    var bounds = target.getBoundingClientRect();
    var after = event.clientY > bounds.top + bounds.height / 2;
    animateTrainingCategoryRows(freelancerCategoryDrag.tbody, function () {
      freelancerCategoryDrag.tbody.insertBefore(
        freelancerCategoryDrag.row,
        after ? target.nextElementSibling : target
      );
    });
  });

  document.addEventListener('drop', function (event) {
    if (!freelancerCategoryDrag) return;
    var targetTable = event.target.closest && event.target.closest(
      'table[data-table-key="freelancer-categories"]'
    );
    if (!targetTable || targetTable.querySelector('tbody') !== freelancerCategoryDrag.tbody) return;
    event.preventDefault();
    var drag = freelancerCategoryDrag;
    freelancerCategoryDrag = null;
    drag.row.classList.remove('is-dragging');
    var ids = trainingCategoryRows(drag.tbody).map(function (row) {
      return row.getAttribute('data-row-id');
    });
    if (ids.join(',') !== drag.originalIds.join(',')) {
      var fullOrder = freelancerCategoryOrder();
      var page = Admin.ts('freelancer-categories').page || 1;
      var pageStart = (page - 1) * 10;
      fullOrder.splice.apply(fullOrder, [pageStart, ids.length].concat(ids));
      persistFreelancerCategoryOrder(fullOrder, drag.tbody, drag.originalIds);
    }
  });

  document.addEventListener('dragend', function () {
    if (!freelancerCategoryDrag) return;
    var drag = freelancerCategoryDrag;
    freelancerCategoryDrag = null;
    drag.row.classList.remove('is-dragging');
    setFreelancerCategoryRowOrder(drag.tbody, drag.originalIds);
  });

  Admin.register('freelancer-categories', {
    render: function () {
      var categories = AdminData.freelancerCategories().slice().sort(function (left, right) {
        var leftOrder = left.display_order == null ? Number.MAX_SAFE_INTEGER : left.display_order;
        var rightOrder = right.display_order == null ? Number.MAX_SAFE_INTEGER : right.display_order;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left.name || '').localeCompare(
          String(right.name || ''),
          I18n.getLang() === 'en' ? 'en' : 'ar'
        );
      });
      return Admin.table({
        key: 'freelancer-categories',
        id: function (category) { return category.id; },
        rows: categories,
        draggableRows: true,
        pageSize: Math.max(categories.length, 20),
        search: function (category) { return category.name; },
        add: { act: 'freelancer-category-add', label: t('trainingCategoryAdd'), icon: 'plus' },
        empty: {
          icon: 'users',
          title: t('emptyTitle'),
          sub: t('subFreelancerCategories')
        },
        columns: [
          {
            k: 'name',
            label: t('trainingCategoryName'),
            sortVal: function (category) { return category.name; },
            render: function (category) { return '<b>' + e(category.name) + '</b>'; },
            csv: function (category) { return category.name; }
          },
          {
            k: 'trainers',
            label: t('trainingCategoryTrainers'),
            cls: 'num',
            sortVal: function (category) { return category.trainers || 0; },
            render: function (category) {
              return '<button type="button" class="chip neutral linkish" data-act="freelancer-category-members" data-role="trainer" data-id="' +
                e(category.id) + '">' + (category.trainers || 0) + '</button>';
            },
            csv: function (category) { return category.trainers || 0; }
          },
          {
            k: 'students',
            label: t('trainingCategoryStudents'),
            cls: 'num',
            sortVal: function (category) { return category.students || 0; },
            render: function (category) {
              return '<button type="button" class="chip neutral linkish" data-act="freelancer-category-members" data-role="student" data-id="' +
                e(category.id) + '">' + (category.students || 0) + '</button>';
            },
            csv: function (category) { return category.students || 0; }
          },
          {
            k: 'status',
            label: t('status'),
            sortVal: function (category) { return category.is_active ? 1 : 0; },
            render: function (category) {
              var active = category.is_active !== false;
              return '<button type="button" class="st st-toggle ' +
                (active ? 'st-ok' : 'st-mute') +
                '" data-act="freelancer-category-toggle" data-id="' + e(category.id) + '">' +
                e(t(active ? 'stActive' : 'stInactive')) + '</button>';
            },
            csv: function (category) {
              return category.is_active !== false ? t('stActive') : t('stInactive');
            }
          },
          {
            k: 'actions',
            label: t('colActions'),
            cls: 'acts',
            noCsv: true,
            render: function (category) {
              return '<span class="training-category-drag-handle" aria-label="' + e(t('trainingCategoryDrag')) + '" title="' + e(t('trainingCategoryDrag')) + '">⠿</span>' +
                iconBtn('freelancer-category-edit', category.id, 'pencil', t('edit')) +
                iconBtn('freelancer-category-delete', category.id, 'trash', t('delete'), 'danger');
            }
          }
        ]
      });
    }
  });

  function freelancerCategoryModal(category) {
    Admin.formModal({
      title: category ? t('trainingCategoryEdit') : t('trainingCategoryAdd'),
      fields: [{
        k: 'name',
        label: t('trainingCategoryName'),
        type: 'text',
        required: true,
        maxLength: 120,
        value: category ? category.name : ''
      }],
      onSubmit: function (values, modal) {
        var saveButton = modal.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('freelancerCategories'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({
            action: category ? 'update' : 'create',
            id: category ? category.id : '',
            name: values.name
          })
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            var categories = AdminData.freelancerCategories();
            var index = categories.findIndex(function (item) {
              return String(item.id) === String(data.category.id);
            });
            if (index === -1) categories.unshift(data.category);
            else categories[index] = data.category;
            AdminData.setFreelancerCategories(categories);
            modal.close();
            Admin.renderAll();
            UI.toast(t(category ? 'updated' : 'created'), 'success');
          });
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });
  }

  function freelancerCategoryById(id) {
    return AdminData.freelancerCategories().filter(function (category) {
      return String(category.id) === String(id);
    })[0];
  }

  Admin.on('freelancer-category-add', function () { freelancerCategoryModal(null); });
  Admin.on('freelancer-category-edit', function (el) {
    var category = freelancerCategoryById(el.getAttribute('data-id'));
    if (category) freelancerCategoryModal(category);
  });
  Admin.on('freelancer-category-members', function (el) {
    var category = freelancerCategoryById(el.getAttribute('data-id'));
    if (!category) return;
    var role = el.getAttribute('data-role');
    var isTrainer = role === 'trainer';
    var records = Store.collection(isTrainer ? 'trainers' : 'users').filter(function (item) {
      return (isTrainer || item.role === role) &&
        (isTrainer ? item.specialty : item.specialization) === category.name;
    });
    var title = role === 'trainer' ? t('trainingCategoryTrainers') : t('trainingCategoryStudents');
    var body = records.length
      ? '<div class="enroll-list">' + records.map(function (item) {
        return '<div class="enroll-row"><span class="lr-av">' + UI.icon('user', 16) +
          '</span><span class="er-b"><b>' + e(item.name || item.handle) + '</b>' +
          (item.handle ? '<span dir="ltr">@' + e(item.handle) + '</span>' : '') +
          '</span></div>';
      }).join('') + '</div>'
      : '<p class="tiny muted">' + e(t('emptyTitle')) + '</p>';
    UI.modal({ title: title + ' — ' + category.name, size: 'md', body: body });
  });
  Admin.on('freelancer-category-toggle', function (el) {
    var category = freelancerCategoryById(el.getAttribute('data-id'));
    if (!category) return;
    el.disabled = true;
    fetch(SITE.u('freelancerCategories'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({
        action: 'set_active',
        id: category.id,
        active: category.is_active === false
      })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        var categories = AdminData.freelancerCategories();
        var index = categories.findIndex(function (item) {
          return String(item.id) === String(data.category.id);
        });
        if (index !== -1) categories[index] = data.category;
        AdminData.setFreelancerCategories(categories);
        Admin.renderAll();
        UI.toast(t('statusUpd'), 'success');
      });
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });
  Admin.on('freelancer-category-delete', function (el) {
    var category = freelancerCategoryById(el.getAttribute('data-id'));
    if (!category) return;
    UI.confirm(t('freelancerCategoryDeleteConfirm')).then(function (confirmed) {
      if (!confirmed) return;
      fetch(SITE.u('freelancerCategories'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ action: 'delete', id: category.id })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          AdminData.setFreelancerCategories(AdminData.freelancerCategories().filter(function (item) {
            return String(item.id) !== String(data.id);
          }));
          Admin.renderAll();
          UI.toast(t('deleted'), 'success');
        });
      }).catch(function (error) {
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });

  function renderCourseTable(sectionKey, inPersonOnly, inPersonKind, filterWorkshopType) {
      var workshopsOnly = inPersonKind === 'workshop';
      var courses = Store.collection('certificates').filter(function (course) {
        return (workshopsOnly || course.courseType === (inPersonOnly ? 'in_person' : 'online')) &&
          (!inPersonKind || course.inPersonKind === inPersonKind);
      });
      var cats = courses.map(function (c) { return c.category || ''; })
        .filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var filters = [
        { k: 'category', label: t('fCat'), val: function (c) { return c.category || ''; }, options: cats.map(function (x) { return { v: x, l: x }; }) },
        { k: 'trainer', label: t('fTrainer'), val: function (c) { return c.trainerId || ''; }, options: trainerOpts().filter(function (o) { return o.v; }) },
        { k: 'status', label: t('allStatus'), val: function (c) { return c.status || 'draft'; }, options: stOpts(['published', 'draft', 'archived']) }
      ];
      if (workshopsOnly && filterWorkshopType) {
        filters.unshift({
          k: 'workshopCourseType',
          label: t('workshopCourseTypeFilter'),
          val: function (course) { return course.courseType; },
          options: [
            { v: 'in_person', l: t('workshopInPerson') },
            { v: 'online', l: t('workshopOnline') }
          ]
        });
      }
      var bulkActions = inPersonKind
        ? []
        : inPersonOnly
        ? [
          { act: 'inperson-course-bulk-pub', label: t('bulkPublish'), icon: 'check' },
          { act: 'inperson-course-bulk-draft', label: t('bulkDraft'), icon: 'pencil' },
          { act: 'inperson-course-bulk-del', label: t('bulkDelete'), icon: 'trash', danger: true }
        ]
        : [
          { act: 'course-bulk-pub', label: t('bulkPublish'), icon: 'check' },
          { act: 'course-bulk-draft', label: t('bulkDraft'), icon: 'pencil' },
          { act: 'course-bulk-del', label: t('bulkDelete'), icon: 'trash', danger: true }
        ];
      return Admin.table({
        key: sectionKey,
        id: function (c) { return c.pk || c.id; },
        rows: displayOrdered(courses),
        reorderKind: inPersonOnly ? 'inperson-courses' : 'courses',
        draggableRows: !inPersonKind,
        pageSize: courses.length || 10,
        search: function (c) { return [c.title, c.issuer, c.category, trainerLabel(c.trainerId)].join(' '); },
        filters: filters,
        add: {
          label: t(workshopsOnly ? 'workshopNew' : 'cAdd'),
          act: workshopsOnly ? 'workshop-course-add' : '',
          url: workshopsOnly ? '' : editorRoute(inPersonOnly ? 'in-person-course' : 'course'),
          icon: 'plus'
        },
        bulk: bulkActions,
        empty: {
          icon: 'graduation-cap',
          title: t(workshopsOnly ? 'emptyWorkshops' : (inPersonOnly ? 'emptyInPersonCourses' : 'emptyCourses')),
          sub: t(workshopsOnly ? 'emptyWorkshopsSub' : (inPersonOnly ? 'emptyInPersonCoursesSub' : 'emptyCoursesSub')),
          action: workshopsOnly
            ? '<button type="button" class="btn btn-primary btn-sm" data-act="workshop-course-add">' +
              UI.icon('plus', 15) + e(t('workshopNew')) + '</button>'
            : '<a class="btn btn-primary btn-sm" href="' +
              editorRoute(inPersonOnly ? 'in-person-course' : 'course') + '">' +
              UI.icon('plus', 15) + e(t('cAdd')) + '</a>'
        },
        columns: [
          {
            k: 'title', label: t('colTitle'), sortVal: function (c) { return c.title; },
            render: courseCell, csv: function (c) { return c.title; }
          },
          {
            k: 'trainer', label: t('colTrainer'), sortVal: function (c) { return trainerLabel(c.trainerId); },
            render: function (c) { return '<span class="chip neutral">' + e(trainerLabel(c.trainerId)) + '</span>'; },
            csv: function (c) { return trainerLabel(c.trainerId); }
          },
          {
            k: 'category', label: t('colCategory'), sortVal: function (c) { return c.category || ''; },
            render: function (c) { return c.category ? '<span class="chip">' + e(c.category) + '</span>' : '<span class="tiny muted">—</span>'; },
            csv: function (c) { return c.category || ''; }
          },
          {
            k: 'price', label: t('colPrice'), sortVal: function (c) { return c.price || ''; },
            render: function (c) { return e(c.price || '—'); }, csv: function (c) { return c.price || ''; }
          },
          {
            k: 'lessons', label: t('colLessons'), sortVal: courseLessons, cls: 'num',
            render: function (c) {
              var count = courseLessons(c);
              return '<button class="chip neutral linkish" data-act="course-lessons" data-id="' + e(c.id) +
                '" aria-label="' + e(t('actLessons') + ' — ' + c.title) + '" style="font-weight:600">' + count + '</button>';
            },
            csv: courseLessons
          },
          {
            k: 'students', label: t('colStudents'), cls: 'num',
            sortVal: function (c) { return AdminData.enrolledCount(c.id); },
            render: function (c) {
              var n = AdminData.enrolledCount(c.id);
              return '<button class="chip neutral linkish" data-act="course-students" data-id="' + e(c.id) + '" style="font-weight:600">' + n + '</button>';
            },
            csv: function (c) { return AdminData.enrolledCount(c.id); }
          },
          {
            k: 'status', label: t('colStatus'), sortVal: function (c) { return c.status || 'draft'; },
            render: function (c) {
              var active = (c.status || 'draft') === 'published';
              return '<button type="button" class="st st-toggle ' + (active ? 'st-ok' : 'st-mute') +
                '" data-act="course-toggle" data-id="' + e(c.pk || c.id) + '" aria-label="' +
                e(t(active ? 'courseDeactivate' : 'courseActivate')) + '">' +
                e(t(active ? 'courseActive' : 'courseInactive')) + '</button>';
            },
            csv: function (c) { return (c.status || 'draft') === 'published' ? t('courseActive') : t('courseInactive'); }
          },
          {
            k: 'visibility',
            label: t(inPersonOnly ? 'courseHomepageVisibility' : 'courseVisibility'),
            sortVal: function (c) { return c.profileOnly ? 1 : 0; },
            render: function (c) {
              var isInPersonCourse = c.courseType === 'in_person';
              var showOnPlatform = !c.profileOnly;
              var visibilityKey = isInPersonCourse
                ? (showOnPlatform ? 'courseHomepageVisible' : 'courseHomepageHidden')
                : (showOnPlatform ? 'courseVisibilityPlatform' : 'courseVisibilityProfile');
              var label = t(visibilityKey);
              var action = isInPersonCourse
                ? (showOnPlatform ? 'courseHomepageConfirmHide' : 'courseHomepageConfirmShow')
                : (showOnPlatform ? 'courseVisibilityHide' : 'courseVisibilityShow');
              var title = t(action);
              return '<button type="button" class="st st-toggle ' +
                (showOnPlatform ? 'st-ok' : 'st-mute') + '" data-act="course-visibility-toggle" data-id="' +
                e(c.pk || c.id) + '" aria-label="' + e(title) + '" title="' + e(title) + '">' +
                e(label) + '</button>';
            },
            csv: function (c) {
              var visibilityKey = c.courseType === 'in_person'
                ? (c.profileOnly ? 'courseHomepageHidden' : 'courseHomepageVisible')
                : (c.profileOnly ? 'courseVisibilityProfile' : 'courseVisibilityPlatform');
              return t(visibilityKey);
            }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (c) {
              var cohortCount = AdminData.inPersonCohorts().filter(function (cohort) {
                return String(cohort.courseId) === String(c.id);
              }).length;
              var cohortButton = c.courseType === 'in_person'
                ? '<button type="button" class="chip neutral linkish" data-act="course-cohorts" data-id="' +
                  e(c.pk || c.id) + '" data-course-kind="' + e(c.inPersonKind || 'course') +
                  '" aria-label="' + e(t('courseCohorts') + ' — ' + c.title) + '">' +
                  e(t('courseCohorts')) + ' (' + cohortCount + ')</button>'
                : '';
              return '<div class="course-table-row-actions">' +
                (inPersonKind ? '' : orderDragHandle()) + cohortButton +
                linkBtn(SITE.u('course', c.id), 'eye', t('openCourse')) +
                linkBtn(
                  editorRoute(
                    workshopsOnly
                      ? (c.courseType === 'in_person' ? 'in-person-workshop' : 'online-workshop')
                      : (inPersonOnly ? 'in-person-course' : 'course'),
                    c.id
                  ),
                  'external-link',
                  t('editCourse')
                ) +
                '</div>';
            }
          }
        ]
      });
  }

  Admin.register('courses', {
    render: function () {
      return renderCourseTable('courses', false);
    }
  });

  Admin.register('in-person-courses', {
    render: function () {
      return renderCourseTable('in-person-courses', true);
    }
  });

  Admin.register('referral-points', {
    render: function () {
      var students = Store.collection('users').filter(function (user) {
        return user.role === 'student' && Number(user.referralPoints) > 0;
      });
      return '<section class="course-cohort-page-section"><h3>' +
        e(t('secReferralPoints')) + '</h3>' +
        Admin.table({
          key: 'referral-points',
          id: function (user) { return user.databaseId || user.id; },
          rows: students,
          pageSize: 10,
          search: function (user) {
            return [user.name, user.handle, user.phone, user.referralPoints].join(' ');
          },
          empty: {
            icon: 'award',
            title: t('referralPointsEmpty'),
            sub: t('subReferralPoints')
          },
          columns: [
            {
              k: 'name',
              label: t('registrationRequestName'),
              sortVal: function (user) { return user.name; },
              render: function (user) {
                return '<b>' + e(user.name) + '</b>' +
                  (user.handle ? '<span class="tiny muted" dir="ltr"> @' + e(user.handle) + '</span>' : '');
              },
              csv: function (user) { return user.name; }
            },
            {
              k: 'phone',
              label: t('registrationRequestPhone'),
              sortVal: function (user) { return user.phone; },
              render: function (user) { return '<span dir="ltr">' + e(user.phone) + '</span>'; },
              csv: function (user) { return user.phone; }
            },
            {
              k: 'points',
              label: t('referralPointsBalance'),
              sortVal: function (user) { return Number(user.referralPoints) || 0; },
              render: function (user) {
                return '<span class="chip ok">' + (Number(user.referralPoints) || 0) + '</span>';
              },
              csv: function (user) { return Number(user.referralPoints) || 0; }
            },
            {
              k: 'actions',
              label: t('colActions'),
              cls: 'acts',
              noCsv: true,
              render: function (user) {
                return '<button type="button" class="btn btn-soft btn-sm" data-act="referral-points-reset" data-id="' +
                  e(user.id) + '">' + UI.icon('refresh-cw', 14) +
                  e(t('referralPointsReset')) + '</button>';
              }
            }
          ]
        }) +
        '</section>';
    }
  });

  Admin.register('in-person-payment-invoices', {
    render: function () {
      var subscriptions = AdminData.inPersonSubscriptions();
      function money(amount, currency) {
        return e(amount || '—') + ' ' + (currency === 'USD' ? '$' : '₪');
      }
      return '<div class="course-cohort-page in-person-subscriptions-page">' +
        '<section class="course-cohort-page-section"><h3>' +
        e(t('secInPersonPaymentInvoices')) + '</h3>' +
        Admin.table({
          key: 'in-person-payment-invoices',
          id: function (request) { return request.id; },
          rows: subscriptions,
          pageSize: 12,
          add: {
            label: t('registrationRequestAdd'),
            act: 'course-registration-request-add',
            icon: 'plus'
          },
          search: function (request) {
            return [
              request.fullName,
              request.phone,
              request.courseTitle,
              request.cohortName,
              request.coursePriceAmount,
              request.paidAmount,
              request.remainingAmount,
              (request.payments || []).map(function (payment) { return payment.amount; }).join(' ')
            ].join(' ');
          },
          empty: {
            icon: 'users',
            title: t('inPersonPaymentInvoicesEmpty'),
            sub: t('subInPersonPaymentInvoices')
          },
          columns: [
            {
              k: 'student',
              label: t('registrationRequestName'),
              width: '12%',
              sortVal: function (request) { return request.fullName; },
              render: function (request) { return '<b>' + e(request.fullName) + '</b>'; },
              csv: function (request) { return request.fullName; }
            },
            {
              k: 'phone',
              label: t('registrationRequestPhone'),
              width: '12%',
              sortVal: function (request) { return request.phone; },
              render: function (request) {
                return '<span dir="ltr">' + e(request.phone) + '</span>';
              },
              csv: function (request) { return request.phone; }
            },
            {
              k: 'course',
              label: t('registrationRequestCourse'),
              width: '15%',
              sortVal: function (request) { return request.courseTitle; },
              render: function (request) { return e(request.courseTitle); },
              csv: function (request) { return request.courseTitle; }
            },
            {
              k: 'cohort',
              label: t('courseCohort'),
              width: '8%',
              sortVal: function (request) { return request.cohortName || ''; },
              render: function (request) {
                return request.cohortName ? e(request.cohortName) : '<span class="tiny muted">—</span>';
              },
              csv: function (request) { return request.cohortName || ''; }
            },
            {
              k: 'subscription',
              label: t('inPersonPaymentAmount'),
              width: '9%',
              sortVal: function (request) { return Number(request.coursePriceAmount) || 0; },
              render: function (request) {
                return '<b>' + money(request.coursePriceAmount, request.currency) + '</b>';
              },
              csv: function (request) {
                return (request.coursePriceAmount || '') + ' ' + (request.currency === 'USD' ? 'USD' : 'ILS');
              }
            },
            {
              k: 'paid',
              label: t('courseRegistrationPaidAmount'),
              width: '9%',
              sortVal: function (request) { return Number(request.paidAmount) || 0; },
              render: function (request) {
                return '<span class="chip ok">' + money(request.paidAmount || '0.00', request.currency) + '</span>';
              },
              csv: function (request) {
                return (request.paidAmount || '0.00') + ' ' + (request.currency === 'USD' ? 'USD' : 'ILS');
              }
            },
            {
              k: 'remaining',
              label: t('courseRegistrationRemaining'),
              width: '9%',
              sortVal: function (request) { return Number(request.remainingAmount) || 0; },
              render: function (request) {
                var paid = Number(request.remainingAmount) <= 0;
                return '<span class="chip ' + (paid ? 'ok' : 'warn') + '">' +
                  money(request.remainingAmount, request.currency) + '</span>';
              },
              csv: function (request) {
                return (request.remainingAmount || '') + ' ' + (request.currency === 'USD' ? 'USD' : 'ILS');
              }
            },
            {
              k: 'payments',
              label: t('courseRegistrationPaymentDetails'),
              width: '16%',
              render: function (request) { return courseRegistrationPaymentCell(request, false); },
              csv: function (request) {
                return (request.payments || []).map(function (payment) {
                  return payment.amount + ' ' + UI.formatDate(payment.createdAt);
                }).join('; ');
              }
            },
            {
              k: 'actions',
              label: t('colActions'),
              width: '10%',
              cls: 'acts',
              noCsv: true,
              render: function (request) {
                return inPersonStudentSetupActions(request);
              }
            }
          ]
        }) +
        '</section></div>';
    },
    wire: wireInPersonStudentPayments
  });

  Admin.register('online-course-invoices', {
    render: function () {
      var invoices = AdminData.onlineCourseInvoices();
      function money(amount, currency) {
        return e(amount || '—') + ' ' + (currency === 'USD' ? '$' : '₪');
      }
      return '<div class="course-cohort-page online-subscriptions-page"><section class="course-cohort-page-section"><h3>' +
        e(t('secOnlineCourseInvoices')) + '</h3>' +
        Admin.table({
          key: 'online-course-invoices',
          id: function (invoice) { return invoice.id; },
          rows: invoices,
          pageSize: 12,
          add: {
            label: t('onlineCourseInvoiceAdd'),
            act: 'online-course-invoice-add',
            icon: 'plus'
          },
          search: function (invoice) {
            return [
              invoice.studentName,
              invoice.studentPhone,
              invoice.courseTitle,
              invoice.coursePrice,
              invoice.discountValue,
              invoice.totalAmount,
              invoice.paidAmount,
              invoice.remainingAmount,
              (invoice.payments || []).map(function (payment) { return payment.amount; }).join(' ')
            ].join(' ');
          },
          empty: {
            icon: 'file-text',
            title: t('onlineCourseInvoiceEmpty'),
            sub: t('subOnlineCourseInvoices')
          },
          columns: [
            {
              k: 'student',
              label: t('onlineCourseInvoiceStudent'),
              width: '13%',
              sortVal: function (invoice) { return invoice.studentName; },
              render: function (invoice) { return '<b>' + e(invoice.studentName) + '</b>'; },
              csv: function (invoice) { return invoice.studentName; }
            },
            {
              k: 'phone',
              label: t('registrationRequestPhone'),
              width: '12%',
              sortVal: function (invoice) { return invoice.studentPhone; },
              render: function (invoice) { return '<span dir="ltr">' + e(invoice.studentPhone) + '</span>'; },
              csv: function (invoice) { return invoice.studentPhone; }
            },
            {
              k: 'course',
              label: t('onlineCourseInvoiceCourse'),
              width: '16%',
              sortVal: function (invoice) { return invoice.courseTitle; },
              render: function (invoice) { return e(invoice.courseTitle); },
              csv: function (invoice) { return invoice.courseTitle; }
            },
            {
              k: 'coursePrice',
              label: t('courseRegistrationAmountOfCourse'),
              width: '10%',
              sortVal: function (invoice) { return Number(invoice.coursePrice) || 0; },
              render: function (invoice) { return money(invoice.coursePrice, invoice.currency); },
              csv: function (invoice) { return invoice.coursePrice + ' ' + invoice.currency; }
            },
            {
              k: 'discount',
              label: t('onlineCourseInvoiceDiscount'),
              width: '9%',
              sortVal: function (invoice) { return Number(invoice.discountValue) || 0; },
              render: function (invoice) {
                if (Number(invoice.discountValue) <= 0) return '<span class="tiny muted">—</span>';
                return invoice.discountType === 'percentage'
                  ? e(invoice.discountValue) + '%'
                  : money(invoice.discountValue, invoice.currency);
              },
              csv: function (invoice) {
                return Number(invoice.discountValue) > 0
                  ? invoice.discountValue + (invoice.discountType === 'percentage' ? '%' : ' ' + invoice.currency)
                  : '';
              }
            },
            {
              k: 'subscription',
              label: t('inPersonPaymentAmount'),
              width: '10%',
              sortVal: function (invoice) { return Number(invoice.totalAmount) || 0; },
              render: function (invoice) { return '<b>' + money(invoice.totalAmount, invoice.currency) + '</b>'; },
              csv: function (invoice) { return invoice.totalAmount + ' ' + invoice.currency; }
            },
            {
              k: 'paid',
              label: t('courseRegistrationPaidAmount'),
              width: '9%',
              sortVal: function (invoice) { return Number(invoice.paidAmount) || 0; },
              render: function (invoice) {
                return '<span class="chip ok">' + money(invoice.paidAmount || '0.00', invoice.currency) + '</span>';
              },
              csv: function (invoice) { return invoice.paidAmount + ' ' + invoice.currency; }
            },
            {
              k: 'remaining',
              label: t('courseRegistrationRemaining'),
              width: '9%',
              sortVal: function (invoice) { return Number(invoice.remainingAmount) || 0; },
              render: function (invoice) {
                return '<span class="chip ' + (Number(invoice.remainingAmount) <= 0 ? 'ok' : 'warn') + '">' +
                  money(invoice.remainingAmount, invoice.currency) + '</span>';
              },
              csv: function (invoice) { return invoice.remainingAmount + ' ' + invoice.currency; }
            },
            {
              k: 'payments',
              label: t('courseRegistrationPaymentDetails'),
              width: '12%',
              render: function (invoice) { return onlineCourseInvoicePaymentCell(invoice); },
              csv: function (invoice) {
                return (invoice.payments || []).map(function (payment) {
                  return payment.amount + ' ' + UI.formatDate(payment.createdAt);
                }).join('; ');
              }
            }
          ]
        }) +
        '</section></div>';
    },
    wire: wireOnlineCourseInvoicePayments
  });

  function onlineCourseInvoicePaymentCell(invoice) {
    var payments = (invoice.payments || []).map(function (payment) {
      return '<li><span>' + e(payment.amount) + ' ' +
        (invoice.currency === 'USD' ? '$' : '₪') +
        '</span><time>' + e(UI.formatDate(payment.createdAt)) + '</time></li>';
    }).join('');
    var noBalance = Number(invoice.remainingAmount) <= 0;
    return '<div class="course-cohort-paid-editor">' +
      '<div class="course-cohort-paid-input"><input class="input" type="number" min="0.01" step="0.01"' +
      ' data-online-invoice-payment="' + e(invoice.id) + '" aria-label="' +
      e(t('courseRegistrationNewPayment')) + '" placeholder="' +
      e(t('courseRegistrationNewPayment')) + '"' +
      (noBalance ? ' disabled' : ' max="' + e(invoice.remainingAmount) + '"') +
      ' required>' +
      '<button type="button" class="btn-icon sm course-cohort-payment-confirm" data-act="online-course-invoice-payment-save" data-id="' +
      e(invoice.id) + '" aria-label="' + e(t('courseRegistrationConfirmPayment')) + '" disabled>' +
      UI.icon('check', 15) + '</button></div>' +
      '<small class="online-invoice-payment-feedback" role="alert" hidden></small>' +
      (payments ? '<ul class="course-cohort-payment-list">' + payments + '</ul>' : '') +
      '</div>';
  }

  function wireOnlineCourseInvoicePayments(host) {
    host.querySelectorAll('[data-online-invoice-payment]').forEach(function (input) {
      var button = input.parentElement.querySelector('[data-act="online-course-invoice-payment-save"]');
      function validate() {
        var amount = input.value.trim();
        var invalid = !amount || !/^\d+(?:\.\d{1,2})?$/.test(amount) ||
          !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
          Number(amount) > Number(input.max);
        input.setCustomValidity(invalid ? t('courseRegistrationPaymentFormatInvalid') : '');
        var feedback = input.closest('.course-cohort-paid-editor').querySelector('.online-invoice-payment-feedback');
        if (feedback) {
          feedback.textContent = invalid ? t('courseRegistrationPaymentFormatInvalid') : '';
          feedback.hidden = !invalid;
        }
        if (button) button.disabled = invalid;
        return !invalid;
      }
      input.addEventListener('input', validate);
      input.addEventListener('change', validate);
    });
  }

  function onlineCourseInvoiceCreateForm() {
    var students = Store.collection('users').filter(function (student) {
      return student.role === 'student' && student.databaseId;
    });
    var courses = Store.collection('certificates').filter(function (course) {
      return course.courseType === 'online' && course.status === 'published' && course.pk;
    });
    if (!students.length) {
      UI.toast(t('onlineCourseInvoiceNoStudents'), 'error');
      return;
    }
    if (!courses.length) {
      UI.toast(t('onlineCourseInvoiceNoCourses'), 'error');
      return;
    }

    var modal = Admin.formModal({
      title: t('onlineCourseInvoiceAddTitle'),
      size: 'md',
      fields: [
        {
          k: 'studentId',
          label: t('onlineCourseInvoiceStudent'),
          type: 'invoice-search',
          required: true,
          placeholder: t('onlineCourseInvoiceStudentSearch')
        },
        {
          k: 'courseId',
          label: t('onlineCourseInvoiceCourse'),
          type: 'invoice-search',
          required: true,
          placeholder: t('onlineCourseInvoiceCourseSearch')
        },
        {
          k: 'discountType',
          label: t('onlineCourseInvoiceDiscountType'),
          type: 'select',
          value: 'fixed',
          options: [
            { v: 'fixed', l: t('onlineCourseInvoiceDiscountFixed') },
            { v: 'percentage', l: t('onlineCourseInvoiceDiscountPercentage') }
          ]
        },
        {
          k: 'discountValue',
          label: t('onlineCourseInvoiceDiscountValue'),
          type: 'number',
          min: 0,
          step: '0.01',
          value: '',
          hint: t('onlineCourseInvoiceDiscountHint'),
          validate: function (value) {
            return !value || /^\d+(?:\.\d{1,2})?$/.test(value)
              ? '' : t('onlineCourseInvoiceDiscountInvalid');
          }
        }
      ],
      submit: t('onlineCourseInvoiceCreateButton'),
      onSubmit: function (values, modal) {
        if (values.discountValue === '') values.discountValue = 0;
        var saveButton = modal.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('onlineCourseInvoiceCreate'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify(values)
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('onlineCourseInvoiceCreateFailed'));
            return data;
          });
        }).then(function (data) {
          AdminData.addOnlineCourseInvoice(data.invoice);
          if (data.enrollmentCreated) {
            if (!Array.isArray(Store.state.enrollments)) Store.state.enrollments = [];
            Store.state.enrollments.push({
              id: 'db-enrollment-' + data.invoice.progressId,
              databaseProgressId: data.invoice.progressId,
              courseId: data.invoice.courseId,
              userId: 'db-user-' + data.invoice.studentId,
              joinedAt: data.invoice.createdAt,
              progress: 0,
              completed: false,
              status: 'active'
            });
            AdminData.updateCourseProgressHistory({
              id: String(data.invoice.progressId),
              courseId: data.invoice.courseId,
              userId: String(data.invoice.studentId),
              joinedAt: data.invoice.createdAt,
              expiresAt: '',
              progress: 0,
              completed: false
            });
            var course = Store.find('certificates', data.invoice.courseId);
            if (course) course.enrollmentCount = (Number(course.enrollmentCount) || 0) + 1;
          }
          modal.close();
          Admin.renderAll();
          UI.toast(t('onlineCourseInvoiceCreateSuccess'), 'success');
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('onlineCourseInvoiceCreateFailed'), 'error');
        });
        return false;
      }
    });
    function bindInvoiceSearch(key, records, searchText, getLabel, emptyMessage) {
      var input = modal.body.querySelector('[data-fk-search="' + key + '"]');
      var value = modal.body.querySelector('[data-fk="' + key + '"]');
      var results = modal.body.querySelector('#' + key + '-results');

      function closeResults() {
        results.hidden = true;
        input.setAttribute('aria-expanded', 'false');
      }

      function renderResults(query) {
        var normalizedQuery = query.trim().toLocaleLowerCase();
        if (!normalizedQuery) {
          closeResults();
          return;
        }
        var matches = records.filter(function (record) {
          return searchText(record).toLocaleLowerCase().indexOf(normalizedQuery) !== -1;
        }).slice(0, 10);
        results.innerHTML = matches.length
          ? matches.map(function (record) {
            var label = getLabel(record);
            return '<button class="online-invoice-search-option" type="button" role="option"' +
              ' aria-selected="false" data-invoice-search-option="' + e(key) +
              '" data-option-value="' + e(record.databaseId || record.pk) +
              '" data-option-label="' + e(label) + '">' + e(label) + '</button>';
          }).join('')
          : '<div class="online-invoice-search-empty" role="presentation">' +
            e(emptyMessage) + '</div>';
        results.hidden = false;
        input.setAttribute('aria-expanded', 'true');
      }

      input.addEventListener('input', function () {
        if (value.value) {
          value.value = '';
          value.dispatchEvent(new Event('input', { bubbles: true }));
        }
        renderResults(input.value);
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeResults();
        } else if (event.key === 'ArrowDown' && !results.hidden) {
          var firstOption = results.querySelector('[data-invoice-search-option]');
          if (firstOption) {
            event.preventDefault();
            firstOption.focus();
          }
        }
      });
      results.addEventListener('click', function (event) {
        var option = event.target.closest('[data-invoice-search-option]');
        if (!option) return;
        value.value = option.getAttribute('data-option-value');
        input.value = option.getAttribute('data-option-label');
        value.dispatchEvent(new Event('input', { bubbles: true }));
        closeResults();
        input.focus();
      });
      modal.body.addEventListener('click', function (event) {
        if (!event.target.closest('.online-invoice-search-picker')) closeResults();
      });
    }

    bindInvoiceSearch(
      'studentId',
      students,
      function (student) {
        return [student.name, student.phone, student.email].filter(Boolean).join(' ');
      },
      function (student) {
        return [student.name, student.phone || student.email].filter(Boolean).join(' — ');
      },
      t('onlineCourseInvoiceStudentNoMatches')
    );
    bindInvoiceSearch(
      'courseId',
      courses,
      function (course) { return course.title || ''; },
      function (course) { return course.title || ''; },
      t('onlineCourseInvoiceCourseNoMatches')
    );
  }

  Admin.on('online-course-invoice-add', function () {
    onlineCourseInvoiceCreateForm();
  });

  Admin.on('online-course-invoice-payment-save', function (button) {
    var invoiceId = button.getAttribute('data-id');
    var input = document.querySelector('[data-online-invoice-payment="' + invoiceId + '"]');
    if (!input) return;
    if (!input.value.trim() || !/^\d+(?:\.\d{1,2})?$/.test(input.value.trim()) ||
        !Number.isFinite(Number(input.value)) || Number(input.value) <= 0 ||
        Number(input.value) > Number(input.max)) {
      input.setCustomValidity(t('courseRegistrationPaymentFormatInvalid'));
      input.reportValidity();
      return;
    }

    button.disabled = true;
    input.disabled = true;
    fetch(SITE.u('onlineCourseInvoicePayment', invoiceId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ amount: input.value })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('onlineCourseInvoicePaymentFailed'));
        }
        return data;
      });
    }).then(function (data) {
      AdminData.updateOnlineCourseInvoice(data.invoice);
      Admin.renderAll();
      UI.toast(t('onlineCourseInvoicePaymentSaved'), 'success');
    }).catch(function (error) {
      button.disabled = false;
      input.disabled = false;
      UI.toast(error.message || t('onlineCourseInvoicePaymentFailed'), 'error');
    });
  });

  function courseRegistrationPaymentCell(request, showTotals) {
    var currencySymbol = request.currency === 'USD' ? '$' : '₪';
    var payments = (request.payments || []).map(function (payment) {
      return '<li><span>' + e(payment.amount) + ' ' + currencySymbol +
        '</span><time>' + e(UI.formatDate(payment.createdAt)) + '</time></li>';
    }).join('');
    return '<div class="course-cohort-paid-editor">' +
      '<div class="course-cohort-paid-input"><input class="input" type="number" min="0.01" step="0.01"' +
      (request.remainingAmount !== '' && request.remainingAmount != null
        ? ' max="' + e(request.remainingAmount) + '"' : '') +
      ' data-registration-paid-amount="' + e(request.id) + '" aria-label="' +
      e(t('courseRegistrationNewPayment')) + '" placeholder="' +
      e(t('courseRegistrationNewPayment')) + '"' +
      ' aria-describedby="course-payment-feedback-' + e(request.id) + '"' +
      (request.remainingAmount === '' || Number(request.remainingAmount) <= 0 ? ' disabled' : '') +
      ' required>' +
      '<button type="button" class="btn-icon sm course-cohort-payment-confirm" data-act="course-registration-paid-amount-save" data-id="' +
      e(request.id) + '" title="' + e(t('courseRegistrationConfirmPayment')) +
      '" aria-label="' + e(t('courseRegistrationConfirmPayment')) + '"' +
      ' disabled' +
      '>' + UI.icon('check', 15) + '</button></div>' +
      '<small class="course-cohort-payment-feedback" id="course-payment-feedback-' +
      e(request.id) + '" role="alert" hidden></small>' +
      (showTotals === false ? '' :
        '<small>' + e(t('courseRegistrationAmountOfCourse')) + ': ' +
        e(request.coursePriceAmount || '—') + ' ' + currencySymbol + '</small>' +
        '<small>' + e(t('courseRegistrationPaidAmount')) + ': ' +
        e(request.paidAmount || '0.00') + ' ' + currencySymbol + '</small>' +
        '<small class="course-cohort-remaining">' + e(t('courseRegistrationRemaining')) + ': ' +
        e(request.remainingAmount || '—') + ' ' + currencySymbol + '</small>') +
      (payments ? '<ul class="course-cohort-payment-list">' + payments + '</ul>' : '') +
      '</div>';
  }

  function inPersonStudentSetupActions(request, includeEdit) {
    var linkAvailable = isStudentSetupLinkAvailable(request);
    var actions = request.studentId
      ? '<small class="chip ok">' + UI.icon('check-circle', 13) +
        e(t(request.hasLoggedIn ? 'studentHasOnlineAccount' : 'studentAccountCreatedLabel')) + '</small>'
      : '';
    actions += includeEdit === false ? '' :
      '<button type="button" class="btn-icon" data-act="in-person-student-edit" data-id="' +
      e(request.id) + '" title="' + e(t('studentEdit')) + '" aria-label="' +
      e(t('studentEdit')) + '">' + UI.icon('pencil', 15) + '</button>';
    actions += request.accountReady
      ? '<small class="tiny muted">' + e(t('studentAccountReady')) + '</small>'
      : '<button type="button" class="btn-icon" data-act="student-setup-link-create" data-id="' +
        e(request.id) + '" title="' + e(t('studentSetupLinkCreate')) + '" aria-label="' +
        e(t('studentSetupLinkCreate')) + '">' + UI.icon('link', 15) + '</button>';
    actions += '<button type="button" class="btn-icon" data-act="student-setup-link-copy" data-id="' +
      e(request.id) + '" title="' + e(t('studentSetupLinkCopy')) + '" aria-label="' +
      e(t('studentSetupLinkCopy')) + '"' + (linkAvailable ? '' : ' disabled') + '>' +
      UI.icon('copy', 15) + '</button>';
    actions += '<button type="button" class="btn-icon" data-act="student-setup-link-qr" data-id="' +
      e(request.id) + '" title="' + e(t('studentSetupLinkShowQr')) + '" aria-label="' +
      e(t('studentSetupLinkShowQr')) + '"' + (linkAvailable ? '' : ' disabled') + '>' +
      UI.icon('image', 15) + '</button>';
    return '<div class="inperson-student-setup-actions">' + actions + '</div>';
  }

  function copyStudentSetupLink(link) {
    function copyWithLegacyApi() {
      var input = document.createElement('textarea');
      input.value = link;
      input.setAttribute('readonly', '');
      input.setAttribute('aria-hidden', 'true');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
      try {
        return document.execCommand('copy');
      } catch (error) {
        return false;
      } finally {
        document.body.removeChild(input);
      }
    }

    if (window.navigator.clipboard && window.isSecureContext) {
      return Promise.resolve()
        .then(function () { return window.navigator.clipboard.writeText(link); })
        .catch(function () {
          if (copyWithLegacyApi()) return;
          throw new Error(t('studentSetupLinkCopyFailed'));
        });
    }
    if (copyWithLegacyApi()) return Promise.resolve();
    return Promise.reject(new Error(t('studentSetupLinkCopyFailed')));
  }

  function isStudentSetupLinkAvailable(request) {
    var expires = Date.parse(request.setupLinkExpiresAt || '');
    return !!request.setupUrl && Number.isFinite(expires) && expires > Date.now();
  }

  function showStudentAccountCreatedModal(request) {
    var accountReady = !!request.accountReady;
    var hasLoggedIn = !!request.hasLoggedIn;
    var hasSetupLink = !accountReady && request.setupUrl && request.setupQrImage;
    UI.modal({
      title: t('studentAccountCreated'),
      size: 'sm',
      body: hasLoggedIn
        ? '<p class="chip ok">' + UI.icon('check-circle', 16) +
          e(t('studentAccountAlreadyReady')) + '</p>'
        : hasSetupLink
        ? '<div class="workshop-qr-preview"><img src="' + e(request.setupQrImage) +
          '" alt="' + e(t('studentSetupLinkQrTitle')) + '">' +
          '<p class="tiny muted">' + e(t('studentSetupLinkExpires')) + ': ' +
          e(UI.formatDate(request.setupLinkExpiresAt)) + '</p>' +
          '<button type="button" class="btn btn-primary btn-sm" data-act="student-setup-link-copy" data-id="' +
          e(request.id) + '">' + UI.icon('copy', 14) + e(t('studentSetupLinkCopy')) + '</button>' +
          '<code dir="ltr" style="overflow-wrap:anywhere">' +
          e(request.setupUrl) + '</code></div>'
        : '<p class="chip ok">' + UI.icon('check-circle', 16) +
          e(t('studentAccountCreatedLabel')) + '</p>'
    });
  }

  function showAcceptedStudentAccount(request) {
    if (request.setupUrl && request.setupQrImage) {
      showStudentAccountCreatedModal(request);
      return;
    }
    if (request.accountReady) {
      showStudentAccountCreatedModal(request);
      return;
    }

    fetch(SITE.u('courseRegistrationRequestSetupLink', request.id), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': window.CSRF_TOKEN || '' }
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('saveError'));
        }
        return data;
      });
    }).then(function (data) {
      AdminData.updateCourseRegistrationRequest(data.request);
      Admin.renderAll();
      showStudentAccountCreatedModal(data.request);
    }).catch(function (error) {
      UI.toast(error.message || t('saveError'), 'error');
    });
  }

  function inPersonStudentEditForm(request, includeRequestStatus) {
    var fields = [
      {
        k: 'fullName',
        label: t('registrationRequestName'),
        value: request.fullName || '',
        required: true,
        maxLength: 200,
        validate: function (value) {
          var words = value.trim().split(/\s+/);
          return value && words.length >= 3 && words.length <= 6 &&
            words.every(function (word) { return /^[\p{L}\p{M}]+$/u.test(word); })
            ? '' : t('registrationRequestNameInvalid');
        }
      },
      {
        k: 'phone',
        label: t('registrationRequestPhone'),
        value: request.phone || '',
        required: true,
        maxLength: 13,
        dir: 'ltr',
        inputMode: 'tel',
        placeholder: '+970xxxxxxxxx أو +972xxxxxxxxx',
        validate: function (value) {
          return /^\+97(?:0|2)(?:59|56)\d{7}$/.test(value)
            ? '' : t('registrationRequestPhoneInvalid');
        }
      },
      {
        k: 'address',
        label: t('registrationRequestAddress'),
        value: request.address || '',
        required: true,
        maxLength: 255
      },
      {
        k: 'specialty',
        label: t('registrationRequestSpecialty'),
        value: request.specialty || '',
        required: true,
        maxLength: 150
      },
      {
        k: 'governorate',
        label: t('registrationRequestGovernorate'),
        type: 'select',
        value: request.governorate || '',
        required: true,
        options: [
          { v: '', l: '—' },
          { v: 'gaza', l: t('registrationRequestGovernorateGaza') },
          { v: 'central', l: t('registrationRequestGovernorateCentral') },
          { v: 'online', l: t('registrationRequestGovernorateOnline') }
        ]
      },
      {
        k: 'studyYear',
        label: t('registrationRequestStudyYear'),
        type: 'number',
        value: request.studyYear || '',
        min: 1,
        max: 4294967295,
        step: 1,
        required: true,
        validate: function (value) {
          return /^[1-9]\d*$/.test(value) && Number(value) <= 4294967295
            ? '' : t('registrationRequestStudyYearInvalid');
        }
      },
      {
        k: 'studentStatus',
        label: t('registrationRequestStatus'),
        type: 'select',
        value: request.studentStatus || '',
        options: [
          { v: '', l: '—' },
          { v: 'student', l: t('registrationRequestStudent') },
          { v: 'graduate', l: t('registrationRequestGraduate') }
        ]
      }
    ];
    if (includeRequestStatus) {
      fields.push({
        k: 'status',
        label: t('courseRegistrationStatus'),
        type: 'select',
        value: request.status || 'new',
        required: true,
        options: [
          { v: 'new', l: t('registrationRequestNew') },
          { v: 'contacted', l: t('registrationRequestContacted') },
          { v: 'accepted', l: t('registrationRequestAccepted') },
          { v: 'rejected', l: t('registrationRequestRejected') }
        ]
      });
    }
    var modal = Admin.formModal({
      title: t('studentEdit') + ' — ' + request.fullName,
      submit: t('saveChanges'),
      fields: fields,
      onSubmit: function (values, formModal) {
        var saveButton = formModal.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('courseRegistrationRequestUpdate', request.id), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify(values)
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) {
              throw new Error(data.message || t('saveError'));
            }
            return data;
          });
        }).then(function (data) {
          AdminData.updateCourseRegistrationRequest(data.request);
          formModal.close();
          Admin.renderAll();
          UI.toast(t('studentUpdated'), 'success');
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });
    return modal;
  }

  Admin.register('in-person-students', {
    render: function () {
      var historyRoute = (location.hash || '').replace(/^#\/?/, '')
        .match(/^in-person-students\/(.+)$/);
      if (historyRoute) {
        var registrationId;
        try {
          registrationId = decodeURIComponent(historyRoute[1]);
        } catch (error) {
          registrationId = historyRoute[1];
        }
        return renderInPersonStudentHistory(registrationId);
      }

      var students = AdminData.courseRegistrationRequests().filter(function (request) {
        return request.status === 'accepted';
      });
      return Admin.table({
        key: 'in-person-students',
        id: function (request) { return request.id; },
        rows: students,
        pageSize: 10,
        search: function (request) {
          return [
            request.courseTitle,
            request.cohortName,
            request.fullName,
            request.phone,
            request.sourceStudentName,
            request.specialty,
            request.governorate,
            request.studyYear,
            request.address
          ].join(' ');
        },
        empty: {
          icon: 'users',
          title: t('inPersonStudentsEmpty'),
          sub: t('subInPersonStudents')
        },
        columns: [
          {
            k: 'name',
            label: t('registrationRequestName'),
            sortVal: function (request) { return request.fullName; },
            render: function (request) {
              return '<button type="button" class="course-cohort-request-name" data-act="in-person-student-history" data-id="' +
                e(request.id) + '">' + e(request.fullName) + '</button>';
            },
            csv: function (request) { return request.fullName; }
          },
          {
            k: 'phone',
            label: t('registrationRequestPhone'),
            sortVal: function (request) { return request.phone; },
            render: function (request) {
              return '<a href="https://wa.me/' + e(String(request.phone || '').replace(/\D/g, '')) +
                '" target="_blank" rel="noopener noreferrer" dir="ltr">' + e(request.phone) + '</a>';
            },
            csv: function (request) { return request.phone; }
          },
          {
            k: 'governorate',
            label: t('registrationRequestGovernorate'),
            sortVal: function (request) { return request.governorate || ''; },
            render: function (request) {
              return request.governorate === 'gaza'
                ? e(t('registrationRequestGovernorateGaza'))
                : request.governorate === 'central'
                  ? e(t('registrationRequestGovernorateCentral'))
                  : request.governorate === 'online'
                    ? e(t('registrationRequestGovernorateOnline'))
                  : '<span class="tiny muted">—</span>';
            },
            csv: function (request) {
              return request.governorate === 'gaza'
                ? t('registrationRequestGovernorateGaza')
                : request.governorate === 'central'
                  ? t('registrationRequestGovernorateCentral')
                  : request.governorate === 'online'
                    ? t('registrationRequestGovernorateOnline') : '';
            }
          },
          {
            k: 'course',
            label: t('registrationRequestCourse'),
            sortVal: function (request) { return request.courseTitle; },
            render: function (request) { return '<b>' + e(request.courseTitle) + '</b>'; },
            csv: function (request) { return request.courseTitle; }
          },
          {
            k: 'cohort',
            label: t('courseCohort'),
            sortVal: function (request) { return request.cohortName || ''; },
            render: function (request) {
              return request.cohortName
                ? e(request.cohortName)
                : '<span class="tiny muted">—</span>';
            },
            csv: function (request) { return request.cohortName || ''; }
          },
          {
            k: 'payment',
            label: t('courseRegistrationNewPayment'),
            render: function (request) {
              return courseRegistrationPaymentCell(request, false);
            },
            csv: function (request) {
              return (request.paidAmount || '0.00') + ' ' + (request.currency === 'USD' ? 'USD' : 'ILS');
            }
          },
          {
            k: 'remainingAmount',
            label: t('courseRegistrationRemaining'),
            sortVal: function (request) { return Number(request.remainingAmount || 0); },
            render: function (request) {
              return request.remainingAmount === ''
                ? '<span class="tiny muted">—</span>'
                : e(request.remainingAmount || '0.00') + ' ' + (request.currency === 'USD' ? '$' : '₪');
            },
            csv: function (request) {
              return request.remainingAmount === ''
                ? ''
                : (request.remainingAmount || '0.00') + ' ' + (request.currency === 'USD' ? '$' : '₪');
            }
          },
          {
            k: 'account',
            label: t('colActions'),
            sortVal: function (request) { return request.studentId || ''; },
            render: function (request) {
              return inPersonStudentSetupActions(request);
            },
            csv: function () { return ''; }
          }
        ]
      });
    },
    wire: wireInPersonStudentPayments
  });

  Admin.register('subscriptions', {
    render: function () {
      var grouped = {};
      AdminData.subscriptions().forEach(function (subscription) {
        var studentId = String(subscription.studentId || '');
        var studentPhone = String(subscription.studentPhone || '');
        var key = studentId
          ? 'student-' + studentId
          : studentPhone
            ? 'unlinked-phone-' + studentPhone.replace(/\D/g, '')
            : 'unlinked-subscription-' + String(subscription.id);
        var row = grouped[key];
        if (!row) {
          row = grouped[key] = {
            id: key,
            studentId: studentId,
            studentName: subscription.studentName || '',
            studentPhone: studentPhone,
            subscriptions: [],
            courseTypes: [],
            totals: {}
          };
        }
        row.subscriptions.push(subscription);
        if (row.courseTypes.indexOf(subscription.courseType) === -1) {
          row.courseTypes.push(subscription.courseType);
        }
        var currency = subscription.currency || 'ILS';
        var totals = row.totals[currency] || (row.totals[currency] = {
          paid: 0,
          amount: 0,
          remaining: 0
        });
        totals.paid += Number(subscription.paidAmount) || 0;
        var amount = subscription.totalAmount != null && subscription.totalAmount !== ''
          ? subscription.totalAmount : subscription.coursePrice;
        totals.amount += Number(amount) || 0;
        totals.remaining += Number(subscription.remainingAmount) || 0;
      });

      var students = Object.keys(grouped).map(function (key) {
        var row = grouped[key];
        row.subscriptions.sort(function (left, right) {
          return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
        });
        row.latestSubscription = row.subscriptions[0];
        row.courseNames = row.subscriptions.map(function (subscription) {
          return subscription.courseTitle;
        });
        row.latestCohortName = row.latestSubscription &&
          row.latestSubscription.courseType === 'in_person'
          ? row.latestSubscription.cohortName : '';
        return row;
      });

      function moneyByCurrency(row, field) {
        return Object.keys(row.totals).sort().map(function (currency) {
          var symbol = currency === 'USD' ? '$' : '₪';
          var amount = row.totals[currency][field];
          return '<span class="subscription-total-item">' +
            e(amount.toFixed(2)) + ' ' + symbol + '</span>';
        }).join('');
      }

      return '<div class="course-cohort-page"><section class="course-cohort-page-section">' +
        '<h3>' + e(t('secSubscriptions')) + '</h3>' +
        Admin.table({
          key: 'subscriptions',
          id: function (student) { return student.id; },
          rows: students,
          pageSize: 12,
          add: { label: t('subscriptionAdd'), act: 'subscription-add', icon: 'plus' },
          search: function (student) {
            return [
              student.studentName,
              student.studentPhone,
              student.courseNames.join(' '),
              student.latestCohortName,
              student.subscriptions.map(function (subscription) {
                return [
                  subscription.courseType,
                  subscription.paidAmount,
                  subscription.totalAmount,
                  subscription.remainingAmount
                ].join(' ');
              }).join(' ')
            ].join(' ');
          },
          filters: [
            {
              k: 'courseType',
              label: t('subscriptionFilterType'),
              val: function (student) { return student.courseTypes; },
              filterRow: function (student, courseType) {
                var matchingSubscriptions = student.subscriptions.filter(function (subscription) {
                  return subscription.courseType === courseType;
                });
                if (!matchingSubscriptions.length) return null;
                var totals = {};
                matchingSubscriptions.forEach(function (subscription) {
                  var currency = subscription.currency || 'ILS';
                  var currencyTotals = totals[currency] || (totals[currency] = {
                    paid: 0,
                    amount: 0,
                    remaining: 0
                  });
                  currencyTotals.paid += Number(subscription.paidAmount) || 0;
                  var amount = subscription.totalAmount != null && subscription.totalAmount !== ''
                    ? subscription.totalAmount : subscription.coursePrice;
                  currencyTotals.amount += Number(amount) || 0;
                  currencyTotals.remaining += Number(subscription.remainingAmount) || 0;
                });
                var latest = matchingSubscriptions[0];
                return Object.assign({}, student, {
                  subscriptions: matchingSubscriptions,
                  courseTypes: [courseType],
                  totals: totals,
                  latestSubscription: latest,
                  courseNames: matchingSubscriptions.map(function (subscription) {
                    return subscription.courseTitle;
                  }),
                  latestCohortName: latest.courseType === 'in_person' ? latest.cohortName : ''
                });
              },
              options: [
                { v: 'online', l: t('subscriptionTypeOnline') },
                { v: 'in_person', l: t('subscriptionTypeInPerson') }
              ]
            },
            {
              k: 'hasBalance',
              label: t('subscriptionFilterBalance'),
              filterRow: function (student) {
                var hasBalance = Object.keys(student.totals).some(function (currency) {
                  return student.totals[currency].remaining > 0;
                });
                return hasBalance ? student : null;
              },
              options: [
                { v: 'yes', l: t('subscriptionHasBalance') }
              ]
            }
          ],
          empty: {
            icon: 'file-text',
            title: t('subscriptionEmpty'),
            sub: t('subSubscriptions')
          },
          columns: [
            {
              k: 'student',
              label: t('onlineCourseInvoiceStudent'),
              width: '17%',
              sortVal: function (student) { return student.studentName; },
              render: function (student) {
                return '<button type="button" class="course-cohort-request-name" data-act="subscription-history" data-id="' +
                  e(student.studentId) + '"><b>' + e(student.studentName) + '</b></button>' +
                  (student.studentPhone
                    ? '<div class="tiny muted" dir="ltr">' + e(student.studentPhone) + '</div>' : '');
              },
              csv: function (student) { return student.studentName; }
            },
            {
              k: 'courses',
              label: t('onlineCourseInvoiceCourse'),
              width: '28%',
              sortVal: function (student) {
                return student.latestSubscription ? student.latestSubscription.courseTitle : '';
              },
              render: function (student) {
                var latest = student.latestSubscription;
                if (!latest) return '<span class="tiny muted">—</span>';
                return '<div class="subscription-course-list"><span>' +
                  e(latest.courseTitle) + '</span><small>' +
                  e(t(latest.courseType === 'online'
                    ? 'subscriptionTypeOnline' : 'subscriptionTypeInPerson')) +
                  '</small></div>';
              },
              csv: function (student) {
                return student.latestSubscription ? student.latestSubscription.courseTitle : '';
              }
            },
            {
              k: 'cohort',
              label: t('courseCohort'),
              width: '12%',
              render: function (student) {
                return e(student.latestCohortName || '—');
              },
              csv: function (student) { return student.latestCohortName || ''; }
            },
            {
              k: 'paid',
              label: t('courseRegistrationPaidAmount'),
              width: '12%',
              render: function (student) {
                return '<div class="subscription-totals">' + moneyByCurrency(student, 'paid') + '</div>';
              },
              csv: function (student) {
                return Object.keys(student.totals).map(function (currency) {
                  return student.totals[currency].paid.toFixed(2) + ' ' + currency;
                }).join('; ');
              }
            },
            {
              k: 'amount',
              label: t('subscriptionPrice'),
              width: '12%',
              render: function (student) {
                return '<div class="subscription-totals">' + moneyByCurrency(student, 'amount') + '</div>';
              },
              csv: function (student) {
                return Object.keys(student.totals).map(function (currency) {
                  return student.totals[currency].amount.toFixed(2) + ' ' + currency;
                }).join('; ');
              }
            },
            {
              k: 'remaining',
              label: t('courseRegistrationRemaining'),
              width: '12%',
              render: function (student) {
                return '<div class="subscription-totals">' + moneyByCurrency(student, 'remaining') + '</div>';
              },
              csv: function (student) {
                return Object.keys(student.totals).map(function (currency) {
                  return student.totals[currency].remaining.toFixed(2) + ' ' + currency;
                }).join('; ');
              }
            },
            {
              k: 'actions',
              label: t('colActions'),
              width: '7%',
              cls: 'acts',
              noCsv: true,
              render: function (student) {
                return '<button type="button" class="btn-icon sm" data-act="subscription-history" data-id="' +
                  e(student.studentId) + '" aria-label="' + e(t('subscriptionHistoryOpen')) + '"' +
                  (student.studentId ? '' : ' disabled') + '>' +
                  UI.icon('clock', 15) + '</button>';
              }
            }
          ]
        }) +
        '</section></div>';
    }
  });

  function normalizeSubscriptionSearch(value) {
    return String(value || '')
      .toLocaleLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .trim();
  }

  function bindSubscriptionSearch(modal, key, getRecords, searchText, getLabel, emptyMessage, onSelect) {
    var input = modal.body.querySelector('[data-fk-search="' + key + '"]');
    var value = modal.body.querySelector('[data-fk="' + key + '"]');
    var results = modal.body.querySelector('#' + key + '-results');

    function closeResults() {
      results.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    function renderResults(query) {
      var normalizedQuery = normalizeSubscriptionSearch(query);
      if (!normalizedQuery) {
        closeResults();
        return;
      }
      var queryWords = normalizedQuery.split(/\s+/);
      var matches = getRecords().filter(function (record) {
        var searchable = normalizeSubscriptionSearch(searchText(record));
        return queryWords.every(function (word) {
          return searchable.indexOf(word) !== -1;
        });
      }).slice(0, 10);
      results.innerHTML = matches.length
        ? matches.map(function (record) {
          var label = getLabel(record);
          return '<button class="online-invoice-search-option" type="button" role="option"' +
            ' aria-selected="false" data-subscription-search-option="' + e(key) +
            '" data-option-value="' + e(record.databaseId || record.pk) +
            '" data-option-label="' + e(label) + '">' + e(label) + '</button>';
        }).join('')
        : '<div class="online-invoice-search-empty" role="presentation">' +
          e(emptyMessage) + '</div>';
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('input', function () {
      value.value = '';
      value.dispatchEvent(new Event('input', { bubbles: true }));
      if (onSelect) onSelect(null);
      renderResults(input.value);
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeResults();
      else if (event.key === 'ArrowDown' && !results.hidden) {
        var firstOption = results.querySelector('[data-subscription-search-option]');
        if (firstOption) {
          event.preventDefault();
          firstOption.focus();
        }
      }
    });
    results.addEventListener('click', function (event) {
      var option = event.target.closest('[data-subscription-search-option]');
      if (!option) return;
      value.value = option.getAttribute('data-option-value');
      input.value = option.getAttribute('data-option-label');
      value.dispatchEvent(new Event('input', { bubbles: true }));
      closeResults();
      input.focus();
      if (onSelect) onSelect(getRecords().find(function (record) {
        return String(record.databaseId || record.pk) === String(value.value);
      }) || null);
    });
    modal.body.addEventListener('click', function (event) {
      if (!event.target.closest('.online-invoice-search-picker')) closeResults();
    });
  }

  function subscriptionCreateForm() {
    var students = Store.collection('users').filter(function (student) {
      return student.role === 'student' && student.databaseId;
    });
    var courses = Store.collection('certificates').filter(function (course) {
      return course.status === 'published' && course.pk;
    });
    var modal = Admin.formModal({
      title: t('subscriptionAddTitle'),
      size: 'md',
      fields: [
        {
          k: 'studentId',
          label: t('onlineCourseInvoiceStudent'),
          type: 'invoice-search',
          required: true,
          placeholder: t('onlineCourseInvoiceStudentSearch')
        },
        {
          k: 'courseType',
          label: t('subscriptionType'),
          type: 'select',
          value: 'online',
          options: [
            { v: 'online', l: t('subscriptionTypeOnline') },
            { v: 'in_person', l: t('subscriptionTypeInPerson') }
          ]
        },
        {
          k: 'courseId',
          label: t('subscriptionCourse'),
          type: 'invoice-search',
          required: true,
          placeholder: t('subscriptionCourseSearch')
        },
        {
          k: 'cohortId',
          label: t('subscriptionCohort'),
          type: 'select',
          value: '',
          options: [{ v: '', l: t('subscriptionCohortChoose') }]
        },
        {
          k: 'coursePrice',
          label: t('subscriptionPrice'),
          type: 'number',
          value: '',
          min: 0,
          step: '0.01',
          hint: t('subscriptionPriceHint'),
          readonly: true
        },
        {
          k: 'discountAmount',
          label: t('subscriptionDiscount'),
          type: 'number',
          min: 0,
          step: '0.01',
          value: '',
          hint: t('subscriptionDiscountHint'),
          validate: function (value) {
            var price = Number(priceInput && priceInput.value);
            return !value || /^\d+(?:\.\d{1,2})?$/.test(value) &&
              Number(value) >= 0 && Number(value) <= price
              ? '' : t('subscriptionDiscountInvalid');
          }
        },
        {
          k: 'paymentAmount',
          label: t('subscriptionInitialPayment'),
          type: 'number',
          min: 0,
          step: '0.01',
          value: '',
          validate: function (value) {
            return !value || /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) >= 0
              ? '' : t('courseRegistrationPaymentFormatInvalid');
          }
        }
      ],
      submit: t('subscriptionCreateButton'),
      onSubmit: function (values, formModal) {
        var type = values.courseType;
        if (type !== 'online' && type !== 'in_person') {
          UI.toast(t('subscriptionCreateFailed'), 'error');
          return false;
        }
        if (type === 'in_person' && !values.cohortId) {
          UI.toast(t('subscriptionCohortChoose'), 'error');
          return false;
        }
        delete values.coursePrice;
        values.paymentAmount = values.paymentAmount || '';
        values.discountAmount = values.discountAmount || '';
        values.cohortId = type === 'in_person' ? values.cohortId : '';
        var saveButton = formModal.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('subscriptionCreate'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify(values)
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) {
              throw new Error(data.message || t('subscriptionCreateFailed'));
            }
            return data;
          });
        }).then(function (data) {
          if (data.invoice) AdminData.addOnlineCourseInvoice(data.invoice);
          if (data.registration) AdminData.updateCourseRegistrationRequest(data.registration);
          AdminData.addSubscription(data.subscription);
          AdminData.updateCourseProgressHistory({
            id: String(data.progress.id),
            courseId: data.progress.courseId,
            userId: String(data.progress.studentId),
            joinedAt: data.progress.joinedAt,
            expiresAt: data.progress.expiresAt || '',
            progress: data.progress.progress || 0,
            completed: !!data.progress.completed
          });
          if (!Array.isArray(Store.state.enrollments)) Store.state.enrollments = [];
          var alreadyEnrolled = Store.state.enrollments.some(function (enrollment) {
            return String(enrollment.databaseProgressId) === String(data.progress.id) ||
              String(enrollment.courseId) === String(data.progress.courseId) &&
              String(enrollment.userId) === 'db-user-' + String(data.progress.studentId);
          });
          if (!alreadyEnrolled) {
            Store.state.enrollments.push({
              id: 'db-enrollment-' + data.progress.id,
              databaseProgressId: String(data.progress.id),
              courseId: data.progress.courseId,
              userId: 'db-user-' + data.progress.studentId,
              joinedAt: data.progress.joinedAt,
              expiresAt: data.progress.expiresAt || '',
              progress: data.progress.progress || 0,
              completed: !!data.progress.completed,
              status: 'active'
            });
            var course = Store.find('certificates', data.progress.courseId);
            if (course) course.enrollmentCount = (Number(course.enrollmentCount) || 0) + 1;
          }
          formModal.close();
          Admin.renderAll();
          UI.toast(t('subscriptionCreateSuccess'), 'success');
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('subscriptionCreateFailed'), 'error');
        });
        return false;
      }
    });

    var typeSelect = modal.body.querySelector('[data-fk="courseType"]');
    var courseInput = modal.body.querySelector('[data-fk-search="courseId"]');
    var courseValue = modal.body.querySelector('[data-fk="courseId"]');
    var priceInput = modal.body.querySelector('[data-fk="coursePrice"]');
    var discountInput = modal.body.querySelector('[data-fk="discountAmount"]');
    var priceHint = priceInput.closest('.field').querySelector('.hint');
    var cohortSelect = modal.body.querySelector('[data-fk="cohortId"]');

    priceInput.readOnly = true;
    priceInput.setAttribute('aria-readonly', 'true');
    priceInput.closest('.field').classList.add('subscription-price-field');

    var typeField = typeSelect.closest('.field');
    var typeGroup = document.createElement('div');
    typeGroup.className = 'subscription-type-options';
    typeGroup.setAttribute('role', 'group');
    typeGroup.setAttribute('aria-label', t('subscriptionType'));
    Array.prototype.forEach.call(typeSelect.options, function (option) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'subscription-type-option';
      button.textContent = option.textContent;
      button.setAttribute('aria-pressed', String(option.value === typeSelect.value));
      button.addEventListener('click', function () {
        typeSelect.value = option.value;
        typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      typeGroup.appendChild(button);
    });
    typeSelect.hidden = true;
    typeField.appendChild(typeGroup);

    typeSelect.addEventListener('change', function () {
      Array.prototype.forEach.call(typeGroup.children, function (button, index) {
        button.setAttribute('aria-pressed', String(typeSelect.options[index].value === typeSelect.value));
      });
    });

    function resetCourseSelection() {
      courseInput.value = '';
      courseValue.value = '';
      priceInput.value = '';
      priceHint.textContent = t('subscriptionPriceHint');
      discountInput.value = '';
      discountInput.max = '';
      cohortSelect.innerHTML = '<option value="">' + e(t('subscriptionCohortChoose')) + '</option>';
      cohortSelect.disabled = true;
      cohortSelect.closest('.field').hidden = typeSelect.value !== 'in_person';
    }

    typeSelect.addEventListener('change', resetCourseSelection);
    resetCourseSelection();
    bindSubscriptionSearch(
      modal,
      'studentId',
      function () { return students; },
      function (student) {
        return [
          student.name,
          student.fullNameArabic,
          student.fullNameEnglish,
          student.handle,
          student.phone,
          student.email
        ].filter(Boolean).join(' ');
      },
      function (student) {
        return [student.name, student.phone || student.email].filter(Boolean).join(' — ');
      },
      t('subscriptionStudentNoMatches')
    );
    bindSubscriptionSearch(
      modal,
      'courseId',
      function () {
        return courses.filter(function (course) {
          return course.courseType === typeSelect.value;
        });
      },
      function (course) { return course.title || ''; },
      function (course) { return course.title || ''; },
      t('subscriptionCourseNoMatches'),
      function (course) {
        priceInput.value = '';
        priceHint.textContent = t('subscriptionPriceHint');
        discountInput.value = '';
        discountInput.max = '';
        cohortSelect.innerHTML = '<option value="">' + e(t('subscriptionCohortChoose')) + '</option>';
        cohortSelect.disabled = true;
        if (!course) return;
        var rawPrice = String(course.price || '')
          .replace(/[٠-٩۰-۹]/g, function (digit) {
            return String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) % 10);
          })
          .replace(/[^\d,.]/g, '');
        if (rawPrice.indexOf(',') !== -1) {
          rawPrice = rawPrice.indexOf('.') !== -1 || /^\d{1,3}(?:,\d{3})+$/.test(rawPrice)
            ? rawPrice.replace(/,/g, '')
            : rawPrice.replace(',', '.').replace(/,/g, '');
        }
        priceInput.value = rawPrice;
        priceHint.textContent = t('subscriptionPriceHint') + ' ' +
          (course.currency === 'USD' ? '$' : '₪');
        discountInput.max = rawPrice || '';
        if (typeSelect.value !== 'in_person') return;
        var cohorts = AdminData.inPersonCohorts().filter(function (cohort) {
          return cohort.active && String(cohort.courseId) === String(course.id);
        });
        cohorts.forEach(function (cohort) {
          var option = document.createElement('option');
          option.value = cohort.id;
          option.textContent = cohort.name;
          cohortSelect.appendChild(option);
        });
        cohortSelect.disabled = !cohorts.length;
      }
    );
  }

  function showSubscriptionHistory(studentId) {
    var history = AdminData.subscriptions().filter(function (subscription) {
      return String(subscription.studentId) === String(studentId);
    }).sort(function (left, right) {
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
    var student = Store.collection('users').find(function (user) {
      return String(user.databaseId || '') === String(studentId);
    });
    var rows = history.map(function (subscription) {
      var symbol = subscription.currency === 'USD' ? '$' : '₪';
      var payments = (subscription.payments || []).map(function (payment) {
        return '<li><span>' + e(payment.amount) + ' ' + symbol + '</span> <time>' +
          e(UI.formatDate(payment.createdAt)) + '</time></li>';
      }).join('');
      var discount = subscription.discountAmount || subscription.discountValue || '0.00';
      return '<tr><td><b>' + e(subscription.courseTitle) + '</b><div class="tiny muted">' +
        e(t(subscription.courseType === 'online' ? 'subscriptionTypeOnline' : 'subscriptionTypeInPerson')) +
        '</div></td><td>' + e(subscription.cohortName || '—') + '</td><td>' +
        (Number(discount) > 0
          ? '<div class="tiny muted">' + e(subscription.coursePrice || '—') + ' ' + symbol +
            ' − ' + e(discount) + ' ' + symbol + '</div>' : '') +
        '<b>' + e(subscription.totalAmount || subscription.coursePrice || '—') + ' ' + symbol + '</b></td><td>' +
        e(subscription.paidAmount || '0.00') + ' ' + symbol +
        (payments ? '<ul class="course-cohort-payment-list">' + payments + '</ul>' : '') +
        '</td><td>' + e(subscription.remainingAmount || '0.00') + ' ' + symbol +
        '</td><td>' + subscriptionPaymentInput(subscription) + '</td></tr>';
    }).join('');
    var historyModal = UI.modal({
      title: t('subscriptionHistory'),
      size: 'lg',
      body: '<div class="course-cohort-page subscription-history-content"><div class="subscription-history-student">' +
        '<b>' + e(student ? student.name : '') + '</b><span dir="ltr">' +
        e(student ? student.phone || '' : '') + '</span></div>' +
        (history.length
          ? '<div class="tbl-wrap subscription-history-table-wrap"><table class="adm-table subscription-history-table"><colgroup>' +
            '<col class="subscription-history-course"><col class="subscription-history-cohort">' +
            '<col class="subscription-history-total"><col class="subscription-history-paid">' +
            '<col class="subscription-history-remaining"><col class="subscription-history-actions"></colgroup><thead><tr>' +
            '<th>' + e(t('onlineCourseInvoiceCourse')) + '</th><th>' + e(t('courseCohort')) +
            '</th><th>' + e(t('inPersonPaymentAmount')) + '</th><th>' +
            e(t('courseRegistrationPaidAmount')) + '</th><th>' +
            e(t('courseRegistrationRemaining')) + '</th><th>' +
            e(t('subscriptionHistoryAddPayment')) + '</th></tr></thead><tbody>' + rows +
            '</tbody></table></div>'
          : '<p class="tiny muted">' + e(t('subscriptionHistoryEmpty')) + '</p>') +
        '</div>',
      footer: '<button class="btn btn-ghost" data-modal-close>' + e(t('close')) + '</button>'
    });
    historyModal.el.classList.add('subscription-history-modal');
    historyModal.body.querySelectorAll('[data-subscription-payment]').forEach(function (input) {
      var button = input.parentElement.querySelector('[data-act="subscription-history-payment-save"]');
      var feedback = input.parentElement.querySelector('.subscription-history-payment-feedback');
      function validate() {
        var amount = input.value.trim();
        var invalid = !amount || !/^\d+(?:\.\d{1,2})?$/.test(amount) ||
          !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
          Number(amount) > Number(input.max);
        input.setCustomValidity(invalid ? t('courseRegistrationPaymentFormatInvalid') : '');
        if (feedback) {
          feedback.textContent = invalid ? t('courseRegistrationPaymentFormatInvalid') : '';
          feedback.hidden = !invalid;
        }
        if (button) button.disabled = invalid;
      }
      input.addEventListener('input', validate);
      input.addEventListener('change', validate);
    });
  }

  function subscriptionPaymentInput(subscription) {
    var remaining = Number(subscription.remainingAmount) || 0;
    var kind = subscription.courseType === 'online' ? 'online' : 'inperson';
    var targetId = kind === 'online'
      ? String(subscription.id).replace(/^online-/, '')
      : String(subscription.id).replace(/^inperson-/, '');
    if (remaining <= 0) {
      return '<span class="tiny muted">—</span>';
    }
    return '<div class="subscription-history-payment">' +
      '<input class="input" type="number" min="0.01" step="0.01" max="' +
      e(subscription.remainingAmount) + '" data-subscription-payment="' + e(kind) +
      '-' + e(targetId) + '" aria-label="' + e(t('courseRegistrationNewPayment')) +
      '" placeholder="' + e(t('courseRegistrationNewPayment')) + '">' +
      '<button type="button" class="btn-icon sm course-cohort-payment-confirm" data-act="subscription-history-payment-save"' +
      ' data-kind="' + e(kind) + '" data-id="' + e(targetId) + '"' +
      ' aria-label="' + e(t('courseRegistrationConfirmPayment')) + '" disabled>' +
      UI.icon('check', 15) + '</button>' +
      '<small class="subscription-history-payment-feedback" role="alert" hidden></small></div>';
  }

  function subscriptionAfterPayment(subscription, paymentResult, kind) {
    if (kind === 'online') {
      return {
        id: 'online-' + paymentResult.id,
        studentId: paymentResult.studentId,
        studentName: paymentResult.studentName,
        studentPhone: paymentResult.studentPhone,
        courseType: 'online',
        courseId: paymentResult.courseId,
        courseTitle: paymentResult.courseTitle,
        cohortName: '',
        coursePrice: paymentResult.coursePrice,
        discountAmount: paymentResult.discountValue,
        totalAmount: paymentResult.totalAmount,
        paidAmount: paymentResult.paidAmount,
        remainingAmount: paymentResult.remainingAmount,
        currency: paymentResult.currency,
        payments: paymentResult.payments,
        createdAt: paymentResult.createdAt
      };
    }
    return {
      id: 'inperson-' + paymentResult.id,
      studentId: paymentResult.studentId || subscription.studentId,
      studentName: paymentResult.fullName || subscription.studentName,
      studentPhone: paymentResult.phone || subscription.studentPhone,
      courseType: 'in_person',
      courseId: paymentResult.courseId,
      courseTitle: paymentResult.courseTitle,
      cohortName: paymentResult.cohortName,
      coursePrice: paymentResult.coursePriceAmount,
      discountAmount: paymentResult.discountAmount || '0.00',
      totalAmount: paymentResult.totalAmount,
      paidAmount: paymentResult.paidAmount,
      remainingAmount: paymentResult.remainingAmount,
      currency: paymentResult.currency,
      payments: paymentResult.payments,
      createdAt: paymentResult.createdAt
    };
  }

  Admin.on('subscription-history-payment-save', function (button) {
    var kind = button.getAttribute('data-kind');
    var targetId = button.getAttribute('data-id');
    var input = document.querySelector(
      '[data-subscription-payment="' + kind + '-' + targetId + '"]'
    );
    if (!input) return;
    var amount = input.value.trim();
    if (!amount || !/^\d+(?:\.\d{1,2})?$/.test(amount) ||
        !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
        Number(amount) > Number(input.max)) {
      input.setCustomValidity(t('courseRegistrationPaymentFormatInvalid'));
      input.reportValidity();
      return;
    }

    var endpoint = kind === 'online'
      ? SITE.u('onlineCourseInvoicePayment', targetId)
      : SITE.u('courseRegistrationRequestPaidAmount', targetId);
    button.disabled = true;
    input.disabled = true;
    fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ amount: amount })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('subscriptionHistoryPaymentFailed'));
        }
        return data;
      });
    }).then(function (data) {
      var current = AdminData.subscriptions().find(function (item) {
        return item.courseType === (kind === 'online' ? 'online' : 'in_person') &&
          String(item.id).replace(/^(online|inperson)-/, '') === String(targetId);
      });
      var updatedSubscription = subscriptionAfterPayment(
        current || {},
        kind === 'online' ? data.invoice : data.request,
        kind
      );
      if (kind === 'online') AdminData.updateOnlineCourseInvoice(data.invoice);
      else AdminData.updateCourseRegistrationRequest(data.request);
      AdminData.addSubscription(updatedSubscription);
      var modal = button.closest('.modal-wrap');
      var closeButton = modal && modal.querySelector('.modal-x');
      if (closeButton) closeButton.click();
      showSubscriptionHistory(updatedSubscription.studentId);
      UI.toast(t('subscriptionHistoryPaymentSaved'), 'success');
    }).catch(function (error) {
      button.disabled = false;
      input.disabled = false;
      UI.toast(error.message || t('subscriptionHistoryPaymentFailed'), 'error');
    });
  });

  Admin.on('subscription-add', function () {
    subscriptionCreateForm();
  });
  Admin.on('subscription-history', function (button) {
    var studentId = button.getAttribute('data-id');
    if (studentId) showSubscriptionHistory(studentId);
  });

  function renderInPersonStudentHistory(registrationId) {
    var requests = AdminData.courseRegistrationRequests();
    var selectedRequest = requests.find(function (request) {
      return String(request.id) === String(registrationId);
    });
    if (!selectedRequest) {
      return '<div class="course-cohort-page"><button type="button" class="btn btn-soft btn-sm" data-act="in-person-student-history-back">' +
        UI.icon('arrow-right', 15) + e(t('courseCohortBack')) + '</button>' +
        '<p class="tiny muted">' + e(t('inPersonStudentsEmpty')) + '</p></div>';
    }

    var studentRequests = selectedRequest.studentId
      ? requests.filter(function (request) {
        return String(request.studentId) === String(selectedRequest.studentId);
      })
      : [selectedRequest];
    studentRequests = studentRequests.filter(function (request) {
      return request.status === 'accepted' || Number(request.paidAmount) > 0;
    }).sort(function (left, right) {
      return new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
    });

    var statusKeys = {
      new: 'registrationRequestNew',
      contacted: 'registrationRequestContacted',
      accepted: 'registrationRequestAccepted',
      rejected: 'registrationRequestRejected'
    };
    var rows = studentRequests.map(function (request) {
      var currencySymbol = request.currency === 'USD' ? '$' : '₪';
      var payments = (request.payments || []).map(function (payment) {
        return '<li><span>' + e(payment.amount) + ' ' + currencySymbol +
          '</span> <time>' + e(UI.formatDate(payment.createdAt)) + '</time></li>';
      }).join('');
      return '<tr>' +
        '<td data-label="' + e(t('registrationRequestCourse')) + '"><b>' +
        e(request.courseTitle || '—') + '</b></td>' +
        '<td data-label="' + e(t('courseCohort')) + '">' +
        e(request.cohortName || '—') + '</td>' +
        '<td data-label="' + e(t('courseRegistrationAmountOfCourse')) + '">' +
        e(request.coursePriceAmount || '—') + ' ' + currencySymbol + '</td>' +
        '<td data-label="' + e(t('courseRegistrationPaidAmount')) + '">' +
        e(request.paidAmount || '0.00') + ' ' + currencySymbol +
        (payments ? '<ul class="course-cohort-payment-list">' + payments + '</ul>' : '') +
        '</td>' +
        '<td data-label="' + e(t('courseRegistrationRemaining')) + '">' +
        (request.remainingAmount === ''
          ? '—'
          : e(request.remainingAmount || '0.00') + ' ' + currencySymbol) + '</td>' +
        '<td data-label="' + e(t('registrationRequestStatus')) + '">' +
        e(t(statusKeys[request.status] || 'registrationRequestNew')) + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="course-cohort-page in-person-student-history">' +
      '<button type="button" class="btn btn-soft btn-sm" data-act="in-person-student-history-back">' +
      UI.icon('arrow-right', 15) + e(t('courseCohortBack')) + '</button>' +
      '<section class="course-cohort-page-section"><h3>' +
      e(t('inPersonStudentHistoryTitle')) + '</h3>' +
      '<p><b>' + e(selectedRequest.fullName) + '</b> · <span dir="ltr">' +
      e(selectedRequest.phone) + '</span></p>' +
      (studentRequests.length
        ? '<div class="tbl-wrap course-cohort-table-wrap"><table class="adm-table">' +
          '<thead><tr>' +
          '<th scope="col">' + e(t('registrationRequestCourse')) + '</th>' +
          '<th scope="col">' + e(t('courseCohort')) + '</th>' +
          '<th scope="col">' + e(t('courseRegistrationAmountOfCourse')) + '</th>' +
          '<th scope="col">' + e(t('courseRegistrationPaidAmount')) + '</th>' +
          '<th scope="col">' + e(t('courseRegistrationRemaining')) + '</th>' +
          '<th scope="col">' + e(t('registrationRequestStatus')) + '</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="tiny muted">' + e(t('inPersonStudentHistoryEmpty')) + '</p>') +
      '</section></div>';
  }

  Admin.on('in-person-student-history', function (el) {
    Admin.navigate('in-person-students/' + encodeURIComponent(el.getAttribute('data-id')));
  });

  Admin.on('in-person-student-history-back', function () {
    Admin.navigate('in-person-students');
  });

  function validateInPersonStudentPayment(input) {
    var value = input.value.trim();
    var message = '';
    var remaining = Number(input.max);
    if (!value) {
      message = t('courseRegistrationPaymentRequired');
    } else if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
      message = t('courseRegistrationPaymentFormatInvalid');
    } else if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
      message = t('courseRegistrationPaymentMustBePositive');
    } else if (Number(value) > remaining) {
      message = t('courseRegistrationPaymentExceedsRemaining');
    }

    input.setCustomValidity(message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    input.classList.toggle('is-invalid', !!message);
    var editor = input.closest('.course-cohort-paid-editor');
    var feedback = editor && editor.querySelector('.course-cohort-payment-feedback');
    var confirmButton = editor && editor.querySelector('.course-cohort-payment-confirm');
    if (feedback) {
      feedback.textContent = message;
      feedback.hidden = !message;
    }
    if (confirmButton) confirmButton.disabled = !!message || input.disabled;
    return !message;
  }

  function wireInPersonStudentPayments(host) {
    host.querySelectorAll('[data-registration-paid-amount]').forEach(function (input) {
      input.addEventListener('input', function () {
        validateInPersonStudentPayment(input);
      });
      input.addEventListener('change', function () {
        validateInPersonStudentPayment(input);
      });
    });
  }

  var courseCohortSourceQueries = {};
  var courseCohortApplicantQueries = {};
  var expandedHistoricalCohorts = {};
  var courseRegistrationRequestCourseFilter = '';
  try {
    courseRegistrationRequestCourseFilter =
      new URLSearchParams(location.search).get('course') || '';
  } catch (error) {
    console.warn('Course registration request filter could not be restored.', error);
  }
  var courseRegistrationRequestCohortFilter = '';
  var courseRegistrationRequestStatusFilter = '';

  function getCourseCohortRoute() {
    var match = (location.hash || '').replace(/^#\/?/, '').match(/^in-person-course-cohorts\/(.+)$/);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1].split('?')[0]);
    } catch (error) {
      return match[1];
    }
  }

  function courseCohortRequestRow(request, includeCourse, editing) {
    editing = includeCourse ? false : !!editing;
    var status = request.status || 'new';
    var statusOptions = [
      { value: 'new', label: 'registrationRequestNew', cls: 'st-warn' },
      { value: 'contacted', label: 'registrationRequestContacted', cls: 'st-brand' },
      { value: 'accepted', label: 'registrationRequestAccepted', cls: 'st-ok' },
      { value: 'rejected', label: 'registrationRequestRejected', cls: 'st-danger' }
    ];
    var statusIndex = statusOptions.findIndex(function (option) {
      return option.value === status;
    });
    if (statusIndex < 0) statusIndex = 0;
    var currentStatus = statusOptions[statusIndex];
    var nextStatus = statusOptions[(statusIndex + 1) % statusOptions.length];
    var source = request.sourceStudentName || t('registrationRequestDirect');
    var paidAmountCell = status === 'accepted'
      ? courseRegistrationPaymentCell(request)
      : '<span class="tiny muted">—</span>';
    var labels = {
      course: t('registrationRequestCourse'),
      name: t('registrationRequestName'),
      phone: t('registrationRequestPhone'),
      source: t('registrationRequestSource'),
      governorate: t('registrationRequestGovernorate'),
      studyYear: t('registrationRequestStudyYear'),
      status: t('registrationRequestStatus'),
      date: t('registrationRequestDate'),
      paid: t('courseRegistrationPaidAmount'),
      account: t('inPersonStudentAccount')
    };
    return '<tr class="course-cohort-applicant-row' + (editing ? ' is-editing' : '') +
      '" data-registration-request-row="' +
      e(request.id) + '" data-include-course="' + (includeCourse ? 'true' : 'false') +
      '" data-editing="' + (editing ? 'true' : 'false') +
      '" data-request-course="' + e(request.courseId || '') +
      '" data-request-cohort="' + e(request.cohortId || '') +
      '" data-request-status="' + e(status) + '" data-request-created-at="' +
      e(request.createdAt || '') +
      '" data-cohort-source="' +
      e(request.sourceStudentName || '') + '" data-applicant-search="' +
      e([request.fullName || '', request.phone || '', request.studyYear || '', request.governorate || ''].join(' ').toLocaleLowerCase()) + '">' +
      (includeCourse ? '<td data-label="' + e(labels.course) + '"><b>' + e(request.courseTitle || '—') + '</b></td>' : '') +
      '<td data-label="' + e(labels.name) + '">' + (editing
        ? '<input class="input course-request-inline-control" type="text" maxlength="200" data-registration-field="fullName" placeholder="' +
          e(labels.name) + '" value="' +
          e(request.fullName || '') + '" aria-label="' + e(labels.name) + '">'
        : '<button type="button" class="course-cohort-request-name" data-act="course-registration-details" data-id="' +
          e(request.id) + '" aria-label="' + e(t('courseCohortRequestDetails') + ' — ' + request.fullName) +
          '">' + e(request.fullName) + '</button>') + '</td>' +
      (includeCourse ? '' : '<td data-label="' + e(t('registrationRequestAddress')) + '">' + (editing
        ? '<input class="input course-request-inline-control" type="text" maxlength="255" data-registration-field="address" value="' +
          e(request.address || '') + '" aria-label="' + e(t('registrationRequestAddress')) + '">'
        : e(request.address || '—')) + '</td>') +
      (includeCourse ? '' : '<td data-label="' + e(t('registrationRequestSpecialty')) + '">' + (editing
        ? '<input class="input course-request-inline-control" type="text" maxlength="150" data-registration-field="specialty" value="' +
          e(request.specialty || '') + '" aria-label="' + e(t('registrationRequestSpecialty')) + '">'
        : e(request.specialty || '—')) + '</td>') +
      (includeCourse ? '' : '<td data-label="' + e(t('registrationRequestStudentStatus')) + '">' + (editing
        ? '<select class="input course-request-inline-control" data-registration-field="studentStatus" aria-label="' +
          e(t('registrationRequestStudentStatus')) + '">' +
          '<option value=""' + (!request.studentStatus ? ' selected' : '') + '>—</option>' +
          '<option value="student"' + (request.studentStatus === 'student' ? ' selected' : '') + '>' +
          e(t('registrationRequestStudent')) + '</option>' +
          '<option value="graduate"' + (request.studentStatus === 'graduate' ? ' selected' : '') + '>' +
          e(t('registrationRequestGraduate')) + '</option></select>'
        : request.studentStatus === 'student'
          ? e(t('registrationRequestStudent'))
          : request.studentStatus === 'graduate'
            ? e(t('registrationRequestGraduate')) : '<span class="tiny muted">—</span>') + '</td>') +
      (includeCourse ? '' : '<td data-label="' + e(labels.studyYear) + '">' + (editing
            ? '<input class="input course-request-inline-control" type="number" min="1" max="4294967295" step="1" data-registration-field="studyYear" value="' +
              e(request.studyYear || '') + '" aria-label="' + e(labels.studyYear) + '">'
            : request.studyYear
          ? e(request.studyYear)
          : '<span class="tiny muted">—</span>') + '</td>') +
      '<td data-label="' + e(labels.governorate) + '">' + (editing
        ? '<select class="input course-request-inline-control" data-registration-field="governorate" aria-label="' +
          e(labels.governorate) + '">' +
          '<option value=""' + (!request.governorate ? ' selected' : '') + '>—</option>' +
          '<option value="gaza"' + (request.governorate === 'gaza' ? ' selected' : '') + '>' +
          e(t('registrationRequestGovernorateGaza')) + '</option>' +
          '<option value="central"' + (request.governorate === 'central' ? ' selected' : '') + '>' +
          e(t('registrationRequestGovernorateCentral')) + '</option>' +
          '<option value="online"' + (request.governorate === 'online' ? ' selected' : '') + '>' +
          e(t('registrationRequestGovernorateOnline')) + '</option></select>'
        : request.governorate === 'gaza'
          ? e(t('registrationRequestGovernorateGaza'))
          : request.governorate === 'central'
            ? e(t('registrationRequestGovernorateCentral'))
            : request.governorate === 'online'
              ? e(t('registrationRequestGovernorateOnline'))
            : '<span class="tiny muted">—</span>') + '</td>' +
      '<td data-label="' + e(labels.phone) + '">' + (editing
        ? '<input class="input course-request-inline-control course-request-inline-phone" type="tel" maxlength="13" dir="ltr" data-registration-field="phone" value="' +
          e(request.phone || '') + '" aria-label="' + e(labels.phone) + '">'
        : '<a href="https://wa.me/' + e(String(request.phone || '').replace(/\D/g, '')) +
          '" target="_blank" rel="noopener noreferrer" dir="ltr">' + e(request.phone || '—') + '</a>') +
      '</td>' +
      '<td data-label="' + e(labels.source) + '">' + e(source) + '</td>' +
      '<td data-label="' + e(labels.status) + '">' + (editing && !includeCourse
        ? '<select class="input course-request-inline-control course-request-inline-status" data-registration-field="status" aria-label="' +
          e(labels.status) + '">' +
          statusOptions.map(function (option) {
            return '<option value="' + option.value + '"' +
              (status === option.value ? ' selected' : '') + '>' +
              e(t(option.label)) + '</option>';
          }).join('') + '</select>'
        : '<button type="button" class="st st-toggle ' + currentStatus.cls +
        ' course-registration-status-toggle' + (status === 'accepted' ? ' is-final' : '') + '"' +
        (status === 'accepted'
          ? ' disabled aria-disabled="true" title="' + e(t(currentStatus.label)) + '"'
          : ' data-act="course-registration-status-toggle" data-id="' + e(request.id) +
            '" data-next-status="' + nextStatus.value + '" title="' +
            e(t('courseRegistrationStatusClick') + ' ' + t(nextStatus.label)) + '"') +
        ' aria-label="' + e(t('courseRegistrationStatus') + ': ' + t(currentStatus.label) +
          (status === 'accepted' ? '' : '. ' + t('courseRegistrationStatusClick') +
            ' ' + t(nextStatus.label))) +
        '">' + e(t(currentStatus.label)) + '</button>') + '</td>' +
      (includeCourse ? '' : '<td data-label="' + e(labels.date) + '">' + e(UI.formatDate(request.createdAt)) + '</td>') +
      (includeCourse ? '' : '<td data-label="' + e(labels.paid) + '">' + paidAmountCell + '</td>') +
      (includeCourse ? '' : '<td data-label="' + e(labels.account) + '">' + (status === 'accepted'
        ? inPersonStudentSetupActions(request, false)
        : '<span class="tiny muted">—</span>') + '</td>') +
      '<td class="course-request-row-actions" data-label="' + e(t('colActions')) + '"><div class="course-request-row-actions-inner">' +
      ((includeCourse && status === 'accepted') ? inPersonStudentSetupActions(request, false) : '') +
      (editing
        ? '<button type="button" class="btn btn-primary btn-sm" data-act="course-registration-row-save" data-id="' +
          e(request.id) + '">' + UI.icon('check', 14) + e(t('save')) + '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="course-registration-row-cancel" data-id="' +
          e(request.id) + '">' + UI.icon('x', 14) + e(t('cancel')) + '</button>'
        : '<button type="button" class="btn-icon" data-act="' + (includeCourse
          ? 'course-registration-request-edit' : 'course-registration-row-edit') + '" data-id="' +
          e(request.id) + '" title="' + e(t('studentEdit')) + '" aria-label="' +
          e(t('studentEdit')) + '">' + UI.icon('pencil', 15) + '</button>') +
      '</div></td>' +
      '</tr>';
  }

  function renderCourseCohortRequests(cohort, cohortRequests, includeCourse) {
    if (!cohortRequests.length &&
      (!includeCourse || !courseRegistrationRequestCourseFilter)) {
      return '<p class="tiny muted">' +
        e(t(includeCourse ? 'registrationRequestEmpty' : 'courseCohortNoApplicants')) + '</p>';
    }
    cohortRequests = cohortRequests.slice().sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
    var sourceNames = cohortRequests.map(function (request) {
      return request.sourceStudentName || '';
    }).filter(function (name, index, names) {
      return name && names.indexOf(name) === index;
    });
    var courseOptions = [];
    var courseOptionIds = [];
    cohortRequests.forEach(function (request) {
      var courseId = String(request.courseId || '');
      if (!courseId || courseOptionIds.indexOf(courseId) !== -1) return;
      courseOptionIds.push(courseId);
      courseOptions.push({ id: courseId, title: request.courseTitle || courseId });
    });
    courseOptions.sort(function (left, right) {
      return left.title.localeCompare(right.title);
    });
    var selectedCourseId = courseRegistrationRequestCourseFilter;
    var cohortOptions = [];
    var cohortOptionIds = [];
    cohortRequests.forEach(function (request) {
      var courseId = String(request.courseId || '');
      var cohortId = String(request.cohortId || '');
      if (selectedCourseId && courseId !== selectedCourseId) return;
      if (!cohortId || cohortOptionIds.indexOf(cohortId) !== -1) return;
      cohortOptionIds.push(cohortId);
      cohortOptions.push({
        id: cohortId,
        name: request.cohortName || t('courseCohort') + ' ' + cohortId
      });
    });
    cohortOptions.sort(function (left, right) {
      return left.name.localeCompare(right.name);
    });
    if (selectedCourseId && courseOptionIds.indexOf(selectedCourseId) === -1) {
      var selectedCourse = Store.collection('certificates').filter(function (course) {
        return String(course.id) === selectedCourseId || String(course.pk) === selectedCourseId;
      })[0];
      courseOptions.push({
        id: selectedCourseId,
        title: selectedCourse ? selectedCourse.title : selectedCourseId
      });
    }
    var requestStatusOptions = [
      { value: 'new', label: 'registrationRequestNew' },
      { value: 'contacted', label: 'registrationRequestContacted' },
      { value: 'accepted', label: 'registrationRequestAccepted' },
      { value: 'rejected', label: 'registrationRequestRejected' }
    ];
    return '<div class="course-cohort-filters' +
      (includeCourse ? ' course-registration-request-filters' : '') + '">' +
      (includeCourse
        ? '<label class="course-cohort-filter"><span>' +
          e(t('registrationRequestCourseFilter')) + '</span>' +
          '<select class="input" data-registration-course-filter>' +
          '<option value="">' + e(t('registrationRequestAllCourses')) + '</option>' +
          courseOptions.map(function (course) {
            return '<option value="' + e(course.id) + '"' +
              (selectedCourseId === course.id ? ' selected' : '') + '>' +
              e(course.title) + '</option>';
          }).join('') + '</select></label>' +
          '<label class="course-cohort-filter"><span>' +
          e(t('registrationRequestCohortFilter')) + '</span>' +
          '<select class="input" data-registration-cohort-filter>' +
          '<option value="">' + e(t('registrationRequestAllCohorts')) + '</option>' +
          cohortOptions.map(function (cohort) {
            return '<option value="' + e(cohort.id) + '"' +
              (courseRegistrationRequestCohortFilter === cohort.id ? ' selected' : '') + '>' +
              e(cohort.name) + '</option>';
          }).join('') + '</select></label>' +
          '<label class="course-cohort-filter"><span>' +
          e(t('registrationRequestStatus')) + '</span>' +
          '<select class="input" data-registration-status-filter>' +
          '<option value="">' + e(t('allStatus')) + '</option>' +
          requestStatusOptions.map(function (option) {
            return '<option value="' + e(option.value) + '"' +
              (courseRegistrationRequestStatusFilter === option.value ? ' selected' : '') + '>' +
              e(t(option.label)) + '</option>';
          }).join('') + '</select></label>'
        : '') +
      '<label class="course-cohort-filter">' +
      '<span>' + e(t('courseCohortApplicantSearch')) + '</span>' +
      '<input class="input" type="search" data-cohort-applicant-search="' + e(cohort.id) +
      '" autocomplete="off" placeholder="' + e(t('courseCohortApplicantPlaceholder')) +
      '" value="' + e(courseCohortApplicantQueries[cohort.id] || '') + '">' +
      '</label>' +
      '<label class="course-cohort-filter">' +
      '<span>' + e(t('courseCohortSourceSearch')) + '</span>' +
      '<select class="input" data-cohort-source-filter="' + e(cohort.id) + '">' +
      '<option value="">' + e(t('courseCohortAllSources')) + '</option>' +
      sourceNames.map(function (name) {
        return '<option value="' + e(name) + '"' +
          (courseCohortSourceQueries[cohort.id] === name ? ' selected' : '') + '>' +
          e(name) + '</option>';
      }).join('') +
      '</select></label></div>' +
      '<p class="tiny muted course-cohort-no-matches" hidden>' +
      e(t('courseCohortNoApplicantMatches')) + '</p>' +
      '<div class="tbl-wrap course-cohort-table-wrap' +
      (includeCourse ? ' course-registration-requests-table-wrap' : '') +
      (includeCourse ? '' : ' course-cohort-students-table-wrap') +
      '"><table class="adm-table"><thead><tr>' +
      (includeCourse ? '<th scope="col">' + e(t('registrationRequestCourse')) + '</th>' : '') +
      '<th scope="col">' + e(t('registrationRequestName')) + '</th>' +
      (includeCourse ? '' : '<th scope="col">' + e(t('registrationRequestAddress')) + '</th>') +
      (includeCourse ? '' : '<th scope="col">' + e(t('registrationRequestSpecialty')) + '</th>') +
      (includeCourse ? '' : '<th scope="col">' + e(t('registrationRequestStudentStatus')) + '</th>') +
      (includeCourse ? '' : '<th scope="col">' + e(t('registrationRequestStudyYear')) + '</th>') +
      '<th scope="col">' + e(t('registrationRequestGovernorate')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestPhone')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestSource')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestStatus')) + '</th>' +
      (includeCourse ? '' : '<th scope="col">' + e(t('registrationRequestDate')) + '</th>') +
      (includeCourse ? '' : '<th scope="col">' + e(t('courseRegistrationPaidAmount')) + '</th>') +
      (includeCourse ? '' : '<th scope="col">' + e(t('inPersonStudentAccount')) + '</th>') +
      '<th scope="col">' + e(t('colActions')) + '</th>' +
      '</tr></thead><tbody>' + cohortRequests.map(function (request) {
        return courseCohortRequestRow(request, includeCourse);
      }).join('') +
      '</tbody></table></div>';
  }

  function replaceCourseRegistrationRequestRow(row, request, editing) {
    var replacementHost = document.createElement('tbody');
    replacementHost.innerHTML = courseCohortRequestRow(
      request,
      row.getAttribute('data-include-course') === 'true',
      !!editing
    );
    var replacement = replacementHost.firstElementChild;
    if (!replacement) return null;
    replacement.hidden = row.hidden;
    row.parentNode.replaceChild(replacement, row);
    return replacement;
  }

  function renderCourseCohortSubscriptions(paidStudents) {
    if (!paidStudents.length) {
      return '<p class="tiny muted">' + e(t('inPersonPaymentInvoicesEmpty')) + '</p>';
    }

    function money(amount, currency) {
      return e(amount == null || amount === '' ? '—' : amount) + ' ' +
        (currency === 'USD' ? '$' : '₪');
    }

    var labels = {
      student: t('registrationRequestName'),
      phone: t('registrationRequestPhone'),
      course: t('registrationRequestCourse'),
      cohort: t('courseCohort'),
      price: t('inPersonPaymentAmount'),
      paid: t('courseRegistrationPaidAmount'),
      remaining: t('courseRegistrationRemaining'),
      payments: t('courseRegistrationPaymentDetails'),
      actions: t('colActions')
    };
    var rows = paidStudents.map(function (request) {
      var isPaid = Number(request.remainingAmount) <= 0;
      return '<tr class="course-cohort-applicant-row" data-registration-request-row="' +
        e(request.id) + '" data-request-course="' + e(request.courseId || '') +
        '" data-request-cohort="' + e(request.cohortId || '') +
        '" data-request-status="' + e(request.status) +
        '" data-cohort-source="' + e(request.sourceStudentName || '') +
        '" data-applicant-search="' +
        e([request.fullName || '', request.phone || ''].join(' ').toLocaleLowerCase()) + '">' +
        '<td data-label="' + e(labels.student) + '"><b>' + e(request.fullName) + '</b></td>' +
        '<td data-label="' + e(labels.phone) + '"><span dir="ltr">' + e(request.phone) + '</span></td>' +
        '<td data-label="' + e(labels.course) + '">' + e(request.courseTitle || '—') + '</td>' +
        '<td data-label="' + e(labels.cohort) + '">' + e(request.cohortName || '—') + '</td>' +
        '<td data-label="' + e(labels.price) + '"><b>' +
        money(request.coursePriceAmount, request.currency) + '</b></td>' +
        '<td data-label="' + e(labels.paid) + '"><span class="chip ok">' +
        money(request.paidAmount, request.currency) + '</span></td>' +
        '<td data-label="' + e(labels.remaining) + '"><span class="chip ' +
        (isPaid ? 'ok' : 'warn') + '">' +
        money(request.remainingAmount, request.currency) + '</span></td>' +
        '<td data-label="' + e(labels.payments) + '">' +
        courseRegistrationPaymentCell(request, false) + '</td>' +
        '<td class="course-request-row-actions" data-label="' + e(labels.actions) + '">' +
        inPersonStudentSetupActions(request) + '</td></tr>';
    }).join('');

    return '<div class="tbl-wrap course-cohort-table-wrap course-cohort-students-table-wrap in-person-subscriptions-page">' +
      '<table class="adm-table"><thead><tr>' +
      [labels.student, labels.phone, labels.course, labels.cohort, labels.price,
        labels.paid, labels.remaining, labels.payments, labels.actions]
        .map(function (label) { return '<th scope="col">' + e(label) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function courseCohortCard(cohort, requests, expanded) {
    var cohortRequests = requests.filter(function (request) {
      return String(request.cohortId) === String(cohort.id);
    });
    var paidStudents = cohortRequests.filter(function (request) {
      return request.status === 'accepted' && Number(request.paidAmount) > 0;
    });
    var historyToggle = cohort.active ? '' :
      '<button type="button" class="btn btn-soft btn-sm" data-act="course-cohort-history-toggle" data-id="' +
      e(cohort.id) + '">' + UI.icon(expanded ? 'chevron-up' : 'chevron-down', 14) +
      e(t(expanded ? 'courseCohortHideRequests' : 'courseCohortViewRequests')) + '</button>';
    return '<section class="course-cohort-card">' +
      '<header><div><b>' + e(t('courseCohort')) + ' ' + e(cohort.name) + '</b>' +
      '<span class="st ' + (cohort.active ? 'st-ok' : 'st-mute') + '">' +
      e(t(cohort.active ? 'courseCohortActive' : 'courseCohortClosed')) + '</span></div>' +
      '<div class="course-cohort-card-actions">' + historyToggle + '</div></header>' +
      '<div class="course-cohort-dates"><span>' + e(t('courseCohortStart')) + ': ' +
      e(UI.formatDate(cohort.startedAt)) + '</span><span>' + e(t('courseCohortEnd')) + ': ' +
      e(cohort.endedAt ? UI.formatDate(cohort.endedAt) : '—') + '</span>' +
      '<span>' + e(t('courseCohortApplicants')) + ': ' + paidStudents.length + '</span></div>' +
      (cohort.active || expanded
        ? renderCourseCohortSubscriptions(paidStudents)
        : '') + '</section>';
  }

  function renderCourseCohortsPage() {
    var courseId = getCourseCohortRoute();
    var course = Store.collection('certificates').filter(function (item) {
      return String(item.pk || item.id) === String(courseId);
    })[0];
    if (!course) {
      return '<button type="button" class="btn btn-ghost btn-sm" data-act="course-cohorts-back" data-return-section="' +
        e(getCourseCohortReturnSection()) + '">' +
        UI.icon('arrow-right', 14) + e(t('courseCohortsBack')) + '</button>' +
        '<p class="tiny muted">' + e(t('courseCohortCourseMissing')) + '</p>';
    }
    var cohorts = AdminData.inPersonCohorts().filter(function (cohort) {
      return String(cohort.courseId) === String(course.id);
    }).sort(function (left, right) {
      return Number(right.number) - Number(left.number);
    });
    var requests = AdminData.courseRegistrationRequests().filter(function (request) {
      return String(request.courseId || course.id) === String(course.id);
    });
    var activeCohort = cohorts.filter(function (cohort) { return cohort.active; })[0];
    var history = cohorts.filter(function (cohort) { return !cohort.active; });
    return '<div class="course-cohort-page">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-act="course-cohorts-back" data-return-section="' +
      e(getCourseCohortReturnSection()) + '">' +
      UI.icon('arrow-right', 14) + e(t('courseCohortsBack')) + '</button>' +
      '<h2>' + e(course.title) + '</h2>' +
      '<section class="course-cohort-page-section"><h3>' + e(t('courseCohortActiveRequests')) + '</h3>' +
      (activeCohort
        ? courseCohortCard(activeCohort, requests, false)
        : '<p class="tiny muted">' + e(t('courseCohortNoActive')) + '</p>') +
      '</section><section class="course-cohort-page-section"><h3>' +
      e(t('courseCohortHistory')) + '</h3>' +
      (history.length
        ? '<div class="course-cohorts-list">' + history.map(function (cohort) {
          return courseCohortCard(cohort, requests, !!expandedHistoricalCohorts[cohort.id]);
        }).join('') + '</div>'
        : '<p class="tiny muted">' + e(t('courseCohortNoHistory')) + '</p>') +
      '</section></div>';
  }

  function getCourseCohortReturnSection() {
    var route = (location.hash || '').replace(/^#\/?/, '');
    return new URLSearchParams(route.split('?')[1] || '').get('from') === 'workshops'
      ? 'workshops'
      : 'in-person-courses';
  }

  function wireCourseCohortPage(host) {
    wireInPersonStudentPayments(host);

    function filterRequests(cohortId, card) {
      var query = (courseCohortApplicantQueries[cohortId] || '').trim().toLocaleLowerCase();
      var selectedSource = courseCohortSourceQueries[cohortId] || '';
      var selectedStatus = courseRegistrationRequestStatusFilter;
      var rows = card.querySelectorAll('.course-cohort-applicant-row');
      var visibleCount = 0;
      rows.forEach(function (row) {
        var matchesApplicant = !query ||
          (row.getAttribute('data-applicant-search') || '').indexOf(query) !== -1;
        var matchesSource = !selectedSource ||
          row.getAttribute('data-cohort-source') === selectedSource;
        var matchesCourse = cohortId !== 'all' ||
          !courseRegistrationRequestCourseFilter ||
          row.getAttribute('data-request-course') === courseRegistrationRequestCourseFilter;
        var matchesCohort = cohortId !== 'all' ||
          !courseRegistrationRequestCohortFilter ||
          row.getAttribute('data-request-cohort') === courseRegistrationRequestCohortFilter;
        var matchesStatus = !selectedStatus ||
          (row.getAttribute('data-request-status') || '') === selectedStatus;
        var matches = matchesApplicant && matchesSource && matchesCourse && matchesCohort && matchesStatus;
        row.hidden = !matches;
        if (matches) visibleCount += 1;
      });
      var noMatches = card.querySelector('.course-cohort-no-matches');
      noMatches.hidden = visibleCount > 0;
    }

    host.querySelectorAll('[data-cohort-applicant-search]').forEach(function (input) {
      var cohortId = input.getAttribute('data-cohort-applicant-search');
      var card = input.closest('.course-cohort-card');
      input.addEventListener('input', function () {
        courseCohortApplicantQueries[cohortId] = input.value;
        filterRequests(cohortId, card);
      });
      if (input.value || courseCohortSourceQueries[cohortId]) filterRequests(cohortId, card);
    });

    host.querySelectorAll('[data-cohort-source-filter]').forEach(function (select) {
      var cohortId = select.getAttribute('data-cohort-source-filter');
      var card = select.closest('.course-cohort-card');
      select.addEventListener('change', function () {
        courseCohortSourceQueries[cohortId] = select.value;
        filterRequests(cohortId, card);
      });
      if (select.value || courseCohortApplicantQueries[cohortId]) filterRequests(cohortId, card);
    });

    var allRequestsCard = host.querySelector('.course-registration-requests-table-wrap')
      ? host.querySelector('.course-registration-requests-table-wrap').closest('.course-cohort-card')
      : null;
    var allRequestsSearch = allRequestsCard &&
      allRequestsCard.querySelector('[data-cohort-applicant-search]');
    var allRequestsCohortId = allRequestsSearch &&
      allRequestsSearch.getAttribute('data-cohort-applicant-search');
    var courseFilter = host.querySelector('[data-registration-course-filter]');
    var cohortFilter = host.querySelector('[data-registration-cohort-filter]');
    var statusFilter = host.querySelector('[data-registration-status-filter]');
    if (allRequestsCard && allRequestsCohortId) {
      function applyRegistrationRequestFilters() {
        filterRequests(allRequestsCohortId, allRequestsCard);
      }
      if (courseFilter) {
        courseFilter.addEventListener('change', function () {
          courseRegistrationRequestCourseFilter = courseFilter.value;
          courseRegistrationRequestCohortFilter = '';
          var selectedCourse = courseRegistrationRequestCourseFilter;
          var matchingCohorts = AdminData.courseRegistrationRequests().filter(function (request) {
            return request.cohortId &&
              (!selectedCourse || String(request.courseId) === selectedCourse);
          }).reduce(function (options, request) {
            var cohortId = String(request.cohortId);
            if (!options.some(function (cohort) { return cohort.id === cohortId; })) {
              options.push({
                id: cohortId,
                name: request.cohortName || t('courseCohort') + ' ' + cohortId
              });
            }
            return options;
          }, []).sort(function (left, right) {
            return left.name.localeCompare(right.name);
          });
          if (cohortFilter) {
            cohortFilter.innerHTML = '<option value="">' +
              e(t('registrationRequestAllCohorts')) + '</option>' +
              matchingCohorts.map(function (cohort) {
                return '<option value="' + e(cohort.id) + '">' +
                  e(cohort.name) + '</option>';
              }).join('');
          }
          applyRegistrationRequestFilters();
        });
      }
      if (cohortFilter) {
        cohortFilter.addEventListener('change', function () {
          courseRegistrationRequestCohortFilter = cohortFilter.value;
          applyRegistrationRequestFilters();
        });
      }
      if (statusFilter) {
        statusFilter.addEventListener('change', function () {
          courseRegistrationRequestStatusFilter = statusFilter.value;
          applyRegistrationRequestFilters();
        });
      }
      if (
        courseRegistrationRequestCourseFilter ||
        courseRegistrationRequestCohortFilter ||
        courseRegistrationRequestStatusFilter
      ) {
        applyRegistrationRequestFilters();
      }
    }
  }

  Admin.register('in-person-course-cohorts', {
    render: renderCourseCohortsPage,
    wire: wireCourseCohortPage
  });

  Admin.on('course-cohorts', function (el) {
    var source = el.getAttribute('data-course-kind') === 'workshop' ? '?from=workshops' : '';
    Admin.navigate(
      'in-person-course-cohorts/' + encodeURIComponent(el.getAttribute('data-id')) + source
    );
  });

  Admin.on('course-cohorts-back', function (el) {
    Admin.navigate(el.getAttribute('data-return-section') || getCourseCohortReturnSection());
  });

  Admin.on('course-cohort-history-toggle', function (el) {
    var cohortId = el.getAttribute('data-id');
    expandedHistoricalCohorts[cohortId] = !expandedHistoricalCohorts[cohortId];
    Admin.renderAll();
  });

  Admin.on('course-registration-details', function (el) {
    var request = AdminData.courseRegistrationRequests().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!request) return;

    var statusKeys = {
      new: 'registrationRequestNew',
      contacted: 'registrationRequestContacted',
      accepted: 'registrationRequestAccepted',
      rejected: 'registrationRequestRejected'
    };
    var studentStatusKey = request.studentStatus === 'graduate'
      ? 'registrationRequestGraduate'
      : request.studentStatus === 'student' ? 'registrationRequestStudent' : '';
    var status = request.status || 'new';
    var statusClass = status === 'accepted' ? 'st-ok'
      : status === 'rejected' ? 'st-danger'
        : status === 'contacted' ? 'st-brand' : 'st-warn';
    function detailField(label, value, extraClass) {
      return '<div class="course-request-detail-field' +
        (extraClass ? ' ' + extraClass : '') + '"><span>' + e(label) +
        '</span><b>' + e(value || '—') + '</b></div>';
    }
    UI.modal({
      title: t('courseCohortRequestDetails'),
      size: 'md',
      body: '<div class="course-registration-details">' +
        '<section class="course-request-summary">' +
        '<span class="course-request-avatar">' + UI.icon('user', 22) + '</span>' +
        '<div class="course-request-summary-main"><span>' + e(t('registrationRequestName')) +
        '</span><h4>' + e(request.fullName || '—') + '</h4>' +
        '<p>' + e(request.courseTitle || '—') + '</p></div>' +
        '<span class="st ' + statusClass + '">' +
        e(t(statusKeys[status] || 'registrationRequestNew')) + '</span></section>' +
        '<a class="course-request-phone" href="https://wa.me/' +
        e(String(request.phone || '').replace(/\D/g, '')) +
        '" target="_blank" rel="noopener noreferrer" dir="ltr">' +
        '<span class="course-request-phone-icon">' + UI.icon('message-circle', 18) + '</span>' +
        '<span class="course-request-phone-copy"><small>' + e(t('registrationRequestPhone')) +
        '</small><b>' + e(request.phone || '—') + '</b></span>' +
        '<span class="course-request-phone-action">' + e(t('courseRequestOpenWhatsApp')) + '</span></a>' +
        '<section class="course-request-detail-section"><h4>' +
        e(t('courseCohortApplicantInfo')) + '</h4><div class="course-request-detail-grid">' +
        detailField(t('registrationRequestAddress'), request.address) +
        detailField(t('registrationRequestSpecialty'), request.specialty) +
        detailField(
          t('registrationRequestGovernorate'),
          request.governorate === 'gaza'
            ? t('registrationRequestGovernorateGaza')
            : request.governorate === 'central'
              ? t('registrationRequestGovernorateCentral')
              : request.governorate === 'online'
                ? t('registrationRequestGovernorateOnline') : ''
        ) +
        detailField(t('registrationRequestStudyYear'), request.studyYear) +
        detailField(t('colRole'), studentStatusKey ? t(studentStatusKey) : '—') +
        '</div></section>' +
        '<section class="course-request-detail-section"><h4>' +
        e(t('courseCohortApplicationInfo')) + '</h4><div class="course-request-detail-grid">' +
        detailField(t('registrationRequestSource'), request.sourceStudentName || t('registrationRequestDirect')) +
        detailField(t('courseCohort'), request.cohortName) +
        detailField(t('courseRegistrationPaidAmount'), (request.paidAmount || '0.00') +
          ' ' + (request.currency === 'USD' ? '$' : '₪')) +
        detailField(t('courseRegistrationRemaining'), request.remainingAmount
          ? request.remainingAmount + ' ' + (request.currency === 'USD' ? '$' : '₪')
          : '—') +
        detailField(t('registrationRequestDate'), UI.formatDate(request.createdAt)) +
        '</div></section></div>'
    });
  });

  Admin.on('course-registration-row-edit', function (el) {
    var request = AdminData.courseRegistrationRequests().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    var row = el.closest('[data-registration-request-row]');
    if (!request || !row) return;
    var replacement = replaceCourseRegistrationRequestRow(row, request, true);
    var nameInput = replacement && replacement.querySelector('[data-registration-field="fullName"]');
    if (nameInput) nameInput.focus();
  });

  Admin.on('course-registration-row-cancel', function (el) {
    var request = AdminData.courseRegistrationRequests().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    var row = el.closest('[data-registration-request-row]');
    if (!request || !row) return;
    var replacement = replaceCourseRegistrationRequestRow(row, request, false);
    var editButton = replacement && replacement.querySelector(
      '[data-act="course-registration-row-edit"]'
    );
    if (editButton) editButton.focus({ preventScroll: true });
  });

  Admin.on('course-registration-row-save', function (el) {
    var requestId = el.getAttribute('data-id');
    var row = el.closest('[data-registration-request-row]');
    if (!row) return;
    var values = {};
    Array.prototype.forEach.call(
      row.querySelectorAll('[data-registration-field]'),
      function (input) {
        values[input.getAttribute('data-registration-field')] = input.value.trim();
      }
    );
    var nameParts = (values.fullName || '').split(/\s+/);
    if (nameParts.length < 3 || nameParts.length > 6 ||
        !nameParts.every(function (part) { return /^[\p{L}\p{M}]+$/u.test(part); })) {
      UI.toast(t('registrationRequestNameInvalid'), 'error');
      return;
    }
    if (!/^\+97(?:0|2)(?:59|56)\d{7}$/.test(values.phone || '')) {
      UI.toast(t('registrationRequestPhoneInvalid'), 'error');
      return;
    }
    if (!values.address || values.address.length > 255 ||
        !values.specialty || values.specialty.length > 150 ||
        ['gaza', 'central', 'online'].indexOf(values.governorate) === -1 ||
        !/^[1-9]\d*$/.test(values.studyYear || '') ||
        Number(values.studyYear) > 4294967295 ||
        ['', 'student', 'graduate'].indexOf(values.studentStatus) === -1 ||
        ['new', 'contacted', 'accepted', 'rejected'].indexOf(values.status) === -1) {
      UI.toast(
        !/^[1-9]\d*$/.test(values.studyYear || '') ||
          Number(values.studyYear) > 4294967295
          ? t('registrationRequestStudyYearInvalid')
          : ['gaza', 'central', 'online'].indexOf(values.governorate) === -1
            ? t('registrationRequestGovernorateInvalid')
            : t('registrationRequestInvalid'),
        'error'
      );
      return;
    }
    values.studyYear = Number(values.studyYear);
    el.disabled = true;
    fetch(SITE.u('courseRegistrationRequestUpdate', requestId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify(values)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('saveError'));
        }
        return data;
      });
    }).then(function (data) {
      AdminData.updateCourseRegistrationRequest(data.request);
      var updatedRequest = AdminData.courseRegistrationRequests().filter(function (item) {
        return String(item.id) === String(requestId);
      })[0];
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-registration-request-row]'),
        function (requestRow) {
          if (requestRow.getAttribute('data-registration-request-row') === String(requestId)) {
            replaceCourseRegistrationRequestRow(requestRow, updatedRequest, false);
          }
        }
      );
      UI.toast(t('studentUpdated'), 'success');
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });

  Admin.on('course-registration-status-toggle', function (el) {
    var requestId = el.getAttribute('data-id');
    var nextStatus = el.getAttribute('data-next-status');
    var restoreStatusFocus = document.activeElement === el;
    el.disabled = true;
    el.classList.add('is-updating');
    fetch(SITE.u('courseRegistrationRequestStatus', requestId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ status: nextStatus })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('courseRegistrationConfirmFailed'));
        }
        return data;
      });
    }).then(function (data) {
      AdminData.updateCourseRegistrationRequest(data.request);
      Array.prototype.forEach.call(
        document.querySelectorAll('[data-registration-request-row]'),
        function (row) {
          if (row.getAttribute('data-registration-request-row') !== String(requestId)) return;
          var replacementHost = document.createElement('tbody');
          replacementHost.innerHTML = courseCohortRequestRow(
            data.request,
            row.getAttribute('data-include-course') === 'true'
          );
          var replacement = replacementHost.firstElementChild;
          if (!replacement) return;
          replacement.hidden = row.hidden;
          var body = row.parentNode;
          body.replaceChild(replacement, row);
          if (restoreStatusFocus) {
            var updatedToggle = replacement.querySelector('.course-registration-status-toggle');
            if (updatedToggle) updatedToggle.focus({ preventScroll: true });
          }
        }
      );
      if (nextStatus === 'accepted') {
        showAcceptedStudentAccount(data.request);
      } else {
        UI.toast(t('courseRegistrationStatusUpdated'), 'success');
      }
    }).catch(function (error) {
      el.disabled = false;
      el.classList.remove('is-updating');
      UI.toast(error.message || t('courseRegistrationConfirmFailed'), 'error');
    });
  });

  Admin.on('course-registration-confirm', function (el) {
    var requestId = el.getAttribute('data-id');
    el.disabled = true;
    fetch(SITE.u('courseRegistrationRequestConfirm', requestId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': window.CSRF_TOKEN || '' }
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('courseRegistrationConfirmFailed'));
        }
        return data;
      });
    }).then(function (data) {
      AdminData.updateCourseRegistrationRequest(data.request);
      Admin.renderAll();
      UI.toast(t('courseRegistrationConfirmed'), 'success');
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('courseRegistrationConfirmFailed'), 'error');
    });
  });

  Admin.on('student-setup-link-create', function (el) {
    var requestId = el.getAttribute('data-id');
    el.disabled = true;
    fetch(SITE.u('courseRegistrationRequestSetupLink', requestId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': window.CSRF_TOKEN || '' }
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('saveError'));
        }
        return data;
      });
    }).then(function (data) {
      AdminData.updateCourseRegistrationRequest(data.request);
      Admin.renderAll();
      UI.toast(t('studentSetupLinkCreated'), 'success');
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });

  Admin.on('in-person-student-edit', function (el) {
    var request = AdminData.courseRegistrationRequests().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (request) inPersonStudentEditForm(request);
  });

  Admin.on('course-registration-request-edit', function (el) {
    var request = AdminData.courseRegistrationRequests().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (request) inPersonStudentEditForm(request, true);
  });

  Admin.on('student-setup-link-copy', function (el) {
    var request = AdminData.courseRegistrationRequests().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!request || !request.setupUrl) {
      UI.toast(t('studentSetupLinkCopyFailed'), 'error');
      return;
    }
    if (!isStudentSetupLinkAvailable(request)) {
      UI.toast(t('studentSetupLinkExpired'), 'error');
      return;
    }
    copyStudentSetupLink(request.setupUrl).then(function () {
      UI.toast(t('studentSetupLinkCopied'), 'success');
    }).catch(function (error) {
      UI.toast(error.message || t('studentSetupLinkCopyFailed'), 'error');
    });
  });

  Admin.on('student-setup-link-qr', function (el) {
    var request = AdminData.courseRegistrationRequests().filter(function (item) {
      return String(item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!request || !request.setupQrImage || !request.setupUrl) return;
    if (!isStudentSetupLinkAvailable(request)) {
      UI.toast(t('studentSetupLinkExpired'), 'error');
      return;
    }
    UI.modal({
      title: t('studentSetupLinkQrTitle'),
      size: 'sm',
      body: '<div class="workshop-qr-preview"><img src="' + e(request.setupQrImage) +
        '" alt="' + e(t('studentSetupLinkQrTitle')) + '">' +
        '<p class="tiny muted">' + e(t('studentSetupLinkExpires')) + ': ' +
        e(UI.formatDate(request.setupLinkExpiresAt)) + '</p>' +
        '<a class="btn btn-soft btn-sm" href="' + e(request.setupUrl) +
        '" target="_blank" rel="noopener noreferrer">' + UI.icon('external-link', 14) +
        e(t('studentSetupLinkOpen')) + '</a>' +
        '<code dir="ltr" style="overflow-wrap:anywhere">' +
        e(request.setupUrl) + '</code></div>'
    });
  });

  Admin.on('course-registration-paid-amount-save', function (el) {
    var requestId = el.getAttribute('data-id');
    var input = document.querySelector('[data-registration-paid-amount="' + requestId + '"]');
    if (!input) return;
    if (!validateInPersonStudentPayment(input)) {
      input.reportValidity();
      return;
    }
    el.disabled = true;
    input.disabled = true;
    fetch(SITE.u('courseRegistrationRequestPaidAmount', requestId), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ amount: input.value })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('courseRegistrationPaidAmountSaveFailed'));
        }
        return data;
      });
    }).then(function (data) {
      AdminData.updateCourseRegistrationRequest(data.request);
      Admin.renderAll();
      UI.toast(t('courseRegistrationPaidAmountSaved'), 'success');
    }).catch(function (error) {
      el.disabled = false;
      input.disabled = false;
      UI.toast(error.message || t('courseRegistrationPaidAmountSaveFailed'), 'error');
    });
  });

  Admin.on('course-toggle', function (el) {
    var course = Store.collection('certificates').filter(function (item) {
      return String(item.pk || item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!course) return;
    var active = (course.status || 'draft') !== 'published';
    UI.confirm(t(active ? 'courseActivate' : 'courseDeactivate') + '?').then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      return fetch(SITE.u('courseStatus', el.getAttribute('data-id')), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ active: active })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          course.status = data.active ? 'published' : 'draft';
          if (data.cohort) AdminData.updateInPersonCohort(data.cohort);
          Store.save(true);
          Admin.renderAll();
          UI.toast(t(data.active ? 'courseActive' : 'courseInactive'), 'success');
        });
      }).catch(function (error) {
        el.disabled = false;
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });

  Admin.on('course-visibility-toggle', function (el) {
    var course = Store.collection('certificates').filter(function (item) {
      return String(item.pk || item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!course) return;
    var profileOnly = !course.profileOnly;
    var inPerson = course.courseType === 'in_person';
    var confirmKey = inPerson
      ? (profileOnly ? 'courseHomepageConfirmHide' : 'courseHomepageConfirmShow')
      : (profileOnly ? 'courseVisibilityConfirmHide' : 'courseVisibilityConfirmShow');
    UI.confirm(t(confirmKey)).then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      return fetch(SITE.u('courseVisibility', el.getAttribute('data-id')), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ profileOnly: profileOnly })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) {
            throw new Error(data.message || data.error || t('saveError'));
          }
          course.profileOnly = data.profileOnly;
          Store.save(true);
          Admin.renderAll();
          var visibilityKey = inPerson
            ? (data.profileOnly ? 'courseHomepageHidden' : 'courseHomepageVisible')
            : (data.profileOnly ? 'courseVisibilityProfile' : 'courseVisibilityPlatform');
          UI.toast(t(visibilityKey), 'success');
        });
      }).catch(function (error) {
        Admin.renderAll();
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });

  Admin.on('course-bulk-pub', function () { bulkSet('courses', 'courses', 'certificates', 'status', 'published'); });
  Admin.on('course-bulk-draft', function () { bulkSet('courses', 'courses', 'certificates', 'status', 'draft'); });
  Admin.on('course-bulk-del', function () { bulkDel('courses', 'courses', 'certificates'); });
  Admin.on('inperson-course-bulk-pub', function () { bulkSet('in-person-courses', 'courses', 'certificates', 'status', 'published'); });
  Admin.on('inperson-course-bulk-draft', function () { bulkSet('in-person-courses', 'courses', 'certificates', 'status', 'draft'); });
  Admin.on('inperson-course-bulk-del', function () { bulkDel('in-person-courses', 'courses', 'certificates'); });

  Admin.register('lessons', {
    render: function () {
      var courses = courseOpts();
      return Admin.table({
        key: 'lessons',
        id: function (r) { return r.id; },
        rows: AdminData.lessonList(),
        pageSize: 12,
        search: function (r) { return [r.lesson.title, r.section.title, r.course.title].join(' '); },
        filters: [
          { k: 'course', label: t('fCourse'), val: function (r) { return r.course.id; }, options: courses },
          { k: 'type', label: t('fType'), val: function (r) { return r.lesson.type || 'video'; }, options: TYPE_OPTS }
        ],
        add: { label: t('lAdd'), act: 'lesson-add', icon: 'play' },
        bulk: [
          { act: 'lesson-bulk-del', label: t('bulkDelete'), icon: 'trash', danger: true }
        ],
        empty: {
          icon: 'list', title: t('emptyLessons'), sub: t('emptyLessonsSub'),
          action: '<button class="btn btn-primary btn-sm" data-act="lesson-add">' + UI.icon('plus', 15) + e(t('lAdd')) + '</button>'
        },
        columns: [
          {
            k: 'title', label: t('colLesson'), sortVal: function (r) { return r.lesson.title; },
            render: function (r) {
              return '<b style="font-size:13.5px">' + e(r.lesson.title) + '</b>' +
                (r.lesson.free ? ' <span class="st st-ok" style="font-size:10.5px">' + e(t('colFree')) + '</span>' : '');
            },
            csv: function (r) { return r.lesson.title; }
          },
          {
            k: 'course', label: t('colCourse'), sortVal: function (r) { return r.course.title; },
            render: function (r) { return '<span class="chip neutral">' + e(r.course.title) + '</span>'; },
            csv: function (r) { return r.course.title; }
          },
          {
            k: 'section', label: t('colSection'), sortVal: function (r) { return r.section.title; },
            render: function (r) { return '<span class="tiny muted">' + e(r.section.title) + '</span>'; },
            csv: function (r) { return r.section.title; }
          },
          {
            k: 'type', label: t('colType'), sortVal: function (r) { return r.lesson.type || 'video'; },
            render: function (r) { return '<span class="chip">' + e(lessonTypeLabel(r.lesson.type)) + '</span>'; },
            csv: function (r) { return r.lesson.type || 'video'; }
          },
          {
            k: 'duration', label: t('colDuration'), sortVal: function (r) { return r.lesson.duration || ''; },
            render: function (r) { return '<span dir="ltr" class="tiny muted">' + e(r.lesson.duration || '—') + '</span>'; },
            csv: function (r) { return r.lesson.duration || ''; }
          },
          {
            k: 'viewers', label: t('lessonComplete'),
            sortVal: function (r) { return AdminData.lessonCompleteCount(r.id); },
            render: function (r) { return viewersBtn(r.id); },
            csv: function (r) { return AdminData.lessonCompleteCount(r.id); }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (r) {
              return iconBtn('lesson-free', r.id, 'check-circle', t('colFree')) +
                iconBtn('lesson-edit', r.id, 'pencil', t('edit')) +
                iconBtn('lesson-del', r.id, 'trash', t('delete'), 'danger');
            }
          }
        ]
      });
    }
  });

  function lessonModal(id, courseId, onDone) {
    var row = id ? AdminData.findLesson(id) : null;
    var courses = Store.collection('certificates');
    if (!courses.length) { UI.toast(t('emptyCourses'), 'error'); return; }
    var curCourse = row ? row.course.id : (courseId || courses[0].id);
    if (!Store.find('certificates', curCourse)) curCourse = courses[0].id;

    function sectionsOf(courseId) {
      var c = Store.find('certificates', courseId) || {};
      return c.syllabus || [];
    }
    function sectionOpts(courseId) {
      return sectionsOf(courseId).map(function (section) {
        return { v: section.id, l: section.title };
      })
        .concat([{ v: '__new__', l: t('lNewSection') }]);
    }

    var fields = [
      sectionField(t('secBasic')),
      { k: 'courseId', label: t('lCourse'), type: 'select', required: true, options: courseOpts(), value: curCourse },
      {
        k: 'section', label: t('lSection'), type: 'select', required: true,
        options: sectionOpts(curCourse),
        value: row ? row.section.id : (sectionsOf(curCourse)[0] ? sectionsOf(curCourse)[0].id : '__new__'),
        hint: t('lSectionHint')
      },
      { k: 'newSection', label: t('lNewSection'), type: 'text' },
      { k: 'title', label: t('lTitle'), type: 'text', required: true, value: row ? row.lesson.title : '' },
      { k: 'duration', label: t('lDuration'), type: 'text', value: row ? row.lesson.duration : '', placeholder: '12:30', dir: 'ltr' },
      { k: 'type', label: t('colType'), type: 'select', options: TYPE_OPTS, value: row ? (row.lesson.type || 'video') : 'video' },
      { k: 'videoUrl', label: t('lVideoUrl'), type: 'text', value: row ? row.lesson.videoUrl : '', dir: 'ltr' },
      {
        k: 'projectId', label: t('lProject'), type: 'select',
        options: [{ v: '', l: t('lPickProject') }].concat(AdminData.projects().filter(function (project) {
          var course = Store.find('certificates', curCourse);
          return course && String(project.ownerId) === String(course.trainerId);
        }).map(function (project) { return { v: project.id, l: project.title || project.id }; })),
        value: row ? row.lesson.projectId : ''
      },
      { k: 'free', label: t('colFree'), type: 'switch', value: row ? !!row.lesson.free : false },
      sectionField(t('secContent')),
      { k: 'content', label: t('lContent'), type: 'textarea', full: true, rows: 5, placeholder: t('lContent'), value: row ? row.lesson.content : '' },
      infoField(lessonQuizHTML(row && row.lesson.quiz
        ? JSON.parse(JSON.stringify(row.lesson.quiz))
        : defaultLessonQuiz()))
    ];
    if (row) {
      fields.push(sectionField(t('secRelated'), t('lRelatedHint')));
      fields.push(infoField(relatedPanel([[t('lessonComplete'), AdminData.lessonCompleteCount(row.id)]])));
    }

    var m = Admin.formModal({
      title: row ? t('mLesson') : t('lAdd'),
      size: 'lg',
      fields: fields,
      submit: row ? t('saveChanges') : t('lAdd'),
      onSubmit: function (v) {
        var sectionTitle = String(v.section || '').trim();
        var sectionId = sectionTitle === '__new__' ? '' : sectionTitle;
        if (sectionTitle === '__new__') {
          sectionTitle = String(v.newSection || '').trim();
          if (!sectionTitle) {
            UI.toast(t('fieldRequired') + ' — ' + t('lSection'), 'error');
            return false;
          }
        } else {
          var selectedSection = sectionsOf(row ? row.course.id : v.courseId).filter(function (section) {
            return String(section.id) === sectionId;
          })[0];
          sectionTitle = selectedSection ? selectedSection.title : '';
        }
        var payload = {
          courseId: row ? row.course.id : v.courseId,
          lessonId: row ? row.id : '',
          sectionId: sectionId,
          title: v.title,
          duration: v.duration,
          type: v.type,
          free: v.free,
          content: v.content,
          videoUrl: v.videoUrl,
          projectId: v.projectId,
          quiz: v.type === 'quiz' ? quizState : null,
          sectionTitle: sectionTitle
        };
        var submit = m.el.querySelector('[data-fm="save"]');
        if (submit) submit.disabled = true;
        fetch(SITE.u('courseLessonSave'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify(payload)
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            var storedCourses = Store.collection('certificates');
            var existingIndex = storedCourses.findIndex(function (course) {
              return String(course.id) === String(data.course.id);
            });
            if (existingIndex === -1) storedCourses.push(data.course);
            else storedCourses[existingIndex] = data.course;
            Store.save(true);
            AdminData.logActivity(row ? 'update' : 'create', 'lessons', data.course.title);
            UI.toast(t(row ? 'updated' : 'created'), 'success');
            Admin.renderAll();
            document.dispatchEvent(new CustomEvent('adm:lessons'));
            if (onDone) onDone();
            m.close();
          });
        }).catch(function (error) {
          if (submit) submit.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });

    var courseSel = m.body.querySelector('[data-fk="courseId"]');
    var secSel = m.body.querySelector('[data-fk="section"]');
    var typeSel = m.body.querySelector('[data-fk="type"]');
    var quizState = row && row.lesson.quiz
      ? JSON.parse(JSON.stringify(row.lesson.quiz))
      : defaultLessonQuiz();
    if (!Array.isArray(quizState.questions)) quizState.questions = [];
    var quizField = m.body.querySelector('[data-lesson-quiz]').closest('.form-info');
    var videoUrlField = m.body.querySelector('[data-fk="videoUrl"]').closest('.field');
    var projectField = m.body.querySelector('[data-fk="projectId"]').closest('.field');
    var projectSel = m.body.querySelector('[data-fk="projectId"]');
    function refreshTypeFields() {
      videoUrlField.style.display = typeSel.value === 'video' ? '' : 'none';
      projectField.style.display = typeSel.value === 'project' ? '' : 'none';
      quizField.style.display = typeSel.value === 'quiz' ? '' : 'none';
      m.body.querySelector('[data-fk="content"]').placeholder = typeSel.value === 'project'
        ? I18n.t('projectTaskLabel')
        : t('lContent');
    }
    function refreshProjectOptions() {
      var course = Store.find('certificates', courseSel.value);
      var ownerId = course ? String(course.trainerId || '') : '';
      var projects = AdminData.projects().filter(function (project) {
        return String(project.ownerId) === ownerId;
      });
      var selected = projectSel.value || (row ? String(row.lesson.projectId || '') : '');
      projectSel.innerHTML = '<option value="">' + e(t('lPickProject')) + '</option>' +
        projects.map(function (project) {
          return '<option value="' + e(project.id) + '"' +
            (String(project.id) === selected ? ' selected' : '') + '>' +
            e(project.title || project.id) + '</option>';
        }).join('');
      if (selected && projects.some(function (project) { return String(project.id) === selected; })) {
        projectSel.value = selected;
      }
    }
    if (row) courseSel.disabled = true;
    refreshTypeFields();
    refreshProjectOptions();
    typeSel.addEventListener('change', refreshTypeFields);
    courseSel.addEventListener('change', function () {
      secSel.innerHTML = sectionOpts(courseSel.value).map(function (o) {
        return '<option value="' + e(o.v) + '">' + e(o.l) + '</option>';
      }).join('');
      refreshProjectOptions();
    });
    m.body.addEventListener('input', function (event) {
      var target = event.target;
      if (target.hasAttribute('data-quiz-setting')) {
        var setting = target.getAttribute('data-quiz-setting');
        quizState[setting] = target.type === 'checkbox' ? target.checked
          : (target.type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value);
      } else if (target.hasAttribute('data-question-text') || target.hasAttribute('data-question-explanation')) {
        var question = target.closest('[data-question]');
        var questionData = question && quizState.questions[Number(question.getAttribute('data-question'))];
        if (questionData) {
          if (target.hasAttribute('data-question-text')) questionData.text = target.value;
          else questionData.explanation = target.value;
        }
      } else if (target.hasAttribute('data-choice-text')) {
        var choice = target.closest('[data-choice]');
        var choiceQuestion = choice && choice.closest('[data-question]');
        var questionData2 = choiceQuestion && quizState.questions[Number(choiceQuestion.getAttribute('data-question'))];
        var choiceData = questionData2 && questionData2.choices[Number(choice.getAttribute('data-choice'))];
        if (choiceData) choiceData.text = target.value;
      }
    });
    m.body.addEventListener('click', function (event) {
      var action = event.target.closest('[data-quiz-action]');
      if (!action) return;
      var kind = action.getAttribute('data-quiz-action');
      var questionElement = action.closest('[data-question]');
      var questionIndex = questionElement ? Number(questionElement.getAttribute('data-question')) : -1;
      var question = questionIndex >= 0 ? quizState.questions[questionIndex] : null;
      if (kind === 'add-question' && quizState.questions.length < 50) {
        quizState.questions.push({
          text: '',
          explanation: '',
          choices: [{ text: '', correct: true }, { text: '', correct: false }]
        });
      } else if (kind === 'remove-question' && question) {
        quizState.questions.splice(questionIndex, 1);
      } else if (kind === 'add-choice' && question && question.choices.length < 6) {
        question.choices.push({ text: '', correct: false });
      } else if (kind === 'remove-choice' && question) {
        var choiceElement = action.closest('[data-choice]');
        var choiceIndex = Number(choiceElement.getAttribute('data-choice'));
        if (question.choices.length <= 2) {
          UI.toast(t('quizMinChoices'), 'info');
          return;
        }
        question.choices.splice(choiceIndex, 1);
        if (!question.choices.some(function (choice) { return choice.correct; })) question.choices[0].correct = true;
      } else if (kind === 'correct' && question) {
        var correctChoice = Number(action.closest('[data-choice]').getAttribute('data-choice'));
        question.choices.forEach(function (choice, index) { choice.correct = index === correctChoice; });
      } else {
        return;
      }
      quizField.innerHTML = lessonQuizHTML(quizState);
    });
  }

  Admin.on('lesson-add', function () { lessonModal(null); });
  Admin.on('lesson-edit', function (el) { lessonModal(el.getAttribute('data-id')); });
  Admin.on('lesson-del', function (el) {
    var id = el.getAttribute('data-id');
    var row = AdminData.findLesson(id);
    if (!row) return;
    UI.confirm(t('confirmDelete')).then(function (ok) {
      if (!ok) return;
      AdminData.removeLesson(id);
      UI.toast(t('deleted'), 'success');
      Admin.renderAll();
      document.dispatchEvent(new CustomEvent('adm:lessons'));
    });
  });
  Admin.on('lesson-free', function (el) {
    var row = AdminData.findLesson(el.getAttribute('data-id'));
    if (!row) return;
    row.lesson.free = !row.lesson.free;
    Store.save(true);
    AdminData.logActivity('status', 'lessons', row.lesson.title);
    UI.toast(t('statusUpd'), 'success');
    Admin.renderAll();
    document.dispatchEvent(new CustomEvent('adm:lessons'));
  });
  Admin.on('lesson-bulk-del', function () {
    var ids = Admin.selIds('lessons');
    if (!ids.length) return;
    UI.confirm(t('confirmDelete')).then(function (ok) {
      if (!ok) return;
      ids.forEach(function (id) { AdminData.removeLesson(id); });
      AdminData.logActivity('delete', 'lessons', String(ids.length));
      Admin.ts('lessons').sel = {};
      UI.toast(t('deleted'), 'success');
      Admin.renderAll();
      document.dispatchEvent(new CustomEvent('adm:lessons'));
    });
  });

  function projectType(project) {
    if (project.ownerRole === 'trainer') {
      return project.visibility === 'courses' ? 'course' : 'trainer';
    }
    if (project.ownerRole === 'student') {
      return project.sourceLessonId ? 'student_course' : 'student_manual';
    }
    return '';
  }

  function projectDownloads(project) {
    return (project.files || []).reduce(function (total, file) {
      return total + (Number(file.downloads) || 0);
    }, 0);
  }

  Admin.register('projects', {
    render: function () {
      return Admin.table({
        key: 'projects',
        id: function (p) { return p.pk || p.id; },
        rows: displayOrdered(AdminData.projects()),
        reorderKind: 'projects',
        draggableRows: true,
        pageSize: 10,
        search: function (p) { return [p.title, p.summary, p.category, p.owner && p.owner.name, (p.tags || []).join(' ')].join(' '); },
        filters: [
          { k: 'status', label: t('allStatus'), val: function (p) { return p.status || 'published'; }, options: stOpts(['published', 'draft', 'inactive']) },
          { k: 'type', label: t('projectType'), val: projectType, options: [
            { v: 'trainer', l: t('projectTypeTrainer') },
            { v: 'course', l: t('projectTypeCourse') },
            { v: 'student_course', l: t('projectTypeStudentCourse') },
            { v: 'student_manual', l: t('projectTypeStudentManual') }
          ] }
        ],
        add: { label: t('pAdd'), url: editorRoute('project'), icon: 'plus' },
        empty: {
          icon: 'folder', title: t('emptyProjects'), sub: t('emptyProjectsSub'),
          action: '<a class="btn btn-primary btn-sm" href="' + editorRoute('project') + '">' + UI.icon('plus', 15) + e(t('pAdd')) + '</a>'
        },
        columns: [
          {
            k: 'title', label: t('colTitle'), sortVal: function (p) { return p.title; },
            render: function (p) {
              return '<div class="cell-cover"><img class="cc-img" src="' + e(p.cover || StoreHelpers.grad('#1e3a8a', '#3b82f6', '📁', 160, 110)) + '" alt="" loading="lazy" decoding="async">' +
                '<div class="cc-b"><b>' + e(p.title) + '</b><span>' + e(excerpt(p.summary, 48)) + '</span></div></div>';
            },
            csv: function (p) { return p.title; }
          },
          {
            k: 'category', label: t('colCategory'), sortVal: function (p) { return p.category || ''; },
            render: function (p) { return p.category ? '<span class="chip">' + e(p.category) + '</span>' : '<span class="tiny muted">—</span>'; },
            csv: function (p) { return p.category || ''; }
          },
          {
            k: 'owner', label: t('projectOwnerLabel'), sortVal: function (p) { return p.owner && p.owner.name || ''; },
            render: function (p) {
              return '<span class="tiny muted">' + e(p.owner && p.owner.name || '—') + '</span>';
            },
            csv: function (p) { return p.owner && p.owner.name || ''; }
          },
          {
            k: 'visibility',
            label: t('projectVisibility'),
            sortVal: function (p) { return p.visibility || 'public'; },
            render: function (p) {
              if (p.ownerRole !== 'trainer') {
                var fixedVisibility = p.visibility === 'courses'
                  ? t('projectTypeCourse')
                  : t('projectVisibilityPublic');
                return '<span class="tiny muted">' + e(fixedVisibility) + '</span>';
              }
              var profileOnly = p.visibility === 'personal';
              var label = t(profileOnly ? 'projectVisibilityPersonal' : 'projectVisibilityPublic');
              var confirmKey = profileOnly
                ? 'projectVisibilityConfirmPublic'
                : 'projectVisibilityConfirmPersonal';
              return '<button type="button" class="st st-toggle ' +
                (profileOnly ? 'st-mute' : 'st-ok') + '" data-act="project-visibility-toggle" data-id="' +
                e(p.pk || p.id) + '" aria-label="' + e(t(confirmKey)) + '" title="' +
                e(t(confirmKey)) + '">' + e(label) + '</button>';
            },
            csv: function (p) {
              return p.visibility === 'personal'
                ? t('projectVisibilityPersonal')
                : p.visibility === 'courses'
                  ? t('projectTypeCourse')
                  : t('projectVisibilityPublic');
            }
          },
          {
            k: 'stats', label: t('colStats'), sortVal: function (p) { return p.views || 0; },
            render: function (p) {
              return '<span class="tiny muted" style="display:flex;gap:10px;flex-wrap:wrap">' +
                '<span>' + UI.icon('eye', 13) + ' ' + (p.views || 0) + '</span>' +
                '<span>' + UI.iconFilled('heart', 13) + ' ' + (p.likes || 0) + '</span>' +
                ((p.files || []).length ? '<span title="' + e(t('projectDownloads')) + '">' + UI.icon('download', 13) + ' ' + projectDownloads(p) + '</span>' : '') +
                '</span>';
            },
            csv: function (p) { return (p.views || 0) + '/' + (p.likes || 0) + '/' + ((p.files || []).length ? projectDownloads(p) : ''); }
          },
          {
            k: 'status', label: t('colStatus'), sortVal: function (p) { return p.status || 'published'; },
            render: function (p) {
              var active = (p.status || 'published') === 'published';
              return '<button type="button" class="st st-toggle ' + (active ? 'st-ok' : 'st-mute') +
                '" data-act="project-toggle" data-id="' + e(p.pk || p.id) + '" aria-label="' +
                e(t(active ? 'projectDeactivate' : 'projectActivate')) + '">' +
                e(t(active ? 'projectActive' : 'projectInactive')) + '</button>';
            },
            csv: function (p) { return (p.status || 'published') === 'published' ? t('projectActive') : t('projectInactive'); }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (p) {
              return orderDragHandle() +
                linkBtn(SITE.u('project', p.id), 'eye', t('pView')) +
                linkBtn(editorRoute('project', p.id), 'external-link', t('pEdit'));
            }
          }
        ]
      });
    }
  });

  Admin.on('project-toggle', function (el) {
    var project = AdminData.projects().filter(function (item) {
      return String(item.pk || item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!project) return;
    var active = (project.status || 'published') !== 'published';
    UI.confirm(t(active ? 'projectActivate' : 'projectDeactivate') + '?').then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      return fetch(SITE.u('projectStatus', el.getAttribute('data-id')), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ active: active })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          project.status = data.active ? 'published' : 'inactive';
          Admin.renderAll();
          UI.toast(t(data.active ? 'projectActive' : 'projectInactive'), 'success');
        });
      }).catch(function (error) {
        el.disabled = false;
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });

  Admin.on('project-visibility-toggle', function (el) {
    var project = AdminData.projects().filter(function (item) {
      return String(item.pk || item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!project || project.ownerRole !== 'trainer') return;
    var profileOnly = project.visibility !== 'personal';
    var confirmKey = profileOnly
      ? 'projectVisibilityConfirmPersonal'
      : 'projectVisibilityConfirmPublic';
    UI.confirm(t(confirmKey)).then(function (confirmed) {
      if (!confirmed) return;
      el.disabled = true;
      return fetch(SITE.u('projectVisibility', el.getAttribute('data-id')), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.CSRF_TOKEN || ''
        },
        body: JSON.stringify({ profileOnly: profileOnly })
      }).then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          project.visibility = data.profileOnly ? 'personal' : 'public';
          Admin.renderAll();
          UI.toast(t(data.profileOnly ? 'projectVisibilityPersonal' : 'projectVisibilityPublic'), 'success');
        });
      }).catch(function (error) {
        el.disabled = false;
        UI.toast(error.message || t('saveError'), 'error');
      });
    });
  });

  function sendWorkshopRequest(url, payload) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        return data;
      });
    });
  }

  function workshopDateTime(value) {
    var date = new Date(value);
    var locale = I18n.getLang() === 'en' ? 'en-US' : 'ar-SA';
    return UI.formatDate(value) + ' · ' + date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function workshopForm(workshop) {
    var modal = Admin.formModal({
      title: workshop ? t('workshopEdit') : t('workshopAdd'),
      fields: [
        { k: 'title', label: t('workshopTitle'), value: workshop ? workshop.title : '', required: true, maxLength: 200 },
        { k: 'titleEnglish', label: 'اسم الورشة بالإنجليزية · Workshop title in English', value: workshop ? workshop.titleEnglish : '', maxLength: 200 },
        { k: 'trainerName', label: t('workshopTrainer'), value: workshop ? workshop.trainerName : '', required: true, maxLength: 200 },
        { k: 'trainerNameEnglish', label: 'اسم المدرب بالإنجليزية · Trainer name in English', value: workshop ? workshop.trainerNameEnglish : '', maxLength: 200 },
        { k: 'startsAt', label: t('workshopStartsAt'), value: workshop ? workshop.startsAt.slice(0, 16) : '', inputType: 'datetime-local', required: true },
        { k: 'durationMinutes', label: t('workshopDuration'), type: 'number', value: workshop ? workshop.durationMinutes : 60, min: 1, max: 1440, required: true },
        { k: 'location', label: t('workshopLocation'), value: workshop ? workshop.location : '', maxLength: 200 },
        { k: 'locationEnglish', label: 'الموقع بالإنجليزية · Location in English', value: workshop ? workshop.locationEnglish : '', maxLength: 200 },
        { k: 'description', label: t('workshopDescription'), type: 'textarea', full: true, rows: 4, value: workshop ? workshop.description : '' },
        { k: 'descriptionEnglish', label: 'الوصف بالإنجليزية · Description in English', type: 'textarea', full: true, rows: 4, value: workshop ? workshop.descriptionEnglish : '' }
      ],
      submit: t('saveChanges'),
      onSubmit: function (values) {
        if (workshop) values.id = workshop.id;
        sendWorkshopRequest(SITE.u('workshopSave'), values).then(function (data) {
          AdminData.updateWorkshop(data.workshop);
          Admin.renderAll();
          UI.toast(t(workshop ? 'updated' : 'created'), 'success');
          modal.close();
        }).catch(function (error) {
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });
  }

  Admin.register('workshops', {
    render: function () {
      return '<section class="course-cohort-page-section"><h3>' +
        e(t('secInPersonWorkshopCourses')) + '</h3>' +
        renderCourseTable('in-person-workshop-courses', false, 'workshop', true) +
        '</section>';
    }
  });

  Admin.on('workshop-course-add', function () {
    var modal = UI.modal({
      title: t('workshopChooseType'),
      size: 'sm',
      body: '<div class="workshop-course-type-choices">' +
        '<button type="button" class="btn btn-soft" data-workshop-course-type="in_person">' +
        UI.icon('map-pin', 17) + e(t('workshopInPerson')) + '</button>' +
        '<button type="button" class="btn btn-soft" data-workshop-course-type="online">' +
        UI.icon('laptop', 17) + e(t('workshopOnline')) + '</button>' +
        '</div>'
    });
    modal.body.addEventListener('click', function (event) {
      var choice = event.target.closest('[data-workshop-course-type]');
      if (!choice) return;
      var route = choice.getAttribute('data-workshop-course-type') === 'in_person'
        ? 'in-person-workshop'
        : 'online-workshop';
      modal.close();
      Admin.navigate('editor/' + route + '/new');
    });
  });

  Admin.register('course-registration-requests', {
    render: function () {
      var requests = AdminData.courseRegistrationRequests();
      var allRequests = { id: 'all' };
      return '<div class="course-cohort-page">' +
        '<div class="workshop-admin-toolbar"><button class="btn btn-primary" data-act="course-registration-request-add">' +
        UI.icon('plus', 15) + e(t('registrationRequestAdd')) + '</button></div>' +
        '<section class="course-cohort-page-section"><div class="course-cohort-card">' +
        '<header><div><b>' + e(t('courseCohortApplicants')) + '</b>' +
        '<span class="chip neutral">' + requests.length + '</span></div></header>' +
        renderCourseCohortRequests(allRequests, requests, true) +
        '</div></section></div>';
    },
    wire: wireCourseCohortPage
  });

  function courseRegistrationRequestForm() {
    var courses = Store.collection('certificates').filter(function (course) {
      return course.courseType === 'in_person' && course.status === 'published';
    });
    if (!courses.length) {
      UI.toast(t('registrationRequestNoCourses'), 'error');
      return;
    }

    Admin.formModal({
      title: t('registrationRequestAddTitle'),
      fields: [
        {
          k: 'courseId',
          label: t('registrationRequestCourse'),
          type: 'select',
          required: true,
          options: [{ v: '', l: t('registrationRequestChooseCourse') }].concat(
            courses.map(function (course) {
              return { v: course.id, l: course.title };
            })
          )
        },
        {
          k: 'fullName',
          label: t('registrationRequestName'),
          required: true,
          maxLength: 200,
          validate: function (value) {
            var words = value.trim().split(/\s+/);
            return value && words.length >= 3 && words.length <= 6 &&
              words.every(function (word) { return /^[\p{L}\p{M}]+$/u.test(word); })
              ? '' : t('registrationRequestNameInvalid');
          }
        },
        {
          k: 'phone',
          label: t('registrationRequestPhone'),
          required: true,
          maxLength: 13,
          dir: 'ltr',
          inputMode: 'tel',
          placeholder: '+970123456789',
          validate: function (value) {
            return /^\+[0-9]{12}$/.test(value) ? '' : t('registrationRequestPhoneInvalid');
          }
        },
        {
          k: 'address',
          label: t('registrationRequestAddress'),
          required: true,
          maxLength: 255
        },
        {
          k: 'specialty',
          label: t('registrationRequestSpecialty'),
          required: true,
          maxLength: 150
        },
        {
          k: 'governorate',
          label: t('registrationRequestGovernorate'),
          type: 'select',
          required: true,
          options: [
            { v: '', l: '—' },
            { v: 'gaza', l: t('registrationRequestGovernorateGaza') },
            { v: 'central', l: t('registrationRequestGovernorateCentral') },
            { v: 'online', l: t('registrationRequestGovernorateOnline') }
          ]
        },
        {
          k: 'studyYear',
          label: t('registrationRequestStudyYear'),
          type: 'number',
          min: 1,
          max: 4294967295,
          step: 1,
          required: false,
          validate: function (value) {
            if (studentStatusInput && studentStatusInput.value === 'graduate') return '';
            return /^[1-9]\d*$/.test(value) && Number(value) <= 4294967295
              ? '' : t('registrationRequestStudyYearInvalid');
          }
        },
        {
          k: 'studentStatus',
          label: t('registrationRequestStatus'),
          type: 'select',
          required: true,
          options: [
            { v: 'student', l: t('registrationRequestStudent') },
            { v: 'graduate', l: t('registrationRequestGraduate') }
          ]
        }
      ],
      onSubmit: function (values, modal) {
        values.studyYear = values.studentStatus === 'graduate'
          ? null : Number(values.studyYear);
        var saveButton = modal.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('courseRegistrationRequestSave'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify(values)
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            AdminData.addCourseRegistrationRequest(data.request);
            modal.close();
            Admin.renderAll();
            UI.toast(t('registrationRequestCreated'), 'success');
          });
        }).catch(function (error) {
          saveButton.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return false;
      }
    });
    var studentStatusInput = modal.body.querySelector('[data-fk="studentStatus"]');
    var studyYearInput = modal.body.querySelector('[data-fk="studyYear"]');
    function syncStudyYearAvailability() {
      var isGraduate = studentStatusInput.value === 'graduate';
      studyYearInput.disabled = isGraduate;
      if (isGraduate) studyYearInput.value = '';
    }
    studentStatusInput.addEventListener('change', syncStudyYearAvailability);
    syncStudyYearAvailability();
  }

  Admin.on('course-registration-request-add', function () {
    courseRegistrationRequestForm();
  });

  Admin.on('workshop-add', function () {
    workshopForm(null);
  });

  Admin.on('workshop-edit', function (el) {
    var workshop = AdminData.workshops().filter(function (item) {
      return String(item.id) === el.getAttribute('data-id');
    })[0];
    if (workshop) workshopForm(workshop);
  });

  Admin.on('workshop-attendees', function (el) {
    var workshopId = el.getAttribute('data-id');
    var workshop = AdminData.workshops().filter(function (item) {
      return String(item.id) === workshopId;
    })[0];
    if (!workshop) return;

    var modal = UI.modal({
      title: t('workshopAttendeesTitle') + ' — ' + workshop.title,
      size: 'md',
      body: '<p class="tiny muted">' + e(t('workshopAttendeesLoading')) + '</p>'
    });
    fetch(SITE.u('workshopAttendees', workshopId), {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || t('workshopAttendeesError'));
        }
        return data;
      });
    }).then(function (data) {
      modal.body.innerHTML = data.attendees.length
        ? '<div class="workshop-attendees-list"><div class="workshop-attendees-total">' +
          e(t('workshopAttendees')) + ': <b>' + data.attendees.length + '</b></div>' +
          data.attendees.map(function (attendee) {
            return '<div class="workshop-attendee-row"><div><b>' + e(attendee.name) + '</b>' +
              (attendee.handle ? '<small dir="ltr">@' + e(attendee.handle) + '</small>' : '') +
              '</div><time>' + e(workshopDateTime(attendee.attendedAt)) + '</time></div>';
          }).join('') + '</div>'
        : '<p class="tiny muted">' + e(t('workshopNoAttendees')) + '</p>';
    }).catch(function (error) {
      modal.body.innerHTML = '<p class="form-error">' + e(error.message || t('workshopAttendeesError')) + '</p>';
    });
  });

  Admin.on('workshop-qr', function (el) {
    var workshop = AdminData.workshops().filter(function (item) {
      return String(item.id) === el.getAttribute('data-id');
    })[0];
    if (!workshop) return;
    UI.modal({
      title: workshop.title,
      size: 'sm',
      body: '<div class="workshop-qr-preview"><img src="' + e(workshop.qrImage) + '" alt="' + e(t('workshopShowQr')) + '">' +
        '<p class="tiny muted">' + e(workshop.attendanceOpen ? t('workshopAttendanceIsOpen') : t('workshopAttendanceIsClosed')) + '</p>' +
        '<a class="btn btn-soft btn-sm" href="' + e(workshop.qrImage) + '" download="workshop-' + e(workshop.id) + '-qr.png">' +
        UI.icon('download', 14) + e(t('workshopDownloadQr')) + '</a></div>'
    });
  });

  Admin.on('workshop-toggle-attendance', function (el) {
    var id = el.getAttribute('data-id');
    var workshop = AdminData.workshops().filter(function (item) { return String(item.id) === id; })[0];
    if (!workshop) return;
    el.disabled = true;
    sendWorkshopRequest(SITE.u('workshopAttendanceStatus', id), { open: !workshop.attendanceOpen }).then(function (data) {
      workshop.attendanceOpen = data.attendanceOpen;
      AdminData.updateWorkshop(workshop);
      Admin.renderAll();
      UI.toast(t('statusUpd'), 'success');
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });

  Admin.on('workshop-regenerate-qr', function (el) {
    var id = el.getAttribute('data-id');
    if (!window.confirm(t('workshopQrConfirm'))) return;
    el.disabled = true;
    sendWorkshopRequest(SITE.u('workshopRegenerateQr', id)).then(function (data) {
      AdminData.updateWorkshop(data.workshop);
      Admin.renderAll();
      UI.toast(t('workshopQrRotated'), 'success');
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });

  Admin.on('workshop-delete', function (el) {
    var id = el.getAttribute('data-id');
    if (!window.confirm(t('workshopDeleteConfirm'))) return;
    el.disabled = true;
    sendWorkshopRequest(SITE.u('workshopDelete', id)).then(function () {
      AdminData.removeWorkshop(id);
      Admin.renderAll();
      UI.toast(t('deleted'), 'success');
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });

  Admin.register('student-certificates', {
    render: function () {
      return Admin.table({
        key: 'student-certificates',
        id: function (certificate) { return certificate.id; },
        rows: AdminData.studentCertificates().filter(function (certificate) {
          return certificate.type === 'manual';
        }),
        pageSize: 12,
        add: { label: t('certificateAdd'), act: 'certificate-add', icon: 'plus' },
        search: function (certificate) {
          return [
            certificate.title,
            certificate.studentName,
            certificate.studentHandle,
            certificate.issuer,
            certificate.courseTitle,
            certificate.code
          ].join(' ');
        },
        empty: {
          icon: 'award',
          title: t('emptyCertificates'),
          sub: t('emptyCertificatesSub')
        },
        columns: [
          {
            k: 'title', label: t('colTitle'), sortVal: function (certificate) { return certificate.title; },
            render: function (certificate) {
              return '<div><b>' + e(certificate.title) + '</b><div class="tiny muted">' +
                e(t(
                  certificate.type === 'course'
                    ? 'certificateCourse'
                    : certificate.type === 'workshop'
                      ? 'certificateWorkshop'
                      : 'certificateExternal'
                )) +
                '</div></div>';
            },
            csv: function (certificate) { return certificate.title; }
          },
          {
            k: 'student', label: t('certificateStudent'),
            sortVal: function (certificate) { return certificate.studentName; },
            render: function (certificate) {
              return '<span>' + e(certificate.studentName) + '</span>' +
                (certificate.studentHandle ? '<span class="tiny muted" dir="ltr"> @' + e(certificate.studentHandle) + '</span>' : '');
            },
            csv: function (certificate) { return certificate.studentName + ' @' + certificate.studentHandle; }
          },
          {
            k: 'issuer', label: t('certificateIssuer'),
            sortVal: function (certificate) { return certificate.issuer; },
            render: function (certificate) { return '<span class="tiny muted">' + e(certificate.issuer || '—') + '</span>'; },
            csv: function (certificate) { return certificate.issuer || ''; }
          },
          {
            k: 'course', label: t('certificateCourseTitle'),
            sortVal: function (certificate) { return certificate.title; },
            render: function (certificate) {
              return '<span class="tiny muted">' + e(certificate.title) + '</span>';
            },
            csv: function (certificate) { return certificate.title; }
          },
          {
            k: 'status', label: t('colStatus'),
            sortVal: function (certificate) { return certificate.reviewStatus || 'pending'; },
            render: function (certificate) {
              return '<select class="input select certificate-review-select" data-act="certificate-review-status" ' +
                'data-id="' + e(certificate.id) + '" aria-label="' + e(t('colStatus')) + '">' +
                '<option value="pending"' + (certificate.reviewStatus === 'pending' ? ' selected' : '') + '>' +
                e(t('certificateReviewPending')) + '</option>' +
                '<option value="approved"' + (certificate.reviewStatus === 'approved' ? ' selected' : '') + '>' +
                e(t('certificateReviewApproved')) + '</option>' +
                '<option value="rejected"' + (certificate.reviewStatus === 'rejected' ? ' selected' : '') + '>' +
                e(t('certificateReviewRejected')) + '</option></select>';
            },
            csv: function (certificate) {
              return t(
                certificate.reviewStatus === 'approved'
                  ? 'certificateReviewApproved'
                  : certificate.reviewStatus === 'rejected'
                    ? 'certificateReviewRejected'
                    : 'certificateReviewPending'
              );
            },
          },
          {
            k: 'date', label: t('colDate'),
            sortVal: function (certificate) { return certificate.date; },
            render: function (certificate) { return '<span class="tiny muted">' + e(UI.formatDate(certificate.date)) + '</span>'; },
            csv: function (certificate) { return certificate.date || ''; }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (certificate) {
              return iconBtn('certificate-details', certificate.id, 'eye', t('certificateViewDetails'));
            }
          }
        ]
      });
    }
  });

  Admin.on('certificate-details', function (el) {
    var certificate = AdminData.studentCertificates().filter(function (item) {
      return item.id === el.getAttribute('data-id');
    })[0];
    if (!certificate) return;

    var skills = (certificate.skills || []).map(function (skill) {
      return '<span class="chip neutral">' + e(skill) + '</span>';
    }).join(' ');
    var body = '<div class="form-info-rows">' +
      '<div class="if-row"><span class="k">' + e(t('certificateType')) + '</span><span class="v">' +
      e(t(
        certificate.type === 'course'
          ? 'certificateCourse'
          : certificate.type === 'workshop'
            ? 'certificateWorkshop'
            : 'certificateExternal'
      )) + '</span></div>' +
      '<div class="if-row"><span class="k">' + e(t('certificateStudent')) + '</span><span class="v">' +
      e(certificate.studentName) + (certificate.studentHandle ? ' @' + e(certificate.studentHandle) : '') + '</span></div>' +
      '<div class="if-row"><span class="k">' + e(t('certificateIssuer')) + '</span><span class="v">' +
      e(certificate.issuer || '—') + '</span></div>' +
      (certificate.courseTitle ? '<div class="if-row"><span class="k">' + e(t('certificateCourseTitle')) + '</span><span class="v">' + e(certificate.courseTitle) + '</span></div>' : '') +
      (certificate.category ? '<div class="if-row"><span class="k">' + e(t('certificateCategory')) + '</span><span class="v">' + e(certificate.category) + '</span></div>' : '') +
      '<div class="if-row"><span class="k">' + e(t('certificateDate')) + '</span><span class="v">' + e(UI.formatDate(certificate.date) || '—') + '</span></div>' +
      (certificate.code ? '<div class="if-row"><span class="k">' + e(t('certificateCode')) + '</span><span class="v" dir="ltr">' + e(certificate.code) + '</span></div>' : '') +
      (certificate.workshopDuration
        ? '<div class="if-row"><span class="k">' + e(t('workshopDuration')) + '</span><span class="v">' + e(certificate.workshopDuration) + ' ' + e(t('minutesShort')) + '</span></div>'
        : '') +
      (certificate.workshopLocation
        ? '<div class="if-row"><span class="k">' + e(t('workshopLocation')) + '</span><span class="v">' + e(certificate.workshopLocation) + '</span></div>'
        : '') +
      ((certificate.reviewStatusLabel || certificate.type === 'workshop')
        ? '<div class="if-row"><span class="k">' + e(t('certificateReviewStatus')) + '</span><span class="v">' +
          e(certificate.reviewStatusLabel || t('certificateIssued')) + '</span></div>'
        : '') +
      (certificate.type === 'manual'
        ? '<div class="if-row"><span class="k">' + e(t('colStatus')) + '</span><span class="v">' +
          e(t(
            certificate.reviewStatus === 'approved'
              ? 'certificateReviewApproved'
              : certificate.reviewStatus === 'rejected'
                ? 'certificateReviewRejected'
                : 'certificateReviewPending'
          )) + '</span></div>' +
          (certificate.rejectionReason
            ? '<div class="if-row"><span class="k">' + e(t('certificateRejectionReason')) +
              '</span><span class="v">' + e(certificate.rejectionReason) + '</span></div>'
            : '')
        : '<div class="if-row"><span class="k">' + e(t('colStatus')) + '</span><span class="v">' +
          e(t(certificate.active ? 'certificateVisible' : 'certificateHidden')) + '</span></div>') +
      (certificate.description ? '<div class="if-row"><span class="k">' + e(t('certificateDescription')) + '</span><span class="v">' + e(certificate.description) + '</span></div>' : '') +
      '</div>' +
      (skills ? '<div style="margin-top:12px"><b>' + e(t('certificateSkills')) + '</b><div class="row-tags" style="margin-top:8px">' + skills + '</div></div>' : '') +
      (certificate.verifyUrl ? '<p style="margin-top:12px"><a href="' + e(certificate.verifyUrl) + '" target="_blank" rel="noopener noreferrer">' + e(t('certificateVerifyLink')) + '</a></p>' : '') +
      (certificate.image
        ? '<a href="' + e(certificate.image) + '" target="_blank" rel="noopener noreferrer"><img src="' + e(certificate.image) + '" alt="' + e(certificate.title) + '" style="display:block;max-width:100%;max-height:420px;object-fit:contain;margin:16px auto;border-radius:12px"></a>'
        : '<p class="tiny muted" style="margin-top:12px">' + e(t('certificateNoImage')) + '</p>');

    UI.modal({
      title: certificate.title,
      size: 'lg',
      body: body
    });
  });

  Admin.on('student-certificates-list', function (el) {
    var student = Store.find('users', el.getAttribute('data-id'));
    if (!student) return;
    var certificates = studentEarnedCertificates(student);
    var body = certificates.length
      ? '<div class="enroll-list">' + certificates.map(function (certificate) {
        return '<button type="button" class="enroll-row" data-act="certificate-details" data-id="' +
          e(certificate.id) + '">' +
          '<span class="lr-av">' + UI.icon(
            certificate.type === 'workshop' ? 'users' : 'graduation-cap',
            16
          ) + '</span>' +
          '<span class="er-b"><b>' + e(certificate.title) + '</b><span>' +
          e(t(certificate.type === 'workshop' ? 'certificateWorkshop' : 'certificateCourse')) +
          ' · ' + e(UI.formatDate(certificate.date) || '—') + '</span></span></button>';
      }).join('') + '</div>'
      : '<p class="tiny muted">' + e(t('studentCertificatesEmpty')) + '</p>';
    UI.modal({
      title: t('studentCertificatesTitle') + ' — ' + student.name +
        ' (' + certificates.length + ')',
      size: 'md',
      body: body
    });
  });

  Admin.on('student-active-courses', function (el) {
    var student = Store.find('users', el.getAttribute('data-id'));
    if (!student) return;
    var courses = studentCourseHistory(student);
    function renderInPersonCourse(item) {
      return '<a class="enroll-row" href="' + e(SITE.u('course', item.course.id)) + '">' +
        '<span class="lr-av">' + UI.icon('graduation-cap', 16) + '</span>' +
        '<span class="er-b"><b>' + e(item.course.title) + '</b>' +
        (item.completed ? '<span>' + e(t('studentCompleted')) + ' · ' : '<span>') +
        e(t('courseCohort')) +
        ' ' + e(item.cohortName) + '</span></span></a>';
    }
    function renderOnlineCourse(item) {
      var percent = Math.max(0, Math.min(100, Number(item.enrollment.progress) || 0));
      var expired = item.enrollment.expiresAt &&
        new Date(item.enrollment.expiresAt).getTime() <= Date.now();
      var status = percent >= 100
        ? '<span class="student-course-status completed">' + e(t('studentCompleted')) + '</span>'
        : expired
          ? '<span class="student-course-status expired">' + e(t('studentNotCompleted')) +
            ' · ' + e(t('studentSubscriptionExpired')) + '</span>'
          : '';
      return '<a class="enroll-row" href="' + e(SITE.u('course', item.course.id)) + '">' +
        '<span class="lr-av">' + UI.icon('graduation-cap', 16) + '</span>' +
        '<span class="er-b"><b>' + e(item.course.title) + '</b>' + status +
        '<span class="er-meter"><span class="tiny muted">' + e(t('progress')) +
        ' ' + percent + '%</span><span class="meter"><i style="width:' +
        percent + '%"></i></span></span></span></a>';
    }
    function renderCourseSection(title, items, renderCourse) {
      return '<section class="student-course-section"><h3>' + e(title) + '</h3>' +
        (items.length
          ? '<div class="enroll-list">' + items.map(renderCourse).join('') + '</div>'
          : '<p class="tiny muted">' + e(t('studentActiveCoursesEmpty')) + '</p>') +
        '</section>';
    }
    var body =
      renderCourseSection(t('studentTypeInPerson'), courses.inPerson, renderInPersonCourse) +
      renderCourseSection(t('studentTypeOnline'), courses.online, renderOnlineCourse);
    UI.modal({
      title: t('studentActiveCoursesTitle') + ' — ' + student.name +
        ' (' + (courses.inPerson.length + courses.online.length) + ')',
      size: 'md',
      body: body
    });
  });

  function saveCertificateReviewStatus(el, certificate, status, rejectionReason) {
    el.disabled = true;
    fetch(SITE.u('certificateStatus', certificate.id), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({
        status: status,
        rejectionReason: rejectionReason
      })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) {
          throw new Error(data.message || data.error || t('saveError'));
        }
        certificate.reviewStatus = data.reviewStatus;
        certificate.reviewStatusLabel = data.reviewStatusLabel;
        certificate.rejectionReason = data.rejectionReason;
        certificate.active = data.active;
        Admin.renderAll();
        UI.toast(t('certificateReviewSaved'), 'success');
      });
    }).catch(function (error) {
      el.value = certificate.reviewStatus || 'pending';
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  }

  Admin.on('certificate-review-status', function (el) {
    var certificate = AdminData.studentCertificates().filter(function (item) {
      return item.id === el.getAttribute('data-id');
    })[0];
    if (!certificate || certificate.type !== 'manual') return;
    var status = el.value;
    if (status === 'rejected') {
      var previousStatus = certificate.reviewStatus || 'pending';
      var dialog = UI.modal({
        title: t('certificateRejectionTitle'),
        size: 'sm',
        body: '<div class="field"><label class="label" for="certificateRejectionReason">' +
          e(t('certificateRejectionReason')) + '</label><textarea class="textarea" id="certificateRejectionReason" ' +
          'rows="4" maxlength="2000" required></textarea></div>',
        footer: '<button class="btn btn-ghost" type="button" data-certificate-review-cancel>' +
          e(t('certificateReviewCancel')) + '</button><button class="btn btn-danger" type="button" data-certificate-review-save>' +
          e(t('certificateReviewSave')) + '</button>'
      });
      dialog.el.querySelector('[data-certificate-review-cancel]').addEventListener('click', function () {
        el.value = previousStatus;
        dialog.close();
      });
      dialog.el.querySelector('[data-certificate-review-save]').addEventListener('click', function () {
        var reason = dialog.el.querySelector('#certificateRejectionReason').value.trim();
        if (!reason) {
          UI.toast(t('certificateRejectionReasonRequired'), 'error');
          dialog.el.querySelector('#certificateRejectionReason').focus();
          return;
        }
        dialog.close();
        saveCertificateReviewStatus(el, certificate, status, reason);
      });
      return;
    }
    saveCertificateReviewStatus(el, certificate, status, '');
  });

  Admin.register('dailies', {
    render: function () {
      return Admin.table({
        key: 'dailies',
        id: function (p) { return p.id; },
        rows: Store.collection('posts'),
        pageSize: 10,
        search: function (p) { return [excerpt(p.content, 500), (p.tags || []).join(' ')].join(' '); },
        filters: [
          { k: 'status', label: t('allStatus'), val: function (p) { return p.status || 'published'; }, options: stOpts(['published', 'draft', 'archived']) }
        ],
        bulk: [
          { act: 'daily-bulk-pub', label: t('bulkPublish'), icon: 'check' },
          { act: 'daily-bulk-draft', label: t('bulkDraft'), icon: 'pencil' },
          { act: 'daily-bulk-del', label: t('bulkDelete'), icon: 'trash', danger: true }
        ],
        empty: {
          icon: 'newspaper', title: t('emptyDailies'), sub: t('emptyDailiesSub')
        },
        columns: [
          {
            k: 'content', label: t('colContent'),
            render: function (p) {
              var img = (p.media && p.media.length && p.media[0].src) || (p.images && p.images[0]) || '';
              return '<div class="cell-cover">' +
                (img ? '<img class="cc-img" src="' + e(img) + '" alt="" loading="lazy" decoding="async">' : '') +
                '<div class="cc-b" style="max-width:340px"><b class="cell-clip" style="font-weight:600">' + e(excerpt(p.content, 64)) + '</b>' +
                '<span>' + ((p.media || p.images || []).length) + ' ' + e(t('colCover')) + '</span></div></div>';
            },
            csv: function (p) { return excerpt(p.content, 300); }
          },
          {
            k: 'tags', label: t('colTags'),
            render: function (p) { return tagsCell(p.tags); }, csv: function (p) { return tagsVal(p.tags); }
          },
          {
            k: 'likes', label: t('statLikes'), sortVal: function (p) { return p.likes || 0; }, cls: 'num',
            render: function (p) { return p.likes || 0; }, csv: function (p) { return p.likes || 0; }
          },
          {
            k: 'comments', label: t('statComments'), sortVal: function (p) { return (p.comments || []).length; }, cls: 'num',
            render: function (p) { return (p.comments || []).length; }, csv: function (p) { return (p.comments || []).length; }
          },
          {
            k: 'status', label: t('colStatus'), sortVal: function (p) { return p.status || 'published'; },
            render: function (p) { return Admin.statusChip(p.status || 'published'); }, csv: function (p) { return p.status || 'published'; }
          },
          {
            k: 'date', label: t('colDate'), sortVal: function (p) { return p.createdAt; },
            render: function (p) { return '<span class="tiny muted">' + e(UI.formatDate(p.createdAt)) + '</span>'; },
            csv: function (p) { return p.createdAt || ''; }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (p) {
              return iconBtn('daily-edit', p.id, 'pencil', t('dEdit')) +
                iconBtn('daily-del', p.id, 'trash', t('delete'), 'danger');
            }
          }
        ]
      });

    }
  });

  Admin.on('daily-edit', function (el) {
    var p = Store.find('posts', el.getAttribute('data-id'));
    if (!p) return;
    if (!p.media) p.media = (p.images || []).map(function (src) { return { type: 'image', src: src }; });
    Admin.formModal({
      title: t('dEdit'),
      size: 'lg',
      fields: [
        sectionField(t('secBasic')),
        { k: 'content', label: t('colContent'), type: 'richtext', full: true, required: true, value: p.content || '' },
        { k: 'tags', label: t('colTags'), type: 'tags', value: p.tags || [], hint: t('tagsHint') },
        sectionField(t('secMedia')),
        { k: 'media', label: t('dMedia'), type: 'media', full: true, value: p.media || [] },
        { k: 'ratio', label: t('dRatio'), type: 'select', value: p.ratio || '1:1', options: [{ v: '1:1', l: '1:1' }, { v: '4:5', l: '4:5' }, { v: '16:9', l: '16:9' }] },
        sectionField(t('secMeta')),
        { k: 'status', label: t('colStatus'), type: 'select', options: stOpts(['published', 'draft', 'archived']), value: p.status || 'published' },
        sectionField(t('secRelated'), t('dRelatedHint')),
        infoField(relatedPanel([
          [t('statLikes'), p.likes || 0],
          [t('statComments'), (p.comments || []).length],
          [t('dMedia'), (p.media || []).length]
        ]))
      ],
      submit: t('saveChanges'),
      onSubmit: function (v) {
        p.content = v.content; p.tags = v.tags;
        p.media = v.media;
        p.images = (v.media || []).filter(function (it) { return it.type !== 'video'; }).map(function (it) { return it.src; });
        p.ratio = v.ratio; p.status = v.status;
        Store.save(true);
        logUpd('dailies', excerpt(p.title || excerpt(p.content, 40), 40));
      }
    });
  });
  Admin.on('daily-del', function (el) {
    var p = Store.find('posts', el.getAttribute('data-id'));
    if (!p) return;
    delItem('posts', p.id, 'dailies', excerpt(p.content, 40));
  });
  Admin.on('daily-bulk-pub', function () { bulkSet('dailies', 'dailies', 'posts', 'status', 'published'); });
  Admin.on('daily-bulk-draft', function () { bulkSet('dailies', 'dailies', 'posts', 'status', 'draft'); });
  Admin.on('daily-bulk-del', function () { bulkDel('dailies', 'dailies', 'posts'); });

  function courseLessonsBody(courseId) {
    var c = Store.find('certificates', courseId);
    var syllabus = (c && c.syllabus) || [];
    if (!syllabus.length) {
      return UI.emptyState('list', t('noLessonsCourse'), t('noLessonsCourseSub'),
        '<button class="btn btn-primary btn-sm" data-act="course-lesson-add" data-id="' + e(courseId) + '">' + UI.icon('plus', 15) + e(t('lAdd')) + '</button>');
    }
    var html = '<div class="enroll-list">';
    syllabus.forEach(function (sec) {
      html += '<div class="modal-sec-title">' + e(sec.title) + ' <span class="tiny muted">(' + (sec.lessons || []).length + ')</span></div>';
      (sec.lessons || []).forEach(function (l) {
        html += '<div class="enroll-row">' +
          '<span class="lr-av">' + UI.icon(l.type === 'article' ? 'file-text' : 'play', 16) + '</span>' +
          '<span class="er-b"><b>' + e(l.title) + '</b><span dir="ltr">' + e(l.duration || '') + '</span></span>' +
          (l.free ? '<span class="chip" style="font-size:10.5px">' + e(t('colFree')) + '</span>' : '') +
          '<span class="chip neutral">' + e(lessonTypeLabel(l.type)) + '</span>' +
          viewersBtn(l.id) +
          '<span style="margin-inline-start:auto;display:flex;gap:6px">' +
          iconBtn('lesson-edit', l.id, 'pencil', t('quickEdit')) +
          iconBtn('lesson-del', l.id, 'trash', t('delete'), 'danger') +
          '</span></div>';
      });
    });
    html += '</div>';
    return html;
  }

  function openCourseLessons(courseId) {
    var c = Store.find('certificates', courseId);
    if (!c) return;
    var m = UI.modal({
      title: t('courseLessonsTitle') + ' — ' + c.title,
      size: 'lg',
      body: courseLessonsBody(courseId),
      footer: '<button class="btn btn-ghost" data-act="course-lesson-add" data-id="' + e(courseId) + '">' + UI.icon('plus', 15) + e(t('lAdd')) + '</button>'
    });
    function refresh() {
      if (document.body.contains(m.el)) m.body.innerHTML = courseLessonsBody(courseId);
    }
    function onLessons() { refresh(); }
    document.addEventListener('adm:lessons', onLessons);
    m.el.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-act="course-lesson-add"]') : null;
      if (b) lessonModal(null, courseId, refresh);
    });
    var origClose = m.close;
    m.close = function () { document.removeEventListener('adm:lessons', onLessons); origClose(); };
    return m;
  }

  function openTrainerCourses(trainerId) {
    var trainer = Store.collection('trainers').filter(function (item) {
      return String(item.id) === String(trainerId);
    })[0];
    if (!trainer) return;
    var courses = Store.collection('certificates').filter(function (course) {
      return String(course.trainerId || '') === String(trainerId);
    });
    var body = courses.length
      ? '<div class="enroll-list">' + courses.map(function (course) {
        return '<a class="enroll-row" href="' + e(SITE.u('course', course.id)) + '">' +
          '<span class="lr-av">' + UI.icon('graduation-cap', 16) + '</span>' +
          '<span class="er-b"><b>' + e(course.title) + '</b><span>' +
          e(course.category || '—') + '</span></span>' +
          Admin.statusChip(course.status || 'published') +
          '</a>';
      }).join('') + '</div>'
      : '<p class="tiny muted">' + e(t('trainerCoursesEmpty')) + '</p>';
    UI.modal({
      title: t('trainerCoursesTitle') + ' — ' + trainer.name,
      size: 'md',
      body: body
    });
  }

  function courseStudentSearchResults(results, searched) {
    if (!searched) {
      return '<p class="tiny muted">' + e(t('searchStudentsMin')) + '</p>';
    }
    if (!results.length) {
      return '<p class="tiny muted">' + e(t('searchStudentsEmpty')) + '</p>';
    }
    return '<div class="enroll-list">' + results.map(function (student) {
      return '<div class="enroll-row">' +
        UI.avatarOf(student, 34) +
        '<span class="er-b"><b>' + e(student.name) + '</b><span dir="ltr">@' + e(student.handle) + '</span></span>' +
        iconBtn('course-student-add', student.id, 'plus', t('addStudent')) +
        '</div>';
    }).join('') + '</div>';
  }

  function courseEnrolledStudentsHTML(rows) {
    if (!rows.length) return UI.emptyState('users', t('noStudents'), t('noStudentsSub'));
    return '<div class="enroll-list">' + rows.map(function (r) {
      var u = r.user, en = r.enrollment;
      return '<div class="enroll-row">' +
        UI.avatarOf(u, 34) +
        '<span class="er-b"><b>' + e(u.name) + '</b><span dir="ltr">@' + e(u.handle) + '</span></span>' +
        '<span class="tiny muted" dir="ltr">' + e(UI.formatDate(en.joinedAt)) + '</span>' +
        '<span class="er-meter" style="display:flex;flex-direction:column;gap:2px;min-width:110px">' +
        '<span class="tiny muted">' + e(t('progress')) + ' ' + (en.progress || 0) + '%</span>' +
        '<span class="meter"><i style="width:' + (en.progress || 0) + '%"></i></span></span>' +
        iconBtn('course-student-remove', en.databaseProgressId, 'x', t('unenroll'), 'danger') +
        '</div>';
    }).join('') + '</div>';
  }

  function courseStudentsBody(courseId, query, results, searched) {
    var rows = AdminData.studentsOf(courseId);
    return '<div class="field" style="margin-bottom:12px">' +
      '<label class="label" for="courseStudentSearch">' + e(t('searchStudents')) + '</label>' +
      '<input class="input" id="courseStudentSearch" type="search" autocomplete="off" value="' + e(query || '') + '">' +
      '</div><div id="courseStudentSearchResults">' +
      courseStudentSearchResults(results || [], searched) + '</div>' +
      '<h4 id="courseStudentEnrolledTitle" style="margin:20px 0 10px">' + e(t('studentsEnrolled')) + ' (' + rows.length + ')</h4>' +
      '<div id="courseStudentEnrolledList">' + courseEnrolledStudentsHTML(rows) + '</div>';
  }

  function openCourseStudents(courseId) {
    var c = Store.find('certificates', courseId);
    if (!c) return;
    var m = UI.modal({
      title: t('mStudents') + ' — ' + c.title,
      size: 'lg',
      body: courseStudentsBody(courseId)
    });
    var searchSequence = 0;
    var enrollmentRefreshSequence = 0;
    function updateEnrolledStudents(enrolled) {
      var normalized = (enrolled || []).map(function (progress) {
        return {
          user: {
            id: 'db-user-' + progress.userId,
            name: progress.user.name,
            handle: progress.user.handle,
            avatar: progress.user.avatar
          },
          enrollment: {
            databaseProgressId: progress.id,
            joinedAt: progress.joinedAt,
            progress: progress.progress
          }
        };
      });
      var title = m.body.querySelector('#courseStudentEnrolledTitle');
      var list = m.body.querySelector('#courseStudentEnrolledList');
      if (!title || !list) return;
      title.textContent = t('studentsEnrolled') + ' (' + normalized.length + ')';
      list.innerHTML = courseEnrolledStudentsHTML(normalized);
    }

    function bindSearch() {
      var input = m.body.querySelector('#courseStudentSearch');
      if (!input) return;
      var updateResults = UI.debounce(function (query, sequence) {
        var resultsHost = m.body.querySelector('#courseStudentSearchResults');
        if (!resultsHost) return;
        if (query.length < 2) {
          resultsHost.innerHTML = courseStudentSearchResults([], false);
          return;
        }
        resultsHost.innerHTML = '<p class="tiny muted">' + e(t('searchingStudents')) + '</p>';
        fetch(SITE.u('courseStudents', courseId) + '?q=' + encodeURIComponent(query), {
          credentials: 'same-origin'
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            if (sequence !== searchSequence || !document.body.contains(m.el)) return;
            resultsHost.innerHTML = courseStudentSearchResults(data.results || [], true);
            updateEnrolledStudents(data.enrolled || []);
          });
        }).catch(function (error) {
          if (sequence !== searchSequence || !document.body.contains(m.el)) return;
          resultsHost.innerHTML = '<p class="tiny muted">' + e(error.message || t('saveError')) + '</p>';
        });
      }, 180);
      input.addEventListener('input', function () {
        var query = input.value.trim();
        var sequence = ++searchSequence;
        updateResults(query, sequence);
      });
    }
    bindSearch();
    var initialEnrollmentSequence = ++enrollmentRefreshSequence;
    fetch(SITE.u('courseStudents', courseId), { credentials: 'same-origin' })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
          if (initialEnrollmentSequence === enrollmentRefreshSequence && document.body.contains(m.el)) {
            updateEnrolledStudents(data.enrolled || []);
          }
        });
      })
      .catch(function (error) {
        if (document.body.contains(m.el)) UI.toast(error.message || t('saveError'), 'error');
      });
    m.el.addEventListener('click', function (ev) {
      var add = ev.target.closest ? ev.target.closest('[data-act="course-student-add"]') : null;
      if (add) {
        var studentId = add.getAttribute('data-id');
        add.disabled = true;
        fetch(SITE.u('courseStudents', courseId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({ studentId: studentId })
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            searchSequence++;
            enrollmentRefreshSequence++;
            var progress = data.progress;
            var user = progress.user;
            user.id = 'db-user-' + progress.userId;
            user.status = 'active';
            Store.state.users = Store.collection('users').filter(function (existing) {
              return existing.id !== user.id;
            });
            Store.state.users.push(user);
            Store.state.enrollments = Store.collection('enrollments').filter(function (enrollment) {
              return enrollment.databaseProgressId !== progress.id;
            });
            Store.state.enrollments.push({
              id: 'db-enrollment-' + progress.id,
              databaseProgressId: progress.id,
              courseId: progress.courseId,
              userId: user.id,
              joinedAt: progress.joinedAt,
              progress: progress.progress,
              status: 'active'
            });
            if (data.invoice) AdminData.updateOnlineCourseInvoice(data.invoice);
            if (data.registration) AdminData.updateCourseRegistrationRequest(data.registration);
            var courseData = Store.find('certificates', courseId);
            if (courseData && typeof data.enrolledCount === 'number') {
              courseData.enrollmentCount = data.enrolledCount;
            }
            Store.save(true);
            UI.toast(t(data.created ? 'enrollOk' : 'alreadyEnrolled'), 'success');
            Admin.renderAll();
            var currentQuery = m.body.querySelector('#courseStudentSearch').value;
            m.body.innerHTML = courseStudentsBody(courseId, currentQuery, [], false);
            bindSearch();
            updateEnrolledStudents(data.enrolled || []);
            if (currentQuery.length >= 2) {
              m.body.querySelector('#courseStudentSearch').dispatchEvent(new Event('input', { bubbles: true }));
            }
          });
        }).catch(function (error) {
          add.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
        return;
      }
      var remove = ev.target.closest ? ev.target.closest('[data-act="course-student-remove"]') : null;
      if (!remove) return;
      var progressId = remove.getAttribute('data-id');
      UI.confirm(t('confirmRemoveStudent')).then(function (confirmed) {
        if (!confirmed) return;
        remove.disabled = true;
        fetch(SITE.u('courseStudentRemove', progressId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({})
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
            Store.state.enrollments = Store.collection('enrollments').filter(function (enrollment) {
              return String(enrollment.databaseProgressId) !== String(progressId);
            });
            Store.state.completions = Store.collection('completions').filter(function (completion) {
              return completion.id.indexOf('db-completion-' + progressId + '-') !== 0;
            });
            var courseData = Store.find('certificates', courseId);
            if (courseData && typeof data.enrolledCount === 'number') {
              courseData.enrollmentCount = data.enrolledCount;
            }
            Store.save(true);
            UI.toast(t('unenrollOk'), 'success');
            Admin.renderAll();
            updateEnrolledStudents(data.enrolled || []);
          });
        }).catch(function (error) {
          remove.disabled = false;
          UI.toast(error.message || t('saveError'), 'error');
        });
      });
    });
    return m;
  }

  Admin.on('trainer-courses', function (el) { openTrainerCourses(el.getAttribute('data-id')); });
  Admin.on('course-students', function (el) { openCourseStudents(el.getAttribute('data-id')); });
  Admin.on('course-lessons', function (el) { openCourseLessons(el.getAttribute('data-id')); });

  function lessonViewersBody(lessonId) {
    var rows = AdminData.lessonCompleters(lessonId);
    if (!rows.length) {
      return UI.emptyState('users', t('noCompleters'), t('noCompletersSub'), '');
    }
    return '<div class="enroll-list">' + rows.map(function (r) {
      return '<div class="enroll-row">' +
        UI.avatarOf(r.user, 34) +
        '<span class="er-b"><b>' + e(r.user.name) + '</b><span dir="ltr">@' + e(r.user.handle) + '</span></span>' +
        '<span class="chip" style="font-size:10.5px">' + e(t('completedAt')) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function openLessonViewers(lessonId) {
    var row = AdminData.findLesson(lessonId);
    if (!row) return;
    var list = AdminData.lessonCompleters(lessonId);
    UI.modal({
      title: t('mCompleters') + ' (' + list.length + ') — ' + row.lesson.title,
      size: 'lg',
      body: lessonViewersBody(lessonId)
    });
  }

  Admin.on('lesson-viewers', function (el) { openLessonViewers(el.getAttribute('data-id')); });

  Admin.start();
})();
