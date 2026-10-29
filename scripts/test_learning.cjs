/*
 * Learning tests for all practicals, without a browser:  node scripts/test_learning.cjs
 *
 * 1. Unit tests of the engine (course-app.js): result checker, result codes, scheduler.
 * 2. Structure of every ready practical listed in docs/assets/practicals.js: Learn / Example /
 *    Your turn / hints / quiz in every chapter, test cases for every exercise.
 * 3. Practical 01: every example, model solution, alternative solution and wrong attempt
 *    runs in a real POSIX shell with GNU tools, in a temporary home folder laid out like the
 *    browser Linux. The same checker decides whether the result is accepted.
 * 4. Practical 02: the Codespaces lab checker is run for real (scripts/test_lab_02.py); its
 *    result codes, the student answers and the scheduler orders go through the page's own
 *    verify() functions; every Python example runs and must print exactly what the page shows.
 *    The shell steps of Practical 02 need BusyBox job control and process tools, so they are
 *    tested in the real browser Linux only (test_course_browser.cjs).
 *
 * Needs Linux (GNU coreutils/grep) and python3. Run it as a normal user, not as root.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'docs/assets');
const norm = t => t.replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');

// Load the engine with one practical, as the browser does (practicals.js, content, engine).
function load(slug) {
  const window = {};
  const sandbox = { window, document: { getElementById: () => null, currentScript: { src: 'http://x/assets/a.js' } }, localStorage: { getItem: () => null, setItem() {} }, console, TextEncoder };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ASSETS, 'practicals.js'), 'utf8'), sandbox);
  if (slug) vm.runInContext(fs.readFileSync(path.join(ASSETS, slug + '.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ASSETS, 'course-app.js'), 'utf8'), sandbox);
  return window;
}
const LAB = load(null).ITS4DH_LAB;
const READY = LAB.sessions.filter(s => s.status === 'ready');
const res = o => Object.assign({ stdout: '', stderr: '', status: 0, cwd: '/home/student', probe: '', probeStatus: 0, timedOut: false, restarted: false }, o);

// ---------------------------------------------------------------- 1. engine
{
  const window = load('practical-01');
  const { evaluate, compare, numberOf } = window.ITS4DH;
  const C = window.PRACTICAL;
  const step = id => { const [c, s] = id.split('/'); return C.chapters.find(x => x.id === c).steps.find(x => x.id === s); };
  // comparison modes
  assert(compare.lines('a\nb\n', 'a\nb'));
  assert(compare.lines('a  \nb\n\n', 'a\nb\n'));
  assert(!compare.lines('a\n', 'a\nb\n'));
  assert(!compare.lines('', ''));
  assert(compare.number('1000 data/upload.log\n', '1000\n'));
  assert(compare.number('  100\n', '100'));
  assert(!compare.number('100 200\n', '100'));
  assert(!compare.number('errors: 100', '100'));
  assert(compare.names('-rw 1 x 36800 upload.log\n-rw 288 upload_small.log', 'upload.log upload_small.log\n36800'));
  assert(!compare.names('upload.log', 'upload.log upload_small.log'));
  assert(compare.lineset('     50 upload timeout\n     50 connection refused\n', '     50 connection refused\n     50 upload timeout\n'));
  assert.equal(numberOf('8 data/upload_small.log'), 8);

  // output exercise: right, wrong, error explanations
  const grepC = step('search/grep-c');
  assert.equal(evaluate(grepC, res({ stdout: '100\n', probe: '100\n' }), 'grep -c ERROR data/upload.log').ok, true);
  assert.match(evaluate(grepC, res({ stdout: '0\n', probe: '100\n', status: 1 }), 'grep -c error data/upload.log').msg, /case-sensitive/);
  assert.match(evaluate(grepC, res({ stderr: 'sh: gerp: not found\n', status: 127, probe: '100\n' }), 'gerp').msg, /does not know the command “gerp”/);
  assert.match(evaluate(grepC, res({ timedOut: true, status: 130 }), 'grep ERROR').msg, /10 seconds/);

  // state exercise: reason codes and the {cwd} placeholder
  const cd = step('navigate/cd');
  assert.equal(evaluate(cd, res({ probe: 'OK\n', cwd: '/home/student/data' }), 'cd data').ok, true);
  assert.match(evaluate(cd, res({ probe: 'WRONG_DIR\n', cwd: '/home/student/notes' }), 'cd notes').msg, /in ~\/notes, not in the data folder/);
  assert.match(evaluate(cd, res({ probe: 'WRONG_DIR\n', status: 2, stderr: "sh: cd: line 1: can't cd to dat: No such file or directory\n" }), 'cd dat').msg, /does not exist/);

  // secondary technique requirement
  const abs = step('navigate/absolute');
  const partial = evaluate(abs, res({ probe: 'OK\n' }), 'cd ~/notes');
  assert(partial.partial && !partial.ok);
  assert.equal(evaluate(abs, res({ probe: 'OK\n' }), 'cd /home/student/notes').ok, true);

  // result codes: same checksum as the Python checker
  const { signature, parseResult, parseNumber, sched } = window.ITS4DH;
  const lab = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/lab_codes.json'), 'utf8'));
  for (const [body, sig] of Object.entries(lab.vectors)) assert.equal(signature(body), sig, `checksum of ${body}`);
  assert.equal(JSON.stringify(parseResult('Your result code: P02-THREADS-2.01-' + signature('P02-THREADS-2.01'), 'P02', 'threads').values), '[2.01]');
  assert.equal(parseResult('P02-THREADS-2.01-AAAA', 'P02', 'threads').error, 'checksum');
  assert.equal(parseResult('P02-THREADS-2.02-' + signature('P02-THREADS-2.01'), 'P02', 'threads').error, 'checksum');
  assert.equal(parseResult('P02-HELLO-' + signature('P02-HELLO'), 'P02', 'cpu-threads').error, 'other-task');
  assert.equal(parseResult('nothing here', 'P02', 'hello').error, 'missing');
  assert.equal(parseNumber('2,95'), 2.95);
  assert.equal(parseNumber(' 3 × '), 3);
  assert.equal(parseNumber('3x faster'), null);
  // scheduler: lost update without lock, never with lock
  const free = { threads: ['A', 'B'], start: 10 };
  assert.equal(sched.run(free, [0, 1, 0, 1, 0, 1]).counter, 11);
  assert.equal(sched.run(free, [0, 0, 0, 1, 1, 1]).counter, 12);
  const locked = { threads: ['A', 'B'], start: 10, lock: true };
  const orders = [];
  (function all(prefix, a, b) {          // every interleaving of 5 + 5 steps, with waiting attempts
    if (a === 5 && b === 5) { orders.push(prefix); return; }
    if (a < 5) all(prefix.concat(0), a + 1, b);
    if (b < 5) all(prefix.concat(1), a, b + 1);
  })([], 0, 0);
  for (const order of orders) {
    let st = sched.run(locked, order);     // a thread that finds the lock taken just waits
    for (let k = 0; !sched.done(st) && k < 40; k++) st = sched.step(st, k % 2);
    assert(sched.done(st) && st.counter === 12, 'with a lock every order ends at 12: ' + order.join(''));
  }
  console.log(`PASS 1: checker modes, diagnoses, error explanations; result-code checksum identical to the Python checker; scheduler: lost update without lock, 12 in all ${orders.length} interleavings with lock`);
}

// ---------------------------------------------------------------- 2. structure of every practical
const steps = {};
for (const sess of READY) {
  const window = load(sess.slug);
  const C = window.PRACTICAL;
  const CASES = require(`./cases/${sess.slug}.cjs`);
  assert.equal(C.id, sess.id, `${sess.slug}: id matches the registry`);
  assert(fs.existsSync(path.join(ROOT, 'docs', sess.slug + '.md')), `${sess.slug}: page exists`);
  let n = 0;
  for (const ch of C.chapters) {
    assert(ch.quiz.length >= 2 && ch.quiz.length <= 3, `${sess.slug} ${ch.id}: 2-3 quiz questions`);
    ch.quiz.forEach((q, i) => {
      assert(q.options.length >= 3 && q.options.every(o => o.t && o.why), `${ch.id} quiz ${i + 1}: options explained`);
      const right = q.options.filter(o => o.correct).length;
      assert(q.multi ? right >= 1 : right === 1, `${ch.id} quiz ${i + 1}: correct answers`);
    });
    if (C.chapters.indexOf(ch) > 0) assert(ch.quiz.some(q => q.review), `${sess.slug} ${ch.id}: one review question from an earlier chapter`);
    for (const st of ch.steps) {
      const id = `${ch.id}/${st.id}`;
      n++;
      const words = st.learn.join(' ').split(/\s+/).length;
      assert(words >= 25 && words <= 85, `${sess.slug} ${id}: learn text has ${words} words`);
      for (const k of ['title', 'example', 'task', 'hints', 'solution', 'success']) assert(st[k], `${id}: ${k}`);
      assert(CASES[id], `${sess.slug} ${id}: test cases`);
      if (!st.mode) {
        assert(st.check && (st.check.state || compare(window)[st.check.output]), `${id}: valid check`);
        assert(st.example.cmd && st.example.out, `${id}: example with output`);
        assert.notEqual(norm(st.example.cmd), norm(st.solution), `${id}: example and exercise differ`);
        assert(CASES[id].wrong.length && CASES[id].alts.length, `${id}: wrong and alternative test cases`);
        if (st.check.state) for (const code of (st.check.state.match(/echo ([A-Z0-9_]+)/g) || []).map(s => s.slice(5)))
          assert(code === 'OK' || (st.reasons && st.reasons[code]), `${id}: feedback for ${code}`);
      } else {
        assert(st.example.cmd || st.example.code, `${id}: example`);
        assert.equal(typeof st.verify, 'function', `${id}: verify()`);
        assert(CASES[id].wrong.length && CASES[id].model, `${id}: wrong cases and a model answer`);
        if (st.mode === 'report') assert(st.fields.length && st.fields.every(f => f.id && f.label && f.type), `${id}: fields`);
        if (st.where === 'codespace') assert(st.commands.length, `${id}: commands for the Codespaces terminal`);
      }
    }
  }
  const caseIds = Object.keys(CASES).filter(k => k.includes('/'));
  assert.equal(caseIds.length, n, `${sess.slug}: test cases for exactly the existing exercises`);
  steps[sess.slug] = n;
  console.log(`PASS 2 ${sess.slug}: ${C.chapters.length} chapters, ${n} exercises with the same Learn/Example/Your turn structure; quizzes valid`);
}
function compare(window) { return window.ITS4DH.compare; }

// ---------------------------------------------------------------- 3. Practical 01 in a real shell
assert(process.getuid() !== 0, 'Run the learning tests as a normal user, not as root.');
{
  const window = load('practical-01');
  const { evaluate } = window.ITS4DH;
  const C = window.PRACTICAL;
  const CASES = require('./cases/practical-01.cjs');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'its4dh-learning-'));
  const HOME = path.join(work, 'student');
  const RUN = path.join(work, 'run');
  fs.mkdirSync(RUN);
  const local = t => t.split(C.home).join(HOME);
  const shellEnv = { PATH: process.env.PATH, HOME, LC_ALL: 'C', USER: os.userInfo().username, SHELL: '/bin/sh' };
  const freshHome = () => {
    if (fs.existsSync(HOME)) execFileSync('chmod', ['-R', 'u+w', HOME]);
    fs.rmSync(HOME, { recursive: true, force: true, maxRetries: 2 });
    for (const f of C.files) {
      const target = path.join(HOME, f.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(ASSETS, f.url), target);
    }
    for (const f of C.files.filter(f => f.readOnly)) fs.chmodSync(path.join(HOME, f.path), 0o444);
    for (const d of new Set(C.files.filter(f => f.readOnly).map(f => path.dirname(path.join(HOME, f.path))))) fs.chmodSync(d, 0o555);
  };
  let cwd = HOME;
  // Same protocol as shell-worker.js: run the command in a child shell, remember its final
  // folder, then run the checker's probe in that folder.
  const exec = (command, probe) => {
    fs.writeFileSync(path.join(RUN, 'task.sh'), local(command) + '\n');
    fs.writeFileSync(path.join(RUN, 'probe.sh'), (probe || ':') + '\n');
    const script =
      'cd "$1" || exit 1; ' +
      'sh -c \'trap "pwd > \\"$0\\"" EXIT; . "$1"\' "$2/cwd" "$2/task.sh" </dev/null >"$2/o" 2>"$2/e"; echo $? >"$2/st"; ' +
      'c=$(cat "$2/cwd" 2>/dev/null); [ -n "$c" ] && [ -d "$c" ] && cd "$c"; ' +
      '( . "$2/probe.sh" ) </dev/null >"$2/po" 2>&1; pwd >"$2/pwd"';
    fs.rmSync(path.join(RUN, 'cwd'), { force: true });
    execFileSync('sh', ['-c', script, 'sh', cwd, RUN], { env: shellEnv, timeout: 20000 });
    const read = n => fs.readFileSync(path.join(RUN, n), 'utf8');
    cwd = read('pwd').trim();
    const back = t => t.split(HOME).join(C.home);
    return { stdout: back(read('o')), stderr: back(read('e')), status: Number(read('st')), cwd: back(cwd), probe: back(read('po')), probeStatus: 0, timedOut: false, restarted: false };
  };
  const startAt = st => {
    cwd = (st.start || '~').replace(/^~/, HOME);
    if (st.setup) exec(st.setup);
  };
  try {
    // Examples, each from a fresh home folder. Outputs that depend on the browser Linux itself
    // (file dates, system folders) are covered by the browser test only.
    let examples = 0;
    for (const ch of C.chapters) for (const st of ch.steps) {
      const ex = st.example;
      if (ex.volatile || /whoami|hostname|ls \/home/.test(ex.cmd)) continue;
      freshHome();
      cwd = (ex.start || st.start || '~').replace(/^~/, HOME);
      const r = exec(ex.cmd);
      assert.equal(r.stderr, '', `${ch.id}/${st.id}: example stderr`);
      assert.equal(norm(r.stdout), norm(ex.out), `${ch.id}/${st.id}: example output`);
      examples++;
    }
    console.log(`PASS 3a practical-01: ${examples} example outputs reproduced in ${execFileSync('sh', ['-c', 'uname -s'], { encoding: 'utf8' }).trim()} with the course files`);

    // Exercises in course order in one home folder, like a student session.
    freshHome();
    let wrong = 0, alts = 0;
    for (const ch of C.chapters) for (const st of ch.steps) {
      const id = `${ch.id}/${st.id}`, cases = CASES[id];
      const check = st.check.state || st.check.expect;
      const verdict = cmd => { startAt(st); return evaluate(st, exec(cmd, check), cmd); };
      for (const [cmd, , undo] of cases.wrong) {
        const v = verdict(cmd);
        assert(!v.ok, `${id}: wrong command accepted: ${JSON.stringify(cmd)}`);
        if (undo) exec(undo);
        wrong++;
      }
      for (const alt of cases.alts) {
        const [cmd, undo] = Array.isArray(alt) ? alt : [alt];
        const v = verdict(cmd);
        assert(v.ok, `${id}: alternative rejected: ${JSON.stringify(cmd)}: ${v.msg}`);
        if (undo) exec(undo);
        alts++;
      }
      const v = verdict(st.solution);
      assert(v.ok, `${id}: model solution rejected: ${v.msg}`);
    }
    const report = exec('cat ~/reports/report.txt').stdout;
    assert.equal(report, '100\n50\n50\n', 'final report from the mini-challenge');
    console.log(`PASS 3b practical-01: ${steps['practical-01']} model solutions and ${alts} alternative solutions accepted, ${wrong} wrong attempts rejected; final report 100/50/50`);
  } finally {
    execFileSync('chmod', ['-R', 'u+w', work]);
    fs.rmSync(work, { recursive: true, force: true });
  }
  // The datasets themselves were not touched.
  const sha = f => require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
  for (const f of ['upload_small.log', 'upload.log']) assert.equal(sha('docs/assets/fixtures/' + f), sha('data/logs/' + f), f);
}

// ---------------------------------------------------------------- 4. Practical 02: lab, answers, Python examples
if (READY.some(s => s.slug === 'practical-02')) {
  const python = process.env.PYTHON || 'python3';
  if (!process.env.SKIP_LAB) {
    const out = execFileSync(python, [path.join(ROOT, 'scripts/test_lab_02.py')], { encoding: 'utf8', timeout: 600000 });
    process.stdout.write(out.replace(/^PASS/m, 'PASS 4a'));
  }
  delete require.cache[require.resolve('./cases/practical-02.cjs')];
  delete require.cache[require.resolve('./lab_codes.json')];
  const CASES = require('./cases/practical-02.cjs');
  const window = load('practical-02');
  const { parseResult, parseNumber, sched } = window.ITS4DH;
  const C = window.PRACTICAL;
  const ctx = saved => ({ saved: id => (saved || {})[id] || null, parse: parseResult, number: parseNumber });
  let answers = 0, examples = 0;
  for (const ch of C.chapters) for (const st of ch.steps) {
    if (!st.mode) continue;
    const id = `${ch.id}/${st.id}`, cases = CASES[id];
    const judge = v => (st.mode === 'interleave' ? st.verify(sched.run(st.scheduler, v), ctx(CASES.saved)) : st.verify(v, ctx(CASES.saved)));
    for (const [v, re] of cases.wrong) {
      const r = judge(v);
      assert(!r.ok, `${id}: wrong answer accepted: ${JSON.stringify(v)}`);
      assert.match(r.msg, re, `${id}: feedback for ${JSON.stringify(v)}`);
      answers++;
    }
    for (const v of cases.alts.concat([cases.model])) {
      const r = judge(v);
      assert(r.ok, `${id}: correct answer rejected: ${JSON.stringify(v)}: ${r.msg}`);
      if (st.chart) assert(st.chart(r.save, ctx(CASES.saved)), `${id}: chart from the saved values`);
      answers++;
    }
    if (/speedup/.test(st.id)) assert.match(st.verify(cases.model, ctx({})).msg, /first/, `${id}: asks for the earlier measurements`);
    // Python examples: run them and compare with the output shown on the page
    const ex = st.example;
    if (ex.cmd && /^python3\b/.test(ex.cmd)) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'its4dh-example-'));
      if (ex.code && ex.file) fs.writeFileSync(path.join(dir, ex.file), ex.code + '\n');
      const out = execFileSync('sh', ['-c', ex.cmd.replace(/^python3\b/, python)], { cwd: dir, encoding: 'utf8', timeout: 30000 });
      const shown = ex.cmd.includes('cpu_count') ? out.replace(/^\d+$/m, '2') : out;    // the core count depends on the machine
      const masked = s => (ex.volatile === 'numbers' ? s.replace(/\d+/g, 'N') : s);    // measured times
      assert.equal(masked(norm(shown)), masked(norm(ex.out)), `${id}: Python example output`);
      fs.rmSync(dir, { recursive: true, force: true });
      examples++;
    }
  }
  console.log(`PASS 4b practical-02: ${answers} answers through the page's verify() (real result codes, wrong answers explained), ${examples} Python examples print exactly what the page shows`);
}
// ---------------------------------------------------------------- 5. Practical 03: answers worked out by hand
if (READY.some(s => s.slug === 'practical-03')) {
  const CASES = require('./cases/practical-03.cjs');
  const window = load('practical-03');
  const { parseResult, parseNumber } = window.ITS4DH;
  const C = window.PRACTICAL;
  const ctx = { saved: id => (CASES.saved || {})[id] || null, parse: parseResult, number: parseNumber };
  let answers = 0, charts = 0;
  for (const ch of C.chapters) for (const st of ch.steps) {
    if (st.mode !== 'report') continue;
    const id = `${ch.id}/${st.id}`, cases = CASES[id];
    for (const [v, re] of cases.wrong) {
      const r = st.verify(v, ctx);
      assert(!r.ok, `${id}: wrong answer accepted: ${JSON.stringify(v)}`);
      assert.match(r.msg, re, `${id}: feedback for ${JSON.stringify(v)}`);
      answers++;
    }
    for (const v of cases.alts.concat([cases.model])) {
      const r = st.verify(v, ctx);
      assert(r.ok, `${id}: correct answer rejected: ${JSON.stringify(v)}: ${r.msg}`);
      answers++;
    }
    if (st.chart) {
      const spec = st.chart(st.verify(cases.model, ctx).save, ctx);
      assert(spec, `${id}: chart`);
      if (spec.type === 'gantt') {
        // the chart shows a complete schedule: every job runs exactly its CPU burst, without overlaps
        const segs = spec.rows.flatMap(r => r.segs).sort((a, b) => a.start - b.start);
        segs.forEach((g, i) => i && assert(g.start >= segs[i - 1].end, `${id}: no two jobs at the same time`));
        assert.equal(segs.reduce((n, g) => n + g.end - g.start, 0), 16, `${id}: 16 ms of work in total`);
      }
      charts++;
    }
  }
  // the model solutions shown on the page match the recomputed schedules
  const sch = C.chapters.find(c => c.id === 'schedule');
  assert.match(sch.steps[0].solution, /average = 26 ÷ 4 = 6\.5 ms/);
  assert.match(sch.steps[1].solution, /average = 14 ÷ 4 = 3\.5 ms/);
  assert.match(sch.steps[2].solution, /L finishes at 16 ms/);
  console.log(`PASS 5 practical-03: ${answers} hand-calculated answers through the page's verify() (wrong answers explained), ${charts} charts drawn from the correct schedules`);
}
console.log('PASS: all learning tests');
