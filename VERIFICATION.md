# Verification, 25 October 2026

Extension of the lab with Practical 02 (Processes & threads) and a two-level navigation
(session overview, chapters per session). Practical 01 content is unchanged; it moved from the
site root to `practical-01/`, old links are redirected and saved progress is kept.

## Automated results

| Check | Result |
|---|---|
| `python3 scripts/check.py` | PASS: datasets unchanged (8 records/4 ERROR, 1,000 records/100 ERROR, 50 refused, 50 timeouts, 100 devices); all browser copies byte-identical to `data/` (including the Practical 02 programs); ready sessions practical-01 and practical-02 have page, nav entry and course files; Linux image matches `manifest.json`; Practical 02 lab present |
| `node scripts/test_learning.cjs` | PASS: engine unit tests (checker modes, result-code checksum identical in JavaScript and Python, scheduler: lost update without lock and 12 in all 252 interleavings with lock); structure of 2 sessions, 16 chapters, 55 exercises; Practical 01: 26 example outputs, 29 model solutions, 55 alternatives, 58 wrong attempts in a real shell; Practical 02: lab checker (below), 61 answers through the page's `verify()` with real result codes, 7 Python examples print exactly what the page shows |
| `python3 scripts/test_lab_02.py` (run by test_learning, also alone with Python 3.12.3 and 3.13.17) | PASS, 33 checks: untouched starter files rejected with specific feedback; typical mistakes explained (missing file, wrong letter case, syntax error, unsaved file, time measured too early, `target=f()`, `join()` inside the loop, no `join()`, `run()` instead of `start()`, result not returned, pause removed, lock per call, lock only around the write, still sequential); model solutions pass; starter `counter.py` loses updates reliably; sequential ≈ 6.0 s, threads ≈ 2.0 s, CPU work: threads not faster (GIL), processes faster on 2 cores |
| `mkdocs build --strict --clean` | PASS (MkDocs 1.6.1, custom theme) |
| `python3 scripts/check_site.py` | PASS: 4 pages, 25 local links and assets, all relative to `/its4dh-practicals/` |
| `node scripts/test_course_browser.cjs` (Chromium, static server under the Pages base path) | ALL PASS, 85 checks |
| Mutation checks | A wrong speedup formula in `practical-02.js` fails test_learning; a wrong example output fails the browser test; a too lenient threshold in `p02.py` fails test_lab_02 |

The browser test covers, against the real Linux in the page:

- overview: 4 sessions, 2 ready links, 2 "coming soon"; old `#/chapter/step` links redirected to Practical 01; completed sessions marked;
- Practical 01: everything from the previous verification (29 examples, 29 exercises with 58 wrong and 55 alternative attempts, hints, timeout recovery, offline execution, persistence, 8 quizzes);
- Practical 02: all 11 shell examples reproduced in the browser Linux; 11 shell exercises with wrong attempts, alternatives and model solutions (processes, PID/PPID, top, `&`, `jobs`, `fg`, SIGTERM, SIGKILL on a frozen monitor, mini-challenge, `/proc`); 13 report steps with pasted result codes, wrong answers and charts from the measured values; 2 scheduler steps; hints and solution on a report step; endless loop stopped with job control on; exercise setups stop the programs of other steps; `kill 1` refused and explained; measured values survive a reload; 8 quizzes;
- for both sessions: progress after reload, completion page, session switcher, layout at 390, 768 and 1366 px without horizontal overflow, Enter runs a command, Restart Linux (fresh files, all programs stopped, progress kept), Reset my progress;
- no page errors and no failed HTTP requests.

Boot time in the test container: about 12 to 15 s per session (12 MB of emulator assets from a
local server). `crossOriginIsolated` is false: GitHub Pages works as is.

## Not tested

The Codespace itself (the devcontainer image was not built here; the Python parts were run with
Python 3.12 and 3.13 on a 2-core Linux machine), nano and vim interactively, Firefox, Safari, real
phones and tablets, screen readers, the live GitHub Pages deployment and the GitHub Actions run.
