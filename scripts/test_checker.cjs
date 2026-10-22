/*
 * Fast unit tests for the result checker (no browser, no Linux):  node scripts/test_checker.cjs
 * The browser test (test_course_browser.cjs) runs the same logic against real Linux output.
 */
const fs = require('node:fs');
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
console.log('PASS: checker comparison modes, diagnoses, error explanations, reason codes for every exercise');
