/*
 * Test cases for every exercise of Practical 02, shared by test_learning.cjs and
 * test_course_browser.cjs.
 *
 * Shell steps (browser Linux): wrong commands with the expected feedback, alternative correct
 * commands. Every case starts from the step's setup (Reset exercise), so no undo is needed.
 * Report steps: answers as { fieldId: value }. Result codes are real: they come from
 * scripts/lab_codes.json, written by scripts/test_lab_02.py from the actual lab checker.
 * Interleave steps: the order in which the scheduler runs the threads (0 = A, 1 = B).
 */
const codes = require('../lab_codes.json').codes;
const vals = c => c.split('-').slice(2, -1).map(Number);
const [S] = vals(codes.sequential[0]);
const [T] = vals(codes.threads[0]);
const [cSeq, , cProc, cores] = vals(codes.cpu[0]);
const f2 = x => (Math.round(x * 100) / 100).toFixed(2);
const terminal = code => `Checking ...\n✔ Done.\n\nYour result code: ${code}\nPaste this line into the practical page.`;

module.exports = {
  // saved values of earlier steps, as the page stores them after the model solutions
  saved: {
    'threads/sequential': { seconds: S }, 'threads/threads': { seconds: T },
    'multiprocessing/processes': { seq: cSeq, thr: vals(codes.cpu[0])[1], proc: cProc, cores },
  },

  // ---------------------------------------------------------------- shell steps
  'processes/program': {
    wrong: [['monitor bed-07 3', /terminal was busy/], ['cat ~/ward/bed-07.log', /Start the monitor first/], ['monitor bed-07 2\ncat ~/ward/bed-07.log', /exactly three readings/]],
    alts: ['monitor bed-07 3; cat ~/ward/bed-07.log', 'monitor bed-07 3 && cat ward/bed-07.log'],
  },
  'processes/ps': {
    wrong: [['ps -o pid,comm | head -n 3', /not what the task asks/], ['pidof monitr', /found or printed nothing/]],
    alts: ['pidof monitor', 'ps | grep monitor', 'ps -o pid,args | grep bed-12', 'cat ~/ward/bed-12.pid'],
  },
  'processes/parent': {
    wrong: [['echo $$', /PID of your shell itself/], ['ps -o pid,comm | head -n 2', /not what the task asks/]],
    alts: ['echo $PPID', 'ps -o pid,ppid,comm | grep -w $$', 'grep PPid /proc/$$/status'],
  },
  'processes/top': {
    wrong: [['top -b -n 1 | head -n 3', /not what the task asks/], ['ps -o pid,comm | grep monitor', /found or printed nothing/]],
    alts: ['top -b -n 1', 'pidof analyse', 'ps | grep analyse'],
  },
  'manage/background': {
    wrong: [['monitor bed-03 &', /Only one of the two/], ['monitor bed-03 & monitor bed-04 &', /also list them with `?jobs/], ['monitor bed-03', /foreground/]],
    alts: ['monitor bed-03 &\nmonitor bed-04 &\njobs -l', 'for b in bed-03 bed-04; do monitor $b & done; jobs'],
  },
  'manage/fg': {
    wrong: [['monitor bed-05 3\ntail -n 1 ~/ward/bed-05.log', /in the background first/], ['monitor bed-05 3 &\ntail -n 1 ~/ward/bed-05.log', /has not finished yet/]],
    alts: ['monitor bed-05 3 &\njobs\nfg %1\ntail -1 ~/ward/bed-05.log'],
  },
  'manage/kill': {
    wrong: [['pidof monitor', /still running/], ['kill -9 $(pidof monitor)', /without a chance to save/]],
    alts: ['kill $(cat ~/ward/bed-14.pid)', 'killall monitor', 'kill -15 $(pidof monitor)', 'kill -TERM $(pidof monitor)'],
  },
  'manage/kill9': {
    wrong: [['kill $(pidof monitor)', /ignores SIGTERM/], ['kill 99999', /no process with that number/]],
    alts: ['kill -9 $(cat ~/ward/bed-09.pid)', 'kill -KILL $(pidof monitor)', 'killall -9 monitor'],
  },
  'manage/challenge': {
    wrong: [
      ['killall monitor', /should keep running/],
      ['kill $(cat ~/ward/bed-32.pid)', /Now write its PID/],
      ['pid=$(cat ~/ward/bed-32.pid); kill -9 $pid; echo $pid > ~/ward/stopped.txt', /killed with SIGKILL/],
      ['kill $(cat ~/ward/bed-32.pid); echo 12345 > ~/ward/stopped.txt', /does not contain the PID/],
    ],
    alts: ["p=$(ps -o pid,args | grep 'monitor bed-32' | grep -v grep | awk '{print $1}'); kill $p; echo $p > ~/ward/stopped.txt"],
  },
  'bonus/status': {
    wrong: [['grep Name /proc/$$/status', /not what the task asks/]],
    alts: ['cat /proc/$$/status | grep Threads', 'grep Threads /proc/self/status'],
  },
  'bonus/state': {
    wrong: [['grep State /proc/$$/status', /state of your own shell/]],
    alts: ['cat /proc/$(pidof monitor)/status | grep State', 'grep State /proc/$(cat ~/ward/bed-40.pid)/status'],
  },

  // ---------------------------------------------------------------- report steps
  'editors/nano': {
    wrong: [[{ out: 'hello' }, /cannot find a result code/], [{ out: codes.vim[0] }, /different task \(vim\)/], [{ out: 'P02-HELLO-AAAA' }, /typo/],
      [{ out: '✘ Not yet.\nThere is no work/hello.py yet.' }, /says “Not yet”/]],
    alts: [{ out: codes.hello[0].toLowerCase() }], model: { out: terminal(codes.hello[0]) },
  },
  'editors/vim': { wrong: [[{ out: codes.hello[0] }, /different task \(hello\)/]], alts: [{ out: ' ' + codes.vim[0] + ' ' }], model: { out: terminal(codes.vim[0]) } },
  'threads/sequential': { wrong: [[{ out: codes.threads[0] }, /different task/]], alts: [{ out: codes.sequential[0] }], model: { out: terminal(codes.sequential[0]) } },
  'threads/threads': { wrong: [[{ out: codes.sequential[0] }, /different task/]], alts: [{ out: codes.threads[0] }], model: { out: terminal(codes.threads[0]) } },
  'threads/speedup': {
    wrong: [
      [{ speedup: f2(T / S), why: 'overlap' }, /divided the new time by the old one/],
      [{ speedup: 'fast', why: 'overlap' }, /as a number/],
      [{ speedup: f2(S / T + 0.5), why: 'overlap' }, /Not quite|ideal/],
      [{ speedup: f2(S / T), why: 'cpu' }, /did not calculate faster/],
      [{ speedup: f2(S / T), why: 'cores' }, /needs no core/],
    ],
    alts: [{ speedup: (S / T).toFixed(1), why: 'overlap' }, { speedup: f2(S / T).replace('.', ','), why: 'overlap' }],
    model: { speedup: f2(S / T), why: 'overlap' },
  },
  'multiprocessing/cpu-threads': { wrong: [[{ out: codes.cpu[0] }, /different task/]], alts: [{ out: codes['cpu-threads'][0] }], model: { out: terminal(codes['cpu-threads'][0]) } },
  'multiprocessing/processes': { wrong: [[{ out: codes['cpu-threads'][0] }, /different task/]], alts: [{ out: codes.cpu[0] }], model: { out: terminal(codes.cpu[0]) } },
  'multiprocessing/speedup-cpu': {
    wrong: [
      [{ speedup: f2(cProc / cSeq), ideal: String(cores) }, /Other way round/],
      [{ speedup: f2(cSeq / cProc + 0.6), ideal: String(cores) }, /Not quite/],
      [{ speedup: f2(cSeq / cProc), ideal: cores === 4 ? '8' : '4' }, /four workers|CPU cores/],
    ],
    alts: [{ speedup: f2(cSeq / cProc), ideal: String(cores) + '.0' }],
    model: { speedup: f2(cSeq / cProc), ideal: String(cores) },
  },
  'sync/critical': {
    wrong: [[{ lines: ['4', '6'] }, /Almost/], [{ lines: ['3', '4', '5', '6'] }, /Lines 1 to 3/], [{ lines: ['7'] }, /only prints/]],
    alts: [], model: { lines: ['4', '5', '6'] },
  },
  'sync/lock': { wrong: [[{ out: codes.ward[0] }, /different task/]], alts: [{ out: codes.lock[0] }], model: { out: terminal(codes.lock[0]) } },
  'sync/deadlock': {
    wrong: [[{ fix: 'sleep' }, /even more likely/], [{ fix: 'kill' }, /Fix the cause/], [{ fix: 'more' }, /does not help/]],
    alts: [], model: { fix: 'order' },
  },
  'final/plan': {
    wrong: [
      [{ receive: 'cpu', trend: 'cpu', display: 'light', design: 'mixed' }, /only waits/],
      [{ receive: 'io', trend: 'io', display: 'light', design: 'mixed' }, /keeps the CPU busy/],
      [{ receive: 'io', trend: 'cpu', display: 'io', design: 'mixed' }, /microseconds/],
      [{ receive: 'io', trend: 'cpu', display: 'light', design: 'threads' }, /GIL/],
    ],
    alts: [], model: { receive: 'io', trend: 'cpu', display: 'light', design: 'mixed' },
  },
  'final/simulator': { wrong: [[{ out: codes.lock[0] }, /different task/]], alts: [{ out: codes.ward[0] }], model: { out: terminal(codes.ward[0]) } },

  // ---------------------------------------------------------------- scheduler steps
  'sync/race': { wrong: [[[0, 0, 0, 1, 1, 1], /No update was lost/], [[1, 1, 1, 0, 0, 0], /No update was lost/]], alts: [[1, 0, 1, 0, 1, 0], [0, 1, 1, 0, 1, 0]], model: [0, 1, 0, 1, 0, 1] },
  'sync/with-lock': { wrong: [[[0, 0, 0, 0, 0, 1, 1, 1, 1, 1], /never tried to sneak in/]], alts: [[0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1]], model: [0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1] },
};
