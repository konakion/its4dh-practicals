/*
 * Interactive practical engine: navigation, real-Linux exercises, quizzes, progress.
 * Content comes from window.PRACTICAL (see practical-01.js).
 * All command output shown here comes from the Linux VM in shell-worker.js.
 */
(() => {
  'use strict';
  const C = window.PRACTICAL;
  const STORE = C.id + '-progress-v2';
  const MAX_LINES = 400;

  // ------------------------------------------------------------ helpers
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  }
  // Inline `code` and **bold**; everything else stays plain text (no innerHTML).
  function rich(text) {
    const frag = document.createDocumentFragment();
    const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      frag.append(text.slice(last, m.index));
      frag.append(m[1] != null ? h('code', { text: m[1] }) : h('strong', { text: m[2] }));
      last = re.lastIndex;
    }
    frag.append(text.slice(last));
    return frag;
  }
  const tildify = p => (p === C.home ? '~' : p.startsWith(C.home + '/') ? '~' + p.slice(C.home.length) : p);
  const expand = p => (p === '~' ? C.home : p.startsWith('~/') ? C.home + p.slice(1) : p);
  const promptFor = cwd => `${C.user}@${C.host}:${tildify(cwd)}$`;
  const quote = s => "'" + s.replace(/'/g, "'\\''") + "'";

  // ------------------------------------------------------------ progress
  let progress = { steps: {}, quiz: {}, missed: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved && saved.steps && saved.quiz) progress = Object.assign(progress, saved);
  } catch (_) { /* storage unavailable: progress lives for this visit only */ }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch (_) {} };
  const stepKey = (ch, st) => ch.id + '/' + st.id;
  const chapterDone = ch => ch.steps.every(s => progress.steps[stepKey(ch, s)]) && !!progress.quiz[ch.id];
  const chapterCount = ch => ch.steps.filter(s => progress.steps[stepKey(ch, s)]).length + (progress.quiz[ch.id] ? 1 : 0);

  // ------------------------------------------------------------ checking (pure)
  const lines = s => {
    const out = s.replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, ''));
    while (out.length && out[out.length - 1] === '') out.pop();
    return out;
  };
  const numberOf = s => { const m = s.trim().match(/^(\d+)(\s+\S*[^\d\s]\S*)?$/); return m ? Number(m[1]) : null; }; // a count, optionally followed by a file name
  const compare = {
    lines: (got, exp) => { const a = lines(got), b = lines(exp); return b.length > 0 && a.length === b.length && a.every((l, i) => l === b[i]); },
    number: (got, exp) => { const n = numberOf(got); return n !== null && n === Number(exp.trim()); },
    names: (got, exp) => { const have = new Set(got.split(/\s+/)); const want = exp.split(/\s+/).filter(Boolean); return want.length > 0 && want.every(w => have.has(w)); },
    lineset: (got, exp) => {
      const n = s => lines(s).map(l => l.trim().replace(/\s+/g, ' ')).filter(Boolean).sort().join('\n');
      return n(exp) !== '' && n(got) === n(exp);
    },
  };
  function matches(when, r, command) {
    return Object.entries(when).every(([k, v]) => {
      if (k === 'stdout') return v.test(r.stdout.trim());
      if (k === 'stderr') return v.test(r.stderr);
      if (k === 'command') return v.test(command);
      if (k === 'status') return r.status === v;
      if (k === 'number') return numberOf(r.stdout) === v;
      if (k === 'stdoutLines') return lines(r.stdout).filter(Boolean).length === v;
      return false;
    });
  }
  function explainError(r) {
    const e = r.stderr;
    if (!e.trim() || r.status === 0) return null;
    let m;
    if ((m = e.match(/(?:^|: )([^\s:]+): not found/m)) && r.status === 127)
      return `The shell does not know the command “${m[1]}”. Check the spelling: Linux commands are lowercase.`;
    if (/unterminated quoted string|syntax error/.test(e)) return 'The shell could not read your command: a quote or bracket is missing its partner. Every \' or " needs a closing one.';
    if (/Permission denied/.test(e)) return 'Linux refused the change: Permission denied. The data folder is protected evidence, and system folders belong to the administrator (root).';
    if (/can't cd to/.test(e)) return `That folder does not exist from where you are (${tildify(r.cwd)}). Check the spelling, or look around with ls.`;
    if (/No such file or directory/.test(e)) return `A file or folder in your command does not exist from where you are (${tildify(r.cwd)}). Check the spelling, or look around with ls.`;
    if (/Is a directory/.test(e)) return 'That name is a folder, not a file.';
    if (/invalid option|unrecognized option|Usage:/.test(e)) return 'One of the options is not valid for this command. Check the dash and the letter.';
    if (/File size limit exceeded/.test(e)) return 'Your command produced a huge amount of output and was stopped.';
    return null;
  }
  function evaluate(step, r, command) {
    const fill = s => s.replace('{cwd}', tildify(r.cwd));
    if (r.restarted) return { ok: false, msg: 'Your command did not finish and Linux had to be restarted with fresh files. Click Reset exercise, then try a different command.' };
    if (r.timedOut) return { ok: false, msg: 'Your command was still running after 10 seconds, so it was stopped. A command that waits for input or never ends cannot finish here.' };
    const c = step.check;
    let ok = false, reason = null;
    if (c.state) {
      const code = r.probe.trim().split('\n').pop();
      ok = code === 'OK';
      if (!ok) reason = step.reasons && step.reasons[code] ? fill(step.reasons[code]) : null;
    } else {
      ok = r.status === 0 && compare[c.output](r.stdout, r.probe);
    }
    if (ok) {
      const unmet = (step.mustUse || []).find(u => !u.re.test(command));
      if (unmet) return { ok: false, partial: true, msg: unmet.msg };
      return { ok: true, msg: step.success };
    }
    const d = (step.diagnose || []).find(x => matches(x.when, r, command));
    if (d) return { ok: false, msg: fill(d.msg) };
    const err = explainError(r);
    if (err) return { ok: false, msg: err };
    if (reason) return { ok: false, msg: reason };
    if (!c.state && r.status !== 0 && !r.stdout.trim()) return { ok: false, msg: `The command found or printed nothing (exit status ${r.status}). If you searched for text, check the spelling and the letter case.` };
    if (!c.state && !r.stdout.trim()) return { ok: false, msg: 'Your command ran without errors but printed nothing. This task needs output on the screen.' };
    return { ok: false, msg: 'Your command ran, but the result is not what the task asks for yet. Compare your output with the task, then try again.' };
  }
  window.ITS4DH = { evaluate, compare, numberOf, explainError };
  if (!document.getElementById('practical')) return;

  // ------------------------------------------------------------ Linux session
  const linuxListeners = new Set();
  let linuxState = 'booting', linuxMessage = '';
  const linux = new window.LinuxSession(C.files, (state, message) => {
    if (state !== 'running') { linuxState = state; linuxMessage = message || ''; }
    linuxListeners.forEach(fn => fn(state, message));
  });
  window.practicalLinux = linux;
  const statusText = s => ({
    booting: 'Starting Linux…', ready: 'Linux ready', running: 'Running…', failed: 'Linux could not start',
  })[s];

  // ------------------------------------------------------------ layout
  const root = document.getElementById('practical');
  root.textContent = '';
  const nav = h('nav', { class: 'chapters', 'aria-label': 'Chapters' });
  const linuxBadge = h('span', { class: 'linux-badge', 'data-state': 'booting' }, h('span', { class: 'pulse', 'aria-hidden': 'true' }), h('span', { class: 'linux-badge-text', text: statusText('booting') }));
  const sidebar = h('aside', { class: 'sidebar', id: 'sidebar' },
    h('a', { class: 'brand', href: '#/' },
      h('span', { class: 'brand-course', text: C.course }),
      h('span', { class: 'brand-title', text: C.number + ': ' + C.title })),
    h('div', { class: 'overall' }, h('div', { class: 'overall-bar' }, h('span')), h('span', { class: 'overall-text' })),
    nav,
    h('div', { class: 'side-foot' },
      linuxBadge,
      h('button', { class: 'link-button', type: 'button', onclick: restartLinux, text: 'Restart Linux with fresh files' }),
      h('button', { class: 'link-button', type: 'button', onclick: resetProgress, text: 'Reset my progress' }),
      h('a', { class: 'link-button', href: 'about/', text: 'About this practical' })));
  const menuButton = h('button', { class: 'menu-button', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'sidebar', text: 'Chapters' });
  const topbar = h('header', { class: 'topbar' }, menuButton, h('span', { class: 'topbar-title', text: C.number }));
  const main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
  root.append(topbar, sidebar, main);
  menuButton.addEventListener('click', () => {
    const open = !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  const closeNav = () => { document.body.classList.remove('nav-open'); menuButton.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { closeNav(); menuButton.focus(); } });
  main.addEventListener('click', () => { if (document.body.classList.contains('nav-open')) closeNav(); });
  linuxListeners.add(state => {
    linuxBadge.dataset.state = state;
    linuxBadge.querySelector('.linux-badge-text').textContent = statusText(state);
  });

  function renderNav(route) {
    nav.textContent = '';
    const list = h('ol', { class: 'chapter-list' });
    C.chapters.forEach((ch, i) => {
      const total = ch.steps.length + 1, count = chapterCount(ch);
      const active = route.chapter === ch;
      const item = h('li', { class: 'chapter-item' + (active ? ' active' : '') + (chapterDone(ch) ? ' done' : '') },
        h('a', { href: `#/${ch.id}/1`, 'aria-current': active ? 'true' : false },
          h('span', { class: 'chapter-num', 'aria-hidden': 'true', text: ch.optional ? '+' : String(i + 1) }),
          h('span', { class: 'chapter-name', text: ch.title }),
          h('span', { class: 'chapter-count', text: `${count}/${total}`, 'aria-label': `${count} of ${total} done` })));
      if (active) {
        const steps = h('ol', { class: 'step-list' });
        ch.steps.forEach((st, j) => steps.append(h('li', { class: progress.steps[stepKey(ch, st)] ? 'done' : '' },
          h('a', { href: `#/${ch.id}/${j + 1}`, 'aria-current': route.step === st ? 'step' : false, text: st.title }))));
        steps.append(h('li', { class: progress.quiz[ch.id] ? 'done' : '' },
          h('a', { href: `#/${ch.id}/quiz`, 'aria-current': route.quiz ? 'step' : false, text: 'Chapter quiz' })));
        item.append(steps);
      }
      list.append(item);
    });
    nav.append(list);
    const all = C.chapters.filter(c => !c.optional);
    const done = all.reduce((n, c) => n + chapterCount(c), 0), total = all.reduce((n, c) => n + c.steps.length + 1, 0);
    sidebar.querySelector('.overall-bar span').style.width = (100 * done / total) + '%';
    sidebar.querySelector('.overall-text').textContent = `${done} of ${total} tasks and quizzes done`;
  }

  // ------------------------------------------------------------ routing
  function parse() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'done') return { done: true };
    const chapter = C.chapters.find(c => c.id === parts[0]);
    if (!chapter) return {};
    if (parts[1] === 'quiz') return { chapter, quiz: true };
    const n = Math.min(Math.max(parseInt(parts[1], 10) || 1, 1), chapter.steps.length);
    return { chapter, step: chapter.steps[n - 1], index: n - 1 };
  }
  let cleanup = () => {};
  function render() {
    cleanup(); cleanup = () => {};
    const route = parse();
    renderNav(route);
    document.body.classList.remove('nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
    main.textContent = '';
    if (route.done) renderDone();
    else if (route.quiz) renderQuiz(route.chapter);
    else if (route.step) renderStep(route.chapter, route.step, route.index);
    else renderWelcome();
    if (route.step || route.quiz) { progress.last = location.hash; save(); }
    window.scrollTo(0, 0);
    main.querySelector('h1')?.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', render);

  const chapterIndex = ch => C.chapters.indexOf(ch);
  const nextHref = (ch, index) => {
    if (index + 1 < ch.steps.length) return `#/${ch.id}/${index + 2}`;
    return `#/${ch.id}/quiz`;
  };
  const afterQuizHref = ch => {
    const next = C.chapters[chapterIndex(ch) + 1];
    if (!next) return '#/done';
    if (next.optional) return '#/done';
    return `#/${next.id}/1`;
  };

  function header(ch, label) {
    const i = chapterIndex(ch);
    const core = C.chapters.filter(c => !c.optional).length;
    const where = ch.optional ? 'Optional bonus' : `Chapter ${i + 1} of ${core}: ${ch.title}`;
    const dots = h('ol', { class: 'step-dots', 'aria-label': 'Steps in this chapter' });
    ch.steps.forEach((s, j) => dots.append(h('li', { class: (progress.steps[stepKey(ch, s)] ? 'done' : '') + (label === j ? ' current' : '') },
      h('a', { href: `#/${ch.id}/${j + 1}`, 'aria-label': `Step ${j + 1}: ${s.title}` + (progress.steps[stepKey(ch, s)] ? ' (done)' : '') }))));
    dots.append(h('li', { class: 'quiz-dot' + (progress.quiz[ch.id] ? ' done' : '') + (label === 'quiz' ? ' current' : '') },
      h('a', { href: `#/${ch.id}/quiz`, 'aria-label': 'Chapter quiz' + (progress.quiz[ch.id] ? ' (done)' : '') })));
    return h('div', { class: 'step-head' }, h('p', { class: 'where', text: where }), dots);
  }

  // ------------------------------------------------------------ welcome
  function renderWelcome() {
    const resume = progress.last && progress.last !== '#/' ? progress.last : null;
    const first = `#/${C.chapters[0].id}/1`;
    const list = h('ol', { class: 'overview' });
    C.chapters.forEach((ch, i) => list.append(h('li', { class: chapterDone(ch) ? 'done' : '' },
      h('a', { href: `#/${ch.id}/1` },
        h('span', { class: 'ov-num', 'aria-hidden': 'true', text: ch.optional ? '+' : String(i + 1) }),
        h('span', { class: 'ov-text' }, h('span', { class: 'ov-title', text: ch.title }), h('span', { class: 'ov-goal', text: ch.goal })),
        h('span', { class: 'ov-min', text: ch.minutes + ' min' })))));
    const demo = h('div', { class: 'hero-terminal', 'aria-hidden': 'true' },
      h('div', { class: 'ht-line' }, h('span', { class: 'ht-prompt', text: promptFor(C.home) }), ' grep -c ERROR data/upload.log'),
      h('div', { class: 'ht-out', text: '100' }),
      h('div', { class: 'ht-line' }, h('span', { class: 'ht-prompt', text: promptFor(C.home) }), h('span', { class: 'ht-cursor' })));
    main.append(h('article', { class: 'welcome' },
      h('div', { class: 'hero' },
        h('div', { class: 'hero-text' },
          h('p', { class: 'where', text: C.course }),
          h('h1', { tabindex: '-1', text: C.title }),
          h('p', { class: 'lead', text: C.intro.lead }),
          h('div', { class: 'actions' },
            h('a', { class: 'button primary', href: resume || first, text: resume ? 'Continue where you left off' : 'Start chapter 1' }),
            resume ? h('a', { class: 'button', href: first, text: 'Start from the beginning' }) : null)),
        demo),
      h('ol', { class: 'how' }, C.intro.steps.map(([a, b]) => h('li', {}, h('strong', { text: a }), ' ', b))),
      h('p', { class: 'note', text: C.intro.note }),
      h('h2', { text: `Your ${C.minutes}-minute route` }),
      list));
  }

  // ------------------------------------------------------------ step
  function renderStep(ch, step, index) {
    const key = stepKey(ch, step);
    let attempts = 0, hintsShown = 0, busy = false;
    const art = h('article', { class: 'step' });
    art.append(header(ch, index), h('h1', { tabindex: '-1', text: step.title }));
    if (index === 0 && ch.goal) art.append(h('p', { class: 'goal', text: ch.goal }));

    art.append(h('section', { class: 'learn', 'aria-labelledby': 'learn-h' },
      h('h2', { id: 'learn-h', class: 'section-title', text: 'Learn' }),
      step.learn.map(p => h('p', {}, rich(p)))));

    const ex = step.example;
    const exBlock = h('pre', { class: 'example-code' });
    ex.cmd.split('\n').forEach(l => exBlock.append(h('span', { class: 'ex-line' }, h('span', { class: 'ex-prompt', 'aria-hidden': 'true', text: '$ ' }), l), '\n'));
    if (ex.out) exBlock.append(h('span', { class: 'ex-out', text: ex.out }));
    art.append(h('section', { class: 'example', 'aria-labelledby': 'ex-h' },
      h('h2', { id: 'ex-h', class: 'section-title', text: 'Example' }), exBlock,
      ex.note ? h('p', { class: 'ex-note' }, rich(ex.note)) : null));

    // Your turn
    const input = h('textarea', { id: 'command', class: 'command', rows: '1', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-describedby': 'task-text keys' });
    const promptLabel = h('label', { class: 'prompt', for: 'command' }, h('span', { class: 'sr-only', text: 'Command, typed at the prompt ' }), promptFor(expand(step.start || '~')));
    const log = h('div', { class: 'term-log', 'aria-live': 'polite', 'aria-label': 'Terminal output' });
    const termStatus = h('span', { class: 'term-status', 'data-state': linuxState }, h('span', { class: 'pulse', 'aria-hidden': 'true' }), h('span', { class: 'term-status-text', text: statusText(linuxState) }));
    const runButton = h('button', { class: 'button primary run', type: 'button', text: 'Run' });
    const hintButton = h('button', { class: 'button', type: 'button', text: 'Show a hint' });
    const resetButton = h('button', { class: 'button quiet', type: 'button', text: 'Reset exercise' });
    const feedback = h('div', { class: 'feedback', role: 'status' });
    const hintBox = h('div', { class: 'hints' });
    const terminal = h('div', { class: 'terminal' },
      h('div', { class: 'term-bar' }, termStatus,
        h('span', { class: 'term-start', text: `This exercise starts in ${step.start || '~'}` })),
      log,
      h('div', { class: 'term-input' }, promptLabel, input));
    art.append(h('section', { class: 'turn', 'aria-labelledby': 'turn-h' },
      h('h2', { id: 'turn-h', class: 'section-title', text: 'Your turn' }),
      h('p', { class: 'task', id: 'task-text' }, rich(step.task)),
      terminal,
      h('div', { class: 'term-actions' }, runButton, hintButton, resetButton,
        h('span', { class: 'keys', id: 'keys', text: 'Enter runs your command. Shift+Enter starts a new line.' })),
      feedback, hintBox));

    const isDone = () => !!progress.steps[key];
    const nav = h('div', { class: 'step-nav' },
      index > 0 ? h('a', { class: 'button quiet', href: `#/${ch.id}/${index}`, text: 'Previous step' }) : h('span'),
      h('a', { class: 'button next' + (isDone() ? ' primary' : ''), href: nextHref(ch, index), text: index + 1 < ch.steps.length ? 'Next step' : 'Go to the chapter quiz' }));
    art.append(nav);
    main.append(art);
    if (isDone()) showFeedback({ ok: true, msg: 'You have already solved this exercise. Feel free to try it again.', quietOk: true });

    // status line follows the VM
    const onState = (state) => {
      termStatus.dataset.state = state;
      termStatus.querySelector('.term-status-text').textContent = statusText(state) + (state === 'failed' && linuxMessage ? ': ' + linuxMessage : '');
      runButton.disabled = busy || state !== 'ready';
    };
    linuxListeners.add(onState); onState(linuxState);
    cleanup = () => linuxListeners.delete(onState);

    let current = expand(step.start || '~');
    const setPrompt = cwd => { current = cwd; promptLabel.lastChild.textContent = promptFor(cwd); };
    async function prepare() {
      const cmds = [];
      const start = step.start || '~';
      cmds.push('cd ' + (start.startsWith('~') ? '"$HOME"' + (start.length > 1 ? quote(start.slice(1)) : '') : quote(start)));
      if (step.setup) cmds.push(step.setup);
      const r = await linux.exec(cmds.join('\n') || ':');
      if (main.contains(art)) setPrompt(r.cwd);
    }
    const ready = linux.ready.then(prepare).catch(() => {});

    function autosize() { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; }
    input.addEventListener('input', autosize);
    const history = [];
    let hIndex = 0;
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); run(); }
      else if (e.key === 'ArrowUp' && !input.value.slice(0, input.selectionStart).includes('\n') && history.length) {
        e.preventDefault(); hIndex = Math.max(0, hIndex - 1); input.value = history[hIndex]; autosize();
      } else if (e.key === 'ArrowDown' && hIndex < history.length && !input.value.slice(input.selectionEnd).includes('\n')) {
        e.preventDefault(); hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] || ''; autosize();
      }
    });
    runButton.addEventListener('click', run);
    hintButton.addEventListener('click', showHint);
    resetButton.addEventListener('click', async () => {
      resetButton.disabled = true;
      try { await prepare(); log.textContent = ''; feedback.textContent = ''; feedback.className = 'feedback'; input.focus(); }
      finally { resetButton.disabled = false; }
    });

    function addToLog(cmd, r) {
      const entry = h('div', { class: 'run-entry' });
      cmd.split('\n').forEach((l, i) => entry.append(h('div', { class: 'cmd-echo' }, h('span', { class: 'ps', text: i ? '> ' : promptFor(current) + ' ' }), l)));
      const show = (text, cls) => {
        if (!text) return;
        const all = text.replace(/\n$/, '').split('\n');
        const cut = all.length > MAX_LINES;
        entry.append(h('pre', { class: cls, text: (cut ? all.slice(0, MAX_LINES) : all).join('\n') }));
        if (cut) entry.append(h('div', { class: 'cut', text: `${all.length - MAX_LINES} more lines not shown here` }));
      };
      show(r.stdout, 'out'); show(r.stderr, 'err');
      if (r.timedOut) entry.append(h('div', { class: 'err-note', text: 'Stopped after 10 seconds.' }));
      if (r.status !== 0) entry.append(h('div', { class: 'exit', text: `exit status ${r.status}` }));
      log.append(entry);
      while (log.children.length > 6) log.firstChild.remove();
      log.scrollTop = log.scrollHeight;
    }

    async function run() {
      const command = input.value.replace(/\s+$/, '');
      if (busy) return;
      if (!command.trim()) { showFeedback({ ok: false, msg: 'Type a command at the prompt first, then run it.' }); input.focus(); return; }
      busy = true; runButton.disabled = true;
      try {
        await ready;
        const r = await linux.exec(command, step.check.state || step.check.expect);
        addToLog(command, r);
        setPrompt(r.cwd);
        history.push(command); hIndex = history.length;
        input.value = ''; autosize();
        const result = evaluate(step, r, command);
        if (result.ok) { progress.steps[key] = true; save(); renderNav(parse()); nav.querySelector('.next').classList.add('primary'); }
        else attempts++;
        showFeedback(result);
      } catch (error) {
        showFeedback({ ok: false, msg: error.message + ' Your command was not checked.' });
      } finally {
        busy = false; runButton.disabled = linuxState !== 'ready';
        input.focus();
      }
    }

    function showFeedback(result) {
      feedback.textContent = '';
      feedback.className = 'feedback ' + (result.ok ? 'ok' : result.partial ? 'partial' : 'retry');
      feedback.append(h('p', { class: 'fb-title', text: result.ok ? (result.quietOk ? 'Solved' : 'Correct') : result.partial ? 'Almost' : 'Not yet' }),
        h('p', {}, rich(result.msg)));
      if (result.ok && !result.quietOk) feedback.append(h('a', { class: 'button primary', href: nextHref(ch, index), text: index + 1 < ch.steps.length ? 'Next step' : 'Go to the chapter quiz' }));
      if (!result.ok && attempts >= 2 && hintsShown < step.hints.length) feedback.append(h('p', { class: 'fb-nudge', text: 'Stuck? A hint might help.' }));
      updateHintButton();
    }
    function updateHintButton() {
      if (hintsShown < step.hints.length) { hintButton.textContent = hintsShown ? 'Show another hint' : 'Show a hint'; hintButton.hidden = false; }
      else if (attempts >= 2 && !hintBox.querySelector('.solution')) { hintButton.textContent = 'Show a possible solution'; hintButton.hidden = false; }
      else hintButton.hidden = true;
    }
    function showHint() {
      if (hintsShown < step.hints.length) {
        hintBox.append(h('p', { class: 'hint' }, h('strong', { text: `Hint ${hintsShown + 1}: ` }), rich(step.hints[hintsShown])));
        hintsShown++;
      } else {
        hintBox.append(h('div', { class: 'solution' },
          h('p', { text: 'One possible solution. Type it yourself rather than copying, and make sure you understand each part.' }),
          h('pre', { text: step.solution })));
      }
      updateHintButton();
    }
    updateHintButton();
    autosize();
  }

  // ------------------------------------------------------------ quiz
  function quizBlock(questions, { onSubmit, retryLabel = 'Try the quiz again' }) {
    const wrap = h('div', { class: 'quiz' });
    const form = h('form', { class: 'quiz-form', novalidate: true });
    const items = questions.map((q, qi) => {
      const fs = h('fieldset', { class: 'question' });
      const legend = h('legend', {}, h('span', { class: 'q-num', text: `${qi + 1}.` }), ' ', rich(q.q));
      fs.append(legend);
      if (q.review) fs.append(h('p', { class: 'q-review', text: q.review }));
      if (q.multi) fs.append(h('p', { class: 'q-multi', text: 'More than one answer can be correct.' }));
      const inputs = q.options.map((o, oi) => {
        const id = `q${qi}o${oi}-${Math.random().toString(36).slice(2, 7)}`;
        const inp = h('input', { type: q.multi ? 'checkbox' : 'radio', name: `q${qi}`, id, value: String(oi) });
        const why = h('span', { class: 'why', hidden: true });
        fs.append(h('div', { class: 'option' }, inp, h('label', { for: id }, rich(o.t)), why));
        return { inp, why, o };
      });
      const verdict = h('p', { class: 'q-verdict', hidden: true });
      fs.append(verdict);
      form.append(fs);
      return { q, fs, inputs, verdict };
    });
    const submit = h('button', { class: 'button primary', type: 'submit', text: 'Check my answers', disabled: true });
    const result = h('div', { class: 'quiz-result', role: 'status' });
    form.append(h('div', { class: 'quiz-actions' }, submit, h('span', { class: 'quiz-help', text: 'Answer every question to check your answers.' })), result);
    form.addEventListener('change', () => { submit.disabled = !items.every(it => it.inputs.some(x => x.inp.checked)); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (submit.disabled) return;
      let score = 0;
      const wrong = [];
      items.forEach(it => {
        const right = it.inputs.every(x => x.inp.checked === !!x.o.correct);
        if (right) score++; else wrong.push(it.q);
        it.fs.classList.add(right ? 'q-right' : 'q-wrong');
        it.verdict.hidden = false;
        it.verdict.textContent = right ? 'Correct.' : (it.q.multi ? 'Not quite. The correct answers are marked below.' : 'Not quite. The correct answer is marked below.');
        it.inputs.forEach(x => {
          x.inp.disabled = true;
          const row = x.inp.parentElement;
          row.classList.add(x.o.correct ? 'is-correct' : 'is-wrong');
          if (x.inp.checked) row.classList.add('chosen');
          x.why.hidden = false;
          x.why.textContent = (x.o.correct ? 'Correct: ' : 'Incorrect: ') + x.o.why;
        });
      });
      submit.hidden = true;
      form.querySelector('.quiz-help').hidden = true;
      result.textContent = '';
      result.append(h('p', { class: 'score', text: `${score} of ${items.length} correct` }));
      const again = h('button', { class: 'button', type: 'button', text: retryLabel });
      again.addEventListener('click', () => { const fresh = quizBlock(questions, { onSubmit, retryLabel }); wrap.replaceWith(fresh); fresh.querySelector('input')?.focus(); });
      result.append(h('div', { class: 'quiz-actions' }, ...(onSubmit(score, items.length, wrong) || []), again));
      result.focus?.();
    });
    wrap.append(form);
    return wrap;
  }
  const qKey = (ch, i) => ch.id + '#' + i;
  function recordAnswers(ch, questions, wrong) {
    questions.forEach((q, i) => {
      const k = q.key || qKey(ch, i);
      if (wrong.includes(q)) progress.missed[k] = true; else delete progress.missed[k];
    });
  }
  function renderQuiz(ch) {
    const art = h('article', { class: 'step quiz-page' });
    art.append(header(ch, 'quiz'), h('h1', { tabindex: '-1', text: 'Chapter quiz' }),
      h('p', { class: 'goal', text: `Check what you have learned in “${ch.title}”. Choose your answers, then check them. You can retry as often as you like.` }));
    const next = afterQuizHref(ch);
    const nextLabel = next === '#/done' ? 'Finish the practical' : 'Continue with the next chapter';
    art.append(quizBlock(ch.quiz, {
      onSubmit: (score, total, wrong) => {
        progress.quiz[ch.id] = { score, total, best: Math.max(score, progress.quiz[ch.id]?.best || 0) };
        recordAnswers(ch, ch.quiz, wrong);
        save(); renderNav(parse());
        return [h('a', { class: 'button primary', href: next, text: nextLabel })];
      },
    }));
    main.append(art);
  }

  // ------------------------------------------------------------ done
  function renderDone() {
    const core = C.chapters.filter(c => !c.optional);
    const open = core.filter(c => !chapterDone(c));
    const art = h('article', { class: 'step done-page' });
    art.append(h('h1', { tabindex: '-1', text: open.length ? 'Almost there' : 'Practical complete' }),
      h('p', { class: 'lead', text: open.length
        ? `You still have open tasks in: ${open.map(c => c.title).join(', ')}. Everything else is done.`
        : 'You investigated the upload incident with nothing but a terminal. These are the commands you used today.' }));
    const table = h('table', { class: 'summary' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: 'Command' }), h('th', { scope: 'col', text: 'What it does' }))),
      h('tbody', {}, C.summary.map(([c, d]) => h('tr', {}, h('td', {}, h('code', { text: c })), h('td', { text: d })))));
    art.append(table);

    // Spaced repetition: missed questions first, topped up with questions from all chapters.
    const pool = [];
    C.chapters.forEach(ch => ch.quiz.forEach((q, i) => pool.push(Object.assign({}, q, { key: qKey(ch, i), repeat: !!q.review, review: 'From “' + ch.title + '”' }))));
    const missed = pool.filter(q => progress.missed[q.key]);
    const rest = pool.filter(q => !progress.missed[q.key] && !q.repeat);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const picked = missed.concat(rest).slice(0, 5);
    art.append(h('h2', { text: 'Mixed review' }),
      h('p', { text: missed.length ? `${missed.length} question${missed.length > 1 ? 's' : ''} you missed earlier come first. Come back in a few days and try again: spaced practice makes it stick.` : 'Five questions from across the practical. Come back in a few days and try again: spaced practice makes it stick.' }),
      quizBlock(picked, {
        retryLabel: 'Try these questions again',
        onSubmit: (score, total, wrong) => {
          picked.forEach(q => { if (wrong.includes(q)) progress.missed[q.key] = true; else delete progress.missed[q.key]; });
          save(); return [];
        },
      }));
    const bonus = C.chapters.find(c => c.optional);
    if (bonus) art.append(h('h2', { text: 'Want more?' }), h('p', {}, 'Try the optional bonus chapter ', h('a', { href: `#/${bonus.id}/1`, text: bonus.title }), ' for small statistics with sort, uniq and cut.'));
    main.append(art);
  }

  // ------------------------------------------------------------ global actions
  async function restartLinux() {
    if (!confirm('Restart Linux with fresh files? Files and folders you created will be removed. Your course progress stays.')) return;
    try { await linux.reset(); } catch (_) { linux.restart(); }
    render();
  }
  function resetProgress() {
    if (!confirm('Reset your progress? Solved exercises and quiz results in this browser will be cleared.')) return;
    progress = { steps: {}, quiz: {}, missed: {} }; save();
    location.hash = '#/'; render();
  }

  render();
})();
