/*
 * Content for Practical 04 · Memory & file systems.
 *
 * Rendered by the same engine as Practicals 01 to 03 (course-app.js). Text fields support
 * `code` and **bold**.
 *
 * Everything runs in the browser Linux, no Codespace needed:
 *  - Shell steps: free and /proc/meminfo, the memory map of a process (/proc/self/maps), page
 *    numbers and offsets with shell arithmetic, real page faults measured with `time -v`, the
 *    resident size of a running program, a real out-of-memory kill (this Linux has no swap),
 *    inodes and hard links, blocks, tmpfs, and a file system that runs out of inodes.
 *    The course program `cache` (fixtures/p04, a small Lua script) keeps synthetic waveforms in
 *    memory. Every example output was produced by the browser Linux and is re-checked by
 *    scripts/test_course_browser.cjs.
 *  - Report steps: an address translation with a page table, the page faults the student
 *    measured, and page replacement (FIFO, LRU) worked out by hand. verify() recomputes every
 *    answer.
 */
(() => {
  const near = (a, b, tol) => a != null && Math.abs(a - b) <= tol;

  // ---------------------------------------------------------------- page replacement (chapter 5)
  const REFS = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
  // Simulate FIFO or LRU with n frames. Returns the number of misses and the pages in RAM at the end.
  const simulate = (algo, n) => {
    const frames = [], since = {}, used = {};
    let misses = 0;
    REFS.forEach((p, t) => {
      if (!frames.includes(p)) {
        misses++;
        if (frames.length === n) {
          const victim = frames.reduce((v, x) => ((algo === 'FIFO' ? since[x] : used[x]) < (algo === 'FIFO' ? since[v] : used[v]) ? x : v));
          frames.splice(frames.indexOf(victim), 1);
        }
        frames.push(p); since[p] = t;
      }
      used[p] = t;
    });
    return { misses, end: frames.slice().sort((a, b) => a - b) };
  };
  const FIFO3 = simulate('FIFO', 3), FIFO4 = simulate('FIFO', 4), LRU4 = simulate('LRU', 4);
  const REFTEXT = REFS.join(' ');
  const PAGE_CHOICES = [1, 2, 3, 4, 5].map(p => ({ v: String(p), t: 'page ' + p }));
  const missChart = (extra) => ({
    type: 'bars', title: `Misses for ${REFTEXT}`, unit: 'misses', digits: 0, max: 12,
    bars: [{ label: 'FIFO, 3 frames', value: FIFO3.misses }, { label: 'FIFO, 4 frames', value: FIFO4.misses }].concat(extra || []),
  });

  // ---------------------------------------------------------------- address translation (chapter 3)
  const PAGE = 4096, ADDR = 30000;
  const PT = { 6: 11, 7: 2, 8: 9 };                       // page -> frame
  const VPN = Math.floor(ADDR / PAGE), OFF = ADDR % PAGE;   // 7, 1328
  const PHYS = PT[VPN] * PAGE + OFF;                       // 9520

  // ---------------------------------------------------------------- shell snippets
  // Stop every cache from earlier steps and wait until it is gone (at most 3 seconds).
  const STOP = 'killall -q cache 2>/dev/null; i=0; while pidof cache >/dev/null && [ $i -lt 30 ]; do sleep 0.1; i=$((i+1)); done';
  // A running cache with 8 MB, as in the waveform viewer. Waits until it has loaded its data.
  const CACHE8 = STOP + '; rm -f /tmp/cache.out; cache 8 >/tmp/cache.out 2>&1 & ' +
    'i=0; while ! grep -q loaded /tmp/cache.out 2>/dev/null && [ $i -lt 80 ]; do sleep 0.1; i=$((i+1)); done';
  // The ward notes for the link exercises: student-owned copies of the read-only handover.
  const WARD = 'rm -rf ~/ward; mkdir -p ~/ward/notes ~/ward/shared; cp ~/docs/handover.txt ~/ward/notes/handover.txt; chmod 644 ~/ward/notes/handover.txt';
  // The uploader bug of chapter 7: thousands of empty files until no inode is left.
  const FLOOD = 'rm -rf ~/spool ~/ward; mkdir -p ~/ward ~/spool/outbox ~/spool/upload-tmp; ' +
    'cp ~/logs/ward.log ~/ward/ward.log; echo bed-04 > ~/spool/outbox/night-01.ecg; echo bed-06 > ~/spool/outbox/night-02.ecg; ' +
    'cd ~/spool/upload-tmp && seq 1 6000 | xargs touch 2>/dev/null; cd ~; true';

window.PRACTICAL = {
  id: 'its4dh-p04',
  course: 'IT Systems for Digital Health Experts',
  title: 'Memory & file systems',
  number: 'Practical 04',
  minutes: 90,
  home: '/home/student',
  user: 'student',
  host: 'pulsebridge',
  // Sourced before every command: the course program is on the PATH.
  prelude: 'PATH="$HOME/bin:$PATH"',
  files: [
    { path: 'bin/cache', url: 'fixtures/p04/cache', readOnly: true, exec: true },
    { path: 'logs/ward.log', url: 'fixtures/p04/ward.log', readOnly: true },
    { path: 'docs/handover.txt', url: 'fixtures/p04/handover.txt', readOnly: true },
  ],

  intro: {
    lead: 'Last night the PulseBridge ward server had two problems: the waveform viewer crashed, and at 04:10 the server could not write its log, although the disk was not full. You are on call. Today you look inside the memory of processes, watch Linux load pages on demand, and find out what really filled up.',
    steps: [
      ['Read', 'a short explanation and one example.'],
      ['Try', 'it yourself in the Linux system inside this page, or calculate it by hand.'],
      ['Check', 'the result. You get feedback straight away and can retry as often as you like.'],
    ],
    note: 'Your progress is saved in this browser only. All data is synthetic: no real patients are involved.',
    demo: { cmd: 'grep ALARM logs/ward.log | wc -l', out: '2' },
  },

  chapters: [
    // ---------------------------------------------------------------- 1
    {
      id: 'ram',
      title: 'How much memory is there?',
      minutes: 8,
      goal: 'Find out how much RAM and swap space this server has.',
      steps: [
        {
          id: 'free',
          title: 'Total RAM',
          learn: [
            '`free` shows the memory of the whole machine: **total**, **used**, **free**, and memory the kernel uses as a cache for files. Without options it counts in kB; `free -m` counts in MB.',
            'The row **Swap** is disk space that Linux can use when RAM runs out: the pantry next to the kitchen counter.',
          ],
          example: { cmd: 'free', out: '              total        used        free      shared  buff/cache   available\nMem:          39976        4084       20660       14960       15232       19652\nSwap:             0           0           0', note: 'Numbers in kB. The used and free values on your screen differ a little.', volatile: 'numbers' },
          task: 'How many **MB** of RAM does this server have in total? Print just the number.',
          check: { output: 'number', expect: "free -m | awk '/^Mem/ {print $2}'" },
          diagnose: [
            { when: { stdout: /total/ }, msg: 'That is the whole table. Print only the total of the Mem row, for example with `awk \'/^Mem/ {print $2}\'`.' },
            { when: { number: 39976 }, msg: 'That is the total in kB. The task asks for MB: use `free -m`.' },
          ],
          hints: ['`free -m` counts in MB. The total is the first number in the row Mem.', '`free -m | awk \'/^Mem/ {print $2}\'` prints the second field of the Mem row.'],
          solution: "free -m | awk '/^Mem/ {print $2}'",
          success: 'About 39 MB: a tiny server, smaller than one photo on your phone. Your laptop has several hundred times more. Small memory makes every effect in this practical easy to see.',
        },
        {
          id: 'swap',
          title: 'Is there a pantry?',
          learn: [
            'The file `/proc/meminfo` is not stored on any disk. The kernel writes it the moment you read it, with one line per value. `free` reads its numbers from there.',
            'Lines that start with **Swap** describe the swap space: how much exists, how much is free, and how much is cached.',
          ],
          example: { cmd: 'grep MemTotal /proc/meminfo', out: 'MemTotal:          39976 kB', note: 'The same total as in `free`, in kB.' },
          task: 'Print every line of `/proc/meminfo` that is about **swap** space.',
          check: { output: 'lines', expect: 'grep Swap /proc/meminfo' },
          diagnose: [
            { when: { stdout: /^SwapTotal[^\n]*$/ }, msg: 'Only one line. Search for every line that starts with Swap: `grep Swap /proc/meminfo`.' },
            { when: { stdout: /MemTotal/ }, msg: 'Search for the word Swap instead of MemTotal.' },
            { when: { stdout: /^$/, status: 1 }, msg: 'grep found nothing. Upper and lower case matter: Swap starts with a capital S.' },
          ],
          hints: ['Use the example, but search for another word.', '`grep Swap /proc/meminfo`'],
          solution: 'grep Swap /proc/meminfo',
          success: 'SwapTotal is 0: this server has no swap at all. When its RAM is full, Linux cannot move pages to the disk. Keep that in mind for chapter 4.',
        },
      ],
      quiz: [
        {
          q: '`free -m` shows Swap: 0. What does that mean?',
          options: [
            { t: 'There is no disk space where Linux could move pages when RAM is full', correct: true, why: 'Swap is the pantry for pages. Without it, everything must fit into RAM.' },
            { t: 'No program uses any memory', why: 'Swap says nothing about RAM; the Mem row shows the used RAM.' },
            { t: 'The disk is full', why: 'Swap is a separate area. Here it simply does not exist.' },
          ],
        },
        {
          q: 'Where does the text of `/proc/meminfo` come from?',
          options: [
            { t: 'The kernel creates it at the moment you read it', correct: true, why: '/proc is a window into the kernel. Its files take no space on any disk.' },
            { t: 'An administrator updates the file every minute', why: 'Nobody writes it: the kernel answers each read with current values.' },
            { t: 'It is copied from the hard disk at boot', why: 'The values change all the time, so a copy from boot would be outdated.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 2
    {
      id: 'space',
      title: 'Every process has its own address space',
      minutes: 12,
      goal: 'Look at the memory map of a process and measure its stack in pages.',
      steps: [
        {
          id: 'maps',
          title: 'The memory map of a process',
          setup: 'mkdir -p ~/mem; rm -f ~/mem/stack.txt',
          learn: [
            '`/proc/self/maps` lists the address space of the process that reads it, one **region** per line: start and end address in hexadecimal, the permissions (`r`ead, `w`rite, e`x`ecute) and what lives there, for example the program code, `[heap]` or `[stack]`.',
            'Other users’ maps are protected: reading `/proc/1/maps` of root’s init process is refused.',
          ],
          example: { cmd: "head -n 2 /proc/self/maps\ncat /proc/1/maps 2>&1", out: "08048000-0804c000 r--p 00000000 00:02 7          /bin/busybox\n0804c000-080c2000 r-xp 00004000 00:02 7          /bin/busybox\ncat: can't open '/proc/1/maps': Permission denied", note: 'The second region is the program code: readable and executable (r-x), but not writable. The map of process 1 belongs to root.' },
          task: 'Save the line of your own memory map that describes the **stack** into the file `~/mem/stack.txt`.',
          check: { state: "f=~/mem/stack.txt; if [ ! -s $f ]; then echo MISSING; elif [ $(grep -c '' $f) != 1 ]; then echo LINES; elif grep -Eq '^[0-9a-f]{8}-[0-9a-f]{8} rw-p .*\\[stack\\]$' $f; then echo OK; else echo OTHER; fi" },
          reasons: {
            MISSING: 'The file `~/mem/stack.txt` does not exist or is empty. Search `/proc/self/maps` for stack and redirect the output with `>`.',
            LINES: 'The file has more than one line. Keep only the line with `[stack]`: `grep stack /proc/self/maps > ~/mem/stack.txt`.',
            OTHER: 'The file contains something, but not the stack line of a memory map. Search for the word stack in `/proc/self/maps`.',
          },
          diagnose: [{ when: { stderr: /Permission denied/ }, msg: 'You tried to read another user’s map. Use your own: `/proc/self/maps`.' }],
          hints: ['`grep stack /proc/self/maps` prints the line. Try it first without saving.', 'Then save it: `grep stack /proc/self/maps > ~/mem/stack.txt`'],
          solution: 'grep stack /proc/self/maps > ~/mem/stack.txt',
          success: 'Saved. Run the grep twice and compare: the stack addresses change every time. Linux places the stack at a random virtual address for every new process, which makes attacks harder. The program never sees the physical address at all.',
        },
        {
          id: 'pages',
          title: 'How many pages is the stack?',
          setup: 'mkdir -p ~/mem; [ -s ~/mem/stack.txt ] || grep stack /proc/self/maps > ~/mem/stack.txt',
          learn: [
            'The shell can calculate: `echo $(( 20 - 4 ))` prints 16. A number that starts with **0x** is read as hexadecimal, so `$(( 0x1000 ))` is 4096, exactly one page.',
            'The size of a region is its end address minus its start address. Divided by the page size, 4096, it gives the number of pages.',
          ],
          example: { cmd: 'echo $(( 0x0804c000 - 0x08048000 ))\necho $(( (0x0804c000 - 0x08048000) / 4096 ))', out: '16384\n4', note: 'The first region of busybox from the previous step: 16384 bytes, that is 4 pages.' },
          task: 'Look at your stack line in `~/mem/stack.txt`. How many **pages** of 4096 bytes does the stack have? Print just the number.',
          check: { output: 'number', expect: 'l=$(grep stack /proc/self/maps); s=${l%%-*}; e=${l#*-}; e=${e%% *}; echo $(( (0x$e - 0x$s) / 4096 ))' },
          diagnose: [
            { when: { number: 135168 }, msg: 'That is the size in bytes. Divide by the page size, 4096.' },
            { when: { number: 132 }, msg: 'That is the size in kB. A page has 4 kB: divide by 4, or divide the bytes by 4096.' },
            { when: { stderr: /arithmetic syntax error|syntax error/ }, msg: 'The shell could not read the numbers. Write both addresses with 0x in front, for example `$(( (0xbfbdd000 - 0xbfbbc000) / 4096 ))`.' },
          ],
          hints: ['`cat ~/mem/stack.txt`: the first column is start-end. Copy both addresses.', 'Then `echo $(( (0xEND - 0xSTART) / 4096 ))` with your two addresses.'],
          solution: 'echo $(( (0xbfbdd000 - 0xbfbbc000) / 4096 ))   # with the two addresses of your stack line',
          success: '33 pages, that is 132 kB. The addresses change with every process, the size does not. If a program needs more stack, the kernel adds pages on demand.',
        },
      ],
      quiz: [
        {
          q: 'You run `grep stack /proc/self/maps` twice. The addresses differ. Why?',
          options: [
            { t: 'Each run is a new process, and Linux places its stack at a random virtual address', correct: true, why: 'Address randomization makes attacks harder. The addresses are virtual, the MMU maps them to physical frames.' },
            { t: 'The physical RAM is full, so the stack moves', why: 'The addresses are virtual. They say nothing about where the data lies in physical RAM.' },
            { t: 'The first grep has changed the file', why: '/proc/self/maps is generated by the kernel for the process that reads it.' },
          ],
        },
        {
          q: 'Why may you read `/proc/self/maps` but not `/proc/1/maps`?',
          options: [
            { t: 'The OS keeps processes of different users apart; process 1 belongs to root', correct: true, why: 'Isolation: you may inspect your own processes, not those of other users.' },
            { t: 'Process 1 has no memory map', why: 'Every process has an address space. You are just not allowed to see this one.' },
            { t: 'The file is too large', why: 'Size is not the reason: Linux answered with Permission denied.' },
          ],
        },
        {
          review: 'Review from chapter 1',
          q: 'Which command shows the total RAM of the machine in MB?',
          options: [
            { t: '`free -m`', correct: true, why: 'Without -m, free counts in kB.' },
            { t: '`cat /proc/self/maps`', why: 'That is the address space of one process, not the RAM of the machine.' },
            { t: '`grep Swap /proc/meminfo`', why: 'That shows only the swap space.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 3
    {
      id: 'paging',
      title: 'Pages and page faults',
      minutes: 16,
      goal: 'Split an address into page and offset, translate it, and watch Linux load pages on demand.',
      steps: [
        {
          id: 'split',
          title: 'Be the MMU: page and offset',
          learn: [
            'With pages of 4096 bytes, the **page number** of an address is address ÷ 4096 without the remainder, and the **offset** is the remainder: the position inside the page.',
            'In the shell, `/` divides whole numbers and `%` gives the remainder.',
          ],
          example: { cmd: 'echo $(( 8200 / 4096 )) $(( 8200 % 4096 ))', out: '2 8', note: 'Address 8200 lies on page 2, 8 bytes after its start.' },
          task: 'A program reads logical address **30000**. Print its page number and its offset, with pages of 4096 bytes.',
          check: { output: 'names', expect: 'echo $(( 30000 / 4096 )) $(( 30000 % 4096 ))' },
          diagnose: [
            { when: { stdout: /^7$/ }, msg: 'The page number is right. Print the offset as well: `$(( 30000 % 4096 ))`.' },
            { when: { stdout: /^1328$/ }, msg: 'The offset is right. Print the page number as well: `$(( 30000 / 4096 ))`.' },
            { when: { stdout: /7\.3/ }, msg: 'A page number is a whole number. The shell divides whole numbers: `$(( 30000 / 4096 ))`.' },
          ],
          hints: ['Use the example and change the address.', '`echo $(( 30000 / 4096 )) $(( 30000 % 4096 ))`'],
          solution: 'echo $(( 30000 / 4096 )) $(( 30000 % 4096 ))',
          success: 'Page 7, offset 1328. The MMU does exactly this for every memory access, only in hardware and billions of times per second.',
        },
        {
          id: 'translate',
          title: 'Look up the frame',
          mode: 'report',
          learn: [
            'The **page table** of the process says in which **frame** of physical RAM each page lies. The offset is copied unchanged.',
            'Physical address = frame × 4096 + offset.',
          ],
          example: { code: 'address 8200: page 2, offset 8\npage table: page 2 → frame 5\nphysical = 5 × 4096 + 8 = 20488', file: 'an example with other numbers' },
          task: `Address **${ADDR}** is on page ${VPN} with offset ${OFF}. The page table of the process says: page 6 → frame 11, page 7 → frame 2, page 8 → frame 9. Which **physical** address does the MMU use?`,
          fields: [{ id: 'phys', type: 'number', label: 'Physical address', help: 'A whole number, for example 12345.' }],
          verify: (v, ctx) => {
            const p = ctx.number(v.phys);
            if (p == null) return { ok: false, msg: 'Enter the physical address as a whole number.' };
            if (p === ADDR) return { ok: false, msg: `That is the logical address. The MMU replaces page ${VPN} by its frame from the page table.` };
            if (p === PT[VPN] * PAGE) return { ok: false, partial: true, msg: `That is where frame ${PT[VPN]} starts. Add the offset, ${OFF}.` };
            if (p === PT[6] * PAGE + OFF || p === PT[8] * PAGE + OFF) return { ok: false, msg: `You used the wrong row of the page table. Look up page ${VPN}.` };
            if (p === PT[VPN] * OFF || p === PT[VPN] + OFF) return { ok: false, msg: `Multiply the frame number by the page size: ${PT[VPN]} × 4096, then add the offset.` };
            if (p !== PHYS) return { ok: false, msg: `Not quite. Physical address = frame × 4096 + offset, with the frame of page ${VPN}.` };
            return { ok: true, msg: `${PT[VPN]} × 4096 + ${OFF} = ${PHYS}. The program thinks the data is at ${ADDR}, but it really lies at ${PHYS} in RAM. Another process can use address ${ADDR} too, and its page table points somewhere else.` };
          },
          hints: [`Page ${VPN} is in frame ${PT[VPN]}.`, `${PT[VPN]} × 4096 + ${OFF}`],
          solution: `page ${VPN} → frame ${PT[VPN]}\nphysical = ${PT[VPN]} × 4096 + ${OFF} = ${PHYS}`,
          success: 'Address translated.',
        },
        {
          id: 'faults',
          title: 'Count page faults',
          learn: [
            '`/usr/bin/time -v COMMAND` runs a command and reports how it used memory, including its **minor page faults**: how often the kernel had to give the program a fresh page.',
            '`dd if=/dev/zero of=/dev/null bs=8M count=N` reserves a buffer of 8 MB and copies N blocks of zeros through it.',
          ],
          example: { cmd: "/usr/bin/time -v true 2>&1 | grep -E 'Minor|Page size'", out: '\tMinor (reclaiming a frame) page faults: 39\n\tPage size (bytes): 4096', note: '`true` does nothing, yet it needs about 40 pages just to start. Your number may differ by one or two.', volatile: 'numbers' },
          task: 'Measure the minor page faults of dd with an 8 MB buffer twice: once with **count=0** (the buffer is never used) and once with **count=1** (it is filled once). Print only the two lines with the page faults.',
          check: { output: 'numbers', tol: 20, expect: "for n in 0 1; do /usr/bin/time -v dd if=/dev/zero of=/dev/null bs=8M count=$n 2>&1 | grep Minor; done" },
          diagnose: [
            { when: { stdout: /Command being timed/ }, msg: 'That is the whole report. Keep only the lines with Minor: add `| grep Minor` behind each measurement.' },
            { when: { stdoutLines: 1 }, msg: 'One measurement. Run dd twice, with count=0 and with count=1.' },
            { when: { stderr: /Command being timed/ }, msg: 'The report of time goes to the error output. Send it into the pipe as well: write `2>&1` before `| grep Minor`.' },
          ],
          hints: ['One measurement: `/usr/bin/time -v dd if=/dev/zero of=/dev/null bs=8M count=0 2>&1 | grep Minor`', 'Write that line twice, the second time with `count=1`.'],
          solution: "/usr/bin/time -v dd if=/dev/zero of=/dev/null bs=8M count=0 2>&1 | grep Minor\n/usr/bin/time -v dd if=/dev/zero of=/dev/null bs=8M count=1 2>&1 | grep Minor",
          success: 'About 40 page faults without using the buffer, about 2090 when it is filled. Reserving 8 MB cost nothing: Linux handed out each page only when dd touched it for the first time. This is demand paging.',
        },
        {
          id: 'demand',
          title: 'How many pages did dd touch?',
          mode: 'report',
          learn: [
            'Each minor page fault gave dd one fresh page of 4096 bytes. The difference between your two measurements is the number of pages that filling the buffer needed.',
            'An 8 MB buffer has 8 × 1024 × 1024 ÷ 4096 pages.',
          ],
          example: { code: 'bs=4M, count=0:   41 page faults\nbs=4M, count=1: 1064 page faults\ndifference: 1023 pages ≈ 4 MB ÷ 4 kB = 1024', file: 'a measurement with a 4 MB buffer' },
          task: 'Enter your two measurements from the previous step and the difference between them.',
          fields: [
            { id: 'f0', type: 'number', label: 'Minor page faults with count=0' },
            { id: 'f1', type: 'number', label: 'Minor page faults with count=1' },
            { id: 'pages', type: 'number', label: 'Difference: pages that dd touched' },
          ],
          verify: (v, ctx) => {
            const f0 = ctx.number(v.f0), f1 = ctx.number(v.f1), d = ctx.number(v.pages);
            if (f0 == null || f1 == null || d == null) return { ok: false, msg: 'Enter all three values as whole numbers.' };
            if (f0 > f1) return { ok: false, msg: 'The two measurements seem swapped: count=0 never touches the buffer, so it has far fewer page faults.' };
            if (f0 < 10 || f0 > 120) return { ok: false, msg: 'With count=0 dd needs only a few dozen pages. Run the first measurement of the previous step again and copy its number.' };
            if (f1 < 2000 || f1 > 2300) return { ok: false, msg: 'With count=1 and bs=8M dd needs a bit over 2000 pages. Run the second measurement again and copy its number.' };
            if (d === f1) return { ok: false, partial: true, msg: 'That is the second measurement. Subtract the first one: the pages that dd needs anyway.' };
            if (d === 8192) return { ok: false, msg: '8192 would be 8 MB in kB. A page has 4 kB, so 8 MB are 2048 pages. Use your measured difference.' };
            if (!near(d, f1 - f0, 1)) return { ok: false, msg: `The difference of your measurements is ${f1} − ${f0} = ${f1 - f0}.` };
            return { ok: true, save: { f0, f1 }, msg: `${f1 - f0} pages, almost exactly 8 MB ÷ 4 kB = 2048. Every page of the buffer caused one page fault on first touch, and not a single one before. Memory that is reserved but never used costs no RAM.` };
          },
          chart: saved => saved && ({ type: 'bars', title: 'Minor page faults of dd with an 8 MB buffer (your measurement)', unit: 'faults', tick: 500, digits: 0, max: Math.max(2500, saved.f1 * 1.2),
            bars: [{ label: 'count=0: buffer reserved', value: saved.f0 }, { label: 'count=1: buffer filled', value: saved.f1 }] }),
          hints: ['Copy both numbers from your output in the previous step.', 'Difference = second number − first number. It should be close to 2048.'],
          solution: 'count=0: about 40 page faults\ncount=1: about 2090 page faults\ndifference: about 2050 pages ≈ 8 MB ÷ 4 kB = 2048',
          success: 'Measurement analysed.',
        },
      ],
      quiz: [
        {
          q: 'dd reserves 8 MB but never uses the buffer (count=0). How much RAM does the buffer take?',
          options: [
            { t: 'Almost none: pages are only handed out when they are touched', correct: true, why: 'Demand paging. The page faults stayed at about 40 with count=0.' },
            { t: '8 MB, as soon as dd starts', why: 'The measurement showed no page faults for the buffer with count=0.' },
            { t: '8 MB on the disk instead', why: 'There is not even swap here. Untouched pages simply do not exist yet.' },
          ],
        },
        {
          q: 'Logical address 12300, pages of 4096 bytes. Page number and offset?',
          options: [
            { t: 'Page 3, offset 12', correct: true, why: '3 × 4096 = 12288, and 12300 − 12288 = 12.' },
            { t: 'Page 3, offset 3', why: 'The offset is the remainder of the division: 12300 − 3 × 4096.' },
            { t: 'Page 12, offset 300', why: 'Pages are 4096 bytes, not 1000.' },
          ],
        },
        {
          review: 'Review from chapter 2',
          q: 'Which part of a memory map line tells you whether a region may be executed?',
          options: [
            { t: 'The permissions, for example r-xp', correct: true, why: 'x means execute. Program code is r-x, the stack rw-.' },
            { t: 'The end address', why: 'Addresses say where a region is, not what may be done with it.' },
            { t: 'The name in square brackets', why: '[stack] and [heap] are names; the rights are in the permission column.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 4
    {
      id: 'oom',
      title: 'When RAM runs out',
      minutes: 12,
      goal: 'Measure what a program really keeps in RAM, and see what Linux does when RAM is full.',
      steps: [
        {
          id: 'rss',
          title: 'What is really in RAM?',
          setup: CACHE8,
          learn: [
            'Two sizes describe the memory of a process: **VSZ**, all virtual memory it has reserved, and **RSS** (resident set size), the part that really lies in RAM right now. Both are in kB.',
            '`ps -o pid,vsz,rss,comm` lists them for all processes. For one process, `/proc/PID/status` shows them as **VmSize** and **VmRSS**.',
          ],
          example: { cmd: 'ps -o pid,vsz,rss,comm | head -n 3', out: 'PID   VSZ  RSS  COMMAND\n    1 1596  920 init\n    2    0    0 kthreadd', note: 'Kernel threads like kthreadd have no user memory at all. Your numbers may differ slightly.', volatile: 'numbers' },
          task: 'The waveform viewer has just loaded its data: the program `cache` is running. How many **kB** of it are really in RAM? Print just the number.',
          check: { output: 'number', expect: "awk '/VmRSS/ {print $2}' /proc/$(pidof cache)/status" },
          diagnose: [
            { when: { stdout: /VmSize|VSZ/ }, msg: 'VSZ or VmSize is the reserved virtual memory. The task asks for what is really in RAM: RSS, or VmRSS.' },
            { when: { stdout: /VmRSS/ }, msg: 'Right line. Print only the number, for example with `awk \'/VmRSS/ {print $2}\'`.' },
            { when: { stdout: /cache/ }, msg: 'You found the process. Print only its RSS, the number in kB.' },
          ],
          hints: ['`pidof cache` prints the PID of the program.', "`awk '/VmRSS/ {print $2}' /proc/$(pidof cache)/status`"],
          solution: "awk '/VmRSS/ {print $2}' /proc/$(pidof cache)/status",
          success: 'About 9 MB: the 8 MB of waveforms plus the program itself. A quarter of this small server for one viewer. Check `free -m` now: the used memory went up by the same amount.',
        },
        {
          id: 'kill',
          title: 'Fill the RAM',
          setup: STOP + "; dmesg | grep -c 'Killed process' > /tmp/oom.before",
          learn: [
            'This server has no swap. When a program asks for more memory than is free, Linux cannot move pages to the disk. The **OOM killer** (out of memory) then stops one process to save the rest: usually the one that uses the most memory.',
            'The shell reports this with the message **Killed**.',
          ],
          example: { cmd: 'cache 2 1', out: 'cache: 2 MB of waveforms loaded', note: '2 MB fit easily. The program keeps them for 1 second, then ends.' },
          task: 'A colleague wants the viewer to keep **30 MB** of waveforms in memory. Start `cache 30` (in the foreground, without `&`) and watch what happens.',
          check: { state: "b=$(cat /tmp/oom.before 2>/dev/null); if [ $(dmesg | grep -c 'Killed process') -gt ${b:-0} ]; then echo OK; else echo ALIVE; fi" },
          reasons: { ALIVE: 'Linux did not stop any program yet. Run `cache 30` without `&` and without a smaller number.' },
          diagnose: [
            { when: { command: /&/ }, msg: 'With `&` the shell does not wait, so you cannot see what happens. Run `cache 30` in the foreground.' },
            { when: { stdout: /loaded/ }, msg: 'That amount fit into RAM. Ask for 30 MB: `cache 30`.' },
          ],
          timeoutMsg: 'The cache fit into RAM and kept its data, so the page stopped it after 10 seconds. Ask for 30 MB: `cache 30`.',
          hints: ['Just type `cache 30`.', 'Wait for the result. The message Killed is the expected outcome here.'],
          solution: 'cache 30',
          success: 'Killed. The kernel stopped the cache before the server ran out of memory, and the rest kept running: your shell still works. On a server with swap the system would have become very slow first.',
        },
        {
          id: 'dmesg',
          title: 'Read the kernel’s report',
          setup: STOP + "; dmesg | grep -q 'Out of memory' || (cache 30 >/dev/null 2>&1) 2>/dev/null; true",
          learn: [
            'The kernel writes its own messages into a ring buffer, the **kernel log**. `dmesg` prints it, from the start of the system to now.',
            'When the OOM killer acts, the kernel explains which process it stopped and how much memory that process used.',
          ],
          example: { cmd: "dmesg | grep 'Memory:'", out: 'Memory: 33360K/48760K available (5331K kernel code, 696K rwdata, 1120K rodata, 6616K init, 292K bss, 15400K reserved, 0K cma-reserved, 0K highmem)', note: 'At boot the kernel reported how much memory it found.' },
          task: 'Print the line of the kernel log that says which process was killed because of **Out of memory**.',
          check: { output: 'lines', expect: "dmesg | grep 'Out of memory'" },
          diagnose: [
            { when: { stdoutLines: 0, status: 1 }, msg: 'grep found nothing. Upper and lower case matter: search for `Out of memory`.' },
            { when: { stdout: /oom-kill|constraint/ }, msg: 'Close. Show only the summary line that starts with Out of memory.' },
          ],
          hints: ['`dmesg` prints the whole log. Add a filter.', "`dmesg | grep 'Out of memory'`"],
          solution: "dmesg | grep 'Out of memory'",
          success: 'The kernel names the process (cache), its user id 1000 (student) and its memory: anon-rss is the memory it had filled with data. Administrators look for exactly this line when a program suddenly disappears.',
        },
      ],
      quiz: [
        {
          q: 'Why did Linux kill the cache instead of moving pages to the disk?',
          options: [
            { t: 'This server has no swap space', correct: true, why: 'Chapter 1: SwapTotal is 0. Without a pantry, everything must fit on the counter.' },
            { t: 'The cache program had a bug', why: 'It only asked for more memory than there was.' },
            { t: 'Students may never use more than 8 MB', why: 'No such limit is set here. The RAM simply ran out.' },
          ],
        },
        {
          q: 'A program has VSZ 9424 kB and RSS 9112 kB. What does RSS tell you?',
          options: [
            { t: 'How much of its memory really lies in RAM right now', correct: true, why: 'RSS is the resident part. Reserved but untouched pages count only in VSZ.' },
            { t: 'How much it has reserved in total', why: 'That is VSZ, the virtual size.' },
            { t: 'How much is in swap', why: 'There is no swap here, and swapped pages are not resident.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'A program reserves 100 MB but touches only 1 MB. About how many page faults does that cause?',
          options: [
            { t: 'About 256, one per touched page of 4 kB', correct: true, why: '1 MB ÷ 4 kB = 256. Untouched pages cause no fault and take no RAM.' },
            { t: 'About 25600, one per reserved page', why: 'Pages that are never touched are never handed out.' },
            { t: 'None, reserving is enough', why: 'Each first touch of a page causes one minor page fault.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      id: 'replace',
      title: 'Which page has to go?',
      minutes: 10,
      goal: 'Count page faults for FIFO and LRU by hand, and find out whether more frames always help.',
      steps: [
        {
          id: 'fifo3',
          title: 'FIFO with 3 frames',
          mode: 'report',
          learn: [
            'A process has only a few frames. When a page is needed that is not in RAM, that is a **miss** (page fault). If all frames are full, one page has to go.',
            '**FIFO** evicts the page that came in first, like a conveyor belt. All frames are empty at the start.',
          ],
          example: { code: 'requests 1 2 1 3, 2 frames, FIFO\n1: miss [1]\n2: miss [1 2]\n1: hit\n3: miss, 1 came first → [2 3]\n3 misses', file: 'a short example' },
          task: `Requests: **${REFTEXT}**, with **3 frames** and FIFO. How many misses? Which pages are in RAM at the end?`,
          fields: [
            { id: 'misses', type: 'number', label: 'Number of misses' },
            { id: 'end', type: 'choice', multi: true, label: 'Pages in RAM at the end', options: PAGE_CHOICES },
          ],
          verify: (v, ctx) => {
            const m = ctx.number(v.misses), end = [].concat(v.end || []).map(Number).sort((a, b) => a - b);
            if (m == null) return { ok: false, msg: 'Enter the number of misses as a whole number.' };
            if (m === REFS.length) return { ok: false, msg: 'Not every request is a miss: look at the 1 and the 2 right after the 4. Are they still in RAM?' };
            if (m < 5) return { ok: false, msg: 'The first time each of the five pages is needed, it is a miss. So there are at least 5.' };
            if (m !== FIFO3.misses) return { ok: false, msg: 'Not quite. Write down the three frames after each request and mark every miss.' };
            if (end.join() !== FIFO3.end.join()) return { ok: false, partial: true, msg: `${m} misses is right. Check the frames once more: which pages did the last evictions leave?` };
            return { ok: true, save: { misses: m }, msg: `${FIFO3.misses} misses, and at the end pages ${FIFO3.end.join(', ')} are in RAM.` };
          },
          hints: ['Write a table: request, frames after it, hit or miss.', 'After 1 2 3 4 the frames hold 2 3 4: the 1 came first and had to go.'],
          solution: '1 2 3: miss miss miss  [1 2 3]\n4: miss, evict 1  [2 3 4]\n1: miss, evict 2  [3 4 1]\n2: miss, evict 3  [4 1 2]\n5: miss, evict 4  [1 2 5]\n1 2: hit hit\n3: miss, evict 1  [2 5 3]\n4: miss, evict 2  [5 3 4]\n5: hit\n→ 9 misses, pages 3 4 5 at the end',
          success: 'FIFO counted.',
        },
        {
          id: 'fifo4',
          title: 'Buy more RAM?',
          mode: 'report',
          learn: [
            'More frames should mean fewer misses: more pages fit into RAM at once. With FIFO this is not always true.',
            'Count again with the same requests, but with **4 frames**. Take your time: the result surprised researchers in 1969.',
          ],
          example: { code: 'requests 1 2 1 3, 3 frames, FIFO\n1: miss  2: miss  1: hit  3: miss\n3 misses (with 2 frames also 3)', file: 'a short example' },
          task: `Same requests (**${REFTEXT}**), FIFO, but now with **4 frames**. How many misses?`,
          fields: [{ id: 'misses', type: 'number', label: 'Number of misses with 4 frames' }],
          verify: (v, ctx) => {
            const m = ctx.number(v.misses);
            if (m == null) return { ok: false, msg: 'Enter the number of misses as a whole number.' };
            if (m === FIFO3.misses) return { ok: false, msg: 'That is the result for 3 frames. Count again with 4 frames: after 1 2 3 4 all four pages fit.' };
            if (m < FIFO3.misses) return { ok: false, msg: 'Fewer misses would be what everyone expects. Count carefully: what does page 5 evict, and what happens to 1, 2, 3 and 4 after that?' };
            if (m !== FIFO4.misses) return { ok: false, msg: 'Not quite. Write down the four frames after each request and mark every miss.' };
            return { ok: true, save: { misses: m }, msg: `${FIFO4.misses} misses with 4 frames, one more than with 3. This is **Belady’s anomaly**: with FIFO, more RAM can make things worse, because FIFO ignores which pages are really in use.` };
          },
          chart: () => missChart(),
          hints: ['1 2 3 4: four misses, then 1 and 2 are hits.', '5 evicts 1 (it came first). Then 1 evicts 2, 2 evicts 3, 3 evicts 4, 4 evicts 5, 5 evicts 1.'],
          solution: '1 2 3 4: miss ×4  [1 2 3 4]\n1 2: hit hit\n5: miss, evict 1  [2 3 4 5]\n1: miss, evict 2\n2: miss, evict 3\n3: miss, evict 4\n4: miss, evict 5\n5: miss, evict 1\n→ 10 misses (3 frames: 9)',
          success: 'Belady’s anomaly found.',
        },
        {
          id: 'lru4',
          title: 'LRU with 4 frames',
          mode: 'report',
          learn: [
            '**LRU** (least recently used) evicts the page that has not been used for the longest time. A hit counts as a use, so pages that are needed often stay.',
            'With LRU, more frames never cause more misses. Real operating systems approximate LRU, because exact bookkeeping on every access would be too slow.',
          ],
          example: { code: 'requests 1 2 1 3, 2 frames, LRU\n1: miss [1]\n2: miss [1 2]\n1: hit (1 used again)\n3: miss, 2 unused longest → [1 3]\n3 misses', file: 'a short example' },
          task: `Same requests (**${REFTEXT}**), but with **LRU** and **4 frames**. How many misses?`,
          fields: [{ id: 'misses', type: 'number', label: 'Number of misses with LRU, 4 frames' }],
          verify: (v, ctx) => {
            const m = ctx.number(v.misses);
            if (m == null) return { ok: false, msg: 'Enter the number of misses as a whole number.' };
            if (m === FIFO4.misses) return { ok: false, msg: 'That is the FIFO result. With LRU a hit counts as a use: after 1 2 hits, page 3 is the least recently used.' };
            if (m !== LRU4.misses) return { ok: false, msg: 'Not quite. After each request, note which page was used longest ago: that one goes on the next miss.' };
            return { ok: true, save: { misses: m }, msg: `${LRU4.misses} misses: fewer than FIFO with 4 frames (${FIFO4.misses}). LRU keeps the pages that are really in use.` };
          },
          chart: () => missChart([{ label: 'LRU, 4 frames', value: LRU4.misses }]),
          hints: ['1 2 3 4: four misses. 1 2: hits, so 3 is now used longest ago.', '5 evicts 3. Later 3 evicts 4, 4 evicts 5, 5 evicts 1.'],
          solution: '1 2 3 4: miss ×4\n1 2: hit hit (order of use: 3 4 1 2)\n5: miss, evict 3\n1 2: hit hit\n3: miss, evict 4\n4: miss, evict 5\n5: miss, evict 1\n→ 8 misses',
          success: 'LRU counted.',
        },
      ],
      quiz: [
        {
          q: 'What is Belady’s anomaly?',
          options: [
            { t: 'With FIFO, more frames can lead to more page faults', correct: true, why: 'You saw it: 9 misses with 3 frames, 10 with 4.' },
            { t: 'With LRU, more frames always lead to more page faults', why: 'The opposite: LRU never gets worse with more frames.' },
            { t: 'Page faults only happen when the disk is full', why: 'A page fault means: the page is not in RAM. The disk has nothing to do with it.' },
          ],
        },
        {
          q: 'Why do operating systems not use exact LRU?',
          options: [
            { t: 'They would have to record the time of every single memory access', correct: true, why: 'Too slow. Clock and similar algorithms approximate LRU with one bit per page.' },
            { t: 'LRU needs to know the future', why: 'That is OPT. LRU only looks at the past.' },
            { t: 'LRU only works with 3 frames', why: 'LRU works with any number of frames.' },
          ],
        },
        {
          review: 'Review from chapter 4',
          q: 'A server without swap runs out of RAM. What happens?',
          options: [
            { t: 'The OOM killer stops a process, usually the largest', correct: true, why: 'As with your cache of 30 MB: Killed, and the kernel log explains why.' },
            { t: 'Linux evicts pages with FIFO to the disk', why: 'Without swap there is no place on the disk for these pages.' },
            { t: 'The whole server shuts down', why: 'The rest kept running, your shell too.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      id: 'inodes',
      title: 'Names, inodes and links',
      minutes: 13,
      goal: 'See that a file name only points to an inode, and use hard and symbolic links.',
      steps: [
        {
          id: 'twins',
          title: 'Two names, one file',
          setup: WARD + '; cd ~/ward/notes; cp handover.txt draft.txt; echo "bed-03: discharged" > discharge.txt; ln handover.txt for-doctors.txt; cd ~/ward',
          start: '~/ward',
          learn: [
            'A file system keeps everything about a file, except its name, in an **inode**: owner, size, times, and where the data blocks are. A folder is a list of names, each pointing to an inode number.',
            '`ls -i` prints the inode number in front of each name.',
          ],
          example: { cmd: 'ls -i ~/docs ~/logs', out: '/home/student/docs:\n    465 handover.txt\n\n/home/student/logs:\n    463 ward.log', note: 'Inode numbers differ on your screen. Each name has its own inode here.', volatile: 'numbers' },
          task: 'In `~/ward/notes`, two names point to the **same** inode. Print that inode number.',
          check: { output: 'number', expect: "ls -i ~/ward/notes | awk '{print $1}' | sort | uniq -d" },
          diagnose: [
            { when: { stdoutLines: 4 }, msg: 'That is the whole list. Look for the number that appears twice; `sort | uniq -d` prints only repeated lines.' },
            { when: { stdout: /handover|draft|discharge|doctors/ }, msg: 'Print only the inode number, without the names.' },
          ],
          hints: ['`ls -i notes` shows the numbers. Which one appears twice?', "`ls -i notes | awk '{print $1}' | sort | uniq -d`"],
          solution: "ls -i notes | awk '{print $1}' | sort | uniq -d",
          success: 'handover.txt and for-doctors.txt share one inode: they are the same file with two names, a **hard link**. draft.txt looks identical, but it is a copy with its own inode.',
        },
        {
          id: 'hardlink',
          title: 'Create a hard link',
          setup: WARD,
          learn: [
            '`ln FILE NEWNAME` adds a second name for an existing file: a **hard link**. Both names point to the same inode, so a change through one name is visible through the other.',
            '`ls -l` shows in its second column how many names an inode has.',
          ],
          example: { afterSetup: true, cmd: 'ls -l ~/ward/notes', out: 'total 4\n-rw-r--r--    1 student  student        266 Nov  5 15:20 handover.txt', note: 'The 1 in the second column: this inode has one name so far. Date and time differ on your screen.', volatile: true },
          task: 'The doctors read their notes in `~/ward/shared`. Give the handover a second name there, `~/ward/shared/today.txt`, as a **hard link** (not a copy).',
          check: { state: "a=~/ward/notes/handover.txt; b=~/ward/shared/today.txt; if [ ! -e $b ]; then echo MISSING; elif [ -L $b ]; then echo SYMLINK; elif [ ! -e $a ]; then echo NO_ORIGINAL; elif [ \"$(ls -i $a | awk '{print $1}')\" = \"$(ls -i $b | awk '{print $1}')\" ]; then echo OK; else echo COPY; fi" },
          reasons: {
            MISSING: 'There is no `~/ward/shared/today.txt` yet. Use `ln ~/ward/notes/handover.txt ~/ward/shared/today.txt`.',
            SYMLINK: 'That is a symbolic link (`ln -s`), a pointer to the name. The task asks for a hard link: `ln` without `-s`. Reset exercise, then try again.',
            COPY: 'today.txt has its own inode: it is a copy. Create a hard link with `ln` instead of `cp`. Reset exercise, then try again.',
            NO_ORIGINAL: 'The original name `~/ward/notes/handover.txt` is gone. Click Reset exercise, then only add the second name.',
          },
          hints: ['`ln OLDNAME NEWNAME`', '`ln ~/ward/notes/handover.txt ~/ward/shared/today.txt`'],
          solution: 'ln ~/ward/notes/handover.txt ~/ward/shared/today.txt',
          success: 'Run `ls -li ~/ward/notes ~/ward/shared`: the same inode number, and the link count is now 2. No data was copied, only a name was added to a folder.',
        },
        {
          id: 'remove',
          title: 'Delete a name',
          setup: WARD + '; ln ~/ward/notes/handover.txt ~/ward/shared/today.txt; ln -s ~/ward/notes/handover.txt ~/ward/shared/latest.txt',
          learn: [
            '`rm` removes a **name**. The file itself is only deleted when its inode has no name left.',
            'A **symbolic link** (`ln -s`) is different: it stores the path to another name. If that name disappears, the link points to nothing. `ls -l` shows a symbolic link with an arrow `->`.',
          ],
          example: { afterSetup: true, cmd: 'ls -l ~/ward/shared', out: 'total 4\nlrwxrwxrwx    1 student  student         37 Nov  5 15:22 latest.txt -> /home/student/ward/notes/handover.txt\n-rw-r--r--    2 student  student        266 Nov  5 15:22 today.txt', note: 'latest.txt is a symbolic link (l, with an arrow). today.txt is a hard link: its inode has 2 names. Date and time differ on your screen.', volatile: true },
          task: 'Remove the original name `~/ward/notes/handover.txt`. Then print the handover through the name in `~/ward/shared` that **still works**.',
          check: { output: 'lines', expect: 'cat ~/docs/handover.txt' },
          mustUse: [{ re: /\brm\b/, msg: 'The content is right, but the original name still exists. Remove `~/ward/notes/handover.txt` first, then print the file.' }],
          diagnose: [
            { when: { command: /latest/, stderr: /No such file/ }, msg: 'latest.txt is a symbolic link: it pointed to the name you just removed. Try the hard link today.txt.' },
          ],
          hints: ['`rm ~/ward/notes/handover.txt`', 'Then `cat ~/ward/shared/today.txt`: the hard link still has the data.'],
          solution: 'rm ~/ward/notes/handover.txt\ncat ~/ward/shared/today.txt',
          success: 'The handover is still there: the inode had two names, and you removed one. latest.txt now points to nothing. This is why `rm` is called unlink inside the system.',
        },
      ],
      quiz: [
        {
          q: 'Where does a Linux file system store the name of a file?',
          options: [
            { t: 'In the folder, which maps the name to an inode number', correct: true, why: 'That is why one inode can have several names: hard links.' },
            { t: 'In the inode, together with size and owner', why: 'The inode holds everything except the name.' },
            { t: 'In the first data block of the file', why: 'Data blocks hold only the content.' },
          ],
        },
        {
          q: 'A file has two hard links. You delete one name with `rm`. What happens to the data?',
          options: [
            { t: 'It stays, because the inode still has one name', correct: true, why: 'The data is only freed when the last name is gone.' },
            { t: 'It is deleted, and the other name shows an empty file', why: 'Both names are equal: none of them is the “real” one.' },
            { t: 'The other name turns into a symbolic link', why: 'A hard link stays a hard link.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'Memory and files both use fixed units. Which pair belongs together?',
          options: [
            { t: 'Page table (memory) and inode (files): both say where the pieces are', correct: true, why: 'Both translate a name or address into the places where the data really lies.' },
            { t: 'Page fault (memory) and hard link (files)', why: 'A hard link is a second name, not a missing piece.' },
            { t: 'Swap (memory) and folder (files)', why: 'Swap is disk space for pages; a folder is a list of names.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 7
    {
      id: 'disk',
      title: 'Blocks, file systems and the 04:10 mystery',
      minutes: 13,
      goal: 'See whole blocks and file systems in RAM, then solve why the log could not be written.',
      steps: [
        {
          id: 'blocks',
          title: 'Whole blocks',
          setup: 'rm -rf ~/ward; mkdir -p ~/ward; printf ok > ~/ward/flag.txt',
          learn: [
            'A file system stores data in **blocks**, here 4 kB each. A file always occupies whole blocks, even if it is much smaller: the rest of the last block is wasted (internal fragmentation).',
            '`ls -l` shows the **size** of the content in bytes, `du -k` the **space** it occupies on disk in kB.',
          ],
          example: { cmd: 'ls -l ~/docs/handover.txt\ndu -k ~/docs/handover.txt', out: '-r--r--r--    1 root     root           266 Nov  5 15:20 /home/student/docs/handover.txt\n4\t/home/student/docs/handover.txt', note: '266 bytes of text occupy one whole block of 4 kB. Date and time differ on your screen.', volatile: true },
          task: 'The file `~/ward/flag.txt` contains just two letters. How many **kB** does it occupy on disk? Print just the number.',
          check: { output: 'number', expect: 'du -k ~/ward/flag.txt | cut -f1' },
          diagnose: [
            { when: { number: 2 }, msg: 'That is the size of the content in bytes. The task asks for the space on disk: `du -k`.' },
            { when: { command: /\bls\b/ }, msg: '`ls -l` shows the size of the content. The task asks for the space on disk: `du -k`.' },
          ],
          hints: ['`du -k ~/ward/flag.txt` shows the space and the name.', '`du -k ~/ward/flag.txt | cut -f1`'],
          solution: 'du -k ~/ward/flag.txt | cut -f1',
          success: '4 kB for 2 bytes: one whole block. Thousands of tiny files waste a lot of space, and as you will see in a moment, they use up something else as well.',
        },
        {
          id: 'tmpfs',
          title: 'A file system in RAM',
          learn: [
            'Several file systems can be mounted into one folder tree. `df -T` lists them with their **type** and size; `mount` shows how each one is attached.',
            'A file system of type **tmpfs** keeps its files in RAM, not on a disk: very fast, and gone after a restart, like everything else in RAM.',
          ],
          example: { cmd: 'df -T /dev', out: 'Filesystem           Type       1K-blocks      Used Available Use% Mounted on\ndevtmpfs             devtmpfs       16680         0     16680   0% /dev', note: '/dev holds device files; its type is devtmpfs.' },
          task: 'Which **type** of file system is mounted at `/tmp`? Print it.',
          check: { output: 'names', expect: "df -T /tmp | awk 'NR == 2 {print $2}'" },
          diagnose: [{ when: { stdout: /^\/tmp$|^Filesystem/ }, msg: 'Look at the column Type in the line for /tmp.' }],
          mustUse: [{ re: /-T|mount/, msg: 'Right by chance: without `-T`, df shows the name of the source, which here happens to be tmpfs too. Run `df -T` and look at the column Type.' }],
          hints: ['Use the example with another folder.', '`df -T /tmp`'],
          solution: 'df -T /tmp',
          success: 'tmpfs: files in /tmp live in RAM. Memory and files meet again: write a large file to /tmp, and `free` shows less free memory.',
        },
        {
          id: 'full',
          title: 'No space left on device',
          setup: FLOOD,
          learn: [
            'Every file needs one **inode**, and a file system has only a fixed number of them. This home folder has room for 4170, as `mount | head -n 1` shows (nr_inodes). When they are used up, no new file can be created, even with free space.',
            '`ls FOLDER | wc -l` counts the names in a folder.',
          ],
          example: { cmd: 'tail -n 2 ~/logs/ward.log', out: '2026-11-05 04:10 server warning: No space left on device\n2026-11-05 05:30 bed-06 heart_rate=72 ok', note: 'The warning from last night. The old log is still there, but the logger could not start a new file.' },
          task: 'The uploader in `~/spool` has left thousands of empty temporary files behind. Find and delete them (keep the recordings in `~/spool/outbox`), then create the new log file `~/ward/today.log` with the line `log writable again`.',
          check: { state: "if [ $(ls ~/spool/outbox 2>/dev/null | wc -l) != 2 ]; then echo OUTBOX; elif [ $(ls ~/spool/upload-tmp 2>/dev/null | wc -l) -gt 100 ]; then echo FULL; elif [ ! -f ~/ward/today.log ]; then echo NO_LOG; elif [ \"$(cat ~/ward/today.log)\" = 'log writable again' ]; then echo OK; else echo TEXT; fi" },
          reasons: {
            FULL: 'The empty files are still there. Count the names in each folder of `~/spool` with `ls FOLDER | wc -l`, then remove the one with thousands of files, for example `rm -r ~/spool/upload-tmp`.',
            OUTBOX: 'The night recordings in `~/spool/outbox` are gone. Click Reset exercise, and delete only the folder with the empty files.',
            NO_LOG: 'The inodes are free again, but `~/ward/today.log` does not exist yet. Create it: `echo \'log writable again\' > ~/ward/today.log`.',
            TEXT: '`~/ward/today.log` exists, but its content is not exactly `log writable again`. Write it again with `>`.',
          },
          diagnose: [{ when: { stderr: /No space left on device/ }, msg: 'No space left on device: no inode is free. Find the folder with thousands of files in `~/spool` and remove it first.' }],
          hints: ['`ls ~/spool/outbox | wc -l` and `ls ~/spool/upload-tmp | wc -l`: which folder is the problem?', '`rm -r ~/spool/upload-tmp`, then `echo \'log writable again\' > ~/ward/today.log`'],
          solution: "ls ~/spool/upload-tmp | wc -l\nrm -r ~/spool/upload-tmp\necho 'log writable again' > ~/ward/today.log",
          success: 'Solved. At 04:10 the disk had free space but no free inode, so the logger could not create its new file. `df -i` shows the inodes on a normal Linux. Monitoring both space and inodes prevents nights like this one.',
        },
      ],
      quiz: [
        {
          q: 'df shows plenty of free space, yet creating a file fails with No space left on device. Most likely cause?',
          options: [
            { t: 'All inodes are used, for example by many tiny files', correct: true, why: 'Every file needs an inode, and their number is fixed when the file system is created.' },
            { t: 'The RAM is full', why: 'That would end in the OOM killer, not in this message from the file system.' },
            { t: 'The file name is too long', why: 'That has its own error message: File name too long.' },
          ],
        },
        {
          q: 'A file has 5 bytes of content, the block size is 4 kB. How much disk space does it take?',
          options: [
            { t: '4 kB, one whole block', correct: true, why: 'Files occupy whole blocks: internal fragmentation, as with the last page of a process.' },
            { t: '5 bytes', why: 'That is the size of the content, as `ls -l` shows it.' },
            { t: 'Nothing, small files are kept in RAM only', why: 'Only file systems like tmpfs live in RAM, and they also count in pages.' },
          ],
        },
        {
          review: 'Review from chapter 6',
          q: 'You delete `notes/handover.txt`. A hard link `shared/today.txt` and a symbolic link `shared/latest.txt` pointed to it. Which still works?',
          options: [
            { t: 'Only today.txt', correct: true, why: 'The hard link points to the inode, the symbolic link to the deleted name.' },
            { t: 'Only latest.txt', why: 'A symbolic link stores the path, and that path no longer exists.' },
            { t: 'Both', why: 'The symbolic link lost its target.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 8
    {
      id: 'challenge',
      title: 'Mini challenge: the server report',
      minutes: 6,
      goal: 'Collect the key facts of this server in one report, with less help.',
      steps: [
        {
          id: 'report',
          title: 'Write the server report',
          setup: 'rm -rf ~/spool ~/reports; ' + STOP,
          learn: [
            'The team lead wants four facts in a small report. Each line has the form `key=value`, without spaces.',
            'You found every value in this practical: the RAM in MB, the swap space in kB, the page size in bytes, and the maximum number of inodes of the home file system.',
          ],
          example: { cmd: 'echo host=$(hostname)', out: 'host=pulsebridge', note: '`$( )` puts the output of a command into a line. You may also type the values by hand.' },
          task: 'Create `~/reports/server.txt` with exactly these four keys, one per line: `ram_mb`, `swap_kb`, `page_size`, `max_inodes`.',
          check: { state: "f=~/reports/server.txt; ram=$(free -m | awk '/^Mem/ {print $2}'); swap=$(awk '/SwapTotal/ {print $2}' /proc/meminfo); page=$(/usr/bin/time -v true 2>&1 | awk '/Page size/ {print $4}'); ino=$(mount | sed -n 's/.*nr_inodes=\\([0-9]*\\).*/\\1/p' | head -n 1); if [ ! -f $f ]; then echo MISSING; elif ! grep -qx \"ram_mb=$ram\" $f; then echo RAM; elif ! grep -qx \"swap_kb=$swap\" $f; then echo SWAP; elif ! grep -qx \"page_size=$page\" $f; then echo PAGE; elif ! grep -qx \"max_inodes=$ino\" $f; then echo INODES; elif [ $(grep -c '' $f) != 4 ]; then echo EXTRA; else echo OK; fi" },
          reasons: {
            MISSING: 'There is no `~/reports/server.txt` yet. Create the folder with `mkdir -p ~/reports`, then write the lines with `echo ... >` and `>>`.',
            RAM: 'The line `ram_mb=…` is missing or wrong. Chapter 1: total RAM in MB, from `free -m`.',
            SWAP: 'The line `swap_kb=…` is missing or wrong. Chapter 1: SwapTotal in `/proc/meminfo`.',
            PAGE: 'The line `page_size=…` is missing or wrong. Chapter 3: `/usr/bin/time -v` prints the page size in bytes.',
            INODES: 'The line `max_inodes=…` is missing or wrong. Chapter 7: `mount | head -n 1` shows nr_inodes.',
            EXTRA: 'All four values are right, but the file has more than four lines. Keep only the four `key=value` lines.',
          },
          hints: ['Start with `mkdir -p ~/reports`, then `echo ram_mb=39 > ~/reports/server.txt`.', 'Add the other three lines with `>>`. Check the result with `cat ~/reports/server.txt`.'],
          solution: "mkdir -p ~/reports\necho ram_mb=$(free -m | awk '/^Mem/ {print $2}') > ~/reports/server.txt\necho swap_kb=$(awk '/SwapTotal/ {print $2}' /proc/meminfo) >> ~/reports/server.txt\necho page_size=4096 >> ~/reports/server.txt\necho max_inodes=4170 >> ~/reports/server.txt",
          success: 'Report complete. Four numbers describe the limits of this server: how much fits into RAM, whether there is a pantry, the unit the MMU works with, and how many files fit on the disk.',
        },
      ],
      quiz: [
        {
          q: 'Why is a server with little RAM and no swap risky for a waveform viewer?',
          options: [
            { t: 'A large cache can make the OOM killer stop the viewer', correct: true, why: 'Exactly what happened last night at bed-02.' },
            { t: 'The viewer runs slower but never stops', why: 'Without swap there is no slow path: the process is killed.' },
            { t: 'The disk fills up with waveforms', why: 'The cache lives in RAM, not on the disk.' },
          ],
        },
        {
          review: 'Review from chapter 5',
          q: 'Which page replacement strategy suffers from Belady’s anomaly?',
          options: [
            { t: 'FIFO', correct: true, why: '9 misses with 3 frames, 10 with 4.' },
            { t: 'LRU', why: 'LRU never gets worse with more frames.' },
            { t: 'Both', why: 'Only FIFO. LRU went down from 10 to 8 misses in our example.' },
          ],
        },
      ],
    },
  ],

  summary: [
    ['free -m', 'total, used and free RAM and swap in MB'],
    ['grep Swap /proc/meminfo', 'read values straight from the kernel'],
    ['cat /proc/self/maps', 'the address space of a process, one region per line'],
    ['echo $(( A / B )) $(( A % B ))', 'page number and offset'],
    ['/usr/bin/time -v COMMAND', 'page faults, maximum RSS and page size of a command'],
    ['ps -o pid,vsz,rss,comm', 'virtual size and resident size of every process'],
    ['dmesg', 'the kernel log, for example the OOM killer'],
    ['ls -i, ln, ln -s', 'inode numbers, hard links, symbolic links'],
    ['du -k, df -T, mount', 'space on disk, file systems and their types'],
  ],

  done: {
    lead: 'You looked inside the address space of a process, translated an address, watched Linux load pages on demand, caused an out-of-memory kill, counted page faults by hand, and solved a full file system that still had free space.',
    columns: ['Command', 'What it does'],
    recap: [
      'Every process sees its own **virtual address space**. The MMU translates page by page; the offset stays the same.',
      'Linux hands out pages on **demand**: reserved memory costs nothing until it is touched. **RSS** is what really lies in RAM.',
      'Without **swap**, a full RAM ends with the **OOM killer**. FIFO can get worse with more frames (**Belady**), LRU cannot.',
      'A name points to an **inode**. Hard links are extra names for the same inode, symbolic links store a path.',
      'Files occupy whole **blocks**, and every file needs an inode: a file system can be full without being out of space.',
    ],
  },
};
})();
