/*
 * End-to-end test of the interactive practical in a real browser (Playwright + Chromium).
 * Every example and exercise runs in the real browser Linux; nothing is mocked.
 *
 *   PREVIEW_URL=http://127.0.0.1:8000/its4dh-practicals/ node scripts/test_course_browser.cjs
 *
 * Needs a static server for site/ under the GitHub Pages base path, and Playwright.
 * Screenshots go to TEST_ARTIFACT_DIR (default: the OS temp directory).
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

const BASE = (process.env.PREVIEW_URL || 'http://127.0.0.1:8000/its4dh-practicals/').replace(/\/?$/, '/');
const OUT = process.env.TEST_ARTIFACT_DIR || os.tmpdir();

// Per exercise: wrong commands (with expected feedback), alternative correct solutions.
// `undo` runs directly in Linux afterwards so that the next attempt starts cleanly.
const CASES = {
  'terminal/first-command': { wrong: [['hostnme', /does not know the command/], ['whoami', /not what the task asks/]], alts: ['uname -n'] },
  'terminal/pwd': { wrong: [['pwd', /Only one line/], ['pwd\nwhoami', /other way round/], ['echo "oops', /quote/]], alts: ['whoami; pwd', 'echo $USER\necho $PWD'] },
  'terminal/ls': { wrong: [['ls', /list of your current folder/], ['ls note', /does not exist/]], alts: ['ls ~/notes', 'ls -l notes', 'cd notes; ls'] },
  'terminal/ls-l': { wrong: [['ls -lh data', /exact size in bytes/], ['ls -l notes', /notes folder/], ['ls data', /not what the task asks/]], alts: ['ls -la data', 'ls -l ~/data', 'cd data; ls -l'] },
  'navigate/cd': { wrong: [['cd dat', /does not exist/], ['cd notes', /not in the data folder/]], alts: ['cd ~/data', 'cd /home/student/data'] },
  'navigate/dotdot': { wrong: [['ls', /data folder itself/], ['ls config', /neighbour of data/], ['ls ~/config', /This exercise is about/]], alts: ['cd ..; ls config', 'ls ../config/'] },
  'navigate/tilde': { wrong: [['cd config', /no config folder in \/usr\/share/], ['cd ~', /not in your config folder/]], alts: ['cd /home/student/config', 'cd\ncd config'] },
  'navigate/absolute': { wrong: [['cd ~/notes', /full absolute path/], ['cd notes', /does not exist/]], alts: ['cd /home/student/notes/'] },
  'files/cat': { wrong: [['cat notes', /is a folder/], ['cat welcome.txt', /does not exist/]], alts: ['cat ~/notes/welcome.txt', 'cd notes; cat welcome.txt'] },
  'files/mkdir': { wrong: [['mkdir Reports', /no folder ~\/reports/, 'rmdir ~/Reports'], ['mkdir', /not valid|not what/]], alts: ['mkdir ~/reports', 'mkdir -p reports'] },
  'files/touch': { wrong: [['touch incident.txt', /home folder, not in reports/, 'rm -f ~/incident.txt'], ['touch reports/incident.text', /no file reports\/incident\.txt/, 'rm -f ~/reports/incident.text']], alts: ['cd reports; touch incident.txt'] },
  'files/cp': { wrong: [['cp upload_small.log reports', /does not exist/], ['cp data/upload.log reports/', /no copy/, 'rm -f ~/reports/upload.log']], alts: [['cp ~/data/upload_small.log ~/reports/sample.log', 'rm -f ~/reports/sample.log'], ['cd reports; cp ../data/upload_small.log .', 'rm -f ~/reports/upload_small.log']] },
  'files/mv': { wrong: [['cp reports/incident.txt reports/incident-2026-10-19.txt', /That happens with cp/, 'rm -f ~/reports/incident-2026-10-19.txt'], ['mv reports/incident.txt incident-2026-10-19.txt', /no reports\/incident-2026-10-19\.txt/, 'mv ~/incident-2026-10-19.txt ~/reports/incident.txt']], alts: [['cd reports; mv incident.txt incident-2026-10-19.txt', 'mv ~/reports/incident-2026-10-19.txt ~/reports/incident.txt']] },
  'files/rm': { wrong: [['rm data/upload_small.log', /protected evidence/], ['rm reports/*', /so is your incident file/]], alts: ['cd reports; rm upload_small.log'] },
  'inspect/head': { wrong: [['head data/upload.log', /10 lines, the default/], ['head -n 5 data/upload_small.log', /records from the sample/]], alts: ['head -5 data/upload.log', 'head -n 5 ~/data/upload.log', 'cat data/upload.log | head -n 5'] },
  'inspect/tail': { wrong: [['tail data/upload.log', /Without -n/], ['head -n 1 data/upload.log', /not what the task asks/]], alts: ['tail -1 data/upload.log', 'tail -n 1 ~/data/upload.log'] },
  'inspect/wc': { wrong: [['wc -l data/upload_small.log', /size of the sample/], ['wc data/upload.log', /not what the task asks/]], alts: ['wc -l < data/upload.log', 'cat data/upload.log | wc -l', 'wc -l ~/data/upload.log'] },
  'search/grep': { wrong: [['grep connection refused data/upload_small.log', /Without quotes the shell split/], ['grep "Connection refused" data/upload_small.log', /letter case/]], alts: ['grep "connection refused" data/upload_small.log', 'grep -F refused data/upload_small.log', 'cat data/upload_small.log | grep refused'] },
  'search/grep-c': { wrong: [['grep -c error data/upload.log', /case-sensitive/], ['grep -c ERROR data/upload_small.log', /count for the sample/], ['grep ERROR data/upload.log', /lines themselves/]], alts: ['grep ERROR data/upload.log | wc -l', "grep -c ' ERROR ' data/upload.log", 'grep -cF ERROR ~/data/upload.log'] },
  'search/grep-device': { wrong: [['grep band-42 data/upload.log', /found or printed nothing/], ['grep band-042 data/upload_small.log', /found or printed nothing/]], alts: ['grep -F band-042 data/upload.log', 'cat data/upload.log | grep band-042'] },
  'search/grep-F': { wrong: [['grep -c . notes/welcome.txt', /11 is the number of non-empty lines/]], alts: ["grep -cF '.' notes/welcome.txt", 'grep -F . notes/welcome.txt | wc -l'] },
  'combine/pipe': { wrong: [["grep 'connection refused' data/upload.log", /all 50 matching records/], ["grep 'connection refused' data/upload.log | head -n 3", /not what the task asks/]], alts: ['grep refused data/upload.log | tail -3', "cat data/upload.log | grep 'connection refused' | tail -n 3"] },
  'combine/redirect': { wrong: [['grep ERROR data/upload.log', /no file reports\/errors\.txt/], ['grep ERROR data/upload_small.log > reports/errors.txt', /does not contain exactly/]], alts: ["grep ' ERROR ' data/upload.log > reports/errors.txt", 'cd reports; grep ERROR ../data/upload.log > errors.txt'] },
  'combine/append': { wrong: [["grep -c 'connection refused' data/upload.log > reports/summary.txt", /title has disappeared/], ['echo hello >> reports/summary.txt', /no line with the correct count/]], alts: ["echo \"connection refused: $(grep -c 'connection refused' data/upload.log)\" >> reports/summary.txt", "grep 'connection refused' data/upload.log | wc -l >> reports/summary.txt"] },
  'mission/window': { wrong: [['grep ERROR data/upload.log | head -n 1', /One of the two records/], ['grep ERROR data/upload.log | tail -n 1\ngrep ERROR data/upload.log | head -n 1', /not what the task asks/]], alts: ['grep -m 1 ERROR data/upload.log; grep ERROR data/upload.log | tail -n 1'] },
  'mission/narrow': { wrong: [["grep '09:04' data/upload.log | grep ERROR", /not what the task asks/]], alts: ['grep timeout data/upload.log | grep 09:04', "grep '09:04 ERROR' data/upload.log | grep -F 'upload timeout'"] },
  'mission/report': { wrong: [['grep -c ERROR data/upload.log > reports/report.txt', /not have exactly three lines/], ["grep -c 'upload timeout' data/upload.log > reports/report.txt\ngrep -c 'connection refused' data/upload.log >> reports/report.txt\ngrep -c WARN data/upload.log >> reports/report.txt", /count is wrong/]], alts: ["echo \"errors: $(grep -c ERROR data/upload.log)\" > reports/report.txt\necho \"refused: $(grep -c 'connection refused' data/upload.log)\" >> reports/report.txt\necho \"timeouts: $(grep -c timeout data/upload.log)\" >> reports/report.txt"] },
  'bonus/frequency': { wrong: [["cut -d ' ' -f 4- data/upload.log | sort | uniq -c", /not what the task asks/]], alts: ["grep ERROR data/upload.log | cut -d ' ' -f 4- | sort | uniq -c | sort -rn"] },
  'bonus/distinct': { wrong: [["cut -d ' ' -f 3 data/upload.log | wc -l", /counts every record/]], alts: ["cut -d ' ' -f 3 data/upload.log | sort | uniq | wc -l"] },
};

const norm = s => s.replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
const maskDates = s => s.replace(/[A-Z][a-z]{2} +\d+ \d\d:\d\d/g, 'DATE');
let passed = 0;
const ok = (msg) => { passed++; console.log('PASS', msg); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('dialog', d => d.accept());

  const t0 = Date.now();
  await page.goto(BASE);
  await page.waitForFunction(() => window.practicalLinux && window.practicalLinux.state === 'ready', null, { timeout: 120000 });
  console.log(`Linux ready after ${Date.now() - t0} ms; crossOriginIsolated=${await page.evaluate(() => crossOriginIsolated)}`);
  const C = await page.evaluate(() => JSON.parse(JSON.stringify(window.PRACTICAL, (k, v) => (v instanceof RegExp ? v.source : v))));

  // ---------------------------------------------------------------- structure
  for (const ch of C.chapters) {
    assert(ch.quiz.length >= 2 && ch.quiz.length <= 3, `${ch.id}: 2-3 quiz questions`);
    for (const st of ch.steps) {
      const id = `${ch.id}/${st.id}`;
      const words = st.learn.join(' ').split(/\s+/).length;
      assert(words >= 25 && words <= 85, `${id}: learn text has ${words} words`);
      assert(st.example && st.task && st.check && st.solution && st.hints.length, `${id}: complete step`);
      assert.notEqual(norm(st.example.cmd), norm(st.solution), `${id}: example and solution differ`);
      assert(CASES[id], `${id}: has test cases`);
      assert(CASES[id].wrong.length >= 1 && CASES[id].alts.length >= 1, `${id}: wrong and alternative cases`);
    }
    for (const q of ch.quiz) {
      assert(q.options.some(o => o.correct), `${ch.id}: quiz has a correct option`);
      assert(q.options.every(o => o.why), `${ch.id}: every option explained`);
      if (!q.multi) assert.equal(q.options.filter(o => o.correct).length, 1, `${ch.id}: single-answer question`);
    }
  }
  ok('content structure: consistent learn/example/task/check/hints/quiz in every chapter; examples differ from solutions');

  // ---------------------------------------------------------------- examples
  for (const ch of C.chapters) for (const st of ch.steps) {
    const ex = st.example;
    const r = await page.evaluate(async ({ start, cmd }) => {
      const L = window.practicalLinux;
      await L.reset();
      if (start) await L.exec('cd ' + start.replace(/^~/, '"$HOME"'));
      return L.exec(cmd);
    }, { start: ex.start || st.start, cmd: ex.cmd });
    const got = ex.volatile ? maskDates(norm(r.stdout)) : norm(r.stdout);
    const want = ex.volatile ? maskDates(norm(ex.out)) : norm(ex.out);
    assert.equal(r.stderr, '', `${ch.id}/${st.id} example stderr`);
    assert.equal(got, want, `${ch.id}/${st.id} example output`);
  }
  ok('every example output reproduced in the real browser Linux');
  await page.evaluate(() => window.practicalLinux.reset());

  // ---------------------------------------------------------------- exercises through the UI
  const go = async hash => { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForSelector('h1'); };
  const feedback = () => page.locator('.feedback').innerText();
  async function run(cmd) {
    const before = await page.locator('.run-entry').count();
    await page.fill('#command', cmd);
    await page.click('.run');
    await page.waitForFunction(n => document.querySelectorAll('.run-entry').length > n && !document.querySelector('.run').disabled && document.querySelector('.feedback').textContent, before, { timeout: 30000 });
    return { text: await feedback(), cls: await page.getAttribute('.feedback', 'class') };
  }
  async function resetExercise() {
    await page.click('text=Reset exercise');
    await page.waitForFunction(() => !document.querySelector('.term-actions .quiet').disabled && !document.querySelector('.term-log').children.length);
  }
  const undo = cmd => page.evaluate(c => window.practicalLinux.exec(c), cmd);

  for (const ch of C.chapters) {
    for (const [i, st] of ch.steps.entries()) {
      const id = `${ch.id}/${st.id}`, cases = CASES[id];
      await go(`#/${ch.id}/${i + 1}`);
      assert.equal(await page.locator('h1').innerText(), st.title);
      assert.equal(await page.locator('.section-title').allInnerTexts().then(t => t.join('|')), 'Learn|Example|Your turn', `${id}: consistent sections`);
      if (st.start) await page.waitForFunction(p => document.querySelector('.prompt').textContent.endsWith(':' + p + '$'), st.start);
      for (const [cmd, expect, after] of cases.wrong) {
        await resetExercise();
        const r = await run(cmd);
        assert.match(r.cls, /retry|partial/, `${id}: rejects ${JSON.stringify(cmd)} (${r.text})`);
        assert.match(r.text, expect, `${id}: feedback for ${JSON.stringify(cmd)}`);
        if (after) await undo(after);
      }
      for (const alt of cases.alts) {
        const [cmd, after] = Array.isArray(alt) ? alt : [alt];
        await resetExercise();
        const r = await run(cmd);
        assert.match(r.cls, /\bok\b/, `${id}: accepts ${JSON.stringify(cmd)} (${r.text})`);
        if (after) await undo(after);
      }
      await resetExercise();
      const r = await run(st.solution);
      assert.match(r.cls, /\bok\b/, `${id}: accepts model solution (${r.text})`);
      assert(r.text.includes(st.success.replace(/`|\*\*/g, "").slice(0, 20)), `${id}: success explanation shown`);
      ok(`${id}: ${cases.wrong.length} wrong, ${cases.alts.length} alternative, model solution`);
    }
  }

  // hints and solution reveal
  await go('#/inspect/2');
  for (let k = 0; k < 2; k++) await run('tail data/upload.log');
  await page.click('text=Show a hint');
  assert.equal(await page.locator('.hint').count(), 1);
  await page.click('text=Show a possible solution');
  assert.match(await page.locator('.solution pre').innerText(), /tail -n 1/);
  ok('progressive hints and solution reveal after failed attempts');

  // generic errors and recovery
  await go('#/terminal/2');
  let r = await run('while :; do :; done');
  assert.match(r.text, /10 seconds/);
  r = await run('whoami; pwd');
  assert.match(r.cls, /\bok\b/);
  r = await run('cat');
  assert.match(r.text, /printed nothing|not what/);
  ok('endless loop stopped after 10 s, session survives; stdin-reading command returns');

  // state persists between exercises; files survive navigation
  r = await page.evaluate(() => window.practicalLinux.exec('cat ~/reports/report.txt; ls ~/reports'));
  assert.match(r.stdout, /^100\n50\n50\n/);
  assert.match(r.stdout, /errors\.txt/);
  ok('files from earlier chapters persist in the session');

  // ---------------------------------------------------------------- quizzes
  for (const ch of C.chapters) {
    await go(`#/${ch.id}/quiz`);
    assert.equal(await page.locator('.why:visible').count(), 0, `${ch.id}: no explanations before submit`);
    assert.equal(await page.locator('.is-correct').count(), 0, `${ch.id}: no answers revealed before submit`);
    assert(await page.locator('text=Check my answers').isDisabled());
    // first attempt: wrong answers
    for (const [qi, q] of ch.quiz.entries()) {
      const wrong = q.options.findIndex(o => !o.correct);
      await page.locator(`fieldset.question:nth-of-type(${qi + 1}) input`).nth(wrong).check();
    }
    await page.click('text=Check my answers');
    assert.match(await page.locator('.score').innerText(), new RegExp(`^0 of ${ch.quiz.length} correct`));
    assert.equal(await page.locator('.why:visible').count(), ch.quiz.reduce((n, q) => n + q.options.length, 0), `${ch.id}: every option explained after submit`);
    // retry: all correct
    await page.click('text=Try the quiz again');
    for (const [qi, q] of ch.quiz.entries()) for (const [oi, o] of q.options.entries())
      if (o.correct) await page.locator(`fieldset.question:nth-of-type(${qi + 1}) input`).nth(oi).check();
    await page.click('text=Check my answers');
    assert.equal(await page.locator('.score').innerText(), `${ch.quiz.length} of ${ch.quiz.length} correct`);
    ok(`${ch.id} quiz: hidden answers, wrong attempt explained, retry, full score`);
  }

  // ---------------------------------------------------------------- progress, done page, mobile
  await page.reload();
  await page.waitForSelector('.overall-text');
  assert.match(await page.locator('.overall-text').innerText(), /^34 of 34/);
  ok('progress persists after reload');
  await go('#/done');
  assert.equal(await page.locator('h1').innerText(), 'Practical complete');
  assert.equal(await page.locator('.summary tbody tr').count(), C.summary.length);
  assert.equal(await page.locator('.done-page fieldset.question').count(), 5);
  ok('completion page with command summary and mixed review quiz');

  await page.screenshot({ path: path.join(OUT, 'practical-desktop-done.png'), fullPage: true });
  for (const [w, hgt] of [[390, 844], [768, 1024]]) {
    await page.setViewportSize({ width: w, height: hgt });
    for (const hash of ['#/', '#/files/4', '#/search/quiz', '#/done']) {
      await go(hash);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(over <= 0, `no horizontal overflow at ${w}px on ${hash}`);
    }
    await go('#/navigate/2');
    await page.waitForFunction(() => document.querySelector('.prompt').textContent.endsWith(':~/data$'));
    await page.screenshot({ path: path.join(OUT, `practical-${w}.png`), fullPage: true });
    await page.click('.menu-button');
    assert(await page.locator('.sidebar').isVisible());
    await page.keyboard.press('Escape');
  }
  ok('responsive layout at 390 and 768 px without horizontal overflow; chapter menu opens');
  await page.setViewportSize({ width: 1366, height: 900 });

  // keyboard-only run
  await go('#/terminal/1');
  await page.waitForFunction(() => window.practicalLinux.state === 'ready', null, { timeout: 120000 });
  await page.focus('#command');
  await page.keyboard.type('hostname');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.run-entry').length === 1 && /Correct/.test(document.querySelector('.feedback').textContent));
  ok('keyboard: Enter runs the command');

  // restart Linux from the sidebar: fresh files, progress kept
  await page.click('text=Restart Linux with fresh files');
  await page.waitForFunction(() => window.practicalLinux.state === 'ready');
  r = await page.evaluate(() => window.practicalLinux.exec('ls ~'));
  assert.equal(norm(r.stdout), 'config\ndata\nnotes');
  assert.match(await page.locator('.overall-text').innerText(), /^34 of 34/);
  ok('Restart Linux restores fresh files and keeps progress');

  await page.click('text=Reset my progress');
  await page.waitForSelector('.welcome');
  assert.match(await page.locator('.overall-text').innerText(), /^0 of 34/);
  ok('Reset my progress clears saved progress');

  await page.goto(BASE + 'about/');
  assert.match(await page.locator('h1').innerText(), /About this practical/);
  ok('about page under the base path');

  assert.deepEqual(problems, []);
  await browser.close();
  console.log(`ALL PASS (${passed} checks)`);
})().catch(e => { console.error(e); process.exit(1); });
