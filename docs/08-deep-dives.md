# 8 · Optional deep dives

**After the 90-minute core · choose one 5–15 minute route.** Each route starts at
the repository root after chapter 4. These are new tools for specific needs, not
prerequisites. Use synthetic data only. Read each route's expected result before
running it. For interactive tools, exit before running the next line.

## A · Edit a note: nano or Vim (10 minutes)
**Motivation:** a headless server may have no graphical editor. A terminal editor
lets you change a text note. Work on a disposable copy, never the evidence.

```bash
cp data/README.txt work/scratch/editor-note.txt
nano work/scratch/editor-note.txt
```

nano receives one filename and opens the existing text. Add a line saying
`Edited in nano`. Ctrl+O, Enter saves; Ctrl+X exits. Use Ctrl+X then N to discard
an unintended change. `^` in nano's help means Ctrl. Verify:

```bash
tail -n 1 work/scratch/editor-note.txt
```

Expected: `Edited in nano` if you added it as the last line and saved.
Vim is a different, modal editor. Optional alternative:

```bash
vim work/scratch/editor-note.txt
```

Press `i` for insert mode, edit text, Esc to return to normal mode, then `:wq`
and Enter to save and quit. `:q!` discards changes since the last save.
**Try:** add a second line and read it back with cat.
**Checkpoint:** does leaving the editor always save? No: discard options do not.
**Hint 1:** check the mode or shortcut bar. **Hint 2:** nano needs Ctrl+O and Enter.
**Mini-challenge:** reopen without changing anything; quit and compare the text
with cat. Expected: your saved lines remain; reopening itself changes no content.

## B · Locate and compare configuration (5 minutes)
**Motivation:** two versions may explain what changed, without proving why.
find searches a directory tree; diff compares text files.

```bash
find data -name '*.conf*'
diff -u data/config/platform.conf.backup data/config/platform.conf
```

Expected find results: data/config/platform.conf and data/config/platform.conf.backup
(order can differ). The diff includes variable file timestamps, a hunk header,
`-retry_limit=1` and `+retry_limit=3`, with unchanged context lines. `-u` selects
unified format; the first file is old, the second new. diff exit status 0 means
identical, 1 means different, and values above 1 mean trouble. Normal diff may
instead display `3c3`, `<` and `>`; do not depend on a platform's exact header format.
`-name` selects names; quotes prevent Bash expanding `*` before find receives it.
**Try:** find platform.log using find, then compare the original and copied log.
**Checkpoint:** no diff output means identical? Yes, if exit status is 0.
**Hint 1:** bound the search to data. **Hint 2:** use find data -name 'platform.log'.
**Mini-challenge:** compare the two configuration values with grep -F retry_limit
and explain why a change alone does not establish causation. Expected: 1 versus 3.

## C · Permissions and an executable Bash script (10 minutes)
**Motivation:** a repeatable check is useful when the same question returns tomorrow.
A script is a text file interpreted as commands. Linux permissions distinguish
read, write and execute access for owner, group and others. Here we only add owner
execution to our own practice script; no system permissions need changing.

```bash
printf '%s\n' '#!/usr/bin/env bash' "grep -c -F ' ERROR ' data/logs/platform.log" > work/scratch/count-errors.sh
bash work/scratch/count-errors.sh
chmod u+x work/scratch/count-errors.sh
./work/scratch/count-errors.sh
ls -l work/scratch/count-errors.sh
```

Expected: `6`, then `6`, then a detailed listing whose owner permissions include x
(typically -rwxr--r--; other bits depend on the creation mask). printf creates two
lines; `#!` selects an interpreter for direct execution. bash can read the script
without its execute bit. chmod u+x adds execute for the owner; `./` explicitly
selects the file here rather than searching command directories. The script's
relative data path assumes it is run **from the repository root**.
**Try:** inspect the two script lines with cat.
**Checkpoint:** does execution permission grant access to every file? No; each
file and directory has its own access rules.
**Hint 1:** distinguish reading script text from direct execution.
**Hint 2:** bash script and ./script start it differently.
**Mini-challenge:** run it again and explain whether it changes the log. Check: it
prints 6 again; grep is read-only. `chmod u-x work/scratch/count-errors.sh` reverses
only the owner-execute addition.

