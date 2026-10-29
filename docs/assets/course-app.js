/*
 * Interactive practical engine: navigation, real-Linux exercises, quizzes, progress.
 *
 * One engine for every practical of the lab:
 *  - window.ITS4DH_LAB (practicals.js) lists all practical sessions (level 1 navigation).
 *  - window.PRACTICAL (practical-NN.js) holds the chapters of one session (level 2).
 * The home page has no PRACTICAL and shows the session overview instead.
 *
 * Step modes:
 *  - (default) shell: a command runs in the browser Linux (shell-worker.js), and the
 *    result is checked against Linux's own answer (check.expect / check.state).
 *  - report: work that happens outside the page (for example in the Codespaces terminal).
 *    The student enters what their program printed; step.verify(values, ctx) judges it.
 *  - interleave: a deterministic "you are the scheduler" walk-through of two threads that
 *    share a counter; step.verify(state) judges the final state.
 * All command output shown for shell steps comes from the Linux VM.
 */
(() => {
  'use strict';
  const C = window.PRACTICAL;
  const LAB = window.ITS4DH_LAB || { course: C ? C.course : '', sessions: [] };
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
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  }
  const SVG = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
    for (const kid of kids.flat(Infinity)) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
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
  const home = C ? C.home : '/home/student';
  const tildify = p => (p === home ? '~' : p.startsWith(home + '/') ? '~' + p.slice(home.length) : p);
  const expand = p => (p === '~' ? home : p.startsWith('~/') ? home + p.slice(1) : p);
  const promptFor = cwd => `${C.user}@${C.host}:${tildify(cwd)}$`;
  const quote = s => "'" + s.replace(/'/g, "'\\''") + "'";
  const storeKey = id => id + '-progress-v2';

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
      if (k === 'probe') return v.test(r.probe.trim());
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
    if (/can't kill pid \d+: No such process/.test(e)) return 'There is no process with that number (any more). PIDs change every time a program starts, so look up the current PID with ps or pidof first.';
    if (/can't kill pid \d+: Operation not permitted/.test(e)) return 'Linux refused: that process belongs to another user (root). You may only stop your own processes, which is exactly how it should be.';
    if (/Permission denied/.test(e)) return 'Linux refused the change: Permission denied. The data folder is protected evidence, and system folders belong to the administrator (root).';
    if (/can't cd to/.test(e)) return `That folder does not exist from where you are (${tildify(r.cwd)}). Check the spelling, or look around with ls.`;
    if (/No such file or directory/.test(e)) return `A file or folder in your command does not exist from where you are (${tildify(r.cwd)}). Check the spelling, or look around with ls.`;
    if (/Is a directory/.test(e)) return 'That name is a folder, not a file.';
    if (/invalid option|unrecognized option|Usage:|bad -o argument/.test(e)) return 'One of the options is not valid for this command. Check the dash and the letter.';
    if (/File size limit exceeded/.test(e)) return 'Your command produced a huge amount of output and was stopped.';
    return null;
  }
  function evaluate(step, r, command) {
    const fill = s => s.replace('{cwd}', tildify(r.cwd));
    if (r.restarted) return { ok: false, msg: 'Your command did not finish and Linux had to be restarted with fresh files. Click Reset exercise, then try a different command.' };
    if (r.timedOut) return { ok: false, msg: step.timeoutMsg || 'Your command was still running after 10 seconds, so it was stopped. A command that waits for input or never ends cannot finish here.' };
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

  // Result codes printed by the Codespaces checkers (labs/*/pNN.py), e.g.
  // "P02-THREADS-2.01-QK7M". The last block is a short checksum over the rest, so
  // a typo or an invented code is noticed. This is a plausibility check for
  // self-assessment, not a security feature.
  const SIG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function signature(body) {
    let x = 0x811c9dc5;
    const bytes = new TextEncoder().encode(body + '|its4dh');
    for (const b of bytes) { x ^= b; x = Math.imul(x, 0x01000193) >>> 0; }
    let out = '';
    for (let i = 0; i < 4; i++) { out += SIG_ALPHABET[x & 31]; x >>>= 5; }
    return out;
  }
  function parseResult(text, prefix, task) {
    const re = new RegExp(`\\b(${prefix})-([A-Z]+)((?:-\\d+(?:\\.\\d+)?)*)-([A-Z2-9]{4})\\b`, 'g');
    let m, found = null, other = null;
    while ((m = re.exec(String(text || '').toUpperCase()))) {
      const body = m[0].slice(0, -5);
      const entry = { task: m[2], values: m[3].split('-').filter(Boolean).map(Number), valid: signature(body) === m[4] };
      if (m[2] === task.toUpperCase().replace(/-/g, '')) found = entry; else other = entry;
    }
    if (found) return found.valid ? found : { error: 'checksum' };
    if (other) return { error: 'other-task', task: other.task };
    return { error: 'missing' };
  }
  const parseNumber = v => {
    const t = String(v == null ? '' : v).trim().replace(',', '.').replace(/\s*(s|sec|seconds|x|×)$/i, '');
    return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
  };

  // Scheduler walk-through: two threads, one shared counter, optional lock.
  const sched = {
    init(cfg) {
      return {
        counter: cfg.start, lockedBy: null, waits: 0, log: [], lock: !!cfg.lock,
        program: cfg.lock ? ['lock', 'read', 'add', 'write', 'unlock'] : ['read', 'add', 'write'],
        threads: cfg.threads.map(name => ({ name, pc: 0, local: null })),
      };
    },
    done: st => st.threads.every(t => t.pc >= st.program.length),
    step(st, i) {
      const n = JSON.parse(JSON.stringify(st));
      const t = n.threads[i];
      const op = n.program[t.pc];
      if (op == null) return n;
      if (op === 'lock') {
        if (n.lockedBy !== null && n.lockedBy !== i) {
          n.waits++;
          n.log.push({ thread: t.name, op: 'wait', text: `${t.name} wants the lock, but ${n.threads[n.lockedBy].name} holds it. ${t.name} has to wait.` });
          return n;
        }
        n.lockedBy = i; n.log.push({ thread: t.name, op, text: `${t.name} takes the lock.` });
      } else if (op === 'read') { t.local = n.counter; n.log.push({ thread: t.name, op, text: `${t.name} reads the counter: ${t.local}` }); }
      else if (op === 'add') { t.local += 1; n.log.push({ thread: t.name, op, text: `${t.name} adds 1 to its own copy: ${t.local}` }); }
      else if (op === 'write') { n.counter = t.local; n.log.push({ thread: t.name, op, text: `${t.name} writes ${t.local} into the counter.` }); }
      else if (op === 'unlock') { n.lockedBy = null; n.log.push({ thread: t.name, op, text: `${t.name} releases the lock.` }); }
      t.pc++;
      return n;
    },
    run(cfg, order) { let st = sched.init(cfg); for (const i of order) st = sched.step(st, i); return st; },
  };
  const OP_LABEL = { lock: 'take the lock', read: 'read the counter', add: 'add 1 to my copy', write: 'write my copy back', unlock: 'release the lock' };

  window.ITS4DH = { evaluate, compare, numberOf, explainError, signature, parseResult, parseNumber, sched };
  const lab = document.getElementById('lab');
  if (!document.getElementById('practical') && !lab) return;
  const ROOT = document.body.dataset.root || './';
  const sessionHref = sess => ROOT + sess.slug + '/';
  const readProgress = id => { try { return JSON.parse(localStorage.getItem(storeKey(id))) || null; } catch (_) { return null; } };

  // ------------------------------------------------------------ level 1: the lab overview
  if (!C) {
    // Links from before the lab had several sessions pointed at Practical 01 (#/chapter/step).
    const first = LAB.sessions.find(x => x.status === 'ready');
    const legacy = () => { if (/^#\/./.test(location.hash) && first) { location.replace(sessionHref(first) + location.hash); return true; } return false; };
    window.addEventListener('hashchange', legacy);
    if (!legacy()) renderLab();
    return;
  }
  function sessionState(sess) {
    if (sess.status !== 'ready') return { label: 'Coming soon', cls: 'soon' };
    const p = readProgress(sess.id);
    if (!p || !p.summary) return { label: sess.minutes + ' min', cls: 'new' };
    const { done, total } = p.summary;
    if (done >= total) return { label: 'Completed', cls: 'complete' };
    return { label: done ? `${done} of ${total} done` : sess.minutes + ' min', cls: done ? 'started' : 'new', frac: done / total };
  }
  function renderLab() {
    lab.textContent = '';
    const groups = [];
    for (const sess of LAB.sessions) {
      let g = groups.find(x => x.name === sess.pillar);
      if (!g) groups.push(g = { name: sess.pillar, items: [] });
      g.items.push(sess);
    }
    const art = h('article', { class: 'lab-home' },
      h('p', { class: 'where', text: LAB.course }),
      h('h1', { tabindex: '-1', text: LAB.title }),
      h('p', { class: 'lead', text: LAB.lead }),
      groups.map(g => [
        g.name ? h('h2', { class: 'pillar', text: g.name }) : null,
        h('ol', { class: 'sessions' }, g.items.map(sess => {
          const st = sessionState(sess);
          const body = [
            h('span', { class: 'sess-num', text: sess.number }),
            h('span', { class: 'sess-title', text: sess.title }),
            h('span', { class: 'sess-sub', text: sess.subtitle }),
            h('span', { class: 'sess-state ' + st.cls, text: st.label }),
            st.frac != null ? h('span', { class: 'sess-bar', 'aria-hidden': 'true' }, h('span', { style: `width:${Math.round(st.frac * 100)}%` })) : null,
          ];
          return h('li', { class: 'session ' + st.cls },
            sess.status === 'ready' ? h('a', { href: sessionHref(sess) }, body) : h('div', { class: 'session-soon', 'aria-disabled': 'true' }, body));
        })),
      ]),
      LAB.note ? h('p', { class: 'note', text: LAB.note }) : null,
      h('p', { class: 'note' }, h('a', { href: ROOT + 'about/', text: 'About the practical lab' })));
    lab.append(art);
  }

  // ------------------------------------------------------------ progress
  const STORE = storeKey(C.id);
  let progress = { steps: {}, quiz: {}, missed: {}, values: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved && saved.steps && saved.quiz) progress = Object.assign(progress, saved);
  } catch (_) { /* storage unavailable: progress lives for this visit only */ }
  const stepKey = (ch, st) => ch.id + '/' + st.id;
  const chapterDone = ch => ch.steps.every(s => progress.steps[stepKey(ch, s)]) && !!progress.quiz[ch.id];
  const chapterCount = ch => ch.steps.filter(s => progress.steps[stepKey(ch, s)]).length + (progress.quiz[ch.id] ? 1 : 0);
  const coreChapters = () => C.chapters.filter(c => !c.optional);
  const totals = () => {
    const all = coreChapters();
    return { done: all.reduce((n, c) => n + chapterCount(c), 0), total: all.reduce((n, c) => n + c.steps.length + 1, 0) };
  };
  const save = () => { progress.summary = totals(); try { localStorage.setItem(STORE, JSON.stringify(progress)); } catch (_) {} };
  const ctx = { saved: id => progress.values[id] || null, parse: parseResult, number: parseNumber };

  // ------------------------------------------------------------ Linux session
  const needsLinux = C.chapters.some(ch => ch.steps.some(st => !st.mode));
  const linuxListeners = new Set();
  let linuxState = needsLinux ? 'booting' : 'off', linuxMessage = '';
  const linux = needsLinux ? new window.LinuxSession(C.files, (state, message) => {
    if (state !== 'running') { linuxState = state; linuxMessage = message || ''; }
    linuxListeners.forEach(fn => fn(state, message));
  }, { prelude: C.prelude }) : null;
  window.practicalLinux = linux;
  const statusText = s => ({
    booting: 'Starting Linux…', ready: 'Linux ready', running: 'Running…', failed: 'Linux could not start',
  })[s];

  // ------------------------------------------------------------ layout
  const root = document.getElementById('practical');
  root.textContent = '';
  const nav = h('nav', { class: 'chapters', 'aria-label': 'Chapters' });
  const linuxBadge = h('span', { class: 'linux-badge', 'data-state': linuxState }, h('span', { class: 'pulse', 'aria-hidden': 'true' }), h('span', { class: 'linux-badge-text', text: statusText(linuxState) }));
  const current = LAB.sessions.find(x => x.id === C.id);
  const switcher = LAB.sessions.length ? h('details', { class: 'switcher' },
    h('summary', {}, h('span', { class: 'switcher-label', text: 'Practical sessions' })),
    h('ol', { class: 'switcher-list' }, LAB.sessions.map(sess => h('li', { class: sess.id === C.id ? 'current' : sess.status },
      sess.status === 'ready'
        ? h('a', { href: sess.id === C.id ? '#/' : sessionHref(sess), 'aria-current': sess.id === C.id ? 'page' : false },
          h('span', { class: 'sw-num', text: sess.number.replace('Practical ', '') }), h('span', { class: 'sw-title', text: sess.title }))
        : h('span', { class: 'sw-soon' }, h('span', { class: 'sw-num', text: sess.number.replace('Practical ', '') }), h('span', { class: 'sw-title', text: sess.title }), h('span', { class: 'sw-tag', text: 'Soon' }))))),
    h('a', { class: 'switcher-all', href: ROOT, text: 'All practicals' })) : null;
  const sidebar = h('aside', { class: 'sidebar', id: 'sidebar' },
    switcher,
    h('a', { class: 'brand', href: '#/' },
      h('span', { class: 'brand-course', text: C.course }),
      h('span', { class: 'brand-title', text: C.number + ': ' + (current && current.navTitle || C.title) })),
    h('div', { class: 'overall' }, h('div', { class: 'overall-bar' }, h('span')), h('span', { class: 'overall-text' })),
    nav,
    h('div', { class: 'side-foot' },
      needsLinux ? linuxBadge : null,
      needsLinux ? h('button', { class: 'link-button', type: 'button', onclick: restartLinux, text: 'Restart Linux with fresh files' }) : null,
      h('button', { class: 'link-button', type: 'button', onclick: resetProgress, text: 'Reset my progress' }),
      h('a', { class: 'link-button', href: ROOT + 'about/', text: 'About this practical' })));
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

  const placeTag = st => (st.mode === 'report' && st.where === 'codespace' ? 'Codespaces' : null);
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
    const { done, total } = totals();
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
    const core = coreChapters().length;
    const where = ch.optional ? 'Optional bonus' : `Chapter ${i + 1} of ${core}: ${ch.title}`;
    const dots = h('ol', { class: 'step-dots', 'aria-label': 'Steps in this chapter' });
    ch.steps.forEach((s, j) => dots.append(h('li', { class: (progress.steps[stepKey(ch, s)] ? 'done' : '') + (label === j ? ' current' : '') },
      h('a', { href: `#/${ch.id}/${j + 1}`, 'aria-label': `Step ${j + 1}: ${s.title}` + (progress.steps[stepKey(ch, s)] ? ' (done)' : '') }))));
    dots.append(h('li', { class: 'quiz-dot' + (progress.quiz[ch.id] ? ' done' : '') + (label === 'quiz' ? ' current' : '') },
      h('a', { href: `#/${ch.id}/quiz`, 'aria-label': 'Chapter quiz' + (progress.quiz[ch.id] ? ' (done)' : '') })));
    return h('div', { class: 'step-head' }, h('p', { class: 'where', text: where }), dots);
  }

  // A dark box with commands to type in the Codespaces terminal, each with a copy button.
  function commandBox(title, cmds, link) {
    const box = h('div', { class: 'cs-box' },
      h('div', { class: 'cs-bar' }, h('span', { class: 'cs-title', text: title }),
        link ? h('a', { class: 'cs-link', href: link.href, target: '_blank', rel: 'noopener', text: link.text }) : null));
    const list = h('ol', { class: 'cs-cmds' });
    for (const cmd of cmds) {
      const copy = h('button', { class: 'cs-copy', type: 'button', text: 'Copy', 'aria-label': 'Copy command: ' + cmd });
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(cmd); copy.textContent = 'Copied'; } catch (_) { copy.textContent = 'Select and copy'; }
        setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
      });
      list.append(h('li', {}, h('code', { class: 'cs-cmd' }, h('span', { class: 'cs-ps', 'aria-hidden': 'true', text: '$ ' }), cmd), copy));
    }
    box.append(list);
    return box;
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
    const demoCmd = C.intro.demo ? C.intro.demo.cmd : 'grep -c ERROR data/upload.log';
    const demoOut = C.intro.demo ? C.intro.demo.out : '100';
    const demo = h('div', { class: 'hero-terminal', 'aria-hidden': 'true' },
      h('div', { class: 'ht-line' }, h('span', { class: 'ht-prompt', text: promptFor(C.home) }), ' ' + demoCmd),
      h('div', { class: 'ht-out' + (demoOut.length > 12 ? ' small' : ''), text: demoOut }),
      h('div', { class: 'ht-line' }, h('span', { class: 'ht-prompt', text: promptFor(C.home) }), h('span', { class: 'ht-cursor' })));
    const before = C.intro.before;
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
      before ? h('section', { class: 'before' },
        h('h2', { text: before.title }),
        before.text.map(p => h('p', {}, rich(p))),
        before.commands ? commandBox(before.where || 'In your Codespaces terminal', before.commands, before.link) : null) : null,
      h('h2', { text: `Your ${C.minutes}-minute route` }),
      list));
  }

  // ------------------------------------------------------------ step (shared frame)
  function renderStep(ch, step, index) {
    const key = stepKey(ch, step);
    const art = h('article', { class: 'step' });
    const tag = placeTag(step);
    art.append(header(ch, index), h('h1', { tabindex: '-1', text: step.title }));
    if (tag) art.querySelector('.step-head .where').append(h('span', { class: 'place-tag', text: tag }));
    if (index === 0 && ch.goal) art.append(h('p', { class: 'goal', text: ch.goal }));

    art.append(h('section', { class: 'learn', 'aria-labelledby': 'learn-h' },
      h('h2', { id: 'learn-h', class: 'section-title', text: 'Learn' }),
      step.learn.map(p => h('p', {}, rich(p)))));

    const ex = step.example;
    const exParts = [];
    if (ex.code) {
      exParts.push(h('div', { class: 'code-file' },
        ex.file ? h('div', { class: 'code-name', text: ex.file }) : null,
        h('pre', { class: 'code-block' }, h('code', { text: ex.code }))));
    }
    if (ex.cmd) {
      const exBlock = h('pre', { class: 'example-code' });
      ex.cmd.split('\n').forEach(l => exBlock.append(h('span', { class: 'ex-line' }, h('span', { class: 'ex-prompt', 'aria-hidden': 'true', text: '$ ' }), l), '\n'));
      if (ex.out) exBlock.append(h('span', { class: 'ex-out', text: ex.out }));
      exParts.push(exBlock);
    } else if (ex.out) exParts.push(h('pre', { class: 'example-code' }, h('span', { class: 'ex-out', text: ex.out })));
    art.append(h('section', { class: 'example', 'aria-labelledby': 'ex-h' },
      h('h2', { id: 'ex-h', class: 'section-title', text: 'Example' }), exParts,
      ex.note ? h('p', { class: 'ex-note' }, rich(ex.note)) : null));

    const isDone = () => !!progress.steps[key];
    const stepNav = h('div', { class: 'step-nav' },
      index > 0 ? h('a', { class: 'button quiet', href: `#/${ch.id}/${index}`, text: 'Previous step' }) : h('span'),
      h('a', { class: 'button next' + (isDone() ? ' primary' : ''), href: nextHref(ch, index), text: index + 1 < ch.steps.length ? 'Next step' : 'Go to the chapter quiz' }));

    // feedback, hints and solution behave the same in every mode
    const fb = { attempts: 0, hintsShown: 0 };
    const feedback = h('div', { class: 'feedback', role: 'status' });
    const hintBox = h('div', { class: 'hints' });
    const hintButton = h('button', { class: 'button', type: 'button', text: 'Show a hint' });
    const chartBox = h('div', { class: 'chart-box' });
    function showFeedback(result) {
      feedback.textContent = '';
      feedback.className = 'feedback ' + (result.ok ? 'ok' : result.partial ? 'partial' : 'retry');
      feedback.append(h('p', { class: 'fb-title', text: result.ok ? (result.quietOk ? 'Solved' : 'Correct') : result.partial ? 'Almost' : 'Not yet' }),
        ...(Array.isArray(result.msg) ? result.msg : [result.msg]).map(m => h('p', {}, rich(m))));
      if (result.ok && !result.quietOk) feedback.append(h('a', { class: 'button primary', href: nextHref(ch, index), text: index + 1 < ch.steps.length ? 'Next step' : 'Go to the chapter quiz' }));
      if (!result.ok && fb.attempts >= 2 && fb.hintsShown < step.hints.length) feedback.append(h('p', { class: 'fb-nudge', text: 'Stuck? A hint might help.' }));
      updateHintButton();
    }
    function updateHintButton() {
      if (fb.hintsShown < step.hints.length) { hintButton.textContent = fb.hintsShown ? 'Show another hint' : 'Show a hint'; hintButton.hidden = false; }
      else if (fb.attempts >= 2 && step.solution && !hintBox.querySelector('.solution')) { hintButton.textContent = 'Show a possible solution'; hintButton.hidden = false; }
      else hintButton.hidden = true;
    }
    hintButton.addEventListener('click', () => {
      if (fb.hintsShown < step.hints.length) {
        hintBox.append(h('p', { class: 'hint' }, h('strong', { text: `Hint ${fb.hintsShown + 1}: ` }), rich(step.hints[fb.hintsShown])));
        fb.hintsShown++;
      } else {
        hintBox.append(h('div', { class: 'solution' },
          h('p', { text: step.solutionNote || 'One possible solution. Type it yourself rather than copying, and make sure you understand each part.' }),
          h('pre', { text: step.solution })));
      }
      updateHintButton();
    });
    function solved(result, saved) {
      progress.steps[key] = true;
      if (saved !== undefined) progress.values[key] = saved;
      save(); renderNav(parse());
      stepNav.querySelector('.next').classList.add('primary');
      showChart();
      showFeedback(result);
    }
    function showChart() {
      chartBox.textContent = '';
      const saved = progress.values[key];
      if (!step.chart || !progress.steps[key]) return;
      const spec = step.chart(saved, ctx);
      if (spec) chartBox.append(drawChart(spec));
    }
    const kit = { key, feedback, hintBox, hintButton, chartBox, fb, showFeedback, updateHintButton, solved, showChart, isDone };

    if (step.mode === 'report') renderReport(art, step, kit);
    else if (step.mode === 'interleave') renderInterleave(art, step, kit);
    else renderShell(art, ch, step, kit);
    art.append(stepNav);
    main.append(art);
    if (isDone()) { showFeedback({ ok: true, msg: 'You have already solved this exercise. Feel free to try it again.', quietOk: true }); showChart(); }
    updateHintButton();
  }

  // ------------------------------------------------------------ shell exercise (browser Linux)
  function renderShell(art, ch, step, kit) {
    const { feedback, hintBox, hintButton, fb, showFeedback } = kit;
    let busy = false;
    const input = h('textarea', { id: 'command', class: 'command', rows: '1', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', 'aria-describedby': 'task-text keys' });
    const promptLabel = h('label', { class: 'prompt', for: 'command' }, h('span', { class: 'sr-only', text: 'Command, typed at the prompt ' }), promptFor(expand(step.start || '~')));
    const log = h('div', { class: 'term-log', 'aria-live': 'polite', 'aria-label': 'Terminal output' });
    const termStatus = h('span', { class: 'term-status', 'data-state': linuxState }, h('span', { class: 'pulse', 'aria-hidden': 'true' }), h('span', { class: 'term-status-text', text: statusText(linuxState) }));
    const runButton = h('button', { class: 'button primary run', type: 'button', text: 'Run' });
    const resetButton = h('button', { class: 'button quiet', type: 'button', text: 'Reset exercise' });
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

    // status line follows the VM
    const onState = (state) => {
      termStatus.dataset.state = state;
      termStatus.querySelector('.term-status-text').textContent = statusText(state) + (state === 'failed' && linuxMessage ? ': ' + linuxMessage : '');
      runButton.disabled = busy || state !== 'ready';
    };
    linuxListeners.add(onState); onState(linuxState);
    cleanup = () => linuxListeners.delete(onState);

    let currentDir = expand(step.start || '~');
    const setPrompt = cwd => { currentDir = cwd; promptLabel.lastChild.textContent = promptFor(cwd); };
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
    resetButton.addEventListener('click', async () => {
      resetButton.disabled = true;
      try { await prepare(); log.textContent = ''; feedback.textContent = ''; feedback.className = 'feedback'; input.focus(); }
      finally { resetButton.disabled = false; }
    });

    function addToLog(cmd, r) {
      const entry = h('div', { class: 'run-entry' });
      cmd.split('\n').forEach((l, i) => entry.append(h('div', { class: 'cmd-echo' }, h('span', { class: 'ps', text: i ? '> ' : promptFor(currentDir) + ' ' }), l)));
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
        if (result.ok) kit.solved(result);
        else { fb.attempts++; showFeedback(result); }
      } catch (error) {
        showFeedback({ ok: false, msg: error.message + ' Your command was not checked.' });
      } finally {
        busy = false; runButton.disabled = linuxState !== 'ready';
        input.focus();
      }
    }
    autosize();
  }

  // ------------------------------------------------------------ report exercise (work outside the page)
  function renderReport(art, step, kit) {
    const { feedback, hintBox, hintButton, chartBox, fb, showFeedback } = kit;
    const uid = Math.random().toString(36).slice(2, 7);
    const form = h('form', { class: 'report', novalidate: true });
    const readers = {};
    for (const f of step.fields) {
      const id = `f-${f.id}-${uid}`;
      const help = f.help ? h('span', { class: 'field-help', id: id + '-help' }, rich(f.help)) : null;
      let control;
      if (f.type === 'paste') {
        control = h('textarea', { id, class: 'paste', rows: f.rows || '3', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', placeholder: f.placeholder || '', 'aria-describedby': help ? id + '-help' : false });
        readers[f.id] = () => control.value;
        form.append(h('div', { class: 'field' }, h('label', { for: id }, rich(f.label)), help, control));
      } else if (f.type === 'number' || f.type === 'text') {
        control = h('input', { id, type: 'text', inputmode: f.type === 'number' ? 'decimal' : false, class: 'short', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': help ? id + '-help' : false });
        readers[f.id] = () => control.value;
        form.append(h('div', { class: 'field inline' }, h('label', { for: id }, rich(f.label)), h('span', { class: 'with-unit' }, control, f.unit ? h('span', { class: 'unit', text: f.unit }) : null), help));
      } else if (f.type === 'select') {
        control = h('select', { id }, h('option', { value: '', text: 'Choose…' }), f.options.map(o => h('option', { value: o.v, text: o.t })));
        readers[f.id] = () => control.value;
        form.append(h('div', { class: 'field inline' }, h('label', { for: id }, rich(f.label)), control, help));
      } else if (f.type === 'choice' || f.type === 'lines') {
        const fs = h('fieldset', { class: 'field choice' + (f.type === 'lines' ? ' code-lines' : '') }, h('legend', {}, rich(f.label)), help);
        const inputs = f.options.map((o, oi) => {
          const oid = `${id}-${oi}`;
          const inp = h('input', { type: f.multi || f.type === 'lines' ? 'checkbox' : 'radio', name: id, id: oid, value: o.v });
          fs.append(h('div', { class: 'option' }, inp, f.type === 'lines'
            ? h('label', { for: oid }, h('span', { class: 'ln', text: o.v }), h('code', { text: o.t }))
            : h('label', { for: oid }, rich(o.t))));
          return inp;
        });
        readers[f.id] = () => (f.multi || f.type === 'lines' ? inputs.filter(x => x.checked).map(x => x.value) : (inputs.find(x => x.checked) || {}).value || '');
        form.append(fs);
      }
    }
    const checkButton = h('button', { class: 'button primary run', type: 'submit', text: step.checkLabel || 'Check my answer' });
    const clearButton = h('button', { class: 'button quiet', type: 'button', text: 'Clear my answers' });
    form.append(h('div', { class: 'term-actions' }, checkButton, hintButton, clearButton));
    art.append(h('section', { class: 'turn', 'aria-labelledby': 'turn-h' },
      h('h2', { id: 'turn-h', class: 'section-title', text: 'Your turn' }),
      h('p', { class: 'task', id: 'task-text' }, rich(step.task)),
      step.commands ? commandBox(step.where === 'codespace' ? 'In your Codespaces terminal' : 'Commands', step.commands, step.where === 'codespace' && C.codespace ? C.codespace : null) : null,
      form, feedback, hintBox, chartBox));
    clearButton.addEventListener('click', () => { form.reset(); feedback.textContent = ''; feedback.className = 'feedback'; });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const values = Object.fromEntries(Object.entries(readers).map(([k, read]) => [k, read()]));
      const empty = step.fields.find(f => !f.optional && (Array.isArray(values[f.id]) ? false : !String(values[f.id]).trim()));
      if (empty) { showFeedback({ ok: false, msg: empty.type === 'paste' ? 'Paste what your terminal printed into the box first, then check.' : 'Fill in every answer first, then check.' }); return; }
      let result;
      try { result = step.verify(values, ctx) || { ok: false, msg: 'This answer could not be checked.' }; }
      catch (error) { result = { ok: false, msg: 'This answer could not be checked: ' + error.message }; }
      if (result.ok) kit.solved(result, result.save);
      else { fb.attempts++; showFeedback(result); }
    });
  }

  // ------------------------------------------------------------ scheduler walk-through
  function renderInterleave(art, step, kit) {
    const { feedback, hintButton, hintBox, fb, showFeedback } = kit;
    const cfg = step.scheduler;
    let st = sched.init(cfg);
    const board = h('div', { class: 'sched', 'aria-live': 'polite' });
    const restart = h('button', { class: 'button quiet', type: 'button', text: 'Start over' });
    art.append(h('section', { class: 'turn', 'aria-labelledby': 'turn-h' },
      h('h2', { id: 'turn-h', class: 'section-title', text: 'Your turn' }),
      h('p', { class: 'task', id: 'task-text' }, rich(step.task)),
      board,
      h('div', { class: 'term-actions' }, hintButton, restart,
        h('span', { class: 'keys', text: 'You decide which thread runs next. Every click executes one step.' })),
      feedback, hintBox));
    restart.addEventListener('click', () => { st = sched.init(cfg); feedback.textContent = ''; feedback.className = 'feedback'; draw(); board.querySelector('button')?.focus(); });
    function draw(focusIndex) {
      board.textContent = '';
      const shared = h('div', { class: 'sched-shared' },
        h('span', { class: 'sched-label', text: cfg.sharedLabel || 'Shared counter' }),
        h('span', { class: 'sched-value', text: String(st.counter) }),
        st.lock ? h('span', { class: 'sched-lock' + (st.lockedBy !== null ? ' held' : ''), text: st.lockedBy !== null ? `Lock held by ${st.threads[st.lockedBy].name}` : 'Lock is free' }) : null);
      const cols = h('div', { class: 'sched-threads' });
      st.threads.forEach((t, i) => {
        const finished = t.pc >= st.program.length;
        const btn = h('button', { class: 'button sched-run', type: 'button', disabled: finished, text: finished ? `${t.name} is finished` : `Run next step of ${t.name}` });
        btn.addEventListener('click', () => {
          st = sched.step(st, i);
          draw(i);
          if (sched.done(st)) {
            const result = step.verify(st, ctx);
            if (result.ok) kit.solved(result, { counter: st.counter, waits: st.waits });
            else { fb.attempts++; showFeedback(result); }
          }
        });
        cols.append(h('div', { class: 'sched-thread' },
          h('div', { class: 'sched-head' }, h('strong', { text: t.name }), h('span', { class: 'sched-local', text: 'my copy: ' + (t.local == null ? '–' : t.local) })),
          h('ol', { class: 'sched-prog' }, st.program.map((op, j) => h('li', { class: j < t.pc ? 'done' : j === t.pc ? 'next' : '' }, OP_LABEL[op]))),
          btn));
      });
      const logList = h('ol', { class: 'sched-log', 'aria-label': 'What happened so far' }, st.log.map(e => h('li', { class: 'op-' + e.op, text: e.text })));
      board.append(shared, cols, st.log.length ? logList : h('p', { class: 'sched-empty', text: 'Nothing has happened yet. Choose which thread goes first.' }));
      if (focusIndex != null) { const b = board.querySelectorAll('.sched-run')[focusIndex]; (b && !b.disabled ? b : board.querySelector('.sched-run:not(:disabled)'))?.focus(); }
    }
    draw();
  }

  // ------------------------------------------------------------ small charts (measured values only)
  // spec: { type: 'bars', title, unit, bars: [{ label, value }] }
  //    or { type: 'timeline', title, unit, groups: [{ name, bars: [{ label, start, end }] }] }
  function drawChart(spec) {
    if (spec.type === 'gantt') return drawGantt(spec);
    const W = 640, left = 150, right = 70, barH = 20, gap = 10, top = 8;
    const fmt = v => (Math.round(v * 100) / 100).toFixed(2) + ' ' + spec.unit;
    const fig = h('figure', { class: 'chart' }, h('figcaption', { text: spec.title }));
    let rows = [], max = 0;
    if (spec.type === 'bars') { rows = spec.bars.map(b => ({ label: b.label, start: 0, end: b.value, text: fmt(b.value) })); }
    else spec.groups.forEach(g => { rows.push({ heading: g.name }); g.bars.forEach(b => rows.push({ label: b.label, start: b.start, end: b.end, text: `${fmt(b.start)} to ${fmt(b.end)}` })); });
    rows.forEach(r => { if (r.end > max) max = r.end; });
    max = spec.max || Math.max(max, 0.01) * 1.05;
    let y = top;
    const H = rows.reduce((n, r) => n + (r.heading ? 26 : barH + gap), top + 26);
    const x = v => left + (W - left - right) * v / max;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.title + '. ' + rows.filter(r => !r.heading).map(r => `${r.label}: ${r.text}`).join('; ') });
    for (let t = 0; t <= max + 1e-9; t += spec.tick || (max > 8 ? 2 : max > 3 ? 1 : 0.5)) {
      svg.append(s('line', { x1: x(t), x2: x(t), y1: top, y2: H - 22, class: 'grid' }), s('text', { x: x(t), y: H - 6, class: 'tick', 'text-anchor': 'middle' }, `${Math.round(t * 10) / 10} ${spec.unit}`));
    }
    for (const r of rows) {
      if (r.heading) { svg.append(s('text', { x: 0, y: y + 17, class: 'group' }, r.heading)); y += 26; continue; }
      const w = Math.max(2, x(r.end) - x(r.start));
      svg.append(s('text', { x: left - 10, y: y + barH / 2 + 5, class: 'label', 'text-anchor': 'end' }, r.label),
        s('rect', { x: x(r.start), y, width: w, height: barH, rx: 4, class: 'bar' }, s('title', {}, `${r.label}: ${r.text}`)));
      if (spec.type === 'bars') svg.append(s('text', { x: x(r.end) + 8, y: y + barH / 2 + 5, class: 'value' }, fmt(r.end)));
      y += barH + gap;
    }
    fig.append(svg);
    if (spec.note) fig.append(h('p', { class: 'chart-note' }, rich(spec.note)));
    return fig;
  }

  // Gantt chart for schedules worked out by hand: one row per job, several slices per row.
  // spec: { type: 'gantt', title, unit, tick, rows: [{ label, segs: [{ label, start, end }] }], note }
  function drawGantt(spec) {
    const W = 640, left = 150, right = 20, barH = 24, gap = 8, top = 8;
    const fig = h('figure', { class: 'chart gantt' }, h('figcaption', { text: spec.title }));
    const max = spec.max || Math.max(...spec.rows.flatMap(r => r.segs.map(g => g.end)), 1);
    const H = top + spec.rows.length * (barH + gap) + 26;
    const x = v => left + (W - left - right) * v / max;
    const desc = spec.rows.map(r => `${r.label}: ${r.segs.map(g => `${g.start} to ${g.end} ${spec.unit}`).join(', ')}`).join('; ');
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': spec.title + '. ' + desc });
    for (let t = 0; t <= max + 1e-9; t += spec.tick || 1) {
      svg.append(s('line', { x1: x(t), x2: x(t), y1: top, y2: H - 22, class: 'grid' }), s('text', { x: x(t), y: H - 6, class: 'tick', 'text-anchor': 'middle' }, String(Math.round(t * 10) / 10)));
    }
    spec.rows.forEach((r, i) => {
      const y = top + i * (barH + gap);
      svg.append(s('text', { x: left - 10, y: y + barH / 2 + 5, class: 'label', 'text-anchor': 'end' }, r.label));
      for (const g of r.segs) {
        svg.append(s('rect', { x: x(g.start), y, width: Math.max(2, x(g.end) - x(g.start)), height: barH, rx: 3, class: 'bar k' + (i % 4) }, s('title', {}, `${r.label}: ${g.start} to ${g.end} ${spec.unit}`)));
        if (x(g.end) - x(g.start) >= 14) svg.append(s('text', { x: (x(g.start) + x(g.end)) / 2, y: y + barH / 2 + 5, class: 'seg', 'text-anchor': 'middle' }, g.label));
      }
    });
    fig.append(svg, h('p', { class: 'chart-note' }, rich(`Time in ${spec.unit}. ` + (spec.note || ''))));
    return fig;
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
    const core = coreChapters();
    const open = core.filter(c => !chapterDone(c));
    const art = h('article', { class: 'step done-page' });
    art.append(h('h1', { tabindex: '-1', text: open.length ? 'Almost there' : 'Practical complete' }),
      h('p', { class: 'lead', text: open.length
        ? `You still have open tasks in: ${open.map(c => c.title).join(', ')}. Everything else is done.`
        : (C.done && C.done.lead) || 'You investigated the upload incident with nothing but a terminal. These are the commands you used today.' }));
    const heads = (C.done && C.done.columns) || ['Command', 'What it does'];
    const table = h('table', { class: 'summary' }, h('thead', {}, h('tr', {}, heads.map(t => h('th', { scope: 'col', text: t })))),
      h('tbody', {}, C.summary.map(([c, d]) => h('tr', {}, h('td', {}, h('code', { text: c })), h('td', { text: d })))));
    art.append(table);
    if (C.done && C.done.recap) art.append(h('h2', { text: 'The big ideas' }), h('ul', { class: 'recap' }, C.done.recap.map(t => h('li', {}, rich(t)))));

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
    if (bonus) art.append(h('h2', { text: 'Want more?' }), h('p', {}, 'Try the optional bonus chapter ', h('a', { href: `#/${bonus.id}/1`, text: bonus.title }), ' ' + ((C.done && C.done.bonus) || 'for small statistics with sort, uniq and cut.')));
    const nextSession = LAB.sessions[LAB.sessions.findIndex(x => x.id === C.id) + 1];
    if (nextSession) art.append(h('p', { class: 'note' }, 'Next in the lab: ',
      nextSession.status === 'ready' ? h('a', { href: sessionHref(nextSession), text: `${nextSession.number}: ${nextSession.title}` }) : `${nextSession.number}: ${nextSession.title} (coming soon)`, '.'));
    main.append(art);
  }

  // ------------------------------------------------------------ global actions
  async function restartLinux() {
    if (!confirm('Restart Linux with fresh files? Files and folders you created will be removed, and programs you started are stopped. Your course progress stays.')) return;
    try { await linux.reset(); } catch (_) { linux.restart(); }
    render();
  }
  function resetProgress() {
    if (!confirm('Reset your progress? Solved exercises and quiz results in this browser will be cleared.')) return;
    progress = { steps: {}, quiz: {}, missed: {}, values: {} }; save();
    location.hash = '#/'; render();
  }

  render();
})();
