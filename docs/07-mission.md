# 7 · Independent mission: wearable-platform incident

**Core path · 73–85 minutes**

## Why this matters
A colleague asks: “Did PulseBridge stop receiving uploads?” Your job is to report
what this snapshot supports, preserve evidence, and identify the next question.
There is no service to repair; do not edit configuration or invent clinical impact.

## Understand the task
An incident note separates observations from interpretation. Include the observed
window, counts, an exact evidence line, a limited conclusion and a next investigation.
Commands allow another person to reproduce your evidence. Use your existing work/
from chapter 4. The 20 records describe upload attempts and status observations,
not 20 people. The mission is formative practice, not a graded submission.

## Begin independently
Confirm your starting point before writing:

```bash
pwd
ls work/logs
head -n 1 work/logs/platform.log
```

Expected: your repository path, `platform.log`, and:

```text
2026-10-19T09:00:00Z INFO gateway band-01 upload accepted
```

pwd takes no argument; ls receives a directory; head -n 1 prints one line.
These read-only commands let you verify that you are analysing the intended snapshot.

## Your mission
1. Count all records, ERROR records and WARN records separately.
2. Keep errors.txt from chapter 6. Save only connection_refused records as work/reports/storage-errors.txt.
3. Find every band-03 record and its last observation. Decide exactly what that tells you.
4. Create work/reports/incident.txt in the VS Code editor (Explorer → work → reports → New File).
   Write 100–150 words: observed window, counts, one exact evidence line, your commands,
   one limitation and one proposed next investigation. Save with Ctrl+S (macOS: Cmd+S).
5. Check that errors.txt, storage-errors.txt and incident.txt exist. Keep data/ unchanged.

## Checkpoint
Can a peer reproduce your counts? Does your note distinguish a failed attempt from
a permanently lost measurement? Do you identify the actual observation rather
than claiming all devices or all patients were affected?

??? note "Hint 1 · Break it into questions"
    First count everything. Then filter one severity at a time. Filter the storage symptom separately; finally inspect the device timeline.

??? note "Hint 2 · Choose operations"
    wc -l counts records. grep -c -F counts matching lines. grep -F plus > saves matching records. grep -F band-03 plus tail -n 1 finds the last observed device record.

??? success "Self-check after your attempt"
    You should obtain 20 total records, 6 ERROR records and 3 WARN records. The storage evidence file has 3 lines. band-03 appears 6 times; its final record is 2026-10-19T09:19:00Z INFO gateway band-03 upload accepted. The window is 09:00–09:19 UTC on 19 October 2026. These checks let you diagnose your own work; a model incident report is reserved for the instructor. A later accepted upload does not prove full recovery or a root cause. Investigating service availability or correlating server-side logs would be reasonable next steps.

## Mini-challenge (optional)
Find a warning that is not immediately followed by an error for the same device.
Hint: compare adjacent lines with cat -n. Check: band-05's warning at 09:17 is followed
by an accepted upload at 09:18. A warning does not necessarily predict a failure.

[Continue to the five-minute recap →](recap.md)