## D · Help and a temporary alias (5 minutes)
**Motivation:** you cannot memorise every option; learn to ask the tool itself.

```bash
grep --help
man grep
alias ll='ls -la'
ll data
unalias ll
```

--help prints usage. man opens a manual: /pattern searches, n continues, q quits.
The alias command makes ll expand to ls -la in this shell only. Its expected output
matches chapter 2's detailed data listing. unalias removes the shortcut.
**Try:** locate -F in the help text. **Checkpoint:** will another terminal
necessarily know ll? No. **Hint 1:** help is specific to the utility.
**Hint 2:** use /fixed in man, then q to leave.
**Mini-challenge:** explain why copying a command using an undocumented alias can
fail for a colleague. Check: their shell may not define it. We do not edit .bashrc.

## E · curl: a local, reproducible request (10 minutes)
**Motivation:** servers also expose files via HTTP. curl retrieves a URL; its output
is data, not a command to execute. We use localhost rather than an external service.
In a second terminal at the root, start:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory data
```

Expected: a server-start message containing port 8765; leave this terminal running.
127.0.0.1 means this environment itself; no public port is needed. In your first
terminal run:

```bash
curl --fail --silent --show-error http://127.0.0.1:8765/README.txt > work/scratch/downloaded-readme.txt
diff data/README.txt work/scratch/downloaded-readme.txt
```

Expected: both commands silent; diff status 0, because the texts match. --fail makes
HTTP error responses fail; --silent hides progress; --show-error still shows errors.
The URL includes scheme, host, port and path. **Try:** print the downloaded file.
**Checkpoint:** is curl an SSH client? No: this example uses HTTP.
**Hint 1:** both terminals must refer to the same environment.
**Hint 2:** connection refused usually means the local server is not running.
**Mini-challenge:** stop the second-terminal server with Ctrl+C, retry curl, and
interpret its nonzero failure without running any downloaded content. Beware:
redirection may leave an empty output file on that failed attempt.

## F · SSH and SCP: recognise the workflow (10 minutes)
**Motivation:** a research group may give you an authorised Linux server rather
than a Codespace. SSH provides an encrypted remote shell; SCP copies files over
SSH. These examples are **templates, not runnable exercises**: no server, account
or keys have been supplied. Do not type placeholder addresses or buy a server.

```text
ssh YOUR_USER@YOUR_AUTHORISED_HOST
scp work/reports/incident.txt YOUR_USER@YOUR_AUTHORISED_HOST:incident.txt
```

The user and host identify the remote account. The colon in SCP separates host
from remote path. The relative destination is in that account's home. The provider
must give you the host, username, authentication method and verified host-key
fingerprint. Verify that fingerprint through a trusted channel before accepting a
first connection; do not bypass host checks. After login, whoami/uname/pwd run on
the remote machine. exit leaves that session. Authentication prompts and outputs
vary; there is no honest exact output without the actual environment.
**Try now (executable):** inspect installed client versions; these contact no server.

```bash
ssh -V
command -v scp
```

Expected: an OpenSSH version (usually on stderr) and an absolute scp executable
path such as /usr/bin/scp. **Checkpoint:** where does pwd run after SSH login?
On the remote host. **Hint 1:** identify where the shell lives.
**Hint 2:** the laptop displays text from the remote process.
**Mini-challenge:** sketch how you would copy the report back using SCP. Check:
the remote user@host:path becomes the source, and a local destination follows it.
Actual remote transfer is untested and requires a course-provided host.

[Core recap](recap.md) · [Environment and shutdown](setup.md)
