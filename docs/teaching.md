# Teaching notes and source mapping

## Facilitation

Use the recurring three-pillar map on the start page. Ask for three lecture recall
answers before demonstrating a command. Alternate short demonstrations with
student prediction, execution and partner explanation. At minutes 25, 55 and 82,
ask for a green/amber/red confidence signal; revisit paths or data flow if needed.
Students who finish early should do the challenges, rather than start Week 2 topics.

The final mini-project is formative. It is not an additional graded assignment.
The course's fortnightly exercise sheet can reuse the incident note as Part A and
add exam-style questions as Part B; this session does not alter the course's
50% pass threshold or 100% examination-based final grade.

Recommended Part B prompts: distinguish terminal/shell/kernel (MCQ); predict the
result of replacing `>>` with `>`; explain why six errors do not imply six patients.
At the next session retrieve these ideas without notes before processes/threads.

## Scope for Weeks 2–4

Keep process/thread inspection and scheduling for Week 2. Shell scripts, variables,
loops, aliases and startup configuration belong in a later automation session.
Editors, permissions and binary/octal representation can follow when their purpose
is motivated. C and direct system-call experiments can close the OS block if time
allows. SSH, networking, package management, Docker internals and Kubernetes are
not Practical 01 learning requirements. The devcontainer is prepared infrastructure.

## Supplied sources used

The supplied PDF is **01_Betriebssysteme_Linux_Kommandos.pdf**, Orhan Konak,
15 October 2025. Page numbers below are PDF pages (also the displayed slide numbers
except the cover). It is the primary command and progression reference.

| PDF pages | Adaptation in this handbook |
|---|---|
| 2–7 | Learn by doing and common Linux environment; replace tutorial image with a course devcontainer/Codespaces |
| 8–12 | `uname`, `pwd`, `cd`, `ls`, `ls -la`; explain `uname` as kernel name and avoid assuming `/root` |
| 13–20 | `cat`, `grep`, pipe, output file, `cp`, `wc`; recast database logs as synthetic wearable upload evidence |
| 21–24 | Bounded `find data`, quoted glob, configuration `diff` as optional challenges |
| 25–31 | Defer curl, Vim and permission changes; do not treat a database port as an HTTP endpoint |
| 32 | Explain terminal/server shutdown in setup; no requirement to exit the learning terminal mid-task |

The supplied automatically generated German transcript is titled **Du musst es
endlich lernen - YouTube**. No verified video URL or channel metadata was supplied;
this adaptation relies on the attached transcript, not a claim to have watched
the video. Transcript spelling/casing is corrected rather than copied literally.

| Transcript interval | Adaptation |
|---|---|
| 00:57–03:37 | CLI motivation, local versus remote execution; no sponsored VPS purchase |
| 03:37–07:45 | Navigation, paths, Tab/history/Ctrl+L, directories, touch and move |
| 07:45–11:31 | Inspect a log copy, grep and help; no real authentication logs or package installation |
| 11:31–15:18 | Save, append, read-only viewing, safe deletion and pipes; explicitly distinguish `>` from `\|` |
| 15:18–19:01 | Defer process inspection, awk, sorting/ranking and aliases |
| Remaining transcript | Defer scripts, shell configuration, permissions, SSH/keys and SCP |

Sources are read-only and have not been redistributed in this repository. The
handbook is an original English teaching adaptation, with newly fabricated data.

## Infrastructure references

- [Material installation](https://squidfunk.github.io/mkdocs-material/getting-started/)
- [GitHub devcontainer setup](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/setting-up-your-nodejs-project-for-codespaces)
- [Forwarding ports](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)

Dependency versions are pinned at the direct-dependency level, not a full transitive
lock or immutable container digest. Review updates before future course deliveries.
CI builds the handbook and checks fixtures on Linux. It does not create a Codespace.
