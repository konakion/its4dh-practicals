/*
 * Content for Practical 03 · IPC & scheduling.
 *
 * Rendered by the same engine as Practicals 01 and 02 (course-app.js). Text fields support
 * `code` and **bold**.
 *
 * Everything runs in the browser Linux, no Codespace needed:
 *  - Shell steps (chapters 1, 2, 3, 4, 6): pipes, a named pipe, a local socket server,
 *    a real race condition between two processes, a real deadlock between two lock holders,
 *    and the Linux scheduler with `nice`. The course programs in fixtures/p03 are small shell
 *    scripts (admit, syncjob, crunch, station, echoserver). Every example output was produced
 *    by the browser Linux and is re-checked by scripts/test_course_browser.cjs.
 *  - Report steps (chapters 3, 5, 6): calculations by hand. Students trace a semaphore,
 *    work out FCFS, SJF and Round Robin schedules, and compute a CPU share from their own
 *    measurement. verify() recomputes every answer; the Gantt charts are drawn from the
 *    correct schedule once a step is solved.
 */
(() => {
  const near = (a, b, tol) => a != null && Math.abs(a - b) <= tol;
  const r1 = v => String(Math.round(v * 10) / 10);

  // The scheduling exercise of chapter 5: four jobs, all ready at t = 0, in this order.
  const JOBS = [
    { id: 'L', name: 'lab import', burst: 7 },
    { id: 'A', name: 'alarm check', burst: 1 },
    { id: 'D', name: 'dashboard', burst: 3 },
    { id: 'B', name: 'backup', burst: 5 },
  ];
  const LABEL = Object.fromEntries(JOBS.map(j => [j.id, `${j.id} (${j.name})`]));
  // Run jobs to completion in the given order (FCFS, SJF). Returns segments and waiting times.
  const runInOrder = order => {
    let t = 0; const segs = [], wait = {};
    for (const id of order) { const j = JOBS.find(x => x.id === id); wait[id] = t; segs.push({ id, start: t, end: t + j.burst }); t += j.burst; }
    return { segs, wait };
  };
  // Round Robin with quantum q, all jobs ready at t = 0 in the order of JOBS.
  const roundRobin = q => {
    const queue = JOBS.map(j => ({ id: j.id, left: j.burst })); const segs = [], first = {}, finish = {};
    let t = 0;
    while (queue.length) {
      const j = queue.shift(), run = Math.min(q, j.left);
      if (first[j.id] == null) first[j.id] = t;
      segs.push({ id: j.id, start: t, end: t + run }); t += run; j.left -= run;
      if (j.left) queue.push(j); else finish[j.id] = t;
    }
    return { segs, first, finish };
  };
  const avg = o => Object.values(o).reduce((a, b) => a + b, 0) / Object.values(o).length;
  const FCFS = runInOrder(JOBS.map(j => j.id));                                   // L A D B
  const SJF = runInOrder([...JOBS].sort((a, b) => a.burst - b.burst).map(j => j.id)); // A D B L
  const RR = roundRobin(2);
  const gantt = (title, segs, note) => ({
    type: 'gantt', title, unit: 'ms', tick: 1, note,
    rows: JOBS.map(j => ({ label: LABEL[j.id], segs: segs.filter(s => s.id === j.id).map(s => ({ label: j.id, start: s.start, end: s.end })) })),
  });

  // Every exercise stops the course programs of other steps first. Only the student's own
  // processes exist here.
  // Stopped programs can stay visible for a moment (as zombies, until init collects them):
  // wait until pidof no longer lists them, at most 3 seconds.
  const STOP = 'killall -q admit syncjob crunch 2>/dev/null; sleep 0.2; ' +
    'i=0; while pidof admit syncjob crunch >/dev/null && [ $i -lt 30 ]; do sleep 0.1; i=$((i+1)); done';
  const SERVERS = 'mkdir -p ~/ipc; killall -q socat; sleep 0.2; rm -f ~/ipc/inbox.log; station ~/ipc/station.sock & echoserver ~/ipc/echo.sock & ' +
    'i=0; while { [ ! -S ~/ipc/station.sock ] || [ ! -S ~/ipc/echo.sock ]; } && [ $i -lt 30 ]; do sleep 0.1; i=$((i+1)); done';
  const DEADLOCKED = 'syncjob admission records alarms & syncjob alarm alarms records & ' +
    'i=0; while [ "$(grep -c waits ~/ward/sync.log 2>/dev/null)" != 2 ] && [ $i -lt 40 ]; do sleep 0.1; i=$((i+1)); done';
  // Probe helpers for the crunch exercises: rounds, nice value and start time of job $1.
  const CR = 'rounds(){ sed -n "s/.*: \\([0-9]*\\) rounds.*/\\1/p" ~/sched/$1.txt 2>/dev/null; }; ' +
    'niceof(){ sed -n "s/.*(nice \\(-*[0-9]*\\)).*/\\1/p" ~/sched/$1.txt 2>/dev/null; }; ' +
    'started(){ cat ~/sched/.$1.start 2>/dev/null; }; ' +
    'together(){ d=$(( $(started a) - $(started b) )); [ ${d#-} -le 1 ]; }; ';

window.PRACTICAL = {
  id: 'its4dh-p03',
  course: 'IT Systems for Digital Health Experts',
  title: 'IPC & scheduling',
  number: 'Practical 03',
  minutes: 90,
  home: '/home/student',
  user: 'student',
  host: 'pulsebridge',
  // Sourced before every command: the course programs are on the PATH.
  prelude: 'PATH="$HOME/bin:$PATH"',
  files: [
    { path: 'bin/admit', url: 'fixtures/p03/admit', readOnly: true, exec: true },
    { path: 'bin/syncjob', url: 'fixtures/p03/syncjob', readOnly: true, exec: true },
    { path: 'bin/crunch', url: 'fixtures/p03/crunch', readOnly: true, exec: true },
    { path: 'bin/station', url: 'fixtures/p03/station', readOnly: true, exec: true },
    { path: 'bin/echoserver', url: 'fixtures/p03/echoserver', readOnly: true, exec: true },
    { path: 'logs/vitals.log', url: 'fixtures/p03/vitals.log', readOnly: true },
  ],

  intro: {
    lead: 'The PulseBridge ward software has grown: sensor readers, an alarm service and the nurse station are separate programs, and they all share one small server. Today you let these programs talk to each other, see what goes wrong when they share data or locks, and find out who gets the CPU next.',
    steps: [
      ['Read', 'a short explanation and one example.'],
      ['Try', 'it yourself in the Linux system inside this page, or calculate it by hand.'],
      ['Check', 'the result. You get feedback straight away and can retry as often as you like.'],
    ],
    note: 'Your progress is saved in this browser only. All data is synthetic: no real patients are involved.',
    demo: { cmd: 'grep ALARM logs/vitals.log | wc -l', out: '5' },
  },

  chapters: [
    // ---------------------------------------------------------------- 1
    {
      id: 'pipes',
      title: 'Pipes: one-way channels',
      minutes: 12,
      goal: 'Connect processes with pipes, first in the shell, then with a named pipe.',
      steps: [
        {
          id: 'pipeline',
          title: 'Three processes, two pipes',
          learn: [
            'Every command in a pipeline is its own **process**. The `|` connects the output of one process to the input of the next: this is **IPC**, inter-process communication, the simplest kind.',
            '`cut -d\' \' -f2` keeps only the second column of each line, `sort -u` sorts and removes duplicates.',
          ],
          example: { cmd: "grep bed-03 logs/vitals.log | cut -d' ' -f3", out: 'heart_rate=80\nheart_rate=84\nheart_rate=73\nheart_rate=98', note: 'Two processes: grep finds the lines of bed 3, cut prints their third column.' },
          task: 'The night nurse asks: which beds had an **ALARM** in `logs/vitals.log`? Print each bed name **once**.',
          check: { output: 'lineset', expect: "grep ALARM ~/logs/vitals.log | cut -d' ' -f2 | sort -u" },
          diagnose: [
            { when: { stdout: /ALARM/ }, msg: 'These are whole lines. Cut out only the bed name, the second column: `cut -d\' \' -f2`.' },
            { when: { stdoutLines: 5 }, msg: 'Five lines: some beds appear twice. Add `sort -u` at the end, so that each bed is printed once.' },
          ],
          hints: ['Start with `grep ALARM logs/vitals.log` and look at the lines.', 'Then add `| cut -d\' \' -f2 | sort -u`.'],
          solution: "grep ALARM logs/vitals.log | cut -d' ' -f2 | sort -u",
          success: 'Three beds: 02, 05 and 07. Three processes ran side by side, and the data flowed through two pipes from one to the next, without any temporary file.',
        },
        {
          id: 'fifo',
          title: 'A named pipe',
          setup: 'mkdir -p ~/ipc; rm -f ~/ipc/alarms ~/ipc/demo',
          learn: [
            'A **named pipe** (FIFO) is a pipe with a name in the file system, so that any two processes can use it. `mkfifo NAME` creates one; `ls -l` marks it with a `p`.',
            'A writer waits until a reader opens the pipe. So start the writer in the **background** with `&`, then read with `cat`.',
          ],
          example: { afterSetup: true, cmd: 'mkfifo ~/ipc/demo\nls -l ~/ipc', out: 'total 0\nprw-r--r--    1 student  student          0 Oct 29 17:00 demo', note: 'The first letter `p` means pipe. It never holds data on disk, its size stays 0. Date and time on your screen differ.', volatile: true },
          task: 'Create the named pipe `~/ipc/alarms`. Send the message `bed-07 heart_rate=142 ALARM` through it, and read it on the other side with `cat`, all in one Run.',
          check: { output: 'lines', expect: "[ -p ~/ipc/alarms ] && echo 'bed-07 heart_rate=142 ALARM' || echo NO_FIFO" },
          diagnose: [
            { when: { probe: /NO_FIFO/ }, msg: 'There is no named pipe `~/ipc/alarms` yet. Create it with `mkfifo ~/ipc/alarms` first.' },
          ],
          timeoutMsg: 'The writer waited for a reader, and the reader was never started, so the page stopped it after 10 seconds. Start the writer in the background with `&`, then read with `cat ~/ipc/alarms`.',
          hints: ['Three lines: `mkfifo ~/ipc/alarms`, then `echo "..." > ~/ipc/alarms &`, then `cat ~/ipc/alarms`.', 'Without `&`, echo waits forever for a reader.'],
          solution: "mkfifo ~/ipc/alarms\necho 'bed-07 heart_rate=142 ALARM' > ~/ipc/alarms &\ncat ~/ipc/alarms",
          success: 'The message went from one process (echo) through the named pipe to another (cat). The pipe itself stored nothing: it only connected the two, like a hatch between two kitchens.',
        },
      ],
      quiz: [
        {
          q: 'In `grep ALARM logs/vitals.log | sort -u`, how many processes run?',
          options: [
            { t: 'Two, connected by one pipe', correct: true, why: 'grep and sort are separate processes; the pipe carries grep’s output to sort.' },
            { t: 'One, the shell runs everything itself', why: 'The shell starts a new process for each command of the pipeline.' },
            { t: 'Three: grep, the pipe and sort', why: 'The pipe is a channel in the kernel, not a process.' },
          ],
        },
        {
          q: 'You run `echo hello > ~/ipc/alarms` on a named pipe, without `&`, and nobody reads. What happens?',
          options: [
            { t: 'echo waits until a reader opens the pipe', correct: true, why: 'A pipe connects a writer with a reader. Without a reader, the writer blocks.' },
            { t: 'hello is stored in the file until someone reads it', why: 'A named pipe keeps no data on disk; its size is always 0.' },
            { t: 'The message is lost at once', why: 'Nothing is lost: the writer simply waits.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 2
    {
      id: 'sockets',
      title: 'Sockets: talk to a server',
      minutes: 10,
      goal: 'Send a message to a server process through a socket, and see who is listening.',
      steps: [
        {
          id: 'send',
          title: 'Send an alarm to the nurse station',
          setup: SERVERS,
          learn: [
            'A pipe goes one way. A **socket** is a two-way connection: a client sends a request, the server answers. On the internet sockets use network addresses; on one machine a **Unix domain socket** is a special file.',
            '`socat - UNIX-CONNECT:FILE` connects to such a socket: it sends its input and prints the answer.',
          ],
          example: { afterSetup: true, cmd: 'echo "good morning" | socat - UNIX-CONNECT:ipc/echo.sock', out: 'GOOD MORNING', note: 'A small echo server listens on `ipc/echo.sock` and answers every line in capital letters.' },
          task: 'The nurse station listens on the socket `~/ipc/station.sock`. Send it the alarm `bed-12 spo2=86 ALARM` and read its answer.',
          check: { state: "if grep -qx 'bed-12 spo2=86 ALARM' ~/ipc/inbox.log 2>/dev/null; then echo OK; elif [ -s ~/ipc/inbox.log ]; then echo OTHER_TEXT; else echo NOTHING; fi" },
          reasons: {
            NOTHING: 'The nurse station has not received anything yet. Pipe the message into `socat - UNIX-CONNECT:ipc/station.sock`.',
            OTHER_TEXT: 'The nurse station received a message, but not exactly `bed-12 spo2=86 ALARM`. Check spaces and spelling, then send it again.',
          },
          diagnose: [{ when: { stdout: /^BED-12/ }, msg: 'That answer came from the echo server. Send the alarm to `ipc/station.sock` instead.' }],
          hints: ['Use the example and change the message and the socket file.', '`echo "bed-12 spo2=86 ALARM" | socat - UNIX-CONNECT:ipc/station.sock`'],
          solution: 'echo "bed-12 spo2=86 ALARM" | socat - UNIX-CONNECT:ipc/station.sock',
          success: 'The station stored the alarm and answered with an ACK: one request, one response, through the same socket. Web servers, FHIR APIs and video consultations work the same way, only across the network.',
        },
        {
          id: 'listening',
          title: 'Who is listening?',
          setup: SERVERS,
          learn: [
            'A server **listens** on its socket and waits for clients. `netstat -l` lists listening sockets, and `-x` limits the list to Unix domain sockets. Each line shows the state `LISTENING` and the path of the socket file.',
            'Administrators use this list to see which services run on a server.',
          ],
          example: { afterSetup: true, cmd: 'netstat -lx | head -n 2', out: 'Active UNIX domain sockets (only servers)\nProto RefCnt Flags       Type       State         I-Node Path', note: 'The first two lines are the heading. The sockets follow below.' },
          task: 'How many programs on this server are listening on a Unix domain socket right now? Print just the **number**.',
          check: { output: 'number', expect: 'netstat -lx | grep -c LISTENING' },
          diagnose: [{ when: { stdout: /Active UNIX/ }, msg: 'That is the whole list. Count only the lines with LISTENING: `grep -c LISTENING`.' }],
          hints: ['Start with `netstat -lx` and look at the State column.', 'Count the matching lines with `| grep -c LISTENING`.'],
          solution: 'netstat -lx | grep -c LISTENING',
          success: 'Two servers: the nurse station and the echo server. Every service that waits for clients shows up here, which is how you find out what really runs on a machine.',
        },
      ],
      quiz: [
        {
          q: 'What can a socket do that a pipe cannot?',
          options: [
            { t: 'Carry data in both directions, also between different computers', correct: true, why: 'The client sends, the server answers, over the same connection, locally or over the network.' },
            { t: 'Store data permanently on disk', why: 'Neither stores data; both only connect processes.' },
            { t: 'Connect two processes at all', why: 'Pipes connect processes too, but only one way and only on one machine.' },
          ],
        },
        {
          q: 'A hospital portal should send lab results to a patient’s browser. Which IPC mechanism fits?',
          options: [
            { t: 'A network socket', correct: true, why: 'Browser and server run on different computers and talk in both directions.' },
            { t: 'A named pipe', why: 'A named pipe only works on one machine, and in one direction.' },
            { t: 'A pipe in the shell', why: 'That only connects commands of one pipeline on one machine.' },
          ],
        },
        {
          review: 'Review from chapter 1',
          q: 'Which command creates a named pipe?',
          options: [
            { t: '`mkfifo NAME`', correct: true, why: 'FIFO stands for first in, first out: what goes in first comes out first.' },
            { t: '`mkdir NAME`', why: 'That creates a folder.' },
            { t: '`touch NAME`', why: 'That creates an empty regular file.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 3
    {
      id: 'race',
      title: 'Shared data between processes',
      minutes: 18,
      goal: 'Cause a real race condition between two processes, fix it with a lock, and trace a semaphore.',
      steps: [
        {
          id: 'lost',
          title: 'Lose updates for real',
          setup: STOP + '; mkdir -p ~/ward; echo 0 > ~/ward/admitted; rm -f ~/ward/admitted.lock',
          learn: [
            '`admit NAME COUNT` admits patients: each time it reads the shared file `~/ward/admitted`, pauses briefly and writes the value plus one. Remember the lecture: read, change, write.',
            'Two admits at the same time can both read the same value. Then one update is lost: a **race condition**, this time between two processes.',
          ],
          example: { afterSetup: true, cmd: 'admit ward-c 3\ncat ~/ward/admitted', out: 'ward-c admitted 3 patients\n3', note: 'One admit alone: three patients, counter 3. Nothing can go wrong.' },
          task: 'The counter is 0 again. Start `admit ward-a 10` and `admit ward-b 10` **at the same time**, wait until both are done, then print the counter.',
          check: { state: 'n=$(cat ~/ward/admitted 2>/dev/null); if pidof admit >/dev/null; then echo NOT_DONE; elif [ -f ~/ward/admitted.lock ]; then echo LOCKED; elif [ "$n" = 20 ]; then echo NO_RACE; elif [ "$n" -lt 20 ] && [ "$n" -gt 0 ] 2>/dev/null; then echo OK; else echo NOT_DONE; fi' },
          reasons: {
            LOCKED: 'You used `--lock`: that is the next step. Click **Reset exercise** and run both admits without it.',
            NO_RACE: 'The counter is 20: no update was lost, so the two admits probably ran one after another. Start both with `&`, then `wait`.',
            NOT_DONE: 'The admits have not finished yet. Add `wait` before you print the counter: it waits for all background jobs.',
          },
          mustUse: [{ re: /admitted/, msg: 'Both admits ran at the same time. Now also print the counter `~/ward/admitted`, in the same Run.' }],
          hints: ['`admit ward-a 10 &` and `admit ward-b 10 &` start both in the background.', 'Then `wait`, then `cat ~/ward/admitted`.'],
          solution: 'admit ward-a 10 &\nadmit ward-b 10 &\nwait\ncat ~/ward/admitted',
          success: '20 patients were admitted, but the counter shows fewer: updates got lost, because both processes read the same old value. Run it again and you get another wrong number. That is why race conditions are so hard to find.',
        },
        {
          id: 'lock',
          title: 'Protect the counter with a lock',
          setup: STOP + '; mkdir -p ~/ward; echo 0 > ~/ward/admitted; rm -f ~/ward/admitted.lock',
          learn: [
            'With `--lock`, admit takes a **lock** before it reads and releases it after it writes. Linux offers such locks for files: `flock`. A second process that wants the lock has to **wait**.',
            'This is **mutual exclusion**: only one process at a time in the critical section, like the restroom key from the lecture.',
          ],
          example: { cmd: 'flock --help 2>&1 | head -n 1', out: 'BusyBox v1.36.1 (2024-08-31 21:21:23 UTC) multi-call binary.', note: 'flock is the small Linux tool behind admit’s lock.' },
          task: 'The counter is 0 again. Run both admits at the same time once more, 10 patients each, but this time with `--lock`. Wait for both and print the counter.',
          check: { state: 'n=$(cat ~/ward/admitted 2>/dev/null); if pidof admit >/dev/null; then echo NOT_DONE; elif [ "$n" = 20 ] && [ -f ~/ward/admitted.lock ]; then echo OK; elif [ "$n" = 20 ]; then echo NO_LOCK; else echo LOST; fi' },
          reasons: {
            NO_LOCK: 'The counter is right, but without the lock: the two admits ran one after another. Run both at the same time (with `&`) and add `--lock` to each.',
            NOT_DONE: 'The admits have not finished yet. Add `wait` before you print the counter.',
            LOST: 'Updates were lost again: at least one admit ran without `--lock`. A lock only helps if **every** process uses it.',
          },
          mustUse: [{ re: /admitted/, msg: 'Both admits finished. Now also print the counter `~/ward/admitted`, in the same Run.' }],
          hints: ['Same as before, with `--lock` at the end of both admit commands.', 'admit ward-a 10 --lock &'],
          solution: 'admit ward-a 10 --lock &\nadmit ward-b 10 --lock &\nwait\ncat ~/ward/admitted',
          success: 'Exactly 20. The two processes still ran at the same time, they only queued up for the critical section. Did you notice that it took a little longer? Waiting for the lock costs time.',
        },
        {
          id: 'semaphore',
          title: 'Trace a semaphore',
          mode: 'report',
          learn: [
            'A **semaphore** S counts free units, for example devices. **P(S)** takes one: if S > 0, S goes down by 1, otherwise the process waits. **V(S)** returns one: if someone waits, that process gets the unit at once, otherwise S goes up by 1.',
            'In this definition S never goes below 0.',
          ],
          example: { code: 'S = 1   (one ECG cart)\nN1: P(S)   S = 0, N1 uses the cart\nN2: P(S)   S = 0, N2 waits\nN1: V(S)   N2 gets the cart at once, S stays 0', file: 'one cart, two nurses' },
          task: 'The ward has **two** ultrasound devices: S = 2. Four doctors do this, in order: D1 P(S), D2 P(S), D3 P(S), D1 V(S), D4 P(S), D2 V(S). Trace S step by step.',
          fields: [
            { id: 's3', type: 'number', label: 'S after D3 P(S)' },
            { id: 'waiting', type: 'select', label: 'Who waits right after D4 P(S)?', options: [{ v: 'none', t: 'nobody' }, { v: 'D3', t: 'D3' }, { v: 'D4', t: 'D4' }, { v: 'D3D4', t: 'D3 and D4' }] },
            { id: 'send', type: 'number', label: 'S at the very end' },
          ],
          verify: v => {
            const s3 = Number(String(v.s3).trim()), se = Number(String(v.send).trim());
            if (Number.isNaN(s3) || Number.isNaN(se)) return { ok: false, msg: 'Enter the values of S as whole numbers.' };
            if (s3 === -1) return { ok: false, msg: 'S never goes below 0 here. When D3 finds S = 0, S stays 0 and D3 waits.' };
            if (s3 !== 0) return { ok: false, msg: 'S after D3: D1 and D2 have taken both devices (2 → 1 → 0). D3 finds S = 0, so S stays 0 and D3 waits.' };
            if (v.waiting === 'D3D4' || v.waiting === 'D3') return { ok: false, msg: 'D1 V(S) came before D4: D1 gave its device directly to the waiting D3. So D3 no longer waits when D4 asks.' };
            if (v.waiting !== 'D4') return { ok: false, msg: 'At D4 P(S), both devices are in use (D2 and D3), so S is 0. What happens to D4?' };
            if (se === 1) return { ok: false, partial: true, msg: 'Almost. At D2 V(S), D4 is still waiting, so D2’s device goes straight to D4 and S stays 0.' };
            if (se !== 0) return { ok: false, msg: 'Follow the last step: D2 V(S) while D4 waits. D4 gets the device at once. What is S then?' };
            return { ok: true, msg: 'S = 0, D4 waits, and at the end S = 0 with D3 and D4 scanning. A V(S) with someone waiting hands the unit over directly: S only goes up when nobody waits.' };
          },
          hints: ['Write a small table: step, S, who uses a device, who waits.', 'D1 V(S) wakes D3, D2 V(S) wakes D4: in both cases S stays 0.'],
          solution: 'D1 P: S 2 → 1\nD2 P: S 1 → 0\nD3 P: S = 0, D3 waits\nD1 V: D3 gets the device, S stays 0\nD4 P: S = 0, D4 waits\nD2 V: D4 gets the device, S stays 0',
          success: 'Semaphore traced.',
        },
      ],
      quiz: [
        {
          q: 'Two processes each add 10 to a shared counter at the same time, without a lock. The counter ends at 14. What happened?',
          options: [
            { t: 'Both often read the same old value, so some updates overwrote each other', correct: true, why: 'Read, change, write: if both read before either writes, one update is lost.' },
            { t: 'One of the processes stopped after 4 patients', why: 'Both printed that they admitted 10. The updates were lost, not the work.' },
            { t: 'The file system cannot count above 14', why: 'The numbers do not matter, the order of read and write does.' },
          ],
        },
        {
          q: 'A lock protects the counter only if …',
          options: [
            { t: 'every process that changes the counter uses the same lock', correct: true, why: 'One process without the lock can still read and write in the middle of another’s critical section.' },
            { t: 'at least one process uses it', why: 'The others would simply ignore it.' },
            { t: 'the processes run one after another anyway', why: 'Then you would not need a lock at all.' },
          ],
        },
        {
          review: 'Review from chapter 1',
          q: 'Why did you put `&` after the first admit?',
          options: [
            { t: 'So that the shell starts the second admit at once and both run at the same time', correct: true, why: 'Without &, the shell waits until the first one has finished.' },
            { t: 'To connect the two admits with a pipe', why: 'That would be `|`.' },
            { t: 'To give the admit a lock', why: 'The lock comes from `--lock`.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 4
    {
      id: 'deadlock',
      title: 'Deadlock',
      minutes: 12,
      goal: 'Create a real deadlock with two locks, then avoid it with a fixed lock order.',
      steps: [
        {
          id: 'stuck',
          title: 'Two jobs, two locks',
          setup: STOP + '; mkdir -p ~/ward; rm -rf ~/ward/sync.log ~/ward/locks',
          learn: [
            '`syncjob NAME FIRST SECOND` needs two locks: it takes FIRST, works one second, then waits for SECOND. Every step goes into `~/ward/sync.log`.',
            'If two jobs take the same two locks in **opposite order**, each can hold one and wait for the other: a **deadlock**.',
          ],
          example: { afterSetup: true, cmd: 'syncjob billing records alarms\ncat ~/ward/sync.log', out: 'billing: has records\nbilling: waits for alarms\nbilling: has alarms\nbilling: done', note: 'Alone, the job gets both locks and finishes after one second.' },
          task: 'Start `syncjob admission records alarms` and `syncjob alarm alarms records` at the same time in the background. Wait **2 seconds**, then print the log.',
          check: { state: 'l=~/ward/sync.log; if grep -q "admission: waits for alarms" $l 2>/dev/null && grep -q "alarm: waits for records" $l && ! grep -q done $l; then echo OK; elif grep -q done $l 2>/dev/null; then echo FINISHED; elif [ -s $l ] || pidof syncjob >/dev/null; then echo NOT_YET; else echo NOTHING; fi' },
          reasons: {
            NOTHING: 'The log is empty: no syncjob has run yet. Start both jobs, each with `&` at the end.',
            NOT_YET: 'The jobs have not reached their second lock yet. Give them time: `sleep 2` before `cat`.',
            FINISHED: 'At least one job finished, so there was no deadlock. Did both start at the same time, with opposite lock orders? Click **Reset exercise** and try again.',
          },
          mustUse: [{ re: /sync\.log/, msg: 'The jobs are stuck. Now also print `~/ward/sync.log` to see it, in the same Run.' }],
          diagnose: [{ when: { stderr: /sync\.log/, command: /syncjob/ }, msg: 'There is no log yet: the jobs had only just started when cat ran. Give them time: `sleep 2` before `cat`.' }],
          timeoutMsg: 'The shell waited for a job that can never finish: a deadlock. Start both jobs with `&`, then `sleep 2` instead of waiting for them.',
          hints: ['Both commands with `&` at the end, then `sleep 2`, then `cat ~/ward/sync.log`.'],
          solution: 'syncjob admission records alarms &\nsyncjob alarm alarms records &\nsleep 2\ncat ~/ward/sync.log',
          success: 'admission holds records and waits for alarms, alarm holds alarms and waits for records. Neither will ever give up its lock: a circle of waiting. The jobs still exist, they just make no progress (each gives up after 20 seconds).',
        },
        {
          id: 'order',
          title: 'Same order, no deadlock',
          setup: STOP + '; mkdir -p ~/ward; rm -rf ~/ward/sync.log ~/ward/locks; ' + DEADLOCKED,
          learn: [
            'The lecture’s rule: break one of the four deadlock conditions. The easiest one is the **circular wait**: if every job takes the locks in the **same order**, no circle can form.',
            'Stuck jobs must be stopped first: they still hold their locks.',
          ],
          example: { afterSetup: true, cmd: 'pidof syncjob | wc -w', out: '2', note: 'The two deadlocked jobs from the last step are running again (we started them for you).' },
          task: 'Stop the two stuck jobs. Then run both again, this time **both** with records first and alarms second, wait for them, and print the log.',
          check: { state: 'alive(){ for p in $(pidof syncjob); do grep -q "^State:.Z" /proc/$p/status 2>/dev/null || return 0; done; return 1; }; l=~/ward/sync.log; a=$(grep -c "admission: done" $l 2>/dev/null); b=$(grep -c "alarm: done" $l 2>/dev/null); ' +
            'i=0; while alive && [ $i -lt 8 ]; do sleep 0.1; i=$((i+1)); done; if [ "$a" -ge 1 ] && [ "$b" -ge 1 ]; then echo OK; elif alive; then echo STILL_STUCK; else echo NOT_BOTH; fi' },
          reasons: {
            STILL_STUCK: 'Some syncjob is still waiting for a lock. Stop the stuck jobs with `killall syncjob` first, then start the two jobs again in the same lock order.',
            NOT_BOTH: 'Not both jobs finished. Run `syncjob admission records alarms` and `syncjob alarm records alarms`, both in the background, then `wait`.',
          },
          mustUse: [{ re: /sync\.log/, msg: 'Both jobs finished. Now also print `~/ward/sync.log`, in the same Run.' }],
          timeoutMsg: 'The shell waited for jobs that are stuck: either the old jobs still hold their locks (stop them with `killall syncjob` first), or the two new jobs used opposite orders again.',
          hints: ['`killall syncjob` stops the stuck jobs politely.', 'Then `syncjob admission records alarms &`, `syncjob alarm records alarms &`, `wait`, `cat ~/ward/sync.log`.'],
          solution: 'killall syncjob\nsyncjob admission records alarms &\nsyncjob alarm records alarms &\nwait\ncat ~/ward/sync.log',
          success: 'Both done. Whoever got records first also got alarms; the other one simply waited a second. Same order for everyone, and the circle cannot form.',
        },
      ],
      quiz: [
        {
          q: 'Which of the four deadlock conditions does a fixed lock order break?',
          options: [
            { t: 'Circular wait', correct: true, why: 'With one order for everyone, nobody can wait for a lock that someone “behind” them holds.' },
            { t: 'Mutual exclusion', why: 'Each lock is still held by one job at a time.' },
            { t: 'No preemption', why: 'Locks are still released only voluntarily.' },
          ],
        },
        {
          q: 'Two jobs are deadlocked. What does `ps` show for them?',
          options: [
            { t: 'Both still exist, but they make no progress', correct: true, why: 'A deadlock is not a crash: the processes wait, forever if nobody intervenes.' },
            { t: 'Both have disappeared', why: 'They are still there, waiting for each other.' },
            { t: 'Both use 100 % CPU', why: 'Waiting needs no CPU. They sleep.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'A lock is taken by one process and the other process wants it. What does the other process do?',
          options: [
            { t: 'It waits until the lock is released', correct: true, why: 'That is what makes the critical section safe, and what makes deadlocks possible.' },
            { t: 'It takes the lock away', why: 'Locks are released voluntarily; nobody takes them away.' },
            { t: 'It skips the critical section', why: 'Then the shared data would not be updated at all.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      id: 'schedule',
      title: 'Be the scheduler',
      minutes: 20,
      goal: 'Work out FCFS, SJF and Round Robin schedules by hand and compare waiting times.',
      steps: [
        {
          id: 'fcfs',
          title: 'First come, first served',
          mode: 'report',
          learn: [
            'Four jobs are ready on the ward server at t = 0, in this order: **L** lab import (7 ms), **A** alarm check (1 ms), **D** dashboard (3 ms), **B** backup (5 ms). One CPU core.',
            '**FCFS** runs them in arrival order. **Waiting time** = time a job is ready but not running. Here: its start time.',
          ],
          example: { code: 'X (4 ms), Y (2 ms), FCFS:\nX runs 0–4, Y runs 4–6\nwaiting: X = 0, Y = 4   average = (0 + 4) ÷ 2 = 2 ms', file: 'two jobs' },
          task: 'Schedule L, A, D, B with **FCFS**. How long does the alarm check A wait, and what is the **average** waiting time of all four jobs?',
          fields: [
            { id: 'waitA', type: 'number', label: 'Waiting time of A', unit: 'ms' },
            { id: 'avg', type: 'number', label: 'Average waiting time', unit: 'ms' },
          ],
          verify: (v, ctx) => {
            const a = ctx.number(v.waitA), m = ctx.number(v.avg);
            if (a == null || m == null) return { ok: false, msg: 'Enter both answers as numbers.' };
            if (a === 8) return { ok: false, msg: '8 ms is when A **finishes**. Waiting time is the time before it starts: L runs first, for 7 ms.' };
            if (a !== FCFS.wait.A) return { ok: false, msg: 'Draw the timeline: L runs 0–7. When can A start?' };
            const turnaround = avg(Object.fromEntries(FCFS.segs.map(s => [s.id, s.end])));
            if (near(m, turnaround, 0.05)) return { ok: false, partial: true, msg: `A is right. ${r1(turnaround)} ms is the average **finish** time (turnaround). Waiting time is the start time: average of 0, 7, 8 and 11.` };
            if (!near(m, avg(FCFS.wait), 0.05)) return { ok: false, partial: true, msg: 'A is right. For the average, add the four start times (L, A, D, B) and divide by 4.' };
            return { ok: true, msg: `A waits ${FCFS.wait.A} ms for a job that needs 1 ms, because the long lab import came first. Average ${r1(avg(FCFS.wait))} ms. That is the **convoy effect**.` };
          },
          chart: () => gantt('FCFS: L, A, D, B', FCFS.segs, 'Waiting times: L 0, A 7, D 8, B 11 ms. Average 6.5 ms.'),
          hints: ['Draw a line from 0 to 16 ms and put the jobs on it in the order L, A, D, B.', 'Start times: L 0, A 7, D 8, B 11.'],
          solution: 'L 0–7, A 7–8, D 8–11, B 11–16\nwaiting: L 0, A 7, D 8, B 11\naverage = 26 ÷ 4 = 6.5 ms',
          success: 'Convoy effect.',
        },
        {
          id: 'sjf',
          title: 'Shortest job first',
          mode: 'report',
          learn: [
            '**SJF** always runs the shortest waiting job next. For jobs that are all ready at the same time, this gives the smallest possible average waiting time.',
            'Same four jobs: L 7 ms, A 1 ms, D 3 ms, B 5 ms. All ready at t = 0.',
          ],
          example: { code: 'X (4 ms), Y (2 ms), SJF:\nY runs 0–2, X runs 2–6\nwaiting: Y = 0, X = 2   average = 1 ms   (FCFS: 2 ms)', file: 'two jobs' },
          task: 'Schedule the four jobs with **SJF**. In which order do they run, and what is the average waiting time now?',
          fields: [
            ...['1st', '2nd', '3rd', '4th'].map((n, i) => ({ id: 'o' + i, type: 'select', label: `${n} job`, options: JOBS.map(j => ({ v: j.id, t: LABEL[j.id] })) })),
            { id: 'avg', type: 'number', label: 'Average waiting time', unit: 'ms' },
          ],
          verify: (v, ctx) => {
            const order = [0, 1, 2, 3].map(i => v['o' + i]), want = SJF.segs.map(s => s.id);
            if (new Set(order).size !== 4) return { ok: false, msg: 'Every job runs exactly once: choose four different jobs.' };
            if (order.join('') !== want.join('')) return { ok: false, msg: order[0] === 'A' ? 'A first is right. Then always pick the shortest of the remaining jobs.' : 'Shortest first: which job needs the least time?' };
            const m = ctx.number(v.avg);
            if (m == null) return { ok: false, msg: 'Enter the average waiting time as a number.' };
            const finish = avg(Object.fromEntries(SJF.segs.map(s => [s.id, s.end])));
            if (near(m, finish, 0.05)) return { ok: false, partial: true, msg: `The order is right. ${r1(finish)} ms is the average finish time. Average the **start** times instead.` };
            if (!near(m, avg(SJF.wait), 0.05)) return { ok: false, partial: true, msg: 'The order is right. Start times: A 0, D 1, B 4, L 9. Now the average.' };
            return { ok: true, msg: `A, D, B, L: average waiting ${r1(avg(SJF.wait))} ms instead of ${r1(avg(FCFS.wait))} ms with FCFS. The alarm check now runs immediately. The price: the long lab import waits 9 ms, and the scheduler must know how long each job takes.` };
          },
          chart: () => gantt('SJF: A, D, B, L', SJF.segs, 'Waiting times: A 0, D 1, B 4, L 9 ms. Average 3.5 ms (FCFS: 6.5 ms).'),
          hints: ['Sort the jobs by their CPU time.', 'Order A, D, B, L. Start times 0, 1, 4 and 9.'],
          solution: 'A 0–1, D 1–4, B 4–9, L 9–16\nwaiting: A 0, D 1, B 4, L 9\naverage = 14 ÷ 4 = 3.5 ms',
          success: 'Shortest first.',
        },
        {
          id: 'rr',
          title: 'Round Robin, everyone gets a turn',
          mode: 'report',
          learn: [
            '**Round Robin** gives each job at most one **time quantum**, here q = 2 ms. A job that is not finished goes to the back of the queue. Nobody waits long for a first turn.',
            '**Response time** = time until a job runs for the first time. Same jobs, queue order L, A, D, B.',
          ],
          example: { code: 'X (3 ms), Y (2 ms), q = 2:\nX 0–2, Y 2–4, X 4–5\nX finishes at 5, Y at 4   response: X = 0, Y = 2', file: 'two jobs' },
          task: 'Schedule L, A, D, B with **Round Robin** and q = 2 ms. When does the lab import **L finish**, and what is the **average response time**?',
          fields: [
            { id: 'finishL', type: 'number', label: 'L finishes at', unit: 'ms' },
            { id: 'resp', type: 'number', label: 'Average response time', unit: 'ms' },
          ],
          verify: (v, ctx) => {
            const f = ctx.number(v.finishL), m = ctx.number(v.resp);
            if (f == null || m == null) return { ok: false, msg: 'Enter both answers as numbers.' };
            if (f !== RR.finish.L) return { ok: false, msg: f === 7 ? 'With q = 2, L cannot run 7 ms in one go: it gets 2 ms, then the others take their turns.' : 'Draw the timeline in 2 ms slices: L 0–2, A 2–3, D 3–5, B 5–7, then L again … Which job runs last?' };
            if (near(m, avg(SJF.wait), 0.05) || near(m, avg(FCFS.wait), 0.05)) return { ok: false, partial: true, msg: 'L is right. For the response time, look only at the **first** slice of each job: L 0, A 2, D 3, B 5.' };
            if (!near(m, avg(RR.first), 0.05)) return { ok: false, partial: true, msg: 'L is right. Response time is when each job runs for the first time. Average the four first starts.' };
            return { ok: true, save: { done: true }, msg: `L finishes at ${RR.finish.L} ms, last of all, but every job got the CPU within 5 ms: average response ${r1(avg(RR.first))} ms (FCFS: ${r1(avg(FCFS.wait))} ms). That is why interactive systems use time slices.` };
          },
          chart: () => gantt('Round Robin, q = 2 ms', RR.segs, 'First turns: L 0, A 2, D 3, B 5 ms. Average response 2.5 ms. L finishes last, at 16 ms.'),
          hints: ['Slices: L 0–2, A 2–3 (done), D 3–5, B 5–7, then back to L.', 'Continue: L 7–9, D 9–10 (done), B 10–12, L 12–14, B 14–15 (done), L 15–16.'],
          solution: 'L 0–2, A 2–3, D 3–5, B 5–7, L 7–9, D 9–10, B 10–12, L 12–14, B 14–15, L 15–16\nL finishes at 16 ms\nfirst turns: L 0, A 2, D 3, B 5, average = 10 ÷ 4 = 2.5 ms',
          success: 'Everyone gets a turn.',
        },
      ],
      quiz: [
        {
          q: 'Which algorithm gave the smallest **average waiting** time for our four jobs?',
          options: [
            { t: 'SJF, 3.5 ms', correct: true, why: 'Short jobs first keeps most jobs from waiting long.' },
            { t: 'FCFS, 6.5 ms', why: 'The long lab import at the front made everyone wait.' },
            { t: 'Round Robin', why: 'Round Robin is good for response time, but jobs wait in between their slices.' },
          ],
        },
        {
          q: 'Why do desktops and phones use time slices like Round Robin?',
          options: [
            { t: 'Every program gets the CPU again within a short time, so the system feels responsive', correct: true, why: 'Response time matters more for people than the shortest total time.' },
            { t: 'It needs no context switches', why: 'It needs many: one after every slice.' },
            { t: 'It always finishes all jobs sooner', why: 'The last job in our example finished at 16 ms with every algorithm.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'A scheduler may switch between processes at any time. What does that mean for a shared counter without a lock?',
          options: [
            { t: 'A switch between reading and writing can make an update get lost', correct: true, why: 'That is exactly what happened to the admits in chapter 3.' },
            { t: 'Nothing, the scheduler never switches inside a program', why: 'It can switch after any instruction.' },
            { t: 'The counter becomes read-only', why: 'Scheduling does not change file permissions.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      id: 'nice',
      title: 'Scheduling in Linux: nice',
      minutes: 15,
      goal: 'Watch the Linux scheduler share one CPU, and change the shares with nice.',
      steps: [
        {
          id: 'share',
          title: 'Two jobs, one CPU',
          setup: STOP + '; rm -rf ~/sched',
          learn: [
            'This server has **one** CPU core. `crunch NAME SECONDS` only calculates, it never waits, and at the end prints how many rounds it managed.',
            'Two crunch jobs at the same time have to share the core. The Linux scheduler switches between them many times per second.',
          ],
          example: { cmd: 'crunch solo 2', out: 'solo: 6 rounds (nice 0)', note: 'One job alone gets the whole core. Your number differs, it depends on the machine.', volatile: 'numbers' },
          task: 'Run `crunch a 3` and `crunch b 3` **at the same time**, and wait for both. Compare their rounds.',
          check: { state: CR + 'if [ ! -f ~/sched/a.txt ] || [ ! -f ~/sched/b.txt ]; then echo MISSING; elif [ "$(niceof a)" != 0 ] || [ "$(niceof b)" != 0 ]; then echo NICE; elif ! together; then echo APART; else echo OK; fi' },
          reasons: {
            MISSING: 'I cannot find the results of both jobs. Start `crunch a 3 &` and `crunch b 3 &`, then `wait`.',
            NICE: 'One job ran with a nice value. That is the next step: here both should run with the same priority.',
            APART: 'The two jobs ran one after another, so each had the core to itself. Start both with `&`, then `wait`.',
          },
          hints: ['`crunch a 3 &`, `crunch b 3 &`, then `wait`.'],
          solution: 'crunch a 3 &\ncrunch b 3 &\nwait',
          success: 'About the same number of rounds each: with equal nice values, the scheduler gave both a fair half of the core, switching between them many times per second.',
        },
        {
          id: 'nice',
          title: 'Be nice: lower a priority',
          setup: STOP + '; rm -rf ~/sched; crunch backup 60 & sleep 0.3',
          learn: [
            'Each process has a **nice value** from −20 to 19. Higher means nicer to others: a lower priority and a smaller share of the CPU. Normal is 0. `nice -n 10 COMMAND` starts a command with nice 10, `renice -n 10 -p PID` changes a running process.',
            'Ordinary users may only make their processes nicer, never less nice.',
          ],
          example: { cmd: 'nice -n 5 nice', out: '5', note: '`nice` without a command prints the current nice value: here the inner nice was started with 5.' },
          task: 'A backup (`crunch backup 60`) is already running and competes with the ward software for the CPU. Give it the nicest value, **19**, without stopping it.',
          // The probe waits up to 2 s: a stopped job can stay listed for a moment, and a renice takes effect at once.
          check: { state: 'live(){ for p in $(pidof crunch); do grep -q "^State:.Z" /proc/$p/status 2>/dev/null || { echo $p; return 0; }; done; return 1; }; ' +
            'i=0; while p=$(live) && [ "$(cut -d" " -f19 /proc/$p/stat 2>/dev/null)" != 19 ] && [ $i -lt 10 ]; do sleep 0.2; i=$((i+1)); done; ' +
            'p=$(live); if [ -z "$p" ]; then echo NOT_RUNNING; elif [ "$(cut -d" " -f19 /proc/$p/stat)" = 19 ]; then echo OK; else echo NOT_19; fi' },
          reasons: {
            NOT_RUNNING: 'The backup is not running any more: it was stopped. Click **Reset exercise** to start it again, then change its priority instead of stopping it.',
            NOT_19: 'The backup is running, but its nice value is not 19 yet. Find its PID with `pidof crunch`, then `renice -n 19 -p PID`.',
          },
          diagnose: [{ when: { stderr: /[Pp]ermission denied/ }, msg: 'Linux refused: you may only make a process **nicer** (a higher value). Use 19.' }],
          hints: ['`pidof crunch` prints the PID of the backup.', '`renice -n 19 -p $(pidof crunch)` does both in one line.'],
          solution: 'renice -n 19 -p $(pidof crunch)',
          success: 'The backup keeps running, but from now on it lets other jobs go first. On a real server this keeps reports and backups from slowing down interactive work.',
        },
        {
          id: 'calc',
          title: 'Calculate the CPU share',
          mode: 'report',
          learn: [
            'Linux gives every nice value a **weight**: nice 0 has 1024, nice 5 has 335, nice 19 only 15. Jobs that all want the CPU share it in proportion to their weights.',
            'Share of a job = its weight ÷ the sum of all weights. In this small emulated Linux the measured shares jump around, so you calculate them.',
          ],
          example: { code: 'job a: nice 0 (weight 1024), job b: nice 19 (weight 15)\nshare of b = 15 ÷ (1024 + 15) = 0.0144 ≈ 1.4 %', file: 'an example with other numbers' },
          task: 'The ward software runs with nice 0, a report with nice **5**. Both want the CPU all the time. What share of the core does the **report** get?',
          fields: [
            { id: 'share', type: 'number', label: 'CPU share of the report', unit: '%', help: 'One decimal is enough, for example 12.3.' },
          ],
          verify: (v, ctx) => {
            const s = ctx.number(v.share), want = 100 * 335 / (1024 + 335);
            if (s == null) return { ok: false, msg: 'Enter the share as a number.' };
            if (near(s, 100 * 335 / 1024, 0.2)) return { ok: false, partial: true, msg: 'You divided the report’s weight by the weight of the ward software. The share is weight ÷ **sum** of both weights: 335 ÷ (1024 + 335).' };
            if (near(s, 100 - want, 0.2)) return { ok: false, partial: true, msg: 'That is the share of the ward software. Take the report’s weight, 335, on top.' };
            if (near(s, want / 100, 0.005)) return { ok: false, partial: true, msg: `That is the share as a fraction. In percent: multiply by 100, ${r1(want)} %.` };
            if (near(s, 50, 0.5)) return { ok: false, msg: 'Half each would be right for two jobs with the same nice value. Here the weights differ: 1024 and 335.' };
            if (!near(s, want, 0.2)) return { ok: false, msg: 'Not quite. Share = 335 ÷ (1024 + 335) × 100.' };
            return { ok: true, save: { share: want }, msg: `About ${r1(want)} %: the report gets roughly one quarter, the ward software three quarters. Five steps of nice already make a big difference: each step changes the weight by about 25 %.` };
          },
          chart: () => ({ type: 'bars', title: 'Share of the CPU core by weight', unit: '%', bars: [{ label: 'ward software (nice 0)', value: 100 * 1024 / 1359 }, { label: 'report (nice 5)', value: 100 * 335 / 1359 }] }),
          hints: ['Add both weights: 1024 + 335.', 'Share of the report = 335 ÷ 1359 × 100.'],
          solution: 'share = 335 ÷ (1024 + 335) × 100 = 335 ÷ 1359 × 100 ≈ 24.7 %',
          success: 'Share calculated.',
        },
      ],
      quiz: [
        {
          q: 'You start a long report with `nice -n 19`. What happens?',
          options: [
            { t: 'It runs, but gets only a small share of the CPU while other jobs need it', correct: true, why: 'nice changes the share, it does not stop the job. When nothing else runs, it gets the whole core.' },
            { t: 'It waits until all other processes have finished', why: 'That would be a strict priority. With nice, b still got some rounds.' },
            { t: 'It runs 19 times faster', why: 'Higher nice means nicer to others: slower, not faster.' },
          ],
        },
        {
          q: 'Two CPU-bound jobs with the same nice value run on one core. What share does each get?',
          options: [
            { t: 'About half each', correct: true, why: 'The Linux scheduler aims for fairness: equal weights, equal shares.' },
            { t: 'The first job gets everything until it has finished', why: 'That would be FCFS. Linux switches between them many times per second.' },
            { t: 'Each gets the whole core', why: 'One core can only run one job at a time.' },
          ],
        },
        {
          review: 'Review from chapter 5',
          q: 'Linux shares the CPU in many short turns. Which algorithm from chapter 5 is closest to this idea?',
          options: [
            { t: 'Round Robin', correct: true, why: 'Many short turns, nobody waits long. Linux adds weights: nicer jobs get shorter or fewer turns.' },
            { t: 'FCFS', why: 'FCFS lets each job run until it is done.' },
            { t: 'SJF', why: 'SJF needs to know how long each job takes, which Linux does not know in advance.' },
          ],
        },
      ],
    },
  ],

  summary: [
    ['A | B', 'pipe: the output of A becomes the input of B'],
    ['mkfifo NAME', 'create a named pipe that any two processes can use'],
    ['socat - UNIX-CONNECT:FILE', 'send input to a socket server and print its answer'],
    ['netstat -lx', 'list the Unix domain sockets that servers listen on'],
    ['COMMAND &, wait', 'run in the background, wait for all background jobs'],
    ['flock FILE', 'take a lock (mutual exclusion between processes)'],
    ['killall NAME', 'politely stop all processes with that name'],
    ['nice -n 19 COMMAND', 'start a command with a lower priority'],
    ['renice -n 19 -p PID', 'lower the priority of a running process'],
  ],

  done: {
    lead: 'You connected processes with pipes and a socket, caused a race condition and a deadlock on purpose and fixed both, scheduled jobs by hand, and changed how Linux shares its CPU.',
    columns: ['Command', 'What it does'],
    recap: [
      '**IPC**: pipes carry data one way, named pipes have a name in the file system, sockets connect a client and a server in both directions, also across the network.',
      'Shared data needs **mutual exclusion**: a lock only helps if every process uses it. A **semaphore** lets up to N in.',
      'Locks taken in opposite order can **deadlock**. One fixed lock order for everyone prevents it.',
      '**FCFS** is simple but can make short jobs wait (convoy effect), **SJF** minimises average waiting time, **Round Robin** gives everyone a quick first turn.',
      'Linux shares the CPU fairly by weight: share = weight ÷ sum of all weights. **nice** and **renice** lower a job’s weight and with it its share.',
    ],
  },
};
})();
