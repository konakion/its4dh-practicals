# Practical 01 · A terminal, a server, a wearable platform

**Principles of IT Systems for Digital Health Experts · HPI Master Digital Health**

You are investigating delayed uploads from a fictional wearable platform, PulseBridge.
By the end you will navigate a Linux server, preserve evidence and write a short,
reproducible incident note. No prior programming knowledge is required.
All records are synthetic; use no patient data.

```text
12-week course
[ Operating Systems: weeks 1–4 ] → [ Internet & WWW: weeks 5–8 ] → [ Complex IT Systems: weeks 9–12 ]
   YOU ARE HERE: Practical 01
```

## Before you start
Open [your Linux workspace](setup.md). Do this before class where possible.
Keep this public handbook in one browser tab and your own Codespace in another.
You do not install MkDocs. Each person gets a separate working copy.

**Recall:** What does an OS manage? What is a process? Why might an ML server have no desktop?
If unfamiliar, chapter 1 supplies the foundations.

## Your 90-minute core path

| Time | Chapter | What you can do afterwards |
|---|---|---|
| 0–10 | [1 · Why Linux?](01-motivation.md) | Explain shell, kernel and system calls |
| 10–18 | [2 · Orient yourself](02-orientation.md) | Identify your user and current directory |
| 18–30 | [3 · Navigate](03-navigation.md) | Use relative and absolute paths |
| 30–45 | [4 · Manage files safely](04-files.md) | Create, copy, rename and remove a practice file |
| 45–60 | [5 · Read and search logs](05-logs.md) | Find evidence without changing it |
| 60–73 | [6 · Connect tools](06-pipelines.md) | Filter, count, group and save output |
| 73–85 | [7 · Independent mission](07-mission.md) | Produce an evidence-based incident note |
| 85–90 | [Take home](recap.md) | Recall the key ideas without notes |

Stop optional mini-challenges when your chapter's time is up. Each one reinforces
its chapter; none is a prerequisite for the next chapter. If setup consumes class
time, work in pairs and finish the same route afterwards. A checkpoint is for
self-assessment, not a grade. This practical does not change course assessment:
fortnightly exercises pass at 50%; the examination determines the final grade.

## How to work independently
Predict the result before running a command. Compare the output with the example.
Try the exercise before opening Hint 1, then Hint 2, then the explanation.
Do not copy an entire page at once: read each result. `Ctrl+C` cancels a command;
`q` exits a viewer. [Troubleshooting](setup.md#getting-unstuck) explains common errors.

All chapters use the repository root as their starting point. Keep a single terminal.
The supplied `data/` directory is evidence; make changes only in your disposable `work/` copy.
Expected usernames, file order, timestamps and absolute workspace paths can vary.

After the core, choose [8 · Optional deep dives](08-deep-dives.md).
[Sources and adaptations](sources.md) identify verified reuse and new material.
