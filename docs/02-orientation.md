# 2 · Who and where am I?

<div class="learning-lab" data-step="orientation"></div>

<details class="chapter-reference" markdown="1">
<summary>Reference, guided walkthrough and extra practice</summary>

**Core path · 10–18 minutes** · Read → predict → run → explain.

## Why this matters
Before inspecting a health-platform server, establish your identity and location. This prevents running the right command in the wrong place.

## Understand the idea
A terminal prompt may contain a username and path, but prompts vary. Ask explicit
questions instead: `whoami` names your effective user; `uname` reports the kernel
name; `pwd` prints your current working directory; `ls` lists directory entries.
The current directory is the starting point for relative paths.

A command has a name, optional **options** changing its behaviour, and **arguments**
identifying what it acts on. In `ls -la data`, `ls` is the command, `-la` combines
`-l` and `-a`, and `data` is the directory argument.

## Follow along
Start at the repository root in the same Bash terminal. Copy only the code, never the output. Run lines from top to bottom.

```bash
whoami
uname
pwd
ls
ls -la data
cat data/README.txt
```

**Expected result**

```text
vscode
Linux
/workspaces/its4dh-practicals
[repository listing includes data, docs and scripts]
[detailed listing includes README.txt, config, logs, . and ..]
PulseBridge teaching dataset — entirely synthetic.
Snapshot: 2026-10-19, UTC. One line is one logged event, not one patient.
Fields: timestamp severity service device event detail
Each field contains no spaces. A device can have several upload attempts.
ERROR means this attempt failed; it does not prove that a patient was harmed.
```

Bracketed lines describe variable output rather than literal lines. `whoami` can
have a different username outside Codespaces. `uname` is not a Linux distribution
version. `-l` adds permissions, owner, size and date; `-a` includes names starting
with a dot. `cat` prints a short text file. Successful commands may print no output.

## Your turn
Run `ls data/logs`. Find the three log filenames. Then list `data/config` without changing directories.

## Checkpoint
Which command answers “where am I”, and which answers “which kernel”?

??? note "Hint 1 · Think about the goal"
    These are different questions: a location is not a user.

??? note "Hint 2 · Choose a tool"
    Pass data/config as the argument to ls.

??? success "Check your understanding — open after trying"
    pwd gives the working directory; uname gives the kernel. data/logs contains platform.log, upload_small.log and upload.log. The config directory contains platform.conf and platform.conf.backup.

## Mini-challenge
Predict whether `ls -a` can reveal hidden names. Check with `ls -a data`; the entries . and .. are included. Explain -a in one sentence.

[Continue →](03-navigation.md) · [Core path map](index.md)

</details>

[Next learning step →](03-navigation.md) · [Learning path](index.md)
