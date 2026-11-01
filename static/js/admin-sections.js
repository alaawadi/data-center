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
      return Admin.table({
        key: 'users',
        id: function (u) { return u.databaseId || u.id; },
        rows: displayOrdered(Store.collection('users').filter(function (u) { return u.role === 'student'; })),
        reorderKind: 'students',
        draggableRows: true,
        pageSize: 12,
        search: function (u) { return [u.name, u.handle, u.email, u.phone].join(' '); },
        filters: [
          { k: 'status', label: t('allStatus'), val: function (u) { return u.status; }, options: stOpts(['active', 'suspended']) }
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
            k: 'last', label: t('colActivity'), sortVal: function (u) { return u.lastActive; },
            render: function (u) { return '<span class="tiny muted">' + e(UI.timeAgo(u.lastActive)) + '</span>'; },
            csv: function (u) { return u.lastActive; }
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
        ]
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
    return AdminData.enrollments().filter(function (enrollment) {
      var progress = Number(enrollment.progress) || 0;
      return String(enrollment.userId) === String(user.id) &&
        enrollment.status === 'active' &&
        !enrollment.completed &&
        progress < 100;
    }).map(function (enrollment) {
      return {
        enrollment: enrollment,
        course: Store.find('certificates', enrollment.courseId)
      };
    }).filter(function (item) {
      return !!item.course;
    });
  }

  function userModal(id) {
    var u = id ? Store.find('users', id) : null;
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
        k: 'fullNameArabic', label: t('fullNameArabic'), type: 'text', required: true,
        maxLength: 150, value: u ? (u.fullNameArabic || '') : '',
        readonly: !!(u && u.fullNameArabic)
      },
      {
        k: 'fullNameEnglish', label: t('fullNameEnglish'), type: 'text', required: true,
        maxLength: 150, value: u ? (u.fullNameEnglish || '') : '', dir: 'ltr',
        readonly: !!(u && u.fullNameEnglish)
      },
      {
        k: 'email', label: t('uEmail'), type: 'text', inputType: 'email', maxLength: 254, value: u ? u.email : '', dir: 'ltr',
        validate: function (value) {
          return value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? t('userEmailInvalid') : '';
        }
      },
      {
        k: 'phone', label: t('uPhone'), type: 'text', inputType: 'tel', required: true,
        value: u ? u.phone : '', dir: 'ltr', maxLength: 10, inputMode: 'numeric',
        autocomplete: 'off',
        pattern: '[0-9]{10}', numericOnly: true,
        validate: function (value) {
          if (!/^[0-9]{10}$/.test(value)) return t('userPhoneInvalid');
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
    Admin.formModal({
      title: u ? t('mUser') : t('uAdd'),
      size: 'lg',
      fields: fields,
      submit: u ? t('saveChanges') : t('uAdd'),
      onSubmit: function (v, m) {
        var isNew = !u;
        var saveButton = m.el.querySelector('[data-fm="save"]');
        saveButton.disabled = true;
        fetch(SITE.u('studentSave'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || ''
          },
          body: JSON.stringify({
            id: u ? (u.databaseId || u.id) : '',
            name: v.name,
            fullNameArabic: v.fullNameArabic,
            fullNameEnglish: v.fullNameEnglish,
            email: v.email,
            phone: v.phone,
            password: v.password || '',
            status: v.status,
            verified: v.verified,
            avatar: v.avatar
          })
        }).then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.ok) {
              var details = data.fields
                ? Object.keys(data.fields).map(function (key) { return data.fields[key]; }).join(' ')
                : '';
              throw new Error(details || data.message || t('saveError'));
            }
            var users = Store.collection('users');
            var savedIndex = -1;
            for (var i = 0; i < users.length; i++) {
              if (users[i].id === data.student.id) { savedIndex = i; break; }
            }
            if (savedIndex >= 0) users[savedIndex] = data.student;
            else users.unshift(data.student);
            Store.save(true);
            AdminData.logActivity(isNew ? 'create' : 'update', 'users', data.student.name);
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
        k: 'fullNameArabic', label: t('fullNameArabic'), type: 'text', required: true,
        maxLength: 150, value: tr ? (tr.fullNameArabic || '') : '',
        readonly: !!(tr && tr.fullNameArabic)
      },
      {
        k: 'fullNameEnglish', label: t('fullNameEnglish'), type: 'text', required: true,
        maxLength: 150, value: tr ? (tr.fullNameEnglish || '') : '', dir: 'ltr',
        readonly: !!(tr && tr.fullNameEnglish)
      },
      { k: 'specialty', label: t('tSpecialty'), type: 'text', required: true, value: tr ? tr.specialty : '' },
      { k: 'avatar', label: t('uAvatar'), type: 'image', emoji: '🎓', value: tr ? tr.avatar : '' },
      { k: 'email', label: t('uEmail'), type: 'text', value: tr ? tr.email : '', dir: 'ltr' },
      {
        k: 'phone', label: t('uPhone'), type: 'text', inputType: 'tel', required: true,
        value: tr ? tr.phone : '', dir: 'ltr', maxLength: 10, inputMode: 'numeric',
        autocomplete: 'off',
        pattern: '[0-9]{10}', numericOnly: true,
        validate: function (value) {
          if (!/^[0-9]{10}$/.test(value)) return t('userPhoneInvalid');
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
            render: function (category) { return category.courses || 0; },
            csv: function (category) { return category.courses || 0; }
          },
          {
            k: 'projects', label: t('secProjects'), cls: 'num',
            sortVal: function (category) { return category.projects; },
            render: function (category) { return category.projects || 0; },
            csv: function (category) { return category.projects || 0; }
          },
          {
            k: 'trainers', label: t('trainingCategoryTrainers'), cls: 'num',
            sortVal: function (category) { return category.trainers; },
            render: function (category) { return category.trainers || 0; },
            csv: function (category) { return category.trainers || 0; }
          },
          {
            k: 'students', label: t('trainingCategoryStudents'), cls: 'num',
            sortVal: function (category) { return category.students; },
            render: function (category) { return category.students || 0; },
            csv: function (category) { return category.students || 0; }
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

  function renderCourseTable(sectionKey, inPersonOnly) {
      var courses = Store.collection('certificates').filter(function (course) {
        return course.courseType === (inPersonOnly ? 'in_person' : 'online');
      });
      var cats = courses.map(function (c) { return c.category || ''; })
        .filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var bulkActions = inPersonOnly
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
        reorderKind: inPersonOnly ? null : 'courses',
        draggableRows: !inPersonOnly,
        pageSize: courses.length || 10,
        search: function (c) { return [c.title, c.issuer, c.category, trainerLabel(c.trainerId)].join(' '); },
        filters: [
          { k: 'category', label: t('fCat'), val: function (c) { return c.category || ''; }, options: cats.map(function (x) { return { v: x, l: x }; }) },
          { k: 'trainer', label: t('fTrainer'), val: function (c) { return c.trainerId || ''; }, options: trainerOpts().filter(function (o) { return o.v; }) },
          { k: 'status', label: t('allStatus'), val: function (c) { return c.status || 'published'; }, options: stOpts(['published', 'draft', 'archived']) }
        ],
        add: { label: t('cAdd'), url: editorRoute('course'), icon: 'plus' },
        bulk: bulkActions,
        empty: {
          icon: 'graduation-cap',
          title: t(inPersonOnly ? 'emptyInPersonCourses' : 'emptyCourses'),
          sub: t(inPersonOnly ? 'emptyInPersonCoursesSub' : 'emptyCoursesSub'),
          action: '<a class="btn btn-primary btn-sm" href="' + editorRoute('course') + '">' + UI.icon('plus', 15) + e(t('cAdd')) + '</a>'
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
            k: 'status', label: t('colStatus'), sortVal: function (c) { return c.status || 'published'; },
            render: function (c) {
              var active = (c.status || 'published') === 'published';
              return '<button type="button" class="st st-toggle ' + (active ? 'st-ok' : 'st-mute') +
                '" data-act="course-toggle" data-id="' + e(c.pk || c.id) + '" aria-label="' +
                e(t(active ? 'courseDeactivate' : 'courseActivate')) + '">' +
                e(t(active ? 'courseActive' : 'courseInactive')) + '</button>';
            },
            csv: function (c) { return (c.status || 'published') === 'published' ? t('courseActive') : t('courseInactive'); }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (c) {
              var cohortCount = AdminData.inPersonCohorts().filter(function (cohort) {
                return String(cohort.courseId) === String(c.id);
              }).length;
              var cohortButton = inPersonOnly
                ? '<button type="button" class="chip neutral linkish" data-act="course-cohorts" data-id="' +
                  e(c.pk || c.id) + '" aria-label="' + e(t('courseCohorts') + ' — ' + c.title) + '">' +
                  e(t('courseCohorts')) + ' (' + cohortCount + ')</button>'
                : '';
              return (inPersonOnly ? '' : orderDragHandle()) + cohortButton +
                linkBtn(SITE.u('course', c.id), 'eye', t('openCourse')) +
                linkBtn(editorRoute('course', c.id), 'external-link', t('editCourse'));
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

  function courseRegistrationPaymentCell(request) {
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
      '<small>' + e(t('courseRegistrationAmountOfCourse')) + ': ' +
      e(request.coursePriceAmount || '—') + ' ' + currencySymbol + '</small>' +
      '<small>' + e(t('courseRegistrationPaidAmount')) + ': ' +
      e(request.paidAmount || '0.00') + ' ' + currencySymbol + '</small>' +
      '<small class="course-cohort-remaining">' + e(t('courseRegistrationRemaining')) + ': ' +
      e(request.remainingAmount || '—') + ' ' + currencySymbol + '</small>' +
      (payments ? '<ul class="course-cohort-payment-list">' + payments + '</ul>' : '') +
      '</div>';
  }

  function inPersonStudentSetupActions(request, includeEdit) {
    var linkAvailable = isStudentSetupLinkAvailable(request);
    var actions = includeEdit === false ? '' :
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

  function inPersonStudentEditForm(request) {
    var modal = Admin.formModal({
      title: t('studentEdit') + ' — ' + request.fullName,
      submit: t('saveChanges'),
      fields: [
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
            { v: 'central', l: t('registrationRequestGovernorateCentral') }
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
      ],
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
              return request.cohortName ? e(request.cohortName) : '<span class="tiny muted">—</span>';
            },
            csv: function (request) { return request.cohortName || ''; }
          },
          {
            k: 'name',
            label: t('registrationRequestName'),
            sortVal: function (request) { return request.fullName; },
            render: function (request) {
              return '<button type="button" class="course-cohort-request-name" data-act="course-registration-details" data-id="' +
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
            k: 'specialty',
            label: t('registrationRequestSpecialty'),
            sortVal: function (request) { return request.specialty; },
            render: function (request) { return e(request.specialty); },
            csv: function (request) { return request.specialty; }
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
                  : '<span class="tiny muted">—</span>';
            },
            csv: function (request) {
              return request.governorate === 'gaza'
                ? t('registrationRequestGovernorateGaza')
                : request.governorate === 'central'
                  ? t('registrationRequestGovernorateCentral') : '';
            }
          },
          {
            k: 'studyYear',
            label: t('registrationRequestStudyYear'),
            sortVal: function (request) { return Number(request.studyYear) || 0; },
            render: function (request) {
              return request.studyYear
                ? e(request.studyYear)
                : '<span class="tiny muted">—</span>';
            },
            csv: function (request) { return request.studyYear || ''; }
          },
          {
            k: 'paidAmount',
            label: t('courseRegistrationPaymentDetails'),
            sortVal: function (request) { return Number(request.paidAmount || 0); },
            render: function (request) {
              return courseRegistrationPaymentCell(request);
            },
            csv: function (request) {
              return (request.paidAmount || '0.00') + ' ' + (request.currency === 'USD' ? '$' : '₪');
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
            label: t('inPersonStudentAccount'),
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
  var courseRegistrationRequestCohortFilter = '';

  function getCourseCohortRoute() {
    var match = (location.hash || '').replace(/^#\/?/, '').match(/^in-person-course-cohorts\/(.+)$/);
    if (!match) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch (error) {
      return match[1];
    }
  }

  function courseCohortRequestRow(request, includeCourse, editing) {
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
      '<td data-label="' + e(t('registrationRequestAddress')) + '">' + (editing
        ? '<input class="input course-request-inline-control" type="text" maxlength="255" data-registration-field="address" value="' +
          e(request.address || '') + '" aria-label="' + e(t('registrationRequestAddress')) + '">'
        : e(request.address || '—')) + '</td>' +
      '<td data-label="' + e(t('registrationRequestSpecialty')) + '">' + (editing
        ? '<input class="input course-request-inline-control" type="text" maxlength="150" data-registration-field="specialty" value="' +
          e(request.specialty || '') + '" aria-label="' + e(t('registrationRequestSpecialty')) + '">'
        : e(request.specialty || '—')) + '</td>' +
      '<td data-label="' + e(t('registrationRequestStudentStatus')) + '">' + (editing
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
            ? e(t('registrationRequestGraduate')) : '<span class="tiny muted">—</span>') + '</td>' +
      '<td data-label="' + e(labels.studyYear) + '">' + (editing
            ? '<input class="input course-request-inline-control" type="number" min="1" max="4294967295" step="1" data-registration-field="studyYear" value="' +
              e(request.studyYear || '') + '" aria-label="' + e(labels.studyYear) + '">'
            : request.studyYear
          ? e(request.studyYear)
          : '<span class="tiny muted">—</span>') + '</td>' +
      '<td data-label="' + e(labels.governorate) + '">' + (editing
        ? '<select class="input course-request-inline-control" data-registration-field="governorate" aria-label="' +
          e(labels.governorate) + '">' +
          '<option value=""' + (!request.governorate ? ' selected' : '') + '>—</option>' +
          '<option value="gaza"' + (request.governorate === 'gaza' ? ' selected' : '') + '>' +
          e(t('registrationRequestGovernorateGaza')) + '</option>' +
          '<option value="central"' + (request.governorate === 'central' ? ' selected' : '') + '>' +
          e(t('registrationRequestGovernorateCentral')) + '</option></select>'
        : request.governorate === 'gaza'
          ? e(t('registrationRequestGovernorateGaza'))
          : request.governorate === 'central'
            ? e(t('registrationRequestGovernorateCentral'))
            : '<span class="tiny muted">—</span>') + '</td>' +
      '<td data-label="' + e(labels.phone) + '">' + (editing
        ? '<input class="input course-request-inline-control course-request-inline-phone" type="tel" maxlength="13" dir="ltr" data-registration-field="phone" value="' +
          e(request.phone || '') + '" aria-label="' + e(labels.phone) + '">'
        : '<a href="https://wa.me/' + e(String(request.phone || '').replace(/\D/g, '')) +
          '" target="_blank" rel="noopener noreferrer" dir="ltr">' + e(request.phone || '—') + '</a>') +
      '</td>' +
      '<td data-label="' + e(labels.source) + '">' + e(source) + '</td>' +
      '<td data-label="' + e(labels.status) + '">' + (editing
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
      '<td class="course-request-row-actions" data-label="' + e(t('edit')) + '"><div class="course-request-row-actions-inner">' +
      (editing
        ? '<button type="button" class="btn btn-primary btn-sm" data-act="course-registration-row-save" data-id="' +
          e(request.id) + '">' + UI.icon('check', 14) + e(t('save')) + '</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-act="course-registration-row-cancel" data-id="' +
          e(request.id) + '">' + UI.icon('x', 14) + e(t('cancel')) + '</button>'
        : '<button type="button" class="btn-icon" data-act="course-registration-row-edit" data-id="' +
          e(request.id) + '" title="' + e(t('studentEdit')) + '" aria-label="' +
          e(t('studentEdit')) + '">' + UI.icon('pencil', 15) + '</button>') +
      '</div></td>' +
      '</tr>';
  }

  function renderCourseCohortRequests(cohort, cohortRequests, includeCourse) {
    if (!cohortRequests.length) {
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
      '"><table class="adm-table"><thead><tr>' +
      (includeCourse ? '<th scope="col">' + e(t('registrationRequestCourse')) + '</th>' : '') +
      '<th scope="col">' + e(t('registrationRequestName')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestAddress')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestSpecialty')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestStudentStatus')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestStudyYear')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestGovernorate')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestPhone')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestSource')) + '</th>' +
      '<th scope="col">' + e(t('registrationRequestStatus')) + '</th>' +
      (includeCourse ? '' : '<th scope="col">' + e(t('registrationRequestDate')) + '</th>') +
      (includeCourse ? '' : '<th scope="col">' + e(t('courseRegistrationPaidAmount')) + '</th>') +
      (includeCourse ? '' : '<th scope="col">' + e(t('inPersonStudentAccount')) + '</th>') +
      '<th scope="col">' + e(t('edit')) + '</th>' +
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

  function courseCohortCard(cohort, requests, expanded) {
    var cohortRequests = requests.filter(function (request) {
      return String(request.cohortId) === String(cohort.id);
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
      '<span>' + e(t('courseCohortApplicants')) + ': ' + cohortRequests.length + '</span></div>' +
      (cohort.active || expanded
        ? renderCourseCohortRequests(cohort, cohortRequests)
        : '') + '</section>';
  }

  function renderCourseCohortsPage() {
    var courseId = getCourseCohortRoute();
    var course = Store.collection('certificates').filter(function (item) {
      return String(item.pk || item.id) === String(courseId);
    })[0];
    if (!course) {
      return '<button type="button" class="btn btn-ghost btn-sm" data-act="course-cohorts-back">' +
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
      '<button type="button" class="btn btn-ghost btn-sm" data-act="course-cohorts-back">' +
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

  function wireCourseCohortPage(host) {
    wireInPersonStudentPayments(host);

    function filterRequests(cohortId, card) {
      var query = (courseCohortApplicantQueries[cohortId] || '').trim().toLocaleLowerCase();
      var selectedSource = courseCohortSourceQueries[cohortId] || '';
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
        var matches = matchesApplicant && matchesSource && matchesCourse && matchesCohort;
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
      if (
        courseRegistrationRequestCourseFilter ||
        courseRegistrationRequestCohortFilter
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
    Admin.navigate('in-person-course-cohorts/' + encodeURIComponent(el.getAttribute('data-id')));
  });

  Admin.on('course-cohorts-back', function () {
    Admin.navigate('in-person-courses');
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
              ? t('registrationRequestGovernorateCentral') : ''
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
        ['gaza', 'central'].indexOf(values.governorate) === -1 ||
        !/^[1-9]\d*$/.test(values.studyYear || '') ||
        Number(values.studyYear) > 4294967295 ||
        ['', 'student', 'graduate'].indexOf(values.studentStatus) === -1 ||
        ['new', 'contacted', 'accepted', 'rejected'].indexOf(values.status) === -1) {
      UI.toast(
        !/^[1-9]\d*$/.test(values.studyYear || '') ||
          Number(values.studyYear) > 4294967295
          ? t('registrationRequestStudyYearInvalid')
          : ['gaza', 'central'].indexOf(values.governorate) === -1
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
      UI.toast(t('courseRegistrationStatusUpdated'), 'success');
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
    var active = (course.status || 'published') !== 'published';
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
      var rows = AdminData.workshops();
      return '<div class="workshop-admin-toolbar"><button class="btn btn-primary" data-act="workshop-add">' +
        UI.icon('plus', 15) + e(t('workshopAdd')) + '</button></div>' +
        Admin.table({
          key: 'workshops',
          id: function (workshop) { return workshop.id; },
          rows: rows,
          pageSize: 10,
          search: function (workshop) {
            return [workshop.title, workshop.location, workshop.description].join(' ');
          },
          empty: {
            icon: 'calendar',
            title: t('emptyTitle'),
            sub: t('subWorkshops'),
            action: '<button class="btn btn-primary btn-sm" data-act="workshop-add">' +
              UI.icon('plus', 14) + e(t('workshopAdd')) + '</button>'
          },
          columns: [
            {
              k: 'title',
              label: t('workshopTitle'),
              sortVal: function (workshop) { return workshop.title; },
              render: function (workshop) {
                return '<div><b>' + e(workshop.title) + '</b>' +
                  (workshop.location ? '<div class="tiny muted">' + e(workshop.location) + '</div>' : '') +
                  '</div>';
              },
              csv: function (workshop) { return workshop.title; }
            },
            {
              k: 'date',
              label: t('workshopStartsAt'),
              sortVal: function (workshop) { return workshop.startsAt; },
              render: function (workshop) { return '<span class="tiny muted">' + e(workshopDateTime(workshop.startsAt)) + '</span>'; },
              csv: function (workshop) { return workshop.startsAt; }
            },
            {
              k: 'duration',
              label: t('workshopDuration'),
              sortVal: function (workshop) { return workshop.durationMinutes; },
              render: function (workshop) { return workshop.durationMinutes + ' ' + e(t('workshopMinutes')); },
              csv: function (workshop) { return workshop.durationMinutes; }
            },
            {
              k: 'attendees',
              label: t('workshopAttendees'),
              sortVal: function (workshop) { return workshop.attendeesCount; },
              render: function (workshop) {
                return '<button class="chip neutral workshop-attendees-count" type="button" data-act="workshop-attendees" data-id="' +
                  e(workshop.id) + '" aria-label="' + e(t('workshopAttendeesTitle')) + ' (' + workshop.attendeesCount + ')">' +
                  workshop.attendeesCount + '</button> ' +
                  '<span class="st ' + (workshop.attendanceOpen ? 'st-ok' : 'st-mute') + '">' +
                  e(t(workshop.attendanceOpen ? 'workshopAttendanceIsOpen' : 'workshopAttendanceIsClosed')) + '</span>';
              },
              csv: function (workshop) { return workshop.attendeesCount; }
            },
            {
              k: 'actions',
              label: t('colActions'),
              cls: 'acts',
              noCsv: true,
              render: function (workshop) {
                return iconBtn('workshop-qr', workshop.id, 'image', t('workshopShowQr')) +
                  iconBtn('workshop-edit', workshop.id, 'pencil', t('workshopEdit')) +
                  iconBtn('workshop-toggle-attendance', workshop.id, workshop.attendanceOpen ? 'close' : 'check-circle',
                    t(workshop.attendanceOpen ? 'workshopCloseAttendance' : 'workshopOpenAttendance')) +
                  iconBtn('workshop-regenerate-qr', workshop.id, 'refresh-cw', t('workshopRegenerateQr')) +
                  iconBtn('workshop-delete', workshop.id, 'trash', t('workshopDelete'), 'danger');
              }
            }
          ]
        });
    }
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
            { v: 'central', l: t('registrationRequestGovernorateCentral') }
          ]
        },
        {
          k: 'studyYear',
          label: t('registrationRequestStudyYear'),
          type: 'number',
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
          required: true,
          options: [
            { v: 'student', l: t('registrationRequestStudent') },
            { v: 'graduate', l: t('registrationRequestGraduate') }
          ]
        }
      ],
      onSubmit: function (values, modal) {
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
        rows: AdminData.studentCertificates(),
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
        filters: [
          {
            k: 'type',
            label: t('certificateType'),
            val: function (certificate) { return certificate.type; },
            options: [
              { v: 'course', l: t('certificateCourse') },
              { v: 'manual', l: t('certificateExternal') },
              { v: 'workshop', l: t('certificateWorkshop') }
            ]
          }
        ],
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
            sortVal: function (certificate) { return certificate.courseTitle || ''; },
            render: function (certificate) {
              return '<span class="tiny muted">' +
                e(certificate.type === 'workshop'
                  ? certificate.title
                  : certificate.courseTitle || '—') + '</span>';
            },
            csv: function (certificate) {
              return certificate.type === 'workshop'
                ? certificate.title
                : certificate.courseTitle || '';
            }
          },
          {
            k: 'review', label: t('certificateReviewStatus'),
            sortVal: function (certificate) { return certificate.reviewStatus || 'approved'; },
            render: function (certificate) {
              return '<span class="tiny muted">' + e(
                certificate.reviewStatusLabel ||
                  (certificate.type === 'workshop'
                    ? t('certificateIssued')
                    : t('certificateCourse'))
              ) + '</span>';
            },
            csv: function (certificate) {
              return certificate.reviewStatusLabel ||
                (certificate.type === 'workshop' ? t('certificateIssued') : '');
            }
          },
          {
            k: 'active', label: t('colStatus'),
            sortVal: function (certificate) { return certificate.active ? 1 : 0; },
            render: function (certificate) {
              return '<span class="st ' + (certificate.active ? 'st-ok' : 'st-mute') + '">' +
                e(t(certificate.active ? 'certificateVisible' : 'certificateHidden')) + '</span>';
            },
            csv: function (certificate) { return t(certificate.active ? 'certificateVisible' : 'certificateHidden'); }
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
              return iconBtn('certificate-details', certificate.id, 'eye', t('certificateViewDetails')) +
                (certificate.type === 'workshop' ? '' : iconBtn(
                'certificate-toggle',
                certificate.id,
                certificate.active ? 'eye-off' : 'eye',
                t(certificate.active ? 'certificateDeactivate' : 'certificateActivate')
              ));
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
      '<div class="if-row"><span class="k">' + e(t('colStatus')) + '</span><span class="v">' +
      e(t(certificate.active ? 'certificateVisible' : 'certificateHidden')) + '</span></div>' +
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
    var courses = studentActiveCourses(student);
    var body = courses.length
      ? '<div class="enroll-list">' + courses.map(function (item) {
        var percent = Math.max(0, Math.min(100, Number(item.enrollment.progress) || 0));
        return '<a class="enroll-row" href="' + e(SITE.u('course', item.course.id)) + '">' +
          '<span class="lr-av">' + UI.icon('graduation-cap', 16) + '</span>' +
          '<span class="er-b"><b>' + e(item.course.title) + '</b>' +
          '<span class="er-meter"><span class="tiny muted">' + e(t('progress')) +
          ' ' + percent + '%</span><span class="meter"><i style="width:' +
          percent + '%"></i></span></span></span></a>';
      }).join('') + '</div>'
      : '<p class="tiny muted">' + e(t('studentActiveCoursesEmpty')) + '</p>';
    UI.modal({
      title: t('studentActiveCoursesTitle') + ' — ' + student.name +
        ' (' + courses.length + ')',
      size: 'md',
      body: body
    });
  });

  Admin.on('certificate-toggle', function (el) {
    var certificate = AdminData.studentCertificates().filter(function (item) {
      return item.id === el.getAttribute('data-id');
    })[0];
    if (!certificate || certificate.type === 'workshop') return;
    el.disabled = true;
    fetch(SITE.u('certificateStatus', certificate.id), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ active: !certificate.active })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        certificate.active = data.active;
        if (data.reviewStatus) {
          certificate.reviewStatus = data.reviewStatus;
          certificate.reviewStatusLabel = data.reviewStatusLabel;
        }
        Admin.renderAll();
        UI.toast(t(data.active ? 'certificateVisible' : 'certificateHidden'), 'success');
      });
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
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
              return enrollment.databaseProgressId !== progressId;
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
            m.body.innerHTML = courseStudentsBody(courseId);
            bindSearch();
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
