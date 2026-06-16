    // ─── Date Utilities ───────────────────────────────────────────────────────

    function formatDate(d) {
      var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    // ─── Auth key (date-scoped) ───────────────────────────────────────────────

    function getAuthKey() {
      var d = new Date();
      return 'itpm_auth_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function isAuthenticated() {
      try { return localStorage.getItem(getAuthKey()) === 'true'; } catch(e) { return false; }
    }

    function saveAuth() {
      try { localStorage.setItem(getAuthKey(), 'true'); } catch(e) {}
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    // Apply all state-specific UI in one place. Called after unlock from both
    // init() and attemptUnlock() so the two paths can never drift.
    function applyStateUI() {
      var dashboard = document.getElementById('dashboard');
      var state = dashboard.dataset.state;
      var approveBar = document.getElementById('approve-bar');

      // The approve bar only has a job in 'planning'. Every other state is
      // post-action (queued / built / failed / closed) — hide it so a stale
      // "Approve Work" button can never appear over an intermediary/closed page.
      if (approveBar) approveBar.style.display = (state === 'planning') ? 'flex' : 'none';

      // Section visibility (recap cards, completion section) is owned entirely by
      // the CSS state machine in styles.css. Here we only toggle the few elements
      // CSS can't key off cleanly: the banners and the Looks Good button.
      if (state === 'intermediary') {
        document.getElementById('intermediary-banner').style.display = 'block';
      }
      if (state === 'failed') {
        document.getElementById('failure-banner').style.display = 'block';
      }
      var looksGoodBtn = document.getElementById('looks-good-btn');
      if (looksGoodBtn) {
        // The button only appears on 'completed' (awaiting Andrew's confirm).
        // On 'looks_good' it's already been pressed — hide it.
        looksGoodBtn.style.display = (state === 'completed') ? 'block' : 'none';
      }
    }

    (function init() {
      var formatted = formatDate(new Date());
      var overlayDate = document.getElementById('overlay-date');
      var headerDate = document.getElementById('header-date');
      if (overlayDate) overlayDate.textContent = formatted;
      if (headerDate) headerDate.textContent = formatted;

      if (isAuthenticated()) {
        document.getElementById('lock-overlay').style.display = 'none';
        checkApproveReady();
        loadStepEdits();
        applyStateUI();
      }
      // Auto-refresh runs ALWAYS — even on the lock screen — so a newly
      // deployed today.html is picked up no matter the auth/render state.
      startAutoRefresh();
    })();

    // ─── Auto-Refresh ─────────────────────────────────────────────────────────
    // The execute/morning routines commit a new today.html; Cloudflare redeploys
    // it (cache-control: must-revalidate, so a fresh fetch always gets the live
    // file). We hash the ENTIRE fetched HTML — any byte change triggers a reload.
    // No dependency on content structure or render state, so it works even if a
    // page is mid-corruption or showing the lock screen.
    function hashString(str) {
      // djb2 — tiny, fast, good enough to detect "the file changed".
      var h = 5381;
      for (var i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) | 0;
      }
      return h;
    }

    var autoRefreshBaseline = null;
    // When Andrew takes an action that will rewrite today.html (Looks Good,
    // Approve, Request Changes, Find New Story), we hold off auto-reloading
    // until that change has fully deployed. Otherwise the poller can catch an
    // intermediate commit (e.g. the state flip before the backlog re-sort
    // lands) and reload the page to a stale state — the "flicker" where the
    // button reappears. suppressReloadUntil is an epoch-ms deadline.
    var suppressReloadUntil = 0;
    function suppressAutoRefresh(ms) {
      suppressReloadUntil = (new Date().getTime()) + ms;
    }

    function startAutoRefresh() {
      // Compare the live deployed file against itself on a poll. On the first
      // tick we record the baseline; on every later tick, a different hash means
      // a new version deployed → hard reload (unless we're in a suppress window).
      function poll() {
        // Poll the exact path the user is on (canonical is /today). Cache-bust
        // so we always read the freshly deployed file, never a cached copy.
        var path = location.pathname && location.pathname !== '/' ? location.pathname : '/today';
        fetch(path + '?_=' + (new Date().getTime()), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.text() : null; })
          .then(function (html) {
            if (!html) return;
            var h = hashString(html);
            if (autoRefreshBaseline === null) {
              autoRefreshBaseline = h;          // first read — establish baseline
              return;
            }
            if (h === autoRefreshBaseline) return;  // nothing changed
            // File changed. If we're inside a suppress window (Andrew just acted
            // and the change is still deploying), keep waiting — but adopt the
            // new hash as baseline so the eventual real reload uses the final
            // version, not an intermediate one.
            if ((new Date().getTime()) < suppressReloadUntil) {
              autoRefreshBaseline = h;
              return;
            }
            location.reload();
          })
          .catch(function () { /* offline / transient — try again next tick */ });
      }
      poll();                                    // seed the baseline right away
      setInterval(poll, 20000);                  // then every 20s
    }

    // ─── Lock / Unlock ────────────────────────────────────────────────────────

    function revealPassword() {
      document.getElementById('reveal-btn').style.display = 'none';
      var section = document.getElementById('password-section');
      section.classList.add('visible');
      document.getElementById('password-input').focus();
    }

    function attemptUnlock() {
      var input = document.getElementById('password-input');
      var errorMsg = document.getElementById('error-msg');
      var unlockBtn = document.getElementById('unlock-btn');
      var value = input.value;
      if (!value) return;

      unlockBtn.textContent = 'Verifying...';
      unlockBtn.disabled = true;

      fetch('/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: value })
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.ok) {
            saveAuth();
            document.getElementById('lock-overlay').style.display = 'none';
            errorMsg.classList.remove('visible');
            checkApproveReady();
            loadStepEdits();
            applyStateUI();
          } else {
            errorMsg.classList.add('visible');
            input.value = '';
            input.focus();
            unlockBtn.textContent = 'Unlock Dashboard';
            unlockBtn.disabled = false;
          }
        })
        .catch(function() {
          errorMsg.classList.add('visible');
          input.value = '';
          input.focus();
          unlockBtn.textContent = 'Unlock Dashboard';
          unlockBtn.disabled = false;
        });
    }

    document.getElementById('password-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') attemptUnlock();
    });

    // ─── Option Selection ─────────────────────────────────────────────────────

    function selectOption(card) {
      var group = card.closest('.option-group');
      if (!group) return;
      group.querySelectorAll('.option-card').forEach(function(c) {
        c.classList.remove('selected');
      });
      card.classList.add('selected');
      checkApproveReady();
    }

    document.addEventListener('click', function(e) {
      if (e.target.closest('.option-edit-btn') || e.target.closest('.step-edit-btn')) return;
      var card = e.target.closest('.option-card');
      if (!card) return;
      selectOption(card);
    });

    // ─── Phone Option Selection ───────────────────────────────────────────────

    function selectPhoneOption(el) {
      var group = el.closest('.phone-options');
      if (!group) return;
      group.querySelectorAll('.phone-option').forEach(function(opt) {
        opt.classList.remove('selected');
      });
      el.classList.add('selected');
      checkApproveReady();
    }

    document.addEventListener('click', function(e) {
      var phoneOpt = e.target.closest('.phone-option');
      if (!phoneOpt) return;
      selectPhoneOption(phoneOpt);
    });

    // ─── Add to Backlog ───────────────────────────────────────────────────────

    function handleAddBacklog() {
      var ta = document.getElementById('backlog-input');
      var btn = document.getElementById('backlog-btn');
      var text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      btn.textContent = 'Adding...';
      btn.disabled = true;
      fetch('/add-backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: text })
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.ok) {
            btn.textContent = '✓ Added';
            ta.value = '';
            setTimeout(function() { btn.textContent = 'Add to Backlog'; btn.disabled = false; }, 2500);
          } else {
            btn.textContent = 'Add to Backlog'; btn.disabled = false;
          }
        })
        .catch(function() { btn.textContent = 'Add to Backlog'; btn.disabled = false; });
    }

    // ─── Option Edit ──────────────────────────────────────────────────────────

    function toggleOptionEdit(e, btn) {
      e.stopPropagation();
      var card = btn.closest('.option-card');
      var body = card.querySelector('.option-body');
      var icon = btn.querySelector('.material-symbols-outlined');
      if (body.contentEditable === 'true') {
        body.contentEditable = 'false';
        btn.classList.remove('editing');
        icon.textContent = 'edit';
        try { localStorage.setItem('itpm_option_edit_' + getAuthKey(), body.innerText.trim()); } catch(e2) {}
      } else {
        body.contentEditable = 'true';
        btn.classList.add('editing');
        icon.textContent = 'check';
        body.focus();
      }
    }

    // ─── Step Edit ────────────────────────────────────────────────────────────

    function toggleStepEdit(btn) {
      var body = btn.previousElementSibling;
      var icon = btn.querySelector('.material-symbols-outlined');
      if (body.contentEditable === 'true') {
        body.contentEditable = 'false';
        btn.classList.remove('editing');
        icon.textContent = 'edit';
        saveStepEdits();
      } else {
        body.contentEditable = 'true';
        btn.classList.add('editing');
        icon.textContent = 'check';
        body.focus();
      }
    }

    function saveStepEdits() {
      var steps = [];
      document.querySelectorAll('.step-body').forEach(function(s) {
        steps.push(s.innerText.trim());
      });
      try { localStorage.setItem('itpm_steps_' + getAuthKey(), JSON.stringify(steps)); } catch(e) {}
    }

    function loadStepEdits() {
      try {
        var saved = localStorage.getItem('itpm_steps_' + getAuthKey());
        if (!saved) return;
        var steps = JSON.parse(saved);
        document.querySelectorAll('.step-body').forEach(function(s, i) {
          if (steps[i]) s.innerText = steps[i];
        });
      } catch(e) {}
    }

    // ─── Priority Skip ────────────────────────────────────────────────────────

    function handlePrioritySkip(cb) {
      var card = cb.closest('.priority-card');
      card.classList.toggle('skipped', cb.checked);
      // Single-story model: any skip puts the whole dashboard in skip-mode,
      // hiding plan detail (options, triage, questions, steps) and turning
      // the approve button into "Find New Story".
      var anySkipped = document.querySelector('.priority-skip-cb:checked') !== null;
      document.getElementById('dashboard').classList.toggle('skip-mode', anySkipped);
      checkApproveReady();
    }

    // ─── Question Inputs ──────────────────────────────────────────────────────

    document.addEventListener('input', function(e) {
      if (e.target.classList.contains('question-input')) checkApproveReady();
    });

    // ─── Approve Ready Check ──────────────────────────────────────────────────

    function checkApproveReady() {
      var btn = document.getElementById('approve-btn');
      var status = document.getElementById('approve-status');

      if (document.getElementById('dashboard').dataset.populated !== 'true') {
        btn.classList.remove('ready');
        btn.textContent = 'Approve / Get To Work';
        if (status) status.textContent = 'Dashboard not yet populated — check back after 9am EST';
        return;
      }

      // Skip mode: story is being rejected — button becomes "Find New Story", always ready.
      if (document.getElementById('dashboard').classList.contains('skip-mode')) {
        btn.classList.add('ready');
        btn.textContent = 'Find New Story';
        if (status) status.textContent = 'This story will be swapped for a new one. Add any guidance below, then find a new story.';
        return;
      }
      btn.textContent = 'Approve / Get To Work';

      var allQuestionsAnswered = true;
      document.querySelectorAll('.question-input[data-required="true"]').forEach(function(input) {
        if (!input.value.trim()) allQuestionsAnswered = false;
      });

      var allOptionsSelected = true;
      document.querySelectorAll('.option-group').forEach(function(group) {
        if (!group.querySelector('.option-card.selected')) allOptionsSelected = false;
      });
      document.querySelectorAll('.phone-options').forEach(function(group) {
        if (!group.querySelector('.phone-option.selected')) allOptionsSelected = false;
      });

      if (allQuestionsAnswered && allOptionsSelected) {
        btn.classList.add('ready');
        if (status) status.textContent = 'Ready to approve — all fields complete';
      } else {
        btn.classList.remove('ready');
        var unanswered = Array.from(document.querySelectorAll('.question-input[data-required="true"]')).filter(function(i) { return !i.value.trim(); }).length;
        if (status) status.textContent = unanswered > 0
          ? unanswered + ' required question' + (unanswered > 1 ? 's' : '') + ' remaining'
          : 'Select an implementation option to continue';
      }
    }

    // ─── Approve ──────────────────────────────────────────────────────────────

    function handleApprove() {
      var btn = document.getElementById('approve-btn');
      if (!btn.classList.contains('ready') || btn.classList.contains('approved')) return;

      var dashboard = document.getElementById('dashboard');

      // ── Skip-mode path: reject this story, ask for a new one (revision) ──
      if (dashboard.classList.contains('skip-mode')) {
        var skippedTitle = '';
        var skippedCard = document.querySelector('.priority-skip-cb:checked');
        if (skippedCard) {
          var tEl = skippedCard.closest('.priority-card').querySelector('.priority-title');
          if (tEl) skippedTitle = tEl.textContent.trim();
        }
        var revContent = 'Date: ' + formatDate(new Date())
          + '\n\nAndrew skipped today\'s story: ' + skippedTitle
          + '\n\nPick a different single story and regenerate the full plan.';
        var guidance = document.getElementById('revision-textarea');
        if (guidance && guidance.value.trim()) revContent += '\n\nGuidance for the new pick:\n' + guidance.value.trim();

        dashboard.dataset.state = 'intermediary';
        btn.textContent = '✓ Finding new story...';
        btn.classList.add('approved');
        btn.classList.remove('ready');
        btn.disabled = true;
        var skipStatus = document.getElementById('approve-status');
        if (skipStatus) skipStatus.textContent = 'Regenerating with a new story — watch for a push notification.';
        var skipBanner = document.getElementById('intermediary-banner');
        if (skipBanner) skipBanner.style.display = 'block';

        suppressAutoRefresh(30000);   // smooth over the intermediary-state commit
        fetch('/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'revision', content: revContent })
        }).catch(function() {});
        return;
      }

      // Build approval content
      var content = 'Date: ' + formatDate(new Date());

      var selectedOptions = [];
      document.querySelectorAll('.option-card.selected').forEach(function(card) {
        var title = card.querySelector('.option-title');
        if (title) selectedOptions.push(title.textContent.trim());
      });
      if (selectedOptions.length > 0) content += '\n\nSelected Approach:\n' + selectedOptions.map(function(o) { return '- ' + o; }).join('\n');

      var selectedBody = document.querySelector('.option-card.selected .option-body');
      if (selectedBody) {
        var savedEdit = null;
        try { savedEdit = localStorage.getItem('itpm_option_edit_' + getAuthKey()); } catch(e) {}
        content += '\n\nApproved implementation approach:\n' + (savedEdit || selectedBody.innerText.trim());
      }

      var stepEdits = null;
      try { stepEdits = localStorage.getItem('itpm_steps_' + getAuthKey()); } catch(e) {}
      if (stepEdits) {
        try {
          var steps = JSON.parse(stepEdits);
          content += '\n\nExecution order (follow this exactly):\n' + steps.map(function(s, i) { return (i+1) + '. ' + s; }).join('\n');
        } catch(e) {}
      }

      var skipped = [];
      document.querySelectorAll('.priority-skip-cb:checked').forEach(function(cb) {
        var t = cb.closest('.priority-card').querySelector('h3');
        if (!t) t = cb.closest('.priority-card').querySelector('.priority-title');
        if (t) skipped.push(t.textContent.trim());
      });
      if (skipped.length > 0) content += '\n\nSkip these stories and find alternatives:\n' + skipped.map(function(s) { return '- ' + s; }).join('\n');

      var answers = [];
      document.querySelectorAll('.question-input[data-required="true"]').forEach(function(input) {
        var labelEl = input.closest('.question-block') ? input.closest('.question-block').querySelector('.question-label') : null;
        if (!labelEl) labelEl = input.closest('.question-item') ? input.closest('.question-item').querySelector('.question-text') : null;
        answers.push((labelEl ? labelEl.textContent.trim() : 'Question') + ': ' + input.value.trim());
      });
      if (answers.length > 0) content += '\n\nAndrew\'s Answers:\n' + answers.join('\n');

      var notes = document.getElementById('revision-textarea');
      if (notes && notes.value.trim()) content += '\n\nAdditional context:\n' + notes.value.trim();

      var phoneNotes = [];
      document.querySelectorAll('.phone-option').forEach(function(opt) {
        var noteEl = opt.querySelector('.phone-option-note textarea');
        if (noteEl && noteEl.value.trim()) {
          var labelEl = opt.querySelector('.phone-option-label');
          var label = labelEl ? labelEl.textContent.replace(/recommended/i, '').trim() : 'Option';
          phoneNotes.push('Design feedback — ' + label + ': ' + noteEl.value.trim());
        }
      });
      if (phoneNotes.length > 0) content += '\n\nDesign feedback per option:\n' + phoneNotes.join('\n');

      content += '\n\nProceed with implementation.';

      // Switch to intermediary state immediately
      var dashboard = document.getElementById('dashboard');
      dashboard.dataset.state = 'intermediary';

      btn.textContent = '✓ Queued';
      btn.classList.add('approved');
      btn.classList.remove('ready');
      btn.disabled = true;

      var statusEl = document.getElementById('approve-status');
      if (statusEl) statusEl.textContent = 'Execution starting now — watch for a push notification when the build is complete.';

      // Show intermediary banner
      var banner = document.getElementById('intermediary-banner');
      if (banner) banner.style.display = 'block';

      // POST to trigger
      suppressAutoRefresh(30000);   // smooth over the intermediary-state commit
      fetch('/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'approval', content: content })
      }).catch(function() {});
    }

    // ─── Looks Good ───────────────────────────────────────────────────────────

    // Pull the story ID (e.g. "FRED-124") out of the completion summary so the
    // backend functions know which backlog story to check off / rework.
    function getCompletedStoryId() {
      var el = document.getElementById('completion-content');
      if (!el) return '';
      var m = el.textContent.match(/FRED-\d+/);
      return m ? m[0] : '';
    }

    function handleLooksGood() {
      var btn = document.getElementById('looks-good-btn');
      btn.textContent = 'Marking as done...';
      btn.disabled = true;
      // Hold off auto-reload until the looks_good commit + deploy fully lands,
      // so the page doesn't flicker back to the button mid-transaction.
      suppressAutoRefresh(120000);
      fetch('/looks-good', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: getCompletedStoryId() })
      })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.ok) {
            btn.textContent = '✓ All done — fresh brief tomorrow at 9am';
            btn.style.background = '#6b7280';
            var rework = document.getElementById('rework-block');
            if (rework) rework.style.display = 'none';
          } else {
            suppressReloadUntil = 0;           // failed — let refresh resume
            btn.textContent = 'Looks Good ✓';
            btn.disabled = false;
          }
        })
        .catch(function() {
          suppressReloadUntil = 0;
          btn.textContent = 'Looks Good ✓';
          btn.disabled = false;
        });
    }

    // Request Changes — send feedback to rework the SAME story. Page goes
    // intermediary while the builder reworks, then returns to completed.
    function handleRework() {
      var btn = document.getElementById('rework-btn');
      var ta = document.getElementById('rework-textarea');
      var feedback = ta ? ta.value.trim() : '';
      if (!feedback) { if (ta) ta.focus(); return; }

      var content = 'Date: ' + formatDate(new Date())
        + '\n\nStory: ' + getCompletedStoryId()
        + '\n\nAndrew reviewed the completed build and is NOT satisfied. Rework the SAME story (do not re-pick or re-plan). His feedback:\n' + feedback;

      btn.textContent = 'Sending to builder...';
      btn.disabled = true;
      if (ta) ta.disabled = true;
      document.getElementById('looks-good-btn').disabled = true;

      var dashboard = document.getElementById('dashboard');
      dashboard.dataset.state = 'intermediary';
      var banner = document.getElementById('intermediary-banner');
      if (banner) banner.style.display = 'block';
      applyStateUI();

      suppressAutoRefresh(30000);   // smooth over the intermediary-state commit
      fetch('/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rework', content: content })
      }).catch(function() {});
    }
