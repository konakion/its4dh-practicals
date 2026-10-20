# Practical 01 · Investigate PulseBridge

## Route for 90 minutes

| Minutes | Activity | Evidence of learning |
|---|---|---|
| 0–10 | Setup check and lecture recall | Explain shell versus kernel |
| 10–25 | Navigate the snapshot | Find the log and return to root |
| 25–40 | Create a safe workspace | Copy, rename and compare |
| 40–55 | Read and search | Identify failed uploads |
| 55–70 | Pipe, count and save | Produce an evidence file |
| 70–82 | Independent mini-project | Write an incident note |
| 82–90 | Peer review and take-home | Explain one command unaided |

Setup should ideally be completed before class. If it takes longer, the instructor
can supply a paired environment and move optional tasks to self-study.

## 1 · From your keyboard to the OS (0–10)

Think of a restaurant: the **terminal** is the order counter; the **shell** interprets
your order; a utility such as `cat` performs the requested work; the **kernel**
controls access to the kitchen's shared resources. The analogy has limits: the
kernel manages hardware and protection, not the meaning of your analysis.

```text
Keyboard → terminal → Bash shell → cat program
                                      ↓ system calls, e.g. open/read/write
                                   Linux kernel
                                      ↓
                              filesystem and devices
```

A terminal displays text and receives input. Bash is a command interpreter.
Many commands run external programs; `cd` is a shell builtin because it must change
the shell's own working directory. A command is **not** a system call. Utilities
request OS services through system calls, often via library functions. Reads may
be served from caches; every read need not cause physical disk access.

**Predict, then discuss:** Does `cat` bypass the kernel? Does `cd` move a file?
Answers: no; no, it changes your current directory.

## 2 · Locate the evidence (10–25)

Begin at the repository root identified in the setup guide. Commands in each block
run top to bottom; keep the same practical terminal throughout.

```bash
uname
pwd
ls
ls -la data
cat data/README.txt
cd data
pwd
ls
cd logs
ls
cd ..
cd ..
pwd
```

Expected: `Linux`; a repository path; then a listing of repository files.
Inside `data`, `ls` shows `README.txt`, `config`, and `logs` (order may vary).
Inside `logs`, it shows `platform.log`. Finally you are back at the repository root.
`ls -la` also includes `.` and `..`; ownership, timestamps and sizes can vary.

A path is an address. A **relative** path starts at your current directory, like
“two doors along this corridor.” An **absolute** path begins with `/`, like a full
street address. `.` means here, `..` means parent, and `~` means your user's home.
The home directory is not necessarily the repository; in this environment you are
not working as root. `cd` alone goes home, so do not use it to return to the project.

**Try:** From the repository root, reach `data/config`, list its files, then return
with `cd ../..`. Before typing, predict what `cd ..` will do. Explain to a partner
why `data/logs/platform.log` only works from the correct starting directory.

## 3 · Work on copies (25–40)

Original evidence stays in `data/`; all changes go into `work/`. First attempt only:

```bash
mkdir work
mkdir work/logs work/reports work/scratch
cp data/logs/platform.log work/logs/platform.log
cp data/config/platform.conf work/scratch/platform.conf
mv -i work/scratch/platform.conf work/scratch/platform-copy.conf
diff data/logs/platform.log work/logs/platform.log
touch work/scratch/practice.txt
ls work/scratch
rm -i work/scratch/practice.txt
```

Successful `mkdir`, `cp`, `mv` and `touch` normally print nothing. `diff` prints
nothing because the log files match. `ls` shows `platform-copy.conf` and
`practice.txt`. At the `rm -i` confirmation, type `y` and Enter to remove **only**
the empty practice file; `n` cancels. There is no terminal recycle bin.
`mv -i` asks before overwriting an existing destination; on this first run it
should not ask. `cp` leaves its source intact; `mv` relocates or renames its source.

!!! warning "Keep the scope small"
    Check `pwd` before writing. Never edit `data/`, system folders or your home
    configuration. No `sudo`, recursive deletion or permission changes are needed.
    `>` can overwrite a file without confirmation. Only use it for disposable
    files inside `work/reports/`. Never redirect a file onto itself.

**Repeating the session:** If `work` already exists, `mkdir` reports “File exists.”
Keep your previous notes: rename `work` to an unused name such as `work-first-run`
with the Explorer, then repeat this section. Do not delete a directory to reset.

**Checkpoint:** Which operation preserves the source: `cp` or `mv`? Why keep the
supplied snapshot separate from your analysis?

## 4 · Read before searching (40–55)

```bash
head -n 3 work/logs/platform.log
tail -n 2 work/logs/platform.log
less work/logs/platform.log
```

The first three lines are:

