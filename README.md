# ITS4DH Practical 01: Linux terminal fundamentals

An interactive 90-minute practical for the course *IT Systems for Digital Health Experts*
(HPI, University of Potsdam). Students read a short explanation, see one example, type their
own command, press **Run** and get the real output of a real Linux system plus immediate
feedback. Every chapter ends with a short quiz.

Public site: https://konakion.github.io/its4dh-practicals/

## How it works

| Part | File |
|---|---|
| Course content (chapters, exercises, checks, quizzes) | `docs/assets/practical-01.js` |
| Course engine (navigation, checking, quizzes, progress) | `docs/assets/course-app.js` |
| Linux session API (main thread) | `docs/assets/linux-session.js` |
| Linux in a Web Worker (v86 + Linux 6.8 + BusyBox) | `docs/assets/shell-worker.js`, `docs/assets/linux/` |
| Files copied into the student's home folder | `docs/assets/fixtures/` (copies of `data/`) |
| Page template and styles | `theme/main.html`, `docs/assets/practical.css` |

**Execution.** The browser boots an x86 Linux in WebAssembly (v86). Commands are written to a
file and run by `/bin/sh` as the unprivileged user `student`. There is no network adapter and no
access to the host. The shell session persists: files and the current folder carry over between
exercises. Runs longer than 10 s are interrupted with Ctrl+C. *Restart Linux with fresh files*
restores the snapshot taken after boot.

**Checking.** The typed command is never compared with a stored string. After the student's
command, a second command (`expect` or `state` in the content file) runs in the same Linux and
the page compares results: the student's output with Linux's own answer, or the resulting files
and folders. Any command that produces the right result is accepted. A few exercises add a
secondary requirement (for example "use an absolute path"), reported as *Almost*.

The home folder contains `data/` (read-only evidence: `upload_small.log`, `upload.log`),
`config/platform.conf` and `notes/welcome.txt`.

## Preview locally

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m mkdocs serve
```

Open http://127.0.0.1:8000/its4dh-practicals/ (MkDocs serves the GitHub Pages base path).

## Checks

```bash
.venv/bin/python scripts/check.py          # datasets, browser copies, Linux image checksums
node scripts/test_learning.cjs             # checker, content structure, every example and exercise in a shell
.venv/bin/python -m mkdocs build --strict
.venv/bin/python scripts/check_site.py     # links and base path in site/
```

The browser test runs every example, exercise (wrong, alternative and model solutions) and quiz
against the real browser Linux. It needs Playwright with Chromium and a static server that
serves `site/` under `/its4dh-practicals/`:

```bash
npm install --no-save playwright@1.56.0 && npx playwright install chromium
mkdir -p /tmp/serve && ln -sfn "$PWD/site" /tmp/serve/its4dh-practicals
(cd /tmp/serve && python3 -m http.server 8000 --bind 127.0.0.1 &)
PREVIEW_URL=http://127.0.0.1:8000/its4dh-practicals/ node scripts/test_course_browser.cjs
```

`.github/workflows/check.yml` runs all of this on every push. `deploy.yml` publishes `site/` to
GitHub Pages and only runs when started manually.

## Writing another practical

Copy `docs/assets/practical-01.js`, change the content and the `files` list, and load the new
file in `theme/main.html`. Each step needs `learn`, `example` (with the real output), `task`,
`check`, `hints`, `solution` and `success`. Add test cases for the new steps to
`scripts/test_course_browser.cjs`; the test fails if an example output no longer matches Linux.

## Limitations

- BusyBox tools: options used in this practical behave like GNU, rarely used options may be missing.
  Interactive programs (`less`, `nano`, `vi`, `top`) cannot be used in the page.
- Boot downloads about 12 MB once and takes a few seconds; tested in Chromium. Firefox, Safari and
  older phones should be checked before the session.
- Checks are formative self-assessment in the student's own browser, not tamper-proof grading.
  Progress is stored in `localStorage` only.
- The Linux image (`buildroot-bzimage68.bin`) is the unchanged image from the v86 project; see
  `docs/assets/linux/NOTICE.txt` for licences and the GPL source obligations before redistribution.
