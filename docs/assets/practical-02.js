/*
 * Content for Practical 02 · Processes & threads.
 *
 * Rendered by the same engine as Practical 01 (course-app.js). Text fields support
 * `code` and **bold**.
 *
 * Two places to work:
 *  - Browser Linux (chapters 2, 3 and the bonus): shell steps as in Practical 01. Every
 *    example output was produced by the browser Linux and is re-checked by
 *    scripts/test_course_browser.cjs. The programs `monitor` and `analyse` (fixtures/p02)
 *    are small shell scripts that simulate a bedside monitor and a CPU-hungry analysis.
 *  - Codespaces terminal (chapters 1, 4, 5, 6, 7): mode 'report'. Students run their Python
 *    program and the checker labs/practical-02/p02.py, which prints a result code such as
 *    P02-THREADS-2.01-QK7M. verify() checks that code (and the student's own numbers).
 *    Python examples are executed by scripts/test_learning.cjs.
 * Chapter 6 also uses mode 'interleave', a deterministic "you are the scheduler" exercise.
 */
(() => {
  const fmt = v => (Math.round(v * 100) / 100).toFixed(2);
  // Verify a pasted checker result. `then(values)` may add further checks.
  const result = (task, then) => (values, ctx) => {
    const r = ctx.parse(values.out, 'P02', task);
    if (r.error === 'missing') {
      return { ok: false, msg: /not yet|✘|No result code/i.test(values.out)
        ? 'The check says “Not yet”, so there is no result code yet. Read the feedback in your terminal, fix your program and run the check again.'
        : `I cannot find a result code in what you pasted. Run \`python3 p02.py check ${task}\` in the folder labs/practical-02 and copy the line that starts with P02-.` };
    }
    if (r.error === 'other-task') return { ok: false, msg: `That is the result code of a different task (${r.task.toLowerCase()}). This step needs \`python3 p02.py check ${task}\`.` };
    if (r.error === 'checksum') return { ok: false, msg: 'This result code is not complete or has a typo: its last four letters do not match. Copy the whole line from the terminal instead of typing it.' };
    return then(r.values, ctx);
  };
  const seqTime = ctx => (ctx.saved('threads/sequential') || {}).seconds;
  const thrTime = ctx => (ctx.saved('threads/threads') || {}).seconds;
  const cpu = ctx => ctx.saved('multiprocessing/processes');
  const near = (a, b, tol) => a != null && Math.abs(a - b) <= tol;

  // Probe helpers for the monitor exercises (run as the student, after the command).
  // A process killed with SIGKILL stays a zombie (state Z) until init collects it: count it as gone.
  const ALIVE = 'alive(){ p=$(cat ~/ward/$1.pid 2>/dev/null) && [ -n "$p" ] && [ -d /proc/$p ] && ! grep -q "^State:.Z" /proc/$p/status 2>/dev/null; }; ' +
    'settle(){ i=0; while alive $1 && [ $i -lt 5 ]; do sleep 0.1; i=$((i+1)); done; }; ';
  // Every exercise starts by stopping the course programs of earlier steps: politely first,
  // then by force (a frozen monitor ignores SIGTERM). Only the student's own processes exist here.
  // Killed processes can stay visible for a moment (as zombies, until init collects them), and
  // pidof would still list them: wait until they are really gone, at most 3 seconds.
  const STOP_ALL = 'killall -q monitor; killall -q analyse; sleep 0.2; killall -q -9 monitor; killall -q -9 analyse; rm -f ~/ward/*.pid; ' +
    'i=0; while { pidof monitor || pidof analyse; } >/dev/null && [ $i -lt 30 ]; do sleep 0.1; i=$((i+1)); done';
  const startMonitors = beds => beds.map(b => `monitor ${b} &`).join(' ') + ' i=0; while [ $i -lt 20 ]; do n=0; for b in ' + beds.join(' ') + '; do [ -f ~/ward/$b.pid ] && n=$((n+1)); done; [ $n = ' + beds.length + ' ] && break; sleep 0.1; i=$((i+1)); done';

window.PRACTICAL = {
  id: 'its4dh-p02',
  course: 'IT Systems for Digital Health Experts',
  title: 'Processes & threads',
  number: 'Practical 02',
  minutes: 90,
  home: '/home/student',
  user: 'student',
  host: 'pulsebridge',
  // Sourced before every command: the course programs are on the PATH, and job control
  // (jobs, fg) is switched on as in an interactive terminal.
  prelude: 'PATH="$HOME/bin:$PATH"; set -m',
  files: [
    { path: 'bin/monitor', url: 'fixtures/p02/monitor', readOnly: true, exec: true },
    { path: 'bin/analyse', url: 'fixtures/p02/analyse', readOnly: true, exec: true },
    { path: 'notes/handover.txt', url: 'fixtures/p02/handover.txt' },
  ],
  codespace: { href: 'https://codespaces.new/konakion/its4dh-practicals?quickstart=1', text: 'Open your Codespace' },

  intro: {
    lead: 'PulseBridge now runs a ward pilot: every bed has a small monitor program on the server that collects the patient’s heart rate and oxygen saturation. Today you learn to watch, start and stop these processes, and you help the developers make the data collection faster with threads, without losing data.',
    steps: [
      ['Read', 'a short explanation and one example.'],
      ['Try', 'it yourself: in the Linux system inside this page, or in your Codespaces terminal for the Python parts.'],
      ['Check', 'the result. You get feedback straight away and can retry as often as you like.'],
    ],
    note: 'Your progress is saved in this browser only. All data is synthetic: no real patients are involved.',
    demo: { cmd: 'ps -o pid,ppid,comm | grep monitor', out: '  104     1 monitor' },
    before: {
      title: 'Before you start: open your Codespace',
      text: [
        'Chapters 2 and 3 run in the Linux system inside this page. For the editors and the Python chapters you need a real terminal with Python: a **GitHub Codespace** of the course repository. It runs in your browser, on Windows, macOS or Linux, and needs no installation.',
        'Open it once, wait until the terminal at the bottom is ready, and type these two commands. Keep the Codespace open in a second browser tab.',
      ],
      commands: ['cd labs/practical-02', 'python3 p02.py start'],
      link: { href: 'https://codespaces.new/konakion/its4dh-practicals?quickstart=1', text: 'Open your Codespace' },
    },
  },

  chapters: [
    // ---------------------------------------------------------------- 1
    {
      id: 'editors',
      title: 'Text editors: nano & vim',
      minutes: 8,
      goal: 'Create and change a small Python file without leaving the terminal.',
      steps: [
        {
          id: 'nano',
          title: 'Write a file with nano',
          mode: 'report',
          where: 'codespace',
          learn: [
            'Servers in a data centre, for example the machine that trains a model on hospital data, usually have no desktop. You reach them through a terminal, so you edit files there too.',
            '**nano** is the friendliest terminal editor: you type directly, and the shortcuts are listed at the bottom (^ means Ctrl). Save with **Ctrl+O** and Enter, exit with **Ctrl+X**.',
          ],
          example: {
            cmd: 'nano work/notes.txt\ncat work/notes.txt',
            out: 'Bed 7: check the sensor battery',
            note: 'In nano you type the line, press Ctrl+O and Enter to save, and Ctrl+X to leave. `cat` then shows that the text is really in the file.',
          },
          task: 'In your Codespace, create the file `work/hello.py` with nano. It should contain one line: `print("Hello Digital Health!")`. Save it, leave nano, run it, then run the check and paste what the check printed.',
          commands: ['nano work/hello.py', 'python3 work/hello.py', 'python3 p02.py check hello'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check hello`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('hello', () => ({ ok: true, msg: 'Your file exists, it is valid Python, and it prints the greeting. You created, saved and ran a program without a mouse.' })),
          hints: [
            'Are you in the right folder? `pwd` should end with labs/practical-02. If not, type `cd labs/practical-02` first.',
            'In nano, type the line exactly as shown, with the quotes and brackets. Ctrl+O asks for the file name: just press Enter. Then Ctrl+X.',
          ],
          solution: 'nano work/hello.py\n   (type)  print("Hello Digital Health!")\n   Ctrl+O, Enter, Ctrl+X\npython3 work/hello.py\npython3 p02.py check hello',
          success: 'You created, saved and ran a program without a mouse.',
        },
        {
          id: 'vim',
          title: 'Survive vim',
          mode: 'report',
          where: 'codespace',
          learn: [
            '**vim** is installed on almost every Linux server, so the basics are worth knowing. vim has **modes**. It starts in **Normal mode**, where keys are commands, not text.',
            'Press `i` for **Insert mode** and type. Press `Esc` to return to Normal mode. There, `:wq` and Enter writes the file and quits, and `:q!` quits without saving.',
          ],
          example: {
            code: 'vim work/notes.txt     open the file (Normal mode)\ni                      Insert mode: now you can type\nEsc                    back to Normal mode\n:wq  Enter             write the file and quit\n:q!  Enter             quit and throw the changes away',
            file: 'vim in five keys',
            note: 'If vim seems to ignore you, press Esc twice: then you are in Normal mode again.',
          },
          task: 'Open `work/hello.py` in vim and add a second line: `print("Edited with vim")`. Save and quit with `:wq`, run the program, then run the check and paste the result.',
          commands: ['vim work/hello.py', 'python3 work/hello.py', 'python3 p02.py check vim'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check vim`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('vim', () => ({ ok: true, msg: 'hello.py now prints two lines. You switched between Normal and Insert mode and saved with :wq. That is enough vim to survive on any server.' })),
          hints: [
            'Move the cursor to the end of the first line, press `o` (opens a new line below and switches to Insert mode) or press `i` and use the arrow keys.',
            'Lost in vim? Press Esc, type `:q!` and Enter to leave without saving, then start again.',
          ],
          solution: 'vim work/hello.py\n   o        (new line below, Insert mode)\n   print("Edited with vim")\n   Esc\n   :wq      Enter\npython3 p02.py check vim',
          success: 'That is enough vim to survive on any server.',
        },
      ],
      quiz: [
        {
          q: 'You are in nano and want to save your file. What do you press?',
          options: [
            { t: 'Ctrl+O, then Enter', correct: true, why: 'Ctrl+O “writes Out” the file; Enter confirms the file name.' },
            { t: 'Ctrl+S', why: 'That is the shortcut of many desktop programs, but nano uses Ctrl+O.' },
            { t: ':wq', why: 'That is vim. In nano it would simply be typed into your file.' },
          ],
        },
        {
          q: 'You typed text in vim and want to leave **without** saving. Which keys?',
          options: [
            { t: 'Esc, then `:q!` and Enter', correct: true, why: 'Esc brings you back to Normal mode; :q! quits and discards the changes.' },
            { t: 'Ctrl+X', why: 'That exits nano. In vim nothing useful happens.' },
            { t: '`:wq` and Enter', why: 'That writes the changes to the file first, the opposite of what you want.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 2
    {
      id: 'processes',
      title: 'Exploring processes',
      minutes: 15,
      goal: 'Find processes, their PID and their parent, and see what keeps the CPU busy.',
      steps: [
        {
          id: 'program',
          title: 'From program to process',
          setup: STOP_ALL + '; rm -f ~/ward/bed-07.log',
          learn: [
            'A **program** is a file on disk, like a recipe in a cookbook. When you start it, Linux creates a **process**: the program in action, with its own memory and a unique number, the **process ID (PID)**. One recipe can be cooked in several kitchens at once: one program can run as several processes.',
            'PulseBridge’s bedside monitor is the program `monitor`. `monitor bed-07 3` collects readings for bed 7 for three seconds and writes them to `~/ward/bed-07.log`.',
          ],
          example: {
            cmd: 'ls -l bin',
            out: 'total 8\n-r-xr-xr-x    1 root     root           380 Oct 25 22:05 analyse\n-r-xr-xr-x    1 root     root          1367 Oct 25 22:05 monitor',
            note: 'The two course programs are files. The `x` in `-r-xr-xr-x` means: this file may be executed. Date and time on your screen differ.',
            volatile: true,
          },
          task: 'Start the monitor for **bed-07** for **3 seconds**. When it has finished, print its log file `~/ward/bed-07.log`.',
          check: { output: 'lines', expect: 'f=~/ward/bed-07.log; if [ "$(grep -c heart_rate "$f" 2>/dev/null)" = 3 ] && grep -q finished "$f"; then cat "$f"; else echo NOT_3; fi' },
          diagnose: [
            { when: { probe: /NOT_3/, stdout: /heart_rate/ }, msg: 'That log does not have exactly three readings. Run the monitor for exactly 3 seconds (`monitor bed-07 3`), then print the log again.' },
            { when: { stdout: /^$/, command: /monitor/ }, msg: 'The monitor ran: did you notice that the terminal was busy for a few seconds? But nothing was printed. Now show the log file with `cat`.' },
            { when: { probe: /NOT_3/, command: /^\s*cat/ }, msg: 'There is no complete log for bed-07 yet. Start the monitor first: `monitor bed-07 3`.' },
          ],
          hints: ['First run `monitor bed-07 3`. The terminal is busy for three seconds.', 'Then print the log with `cat ~/ward/bed-07.log`. You can also write both commands on two lines in one Run.'],
          solution: 'monitor bed-07 3\ncat ~/ward/bed-07.log',
          success: 'One reading per second, then the monitor stopped by itself. While it ran, the terminal was blocked: the shell waited for the process to end. Chapter 3 shows how to keep working while a program runs.',
        },
        {
          id: 'ps',
          title: 'List processes with ps',
          setup: STOP_ALL + '; ' + startMonitors(['bed-12']),
          learn: [
            '`ps` lists processes. On this server it shows all of them, including the kernel’s own helpers in [brackets]. With `-o` you choose the columns, for example `ps -o pid,user,comm` for PID, owner and command name.',
            'A pipe into `grep` keeps only the lines you are interested in, just like with log files.',
          ],
          example: {
            cmd: 'ps -o pid,user,comm | grep student',
            out: '   66 student  sh\n   68 student  ps\n   69 student  grep',
            note: 'Even `ps` and `grep` appear: while they run, they are processes too. Your numbers will differ.',
            volatile: 'numbers',
          },
          task: 'A monitor for **bed-12** is already running on the server (we started it for you). Find out its **PID**.',
          check: { output: 'names', expect: 'cat ~/ward/bed-12.pid 2>/dev/null' },
          diagnose: [
            { when: { probe: /^$/ }, msg: 'No monitor for bed-12 is running at the moment: it may have been stopped. Click **Reset exercise** to start it again.' },
            { when: { stdout: /student\s+sh\b/, command: /grep student/ }, msg: 'That is the example, which lists your shell, ps and grep. Look for the line of the monitor instead, for example with `grep monitor`.' },
          ],
          hints: ['Filter the list of processes for the word monitor: `ps | grep monitor`.', 'The PID is the number in the first column. `pidof monitor` prints it directly.'],
          solution: 'ps -o pid,user,comm,args | grep monitor',
          success: 'That number is the monitor’s PID. Linux uses it to tell processes apart, and you need it in chapter 3 to stop a process. Every start gets a new PID, so never write PIDs down for later.',
        },
        {
          id: 'parent',
          title: 'Parents and children',
          learn: [
            'Every process is started by another process: its **parent**. The parent’s PID is the **PPID**. When you run a command, your shell is the parent of the new process.',
            '`$$` holds the PID of your shell, `$PPID` the PID of your shell’s parent. With `ps -o pid,ppid,comm` you see both numbers for every process.',
          ],
          example: {
            cmd: 'echo $$\nps -o pid,ppid,comm | grep -w ps',
            out: '66\n   68    66 ps',
            note: 'The PPID of `ps` is the PID of the shell: the shell started `ps`. Your numbers will differ.',
            volatile: 'numbers',
          },
          task: 'Who started **your shell**? Print the PID of your shell’s parent, then find that parent in the process list. Which program is it?',
          check: { output: 'names', expect: 'echo $PPID' },
          diagnose: [
            { when: { command: /\$\$/, stdoutLines: 1 }, msg: 'That is the PID of your shell itself. The parent’s PID is in `$PPID`, or in the PPID column of `ps -o pid,ppid,comm`.' },
          ],
          hints: ['`echo $PPID` prints the parent’s PID.', 'Then look for that number in the PID column: `ps -o pid,ppid,user,comm,args`.'],
          solution: 'echo $PPID\nps -o pid,ppid,user,comm,args | grep -w "$PPID"',
          success: 'Your shell’s parent is a shell that belongs to root: the page’s own terminal, which starts a fresh shell for each Run. Follow the PPIDs further up and you always reach PID 1, `init`, the first process the kernel starts.',
        },
        {
          id: 'top',
          title: 'Who keeps the CPU busy? top',
          setup: STOP_ALL + '; analyse 60 & sleep 0.3',
          learn: [
            '`top` shows the processes that use the most CPU right now, sorted by the %CPU column, plus memory columns such as VSZ. Normally it fills the screen and refreshes every few seconds; press `q` to leave.',
            'This page cannot show live screens, so use **batch mode**: `top -b -n 1` prints one snapshot and exits.',
          ],
          example: {
            cmd: 'top -b -n 1 | head -n 4',
            out: 'Mem: 19212K used, 20764K free, 14948K shrd, 0K buff, 14948K cached\nCPU:  26% usr  13% sys   0% nic  60% idle   0% io   0% irq   0% sirq\nLoad average: 0.08 0.02 0.01 1/34 69\n  PID  PPID USER     STAT   VSZ %VSZ %CPU COMMAND',
            note: 'The first lines summarise memory, CPU and load. The process list starts below the column header. Your numbers will differ.',
            volatile: 'numbers',
          },
          task: 'The server suddenly feels slow. Take one snapshot with top and find the process that uses the most CPU, apart from top itself. What is its **PID**?',
          check: { output: 'names', expect: 'pidof analyse' },
          diagnose: [
            { when: { probe: /^$/ }, msg: 'The busy program has finished in the meantime (it runs for one minute). Click **Reset exercise** to start it again, then take your snapshot.' },
            { when: { stderr: /top: .*(option|usage)/i }, msg: 'Use batch mode: `top -b -n 1`.' },
          ],
          timeoutMsg: 'top runs until you press q, but this page cannot send keys while a command runs, so it was stopped after 10 seconds. Use batch mode: `top -b -n 1`.',
          hints: ['Run `top -b -n 1 | head -n 12` and look at the %CPU column.', 'Ignore the line of top itself. The other busy process is called analyse.'],
          solution: 'top -b -n 1 | head -n 12',
          success: 'The culprit is `analyse`. It only calculates and never waits, so it takes all the CPU it can get: a **CPU-bound** process. Keep the word in mind for chapter 5. The monitors, in contrast, sleep most of the time.',
        },
      ],
      quiz: [
        {
          q: 'What is the difference between a program and a process?',
          options: [
            { t: 'A program is a file on disk; a process is a running instance of it, with its own PID and memory', correct: true, why: 'Like a recipe (program) and the cooking that is happening right now (process).' },
            { t: 'There is no difference, the words mean the same', why: 'One program can run as several processes at the same time, each with its own PID.' },
            { t: 'A process is a program that has finished', why: 'A process exists only while the program runs.' },
          ],
        },
        {
          q: 'Your shell has the PID 230. You start `monitor bed-02 5`. What is the PPID of the new monitor process?',
          options: [
            { t: '230', correct: true, why: 'The shell started the monitor, so the shell is its parent.' },
            { t: '1', why: 'PID 1 (init) is the ancestor of all processes, but not the direct parent here.' },
            { t: 'The same as its PID', why: 'A process cannot be its own parent.' },
          ],
        },
        {
          review: 'Review from Practical 01',
          q: 'Which command shows only the lines of the process list that contain “monitor”?',
          options: [
            { t: '`ps | grep monitor`', correct: true, why: 'The pipe hands the output of ps to grep, which keeps the matching lines.' },
            { t: '`ps > monitor`', why: 'That writes the whole list into a file called monitor.' },
            { t: '`grep ps monitor`', why: 'That searches a file called monitor for the text ps.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 3
    {
      id: 'manage',
      title: 'Managing processes',
      minutes: 12,
      goal: 'Run programs in the background and stop them safely.',
      steps: [
        {
          id: 'background',
          title: 'Run in the background with &',
          setup: STOP_ALL + '; rm -f ~/ward/bed-03.* ~/ward/bed-04.*',
          learn: [
            'Normally a program runs in the **foreground**: the shell waits until it ends. Put `&` at the end of a command and it runs in the **background**: you get the prompt back at once.',
            '`$!` holds the PID of the program you just started, and `jobs` lists the background jobs of this shell. Here every Run is a new shell, so `jobs` only shows what you started in the same Run.',
          ],
          example: { cmd: 'sleep 5 &\njobs', out: '[1]+  Running                    sleep 5', note: '`[1]` is the job number. The shell did not wait five seconds: `jobs` ran straight away.' },
          task: 'Start monitors for **bed-03** and **bed-04** in the background (the default runtime is fine), then list your jobs, all in one Run.',
          check: { state: ALIVE + 'for b in bed-03 bed-04; do j=0; while [ ! -f ~/ward/$b.pid ] && [ $j -lt 10 ]; do sleep 0.1; j=$((j+1)); done; done; n=0; for b in bed-03 bed-04; do alive $b && n=$((n+1)); done; case $n in 2) echo OK;; 1) echo RUNNING_1;; *) echo RUNNING_0;; esac' },
          reasons: {
            RUNNING_0: 'No monitor for bed-03 or bed-04 is running. Start each one with its bed name and an `&` at the end, for example `monitor bed-03 &`.',
            RUNNING_1: 'Only one of the two monitors is running. Start both, each with its own `&`.',
          },
          mustUse: [{ re: /\bjobs\b/, msg: 'Both monitors are running in the background. Now also list them with `jobs`, in the same Run as the two starts. (Click Reset exercise first, so that you start fresh.)' }],
          timeoutMsg: 'The monitor ran in the **foreground**, so the shell waited for it, and after 10 seconds the page stopped it. Put `&` at the end of each command.',
          hints: ['`monitor bed-03 &` starts one monitor in the background.', 'Three lines: one per monitor, then `jobs`.'],
          solution: 'monitor bed-03 &\nmonitor bed-04 &\njobs',
          success: 'Two monitors run side by side while your shell stays free: that is how servers run many programs at the same time. Both keep running after this Run, until they stop themselves or you stop them.',
        },
        {
          id: 'fg',
          title: 'Bring a job back with fg',
          setup: STOP_ALL + '; rm -f ~/ward/bed-05.*',
          learn: [
            '`fg` brings the most recent background job back to the **foreground**: the shell waits for it again, as if you had started it without `&`. With several jobs, `fg %2` picks job number 2.',
            'In a normal terminal you can also press **Ctrl+Z** to pause a foreground program and `bg` to let it continue in the background.',
          ],
          example: { cmd: 'sleep 2 &\nfg\necho "sleep has finished"', out: 'sleep 2\nsleep has finished', note: '`fg` prints the command it brings back, then waits until `sleep 2` has finished.' },
          task: 'In one Run: start the monitor for **bed-05** for **3 seconds** in the background, list it with `jobs`, bring it to the foreground with `fg`, and finally print the **last line** of its log.',
          check: { output: 'names', expect: 'f=~/ward/bed-05.log; grep -q finished "$f" 2>/dev/null && tail -n 1 "$f" || echo NOT_FINISHED' },
          mustUse: [
            { re: /&/, msg: 'Correct last line, but the task is to start the monitor in the background first (`&`), then bring it back with `fg`.' },
            { re: /\bfg\b/, msg: 'Correct last line, but bring the job back with `fg` before you print the log.' },
          ],
          diagnose: [
            { when: { probe: /NOT_FINISHED/ }, msg: 'The monitor for bed-05 has not finished yet, so its log has no final line. With `fg` the shell waits until it is done. Did you give it 3 seconds (`monitor bed-05 3 &`)?' },
          ],
          hints: ['Four lines: `monitor bed-05 3 &`, `jobs`, `fg`, and a `tail` command.', '`tail -n 1 ~/ward/bed-05.log` prints the last line.'],
          solution: 'monitor bed-05 3 &\njobs\nfg\ntail -n 1 ~/ward/bed-05.log',
          success: 'The last line says the monitor finished: `fg` made the shell wait for it. Background and foreground are two ways to run the same process.',
        },
        {
          id: 'kill',
          title: 'Stop a process politely: kill',
          setup: STOP_ALL + '; rm -f ~/ward/bed-14.*; ' + startMonitors(['bed-14']),
          learn: [
            '`kill PID` sends a **signal** to a process. By default it is **SIGTERM** (signal 15), a polite request: please finish and stop. Well-written programs catch SIGTERM, save their data and exit.',
            'The PulseBridge monitor writes a last line into its log when it receives SIGTERM. You may only send signals to your own processes, never to other users’ processes.',
          ],
          example: { cmd: 'kill -l 15', out: 'TERM', note: '`kill -l` translates signal numbers into names: 15 is TERM, the signal that `kill` sends when you give no number.' },
          task: 'The patient in bed 14 has been moved to another ward. Stop the monitor of **bed-14** politely. Then look at the end of its log to see how it said goodbye.',
          check: { state: ALIVE + 'settle bed-14; if alive bed-14; then echo STILL_RUNNING; elif tail -n 1 ~/ward/bed-14.log | grep -q "stopped cleanly"; then echo OK; else echo NOT_CLEAN; fi' },
          reasons: {
            STILL_RUNNING: 'The monitor of bed-14 is still running. Find its PID (`ps | grep monitor` or `pidof monitor`), then send the signal with `kill PID`.',
            NOT_CLEAN: 'The monitor is gone, but its log has no goodbye line: it was killed without a chance to save. Click **Reset exercise** and stop it with plain `kill PID`, without -9.',
          },
          hints: ['First find the PID: `ps | grep monitor`.', 'Then `kill` followed by that number. `kill $(pidof monitor)` does both in one step, because only one monitor runs.'],
          solution: 'pidof monitor\nkill $(pidof monitor)\ntail -n 2 ~/ward/bed-14.log',
          success: 'The log ends with “stopped cleanly (SIGTERM), data saved”: the monitor caught the signal and finished properly. Always try this first.',
        },
        {
          id: 'kill9',
          title: 'When polite does not work: kill -9',
          setup: STOP_ALL + '; rm -f ~/ward/bed-09.*; MONITOR_FROZEN=1 ' + startMonitors(['bed-09']),
          learn: [
            'Sometimes a program hangs and ignores SIGTERM. Then `kill -9 PID` sends **SIGKILL** (signal 9). The kernel removes the process immediately, and the program cannot react at all.',
            'No saving, no last log line, no cleaning up. That is why SIGKILL is the last resort, not the first try.',
          ],
          example: { cmd: 'kill -l 9', out: 'KILL', note: 'Signal 9 is KILL. A program can catch or ignore TERM, but never KILL.' },
          task: 'The monitor of **bed-09** has frozen. First try a polite `kill` and check that it is still running. Then stop it for good.',
          check: { state: ALIVE + 'settle bed-09; if alive bed-09; then echo STILL_RUNNING; else echo OK; fi' },
          reasons: { STILL_RUNNING: 'The monitor of bed-09 is still running. If you already sent a normal `kill`: it ignores SIGTERM. Use `kill -9 PID`.' },
          hints: ['Find the PID with `pidof monitor`, try `kill PID`, and check with `ps | grep monitor` whether it is still there.', 'Still there? Then `kill -9 PID`.'],
          solution: 'kill $(pidof monitor)\nsleep 1; ps | grep monitor\nkill -9 $(pidof monitor)',
          success: 'Gone. Compare the logs: `tail -n 1 ~/ward/bed-14.log` ends with a goodbye, `tail -n 1 ~/ward/bed-09.log` just stops in the middle of the readings. Whatever bed-09 had not saved yet is lost.',
        },
        {
          id: 'challenge',
          title: 'Mini-challenge: discharge one patient',
          setup: STOP_ALL + '; rm -f ~/ward/bed-3?.* ~/ward/stopped.txt; ' + startMonitors(['bed-31', 'bed-32', 'bed-33']),
          learn: [
            'Time to combine what you know, with less help. On a real server, many similar processes run side by side, and stopping the wrong one can interrupt a patient’s monitoring.',
            'So look carefully before you send a signal: `ps -o pid,args` shows the full command line, including the bed name.',
          ],
          example: { cmd: 'echo $$ > notes/my-shell.txt\ncat notes/my-shell.txt', out: '66', note: 'You can write a PID into a file like any other text. Your number will differ.', volatile: 'numbers' },
          task: 'Three monitors are running. The patient in bed 32 has been discharged. Stop **only** the monitor of **bed-32**, politely, and leave the other two running. Write the PID you stopped into `~/ward/stopped.txt`.',
          check: {
            state: ALIVE + 'settle bed-32; pid=$(grep "^bed-32 " ~/ward/.started | tail -n 1 | cut -d" " -f2); ' +
              'if ! alive bed-31 || ! alive bed-33; then echo OTHERS_STOPPED; ' +
              'elif alive bed-32; then echo STILL_RUNNING; ' +
              'elif ! tail -n 1 ~/ward/bed-32.log | grep -q "stopped cleanly"; then echo NOT_CLEAN; ' +
              'elif [ ! -f ~/ward/stopped.txt ]; then echo NO_FILE; ' +
              'elif [ "$(tr -d " \\n" < ~/ward/stopped.txt)" != "$pid" ]; then echo WRONG_PID; else echo OK; fi',
          },
          reasons: {
            OTHERS_STOPPED: 'A monitor that should keep running was stopped (bed-31 or bed-33). Those patients are still on the ward! Click **Reset exercise** and stop only the monitor of bed-32. (`killall` stops every process with that name.)',
            STILL_RUNNING: 'The monitor of bed-32 is still running. Use `ps -o pid,args | grep bed-32` to find its PID.',
            NOT_CLEAN: 'The monitor of bed-32 is gone, but without a goodbye line: it was killed with SIGKILL. Polite first! Click **Reset exercise** and use plain `kill`.',
            NO_FILE: 'bed-32 was stopped correctly. Now write its PID into `~/ward/stopped.txt`, for example with `echo PID > ~/ward/stopped.txt`.',
            WRONG_PID: '`~/ward/stopped.txt` does not contain the PID of the bed-32 monitor. Write exactly that number into the file, nothing else.',
          },
          hints: ['`ps -o pid,args | grep bed-32` shows the right line. The first number is the PID.', 'Then `kill PID` and `echo PID > ~/ward/stopped.txt` with that number.'],
          solution: 'ps -o pid,args | grep bed-32\npid=$(cat ~/ward/bed-32.pid)\nkill $pid\necho $pid > ~/ward/stopped.txt',
          solutionNote: 'One possible solution. Every monitor also stores its PID in ~/ward/BED.pid, which this solution uses. Typing the number that ps showed you works just as well.',
          success: 'Exactly one monitor stopped, cleanly, and documented. That is how careful administrators work: identify, act politely, write it down.',
        },
      ],
      quiz: [
        {
          q: 'You started `monitor bed-08 &`. What does the `&` do?',
          options: [
            { t: 'It runs the monitor in the background, so the shell is free at once', correct: true, why: 'Without &, the shell would wait until the monitor ends.' },
            { t: 'It runs the monitor twice', why: '& starts one process; it only decides that the shell does not wait for it.' },
            { t: 'It makes the monitor run faster', why: 'The monitor runs exactly as before. Only the shell does not wait.' },
          ],
        },
        {
          q: 'Why should you try `kill PID` before `kill -9 PID`?',
          options: [
            { t: 'SIGTERM lets the program save its data and clean up; SIGKILL stops it immediately without any chance to react', correct: true, why: 'That is why the bed-14 log had a goodbye line and the bed-09 log did not.' },
            { t: 'kill -9 only works for programs of the user root', why: 'You used kill -9 on your own process. The difference is how the program can react.' },
            { t: 'kill without a number does nothing, it only checks the PID', why: 'Without a number, kill sends SIGTERM (15).' },
          ],
        },
        {
          review: 'Review from chapter 2',
          q: 'Which column in `ps -o pid,ppid,comm` tells you which process started another one?',
          options: [
            { t: 'PPID', correct: true, why: 'The PPID is the PID of the parent: the process that started this one.' },
            { t: 'PID', why: 'The PID identifies the process itself, not its parent.' },
            { t: 'COMMAND', why: 'That is the program name.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 4
    {
      id: 'threads',
      title: 'Sequential vs. multithreading',
      minutes: 20,
      goal: 'Measure a program that waits, then let threads overlap the waiting.',
      steps: [
        {
          id: 'sequential',
          title: 'Waiting, one sensor after another',
          mode: 'report',
          where: 'codespace',
          learn: [
            'A patient wears three wireless sensors: heart rate, blood oxygen and temperature. Asking a sensor for its value takes time, and most of that time the program only **waits** for the reply. In our code, `time.sleep(2)` stands for this waiting: the CPU has nothing to do meanwhile.',
            '`time.perf_counter()` reads a precise clock. The difference between two readings is the elapsed time.',
          ],
          example: {
            file: 'timing_demo.py',
            code: 'import time\n\nstart = time.perf_counter()\ntime.sleep(1.5)                  # pretend to wait for one sensor\nelapsed = time.perf_counter() - start\nprint(f"Waited {elapsed:.2f} s")',
            cmd: 'python3 timing_demo.py',
            out: 'Waited 1.50 s',
            note: 'Measure right before and right after the part you are interested in. On a busy machine you may see 1.51 s: waking up again takes a moment.',
            volatile: 'numbers',
          },
          task: '`work/sequential.py` asks the three sensors one after another. Complete the two TODOs so that the program measures and prints its total runtime with `time.perf_counter()`. Run it, then run the check and paste the result.',
          commands: ['python3 work/sequential.py', 'python3 p02.py check sequential'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check sequential`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('sequential', ([t]) => ({ ok: true, save: { seconds: t }, msg: `Your program took ${fmt(t)} s: three waits of 2 s, one after the other. During these ${fmt(t)} s the CPU was idle almost all the time.` })),
          chart: saved => saved && ({
            type: 'timeline', title: 'Your sequential run: one sensor after another', unit: 's',
            groups: [{ name: `Sequential, ${fmt(saved.seconds)} s in total`, bars: ['heart rate', 'blood oxygen', 'temperature'].map((n, i) => ({ label: n, start: i * saved.seconds / 3, end: (i + 1) * saved.seconds / 3 })) }],
          }),
          hints: [
            'TODO 1 is one line before the loop: `start = time.perf_counter()`.',
            'TODO 2 comes after the loop: `elapsed = time.perf_counter() - start`, then `print(f"Total time: {elapsed:.2f} s")`.',
          ],
          solution: 'start = time.perf_counter()\n\nfor name in sensors:\n    read_sensor(name)\n\nelapsed = time.perf_counter() - start\nprint(f"Total time: {elapsed:.2f} s")',
          success: 'Three waits, one after the other.',
        },
        {
          id: 'threads',
          title: 'Three sensors at the same time',
          mode: 'report',
          where: 'codespace',
          learn: [
            'A **thread** is a separate strand of work inside one process. All threads of a process share its memory. `threading.Thread(target=function, args=(...,))` creates a thread, `start()` lets it run, and `join()` waits until it has finished.',
            'While one thread waits for its sensor, the other threads can wait at the same time: the waiting periods overlap.',
          ],
          example: {
            file: 'thread_demo.py',
            code: 'import threading\nimport time\n\ndef download(report):\n    time.sleep(1)                    # waiting for the lab server\n    print(f"{report} downloaded")\n\nt = threading.Thread(target=download, args=("blood test",))\nt.start()                            # runs alongside the main program from now on\nprint("main program keeps going")\nt.join()                             # wait until the thread has finished\nprint("all done")',
            cmd: 'python3 thread_demo.py',
            out: 'main program keeps going\nblood test downloaded\nall done',
            note: 'Note the comma in `args=("blood test",)`: args must be a tuple, even with one value.',
          },
          task: '`work/threaded.py` contains the same three sensors. Complete the TODOs: create one thread per sensor, start them all, then wait for all of them. Run the check and paste the result.',
          commands: ['python3 work/threaded.py', 'python3 p02.py check threads'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check threads`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('threads', ([t], ctx) => {
            const s = seqTime(ctx);
            return { ok: true, save: { seconds: t }, msg: `${fmt(t)} s instead of ${s ? fmt(s) : 'about 6'} s. The three threads waited at the same time, so the program only had to wait once.` };
          }),
          chart: (saved, ctx) => {
            if (!saved) return null;
            const s = seqTime(ctx) || 6, t = saved.seconds, names = ['heart rate', 'blood oxygen', 'temperature'];
            return {
              type: 'timeline', title: 'The same waiting, sequential and with threads', unit: 's', tick: 1,
              groups: [
                { name: `Sequential, ${fmt(s)} s${seqTime(ctx) ? '' : ' (typical value)'}`, bars: names.map((n, i) => ({ label: n, start: i * s / 3, end: (i + 1) * s / 3 })) },
                { name: `Three threads, ${fmt(t)} s (your run)`, bars: names.map(n => ({ label: n, start: 0, end: t })) },
              ],
              note: 'The bars are the waiting periods. With threads they overlap. The CPU did not calculate any faster: there was nothing to calculate.',
            };
          },
          hints: [
            'Inside the loop: `t = threading.Thread(target=read_sensor, args=(name,))`, then `t.start()` and `threads.append(t)`.',
            'After the loop, a second loop: `for t in threads:` and inside it `t.join()`. Do not call join() in the first loop.',
          ],
          solution: 'threads = []\nfor name in sensors:\n    t = threading.Thread(target=read_sensor, args=(name,))\n    t.start()\n    threads.append(t)\n\nfor t in threads:\n    t.join()',
          success: 'The waits overlapped.',
        },
        {
          id: 'speedup',
          title: 'Calculate the speedup',
          mode: 'report',
          learn: [
            '**Speedup** compares two runtimes: speedup = old time ÷ new time. A speedup of 2 means twice as fast.',
            'Here the threads did not make the CPU faster. They only stopped the program from waiting three times in a row: the three waiting periods now overlap. That is why threads help so much with waiting and so little with calculating.',
          ],
          example: { cmd: 'python3 -c "print(12 / 4)"', out: '3.0', note: 'A report that took 12 s before and 4 s after an improvement: speedup 12 ÷ 4 = 3.' },
          task: 'Use **your own** times from the last two steps (sequential and threaded, see the chart there) and calculate the speedup of the threaded version. Then explain why it is faster.',
          fields: [
            { id: 'speedup', type: 'number', label: 'Speedup', unit: '×', help: 'Two decimals are enough, for example 2.85.' },
            {
              id: 'why', type: 'choice', label: 'Why is the threaded version faster?',
              options: [
                { v: 'overlap', t: 'The three waiting periods overlap instead of following each other.' },
                { v: 'cpu', t: 'Three threads make the CPU calculate three times faster.' },
                { v: 'cores', t: 'Each thread ran on its own CPU core.' },
              ],
            },
          ],
          verify: (v, ctx) => {
            const s = seqTime(ctx), t = thrTime(ctx);
            if (!s || !t) return { ok: false, msg: 'I need your measurements first: solve steps 1 and 2 of this chapter (sequential and threads), then come back.' };
            const want = s / t, x = ctx.number(v.speedup);
            if (x == null) return { ok: false, msg: 'Enter the speedup as a number, for example 2.85.' };
            if (near(x, t / s, 0.03)) return { ok: false, msg: `You divided the new time by the old one (${fmt(t)} ÷ ${fmt(s)}). Speedup is old ÷ new: ${fmt(s)} ÷ ${fmt(t)}. A speedup greater than 1 means faster.` };
            if (!near(x, want, Math.max(0.05, want * 0.03))) {
              return { ok: false, msg: near(x, 3, 0.01) && !near(want, 3, 0.05)
                ? `3 would be the ideal for three threads, but your own times give ${fmt(s)} ÷ ${fmt(t)}. Starting threads and printing also costs a little time.`
                : `Not quite. With your times: sequential ${fmt(s)} s, threaded ${fmt(t)} s. Divide the old time by the new time.` };
            }
            if (v.why === 'cpu') return { ok: false, partial: true, msg: 'The number is right. But the CPU did not calculate faster: it had nothing to calculate. Which part of the program got shorter?' };
            if (v.why === 'cores') return { ok: false, partial: true, msg: 'The number is right. But waiting needs no core at all: even on a machine with one core the threads would be just as fast here. What really changed?' };
            return { ok: true, save: { speedup: want }, msg: `Speedup ${fmt(want)}: ${fmt(s)} s ÷ ${fmt(t)} s. Threads overlapped the waiting periods. For waiting (I/O-bound) work, threads are the right tool.` };
          },
          chart: (saved, ctx) => (seqTime(ctx) && thrTime(ctx) ? {
            type: 'bars', title: 'Your measured runtimes', unit: 's',
            bars: [{ label: 'sequential', value: seqTime(ctx) }, { label: 'three threads', value: thrTime(ctx) }],
          } : null),
          hints: ['Speedup = sequential time ÷ threaded time.', 'Think about what the CPU did during `time.sleep(2)`: nothing.'],
          solution: 'speedup = sequential time ÷ threaded time, for example 6.01 ÷ 2.00 = 3.00\nThe waiting periods overlap.',
          success: 'Threads overlap waiting.',
        },
      ],
      quiz: [
        {
          q: 'A program with three threads that each wait 2 seconds for a sensor takes about 2 seconds in total. Why?',
          options: [
            { t: 'The threads wait at the same time, so the waiting periods overlap', correct: true, why: 'While one thread waits, the others can wait too. The CPU hardly works at all.' },
            { t: 'The CPU calculates three times faster with three threads', why: 'There was nothing to calculate. Threads do not make a CPU faster.' },
            { t: 'Python skips the sleep calls when several threads run', why: 'Every thread really waited 2 s, just at the same time.' },
          ],
        },
        {
          q: 'What does `t.join()` do?',
          options: [
            { t: 'It waits until thread t has finished', correct: true, why: 'Without join, the main program could print the total time before the threads are done.' },
            { t: 'It starts thread t', why: 'That is start().' },
            { t: 'It joins two threads into one', why: 'join only waits; the thread stays the same.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'In the shell, which symbol is the counterpart of `threading.Thread(...).start()`: start something and continue at once?',
          options: [
            { t: '`&` at the end of a command', correct: true, why: 'Both start work that runs alongside, and you get control back immediately. With & it is a process, with Thread a thread.' },
            { t: '`|` between two commands', why: 'The pipe connects the output of one command to the input of the next.' },
            { t: '`>` before a file name', why: 'That writes output into a file.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      id: 'multiprocessing',
      title: 'Multiprocessing & performance',
      minutes: 15,
      goal: 'See why threads do not speed up calculations in Python, and when processes do.',
      steps: [
        {
          id: 'cpu-threads',
          title: 'Calculating, not waiting',
          mode: 'report',
          where: 'codespace',
          learn: [
            'Counting prime numbers keeps the CPU busy all the time: this work is **CPU-bound**. In standard Python (CPython), the **Global Interpreter Lock (GIL)** lets only one thread at a time run Python code. So CPU-bound threads take turns instead of working side by side.',
            'Free-threaded Python builds without the GIL exist (Python 3.13 and later), but they are not the default yet.',
          ],
          example: {
            file: 'primes_demo.py',
            code: 'def count_primes(start, end):\n    count = 0\n    for n in range(max(start, 2), end):\n        if all(n % d for d in range(2, int(n ** 0.5) + 1)):\n            count += 1\n    return count\n\nprint(count_primes(1, 20), "primes below 20")',
            cmd: 'python3 primes_demo.py',
            out: '8 primes below 20',
            note: '2, 3, 5, 7, 11, 13, 17 and 19. For large ranges the CPU tests millions of divisions, without a single pause.',
          },
          task: '`work/cpu_compare.py` counts primes in four blocks of numbers: first sequentially, then with four threads. Run the check (it measures both versions) and paste the result.',
          commands: ['python3 p02.py check cpu-threads'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check cpu-threads`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('cpu-threads', ([seq, thr, cores]) => ({
            ok: true, save: { seq, thr, cores },
            msg: thr > 0.8 * seq
              ? `Sequential ${fmt(seq)} s, four threads ${fmt(thr)} s: no real gain, even though your Codespace has ${cores} core${cores > 1 ? 's' : ''}. Because of the GIL, the threads took turns.`
              : `Sequential ${fmt(seq)} s, four threads ${fmt(thr)} s: the threads were faster. That happens with a free-threaded Python build without the GIL. In standard Python, expect no gain.`,
          })),
          chart: saved => saved && ({ type: 'bars', title: 'CPU-bound work: your measurement', unit: 's', bars: [{ label: 'sequential', value: saved.seq }, { label: 'four threads', value: saved.thr }] }),
          hints: ['You do not need to change any code in this step. Run `python3 p02.py check cpu-threads` in the folder labs/practical-02.'],
          solution: 'python3 p02.py check cpu-threads',
          success: 'Threads take turns on CPU-bound work.',
        },
        {
          id: 'processes',
          title: 'Separate processes, separate cores',
          mode: 'report',
          where: 'codespace',
          learn: [
            'Every **process** has its own Python interpreter, and with it its own GIL. `ProcessPoolExecutor` from `concurrent.futures` starts several worker processes, and the operating system can place them on different CPU cores.',
            'Starting processes costs time, so it pays off only for work that takes long enough. Worker processes import your file: keep the line `if __name__ == "__main__":`.',
          ],
          example: {
            file: 'pool_demo.py',
            code: 'from concurrent.futures import ThreadPoolExecutor\n\ndef double(x):\n    return 2 * x\n\nwith ThreadPoolExecutor(max_workers=3) as pool:\n    print(list(pool.map(double, [1, 2, 3])))',
            cmd: 'python3 pool_demo.py',
            out: '[2, 4, 6]',
            note: '`pool.map` applies the function to every item and collects the results in order. ProcessPoolExecutor has exactly the same interface.',
          },
          task: 'In `work/cpu_compare.py`, complete `with_processes()`: it should do the same as `with_threads()`, but with a `ProcessPoolExecutor`. Run the file once yourself, then run the check and paste the result.',
          commands: ['python3 work/cpu_compare.py', 'python3 p02.py check cpu'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check cpu`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('cpu', ([seq, thr, proc, cores]) => ({
            ok: true, save: { seq, thr, proc, cores },
            msg: cores > 1
              ? `Processes: ${fmt(proc)} s, compared with ${fmt(seq)} s sequential and ${fmt(thr)} s with threads. Your ${cores} cores worked at the same time, each process with its own interpreter.`
              : `Your Codespace reports only one core, so the processes could not run at the same time (${fmt(proc)} s vs. ${fmt(seq)} s). On a machine with more cores they would.`,
          })),
          chart: saved => saved && ({
            type: 'bars', title: `CPU-bound work on ${saved.cores} core${saved.cores > 1 ? 's' : ''}: your measurement`, unit: 's',
            bars: [{ label: 'sequential', value: saved.seq }, { label: 'four threads', value: saved.thr }, { label: 'four processes', value: saved.proc }],
            note: 'Measured times depend on the machine, its cores and what else runs on it. Run the check again and the numbers will differ a little.',
          }),
          hints: [
            'Copy the two lines of `with_threads()` into `with_processes()` and replace the old body (the TODO and `return None`).',
            'Then change `ThreadPoolExecutor` to `ProcessPoolExecutor`. It is already imported at the top.',
          ],
          solution: 'def with_processes():\n    with ProcessPoolExecutor(max_workers=4) as pool:\n        return list(pool.map(count_primes, BLOCKS))',
          success: 'Processes use separate cores.',
        },
        {
          id: 'speedup-cpu',
          title: 'How much faster, and why not more?',
          mode: 'report',
          learn: [
            'With several processes, the best possible speedup is the number of CPU cores: two cores, at most twice as fast. In practice it is less, because starting the processes and collecting the results costs time.',
            'More workers than cores do not help: the extra processes just wait for a free core.',
          ],
          example: { cmd: 'python3 -c "import os; print(os.cpu_count())"', out: '2', note: 'The number of cores on a typical Codespace. Your machine may have more.' },
          task: 'Use your measurement from the last step. Calculate the speedup of the **processes** version compared with the **sequential** version, and give the best speedup that would be possible on your machine.',
          fields: [
            { id: 'speedup', type: 'number', label: 'Speedup of processes vs. sequential', unit: '×' },
            { id: 'ideal', type: 'number', label: 'Best possible speedup on your machine', unit: '×' },
          ],
          verify: (v, ctx) => {
            const c = cpu(ctx);
            if (!c) return { ok: false, msg: 'I need your measurement first: solve the previous step (check cpu), then come back.' };
            const want = c.seq / c.proc, x = ctx.number(v.speedup), ideal = ctx.number(v.ideal);
            if (x == null || ideal == null) return { ok: false, msg: 'Enter both answers as numbers.' };
            if (near(x, c.proc / c.seq, 0.03)) return { ok: false, msg: `Other way round: old time ÷ new time, so ${fmt(c.seq)} ÷ ${fmt(c.proc)}.` };
            if (!near(x, want, Math.max(0.05, want * 0.03))) return { ok: false, msg: `Not quite. Your times: sequential ${fmt(c.seq)} s, processes ${fmt(c.proc)} s. Divide the first by the second.` };
            if (ideal === 4 && c.cores !== 4) return { ok: false, partial: true, msg: `Your speedup is right. But four workers do not give speedup 4 on ${c.cores} core${c.cores > 1 ? 's' : ''}: the limit is the number of cores that can work at the same time.` };
            if (ideal !== c.cores) return { ok: false, partial: true, msg: `Your speedup is right. For the best possible value, look at the line “CPU cores” in the check output: ${c.cores}.` };
            return { ok: true, msg: `Speedup ${fmt(want)} of at most ${c.cores}. The difference is the price of starting processes and collecting their results, and of other programs that also need the CPU.` };
          },
          hints: ['Speedup = sequential time ÷ processes time, both from your check output.', 'The best possible speedup equals the number of CPU cores that the check reported.'],
          solution: 'speedup = sequential ÷ processes, for example 1.41 ÷ 0.73 = 1.93\nbest possible = number of cores, for example 2',
          success: 'The limit is the number of cores.',
        },
      ],
      quiz: [
        {
          q: 'A Python program spends its time analysing ECG signals (pure calculation). In standard CPython, what speeds it up on a machine with 4 cores?',
          options: [
            { t: 'Several processes, for example with ProcessPoolExecutor', correct: true, why: 'Each process has its own interpreter and GIL, so up to four can calculate at the same time.' },
            { t: 'Several threads, for example with ThreadPoolExecutor', why: 'Because of the GIL, CPU-bound threads take turns.' },
            { t: 'time.sleep() between the calculations', why: 'That only adds waiting time.' },
          ],
        },
        {
          q: 'A calculation takes 8.0 s sequentially and 2.5 s with processes. What is the speedup?',
          options: [
            { t: '3.2', correct: true, why: '8.0 ÷ 2.5 = 3.2: old time divided by new time.' },
            { t: '0.31', why: 'That is 2.5 ÷ 8.0, the wrong way round. A speedup greater than 1 means faster.' },
            { t: '5.5', why: 'That is the difference in seconds, not the speedup.' },
          ],
        },
        {
          review: 'Review from chapter 2',
          q: 'In top, which kind of process shows a high %CPU value for a long time?',
          options: [
            { t: 'A CPU-bound process, such as analyse or the prime counter', correct: true, why: 'It calculates without pauses and takes all the CPU it can get.' },
            { t: 'An I/O-bound process, such as a monitor waiting for its sensor', why: 'A waiting process sleeps and uses almost no CPU.' },
            { t: 'Every process uses the same amount of CPU', why: 'top sorts by %CPU because the values differ a lot.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      id: 'sync',
      title: 'Shared resources & synchronization',
      minutes: 12,
      goal: 'See how a shared counter loses updates, and protect it with a lock.',
      steps: [
        {
          id: 'race',
          title: 'Lose an update on purpose',
          mode: 'interleave',
          learn: [
            'Threads share memory. That is handy, and dangerous. Adding 1 to a shared counter is three small steps: **read** the value, **add 1** to a private copy, **write** it back. The scheduler may switch to another thread between any two steps.',
            'If both threads read before either of them writes, one update is lost. This is a **race condition**: the result depends on the timing.',
          ],
          example: {
            file: 'what admitted += 1 really does',
            code: 'value = admitted       # 1. read the shared counter\nvalue = value + 1      # 2. add 1 to my own copy\nadmitted = value       # 3. write my copy back',
            note: 'Each line is a separate step. Another thread can run between them.',
          },
          task: 'You are the scheduler. The counter of admitted patients is **10**, and threads A and B each admit one patient. Choose the order of the steps so that an update gets **lost**: the counter should end at 11 instead of 12.',
          scheduler: { threads: ['A', 'B'], start: 10, sharedLabel: 'Admitted patients' },
          verify: st => (st.counter === 11
            ? { ok: true, msg: 'Lost update! Both threads read 10, both calculated 11, both wrote 11. Two patients were admitted, but the counter says one. In a real program this happens rarely and at random, which makes it so hard to find.' }
            : { ok: false, msg: 'No update was lost: one thread wrote its result before the other one read the counter. Click **Start over** and let B read the counter **before** A writes.' }),
          hints: ['Let A read first, then switch to B and let B read too.', 'A reads, B reads, A adds, B adds, A writes, B writes.'],
          solution: 'A: read  →  B: read  →  A: add  →  B: add  →  A: write  →  B: write',
          success: 'Lost update.',
        },
        {
          id: 'critical',
          title: 'Find the critical section',
          mode: 'report',
          learn: [
            'The lines that work with shared data and must not be interrupted by another thread form the **critical section**. Here it is everything from reading the shared counter to writing it back.',
            'The program below is `work/counter.py` from your Codespace. Two threads run `admit()` at the same time.',
          ],
          example: { code: 'value = admitted\nadmitted = value + 1', file: 'read ... write', note: 'Between these two lines, nobody else may touch `admitted`.' },
          task: 'Which lines of `admit()` belong to the critical section? Select all of them.',
          fields: [{
            id: 'lines', type: 'lines', label: 'admit() in counter.py',
            options: [
              { v: '1', t: 'def admit(name, patients):' },
              { v: '2', t: '    global admitted' },
              { v: '3', t: '    for _ in range(patients):' },
              { v: '4', t: '        value = admitted            # read the shared counter' },
              { v: '5', t: '        time.sleep(0.01)            # a short pause, like a moment of other work' },
              { v: '6', t: '        admitted = value + 1        # write the new value back' },
              { v: '7', t: '    print(f"{name} has admitted {patients} patients")' },
            ],
          }],
          verify: v => {
            const set = new Set(v.lines), has = n => set.has(String(n));
            if (!set.size) return { ok: false, msg: 'Select the lines that belong to the critical section.' };
            if (has(4) && has(5) && has(6) && set.size === 3) return { ok: true, msg: 'Lines 4 to 6: read, pause, write. As long as one thread is between reading and writing, the other thread must not touch the counter.' };
            if (has(4) && has(6) && !has(5) && set.size === 2) return { ok: false, partial: true, msg: 'Almost. The pause in line 5 lies between the read and the write, so it belongs to the critical section too: during the pause the other thread could read the old value.' };
            if (has(3) || has(1) || has(2)) return { ok: false, msg: 'Lines 1 to 3 do not touch the shared value: the loop counter `_` belongs to each thread itself. Look for the lines from reading to writing `admitted`.' };
            if (has(7)) return { ok: false, msg: 'Line 7 only prints, it does not use the shared counter. Which lines read and write `admitted`?' };
            return { ok: false, msg: 'Not quite. The critical section starts where the shared counter is read and ends where it is written back.' };
          },
          hints: ['Which line reads `admitted`, and which one writes it?', 'Everything between those two lines belongs to it as well.'],
          solution: 'Lines 4, 5 and 6',
          success: 'Read, pause, write.',
        },
        {
          id: 'with-lock',
          title: 'Try again, with a lock',
          mode: 'interleave',
          learn: [
            'A **lock** lets only one thread at a time into the critical section. A thread takes the lock before it reads and releases it after it has written. A second thread that wants the lock has to **wait** until it is free.',
            'Now each thread has two more steps: take the lock first, release it at the end.',
          ],
          example: { code: 'with lock:             # take the lock (or wait for it)\n    value = admitted\n    admitted = value + 1\n                       # leaving the block releases the lock', file: 'a critical section with a lock' },
          task: 'Same situation: the counter is 10, A and B each admit one patient. Try to lose an update again: let B start while A is in the middle of its work.',
          scheduler: { threads: ['A', 'B'], start: 10, lock: true, sharedLabel: 'Admitted patients' },
          verify: st => (st.counter === 12 && st.waits > 0
            ? { ok: true, msg: 'B had to wait until A released the lock, so B read 11, not 10. Final value 12: no update lost, whatever order you choose. The lock turned the three steps into one indivisible unit.' }
            : st.counter === 12
              ? { ok: false, partial: true, msg: 'Correct result, but you never tried to sneak in. Click **Start over**, let A take the lock and read, then try to run B.' }
              : { ok: false, msg: 'The counter should never be wrong with the lock. Click Start over and try again.' }),
          hints: ['Let A take the lock and read the counter. Then press the button of B.'],
          solution: 'A: take the lock  →  A: read  →  B: wants the lock, has to wait  →  A: add, write, release  →  B: take the lock, read 11, add, write 12, release',
          success: 'The lock prevents the lost update.',
        },
        {
          id: 'lock',
          title: 'Protect the counter in Python',
          mode: 'report',
          where: 'codespace',
          learn: [
            '`threading.Lock()` creates a lock. `with lock:` takes it at the start of the block and releases it at the end, even if an error happens. Create the lock **once**, outside the function, so that all threads share the same lock.',
            'Keep critical sections short: while one thread holds the lock, the others cannot do that work.',
          ],
          example: {
            file: 'beds_demo.py',
            code: 'import threading\n\nfree_beds = 3\nlock = threading.Lock()              # one lock, shared by all threads\n\ndef take_bed():\n    global free_beds\n    with lock:                       # only one thread at a time in here\n        if free_beds > 0:\n            free_beds -= 1\n\nthreads = [threading.Thread(target=take_bed) for _ in range(5)]\nfor t in threads:\n    t.start()\nfor t in threads:\n    t.join()\nprint("Free beds left:", free_beds)',
            cmd: 'python3 beds_demo.py',
            out: 'Free beds left: 0',
            note: 'Five threads want a bed, three are free. Checking and taking a bed happen together inside the lock, so a bed can never be given out twice.',
          },
          task: 'Run `work/counter.py`: two threads admit 5 patients each, but the final count is wrong, every time. Add a lock so that the critical section is protected (keep the pause), then run the check and paste the result.',
          commands: ['python3 work/counter.py', 'python3 p02.py check lock'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check lock`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('lock', () => ({ ok: true, msg: 'Three runs, three times 10. The lock made read, pause and write one indivisible unit. The threads still run at the same time, they only queue up for the critical section.' })),
          hints: [
            'Below the TODO: `lock = threading.Lock()`.',
            'In admit(), put the three lines (read, pause, write) inside `with lock:` and indent them by four more spaces.',
          ],
          solution: 'lock = threading.Lock()\n\ndef admit(name, patients):\n    global admitted\n    for _ in range(patients):\n        with lock:\n            value = admitted\n            time.sleep(0.01)\n            admitted = value + 1\n    print(f"{name} has admitted {patients} patients")',
          success: 'Counter protected.',
        },
        {
          id: 'deadlock',
          title: 'Two chefs, two tools: deadlock',
          mode: 'report',
          learn: [
            'Locks bring a new risk. Remember the kitchen from the lecture: chef A holds the knife and waits for the cutting board, chef B holds the board and waits for the knife. Both wait forever: a **deadlock**.',
            'In programs this happens when two threads take two locks in opposite order. A simple rule prevents it: every thread takes the locks in the **same order**.',
          ],
          example: { code: 'chef A:  with knife:   then  with board:\nchef B:  with board:   then  with knife:     # opposite order: can deadlock', file: 'the kitchen as code' },
          task: 'Two threads in the ward software need two locks. The admission thread takes `records_lock`, then `alarm_lock`. The alarm thread takes `alarm_lock`, then `records_lock`. Sometimes the whole program freezes. Which change prevents this?',
          fields: [{
            id: 'fix', type: 'choice', label: 'Your choice',
            options: [
              { v: 'order', t: 'Both threads take `records_lock` first and `alarm_lock` second.' },
              { v: 'more', t: 'Add a third lock that both threads take at the very end.' },
              { v: 'sleep', t: 'Add `time.sleep(1)` between taking the two locks.' },
              { v: 'kill', t: 'Stop the frozen program with `kill -9` and start it again.' },
            ],
          }],
          verify: v => ({
            order: { ok: true, msg: 'Same order for everyone: whoever gets records_lock first will also get alarm_lock, and the other thread simply waits. A circle of waiting cannot form.' },
            more: { ok: false, msg: 'A third lock at the end does not help: the two threads can still each hold one of the first two locks and wait for the other.' },
            sleep: { ok: false, msg: 'A pause makes the deadlock even more likely: it gives the other thread time to grab the second lock.' },
            kill: { ok: false, msg: 'That ends this deadlock, but the next one will come. And as you saw in chapter 3, SIGKILL gives the program no chance to save its data. Fix the cause instead.' },
          })[v.fix] || { ok: false, msg: 'Choose one of the options.' },
          hints: ['A deadlock needs a circle: A waits for B and B waits for A. Which option makes the circle impossible?'],
          solution: 'Both threads take the locks in the same order: records_lock first, then alarm_lock.',
          success: 'Same order, no deadlock.',
        },
      ],
      quiz: [
        {
          q: 'Two threads each add 1 to a shared counter that starts at 10. Without a lock the result is sometimes 11. Why?',
          options: [
            { t: 'Both threads read 10 before either of them wrote its result back', correct: true, why: 'Then both write 11: one update is lost. A race condition.' },
            { t: 'Python can only count to 11 with threads', why: 'The numbers do not matter; the order of read and write does.' },
            { t: 'One of the threads did not run at all', why: 'Both ran, but one overwrote the other’s result.' },
          ],
        },
        {
          q: 'Where must the lock be created so that it protects the counter?',
          options: [
            { t: 'Once, outside the function, so that all threads use the same lock', correct: true, why: 'Only a shared lock makes the other threads wait.' },
            { t: 'Inside the function, so that every thread has its own lock', why: 'Then nobody ever waits, and updates still get lost.' },
            { t: 'It does not matter where', why: 'The checker showed it: a lock per call protects nothing.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'A program is stuck in a deadlock and ignores `kill PID`. What is your last resort as administrator?',
          options: [
            { t: '`kill -9 PID`, knowing that the program cannot save anything', correct: true, why: 'SIGKILL always works, but it is the last resort. Afterwards, fix the lock order in the code.' },
            { t: '`killall` for every process on the server', why: 'That would also stop processes that have nothing to do with the problem, possibly other patients’ monitors.' },
            { t: 'Wait, deadlocks resolve themselves after a while', why: 'In a deadlock, every thread waits for another one: it never ends by itself.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 7
    {
      id: 'final',
      title: 'Final challenge & recap',
      minutes: 8,
      goal: 'Choose the right tool for each part of a patient monitoring simulator, and build it.',
      steps: [
        {
          id: 'plan',
          title: 'Plan the simulator',
          mode: 'report',
          learn: [
            'A real monitoring system mixes different kinds of work. Waiting for sensors, networks or disks is **I/O-bound**: threads help, because the waiting periods overlap. Heavy calculation is **CPU-bound**: in standard Python, separate processes help, if there are several cores.',
            'Light, quick work needs no parallelism at all: it only makes the program harder to understand.',
          ],
          example: { code: 'download 200 lab reports from a server      -> I/O-bound  -> threads\ntrain a model on 2 million ECG beats         -> CPU-bound  -> processes\nformat one line of text                      -> light      -> keep it simple', file: 'three examples' },
          task: 'The PulseBridge ward simulator has four parts. Classify each one, then choose the design that fits best.',
          fields: [
            { id: 'receive', type: 'select', label: 'Receive one measurement from each of 4 bedside sensors (each reply takes 1.5 s)', options: [{ v: 'io', t: 'I/O-bound: mostly waiting' }, { v: 'cpu', t: 'CPU-bound: mostly calculating' }, { v: 'light', t: 'Light and quick' }] },
            { id: 'trend', type: 'select', label: 'Compute a 24-hour trend with a machine-learning model for every patient (minutes of calculation)', options: [{ v: 'io', t: 'I/O-bound: mostly waiting' }, { v: 'cpu', t: 'CPU-bound: mostly calculating' }, { v: 'light', t: 'Light and quick' }] },
            { id: 'display', type: 'select', label: 'Print one status line per patient', options: [{ v: 'io', t: 'I/O-bound: mostly waiting' }, { v: 'cpu', t: 'CPU-bound: mostly calculating' }, { v: 'light', t: 'Light and quick' }] },
            {
              id: 'design', type: 'choice', label: 'Which design fits best?',
              options: [
                { v: 'mixed', t: 'Threads for receiving, a process pool for the trend model, plain code for the status lines' },
                { v: 'threads', t: 'Threads for everything' },
                { v: 'processes', t: 'A separate process for every part' },
                { v: 'none', t: 'No threads or processes: one thing after another' },
              ],
            },
          ],
          verify: v => {
            if (v.receive !== 'io') return { ok: false, msg: 'Receiving: during the 1.5 s the program only waits for the sensor’s reply. Which kind of work is that?' };
            if (v.trend !== 'cpu') return { ok: false, msg: 'The trend model: minutes of calculation without waiting. Which kind of work keeps the CPU busy?' };
            if (v.display !== 'light') return { ok: false, msg: 'Printing four short lines takes microseconds. It is technically output, but far too small to be worth any parallelism.' };
            if (v.design === 'threads') return { ok: false, msg: 'Threads are perfect for receiving. But the trend model is CPU-bound: in standard Python its threads would take turns because of the GIL.' };
            if (v.design === 'processes') return { ok: false, msg: 'Possible, but expensive: starting a process for every small task costs more than it saves, and waiting needs no extra core.' };
            if (v.design === 'none') return { ok: false, msg: 'Then the program waits 4 × 1.5 s for the sensors, one after another, and the trend model uses only one core.' };
            if (!v.design) return { ok: false, msg: 'Choose a design as well.' };
            return { ok: true, msg: 'Each kind of work gets the tool that fits: threads overlap the waiting, processes spread the calculation over the cores, and the light parts stay simple. In the next step you build the receiving part.' };
          },
          hints: ['Ask for each part: is the program waiting, calculating, or neither?', 'Remember chapters 4 and 5: threads for waiting, processes for calculating.'],
          solution: 'receive: I/O-bound\ntrend: CPU-bound\nstatus lines: light\ndesign: threads for receiving, a process pool for the trend model',
          success: 'The right tool for each job.',
        },
        {
          id: 'simulator',
          title: 'Build the receiving part',
          mode: 'report',
          where: 'codespace',
          learn: [
            '`work/ward_monitor.py` is a small simulator. `receive()` waits for three readings of one bed, `analyse()` computes a mean and an alarm rule, and the results are printed and stored in `work/summary.txt`.',
            'The shared dictionary `readings` is already protected by a lock, as in chapter 6. Only the receiving still happens one bed after another.',
          ],
          example: {
            file: 'pattern from chapter 4',
            code: 'threads = [threading.Thread(target=read_sensor, args=(name,)) for name in sensors]\nfor t in threads:\n    t.start()\nfor t in threads:\n    t.join()',
            note: 'A list comprehension creates all threads in one line. Start all, then join all.',
          },
          task: 'Change `ward_monitor.py` so that the data of all four beds is received **at the same time**, one thread per bed. Run it, look at summary.txt, then run the check and paste the result.',
          commands: ['python3 work/ward_monitor.py', 'cat work/summary.txt', 'python3 p02.py check ward'],
          fields: [{ id: 'out', type: 'paste', label: 'Output of `python3 p02.py check ward`', placeholder: 'Paste the lines from your terminal here' }],
          verify: result('ward', ([t, beds]) => ({ ok: true, save: { seconds: t, beds }, msg: `All ${beds} beds received in ${fmt(t)} s instead of about 6 s, the summary is stored, and the shared readings were protected by a lock. You combined processes, threads and synchronization in one program.` })),
          chart: saved => saved && ({ type: 'bars', title: 'Receiving 4 beds × 3 readings of 0.5 s', unit: 's', bars: [{ label: 'one bed after another', value: 6 }, { label: 'your threads', value: saved.seconds }], note: 'The sequential value is calculated: 4 beds × 3 readings × 0.5 s = 6 s.' }),
          hints: [
            'Replace the loop `for bed in BEDS: receive(bed)` with the pattern from the example, using `target=receive` and `args=(bed,)`.',
            'Do not forget to join all threads before the analysis starts: it needs all readings.',
          ],
          solution: 'threads = [threading.Thread(target=receive, args=(bed,)) for bed in BEDS]\nfor t in threads:\n    t.start()\nfor t in threads:\n    t.join()',
          success: 'Simulator complete.',
        },
      ],
      quiz: [
        {
          q: 'Which statement about threads in standard Python is correct?',
          options: [
            { t: 'They speed up waiting (I/O-bound) work, but not pure calculation', correct: true, why: 'Waiting periods overlap; calculations take turns because of the GIL.' },
            { t: 'They speed up every program by the number of threads', why: 'Your CPU-bound measurement in chapter 5 showed no gain.' },
            { t: 'They cannot share data with each other', why: 'They share the memory of their process, which is exactly why locks are needed.' },
          ],
        },
        {
          q: 'Which of these are good reasons to use a lock?',
          multi: true,
          options: [
            { t: 'Several threads update the same counter or dictionary', correct: true, why: 'Without a lock, updates can get lost.' },
            { t: 'A check and an action must happen together, such as “is a bed free? then take it”', correct: true, why: 'Otherwise two threads could both see the free bed and both take it.' },
            { t: 'Each thread only works with its own local variables', why: 'Nothing is shared, so there is nothing to protect.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'The finished simulator runs in the background on the server and must be stopped for an update. How?',
          options: [
            { t: '`kill PID`, so that it can finish and store its summary', correct: true, why: 'SIGTERM first: the program can clean up. kill -9 only if it does not react.' },
            { t: '`kill -9 PID`, because it is faster', why: 'SIGKILL gives the program no chance to save, so the summary could be lost.' },
            { t: 'Restart the whole server', why: 'That stops every process on the server, including the other patients’ monitors.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- bonus
    {
      id: 'bonus',
      title: 'Bonus: look inside /proc',
      minutes: 10,
      optional: true,
      goal: 'Read what the kernel knows about a process, straight from the source.',
      steps: [
        {
          id: 'status',
          title: 'The kernel’s file about a process',
          learn: [
            'For every process, Linux offers a folder `/proc/PID` with files that describe it. They are not real files on disk: the kernel creates their contents when you read them. `ps` and `top` read their information from here.',
            '`/proc/PID/status` lists, for example, the name, the state, the parent and the number of **threads**.',
          ],
          example: { cmd: "grep -E '^(Name|PPid)' /proc/$$/status", out: 'Name:\tsh\nPPid:\t35', note: 'Your shell is called sh, and its parent has the PID 35.' },
          task: 'How many **threads** does your shell have? Print the Threads line of your shell’s status file.',
          check: { output: 'lines', expect: 'grep Threads /proc/$$/status' },
          hints: ['`$$` is the PID of your shell, so its folder is `/proc/$$`.', 'Search the status file for the word Threads with grep.'],
          solution: 'grep Threads /proc/$$/status',
          success: 'One thread: a shell does one thing at a time. A Python program with three sensor threads would show 4 here: the main thread plus three.',
        },
        {
          id: 'state',
          title: 'Sleeping or running?',
          setup: STOP_ALL + '; ' + startMonitors(['bed-40']),
          learn: [
            'The **State** line tells what a process is doing right now. **R** means running or ready to run, **S** means sleeping: waiting for something, such as a timer, a sensor or the network. A sleeping process uses no CPU.',
            'A monitor for bed-40 is running. Its PID is stored in `~/ward/bed-40.pid`.',
          ],
          example: { cmd: "grep State /proc/$$/status", out: 'State:\tS (sleeping)', note: 'Your shell is sleeping: it waits for grep to finish.' },
          task: 'Show the **State** line of the bed-40 monitor. Is it running or sleeping?',
          check: { output: 'names', expect: "[ -f ~/ward/bed-40.pid ] && echo '(sleeping)'" },
          mustUse: [{ re: /bed-40|monitor|\$\(|\b\d{2,}\b/, msg: 'That is the state of your own shell (`$$`). Show the State line of the bed-40 monitor instead: its PID is stored in `~/ward/bed-40.pid`.' }],
          diagnose: [{ when: { stdout: /State:\s+R/ }, msg: 'You caught it at the very moment it wrote a reading. Run your command again: most of the time it sleeps.' }],
          hints: ['`$(cat ~/ward/bed-40.pid)` gives you the PID.', 'Put it into the path: `/proc/$(cat ~/ward/bed-40.pid)/status`, and grep for State.'],
          solution: 'grep State /proc/$(cat ~/ward/bed-40.pid)/status',
          success: 'S, sleeping: the monitor spends almost all its time waiting for the next second. That is what I/O-bound means, seen from the kernel. `analyse` from chapter 2 would show R most of the time.',
        },
      ],
      quiz: [
        {
          q: 'Where do `ps` and `top` get their information from?',
          options: [
            { t: 'From the kernel, through the files in /proc', correct: true, why: 'Each process has a folder /proc/PID that the kernel fills when it is read.' },
            { t: 'From log files that every program writes', why: 'Programs do not have to log anything; the kernel knows about every process anyway.' },
            { t: 'From the internet', why: 'Everything is local, on this machine.' },
          ],
        },
        {
          review: 'Review from chapter 4',
          q: 'A Python process has started three sensor threads that are all waiting. How many threads does /proc show for it?',
          options: [
            { t: '4: the main thread plus the three sensor threads', correct: true, why: 'The main program itself is a thread too.' },
            { t: '3', why: 'Do not forget the main thread, which runs the program and later calls join().' },
            { t: '1, because of the GIL', why: 'The GIL limits how many threads run Python code at once, not how many threads exist.' },
          ],
        },
      ],
    },
  ],

  summary: [
    ['nano FILE, vim FILE', 'edit a file in the terminal (vim: i, Esc, :wq, :q!)'],
    ['ps -o pid,ppid,user,comm', 'list processes with the columns you choose'],
    ['$$, $PPID, $!', 'PID of the shell, of its parent, of the last background job'],
    ['top -b -n 1', 'one snapshot of the busiest processes'],
    ['COMMAND &, jobs, fg', 'run in the background, list jobs, bring one back'],
    ['kill PID, kill -9 PID', 'ask a process to stop (SIGTERM), force it (SIGKILL)'],
    ['threading.Thread, start(), join()', 'run a function in a thread, wait for it'],
    ['time.perf_counter()', 'measure elapsed time'],
    ['ProcessPoolExecutor', 'spread CPU-bound work over several processes'],
    ['threading.Lock(), with lock:', 'let only one thread at a time into a critical section'],
  ],

  done: {
    lead: 'You kept the ward’s processes under control, made waiting code faster with threads, saw where threads stop helping, and protected shared data with a lock.',
    columns: ['Command or code', 'What it does'],
    recap: [
      'A **process** is a running program with its own PID and memory. A **thread** is a strand of work inside a process; threads share the process’s memory.',
      'Stop processes with **SIGTERM** (`kill PID`) first. **SIGKILL** (`kill -9`) is the last resort, because the program cannot save anything.',
      '**I/O-bound** work (waiting) gets faster with threads: the waiting periods overlap. **CPU-bound** work in standard Python needs **processes** to use several cores.',
      '**Speedup** = old time ÷ new time. The best you can hope for with processes is the number of cores.',
      'Shared data needs a **lock** around the whole critical section, and locks must always be taken in the **same order** to avoid deadlocks.',
    ],
    bonus: 'to read what the kernel knows about each process.',
  },
};
})();
