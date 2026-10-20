# Practical 01 — Terminal foundations

English, 90-minute handbook for Principles of IT Systems, HPI Digital Health Master.
All wearable records are fabricated. No patient data or external services are used.

## Start

Open [the setup guide](docs/setup.md), then [the practical](docs/practical.md).
For a rendered handbook, from this directory run:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m mkdocs serve --dev-addr 0.0.0.0:8000
```

In Codespaces open the forwarded port 8000. Keep its visibility private.
Markdown pages can also be read directly without building.

## Repository preparation (instructor)

Publish **the contents of this directory as the repository root**, including hidden
`.devcontainer/` and `.github/` directories. No GitHub repository has been created
by this deliverable. On GitHub select Code → Codespaces → Create codespace on main.
The first creation installs the environment; a rebuild requires internet access.
No paid VPS or local Linux installation is needed. Check your institution's
Codespaces allocation before class; stop your codespace after use.

## Verification

```bash
python3 scripts/check.py
.venv/bin/python -m mkdocs build --strict
```

The check executes the core commands in a temporary workspace, never your work folder.
See [teaching notes](docs/teaching.md) for timing and source mapping.
Solutions are openly available for self-study, not protected assessment material.
