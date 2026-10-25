/*
 * End-to-end test of the practical lab in a real browser (Playwright + Chromium).
 * Every example and exercise runs in the real browser Linux; nothing is mocked.
 *
 *   PREVIEW_URL=http://127.0.0.1:8000/its4dh-practicals/ node scripts/test_course_browser.cjs
 *
 * Needs a static server for site/ under the GitHub Pages base path, and Playwright.
 * Screenshots go to TEST_ARTIFACT_DIR (default: the OS temp directory).
 * ONLY=practical-02 limits the run to one practical.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');

const BASE = (process.env.PREVIEW_URL || 'http://127.0.0.1:8000/its4dh-practicals/').replace(/\/?$/, '/');
const OUT = process.env.TEST_ARTIFACT_DIR || os.tmpdir();

const norm = s => s.replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
const maskDates = s => s.replace(/[A-Z][a-z]{2} +\d+ \d\d:\d\d/g, 'DATE');
const maskNumbers = s => s.replace(/\d+/g, 'N').replace(/ +/g, ' ');
const mask = (ex, s) => (ex.volatile === 'numbers' ? maskNumbers(s) : ex.volatile ? maskDates(s) : s);
let passed = 0;
const ok = (msg) => { passed++; console.log('PASS', msg); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('dialog', d => d.accept());

  // ---------------------------------------------------------------- level 1: the lab overview
  await page.goto(BASE);
  await page.waitForSelector('.lab-home');
  const LAB = await page.evaluate(() => window.ITS4DH_LAB);
  const ready = LAB.sessions.filter(s => s.status === 'ready');
  assert.equal(await page.locator('.session').count(), LAB.sessions.length);
  assert.equal(await page.locator('.session > a').count(), ready.length, 'only ready sessions are links');
  assert.equal(await page.locator('.session.soon').count(), LAB.sessions.length - ready.length);
  assert.match(await page.locator('.session.soon').first().innerText(), /Coming soon/);
  assert.equal(await page.evaluate(() => window.practicalLinux), undefined, 'no Linux on the overview page');
  await page.screenshot({ path: path.join(OUT, 'lab-overview.png'), fullPage: true });
  ok(`overview lists ${LAB.sessions.length} sessions, ${ready.length} ready, the others marked coming soon`);

  // links from before the lab had several sessions still work
  await page.goto(BASE + '#/files/4');
  await page.waitForURL(/practical-01\/#\/files\/4$/);
  await page.waitForSelector('h1');
  assert.equal(await page.locator('h1').innerText(), 'Copy with cp');
  ok('old Practical 01 links (#/chapter/step) are redirected to practical-01/');

  const only = process.env.ONLY;
  for (const sess of ready) if (!only || only === sess.slug) await testPractical(sess);

  // overview shows the progress of the completed practicals, then reset
  await page.goto(BASE);
  await page.waitForSelector('.lab-home');
  for (const sess of ready) if (!only || only === sess.slug) {
    assert.match(await page.locator(`.session a[href$="${sess.slug}/"]`).innerText(), /Completed/, `${sess.slug} shown as completed`);
  }
  ok('overview shows completed practicals');
  for (const sess of ready) if (!only || only === sess.slug) {
    await page.goto(BASE + sess.slug + '/');
    await page.waitForSelector('.overall-text');
    await page.click('text=Reset my progress');
    await page.waitForSelector('.welcome');
    assert.match(await page.locator('.overall-text').innerText(), /^0 of /);
  }
  ok('Reset my progress clears saved progress');

  await page.goto(BASE + 'about/');
  assert.match(await page.locator('h1').innerText(), /About/);
  ok('about page under the base path');

  assert.deepEqual(problems, []);
  await browser.close();
  console.log(`ALL PASS (${passed} checks)`);

  // ================================================================ one practical
  async function testPractical(sess) {
    const PAGE = BASE + sess.slug + '/';
    const CASES = require(`./cases/${sess.slug}.cjs`);
    const t0 = Date.now();
    await page.goto(PAGE);
    await page.waitForFunction(() => window.practicalLinux && window.practicalLinux.state === 'ready', null, { timeout: 120000 });
    console.log(`${sess.slug}: Linux ready after ${Date.now() - t0} ms; crossOriginIsolated=${await page.evaluate(() => crossOriginIsolated)}`);
    const C = await page.evaluate(() => JSON.parse(JSON.stringify(window.PRACTICAL, (k, v) => (v instanceof RegExp ? v.source : v))));
    const charts = await page.evaluate(() => window.PRACTICAL.chapters.flatMap(ch => ch.steps.filter(st => st.chart).map(st => ch.id + '/' + st.id)));
    const shellSteps = C.chapters.flatMap(ch => ch.steps.filter(st => !st.mode));
    const total = C.chapters.filter(c => !c.optional).reduce((n, c) => n + c.steps.length + 1, 0);

    // ---------------------------------------------------------------- examples in the real Linux
    for (const ch of C.chapters) for (const st of ch.steps) {
      if (st.mode) continue;
      const ex = st.example;
      const r = await page.evaluate(async ({ start, cmd }) => {
        const L = window.practicalLinux;
        await L.reset();
        if (start) await L.exec('cd ' + start.replace(/^~/, '"$HOME"'));
        return L.exec(cmd);
      }, { start: ex.start || st.start, cmd: ex.cmd });
      assert.equal(r.stderr, '', `${ch.id}/${st.id} example stderr`);
      assert.equal(mask(ex, norm(r.stdout)), mask(ex, norm(ex.out)), `${ch.id}/${st.id} example output`);
    }
    if (shellSteps.length) ok(`${sess.slug}: all ${shellSteps.length} example outputs reproduced in the real browser Linux`);
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
      await page.waitForFunction(() => !document.querySelector('.term-actions .quiet').disabled && !document.querySelector('.term-log').children.length, null, { timeout: 30000 });
    }
    async function answer(st, values) {
      await page.click('text=Clear my answers');
      for (const f of st.fields) {
        const v = values[f.id];
        if (v == null) continue;
        if (f.type === 'paste') await page.fill(`textarea[id^="f-${f.id}-"]`, String(v));
        else if (f.type === 'number' || f.type === 'text') await page.fill(`input.short[id^="f-${f.id}-"]`, String(v));
        else if (f.type === 'select') await page.selectOption(`select[id^="f-${f.id}-"]`, String(v));
        else for (const x of [].concat(v)) await page.check(`input[name^="f-${f.id}-"][value="${x}"]`);
      }
      await page.click('.report button[type=submit]');
      await page.waitForFunction(() => document.querySelector('.feedback').textContent);
      return { text: await feedback(), cls: await page.getAttribute('.feedback', 'class') };
    }
    async function schedule(order) {
      await page.click('text=Start over');
      for (const i of order) await page.locator('.sched-run').nth(i).click();
      await page.waitForFunction(() => document.querySelector('.feedback').textContent);
      return { text: await feedback(), cls: await page.getAttribute('.feedback', 'class') };
    }
    const undo = cmd => page.evaluate(c => window.practicalLinux.exec(c), cmd);

    for (const ch of C.chapters) {
      for (const [i, st] of ch.steps.entries()) {
        const id = `${ch.id}/${st.id}`, cases = CASES[id];
        await go(`#/${ch.id}/${i + 1}`);
        assert.equal(await page.locator('h1').innerText(), st.title);
        assert.equal(await page.locator('.section-title').allInnerTexts().then(t => t.join('|')), 'Learn|Example|Your turn', `${id}: consistent sections`);
        if (!st.mode) {
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
          assert(r.text.includes(st.success.replace(/`|\*\*/g, '').slice(0, 20)), `${id}: success explanation shown`);
          ok(`${sess.slug} ${id}: ${cases.wrong.length} wrong, ${cases.alts.length} alternative, model solution`);
          continue;
        }
        const judge = st.mode === 'interleave' ? v => schedule(v) : v => answer(st, v);
        if (st.where === 'codespace') assert(await page.locator('.cs-box .cs-cmd').count() === st.commands.length, `${id}: Codespaces commands shown`);
        for (const [v, expect] of cases.wrong) {
          const r = await judge(v);
          assert.match(r.cls, /retry|partial/, `${id}: rejects ${JSON.stringify(v)} (${r.text})`);
          assert.match(r.text, new RegExp(expect.source), `${id}: feedback for ${JSON.stringify(v)}`);
        }
        for (const v of cases.alts.concat([cases.model])) {
          const r = await judge(v);
          assert.match(r.cls, /\bok\b/, `${id}: accepts ${JSON.stringify(v)} (${r.text})`);
        }
        if (charts.includes(id)) {
          await page.waitForSelector('.chart svg rect.bar');
          assert(await page.locator('.chart svg rect.bar').count() >= 2, `${id}: chart drawn from the measured values`);
        }
        ok(`${sess.slug} ${id} (${st.mode}): ${cases.wrong.length} wrong, ${cases.alts.length + 1} correct${charts.includes(id) ? ', chart' : ''}`);
      }
    }

    // ---------------------------------------------------------------- practical-specific checks
    let r;
    if (sess.slug === 'practical-01') {
      // hints and solution reveal
      await go('#/inspect/2');
      for (let k = 0; k < 2; k++) await run('tail data/upload.log');
      await page.click('text=Show a hint');
      assert.equal(await page.locator('.hint').count(), 1);
      await page.click('text=Show a possible solution');
      assert.match(await page.locator('.solution pre').innerText(), /tail -n 1/);
      ok('progressive hints and solution reveal after failed attempts');

      await go('#/terminal/2');
      r = await run('while :; do :; done');
      assert.match(r.text, /10 seconds/);
      r = await run('whoami; pwd');
      assert.match(r.cls, /\bok\b/);
      r = await run('cat');
      assert.match(r.text, /printed nothing|not what/);
      ok('endless loop stopped after 10 s, session survives; stdin-reading command returns');

      await page.context().setOffline(true);
      r = await run('whoami; pwd');
      assert.match(r.cls, /\bok\b/);
      await page.context().setOffline(false);
      ok('commands still run with the browser offline');

      r = await page.evaluate(() => window.practicalLinux.exec('cat ~/reports/report.txt; ls ~/reports'));
      assert.match(r.stdout, /^100\n50\n50\n/);
      assert.match(r.stdout, /errors\.txt/);
      ok('files from earlier chapters persist in the session');
    } else if (sess.slug === 'practical-02') {
      // hints and solution on a report step
      await go('#/threads/2');
      for (let k = 0; k < 2; k++) await answer(C.chapters[3].steps[1], { out: 'no code here' });
      await page.click('text=Show a hint');
      await page.click('text=Show another hint');
      assert.equal(await page.locator('.hint').count(), 2);
      await page.click('text=Show a possible solution');
      assert.match(await page.locator('.solution pre').innerText(), /t\.join\(\)/);
      ok('report step: progressive hints and solution after failed attempts');

      // runaway command with job control switched on: stopped, session survives
      await go('#/processes/3');
      r = await run('while :; do :; done');
      assert.match(r.text, /10 seconds/);
      r = await run('echo $PPID');
      assert.match(r.cls, /\bok\b/);
      ok('endless loop stopped after 10 s with job control on, session survives');

      // background programs are cleaned up: Reset exercise stops the old ones, monitors stop themselves
      await go('#/manage/5');
      await resetExercise();
      r = await page.evaluate(() => window.practicalLinux.exec('sleep 1; pidof monitor | wc -w; pidof analyse | wc -w'));
      assert.equal(norm(r.stdout), '3\n0', 'exactly the three challenge monitors run');
      await go('#/manage/2');
      await resetExercise();
      r = await page.evaluate(() => window.practicalLinux.exec('pidof monitor | wc -w'));
      assert.equal(norm(r.stdout), '0', 'Reset exercise stopped the monitors of the previous step');
      ok('exercise setups stop the monitors of other steps; only the exercise programs run');

      // stopping a root process is refused with a clear explanation
      await go('#/manage/3');
      await resetExercise();
      r = await run('kill 1');
      assert.match(r.text, /belongs to another user \(root\)/);
      ok('kill on a root process is refused by Linux and explained');

      // a pasted result code survives the page reload: saved values feed later steps
      await page.reload();
      await page.waitForSelector('.overall-text');
      await go('#/threads/3');
      await page.waitForSelector('.chart svg rect.bar');
      ok('measured values are kept after a reload and shown again in the chart');
    }

    // ---------------------------------------------------------------- quizzes
    for (const ch of C.chapters) {
      await go(`#/${ch.id}/quiz`);
      assert.equal(await page.locator('.why:visible').count(), 0, `${ch.id}: no explanations before submit`);
      assert.equal(await page.locator('.is-correct').count(), 0, `${ch.id}: no answers revealed before submit`);
      assert(await page.locator('text=Check my answers').isDisabled());
      for (const [qi, q] of ch.quiz.entries()) {
        const wrong = q.options.findIndex(o => !o.correct);
        await page.locator(`fieldset.question:nth-of-type(${qi + 1}) input`).nth(wrong).check();
      }
      await page.click('text=Check my answers');
      assert.match(await page.locator('.score').innerText(), new RegExp(`^0 of ${ch.quiz.length} correct`));
      assert.equal(await page.locator('.why:visible').count(), ch.quiz.reduce((n, q) => n + q.options.length, 0), `${ch.id}: every option explained after submit`);
      await page.click('text=Try the quiz again');
      for (const [qi, q] of ch.quiz.entries()) for (const [oi, o] of q.options.entries())
        if (o.correct) await page.locator(`fieldset.question:nth-of-type(${qi + 1}) input`).nth(oi).check();
      await page.click('text=Check my answers');
      assert.equal(await page.locator('.score').innerText(), `${ch.quiz.length} of ${ch.quiz.length} correct`);
    }
    ok(`${sess.slug}: ${C.chapters.length} quizzes with hidden answers, explained wrong attempt, retry, full score`);

    // ---------------------------------------------------------------- progress, done page, navigation, layout
    await page.reload();
    await page.waitForSelector('.overall-text');
    assert.match(await page.locator('.overall-text').innerText(), new RegExp(`^${total} of ${total}`));
    ok(`${sess.slug}: progress persists after reload (${total} of ${total})`);
    await go('#/done');
    assert.equal(await page.locator('h1').innerText(), 'Practical complete');
    assert.equal(await page.locator('.summary tbody tr').count(), C.summary.length);
    assert.equal(await page.locator('.done-page fieldset.question').count(), 5);
    if (C.done && C.done.recap) assert.equal(await page.locator('.recap li').count(), C.done.recap.length);
    ok(`${sess.slug}: completion page with summary and mixed review quiz`);
    await page.screenshot({ path: path.join(OUT, `${sess.slug}-desktop-done.png`), fullPage: true });

    // session switcher (level 1) inside the practical
    await page.click('.switcher summary');
    const others = ready.filter(s => s.slug !== sess.slug);
    assert.equal(await page.locator('.switcher-list a').count(), ready.length);
    assert.equal(await page.locator('.switcher-list .sw-soon').count(), LAB.sessions.length - ready.length);
    if (others.length) {
      await page.click(`.switcher-list a[href$="${others[0].slug}/"]`);
      await page.waitForURL(new RegExp(others[0].slug + '/$'));
      await page.goBack();
      await page.waitForSelector('.overall-text');
    }
    ok(`${sess.slug}: session switcher lists all sessions and opens the others`);

    const someShell = C.chapters.flatMap(ch => ch.steps.map((st, j) => ({ ch, st, j }))).find(x => !x.st.mode && x.st.start);
    const someReport = C.chapters.flatMap(ch => ch.steps.map((st, j) => ({ ch, st, j }))).find(x => x.st.mode === 'report' && x.st.where);
    const someSched = C.chapters.flatMap(ch => ch.steps.map((st, j) => ({ ch, st, j }))).find(x => x.st.mode === 'interleave');
    const hashes = ['#/', '#/done', `#/${C.chapters[2].id}/quiz`, `#/${C.chapters[0].id}/1`]
      .concat([someReport, someSched].filter(Boolean).map(x => `#/${x.ch.id}/${x.j + 1}`));
    for (const [w, hgt] of [[390, 844], [768, 1024]]) {
      await page.setViewportSize({ width: w, height: hgt });
      for (const hash of hashes) {
        await go(hash);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert(over <= 0, `${sess.slug}: no horizontal overflow at ${w}px on ${hash}`);
      }
      const shot = someShell || C.chapters[0].steps[0] && { ch: C.chapters[0], j: 0 };
      await go(`#/${shot.ch.id}/${shot.j + 1}`);
      await page.screenshot({ path: path.join(OUT, `${sess.slug}-${w}.png`), fullPage: true });
      if (someReport) { await go(`#/${someReport.ch.id}/${someReport.j + 1}`); await page.screenshot({ path: path.join(OUT, `${sess.slug}-${w}-codespace.png`), fullPage: true }); }
      await page.click('.menu-button');
      assert(await page.locator('.sidebar').isVisible());
      await page.keyboard.press('Escape');
    }
    await page.goto(BASE);
    await page.setViewportSize({ width: 390, height: 844 });
    assert((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, 'overview fits at 390 px');
    await page.screenshot({ path: path.join(OUT, 'lab-overview-390.png'), fullPage: true });
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(PAGE);
    await page.waitForFunction(() => window.practicalLinux.state === 'ready', null, { timeout: 120000 });
    ok(`${sess.slug}: responsive layout at 390 and 768 px without horizontal overflow; chapter menu opens`);
    if (someReport) {
      await go(`#/${someReport.ch.id}/${someReport.j + 1}`);
      await page.screenshot({ path: path.join(OUT, `${sess.slug}-desktop-codespace.png`), fullPage: true });
    }
    if (someSched) {
      await go(`#/${someSched.ch.id}/${someSched.j + 1}`);
      await page.screenshot({ path: path.join(OUT, `${sess.slug}-desktop-scheduler.png`), fullPage: true });
    }

    // keyboard-only run
    const first = shellSteps[0];
    const fc = C.chapters.find(ch => ch.steps.some(s => s.id === first.id && !s.mode));
    await go(`#/${fc.id}/${fc.steps.indexOf(fc.steps.find(s => s.id === first.id)) + 1}`);
    await page.waitForFunction(() => window.practicalLinux.state === 'ready' && !document.querySelector('.run').disabled, null, { timeout: 120000 });
    await page.focus('#command');
    await page.keyboard.type(first.solution.split('\n')[0]);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.run-entry').length === 1 && document.querySelector('.feedback').textContent, null, { timeout: 30000 });
    ok(`${sess.slug}: keyboard: Enter runs the command`);

    // restart Linux from the sidebar: fresh files, programs stopped, progress kept
    await page.click('text=Restart Linux with fresh files');
    await page.waitForFunction(() => window.practicalLinux.state === 'ready');
    r = await page.evaluate(() => window.practicalLinux.exec('ls ~; pidof monitor analyse | wc -w'));
    const homeDirs = [...new Set(C.files.map(f => f.path.split('/')[0]))].sort().join('\n');
    assert.equal(norm(r.stdout), homeDirs + '\n0');
    assert.match(await page.locator('.overall-text').innerText(), new RegExp(`^${total} of ${total}`));
    ok(`${sess.slug}: Restart Linux restores fresh files, stops all programs and keeps progress`);
  }
})().catch(e => { console.error(e); process.exit(1); });
