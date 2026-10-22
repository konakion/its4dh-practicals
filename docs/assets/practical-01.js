/*
 * Content for Practical 01 · Linux terminal fundamentals.
 *
 * The course engine (course-app.js) renders this object. To build another
 * practical, copy this file, change the content and point index.md at it.
 *
 * Text fields support `code` and **bold**. Every example output below was
 * produced by the real browser Linux; scripts/test_course_browser.cjs runs each
 * example again and fails if an output no longer matches.
 *
 * Exercise checks never compare the typed command with a fixed string:
 *  - check.output + check.expect: the student's stdout is compared with the
 *    stdout of the `expect` command, which runs in the same Linux right after
 *    the student's command. Modes: lines (exact lines), number (one count,
 *    optionally followed by a file name), names (all expected words must appear),
 *    lineset (same lines in any order, spacing ignored).
 *  - check.state: a shell probe that inspects files or the current folder and
 *    prints OK or a reason code; `reasons` maps codes to feedback.
 *  - mustUse (optional): a secondary requirement for exercises whose learning
 *    goal is a particular technique, checked only after the result is correct.
 *  - diagnose (optional): targeted feedback for typical mistakes.
 */
window.PRACTICAL = {
  id: 'its4dh-p01',
  course: 'IT Systems for Digital Health Experts',
  title: 'Linux terminal fundamentals',
  number: 'Practical 01',
  minutes: 90,
  home: '/home/student',
  user: 'student',
  host: 'pulsebridge',
  files: [
    { path: 'data/upload_small.log', url: 'fixtures/upload_small.log', readOnly: true },
    { path: 'data/upload.log', url: 'fixtures/upload.log', readOnly: true },
    { path: 'config/platform.conf', url: 'fixtures/platform.conf' },
    { path: 'notes/welcome.txt', url: 'fixtures/welcome.txt' },
  ],

  intro: {
    lead: 'PulseBridge is a Digital Health platform that collects measurements from patients’ wristbands. This morning, some wristbands could not upload their data. You are the new junior system administrator, and your job is to find out what happened.',
    steps: [
      ['Read', 'a short explanation and one example.'],
      ['Try', 'your own command in a real Linux system that runs inside this page.'],
      ['Check', 'the result. You get feedback straight away and can retry as often as you like.'],
    ],
    note: 'Nothing to install. Your progress is saved in this browser only. All data is synthetic: no real patients are involved.',
  },

  chapters: [
    // ---------------------------------------------------------------- 1
    {
      id: 'terminal',
      title: 'Meet the terminal',
      minutes: 10,
      goal: 'Run your first commands and find out where you are.',
      steps: [
        {
          id: 'first-command',
          title: 'Your first command',
          learn: [
            'A terminal lets you talk to a computer by typing instead of clicking. You type a command, run it, and the **shell** (the program that reads your commands) prints the answer.',
            'Servers that receive data from wearables usually have no screen or mouse, so administrators work exactly like this. The text before your cursor is the **prompt**. It shows who you are, which computer you are on and where you are.',
          ],
          example: { cmd: 'whoami', out: 'student', note: '`whoami` prints the name of the user you are logged in as.' },
          task: 'Every computer on a network has a name. Ask this server for its name with the command `hostname`, then compare the answer with the prompt.',
          check: { output: 'lines', expect: 'hostname' },
          hints: ['Type `hostname` in the terminal and press Run (or the Enter key).'],
          solution: 'hostname',
          success: 'The server is called pulsebridge, the same name you see in the prompt after the @ sign.',
        },
        {
          id: 'pwd',
          title: 'Where am I?',
          learn: [
            'Files on Linux live in folders, which Linux calls **directories**. Folders sit inside other folders, like rooms inside a hospital building. At every moment the shell is standing in one folder, the **working directory**.',
            '`pwd` (print working directory) prints its full address, called a **path**. The folders in a path are separated by `/`. You can also write several commands, one per line: they run in order.',
          ],
          example: { start: '~/notes', cmd: 'pwd', out: '/home/student/notes', note: 'Here the shell is standing in the notes folder, which lies inside student, which lies inside home.' },
          task: 'A colleague asks who is logged in and where you are. Print your **user name** and then your **current folder**, with two commands on two lines.',
          check: { output: 'lines', expect: 'whoami; pwd' },
          diagnose: [
            { when: { stdoutLines: 1 }, msg: 'Only one line of output. Use Shift+Enter to start a second line in the editor, and write the second command there.' },
            { when: { stdout: /^\/home/ }, msg: 'Close: the order is the other way round. User name first, then the folder.' },
          ],
          hints: ['You met the command for the user name in the example of the previous step.', 'Write it on the first line, press Shift+Enter, then write `pwd`.'],
          solution: 'whoami\npwd',
          success: 'You are the user student, standing in /home/student, your home folder. In the prompt it appears as the shortcut ~.',
        },
        {
          id: 'ls',
          title: 'Look around with ls',
          learn: [
            '`ls` (list) shows what is inside a folder. On its own it lists the folder you are standing in.',
            'Write a folder name after `ls`, separated by a space, and it lists that folder instead. This extra word is called an **argument**: it tells the command what to work on.',
          ],
          example: { cmd: 'ls', out: 'config\ndata\nnotes', note: 'Your home folder contains three folders.' },
          task: 'Your team lead left you a message in the **notes** folder. List the contents of notes to find out what the file is called.',
          check: { output: 'names', expect: 'ls ~/notes' },
          diagnose: [
            { when: { stdout: /^config\s+data\s+notes/ }, msg: 'That is the list of your current folder. Add the folder you want to look into as an argument after `ls`.' },
          ],
          hints: ['Write `ls`, a space and the name of the folder.'],
          solution: 'ls notes',
          success: 'The message is in welcome.txt. You will read it in chapter 3.',
        },
        {
          id: 'ls-l',
          title: 'Options change how a command works',
          learn: [
            'Most commands accept **options** that change their behaviour. Options start with a dash and usually come before the argument.',
            '`ls -l` shows a long list with one file per line: permissions, owner, size in bytes, date and name. Administrators use it to check, for example, whether a log file is still growing.',
          ],
          example: { cmd: 'ls -l notes', out: 'total 4\n-rw-r--r--    1 student  student        496 Oct 22 08:32 welcome.txt', note: 'The size of welcome.txt is 496 bytes. The date and time on your screen will differ.', volatile: true },
          task: 'How big is the full upload log? Show the long list of the **data** folder and find the size of upload.log.',
          check: { output: 'names', expect: 'echo upload.log upload_small.log; wc -c < ~/data/upload.log' },
          diagnose: [
            { when: { command: /-[a-z]*h/ }, msg: 'The option `-h` rounds sizes (for example 35.9K). For this task, show the exact size in bytes without `-h`.' },
            { when: { stdout: /welcome\.txt/ }, msg: 'That is the notes folder. Which folder holds the logs?' },
          ],
          hints: ['Combine the option from the example with the folder name `data`.'],
          solution: 'ls -l data',
          success: 'upload.log is 36800 bytes and upload_small.log only 288. The owner of both files is root, not you. You will see why that matters in chapter 3.',
        },
      ],
      quiz: [
        {
          q: 'What does the prompt `student@pulsebridge:~$` tell you?',
          options: [
            { t: 'Who you are, which computer you are on and in which folder you are', correct: true, why: 'student is the user, pulsebridge the computer and ~ the current folder (your home folder).' },
            { t: 'That the previous command was successful', why: 'The prompt appears after every command, whether it worked or not.' },
            { t: 'The name of the command you are about to run', why: 'The prompt is printed by the shell before you type anything.' },
          ],
        },
        {
          q: 'You want to see the files inside the folder data. Which command does that?',
          options: [
            { t: '`ls data`', correct: true, why: 'ls lists a folder; data is the argument that says which folder.' },
            { t: '`pwd data`', why: 'pwd only prints where you are. It does not list anything.' },
            { t: '`ls -l`', why: 'Without an argument, ls lists the current folder, not data.' },
            { t: '`data ls`', why: 'The command always comes first, then its arguments.' },
          ],
        },
        {
          q: 'Which statements about `ls -l notes` are true? Select all that apply.',
          multi: true,
          options: [
            { t: '`-l` is an option', correct: true, why: 'It starts with a dash and changes how ls displays the result.' },
            { t: '`notes` is an argument', correct: true, why: 'It tells ls which folder to list.' },
            { t: 'It shows the size of each file', correct: true, why: 'The long format includes the size in bytes.' },
            { t: 'It moves you into the notes folder', why: 'Listing a folder never changes where you are. That is the job of cd, coming next.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 2
    {
      id: 'navigate',
      title: 'Navigate the filesystem',
      minutes: 12,
      goal: 'Move between folders with relative and absolute paths.',
      steps: [
        {
          id: 'cd',
          title: 'Change folder with cd',
          start: '~',
          learn: [
            '`cd` (change directory) moves the shell into another folder, like walking from the corridor into a room. Write the folder name after `cd`.',
            'When it works, `cd` prints nothing, but the prompt changes and shows your new location. Moving around never changes any file, so you can explore without worry.',
          ],
          example: { cmd: 'cd notes\npwd', out: '/home/student/notes', note: 'After `cd notes`, pwd confirms the new location.' },
          task: 'Move your shell into the **data** folder, where the upload logs are.',
          check: { state: '[ "$(pwd)" = "$HOME/data" ] && echo OK || echo WRONG_DIR' },
          reasons: { WRONG_DIR: 'Your shell is now in {cwd}, not in the data folder. Check the prompt, then try again.' },
          hints: ['Use `cd` followed by the folder name.'],
          solution: 'cd data',
          success: 'Look at the prompt: it now ends in ~/data.',
        },
        {
          id: 'dotdot',
          title: 'Two dots mean one level up',
          start: '~/data',
          learn: [
            'Two dots `..` always mean the folder one level up, the parent folder. `cd ..` takes you one step back towards the entrance.',
            'You can also use `..` inside a longer path. `../notes` means: go up one level, then into notes. This lets you reach a neighbouring folder without walking back first.',
          ],
          example: { start: '~/notes', cmd: 'cd ..\npwd', out: '/home/student', note: 'From notes, one level up is your home folder.' },
          task: 'You are in the data folder. Without leaving it, list the contents of the neighbouring **config** folder.',
          check: { output: 'names', expect: 'ls ~/config' },
          mustUse: [{ re: /\.\./, msg: 'Correct result. This exercise is about `..`, though: try to reach config from data with a path that starts with `..`.' }],
          diagnose: [
            { when: { stdout: /upload\.log/ }, msg: 'That is the data folder itself. Go up with `..` and then into config.' },
            { when: { stderr: /config: No such file/ }, msg: 'There is no config folder inside data. config is a neighbour of data, so first go one level up.' },
          ],
          hints: ['From data, `..` is your home folder. Where is config from there?', 'The path you need starts with `../`.'],
          solution: 'ls ../config',
          success: 'The config folder contains platform.conf, the settings of the upload server.',
        },
        {
          id: 'tilde',
          title: 'Home sweet home: ~',
          start: '/usr/share',
          learn: [
            'Your home folder is your personal space on the server, here `/home/student`. The tilde `~` is a shortcut for it.',
            'So `~/data` always means the data folder in your home, no matter where you are standing. `cd` on its own also takes you straight home, which helps when you are lost.',
          ],
          example: { start: '/etc', cmd: 'ls ~/notes', out: 'welcome.txt', note: 'This works even though the shell is standing in the system folder /etc.' },
          task: 'You are deep inside the system folder /usr/share. Jump directly into your **config** folder with a single `cd` command.',
          check: { state: '[ "$(pwd)" = "$HOME/config" ] && echo OK || echo WRONG_DIR' },
          reasons: { WRONG_DIR: 'Your shell is in {cwd}, not in your config folder.' },
          diagnose: [
            { when: { stderr: /No such file/ }, msg: 'There is no config folder in /usr/share. Start the path at your home folder with the ~ shortcut.' },
          ],
          hints: ['Start the path with `~/`.'],
          solution: 'cd ~/config',
          success: 'With ~ you can reach your own folders from anywhere on the system.',
        },
        {
          id: 'absolute',
          title: 'Absolute and relative paths',
          start: '/tmp',
          learn: [
            'A path that starts with `/` is **absolute**. It begins at the very top of the filesystem, the root, and works from anywhere.',
            'A path without a leading `/` is **relative**: it starts where you are now. `data/upload.log` only works from your home folder, while `/home/student/data/upload.log` works everywhere.',
          ],
          example: { start: '/tmp', cmd: 'ls /home', out: 'student', note: 'The folder /home contains the home folders of all users. Here there is only one.' },
          task: 'You are in /tmp. Move into your **notes** folder using an absolute path, one that starts with `/`.',
          check: { state: '[ "$(pwd)" = "$HOME/notes" ] && echo OK || echo WRONG_DIR' },
          reasons: { WRONG_DIR: 'Your shell is in {cwd}, not in /home/student/notes.' },
          mustUse: [{ re: /\/home\/student\/notes/, msg: 'You reached the notes folder, but with a shortcut. Write the full absolute path, starting with /home.' }],
          hints: ['The example shows where your home folder lives. Continue the path from there.'],
          solution: 'cd /home/student/notes',
          success: 'An absolute path is like a full postal address: it works no matter where you start.',
        },
      ],
      quiz: [
        {
          q: 'You are in `/home/student/data` and run `cd ..`. Where are you now?',
          options: [
            { t: '`/home/student`', correct: true, why: '.. is the parent folder, one level up.' },
            { t: '`/`', why: 'cd .. goes up only one level, not straight to the root.' },
            { t: '`/home/student/data/..`', why: 'The shell resolves .. and shows the real folder name.' },
            { t: 'Still in data, cd .. only lists the parent', why: 'cd always changes your location. Listing is the job of ls.' },
          ],
        },
        {
          q: 'Which of these paths are absolute? Select all that apply.',
          multi: true,
          options: [
            { t: '`/home/student/notes`', correct: true, why: 'It starts with /, at the root of the filesystem.' },
            { t: '`/etc`', correct: true, why: 'Short, but it starts with / and therefore at the root.' },
            { t: '`../config`', why: 'It starts from where you are now, so it is relative.' },
            { t: '`notes/welcome.txt`', why: 'No leading /, so it is relative to the current folder.' },
          ],
        },
        {
          review: 'Review from chapter 1',
          q: 'After `cd data`, which command confirms where you are?',
          options: [
            { t: '`pwd`', correct: true, why: 'pwd prints the path of the working directory.' },
            { t: '`whoami`', why: 'whoami prints your user name, not your location.' },
            { t: '`hostname`', why: 'hostname prints the name of the computer.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 3
    {
      id: 'files',
      title: 'Create and manage files',
      minutes: 17,
      goal: 'Read, create, copy, rename and delete files safely.',
      steps: [
        {
          id: 'cat',
          title: 'Read a file with cat',
          start: '~',
          learn: [
            '`cat` prints the whole content of a text file into the terminal. It is the quickest way to read short files such as notes or configuration files.',
            'For long files the text simply scrolls past. In chapter 4 you will meet tools that show only part of a file.',
          ],
          example: { cmd: 'cat config/platform.conf', out: 'endpoint=storage.internal\nport=5432\nretry_limit=3', note: 'The configuration of the upload server: where it stores data and how often it retries.' },
          task: 'Read the message from your team lead. It is in the notes folder.',
          check: { output: 'lines', expect: 'cat ~/notes/welcome.txt' },
          diagnose: [
            { when: { stderr: /Is a directory/ }, msg: '`notes` is a folder, and cat reads files. Add the file name after the folder: notes/ and then the name you found in chapter 1.' },
          ],
          hints: ['You found the file name with ls in chapter 1. The path is the folder, a slash and the file name.'],
          solution: 'cat notes/welcome.txt',
          success: 'Now you know your mission. Lena wants a report, so you need a place to keep it.',
        },
        {
          id: 'mkdir',
          title: 'Create a folder with mkdir',
          start: '~',
          setup: 'rmdir ~/reports 2>/dev/null; true',
          learn: [
            '`mkdir` (make directory) creates a new, empty folder. Keeping your own results in a separate folder protects the original evidence and makes your work easy to find.',
            'Avoid spaces in folder names. The shell would read them as two separate names.',
          ],
          example: { cmd: 'mkdir practice\nls', out: 'config\ndata\nnotes\npractice' },
          task: 'Create a folder called **reports** in your home folder. You will collect all your results there.',
          check: { state: '[ -d ~/reports ] && echo OK || echo MISSING' },
          reasons: { MISSING: 'There is no folder ~/reports yet. Check the spelling: reports, all lowercase.' },
          hints: ['Write `mkdir`, a space and the new folder name.'],
          solution: 'mkdir reports',
          success: 'Your reports folder is ready. Run `ls` if you want to see it.',
        },
        {
          id: 'touch',
          title: 'Create an empty file with touch',
          start: '~',
          setup: 'mkdir -p ~/reports; [ -s ~/reports/incident.txt ] || rm -f ~/reports/incident.txt',
          learn: [
            '`touch` creates an empty file if it does not exist yet. Administrators use it to prepare a file they will fill later.',
            'Like most commands, touch also accepts a path. That way you can create a file inside another folder while you stay where you are.',
          ],
          example: { cmd: 'touch shopping.txt\nls', out: 'config\ndata\nnotes\nshopping.txt' },
          task: 'Create an empty file named **incident.txt** inside your reports folder.',
          check: { state: 'if [ -f ~/reports/incident.txt ]; then echo OK; elif [ -e ~/incident.txt ]; then echo WRONG_PLACE; else echo MISSING; fi' },
          reasons: {
            WRONG_PLACE: 'incident.txt was created in your home folder, not in reports. Give touch a path that starts with the folder name.',
            MISSING: 'There is no file reports/incident.txt yet.',
          },
          hints: ['The path is the folder name, a slash and the file name.'],
          solution: 'touch reports/incident.txt',
          success: 'The file exists now, still empty. Check with `ls -l reports`: its size is 0.',
        },
        {
          id: 'cp',
          title: 'Copy with cp',
          start: '~',
          setup: 'mkdir -p ~/reports',
          learn: [
            '`cp` (copy) duplicates a file. Write the source first and the destination second.',
            'If the destination is an existing folder, the copy keeps its name and lands inside that folder. Working on a copy means you can experiment freely while the original stays untouched.',
          ],
          example: { cmd: 'cp notes/welcome.txt welcome-copy.txt\nls', out: 'config\ndata\nnotes\nwelcome-copy.txt', note: 'Here the destination is a new file name, so the copy gets that name.' },
          task: 'Copy the sample log **data/upload_small.log** into your reports folder.',
          check: { state: 'for f in ~/reports/*; do cmp -s "$f" ~/data/upload_small.log && echo OK && exit; done; echo MISSING' },
          reasons: { MISSING: 'There is no copy of upload_small.log in ~/reports yet.' },
          diagnose: [
            { when: { stderr: /No such file/ }, msg: 'One of the paths does not exist from where you are. Your prompt shows your location; the log is in data, the target folder is reports.' },
          ],
          hints: ['Source first: the path of the log. Destination second: the folder.'],
          solution: 'cp data/upload_small.log reports/',
          success: 'You now have your own copy to work with. The original in data stays untouched.',
        },
        {
          id: 'mv',
          title: 'Move and rename with mv',
          start: '~',
          setup: 'mkdir -p ~/reports; [ -e ~/reports/incident-2026-10-19.txt ] || touch ~/reports/incident.txt',
          learn: [
            '`mv` (move) moves a file to another place. If you keep it in the same folder and only give it a new name, mv renames it.',
            'Unlike cp, no copy stays behind at the old location. The order is the same as for cp: source first, destination second.',
          ],
          example: { cmd: 'touch draft.txt\nmv draft.txt final.txt\nls', out: 'config\ndata\nfinal.txt\nnotes' },
          task: 'Reports need a date. Rename **reports/incident.txt** to **reports/incident-2026-10-19.txt**.',
          check: { state: 'n=~/reports/incident-2026-10-19.txt; o=~/reports/incident.txt; if [ -e "$n" ] && [ -e "$o" ]; then echo BOTH; elif [ -e "$n" ]; then echo OK; else echo MISSING; fi' },
          reasons: {
            BOTH: 'The new file exists, but so does the old one. That happens with cp. Use mv, or remove the old file.',
            MISSING: 'There is no reports/incident-2026-10-19.txt yet. Check the spelling of the new name and remember the folder in both paths.',
          },
          hints: ['Both the old and the new name need the folder in front: reports/...'],
          solution: 'mv reports/incident.txt reports/incident-2026-10-19.txt',
          success: 'Renamed. In Linux, renaming is just moving a file to a new name.',
        },
        {
          id: 'rm',
          title: 'Delete with rm',
          start: '~',
          setup: 'mkdir -p ~/reports; [ -e ~/reports/upload_small.log ] || cp ~/data/upload_small.log ~/reports/; ls ~/reports/incident* >/dev/null 2>&1 || touch ~/reports/incident-2026-10-19.txt',
          learn: [
            '`rm` (remove) deletes a file. There is no recycle bin: a removed file is gone for good.',
            'That is why careful administrators look before they delete, for example with ls, and never remove original evidence. In this course the data folder is protected: Linux refuses to delete anything in it.',
          ],
          example: { cmd: 'touch old.txt\nrm old.txt\nls', out: 'config\ndata\nnotes', note: 'old.txt is gone; rm prints nothing when it works.' },
          task: 'You no longer need the copied sample log. Delete **reports/upload_small.log** and keep everything else.',
          check: { state: 'if [ -e ~/reports/upload_small.log ]; then echo STILL; elif ls ~/reports/incident* >/dev/null 2>&1; then echo OK; else echo TOO_MUCH; fi' },
          reasons: {
            STILL: 'reports/upload_small.log is still there.',
            TOO_MUCH: 'The copy is gone, but so is your incident file. Click Reset exercise to restore it and try again with a single file name.',
          },
          diagnose: [
            { when: { stderr: /Permission denied/ }, msg: 'Linux refused: the data folder is protected evidence. You only need to delete the copy in reports.' },
          ],
          hints: ['Run `ls reports` first to see what is there. Then remove exactly one file.'],
          solution: 'rm reports/upload_small.log',
          success: 'Clean. Run `ls reports` to check that your incident file is still there.',
        },
      ],
      quiz: [
        {
          q: 'What is the difference between `cp a.txt b.txt` and `mv a.txt b.txt`?',
          options: [
            { t: 'After cp both files exist; after mv only b.txt exists', correct: true, why: 'cp duplicates, mv moves or renames.' },
            { t: 'cp works on files, mv only on folders', why: 'Both commands work on files and on folders.' },
            { t: 'There is no difference', why: 'The original remains with cp but not with mv.' },
          ],
        },
        {
          q: 'What happens when you run `rm reports/notes.txt`?',
          options: [
            { t: 'The file is deleted permanently', correct: true, why: 'rm does not use a recycle bin.' },
            { t: 'The file is moved to the recycle bin', why: 'The terminal has no recycle bin. Deleted is deleted.' },
            { t: 'Linux always asks for confirmation first', why: 'By default rm deletes without asking.' },
          ],
        },
        {
          review: 'Review from chapter 2',
          q: 'You are in `~/reports`. Which commands print the sample log? Select all that apply.',
          multi: true,
          options: [
            { t: '`cat ../data/upload_small.log`', correct: true, why: 'Up to your home folder, then into data.' },
            { t: '`cat ~/data/upload_small.log`', correct: true, why: '~ always points to your home folder.' },
            { t: '`cat /home/student/data/upload_small.log`', correct: true, why: 'An absolute path works from anywhere.' },
            { t: '`cat data/upload_small.log`', why: 'This relative path looks for data inside reports, where it does not exist.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 4
    {
      id: 'inspect',
      title: 'Inspect files',
      minutes: 9,
      goal: 'Look at the beginning and end of long files and count their lines.',
      steps: [
        {
          id: 'head',
          title: 'The beginning of a file: head',
          start: '~',
          learn: [
            'Log files can contain thousands of lines. `head` shows only the beginning of a file, the first 10 lines by default. With `-n` and a number you choose how many lines you get.',
            'The first lines tell you what the records look like. In our logs every line has a time, a severity, a device and a message.',
          ],
          example: { cmd: 'head -n 3 data/upload_small.log', out: '09:00 INFO band-01 upload accepted\n09:01 ERROR band-02 connection refused\n09:02 INFO band-01 upload accepted' },
          task: 'Show the first **5** records of the full log **data/upload.log**.',
          check: { output: 'lines', expect: 'head -n 5 ~/data/upload.log' },
          diagnose: [
            { when: { stdoutLines: 10 }, msg: 'You see 10 lines, the default. Tell head how many lines you want with -n.' },
            { when: { stdout: /band-0[1-3] / }, msg: 'These are records from the sample. This task is about the full log, upload.log.' },
          ],
          hints: ['Change the file and the number in the example pattern.'],
          solution: 'head -n 5 data/upload.log',
          success: 'Every wristband (band-001, band-002, ...) sends an upload. At 09:00 all were accepted.',
        },
        {
          id: 'tail',
          title: 'The end of a file: tail',
          start: '~',
          learn: [
            '`tail` is the opposite of head: it shows the end of a file. New records are written at the bottom of a log, so tail is what administrators use to see the latest events.',
            'Just like head, tail accepts `-n` with a number.',
          ],
          example: { cmd: 'tail -n 2 data/upload_small.log', out: '09:06 INFO band-03 upload accepted\n09:07 ERROR band-01 connection refused' },
          task: 'What was the very last thing the upload server wrote into **data/upload.log**? Show only that one line.',
          check: { output: 'lines', expect: 'tail -n 1 ~/data/upload.log' },
          diagnose: [
            { when: { stdoutLines: 10 }, msg: 'Without -n, tail shows 10 lines. You only need one.' },
          ],
          hints: ['You need tail, the option -n with the number 1, and the file.'],
          solution: 'tail -n 1 data/upload.log',
          success: 'At 09:09 uploads were accepted again. So the problem did not last until the end of the log.',
        },
        {
          id: 'wc',
          title: 'Count lines with wc',
          start: '~',
          learn: [
            '`wc` (word count) counts lines, words and bytes. With `-l` it counts only lines.',
            'In our logs one line is one upload attempt, so `wc -l` tells you how many attempts were recorded. Note that it counts records, not patients: one wristband can appear many times.',
          ],
          example: { cmd: 'wc -l data/upload_small.log', out: '8 data/upload_small.log', note: 'The sample contains 8 records.' },
          task: 'How many upload attempts were recorded in the full log?',
          check: { output: 'number', expect: 'wc -l < ~/data/upload.log' },
          diagnose: [
            { when: { number: 8 }, msg: '8 is the size of the sample. Count the full log, upload.log.' },
          ],
          hints: ['Use the example on the other log file.'],
          solution: 'wc -l data/upload.log',
          success: '1000 attempts between 09:00 and 09:09, from 100 wristbands.',
        },
      ],
      quiz: [
        {
          q: 'Which command shows the 20 most recent entries of a log file?',
          options: [
            { t: '`tail -n 20 upload.log`', correct: true, why: 'New entries are at the end, and tail shows the end.' },
            { t: '`head -n 20 upload.log`', why: 'head shows the oldest entries at the beginning.' },
            { t: '`wc -l 20 upload.log`', why: 'wc counts lines; it does not show them.' },
          ],
        },
        {
          q: '`wc -l data/upload_small.log` prints `8 data/upload_small.log`. What does the 8 mean?',
          options: [
            { t: 'The file has 8 lines, here 8 upload attempts', correct: true, why: 'wc -l counts lines, and each line is one record.' },
            { t: '8 patients are affected', why: 'One device can produce many records. Records are not patients.' },
            { t: 'The file contains 8 errors', why: 'wc counts all lines, whatever they contain.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'You want to experiment with a log without risking the original. What do you do first?',
          options: [
            { t: 'Copy it with cp into your own folder', correct: true, why: 'A copy protects the original evidence.' },
            { t: 'Move it with mv into your own folder', why: 'mv removes the file from its original place.' },
            { t: 'Create an empty file with touch', why: 'touch creates an empty file, without the log content.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 5
    {
      id: 'search',
      title: 'Search wearable logs',
      minutes: 14,
      goal: 'Find and count the records that matter with grep.',
      steps: [
        {
          id: 'grep',
          title: 'Find lines with grep',
          start: '~',
          learn: [
            '`grep` searches a file and prints every line that contains a **pattern**, the text you are looking for. Instead of scrolling through thousands of lines, you ask for exactly the lines you need.',
            'grep is case-sensitive: WARN and warn are different patterns. If a pattern contains a space, put it in quotes, otherwise the shell splits it into two words.',
          ],
          example: { cmd: 'grep WARN data/upload_small.log', out: '09:03 WARN band-03 battery low' },
          task: 'Find all records containing **connection refused** in the sample log data/upload_small.log.',
          check: { output: 'lines', expect: "grep 'connection refused' ~/data/upload_small.log" },
          diagnose: [
            { when: { stderr: /refused: No such file/ }, msg: 'Without quotes the shell split your pattern: grep searched for "connection" in a file called "refused". Put the two words in quotes.' },
            { when: { status: 1, stdout: /^$/ }, msg: 'No line matched. Check spelling and letter case: the logs write connection refused in lowercase.' },
          ],
          hints: ['Pattern first, then the file.', 'The pattern contains a space, so wrap it in quotes: \'...\''],
          solution: "grep 'connection refused' data/upload_small.log",
          success: 'Three refused connections in the sample, from band-02 and band-01.',
        },
        {
          id: 'grep-c',
          title: 'Count matches with grep -c',
          start: '~',
          learn: [
            'With the option `-c`, grep does not print the matching lines but counts them.',
            'This is how you answer questions such as how many uploads failed. It is far more reliable than counting by eye, especially in a file with a thousand lines.',
          ],
          example: { cmd: 'grep -c WARN data/upload_small.log', out: '1' },
          task: 'How many **ERROR** records does the full log data/upload.log contain?',
          check: { output: 'number', expect: 'grep -c ERROR ~/data/upload.log' },
          diagnose: [
            { when: { number: 0 }, msg: 'grep found nothing. Remember that grep is case-sensitive: the logs write ERROR in capitals.' },
            { when: { number: 4 }, msg: '4 is the count for the sample. Search the full log, upload.log.' },
            { when: { stdoutLines: 100 }, msg: 'Those are the matching lines themselves. Add the option that makes grep count them.' },
          ],
          hints: ['Combine the option from the example with the pattern ERROR and the full log.'],
          solution: 'grep -c ERROR data/upload.log',
          success: '100 of 1000 upload attempts failed.',
        },
        {
          id: 'grep-device',
          title: 'Follow one wristband',
          start: '~',
          learn: [
            'A pattern does not have to be a word like ERROR. You can search for anything that appears in a line, for example a device name or a time.',
            'Searching for one device shows its whole story in order: every upload, warning and error.',
          ],
          example: { cmd: 'grep band-03 data/upload_small.log', out: '09:03 WARN band-03 battery low\n09:05 ERROR band-03 upload timeout\n09:06 INFO band-03 upload accepted' },
          task: 'Wristband **band-042** had trouble this morning. Show all of its records from the full log.',
          check: { output: 'lines', expect: 'grep band-042 ~/data/upload.log' },
          hints: ['The device name is the pattern; the full log is the file.'],
          solution: 'grep band-042 data/upload.log',
          success: 'band-042 had low battery at 09:03, a refused connection at 09:04, a retry at 09:05 and successful uploads afterwards.',
        },
        {
          id: 'grep-F',
          title: 'Exact text with grep -F',
          start: '~',
          learn: [
            'Some characters have a special meaning inside a grep pattern. The dot `.` for example means "any character", so `grep .` matches every line that is not empty.',
            'The option `-F` (fixed) switches these meanings off. grep then looks for exactly the characters you typed. Use -F whenever your pattern contains dots or other punctuation.',
          ],
          example: { cmd: 'grep -c . data/upload_small.log\ngrep -c -F . data/upload_small.log', out: '8\n0', note: 'Without -F every line matches. With -F grep finds no real dot, because the log contains none.' },
          task: 'How many lines in Lena’s message **notes/welcome.txt** contain a real full stop?',
          check: { output: 'number', expect: 'grep -c -F . ~/notes/welcome.txt' },
          diagnose: [
            { when: { number: 11 }, msg: '11 is the number of non-empty lines: the dot matched any character. Switch on fixed-text search.' },
          ],
          hints: ['Count (-c) with fixed text (-F). The pattern is a single dot.'],
          solution: 'grep -c -F . notes/welcome.txt',
          success: 'Exactly 6 lines contain a full stop. With -F grep took your dot literally.',
        },
      ],
      quiz: [
        {
          q: 'What does `grep -c ERROR file.log` print?',
          options: [
            { t: 'The number of lines that contain ERROR', correct: true, why: '-c counts matching lines.' },
            { t: 'All lines that contain ERROR', why: 'That is grep without -c.' },
            { t: 'The lines that contain ERROR, with line numbers', why: 'Line numbers come from a different option, -n.' },
          ],
        },
        {
          q: 'Why does `grep connection refused data/upload.log` (without quotes) not work as intended?',
          options: [
            { t: 'The shell splits the pattern, so grep looks for "connection" in a file named "refused"', correct: true, why: 'Spaces separate arguments. Quotes keep the two words together.' },
            { t: 'grep cannot search for two words', why: 'It can, as long as the words are in quotes.' },
            { t: 'The pattern must be in capitals', why: 'The pattern must match the case in the file, which is lowercase here.' },
          ],
        },
        {
          review: 'Review from chapter 4',
          q: 'Which commands show the beginning of upload.log? Select all that apply.',
          multi: true,
          options: [
            { t: '`head data/upload.log`', correct: true, why: 'head shows the first 10 lines by default.' },
            { t: '`head -n 3 data/upload.log`', correct: true, why: 'The first three lines.' },
            { t: '`tail -n 3 data/upload.log`', why: 'tail shows the end of the file.' },
            { t: '`wc -l data/upload.log`', why: 'wc counts lines; it does not show them.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 6
    {
      id: 'combine',
      title: 'Combine commands',
      minutes: 13,
      goal: 'Connect commands with pipes and save results in files.',
      steps: [
        {
          id: 'pipe',
          title: 'Connect commands with a pipe',
          start: '~',
          learn: [
            'The pipe `|` connects two commands. The output of the first becomes the input of the second, like a lab assembly line where each station does one job.',
            'A command after the pipe gets no file name: it works on the text flowing in. Small tools combine into answers to new questions.',
          ],
          example: { cmd: 'grep ERROR data/upload_small.log | head -n 2', out: '09:01 ERROR band-02 connection refused\n09:04 ERROR band-02 connection refused', note: 'grep finds all errors, head keeps the first two.' },
          task: 'Show only the **last 3** connection refused records in the full log data/upload.log.',
          check: { output: 'lines', expect: "grep 'connection refused' ~/data/upload.log | tail -n 3" },
          diagnose: [
            { when: { stdoutLines: 50 }, msg: 'Those are all 50 matching records. Pipe them into a command that keeps only the last ones.' },
            { when: { stderr: /refused: No such file/ }, msg: 'Put connection refused in quotes so the shell keeps the two words together.' },
          ],
          hints: ['First find the records with grep, then send them through | into the command that shows the end.'],
          solution: "grep 'connection refused' data/upload.log | tail -n 3",
          success: 'The last refused connection happened at 09:06.',
        },
        {
          id: 'redirect',
          title: 'Save output with >',
          start: '~',
          setup: 'mkdir -p ~/reports',
          learn: [
            'Normally output appears on screen. The arrow `>` redirects it into a file instead. If the file does not exist, it is created; if it exists, its content is replaced without warning.',
            'Saving results in files lets you keep evidence and share it with colleagues.',
          ],
          example: { cmd: 'grep WARN data/upload_small.log > warnings.txt\ncat warnings.txt', out: '09:03 WARN band-03 battery low', note: 'The first line prints nothing: its output went into warnings.txt.' },
          task: 'Save every **ERROR** record of the full log into the file **reports/errors.txt**.',
          check: { state: 'grep ERROR ~/data/upload.log > /tmp/expected.$$; if [ ! -f ~/reports/errors.txt ]; then echo MISSING; elif cmp -s ~/reports/errors.txt /tmp/expected.$$; then echo OK; else echo DIFFERENT; fi; rm -f /tmp/expected.$$' },
          reasons: {
            MISSING: 'There is no file reports/errors.txt yet.',
            DIFFERENT: 'reports/errors.txt exists, but it does not contain exactly the ERROR records of data/upload.log. Look inside with cat or count with wc -l, then run your command again.',
          },
          hints: ['Write the grep command that shows the errors, then add > and the file name.'],
          solution: 'grep ERROR data/upload.log > reports/errors.txt',
          success: 'The 100 error records are saved. Check with `wc -l reports/errors.txt`.',
        },
        {
          id: 'append',
          title: 'Add to a file with >>',
          start: '~',
          setup: "mkdir -p ~/reports; head -n 1 ~/reports/summary.txt 2>/dev/null | grep -qx 'Upload incident summary' || echo 'Upload incident summary' > ~/reports/summary.txt",
          learn: [
            'Two arrows `>>` also send output into a file, but they **append** it at the end instead of replacing the content. Use > to start a fresh file and >> to add to it.',
            'The command `echo` prints any text you give it, which is handy for adding labels to a report.',
          ],
          example: { cmd: 'echo "first line" > list.txt\necho "second line" >> list.txt\ncat list.txt', out: 'first line\nsecond line' },
          task: 'The file **reports/summary.txt** already has a title line. Append the **number** of connection refused records in data/upload.log to it. The title must stay.',
          check: { state: "f=~/reports/summary.txt; n=$(grep -c 'connection refused' ~/data/upload.log); if ! head -n 1 $f 2>/dev/null | grep -qx 'Upload incident summary'; then echo TITLE_GONE; elif tail -n +2 $f | grep -qw \"$n\"; then echo OK; else echo NO_COUNT; fi" },
          reasons: {
            TITLE_GONE: 'The title has disappeared: a single > replaced the whole file. Click Reset exercise to restore the title, then use >>.',
            NO_COUNT: 'The title is still there, but the file has no line with the correct count yet. Run `cat reports/summary.txt` to see what is inside.',
          },
          hints: ['grep -c gives you the number. Instead of printing it, send it to the end of the file.'],
          solution: "grep -c 'connection refused' data/upload.log >> reports/summary.txt",
          success: 'Your summary now has a title and a count. Run `cat reports/summary.txt` to read it.',
        },
      ],
      quiz: [
        {
          q: 'What is the difference between `>` and `>>`?',
          options: [
            { t: '> replaces the content of the file, >> adds to the end', correct: true, why: 'Use >> when existing content must stay.' },
            { t: '>> writes twice as much output', why: 'Both write the same output; only the treatment of existing content differs.' },
            { t: '> writes to the screen, >> to a file', why: 'Both write into a file.' },
          ],
        },
        {
          q: 'What does `grep ERROR data/upload.log | wc -l` print?',
          options: [
            { t: 'The number of ERROR records', correct: true, why: 'grep selects the error lines, wc -l counts them.' },
            { t: 'The number of lines in upload.log', why: 'wc only sees the lines that grep passes on.' },
            { t: 'All ERROR lines followed by their count', why: 'The lines go into wc, not to the screen.' },
          ],
        },
        {
          review: 'Review from chapter 5',
          q: 'How can you count the WARN records in the sample log? Select all that apply.',
          multi: true,
          options: [
            { t: '`grep -c WARN data/upload_small.log`', correct: true, why: 'grep counts the matching lines itself.' },
            { t: '`grep WARN data/upload_small.log | wc -l`', correct: true, why: 'grep selects the lines, wc -l counts them.' },
            { t: '`grep -c warn data/upload_small.log`', why: 'grep is case-sensitive; this finds 0 lines.' },
            { t: '`wc -l WARN data/upload_small.log`', why: 'wc does not search. It would look for a file called WARN.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- 7
    {
      id: 'mission',
      title: 'Final mini-challenge',
      minutes: 12,
      goal: 'Investigate the upload incident and write a short report on your own.',
      challenge: true,
      steps: [
        {
          id: 'window',
          title: 'When did the problem start and end?',
          start: '~',
          learn: [
            'Time to put everything together. Lena needs to know when the problem started and when it was over.',
            'You can write several commands in the editor, one per line. They run one after another, and their output appears in order.',
          ],
          example: { cmd: 'grep WARN data/upload.log | head -n 1', out: '09:01 WARN band-005 battery low', note: 'A reminder: the first warning of the morning.' },
          task: 'Show the **first** and the **last** ERROR record of the full log, in that order.',
          check: { output: 'lines', expect: 'grep ERROR ~/data/upload.log | head -n 1; grep ERROR ~/data/upload.log | tail -n 1' },
          diagnose: [
            { when: { stdoutLines: 1 }, msg: 'One of the two records is there. Add a second line to the editor for the other one.' },
          ],
          hints: ['You need two commands, one per line.', 'Both start with grep ERROR and a pipe. One ends with head, the other with tail.'],
          solution: 'grep ERROR data/upload.log | head -n 1\ngrep ERROR data/upload.log | tail -n 1',
          success: 'Errors occurred between 09:02 and 09:06, a window of about five minutes.',
        },
        {
          id: 'narrow',
          title: 'Narrow it down',
          start: '~',
          learn: [
            'Two kinds of errors appear in the log. To look at one kind at one moment, you can chain two greps with a pipe: the first selects a time, the second a message.',
            'Each grep in the chain makes the result smaller, like adding filters in a spreadsheet.',
          ],
          example: { cmd: "grep band-03 data/upload_small.log | grep ERROR", out: '09:05 ERROR band-03 upload timeout' },
          task: 'At **09:04**, which wristbands had an **upload timeout**? Show those records from the full log.',
          check: { output: 'lines', expect: "grep '09:04' ~/data/upload.log | grep 'upload timeout'" },
          hints: ['First grep for the time, then pipe the result into a second grep for the message.'],
          solution: "grep '09:04' data/upload.log | grep timeout",
          success: 'Ten wristbands timed out at 09:04, while ten others had their connection refused.',
        },
        {
          id: 'report',
          title: 'Write the incident report',
          start: '~',
          setup: 'mkdir -p ~/reports',
          learn: [
            'A good incident report states facts that others can check. You already know every tool you need: grep -c counts, > starts a file and >> adds to it.',
            'Labels are welcome, for example with echo, as long as each count stays on its own line.',
          ],
          example: { cmd: 'grep -c WARN data/upload.log', out: '100', note: 'A reminder: one count, ready to be redirected into a file.' },
          task: 'Create **reports/report.txt** with exactly three lines: the number of **ERROR** records, the number of **connection refused** records and the number of **upload timeout** records in data/upload.log, in this order.',
          check: { state: "f=~/reports/report.txt; d=~/data/upload.log; if [ ! -f $f ]; then echo MISSING; elif [ \"$(wc -l < $f)\" -ne 3 ]; then echo LINES; else a=$(grep -c ERROR $d); b=$(grep -c 'connection refused' $d); c=$(grep -c 'upload timeout' $d); if sed -n 1p $f | grep -qw $a && sed -n 2p $f | grep -qw $b && sed -n 3p $f | grep -qw $c; then echo OK; else echo NUMBERS; fi; fi" },
          reasons: {
            MISSING: 'There is no file reports/report.txt yet.',
            LINES: 'reports/report.txt exists but does not have exactly three lines. Start the file with > and add the other two lines with >>. Run `cat reports/report.txt` to check.',
            NUMBERS: 'The file has three lines, but at least one count is wrong or in the wrong place. Run `cat reports/report.txt` and compare.',
          },
          hints: ['Three grep -c commands, one per line. The first uses >, the next two >>.'],
          solution: "grep -c ERROR data/upload.log > reports/report.txt\ngrep -c 'connection refused' data/upload.log >> reports/report.txt\ngrep -c 'upload timeout' data/upload.log >> reports/report.txt",
          success: 'Your report is ready: 100 failed attempts, half refused connections and half timeouts, all between 09:02 and 09:06. Run `cat reports/report.txt` to admire it.',
        },
      ],
      quiz: [
        {
          q: 'The log contains 100 ERROR records. Can you conclude that 100 patients lost data?',
          options: [
            { t: 'No. Records are upload attempts, and the devices retried and uploaded successfully later', correct: true, why: 'band-042, for example, failed at 09:04 and was accepted again from 09:06. Counting records is not counting patients or lost data.' },
            { t: 'Yes, every ERROR means one patient lost data', why: 'An ERROR marks a failed attempt. Later attempts of the same device can succeed.' },
            { t: 'Yes, because there are 100 wristbands', why: 'There are 100 wristbands, but not every one of them failed, and failed attempts were retried.' },
          ],
        },
        {
          q: 'Which commands add the ERROR count as a new last line to reports/report.txt? Select all that apply.',
          multi: true,
          options: [
            { t: '`grep -c ERROR data/upload.log >> reports/report.txt`', correct: true, why: '>> appends the count.' },
            { t: '`grep ERROR data/upload.log | wc -l >> reports/report.txt`', correct: true, why: 'Counting with wc -l gives the same number, also appended.' },
            { t: '`grep -c ERROR data/upload.log > reports/report.txt`', why: '> replaces the report, so all earlier lines would be lost.' },
            { t: '`grep -c ERROR >> data/upload.log`', why: 'This tries to write into the evidence file, and grep has no file to search.' },
          ],
        },
        {
          review: 'Review from chapter 3',
          q: 'In `~/reports` you run `rm ../data/upload.log`. What happens here?',
          options: [
            { t: 'Linux refuses with "Permission denied", because the data folder is protected', correct: true, why: 'The evidence files belong to root and are read-only for you.' },
            { t: 'The log is deleted permanently', why: 'It would be on an unprotected system, which is why evidence should be protected.' },
            { t: 'Nothing, because ../data does not exist from reports', why: 'From reports, .. is your home folder, which contains data.' },
          ],
        },
      ],
    },

    // ---------------------------------------------------------------- bonus
    {
      id: 'bonus',
      title: 'Bonus: sort, uniq and cut',
      minutes: 10,
      optional: true,
      goal: 'For fast finishers: build small statistics from a log.',
      steps: [
        {
          id: 'frequency',
          title: 'Build a frequency table',
          start: '~',
          learn: [
            '`cut -d " " -f 2` keeps only the second field of each line, using the space as separator. `sort` puts lines in order, and `uniq -c` merges identical neighbouring lines and counts them.',
            'Together they turn a long log into a small table.',
          ],
          example: { cmd: 'cut -d " " -f 2 data/upload_small.log | sort | uniq -c', out: '      4 ERROR\n      3 INFO\n      1 WARN', note: 'How often each severity occurs in the sample.' },
          task: 'Which **error messages** occurred in the full log, and how often each? Take only the ERROR records, keep the message (everything from field 4 on) and count.',
          check: { output: 'lineset', expect: "grep ERROR ~/data/upload.log | cut -d ' ' -f 4- | sort | uniq -c" },
          hints: ['Start with grep ERROR, then cut. `-f 4-` means field 4 and everything after it.', 'Finish with sort and uniq -c.'],
          solution: "grep ERROR data/upload.log | cut -d ' ' -f 4- | sort | uniq -c",
          success: 'Exactly 50 refused connections and 50 timeouts.',
        },
        {
          id: 'distinct',
          title: 'Count different devices',
          start: '~',
          learn: [
            '`sort -u` sorts and keeps every different line only once. Piped into `wc -l`, it answers questions such as how many different devices appear in a log.',
          ],
          example: { cmd: 'cut -d " " -f 3 data/upload_small.log | sort -u', out: 'band-01\nband-02\nband-03' },
          task: 'How many **different wristbands** appear in the full log?',
          check: { output: 'number', expect: "cut -d ' ' -f 3 ~/data/upload.log | sort -u | wc -l" },
          diagnose: [{ when: { number: 1000 }, msg: 'That counts every record. Keep each device only once before counting.' }],
          hints: ['Extend the example: use the full log and count the lines at the end.'],
          solution: "cut -d ' ' -f 3 data/upload.log | sort -u | wc -l",
          success: '100 wristbands sent data this morning.',
        },
      ],
      quiz: [
        {
          q: 'Why is `sort` usually needed before `uniq -c`?',
          options: [
            { t: 'uniq only merges identical lines that are next to each other', correct: true, why: 'Sorting puts identical lines next to each other.' },
            { t: 'uniq only works on alphabetical text', why: 'uniq works on any lines, but only neighbours are compared.' },
            { t: 'It is not needed, sort only makes the output prettier', why: 'Without sort, the same line can be counted several times in separate groups.' },
          ],
        },
        {
          review: 'Review from chapter 6',
          q: 'In `cut -d " " -f 3 data/upload.log | sort -u | wc -l`, what does the pipe do?',
          options: [
            { t: 'It passes the output of one command as input to the next', correct: true, why: 'Each command in the chain works on the result of the previous one.' },
            { t: 'It saves the output in a file', why: 'Saving into a file is the job of > and >>.' },
            { t: 'It runs the three commands at the same time on the same file', why: 'Only cut reads the file; the others read from the pipe.' },
          ],
        },
      ],
    },
  ],

  summary: [
    ['pwd', 'print the current folder'],
    ['ls, ls -l', 'list a folder, with details'],
    ['cd, cd .., cd ~', 'change folder, go up, go home'],
    ['cat', 'print a whole file'],
    ['mkdir, touch', 'create a folder, an empty file'],
    ['cp, mv, rm', 'copy, move or rename, delete'],
    ['head, tail', 'beginning or end of a file'],
    ['wc -l', 'count lines'],
    ['grep, -c, -F', 'find lines, count them, exact text'],
    ['|', 'pass output to the next command'],
    ['>, >>', 'write output to a file, append'],
  ],
};
