# Browser Linux: grep vertical prototype

Implemented in `/Users/konak/Downloads/practical-01`, tested 22 October 2026
(Europe/Berlin). Existing uncommitted changes were retained. No commits, push,
deployment or publication were performed.

## Local review

- Existing MkDocs preview: http://127.0.0.1:8000/its4dh-practicals/05-logs/
- Static HTTP test preview: http://127.0.0.1:8001/its4dh-practicals/05-logs/
- The new interaction is **chapter 5 only**. Other chapters intentionally retain
  their previous workflow until this vertical prototype is reviewed.
- English student UI: three-sentence introduction, WARN example, different ERROR
  count task, one command input, Run / Submit, stdout, stderr, exit status, actual
  result validation, original multiple-choice quiz and review/reset controls.

To restart the normal preview from the project root:

```sh
.venv/bin/python -m mkdocs serve --dev-addr 127.0.0.1:8000
```

To reproduce a plain static host, build with `.venv/bin/python -m mkdocs build
--strict --clean`, serve `site/` using any local static HTTP server, and set the
browser test's PREVIEW_URL to that server's root (including any project subpath).
No special response headers or service worker are needed by this tested build.

## Execution and isolation

The page starts a dedicated Web Worker containing locally vendored v86, a real
x86 PC emulator compiled to WebAssembly. It boots the Buildroot Linux 6.8 image
and executes commands using `/bin/sh` (BusyBox ash), not Bash or a JavaScript shell
simulation. This architecture follows v86's upstream serial-console embedding
API: https://github.com/copy/v86/blob/master/examples/serial.html.

Guest RAM is configured as 64 MiB. There is no configured network adapter/relay,
no host directory mount, and no server-side command execution. The guest's 9p
share is an in-memory browser filesystem, not the lecturer's computer filesystem.
The worker fetches local static assets and synthetic fixture copies only. Guest
shell commands do not receive browser APIs, localStorage or DOM access.

The immutable starting snapshot includes `/root/lab/data/upload_small.log` (8
lines) and `upload.log` (1,000 lines), plus `data/logs/` aliases. Each Run restores
that snapshot, writes the submitted command to an in-memory script, executes it
in Linux, and reads the actual output/error files and exit status. The output
files receive a transport sentinel because v86's file API rejects zero-byte
reads; it is removed before display/validation. User text and guest output are
rendered with textContent.

A child-shell file-size limit (`ulimit -f 128`) bounds normal output-file growth.
The page discards the entire worker after 10 seconds, even for an infinite shell
loop, and offers Restart Linux. Boot has a 90-second deadline. Each run starts in
`/root/lab` with fresh files: changes persist within a submitted script, not across
submissions. The current directory is therefore deliberately reset too.

This is formative practice, not an adversarial grading service. The guest runs
as root inside its VM; a command can break that guest and require a restart. The
browser/emulator sandbox is the host protection boundary. Snapshot/JS overhead
uses additional browser memory beyond the configured guest RAM. Mobile performance
and further browsers still need acceptance testing on students' devices.

## Result validation

A successful submission must exit with status 0 and print a single numeric count
(equal to the ERROR count derived from the source fixture). Whitespace around the
count is accepted. The validator never matches, parses or allowlists the submitted
command. `grep`, pipelines, input/output redirection and `awk` alternatives pass.
As in any public self-assessment, `printf '4\n'` can also produce the required
result; this prototype does not prove which method was used or authenticate an
exam answer. Errors remain visible independently of whether stdout matches.

## Exact local test results

Automated real-browser test: `scripts/test_shell_browser.cjs` using bundled
Playwright/Chromium, plain Python static server on port 8001. Final measured boot:
1,541 ms on this machine (not a performance guarantee). `crossOriginIsolated`
was false: no COOP/COEP or SharedArrayBuffer hosting requirement in this test.

| Test | Observed result |
| --- | --- |
| `grep -c ' ERROR ' data/upload_small.log` | stdout `4`, status 0, accepted |
| `cat data/upload_small.log \| grep ERROR \| wc -l` | `4`, status 0, accepted |
| `awk '$2 == "ERROR" {n++} END {print n}' data/upload_small.log` | `4`, status 0, accepted |
| `grep -c ERROR < data/upload_small.log` | `4`, status 0, accepted |
| redirect ERROR lines into `work/errors.txt`, then count with `wc -l < ...` | `4`, status 0, accepted |
| count WARN instead | `1`, status 0, rejected |
| grep missing file | empty stdout, real No such file stderr, status 2, rejected |
| unknown command | real shell stderr, status 127, rejected |
| unmatched quote | real syntax error, status 2, rejected |
| `pwd` | `/root/lab`, status 0 |
| `ls data` | `logs`, `upload.log`, `upload_small.log` |
| `mkdir`, `touch`, `cd`, then `pwd; ls` | correct directory and created filename |
| read that created file on next Run | missing file, status 1: snapshot isolation confirmed |
| `cat data/upload_small.log \| wc -l` | `8` |
| count ERROR in `data/upload.log` | `100` |
| line count of `data/upload.log` | `1000` |
| legacy `data/logs/upload_small.log` path | `4`, status 0, accepted |
| disable browser network after boot, then execute grep | `4`, status 0, accepted |
| select correct quiz after successful run | progress 1/7; editing command invalidates task to 0/7 |
| `while :; do :; done` | stopped after 10 seconds; worker discarded |
| restart after timeout | Linux ready; grep succeeds again |
| open existing navigation chapter | old interaction and three quiz choices preserved |
| 390 px mobile viewport | no horizontal document overflow |
| browser page errors | none |

Desktop and mobile screenshots were visually inspected. Reproduce tests with a
local installation of Playwright and its Chromium browser (not a production
dependency):

```sh
PREVIEW_URL=http://127.0.0.1:8001/its4dh-practicals/ \
TEST_ARTIFACT_DIR=/tmp node scripts/test_shell_browser.cjs
```

If Playwright is provided by the bundled desktop runtime, set NODE_PATH to its
node_modules directory. Screenshots are written to TEST_ARTIFACT_DIR; default is
the operating system temporary directory. The test only drives a local preview.

Existing checks also pass: scripts/check.py, scripts/test_learning.py,
scripts/test_learning.cjs, strict clean MkDocs build, scripts/check_site.py
(13 HTML pages, 472 local links/assets/anchors).

## Static GitHub Pages feasibility and remaining release work

The tested runtime consists only of static files, including roughly 11.6 MB of
emulator/kernel/firmware assets. Relative asset URLs support the existing
`/its4dh-practicals/` subpath. No guest-network relay or paid execution backend is
needed. GitHub Pages itself has not been deployed or tested: feasibility is
established on an ordinary static HTTP server, not claimed as a live Pages test.
No fallback shell simulation is used.

The asset manifest pins exact local bytes, sizes and upstream download URLs:
`docs/assets/linux/manifest.json`; notices: `docs/assets/linux/NOTICE.txt`.
v86's BSD license is included. Before redistribution, retain exact corresponding
Linux/BusyBox sources/configuration and firmware license notices, or build an
owned reproducible image with corresponding sources. This downloaded image has
not been rebuilt from source here. Also test Firefox/Safari and representative
student devices, and review accessibility with assistive technology.

If device performance makes this approach unsuitable, alternatives require a
separate decision: a server execution service needs per-job containers/microVMs,
resource/time/network limits, operational updates and abuse protection; an embedded
remote terminal additionally needs sessions and authentication. Codespaces would
retain external account/workspace requirements. None of those changes was made.
