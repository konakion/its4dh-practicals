# ITS4DH Practical Lab

Interactive 90-minute practicals for the course *IT Systems for Digital Health Experts*
(HPI, University of Potsdam). Students read a short explanation, see one example, try it
themselves and get immediate feedback on the real result. Every chapter ends with a quiz.

Public site: https://konakion.github.io/its4dh-practicals/

| Session | Topic | Status |
|---|---|---|
| Practical 01 | OS fundamentals: the Linux terminal | ready |
| Practical 02 | Processes & threads | ready |
| Practical 03 | IPC & scheduling | ready |
| Practical 04 | Memory & isolation | coming soon (placeholder) |

## How it works

| Part | File |
|---|---|
| List of all sessions (level 1 navigation) | `docs/assets/practicals.js` |
| Content of one session (chapters, exercises, checks, quizzes) | `docs/assets/practical-NN.js` |
| One page per session | `docs/practical-NN.md` (front matter `practical: practical-NN`) |
| Engine for all sessions (navigation, checking, quizzes, progress, charts) | `docs/assets/course-app.js` |
| Linux session API (main thread) | `docs/assets/linux-session.js` |
| Linux in a Web Worker (v86 + Linux 6.8 + BusyBox) | `docs/assets/shell-worker.js`, `docs/assets/linux/` |
| Files copied into the student's home folder | `docs/assets/fixtures/` (byte copies of `data/`) |
| Page template and styles | `theme/main.html`, `docs/assets/practical.css` |
| Codespaces lab of Practical 02 (checker, starter files) | `labs/practical-02/` |
| One-page cheat sheets per session (HTML source and PDF) | `cheatsheet/` |

The home page lists the sessions; each session is its own page with its own Linux system and its
own progress (`localStorage` key `<id>-progress-v2`). Old Practical 01 links (`#/chapter/step` on
the home page) are redirected to `practical-01/`.

**Step modes.** Every step has Learn, Example and Your turn, hints, a solution after two failed
attempts, and feedback that explains the result.

- *shell* (default): the command runs in the browser Linux. A second command (`check.expect` or
  `check.state`) runs in the same Linux and the page compares results, never the typed text.
  A practical can define a `prelude` that is sourced before every command (Practical 02: course
  programs on the `PATH`, job control on).
- *report*: work outside the page, for example in the Codespaces terminal. The student pastes the
  output of a checker or enters their own numbers; `verify(values, ctx)` judges it. Values saved by
  one step (`save`) are available to later steps (`ctx.saved('chapter/step')`) and to `chart()`.
- *interleave*: a deterministic "you are the scheduler" exercise with two threads, a shared counter
  and an optional lock.

**Charts.** `chart(saved, ctx)` returns `bars`, `timeline` or `gantt` (one row per job, several
time slices per row, used for the schedules of Practical 03).

**Practical 03** runs completely in the browser Linux: pipes and a named pipe, a local socket server
(`station`, `echoserver`, built on socat), a real race condition between two `admit` processes and its
fix with `flock`, a real deadlock between two `syncjob`s, and the Linux scheduler (`crunch`, `nice`,
`renice`). Scheduling algorithms and the semaphore trace are calculated by hand (report steps). In the
emulated Linux, CPU shares measured under different nice values are not reproducible, so the practical
measures only equal shares and calculates the effect of nice from the kernel's weights.

**Practical 02 in Codespaces.** `python3 p02.py check TASK` (in `labs/practical-02`) runs the
student's program, measures it, inspects the code with `ast` and prints specific feedback. On
success it prints a result code such as `P02-THREADS-2.01-QK7M`: the numbers are the measured
values, the last four characters a checksum (`signature()` in `p02.py` and `course-app.js`).
Students work in `labs/practical-02/work` (created by `python3 p02.py start`, ignored by git);
`starter/` keeps the originals, `python3 p02.py reset FILE` restores one.

