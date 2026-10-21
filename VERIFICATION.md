> Update 22 October 2026: chapter 5 now executes real browser Linux. See
> [SHELL-PROTOTYPE.md](SHELL-PROTOTYPE.md) for current architecture and verified results.
> Older pasted-output descriptions below apply to the other chapters only.

# Local verification · 22 October 2026

Changes made only in /Users/konak/Downloads/practical-01. No push, deployment,
remote setting change or Codespace creation. Existing data/.DS_Store modification
predated this work and was left untouched. Remote: konakion/its4dh-practicals;
local main tracks origin/main. Remote reachability and live Pages settings were not tested.

PASS:
- Existing handbook command/exercise checks, optional noninteractive labs and fixture integrity.
- Exact upload_small.log counts: 8 lines, 4 ERROR; upload.log: 1000 lines, 100 ERROR.
  Actual paths are data/logs/, not data/. No cheat sheet exists in this checkout.
- Strict MkDocs build: 13 pages; 460 internal links/assets/anchors validated.
- Seven browser result validators, whitespace and listing-order variants, variable
  workspace prefixes, wrong/empty/HTML-like inputs and failed checker reports.
- Real artifact checks using temporary copies: missing artifacts fail; an alternative
  awk filter passes; saving just a count instead of error evidence fails; source edits fail.
- Browser: incorrect and correct result feedback, MC explanations, progress increment,
  persistence after reload, and missed-question review spanning other chapters.
- Narrow browser layout visually inspected: inputs, quiz, controls and navigation fit.
- JavaScript syntax and git diff whitespace checks.

Infrastructure retained: pinned MkDocs/Material dependencies, existing devcontainer,
Bash Linux utilities and post-create checks. Local CI now also includes learning
regressions and generated-link validation. Deployment is manual workflow_dispatch only;
the previous automatic main push trigger conflicted with README and was removed locally.

Limits: no Docker/container build, Linux CI or real Codespace lifecycle test performed.
No published site was changed. Browser checks validate pasted results, not command
execution or student identity. check_work.py reads actual learner files and verifies
source hashes, evidence lines, configuration copy and report structure. It cannot judge
clinical interpretation; use peer review. Seven public quiz keys are formative.

Preview (from repository root):

```bash
.venv/bin/python -m mkdocs serve --dev-addr 127.0.0.1:8000
```

Open http://127.0.0.1:8000/its4dh-practicals/ . Node is needed only for maintainer
JavaScript tests; learners need Python and Linux utilities in their Codespace.

---

## Previous verification record (20 October 2026)

# Verification · 20 October 2026

PASS locally on macOS with Bash and Python 3.12:
- All noninteractive core Bash blocks from chapters 1–7 run sequentially in one temporary workspace.
- Exercise copies/deletions, exact event counts, warning/error line numbers, device history, service/severity grouping and unchanged source fixture bytes.
- Both normal and unified diff: expected exit status 1 for differences; semantic old/new values replace dependence on a normal-diff hunk header.
- Optional noninteractive find, diff, script, chmod, aliases, client discovery and localhost HTTP/curl labs. Bash alias expansion is explicitly enabled in the noninteractive test shell; interactive Bash enables it by default.
- mkdocs build --strict --clean, MkDocs 1.6.1 and Material 9.6.23.
- Generated HTML: 13 pages; 420 local links, assets and fragment targets.
- No solutions/ or teaching/ page, no private instructor files in student archive, no legacy solution entries in search index.
- Source fixtures exactly match the supplied ZIP.
- Browser spot check of narrow layout, chapter navigation and expansion of a staged hint.

Not executed: Linux CI, container build (Docker daemon unavailable), a real Codespace, its stop/resume lifecycle, live Pages deployment, full interactive editor/viewer keyboard workflows or an actual SSH/SCP transfer. GNU grep --help is not executed on this macOS host because BSD grep differs; Linux CI executes it. The local uname result is Darwin; Linux is the expected result inside the intended container. Post-create checks test exercises in isolation, not the learner's own work.

External links have been statically reviewed, not all verified live. GitHub API and main-branch archive requests returned 404; the public handbook fetch failed. Therefore live repository configuration, default branch, existing workflows and current deployment were not verified. GitHub billing and lifecycle guidance was checked against official GitHub Docs; account-specific allowances may change.

See the private teaching guide for manual release acceptance. No GitHub push, external publication, Codespace creation or paid action was performed. site/ is a generated local preview only. Public handbook use does not require students to install MkDocs.
