# Verification — 20 October 2026

- PASS: `python3 scripts/check.py` executes the noninteractive Bash blocks from the practical in sequence in a disposable directory.
- PASS: record/error/warning counts (20/6/3), storage error lines (6/10/15), device history, configuration differences, quoted filenames, saved report text and preservation of fixture bytes.
- PASS: internal Markdown page links, devcontainer JSON parsing and referenced Dockerfile presence.
- PASS: MkDocs 1.6.1 / Material 9.6.23 `mkdocs build --strict`, with no warnings.
- Generated HTML is available in `site/`; source is in `docs/`.

Commands were checked with Bash and local command-line utilities on macOS. Linux CI is included but has not been run remotely. The Docker daemon is unavailable in this environment, so the container image build and actual GitHub Codespaces creation remain untested. Interactive `less`, `man`, keyboard shortcuts and browser rendering need a classroom smoke test. No repository was published and no cloud environment was created.

Before class: publish this directory as the repository root; create a fresh Codespace; confirm `uname` prints `Linux`; wait for automatic setup to pass; open the handbook on private port 8000; check `less` and `man grep`; stop the Codespace afterward.
