# 4 · Preserve evidence; work on copies

**Core path · 30–45 minutes** · Read → predict → run → explain.

## Why this matters
Incident analysis should preserve the supplied snapshot. Mistakenly overwriting a log destroys the evidence you intended to inspect.

## Understand the idea
`mkdir` creates directories. `touch` creates an empty file if absent (or updates
its timestamps if it exists). `cp` copies; `mv` moves or renames; `rm` removes a file.
There is usually no recycle bin for terminal deletion. Many successful operations
are silent: verify using `ls` and `cat` rather than repeating blindly.

Use work/ for your experiments. These commands assume a first run. If work/ already
exists, rename it in Explorer to an unused name such as work-first-run, preserving
your notes; then start this chapter again. Do not delete a folder to reset.

## Follow along
Start at the repository root in the same Bash terminal. Copy only the code, never the output. Run lines from top to bottom.

```bash
mkdir work
mkdir work/logs work/reports work/scratch
cp data/logs/platform.log work/logs/platform.log
cp data/config/platform.conf work/scratch/platform.conf
mv -i work/scratch/platform.conf work/scratch/platform-copy.conf
touch work/scratch/practice.txt
ls work/scratch
cat work/scratch/platform-copy.conf
```

Run this command alone. Read the prompt, then type `y` and Enter:

```bash
rm -i work/scratch/practice.txt
```

After confirming, run:

```bash
ls work/scratch
```

**Expected result**

```text
platform-copy.conf  practice.txt
endpoint=storage.internal
port=5432
retry_limit=3
[rm asks whether to remove work/scratch/practice.txt; type y then Enter]
platform-copy.conf
```

mkdir takes one or more directory arguments. cp and mv take source then destination.
`-i` asks before overwriting with mv, or before deletion with rm. On this first run
mv should not ask; rm will. Type n to cancel if the path is unexpected. Quoting a
filename containing spaces keeps it one argument: `"my note.txt"`.
Never add sudo or recursive deletion. Check pwd and the target before changing it.
The supplied data/ stays unchanged.

## Your turn
Create work/scratch/second.txt using touch. Copy it to work/scratch/second-copy.txt, list both, then remove only second-copy.txt with rm -i.

## Checkpoint
If you need both original and renamed evidence, should you use cp or mv?

??? note "Hint 1 · Think about the goal"
    Which operation leaves its source in place?

??? note "Hint 2 · Choose a tool"
    Use cp work/scratch/second.txt work/scratch/second-copy.txt; inspect with ls before rm -i.

??? success "Check your understanding — open after trying"
    Use cp: it preserves the source. mv relocates the existing entry. Your exercise leaves second.txt and platform-copy.conf in scratch; practice.txt and second-copy.txt are removed.

## Mini-challenge
Copy the configuration to "work/scratch/config copy.txt" and print it. Check: the text matches platform-copy.conf. Explain why the destination needs quotes.

[Continue →](05-logs.md) · [Core path map](index.md)
