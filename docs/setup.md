# Your browser Linux workspace

Use these two links throughout the course:

1. [Public handbook](https://konakion.github.io/its4dh-practicals/)
2. [Create your own course Codespace](https://codespaces.new/konakion/its4dh-practicals)

The revised instructions become valid for that repository **after the instructor
has reviewed and published this update**. The downloaded preview already contains
the full handbook. Windows, macOS and Linux users follow the same steps in a browser.
You need a GitHub account and internet access. No local Linux or MkDocs installation
is required. github.dev alone is an editor, not the required Linux terminal.

## Start before class (allow 5–10 minutes)
1. Sign in to GitHub and open the Codespace link. Select the course branch specified
   by your instructor (normally main after release) and the smallest available
   machine, usually 2 cores. Create one Codespace, rather than a new one each week.
2. Wait until the container and post-create check finish. A first launch can take
   several minutes. If setup fails, record the error and use the fallback below.
3. In the browser editor select Terminal → New Terminal. You should have Bash in
   a Linux environment. The Explorer should show data/, docs/ and scripts/.
4. Run:

```bash
uname
pwd
python3 scripts/check.py
```

Expected: Linux; a path resembling /workspaces/its4dh-practicals; and a PASS message.
The check uses a temporary directory, leaving your own work and supplied data intact.
It does not grade your report. If you see no scripts/check.py, navigate to the folder
containing it in Explorer, right-click that folder and open its integrated terminal.

Keep the public handbook in its own tab. Start [chapter 1](01-motivation.md) in your
workspace terminal. No preview server or port forwarding is necessary for students.
Never put real patient information or credentials into the course environment.

## Stop, resume and costs
Save and download your work/reports files using Explorer's Download action before
finishing, especially if you plan to delete the Codespace.
Open [your Codespaces](https://github.com/codespaces), find this environment,
choose its three-dot menu → Stop codespace. Closing the browser tab alone does not
reliably stop compute usage. To resume later, click the existing Codespace's name
and wait for it to start. Files remain in a stopped environment, but retention
policies can eventually delete inactive Codespaces. Keep your own backup.

GitHub personal accounts have plan-dependent included compute and storage quotas.
Compute is measured in core-hours: 90 minutes on a 2-core machine uses about
3 core-hours, plus startup and other active time. Stopping ends compute usage;
storage continues until deletion and may incur costs if billed usage is enabled.
Check [your billing and usage](https://github.com/settings/billing) before creating
an environment; do not assume the entire semester is free. A valid payment method
and account policies can allow charges beyond included usage; without payment,
exhausted quota can block use. Do not add payment information just for this class:
use the fallback or contact the instructor. See GitHub's
[billing documentation](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)
and [stop/resume guide](https://docs.github.com/en/codespaces/developing-in-a-codespace/stopping-and-starting-a-codespace).
These details were checked on 20 October 2026; account-specific terms take precedence.

## Fallback if Codespaces is unavailable
**During class:** pair with a classmate whose Codespace is working. Take turns
predicting, typing and explaining. Keep your own written incident note. This lets
you complete the lesson without installing software during the session.

**For independent catch-up:** use VS Code plus its Dev Containers extension and a
running Docker installation on Windows/macOS/Linux. Download the course repository
ZIP from GitHub (Code → Download ZIP), extract it, open the folder containing
.devcontainer/ in VS Code, then choose “Dev Containers: Reopen in Container”. Wait
for setup and use the same Bash terminal steps. The installation can be large;
arrange this before catch-up. Windows may require WSL 2 for Docker Desktop.
Do not use native PowerShell or macOS Bash as a substitute for the common Linux
outputs. If Docker is unavailable too, ask the instructor for a paired session or
an institution-provided Linux account. This project does not provision that account.
Reading alone does not replace executing the tasks.

## Getting unstuck
| Symptom | What to try |
|---|---|
| No such file or directory | Run pwd and ls; return to the folder with data/ and scripts/ |
| File exists at mkdir work | Preserve work by renaming it to an unused name in Explorer; restart chapter 4 |
| A lone > prompt | Unclosed quote: Ctrl+C, then retry with straight quotes |
| Screen seems stuck in less/man | q exits; Ctrl+C cancels a normal running command |
| Permission denied | Check the path; use work/, not sudo |
| No grep output | Check case and pattern; no match can be a valid result |
| Lost ROOT after opening a new terminal | At the repository root run ROOT="$PWD" again |
| Container creation fails | Use the creation log to capture the actual error; do not repeatedly create new environments |

Tab completes paths; Up recalls history; Ctrl+L clears the view. None moves or deletes
a file. Copy code only, with straight quotes and normal hyphens. Commands are case-sensitive.
