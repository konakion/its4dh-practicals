# Practical 01 · Linux investigation for Digital Health

A guided English 90-minute self-study practical, plus optional deep dives.
The student path starts at docs/index.md. Student environments need only Python
and standard Linux utilities; no MkDocs installation or preview server is required.

Public handbook (after release): https://konakion.github.io/its4dh-practicals/
Own workspace: https://codespaces.new/konakion/its4dh-practicals

## Maintainer validation
From this repository's root:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/check.py
.venv/bin/python -m mkdocs build --strict --clean
.venv/bin/python scripts/check_site.py
.venv/bin/python -m mkdocs serve --dev-addr 127.0.0.1:8000
```

The last command is a local maintainer preview, not a student prerequisite.
Stop it with Ctrl+C. On Windows, use the Dev Container, or the corresponding
.venv/Scripts/python executable. Checks run in temporary copies; they never grade
or reset student work/. Interactive acceptance and Codespaces must be checked too.
Direct dependencies are pinned; the container base and transitive dependencies are
not immutable locks. Review compatibility before a future course release.

## Review and publication
This folder is a proposed complete repository root. No GitHub push or deployment
was performed. Follow the separate RELEASE-AND-VERIFICATION.md companion before
copying into an existing checkout. Do not nest this folder inside the repository.
Never copy the private instructor companion into a public repository: hidden
navigation alone does not keep source private. Generated site/ is preview output
and is ignored by Git; Actions regenerates it. No solution or teaching source is
present under docs/.

.github/workflows/check.yml validates pushes and pull requests without publishing.
pages.yml publishes only when manually run on main, after review; it uploads only
site/. Remove or disable an existing automatic Pages workflow before integration,
because that workflow might otherwise publish on push.