## Preview locally

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m mkdocs serve
```

Open http://127.0.0.1:8000/its4dh-practicals/ (MkDocs serves the GitHub Pages base path).

## Checks

```bash
.venv/bin/python scripts/check.py          # datasets, browser copies, registry, Linux image checksums
node scripts/test_learning.cjs             # engine, structure of all sessions, P01 in a real shell,
                                           # P02 lab checker (runs scripts/test_lab_02.py), answers, Python examples
.venv/bin/python -m mkdocs build --strict
.venv/bin/python scripts/check_site.py     # links and base path in site/
```

The browser test runs every example, exercise (wrong, alternative and model solutions), report
and scheduler step, quiz, and the navigation of all ready sessions against the real browser Linux.
It needs Playwright with Chromium and a static server that serves `site/` under `/its4dh-practicals/`:

```bash
npm install --no-save playwright@1.56.0 && npx playwright install chromium
mkdir -p /tmp/serve && ln -sfn "$PWD/site" /tmp/serve/its4dh-practicals
(cd /tmp/serve && python3 -m http.server 8000 --bind 127.0.0.1 &)
PREVIEW_URL=http://127.0.0.1:8000/its4dh-practicals/ node scripts/test_course_browser.cjs
# ONLY=practical-02 limits the run to one session
```

`.github/workflows/check.yml` runs all of this on every push. `deploy.yml` publishes `site/` to
GitHub Pages and only runs when started manually.

## Adding a practical (example: Practical 03)

1. **Content.** Copy `docs/assets/practical-02.js` to `docs/assets/practical-03.js`. Set
   `id: 'its4dh-p03'`, `number`, `title`, `files`, `intro`, `chapters`, `summary` and `done`.
   Keep 2 to 4 short sentences per Learn text, an example that differs from the task, hints, a
   solution, and 2 to 3 quiz questions per chapter (one review question from chapter 2 on).
   Example outputs of shell steps must come from the browser Linux. An example that needs the
   step's `setup` (for example a running server) gets `afterSetup: true`.
2. **Files for the browser Linux** (if any): put the originals into `data/practical-03/`, byte
   copies into `docs/assets/fixtures/p03/`, list them in `files` (`readOnly`, `exec` as needed) and
   add the pairs to `scripts/check.py`.
3. **Page and registry.** Create `docs/practical-03.md` (copy `practical-02.md`, change the front
   matter to `practical: practical-03`), add it to `nav` in `mkdocs.yml`, and set the entry in
   `docs/assets/practicals.js` to `status: 'ready'`.
4. **Codespaces work** (optional): add `labs/practical-03/` with its own checker, modelled on
   `labs/practical-02/p02.py` (same `signature()`), starter files and a `scripts/test_lab_03.py`.
5. **Tests.** Add `scripts/cases/practical-03.cjs` with wrong and correct attempts for every step.
   `test_learning.cjs` and `test_course_browser.cjs` pick up every ready session from the registry
   automatically. Run all checks above and look at the screenshots.

No engine or template changes are needed for a new session.

## Limitations

- BusyBox tools: options used in the practicals behave like GNU, rarely used options may be missing.
  Interactive programs (`less`, `nano`, `vi`, live `top`) cannot be used in the page; Practical 02
  uses a Codespace for them. Each Run in the page is a new shell, so `jobs` and `fg` only see jobs
  started in the same Run.
- Codespaces need a GitHub account; the free monthly quota of personal accounts is enough for a
  practical, but students should stop their Codespace afterwards.
- Measured times in Practical 02 depend on the machine. The checker accepts ranges, not fixed values;
  multiprocessing speedups depend on the number of cores of the Codespace.
- Boot downloads about 12 MB once and takes a few seconds; tested in Chromium. Firefox, Safari and
  older phones should be checked before the session.
- Checks are formative self-assessment in the student's own browser, not tamper-proof grading.
  Progress is stored in `localStorage` only.
- The Linux image (`buildroot-bzimage68.bin`) is the unchanged image from the v86 project; see
  `docs/assets/linux/NOTICE.txt` for licences and the GPL source obligations before redistribution.
