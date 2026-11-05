/*
 * Test cases for every exercise of Practical 04, shared by test_learning.cjs and
 * test_course_browser.cjs.
 *
 * Shell steps (browser Linux): wrong commands with the expected feedback, alternative correct
 * commands. Every case starts from the step's setup (Reset exercise), so no undo is needed.
 * Report steps: answers as { fieldId: value }; verify() recomputes every expected value.
 */
const DD = n => `/usr/bin/time -v dd if=/dev/zero of=/dev/null bs=8M count=${n} 2>&1`;
module.exports = {
  saved: {},

  // ---------------------------------------------------------------- shell steps
  'ram/free': {
    wrong: [['free -m', /whole table/], ["free | awk '/^Mem/ {print $2}'", /in kB/]],
    alts: ["free -m | grep Mem | awk '{print $2}'", "awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo"],
  },
  'ram/swap': {
    wrong: [['grep SwapTotal /proc/meminfo', /Only one line/], ['grep swap /proc/meminfo', /capital S/], ['grep MemTotal /proc/meminfo', /instead of MemTotal/]],
    alts: ['grep ^Swap /proc/meminfo', 'cat /proc/meminfo | grep Swap'],
  },
  'space/maps': {
    wrong: [['grep stack /proc/self/maps', /does not exist or is empty/], ['cat /proc/self/maps > ~/mem/stack.txt', /more than one line/],
      ['head -n 1 /proc/self/maps > ~/mem/stack.txt', /not the stack line/], ['cat /proc/1/maps', /another user/]],
    alts: ["awk '/stack/' /proc/self/maps > ~/mem/stack.txt", 'cd ~/mem && grep "\\[stack\\]" /proc/self/maps > stack.txt'],
  },
  'space/pages': {
    wrong: [['echo $(( 0xbfbdd000 - 0xbfbbc000 ))', /in bytes/], ['echo 132', /in kB/], ['cat ~/mem/stack.txt', /not what the task asks/]],
    alts: ['l=$(cat ~/mem/stack.txt); s=${l%%-*}; e=${l#*-}; e=${e%% *}; echo $(( (0x$e - 0x$s) / 4096 ))', 'echo 33'],
  },
  'paging/split': {
    wrong: [['echo $(( 30000 / 4096 ))', /offset as well/], ['echo $(( 30000 % 4096 ))', /page number as well/], ["awk 'BEGIN {print 30000 / 4096}'", /whole number/]],
    alts: ['echo $((30000/4096))\necho $((30000%4096))', "awk 'BEGIN {print int(30000 / 4096), 30000 % 4096}'"],
  },
  'paging/faults': {
    wrong: [[DD(1), /whole report/], [DD(1) + ' | grep Minor', /One measurement/],
      ['/usr/bin/time -v dd if=/dev/zero of=/dev/null bs=8M count=0 | grep Minor', /2>&1/]],
    alts: [`for c in 0 1; do ${DD('$c')} | grep -i minor; done`,
      `${DD(0)} | grep Minor | awk '{print $NF}'; ${DD(1)} | grep Minor | awk '{print $NF}'`],
  },
  'oom/rss': {
    wrong: [['grep VmSize /proc/$(pidof cache)/status', /virtual memory/], ['grep VmRSS /proc/$(pidof cache)/status', /Right line/],
      ['ps -o pid,rss,comm | grep cache', /You found the process/]],
    alts: ['ps -o rss,comm | grep cache', "grep VmRSS /proc/$(pidof cache)/status | awk '{print $2}'"],
  },
  'oom/kill': {
    wrong: [['cache 30 &', /foreground/], ['cache 4 1', /fit into RAM/], ['cache 12', /fit into RAM and kept its data/]],
    alts: ['cache 40', 'cache 30; dmesg | tail -n 1'],
  },
  'oom/dmesg': {
    wrong: [["dmesg | grep 'out of memory'", /Upper and lower case/], ['dmesg | grep -i kill', /summary line/]],
    alts: ["dmesg | grep 'Killed process'", "dmesg | grep '^Out of memory'"],
  },
  'inodes/twins': {
    wrong: [['ls -i notes', /whole list/], ['ls -i notes | sort | uniq -d', /printed nothing/]],
    alts: ["ls -i ~/ward/notes | awk '{print $1}' | sort | uniq -d", "ls -i notes | sort -n | awk '$1 == last {print $1} {last = $1}'"],
  },
  'inodes/hardlink': {
    wrong: [['cp ~/ward/notes/handover.txt ~/ward/shared/today.txt', /it is a copy/], ['ln -s ~/ward/notes/handover.txt ~/ward/shared/today.txt', /symbolic link/],
      ['ls ~/ward', /no `?~\/ward\/shared\/today\.txt`? yet/], ['mv ~/ward/notes/handover.txt ~/ward/shared/today.txt', /original name/]],
    alts: ['cd ~/ward && ln notes/handover.txt shared/today.txt', 'ln /home/student/ward/notes/handover.txt /home/student/ward/shared/today.txt'],
  },
  'inodes/remove': {
    wrong: [['rm ~/ward/notes/handover.txt\ncat ~/ward/shared/latest.txt', /symbolic link/], ['cat ~/ward/shared/today.txt', /original name still exists/]],
    alts: ['rm ~/ward/notes/handover.txt; cat ~/ward/shared/today.txt', 'cd ~/ward && rm notes/handover.txt && cat shared/today.txt'],
  },
  'disk/blocks': {
    wrong: [['ls -l ~/ward/flag.txt', /ls -l`? shows the size/], ['wc -c < ~/ward/flag.txt', /size of the content/]],
    alts: ["du -k ~/ward/flag.txt | awk '{print $1}'", 'du -k ~/ward/flag.txt', 'cd ~/ward; du -k flag.txt | cut -f1'],
  },
  'disk/tmpfs': {
    wrong: [['df /tmp', /column Type/], ['echo /tmp', /column Type/]],
    alts: ['mount | grep /tmp', "df -T /tmp | awk 'NR == 2 {print $2}'"],
  },
  'disk/full': {
    wrong: [["echo 'log writable again' > ~/ward/today.log", /No space left on device: no inode/], ['rm -r ~/spool', /recordings/],
      ['rm -r ~/spool/upload-tmp', /does not exist yet/], ["rm -r ~/spool/upload-tmp; echo 'log writable' > ~/ward/today.log", /not exactly/]],
    alts: ["rm -rf /home/student/spool/upload-tmp\necho 'log writable again' > ~/ward/today.log",
      "cd ~/spool && rm -r upload-tmp && printf 'log writable again\\n' > ~/ward/today.log"],
  },
  'challenge/report': {
    wrong: [['mkdir -p ~/reports; echo ram_mb=39 > ~/reports/server.txt', /swap_kb/], ['mkdir -p ~/reports; echo ram_mb=39976 > ~/reports/server.txt', /ram_mb/],
      ['ls', /no `?~\/reports\/server\.txt`? yet/],
      ['mkdir -p ~/reports; printf "ram_mb=39\\nswap_kb=0\\npage_size=4\\nmax_inodes=4170\\n" > ~/reports/server.txt', /page_size/],
      ['mkdir -p ~/reports; printf "ram_mb=39\\nswap_kb=0\\npage_size=4096\\nmax_inodes=3700\\n" > ~/reports/server.txt', /max_inodes/],
      ['mkdir -p ~/reports; printf "server report\\nram_mb=39\\nswap_kb=0\\npage_size=4096\\nmax_inodes=4170\\n" > ~/reports/server.txt', /more than four lines/]],
    alts: ['mkdir -p ~/reports; printf "ram_mb=39\\nswap_kb=0\\npage_size=4096\\nmax_inodes=4170\\n" > ~/reports/server.txt',
      "mkdir -p ~/reports; cd ~/reports; echo max_inodes=$(mount | head -n 1 | sed 's/.*nr_inodes=\\([0-9]*\\).*/\\1/') > server.txt; echo page_size=4096 >> server.txt; echo swap_kb=0 >> server.txt; echo ram_mb=39 >> server.txt"],
  },

  // ---------------------------------------------------------------- report steps
  'paging/translate': {
    wrong: [[{ phys: '30000' }, /logical address/], [{ phys: '8192' }, /Add the offset/], [{ phys: '46384' }, /wrong row/], [{ phys: '2656' }, /Multiply/], [{ phys: '9000' }, /Not quite/], [{ phys: 'x' }, /whole number/]],
    alts: [{ phys: ' 9520 ' }],
    model: { phys: '9520' },
  },
  'paging/demand': {
    wrong: [
      [{ f0: '2088', f1: '40', pages: '2048' }, /swapped/],
      [{ f0: '40', f1: '2088', pages: '2088' }, /second measurement/],
      [{ f0: '40', f1: '2088', pages: '8192' }, /8192/],
      [{ f0: '40', f1: '2088', pages: '2000' }, /2088 − 40 = 2048/],
      [{ f0: '40', f1: '500', pages: '460' }, /count=1/],
      [{ f0: '400', f1: '2088', pages: '1688' }, /count=0/],
    ],
    alts: [{ f0: '39', f1: '2090', pages: '2051' }, { f0: '41', f1: '2087', pages: '2047' }],
    model: { f0: '40', f1: '2088', pages: '2048' },
  },
  'replace/fifo3': {
    wrong: [
      [{ misses: '12', end: ['3', '4', '5'] }, /Not every request/],
      [{ misses: '4', end: [] }, /at least 5/],
      [{ misses: '10', end: ['3', '4', '5'] }, /Not quite/],
      [{ misses: '9', end: ['1', '2', '5'] }, /9 misses is right/],
    ],
    alts: [{ misses: '9 ', end: ['5', '4', '3'] }],
    model: { misses: '9', end: ['3', '4', '5'] },
  },
  'replace/fifo4': {
    wrong: [[{ misses: '9' }, /result for 3 frames/], [{ misses: '8' }, /Fewer misses/], [{ misses: '11' }, /Not quite/]],
    alts: [{ misses: ' 10' }],
    model: { misses: '10' },
  },
  'replace/lru4': {
    wrong: [[{ misses: '10' }, /FIFO result/], [{ misses: '7' }, /Not quite/]],
    alts: [{ misses: '8.0' }],
    model: { misses: '8' },
  },
};
