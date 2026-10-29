/*
 * Test cases for every exercise of Practical 03, shared by test_learning.cjs and
 * test_course_browser.cjs.
 *
 * Shell steps (browser Linux): wrong commands with the expected feedback, alternative correct
 * commands. Every case starts from the step's setup (Reset exercise), so no undo is needed.
 * Report steps: answers as { fieldId: value }; verify() recomputes every expected value.
 */
module.exports = {
  saved: {},

  // ---------------------------------------------------------------- shell steps
  'pipes/pipeline': {
    wrong: [['grep ALARM logs/vitals.log', /whole lines/], ["grep ALARM logs/vitals.log | cut -d' ' -f2", /Five lines/]],
    alts: ["grep ALARM ~/logs/vitals.log | cut -d' ' -f2 | sort | uniq", "awk '/ALARM/ {print $2}' logs/vitals.log | sort -u"],
  },
  'pipes/fifo': {
    wrong: [["echo 'bed-07 heart_rate=142 ALARM'", /no named pipe/], ["mkfifo ~/ipc/alarms\necho 'bed-07 heart_rate=142 ALARM' > ~/ipc/alarms", /writer waited for a reader/]],
    alts: ["mkfifo ~/ipc/alarms; cat ~/ipc/alarms & echo 'bed-07 heart_rate=142 ALARM' > ~/ipc/alarms; wait",
      'cd ~/ipc && mkfifo alarms && (echo "bed-07 heart_rate=142 ALARM" > alarms &) && cat alarms'],
  },
  'sockets/send': {
    wrong: [['echo "bed-12 spo2=86 ALARM" | socat - UNIX-CONNECT:ipc/echo.sock', /echo server/],
      ['echo "bed-12 ALARM" | socat - UNIX-CONNECT:ipc/station.sock', /not exactly/], ['ls ipc', /not received anything/]],
    alts: ["echo 'bed-12 spo2=86 ALARM' | socat - UNIX-CONNECT:/home/student/ipc/station.sock", 'printf "bed-12 spo2=86 ALARM\\n" | socat - UNIX-CONNECT:$HOME/ipc/station.sock'],
  },
  'sockets/listening': {
    wrong: [['netstat -lx', /Count only the lines/], ['netstat -lx | wc -l', /not what the task asks/]],
    alts: ['netstat -l -x | grep LISTENING | wc -l', 'netstat -lx | grep -c "\\.sock$"'],
  },
  'race/lost': {
    wrong: [['admit ward-a 10\nadmit ward-b 10\ncat ~/ward/admitted', /one after another/],
      ['admit ward-a 10 &\nadmit ward-b 10 &\ncat ~/ward/admitted', /not finished yet/],
      ['admit ward-a 10 --lock & admit ward-b 10 --lock & wait; cat ~/ward/admitted', /next step/],
      ['admit ward-a 10 & admit ward-b 10 & wait', /also print the counter/]],
    alts: ['admit ward-a 10 & admit ward-b 10 & wait; cat ~/ward/admitted', 'for w in ward-a ward-b; do admit $w 10 & done; wait; cat ward/admitted'],
  },
  'race/lock': {
    wrong: [['admit ward-a 10 & admit ward-b 10 & wait; cat ~/ward/admitted', /without `?--lock|every/],
      ['admit ward-a 10\nadmit ward-b 10\ncat ~/ward/admitted', /without the lock/],
      ['admit ward-a 10 --lock &\nadmit ward-b 10 --lock &\ncat ~/ward/admitted', /not finished yet/]],
    alts: ['for w in ward-a ward-b; do admit $w 10 --lock & done; wait; cat ~/ward/admitted'],
  },
  'deadlock/stuck': {
    wrong: [['syncjob admission records alarms\nsyncjob alarm alarms records\ncat ~/ward/sync.log', /no deadlock/],
      ['syncjob admission records alarms &\nsyncjob alarm alarms records &\ncat ~/ward/sync.log', /Give them time/],
      ['syncjob admission records alarms & syncjob alarm alarms records & sleep 2', /also print/]],
    alts: ['syncjob admission records alarms & syncjob alarm alarms records & sleep 3; cat ~/ward/sync.log'],
  },
  'deadlock/order': {
    wrong: [['syncjob admission records alarms &\nsyncjob alarm records alarms &\nwait\ncat ~/ward/sync.log', /old jobs still hold/],
      ['killall syncjob\ncat ~/ward/sync.log', /Not both jobs/]],
    alts: ['killall -q syncjob; syncjob admission records alarms & syncjob alarm records alarms & wait; cat ~/ward/sync.log',
      'kill $(pidof syncjob)\nsyncjob admission records alarms &\nsyncjob alarm records alarms &\nwait\ncat ~/ward/sync.log'],
  },
  'nice/share': {
    wrong: [['crunch a 3\ncrunch b 3', /one after another/], ['crunch a 3 & nice -n 5 crunch b 3 & wait', /same priority/]],
    alts: ['crunch b 3 & crunch a 3 & wait', 'for j in a b; do crunch $j 3 & done; wait'],
  },
  'nice/nice': {
    wrong: [['kill $(pidof crunch)', /not running any more/], ['renice -n 5 -p $(pidof crunch)', /not 19 yet/], ['renice -n -5 -p $(pidof crunch)', /only make a process/]],
    alts: ['renice -n 19 $(pidof crunch)', 'renice 19 -p $(pidof crunch)'],
  },

  // ---------------------------------------------------------------- report steps
  'race/semaphore': {
    wrong: [
      [{ s3: '-1', waiting: 'D4', send: '0' }, /never goes below 0/],
      [{ s3: '1', waiting: 'D4', send: '0' }, /both devices/],
      [{ s3: '0', waiting: 'D3D4', send: '0' }, /directly to the waiting D3/],
      [{ s3: '0', waiting: 'none', send: '0' }, /What happens to D4/],
      [{ s3: '0', waiting: 'D4', send: '1' }, /D4 is still waiting/],
    ],
    alts: [{ s3: ' 0 ', waiting: 'D4', send: '0' }],
    model: { s3: '0', waiting: 'D4', send: '0' },
  },
  'schedule/fcfs': {
    wrong: [
      [{ waitA: '8', avg: '6.5' }, /finishes/],
      [{ waitA: '1', avg: '6.5' }, /L runs 0–7/],
      [{ waitA: '7', avg: '10.5' }, /turnaround/],
      [{ waitA: '7', avg: '7' }, /four start times/],
    ],
    alts: [{ waitA: '7', avg: '6,5' }, { waitA: '7.0', avg: '6.50' }],
    model: { waitA: '7', avg: '6.5' },
  },
  'schedule/sjf': {
    wrong: [
      [{ o0: 'L', o1: 'A', o2: 'D', o3: 'B', avg: '6.5' }, /Shortest first/],
      [{ o0: 'A', o1: 'B', o2: 'D', o3: 'L', avg: '3.5' }, /A first is right/],
      [{ o0: 'A', o1: 'A', o2: 'B', o3: 'L', avg: '3.5' }, /four different jobs/],
      [{ o0: 'A', o1: 'D', o2: 'B', o3: 'L', avg: '7.5' }, /finish time/],
      [{ o0: 'A', o1: 'D', o2: 'B', o3: 'L', avg: '5' }, /Start times/],
    ],
    alts: [{ o0: 'A', o1: 'D', o2: 'B', o3: 'L', avg: '3,5' }],
    model: { o0: 'A', o1: 'D', o2: 'B', o3: 'L', avg: '3.5' },
  },
  'schedule/rr': {
    wrong: [
      [{ finishL: '7', resp: '2.5' }, /cannot run 7 ms in one go/],
      [{ finishL: '15', resp: '2.5' }, /2 ms slices/],
      [{ finishL: '16', resp: '3.5' }, /first/],
      [{ finishL: '16', resp: '7' }, /first time/],
    ],
    alts: [{ finishL: '16.0', resp: '2,5' }],
    model: { finishL: '16', resp: '2.5' },
  },
  'nice/calc': {
    wrong: [
      [{ share: '32.7' }, /divided the report’s weight/],
      [{ share: '75.3' }, /share of the ward software/],
      [{ share: '0.25' }, /as a fraction/],
      [{ share: '50' }, /Half each/],
      [{ share: '20' }, /Not quite/],
    ],
    alts: [{ share: '24,65' }, { share: '24.6' }],
    model: { share: '24.7' },
  },
};
