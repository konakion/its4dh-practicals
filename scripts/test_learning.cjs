/*
 * Learning tests for the practical, without a browser:  node scripts/test_learning.cjs
 *
 * 1. Unit tests of the result checker (course-app.js).
 * 2. Structure of the content: Learn / Example / Your turn / hints / quiz in every chapter.
 * 3. Every example, model solution, alternative solution and wrong attempt runs in a real
 *    POSIX shell with GNU tools, in a temporary home folder laid out like the browser Linux.
 *    The same checker decides whether the result is accepted.
 *
 * Needs Linux (GNU coreutils/grep). The browser test (test_course_browser.cjs) repeats part 3
 * inside the real browser Linux (BusyBox) and also checks the feedback texts.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const CASES = require('./learning_cases.cjs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const window = {};
const sandbox = { window, document: { getElementById: () => null, currentScript: { src: 'http://x/assets/a.js' } }, localStorage: { getItem: () => null, setItem() {} }, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('docs/assets/practical-01.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('docs/assets/course-app.js', 'utf8'), sandbox);
const { evaluate, compare, numberOf } = window.ITS4DH;
const C = window.PRACTICAL;
const step = id => { const [c, s] = id.split('/'); return C.chapters.find(x => x.id === c).steps.find(x => x.id === s); };
const res = o => Object.assign({ stdout: '', stderr: '', status: 0, cwd: '/home/student', probe: '', probeStatus: 0, timedOut: false, restarted: false }, o);

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

// every step has a working check definition and feedback for each reason code
for (const ch of C.chapters) for (const st of ch.steps) {
  assert(st.check.state || compare[st.check.output], `${ch.id}/${st.id}: valid check`);
  if (st.check.state) for (const code of (st.check.state.match(/echo ([A-Z_]+)/g) || []).map(s => s.slice(5)))
    assert(code === 'OK' || (st.reasons && st.reasons[code]), `${ch.id}/${st.id}: feedback for ${code}`);
}
console.log('PASS 1: checker comparison modes, diagnoses, error explanations, reason codes for every exercise');

// ---------------------------------------------------------------- 2. content structure
const norm = t => t.replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
let steps = 0;
for (const ch of C.chapters) {
  assert(ch.quiz.length >= 2 && ch.quiz.length <= 3, `${ch.id}: 2-3 quiz questions`);
  ch.quiz.forEach((q, i) => {
    assert(q.options.length >= 3 && q.options.every(o => o.t && o.why), `${ch.id} quiz ${i + 1}: options explained`);
    const right = q.options.filter(o => o.correct).length;
    assert(q.multi ? right >= 1 : right === 1, `${ch.id} quiz ${i + 1}: correct answers`);
  });
  if (C.chapters.indexOf(ch) > 0) assert(ch.quiz.some(q => q.review), `${ch.id}: one review question from an earlier chapter`);
  for (const st of ch.steps) {
    const id = `${ch.id}/${st.id}`;
    steps++;
    const words = st.learn.join(' ').split(/\s+/).length;
    assert(words >= 25 && words <= 85, `${id}: learn text has ${words} words`);
    for (const k of ['title', 'example', 'task', 'check', 'hints', 'solution', 'success']) assert(st[k], `${id}: ${k}`);
    assert(st.example.cmd && st.example.out, `${id}: example with output`);
    assert.notEqual(norm(st.example.cmd), norm(st.solution), `${id}: example and exercise differ`);
    assert(CASES[id] && CASES[id].wrong.length && CASES[id].alts.length, `${id}: wrong and alternative test cases`);
  }
}
assert.equal(Object.keys(CASES).length, steps, 'test cases for exactly the existing exercises');
console.log(`PASS 2: ${C.chapters.length} chapters, ${steps} exercises with the same Learn/Example/Your turn structure; examples differ from exercises; quizzes valid`);

// ---------------------------------------------------------------- 3. run everything in a real shell
// Paths that only exist in the browser Linux are mapped to the temporary home folder.
const ROOT = path.resolve(__dirname, '..');
// The read-only evidence folder only protects anything for a normal user.
assert(process.getuid() !== 0, 'Run the learning tests as a normal user, not as root.');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'its4dh-learning-'));
const HOME = path.join(work, 'student');
const RUN = path.join(work, 'run');
fs.mkdirSync(RUN);
const local = t => t.split(C.home).join(HOME);
const shellEnv = { PATH: process.env.PATH, HOME, LC_ALL: 'C', USER: os.userInfo().username, SHELL: '/bin/sh' };
function freshHome() {
  if (fs.existsSync(HOME)) execFileSync('chmod', ['-R', 'u+w', HOME]);
  fs.rmSync(HOME, { recursive: true, force: true, maxRetries: 2 });
  for (const f of C.files) {
    const target = path.join(HOME, f.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'docs/assets', f.url), target);
  }
  for (const f of C.files.filter(f => f.readOnly)) fs.chmodSync(path.join(HOME, f.path), 0o444);
  for (const d of new Set(C.files.filter(f => f.readOnly).map(f => path.dirname(path.join(HOME, f.path))))) fs.chmodSync(d, 0o555);
}
let cwd = HOME;
// Same protocol as shell-worker.js: run the command in a child shell, remember its final
// folder, then run the checker's probe in that folder.
function exec(command, probe) {
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
}
const startAt = st => {
  const start = (st.start || '~').replace(/^~/, HOME);
  cwd = start;
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
  console.log(`PASS 3a: ${examples} example outputs reproduced in ${execFileSync('sh', ['-c', 'uname -s'], { encoding: 'utf8' }).trim()} with the course files`);

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
  console.log(`PASS 3b: ${steps} model solutions and ${alts} alternative solutions accepted, ${wrong} wrong attempts rejected; final report 100/50/50`);
} finally {
  execFileSync('chmod', ['-R', 'u+w', work]);
  fs.rmSync(work, { recursive: true, force: true });
}

// The datasets themselves were not touched.
const sha = f => require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
for (const f of ['upload_small.log', 'upload.log']) assert.equal(sha('docs/assets/fixtures/' + f), sha('data/logs/' + f), f);
console.log('PASS: all learning tests');
