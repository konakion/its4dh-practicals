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