```text
2026-10-19T09:00:00Z INFO gateway band-01 upload accepted
2026-10-19T09:01:00Z INFO gateway band-02 upload accepted
2026-10-19T09:02:00Z WARN gateway band-03 battery low
```

The last two are:

```text
2026-10-19T09:18:00Z INFO gateway band-05 upload accepted
2026-10-19T09:19:00Z INFO gateway band-03 upload accepted
```

`head` reads the beginning, `tail` reads the end, and `less` provides a read-only
viewer. In `less`, use arrows or Space to move, type `/ERROR` and Enter to search,
`n` for the next match and `q` to quit. A short file may fit on one screen.
Use `cat data/README.txt` for a short file, rather than flooding the screen with
large logs. Logs contain observations, not diagnoses.

```bash
grep -F ' ERROR ' work/logs/platform.log
grep -n -F 'connection_refused' work/logs/platform.log
grep -c -F ' ERROR ' work/logs/platform.log
```

`grep` keeps matching lines; `-F` treats the pattern literally (not as a regular
expression). Quotes keep a pattern containing spaces together. The spaces around
`ERROR` match the severity field in this dataset. The first command prints six
records. The second returns line numbers **6, 10 and 15**, each followed by its
storage error record. The count is **6**. Searches are case-sensitive by default.
A record may mention a device multiple times, so six errors do not mean six people.

**Help:** Run `grep --help` for usage, then `man grep` for the manual (`q` to exit).
If the manual is absent in a local alternative, `--help` still works.

**Poll:** Could three storage errors prove that the database itself is down?
Vote yes/no/unsure and explain what extra evidence you would need.

## 5 · Connect small tools (55–70)

Like kitchen stations, each utility performs one job. A **pipe** carries standard
output from one command to the standard input of the next. It does not create a
file. A **redirection** tells the shell to send output to a file instead.

```bash
cat work/logs/platform.log | grep -F ' ERROR ' | wc -l
```

Output: **6** (leading spaces may vary). `wc -l` counts newline characters; every
record in this fixture ends with one, so this equals the number of matching
records. `grep -c` above reaches the same count more directly. The longer version
lets you see the data flow. Standard error is a separate stream; `>` below redirects
standard output only.

```bash
grep -F ' ERROR ' work/logs/platform.log > work/reports/errors.txt
wc -l < work/reports/errors.txt
cat work/reports/errors.txt
printf '%s\n' 'PulseBridge: six failed upload attempts.' > work/reports/incident.txt
printf '%s\n' 'Three attempts reported connection_refused.' >> work/reports/incident.txt
cat work/reports/incident.txt
```

The first command is silent. `wc` prints **6**; `<` supplies the file as standard
input, so no filename appears. `cat` shows six error records. `printf` prints a
line of text; `%s` inserts the quoted text and `\n` ends the line. Final output:

```text
PulseBridge: six failed upload attempts.
Three attempts reported connection_refused.
```

`>` creates or replaces a file; `>>` creates or appends. Repeating the append adds
a duplicate sentence. To restart this small report, rerun the `printf` command
using `>` first. Never run `cat file > file`: the shell truncates the file before
`cat` can read it.

**Predict before running:** What would happen if the second `printf` used `>`?
Answer: only the second sentence would remain. Explain why `|` and `>` differ.

## 6 · Your incident note (70–82)

Work independently, using the reference only when needed. Put evidence files in
`work/reports/` and edit your note using the VS Code editor (no new terminal editor
is required today).

1. Count all log records. Count failed upload attempts and warnings separately.
2. Save only `connection_refused` records to `work/reports/storage-errors.txt`.
3. Find all records for `band-03` and decide whether its final observed upload
   succeeded. Cite the timestamp and describe the limits of that claim.
4. Extend `work/reports/incident.txt` with the observed time window, your counts,
   one evidence line, and one proposed next investigation. Explain why the log
   alone cannot establish clinical impact or a root cause.

Do not modify configuration or “fix” a real service. The deliverable is the note
plus two filtered evidence files (`errors.txt` and `storage-errors.txt`). Compare
with [solutions](solutions.md) after trying.

## 7 · What to take home (82–90)

Exchange notes with a partner. Can they reproduce your numbers from your commands?
Recall without looking: current directory, copy versus move, pipe versus overwrite,
and one way a utility requests a kernel service.

- Paths depend on your location; `pwd` is your anchor.
- Preserve original evidence; inspect before changing.
- Build an analysis from small commands with visible outputs.
- Counts describe records, not necessarily devices or patients.
- Terminal, shell, utility, system call and kernel have distinct roles.

**Exit ticket:** Write one pipeline, predict its output, and explain each stage.
Tomorrow, reconstruct the error-count command without notes. In Week 2, explain
the shell/kernel distinction again before learning about processes and threads.
