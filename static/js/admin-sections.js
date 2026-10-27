(function () {
  'use strict';

  var t = Admin.t;
  var e = Admin.e;

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
        id: function (u) { return u.id; },
        rows: Store.collection('users').filter(function (u) { return u.role === 'student'; }),
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
            render: function (u) { return Admin.statusChip(u.status); }, csv: function (u) { return u.status; }
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
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (u) {
              return iconBtn('user-edit', u.id, 'pencil', t('edit')) +
                iconBtn('user-toggle', u.id, 'refresh-cw', t('actStatus')) +
                iconBtn('user-redeem-referral-points', u.id, 'graduation-cap', t('redeemReferralPoints')) +
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

  function userModal(id) {
    var u = id ? Store.find('users', id) : null;
    function isDuplicate(field, value) {
      return Store.collection('users').some(function (candidate) {
        return candidate.id !== (u && u.id) && String(candidate[field] || '').toLowerCase() === value.toLowerCase();
      });
    }
    var fields = [
      sectionField(t('secBasic')),
      { k: 'name', label: t('uName'), type: 'text', required: true, maxLength: 150, value: u ? u.name : '' },
      {
        k: 'handle', label: t('uHandle'), type: 'text', required: true, maxLength: 40, value: u ? u.handle : '', dir: 'ltr',
        validate: function (value) {
          if (isDuplicate('handle', value)) return t('userHandleTaken');
          return '';
        }
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
      { k: 'verified', label: t('uVerified'), type: 'switch', value: u ? !!u.verified : false },
      { k: 'joined', label: t('colJoined'), type: 'date', value: u && u.joined ? String(u.joined).slice(0, 10) : '' },
      { k: 'bio', label: t('uBio'), type: 'textarea', full: true, rows: 3, value: u ? u.bio : '' }
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
            handle: v.handle,
            email: v.email,
            phone: v.phone,
            password: v.password || '',
            status: v.status,
            verified: v.verified,
            bio: v.bio,
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
    fetch(SITE.u('studentStatus', u.databaseId || u.id), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ active: u.status !== 'active' })
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
      UI.toast(error.message || t('saveError'), 'error');
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
        rows: Store.collection('trainers'),
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
            k: 'rating', label: t('colRating'), sortVal: function (tr) { return tr.rating || 0; },
            render: function (tr) { return '<span class="chip ok">★ ' + e(String(tr.rating || 0)) + '</span>'; },
            csv: function (tr) { return tr.rating || 0; }
          },
          {
            k: 'courses', label: t('statCourses'), sortVal: function (tr) { return AdminData.courseTrainerCount(tr.id); },
            render: function (tr) {
              var count = tr.coursesCount != null ? tr.coursesCount : AdminData.courseTrainerCount(tr.id);
              return '<span class="chip neutral">' + count + '</span>';
            },
            csv: function (tr) { return tr.coursesCount != null ? tr.coursesCount : AdminData.courseTrainerCount(tr.id); }
          },
          {
            k: 'status', label: t('colStatus'), sortVal: function (tr) { return tr.status; },
            render: function (tr) { return Admin.statusChip(tr.status); }, csv: function (tr) { return tr.status; }
          },
          {
            k: 'joined', label: t('colJoined'), sortVal: function (tr) { return tr.joined; },
            render: function (tr) { return '<span class="tiny muted">' + e(UI.formatDate(tr.joined)) + '</span>'; },
            csv: function (tr) { return tr.joined; }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (tr) {
              return iconBtn('trainer-edit', tr.id, 'pencil', t('edit')) +
                iconBtn('trainer-toggle', tr.id, 'refresh-cw', t('actStatus'));
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
      { k: 'handle', label: t('uHandle'), type: 'text', required: true, value: tr ? tr.handle : '', dir: 'ltr' },
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
      sectionField(t('secLinks')),
      { k: 'linkedin', label: t('tLinkedin'), type: 'text', dir: 'ltr', value: tr ? tr.linkedin : '' },
      { k: 'github', label: t('tGithub'), type: 'text', dir: 'ltr', value: tr ? tr.github : '' },
      sectionField(t('secMeta')),
      { k: 'rating', label: t('tRating'), type: 'number', min: 0, max: 5, step: 0.1, value: tr ? (tr.rating != null ? tr.rating : '') : '' },
      { k: 'status', label: t('uStatus'), type: 'select', options: stOpts(['active', 'paused']), value: tr ? tr.status : 'active' },
      { k: 'verified', label: t('uVerified'), type: 'switch', value: tr ? !!tr.verified : true },
      { k: 'joined', label: t('colJoined'), type: 'date', value: tr && tr.joined ? String(tr.joined).slice(0, 10) : '' },
      {
        k: 'password', label: t('accountPassword'), type: 'text', inputType: 'password',
        required: !tr, value: '', dir: 'ltr',
        hint: tr ? t('passwordKeepHint') : ''
      },
      { k: 'bio', label: t('uBio'), type: 'textarea', full: true, rows: 3, value: tr ? tr.bio : '' }
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
            handle: v.handle,
            specialty: v.specialty,
            password: v.password || '',
            rating: v.rating === '' ? 0 : v.rating,
            email: v.email,
            phone: v.phone,
            status: v.status,
            bio: v.bio,
            linkedin: v.linkedin,
            github: v.github,
            avatar: v.avatar,
            verified: v.verified,
            joined: v.joined
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
    fetch(SITE.u('trainerStatus', tr.id), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.CSRF_TOKEN || ''
      },
      body: JSON.stringify({ active: tr.status !== 'active' })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.ok) throw new Error(data.message || t('saveError'));
        tr.status = data.active ? 'active' : 'paused';
        Store.save(true);
        UI.toast(t('statusUpd'), 'success');
        Admin.renderAll();
      });
    }).catch(function (error) {
      UI.toast(error.message || t('saveError'), 'error');
    });
  });

  Admin.register('courses', {
    render: function () {
      var cats = Store.collection('certificates').map(function (c) { return c.category || ''; })
        .filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
      return Admin.table({
        key: 'courses',
        id: function (c) { return c.id; },
        rows: Store.collection('certificates'),
        pageSize: 10,
        search: function (c) { return [c.title, c.issuer, c.category, trainerLabel(c.trainerId)].join(' '); },
        filters: [
          { k: 'category', label: t('fCat'), val: function (c) { return c.category || ''; }, options: cats.map(function (x) { return { v: x, l: x }; }) },
          { k: 'trainer', label: t('fTrainer'), val: function (c) { return c.trainerId || ''; }, options: trainerOpts().filter(function (o) { return o.v; }) },
          { k: 'status', label: t('allStatus'), val: function (c) { return c.status || 'published'; }, options: stOpts(['published', 'draft', 'archived']) }
        ],
        add: { label: t('cAdd'), url: SITE.u('courseCreate'), icon: 'plus' },
        bulk: [
          { act: 'course-bulk-pub', label: t('bulkPublish'), icon: 'check' },
          { act: 'course-bulk-draft', label: t('bulkDraft'), icon: 'pencil' },
          { act: 'course-bulk-del', label: t('bulkDelete'), icon: 'trash', danger: true }
        ],
        empty: {
          icon: 'graduation-cap', title: t('emptyCourses'), sub: t('emptyCoursesSub'),
          action: '<a class="btn btn-primary btn-sm" href="' + SITE.u('courseCreate') + '">' + UI.icon('plus', 15) + e(t('cAdd')) + '</a>'
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
            render: function (c) { return courseLessons(c); }, csv: courseLessons
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
              return '<span class="st ' + (active ? 'st-ok' : 'st-mute') + '">' +
                e(t(active ? 'courseActive' : 'courseInactive')) + '</span>';
            },
            csv: function (c) { return (c.status || 'published') === 'published' ? t('courseActive') : t('courseInactive'); }
          },
          {
            k: 'date', label: t('colDate'), sortVal: function (c) { return c.addedAt || c.date; },
            render: function (c) { return '<span class="tiny muted">' + e(UI.formatDate(c.addedAt || c.date)) + '</span>'; },
            csv: function (c) { return c.addedAt || c.date || ''; }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (c) {
              return               linkBtn(SITE.u('course', c.id), 'eye', t('openCourse')) +
              iconBtn('course-students', c.id, 'users', t('actStudents')) +
              iconBtn('course-lessons', c.id, 'list', t('actLessons')) +
              linkBtn(SITE.u('courseEdit', c.id), 'external-link', t('editCourse')) +
              iconBtn('course-toggle', c.pk || c.id, (c.status || 'published') === 'published' ? 'eye-off' : 'eye',
                t((c.status || 'published') === 'published' ? 'courseDeactivate' : 'courseActivate'));
            }
          }
        ]
      });
    }
  });

  Admin.on('course-toggle', function (el) {
    var course = Store.collection('certificates').filter(function (item) {
      return String(item.pk || item.id) === String(el.getAttribute('data-id'));
    })[0];
    if (!course) return;
    var active = (course.status || 'published') !== 'published';
    el.disabled = true;
    fetch(SITE.u('courseStatus', el.getAttribute('data-id')), {
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
        Store.save(true);
        Admin.renderAll();
        UI.toast(t(data.active ? 'courseActive' : 'courseInactive'), 'success');
      });
    }).catch(function (error) {
      el.disabled = false;
      UI.toast(error.message || t('saveError'), 'error');
    });
  });

  Admin.on('course-bulk-pub', function () { bulkSet('courses', 'courses', 'certificates', 'status', 'published'); });
  Admin.on('course-bulk-draft', function () { bulkSet('courses', 'courses', 'certificates', 'status', 'draft'); });
  Admin.on('course-bulk-del', function () { bulkDel('courses', 'courses', 'certificates'); });

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
        rows: AdminData.projects(),
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
        add: { label: t('pAdd'), url: SITE.u('projectCreate'), icon: 'plus' },
        empty: {
          icon: 'folder', title: t('emptyProjects'), sub: t('emptyProjectsSub'),
          action: '<a class="btn btn-primary btn-sm" href="' + SITE.u('projectCreate') + '">' + UI.icon('plus', 15) + e(t('pAdd')) + '</a>'
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
              return '<span class="st ' + (active ? 'st-ok' : 'st-mute') + '">' +
                e(t(active ? 'projectActive' : 'projectInactive')) + '</span>';
            },
            csv: function (p) { return (p.status || 'published') === 'published' ? t('projectActive') : t('projectInactive'); }
          },
          {
            k: 'date', label: t('colDate'), sortVal: function (p) { return p.createdAt || p.date; },
            render: function (p) { return '<span class="tiny muted">' + e(UI.formatDate(p.createdAt || p.date)) + '</span>'; },
            csv: function (p) { return p.createdAt || p.date || ''; }
          },
          {
            k: 'actions', label: t('colActions'), cls: 'acts', noCsv: true,
            render: function (p) {
              return linkBtn(SITE.u('project', p.id), 'eye', t('pView')) +
                linkBtn(SITE.u('projectEdit', p.id), 'external-link', t('pEdit')) +
                iconBtn('project-toggle', p.pk || p.id, (p.status || 'published') === 'published' ? 'eye-off' : 'eye',
                  t((p.status || 'published') === 'published' ? 'projectDeactivate' : 'projectActivate'));
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
    el.disabled = true;
    fetch(SITE.u('projectStatus', el.getAttribute('data-id')), {
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
              { v: 'manual', l: t('certificateExternal') }
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
                e(certificate.type === 'course' ? t('certificateCourse') : t('certificateExternal')) +
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
            render: function (certificate) { return '<span class="tiny muted">' + e(certificate.courseTitle || '—') + '</span>'; },
            csv: function (certificate) { return certificate.courseTitle || ''; }
          },
          {
            k: 'review', label: t('certificateReviewStatus'),
            sortVal: function (certificate) { return certificate.reviewStatus || 'approved'; },
            render: function (certificate) {
              return '<span class="tiny muted">' + e(certificate.reviewStatusLabel || t('certificateCourse')) + '</span>';
            },
            csv: function (certificate) { return certificate.reviewStatusLabel || ''; }
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
                iconBtn(
                'certificate-toggle',
                certificate.id,
                certificate.active ? 'eye-off' : 'eye',
                t(certificate.active ? 'certificateDeactivate' : 'certificateActivate')
              );
            }
          }
        ]
      });
    }
  });

  Admin.register('point-discounts', {
    render: function () {
      var rows = AdminData.pointRedemptions();
      return Admin.table({
        key: 'point-discounts',
        id: function (redemption) { return redemption.id; },
        rows: rows,
        pageSize: 12,
        search: function (redemption) {
          return [
            redemption.studentName,
            redemption.studentHandle,
            redemption.courseTitle,
            redemption.points
          ].join(' ');
        },
        empty: {
          icon: 'award',
          title: t('pointDiscountsEmpty'),
          sub: t('pointDiscountsEmptySub')
        },
        columns: [
          {
            k: 'student', label: t('certificateStudent'),
            sortVal: function (redemption) { return redemption.studentName; },
            render: function (redemption) {
              return '<span>' + e(redemption.studentName) + '</span>' +
                (redemption.studentHandle ? '<span class="tiny muted" dir="ltr"> @' + e(redemption.studentHandle) + '</span>' : '');
            },
            csv: function (redemption) {
              return redemption.studentName + (redemption.studentHandle ? ' @' + redemption.studentHandle : '');
            }
          },
          {
            k: 'course', label: t('certificateCourseTitle'),
            sortVal: function (redemption) { return redemption.courseTitle; },
            render: function (redemption) { return '<span>' + e(redemption.courseTitle) + '</span>'; },
            csv: function (redemption) { return redemption.courseTitle; }
          },
          {
            k: 'points', label: t('pointDiscountPoints'),
            sortVal: function (redemption) { return redemption.points; },
            render: function (redemption) { return '<span class="tiny">' + redemption.points + '</span>'; },
            csv: function (redemption) { return redemption.points; }
          },
          {
            k: 'date', label: t('colDate'),
            sortVal: function (redemption) { return redemption.date; },
            render: function (redemption) { return '<span class="tiny muted">' + e(UI.formatDate(redemption.date)) + '</span>'; },
            csv: function (redemption) { return redemption.date; }
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
      e(certificate.type === 'course' ? t('certificateCourse') : t('certificateExternal')) + '</span></div>' +
      '<div class="if-row"><span class="k">' + e(t('certificateStudent')) + '</span><span class="v">' +
      e(certificate.studentName) + (certificate.studentHandle ? ' @' + e(certificate.studentHandle) : '') + '</span></div>' +
      '<div class="if-row"><span class="k">' + e(t('certificateIssuer')) + '</span><span class="v">' +
      e(certificate.issuer || '—') + '</span></div>' +
      (certificate.courseTitle ? '<div class="if-row"><span class="k">' + e(t('certificateCourseTitle')) + '</span><span class="v">' + e(certificate.courseTitle) + '</span></div>' : '') +
      (certificate.category ? '<div class="if-row"><span class="k">' + e(t('certificateCategory')) + '</span><span class="v">' + e(certificate.category) + '</span></div>' : '') +
      '<div class="if-row"><span class="k">' + e(t('certificateDate')) + '</span><span class="v">' + e(UI.formatDate(certificate.date) || '—') + '</span></div>' +
      (certificate.code ? '<div class="if-row"><span class="k">' + e(t('certificateCode')) + '</span><span class="v" dir="ltr">' + e(certificate.code) + '</span></div>' : '') +
      (certificate.reviewStatusLabel ? '<div class="if-row"><span class="k">' + e(t('certificateReviewStatus')) + '</span><span class="v">' + e(certificate.reviewStatusLabel) + '</span></div>' : '') +
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

  Admin.on('certificate-toggle', function (el) {
    var certificate = AdminData.studentCertificates().filter(function (item) {
      return item.id === el.getAttribute('data-id');
    })[0];
    if (!certificate) return;
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
