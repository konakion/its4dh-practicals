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

// Wrong commands (with expected feedback) and alternative correct solutions per exercise.
const CASES = require('./learning_cases.cjs');

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

  // Linux needs no network once it has started
  await page.context().setOffline(true);
  r = await run('whoami; pwd');
  assert.match(r.cls, /\bok\b/);
  await page.context().setOffline(false);
  ok('commands still run with the browser offline');

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
