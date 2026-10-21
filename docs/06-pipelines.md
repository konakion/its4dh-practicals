# 6 · Connect tools and save results

<div class="learning-lab" data-step="pipelines"></div>

<details class="chapter-reference" markdown="1">
<summary>Reference, guided walkthrough and extra practice</summary>

**Core path · 60–73 minutes** · Read → predict → run → explain.

## Why this matters
An investigation needs reproducible evidence files, not numbers remembered from a screen. Small tools can form a transparent analysis.

## Understand the idea
Programs usually read **standard input** and write **standard output**; diagnostics
use standard error. A pipe `|` connects one command's standard output to the next
command's standard input. It does not save a file. A redirection `>` creates or
replaces a file; `>>` creates or appends. `<` reads a file into standard input.
The shell sets these connections up before starting the command.

```text
grep (select records) → pipe → wc (count newlines) → terminal
                         or
                    > evidence file
```

wc -l counts newline characters, which equal records in our newline-terminated
fixture. sort orders lines; uniq -c counts **adjacent** equal lines, so sort first
when grouping values. Here service is field 3, separated by single spaces. We use
cut -d ' ' -f 3 to extract it; this simple parser assumes this fixture's spacing.

## Follow along
Start at the repository root in the same Bash terminal. Copy only the code, never the output. Run lines from top to bottom.

```bash
grep -F ' ERROR ' work/logs/platform.log | wc -l
grep -F ' ERROR ' work/logs/platform.log > work/reports/errors.txt
wc -l < work/reports/errors.txt
cut -d ' ' -f 3 work/reports/errors.txt | sort | uniq -c
printf '%s\n' 'PulseBridge investigation' > work/reports/practice-note.txt
printf '%s\n' 'Evidence is saved separately.' >> work/reports/practice-note.txt
cat work/reports/practice-note.txt
```

**Expected result**

```text
6
6
      3 gateway
      3 storage
PulseBridge investigation
Evidence is saved separately.
```

Leading spaces in wc/uniq output can vary. cut's -d chooses a delimiter and -f a
field (counting from 1). uniq -c adds counts. printf uses %s for a string and \n for
a newline. The grep redirection is silent. Repeating >> duplicates the appended
line; restart this disposable note with the > command if needed. Never run
`cat file > file`: the shell empties the file before cat reads it. Do not redirect
onto data/ or onto the input file. stderr does not enter this pipe automatically.

## Your turn
Count ERROR records for band-03 by adding a second grep before wc. Then show the final band-03 record using tail -n 1.

## Checkpoint
What happens if you replace >> with > for the second printf? Does uniq -c count all equal lines wherever they occur?

??? note "Hint 1 · Think about the goal"
    Each stage should do one job: select severity, select device, count.

??? note "Hint 2 · Choose a tool"
    Use grep -F " ERROR " work/logs/platform.log | grep -F band-03 | wc -l.

??? success "Check your understanding — open after trying"
    The second sentence replaces the first. uniq only groups adjacent equal lines. The exercise yields 3 error records and the 09:19:00Z INFO accepted record.

## Mini-challenge
Group all log records by severity using cut -d " " -f 2, sort and uniq -c. Check: ERROR 6, INFO 11, WARN 3 (sorted alphabetically). Explain why summing counts should give 20.

[Continue →](07-mission.md) · [Core path map](index.md)

</details>

[Next learning step →](07-mission.md) · [Learning path](index.md)
