# 3 · Navigate without getting lost

**Core path · 18–30 minutes** · Read → predict → run → explain.

## Why this matters
A server can contain thousands of folders. Paths let you locate the correct evidence instead of opening unrelated files.

## Understand the idea
Directories form a tree rooted at `/`. An **absolute path** starts with `/` and
works regardless of the current directory. A **relative path** starts from your
current directory. `.` means here; `..` means the parent directory. `~` expands to
your user's home. Home is not the repository root. `cd` changes the shell's current
directory; it does not move a file. With no argument, `cd` goes home.

```text
repository root
├── data
│   ├── config
│   └── logs / platform.log
└── work (created in chapter 4)
```

Tab completes an unambiguous name. Type `ls da` and press Tab to complete `data/`;
press Tab twice to see alternatives when ambiguous. Up retrieves earlier commands;
edit before pressing Enter. `history` lists past commands. Do not enter secrets:
history may retain them. Ctrl+L clears the visible screen, not your history.

## Follow along
Start at the repository root in the same Bash terminal. Copy only the code, never the output. Run lines from top to bottom.

```bash
ROOT="$PWD"
cd data
pwd
cd logs
ls
cd ..
ls
cd ../..
cd "$ROOT"
pwd
cd ~
pwd
cd "$ROOT"
ls ./data/config
```

**Expected result**

```text
[repository path]/data
platform.log
README.txt  config  logs
[repository path]
[home path, typically /home/vscode]
platform.conf  platform.conf.backup
```

`ROOT="$PWD"` remembers the starting absolute path in a shell variable. `$PWD`
is maintained by Bash; `"$ROOT"` inserts the remembered value as one argument,
even if it contains spaces. After `cd ..` you are in data; `cd ../..` then leaves
the repository, and `cd "$ROOT"` returns safely. This deliberate detour shows why
counting parents can be error-prone. Commands above do not create or change files.
Keep this terminal open so ROOT remains defined.

## Your turn
From the root, go to data/config. Return with cd ../.. and verify pwd. Retrieve your previous ls command with Up, but inspect it before executing.

## Checkpoint
From data/logs, does ../config refer to the repository config directory?

??? note "Hint 1 · Think about the goal"
    Draw your current node in the tree.

??? note "Hint 2 · Choose a tool"
    Use cd data/config, then pwd, then cd ../.., then pwd.

??? success "Check your understanding — open after trying"
    Yes: .. is data, so ../config reaches data/config. From data/config, cd ../.. returns to the repository. A leading / would instead start at the filesystem root.

## Mini-challenge
Use an absolute path to list the log from home without moving it: after cd ~, try ls "$ROOT/data/logs", then cd "$ROOT". Expected: platform.log.

[Continue →](04-files.md) · [Core path map](index.md)
