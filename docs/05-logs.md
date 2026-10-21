# 5 · Read and search Digital Health logs

<div class="learning-lab" data-step="logs"></div>

<details class="chapter-reference" markdown="1">
<summary>Reference, guided walkthrough and extra practice</summary>

**Core path · 45–60 minutes** · Read → predict → run → explain.

## Why this matters
A wearable upload is delayed. Read the timeline before guessing a cause. Logs describe recorded events, not a patient diagnosis.

## Understand the idea
Each line in this synthetic log contains a UTC timestamp (Z), severity, service,
device and event. INFO records normal observations; WARN signals a concern; ERROR
records a failed attempt here. One device may appear repeatedly. Counts of records
are not counts of patients, and a later success does not prove every missing datum
was recovered.

cat prints the whole file. less opens a read-only viewer for longer files: Space
moves down, /ERROR then Enter searches, n finds the next match and q quits.
head and tail show the beginning and end. grep selects lines containing a pattern.
The viewer remains interactive; quit it before continuing the next command.

## Follow along
Start at the repository root in the same Bash terminal. Copy only the code, never the output. Run lines from top to bottom.

```bash
head -n 3 work/logs/platform.log
tail -n 2 work/logs/platform.log
```

Open the viewer separately, search with `/ERROR`, and press `q` to leave:

```bash
less work/logs/platform.log
```

After leaving the viewer, run:

```bash
grep -n -F 'connection_refused' work/logs/platform.log
grep -c -F ' ERROR ' work/logs/platform.log
```

**Expected result**

```text
2026-10-19T09:00:00Z INFO gateway band-01 upload accepted
2026-10-19T09:01:00Z INFO gateway band-02 upload accepted
2026-10-19T09:02:00Z WARN gateway band-03 battery low
2026-10-19T09:18:00Z INFO gateway band-05 upload accepted
2026-10-19T09:19:00Z INFO gateway band-03 upload accepted
[less shows the file; press q to continue]
6:2026-10-19T09:05:00Z ERROR storage band-02 upload connection_refused
10:2026-10-19T09:09:00Z ERROR storage band-04 upload connection_refused
15:2026-10-19T09:14:00Z ERROR storage band-03 upload connection_refused
6
```

For head/tail, -n 3 means three lines; for grep, -n instead prefixes line numbers.
Options belong to the tool using them. grep -F uses a literal pattern; -c counts
matching lines. Quotes keep spaces in one pattern. The spaces around ERROR target
the severity field here. Matching is case-sensitive. grep returns status 1 if no
line matches: an empty result can be a valid answer, not a broken terminal.

## Your turn
Find warning records, including their line numbers. Read all band-03 records and locate its final observation.

## Checkpoint
Would searching for lowercase error produce the same result? Do three connection_refused records establish that the database itself failed?

??? note "Hint 1 · Think about the goal"
    Choose the exact text you can see in a record.

??? note "Hint 2 · Choose a tool"
    Try grep -n -F " WARN " work/logs/platform.log, then grep -F band-03 work/logs/platform.log.

??? success "Check your understanding — open after trying"
    No: the uppercase severity is case-sensitive. Warnings are lines 3, 9 and 18. band-03 ends at 09:19:00Z with upload accepted. The three storage errors show symptoms; more evidence is needed for root cause.

## Mini-challenge
Show only the last band-03 record after reading chapter 6, or identify it manually now. Explain why one final accepted upload is a limited claim.

[Continue →](06-pipelines.md) · [Core path map](index.md)

</details>

[Next learning step →](06-pipelines.md) · [Learning path](index.md)
