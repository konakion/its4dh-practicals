# Solutions · check after trying

These commands start at the repository root after Sections 2–5 of the practical.
They are reference answers, not an additional 90-minute task list.

## Core investigation

```bash
wc -l < work/logs/platform.log
grep -c -F ' ERROR ' work/logs/platform.log
grep -c -F ' WARN ' work/logs/platform.log
grep -F 'connection_refused' work/logs/platform.log > work/reports/storage-errors.txt
wc -l < work/reports/storage-errors.txt
grep -F 'band-03' work/logs/platform.log
```

Counts, in order: **20**, **6**, **3**, then **3**. The save command is silent.
The device filter prints:

```text
2026-10-19T09:02:00Z WARN gateway band-03 battery low
2026-10-19T09:03:00Z ERROR gateway band-03 upload timeout
2026-10-19T09:06:00Z ERROR gateway band-03 upload timeout
2026-10-19T09:11:00Z INFO gateway band-03 upload accepted
2026-10-19T09:14:00Z ERROR storage band-03 upload connection_refused
2026-10-19T09:19:00Z INFO gateway band-03 upload accepted
```

### Example incident note

> Snapshot: 19 October 2026, 09:00–09:19 UTC. There are 20 event records,
> including six failed upload attempts and three warnings. Three errors report
> connection_refused in storage; the other three report gateway timeouts.
> For example, at 09:14 UTC band-03 has a storage connection_refused event.
> Its final observed upload is accepted at 09:19 UTC. This shows a later accepted
> attempt in the supplied snapshot, not that every missing measurement was recovered.
> Next, inspect storage service availability and connection logs for the same period.
> These records do not establish a root cause, number of affected patients, or
> clinical impact. No actual service has been changed.

The signal is a **lead for investigation**, not proof of database downtime. An
accepted upload also does not prove successful downstream processing.

## Challenge A

```bash
find data -name '*.conf*'
diff data/config/platform.conf.backup data/config/platform.conf
```

The two paths are `data/config/platform.conf` and
`data/config/platform.conf.backup`; order can vary. Diff prints:

```text
3c3
< retry_limit=1
---
> retry_limit=3
```

Here `<` marks the first file and `>` the second; these are output markers, not
commands. `diff` returns exit status 1 for differing files; this is expected.
A configuration difference alone does not establish when it changed or causation.

## Challenge B

```bash
grep -F ' ERROR ' work/logs/platform.log | grep -F 'band-03' | wc -l
```

**3** failed attempts; the unfiltered device search has **6** records including
warnings and successes.

## Challenge C

```bash
grep -n -F ' WARN ' work/logs/platform.log
cat -n work/logs/platform.log
```

Warnings are on lines **3, 9 and 18**. The warning at 09:17 for band-05 is followed
by an accepted upload at 09:18, not an error. Sequence alone would not prove a
causal link even where a warning precedes an error.

## Challenge D

```bash
cp -i work/reports/incident.txt 'work/reports/incident copy.txt'
cat 'work/reports/incident copy.txt'
```

The copied content matches the note. Without quotes, the destination would be split
into separate arguments, so `cp` would interpret a different operation and normally
report an error here.

## Recall answers

`cp` preserves its source; `mv` moves or renames it. `cd` changes the shell's
working directory, not the location of a file. `cat` requests file access through
OS services; it cannot bypass the kernel's access controls. `|` connects programs;
`>` replaces an output file and `>>` appends to it.
