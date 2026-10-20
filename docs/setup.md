# A common Linux environment

## Before class

Use GitHub Codespaces in a browser on Windows, macOS or Linux. You need a GitHub
account, internet access, and access to the course repository supplied by your
instructor. The instructor must first publish this folder as a repository (see README).

1. Open the course repository on GitHub.
2. Choose **Code → Codespaces → Create codespace on main**. Do not choose github.dev:
   that browser editor does not provide this Linux terminal environment.
3. Wait until creation and the automatic setup command finish. If setup reports an
   installation error, ask for help before continuing.
4. Choose **Terminal → New Terminal**. The prompt should use Bash in the container.
5. Run the following from the repository root:

```bash
uname
pwd
ls
python3 scripts/check.py
```

`uname` prints `Linux` (the kernel name). `pwd` usually resembles
`/workspaces/<repository-name>`; the name varies. `ls` includes `data`, `docs`,
`mkdocs.yml`, `requirements.txt`, and `scripts`. The check ends with
`PASS: core commands, fixture integrity and configuration`.

If these files are absent, use the editor's Explorer to locate the repository root
and open a terminal there. All practical instructions start from that root.

## Open the handbook

In a **second terminal**, run:

```bash
.venv/bin/python -m mkdocs serve --dev-addr 0.0.0.0:8000
```

Open port **8000** in the Ports panel, using **Open in Browser**. Keep the port
private. The server keeps this terminal busy; use the first terminal for tasks.
Stop the handbook server with Ctrl+C when finished. If port 8000 is occupied,
stop the earlier server before restarting it.

## Local alternative

With VS Code, the Dev Containers extension, and Docker installed and running:
open the course repository folder and choose **Dev Containers: Reopen in Container**.
Wait for setup, then follow the same instructions. Docker is infrastructure today;
understanding containers is not a prerequisite. Native Windows PowerShell/CMD and
macOS commands can differ, so use the container for assessed outputs.

Without a working container, the Markdown handbook remains readable. Work with a
partner in class and arrange environment access before attempting commands later.

## Getting unstuck

- Commands and paths are case-sensitive. Type `ls`, not `LS`.
- Copy only code, never a `$` prompt or output. Use straight quotes: `'` or `"`.
- Press Tab for path completion, Up for command history, Ctrl+L to clear the view.
- Ctrl+C cancels a running command. In `less` or `man`, press `q` to leave.
- A `>` continuation prompt usually means an unclosed quote; Ctrl+C and retry.
- `No such file or directory`: inspect `pwd` and `ls` before changing anything.
- `Permission denied`: check the path and ask for help; do not add `sudo`.

When done, save your incident note or download it from Explorer. Close the handbook
server and **stop the codespace** from GitHub's Codespaces page. Closing a tab alone
is not the same as stopping the environment.
