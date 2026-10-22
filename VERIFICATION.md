# Verification, 22 October 2026

Redesign of Practical 01 as an interactive course with real browser Linux in every chapter.
Updated after the CI fix: `check.yml` now runs `test_learning.cjs` instead of the removed
`test_learning.py` / old `test_learning.cjs`, which tested the replaced `learning.json` quiz.

## Automated results

| Check | Result |
|---|---|
| `python3 scripts/check.py` | PASS: datasets unchanged (8 records/4 ERROR, 1,000 records/100 ERROR, 50 connection refused, 50 upload timeout, 100 devices); browser copies byte-identical to `data/`; Linux image matches `manifest.json` |
| `node scripts/test_learning.cjs` | PASS: checker unit tests; structure of all 8 chapters and 29 exercises; 26 example outputs, 29 model solutions, 55 alternative solutions and 58 wrong attempts run in a real shell (GNU tools) with the course files |
| `mkdocs build --strict --clean` | PASS (MkDocs 1.6.1, custom theme, no Material dependency) |
| `python3 scripts/check_site.py` | PASS: all links and assets relative, valid under `/its4dh-practicals/` |
| `node scripts/test_course_browser.cjs` (Chromium, static server under the Pages base path) | ALL PASS, 50 checks |
| `mkdocs serve` preview | Linux boots, exercise checked correctly, no failed requests |

The browser test covers, against the real Linux in the page:

- all 29 example outputs reproduced exactly (dates masked for `ls -l`);
- all 29 exercises: 58 typical wrong commands with the expected feedback, 55 alternative correct
  solutions, and every model solution;
- examples differ from solutions in every step; consistent Learn / Example / Your turn sections;
- hints and solution reveal; endless loop stopped after 10 s with the session intact;
  `cat` without input returns immediately; files persist across chapters;
- all 8 quizzes: answers hidden before submission, every option explained afterwards, retry,
  full score; mixed review on the completion page;
- progress after reload, Restart Linux (fresh files, progress kept), Reset my progress;
- layout at 390, 768 and 1366 px without horizontal overflow; Enter runs a command;
- commands still run with the browser offline after Linux has started;
- no page errors and no failed HTTP requests.

Boot time in the test container: about 9.5 s (includes 12 MB of emulator assets from a local
server). `crossOriginIsolated` is false: no special headers are needed, so GitHub Pages works as is.

## Not tested

Firefox, Safari, real phones and tablets, screen readers, the live GitHub Pages deployment and the
GitHub Actions run itself.
