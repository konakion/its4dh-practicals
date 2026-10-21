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
.venv/bin/python scripts/test_learning.py
node scripts/test_learning.cjs
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
was performed. Review VERIFICATION.md before release. Do not nest this folder inside the repository.
Never copy the private instructor companion into a public repository: hidden
navigation alone does not keep source private. Generated site/ is preview output
and is ignored by Git; Actions regenerates it. Self-assessment answer keys are public in docs/assets/learning.json; this is
formative practice, never authenticated grading.

.github/workflows/check.yml validates pushes and pull requests without publishing.
deploy.yml publishes only when manually run, after review; it uploads only
site/. Remove or disable an existing automatic Pages workflow before integration,
because that workflow might otherwise publish on push.

## Interactive learning
Chapter 5 now has a real browser-Linux grep prototype: one command field,
Run / Submit, actual stdout/stderr and exit status, result-based feedback and the
existing quiz/review/reset controls. The other chapters retain the earlier
Codespaces/pasted-output workflow pending review of this prototype.

Linux runs entirely inside a v86 WebAssembly PC in a Web Worker. No execution
backend, credentials, guest network relay or host directory mount is configured.
Each submission restores fresh RAM-only files. This is formative self-assessment;
printing the known answer is possible and it is not tamper-proof grading.

See [SHELL-PROTOTYPE.md](SHELL-PROTOTYPE.md) for architecture, exact tests, asset
provenance, preview instructions and limits. No push or deployment was performed.
