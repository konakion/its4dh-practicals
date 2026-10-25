# About the practical lab

The **ITS4DH Practical Lab** belongs to the course **IT Systems for Digital Health Experts** (Hasso Plattner Institute, University of Potsdam). Every lecture week has one hands-on practical of about 90 minutes. Each practical follows the same pattern: a short explanation, one example, your own attempt, immediate feedback, and a quiz at the end of every chapter.

| Practical | Topic | Where you work |
|---|---|---|
| 01 | OS fundamentals: the Linux terminal | Linux in your browser |
| 02 | Processes & threads | Linux in your browser, and a GitHub Codespace for nano, vim and Python |

## How the terminal in the page works

When you open a practical, your browser starts a small x86 computer emulator, [v86](https://github.com/copy/v86), compiled to WebAssembly. It boots a real Linux kernel (6.8) with [BusyBox](https://busybox.net/) tools. Your commands are executed by the Linux shell `/bin/sh` as the user `student`, and the output you see is exactly what Linux printed.

- The Linux system has **no network connection** and **no access to your files**. It only sees the course files.
- Your files and your current folder stay between exercises until you restart Linux or reload the page.
- Commands that run longer than 10 seconds are stopped.
- Each Run starts a fresh shell. Programs you start in the background keep running after the Run; *Restart Linux with fresh files* stops all of them.
- BusyBox provides compact versions of the standard tools. Their options for these practicals behave like the full GNU tools, but a few rarely used options are missing, and interactive programs such as `less`, `nano`, `vi` or a live `top` cannot be used in the page.

## The Codespaces part (Practical 02)

Text editors and Python need a full terminal. For these chapters you open a **GitHub Codespace** of the course repository: a Linux machine in the cloud with Python 3.12, nano and vim, which runs in your browser on Windows, macOS or Linux. Your files for Practical 02 are in `labs/practical-02/work`; the original starter files stay in `labs/practical-02/starter`.

`python3 p02.py check TASK` really runs your program, measures it and looks at your code. When everything is right it prints a short **result code**, for example `P02-THREADS-2.01-QK7M`, which you paste into the page. The last four characters are a checksum, so typos are noticed, and the numbers in the code are your own measurements: the page draws its charts from them.

## How your answers are checked

Your command is never compared with a stored solution. After it has run, the page checks the **result**: the output on the screen, the files you created, or the processes that are still running, compared with what Linux itself reports. Different correct commands therefore all count as correct.

This is self-assessment for practice. Progress, measured values and quiz results are stored only in this browser (local storage). Nothing is sent to a server, and nothing is graded.

## The data

PulseBridge is fictional. All logs, readings and patients are synthetic. In Practical 01, the logs `upload_small.log` (8 records) and `upload.log` (1,000 records from 100 wristbands) describe one morning of uploads; one line is one upload attempt, not one patient. In Practical 02, the programs `monitor` and `analyse` are small shell scripts that produce random readings and CPU load; they stop by themselves after a few minutes.

## Credits and licences

| Component | Licence |
|---|---|
| v86 emulator (`libv86.js`, `v86.wasm`) by Fabian Hemmer and contributors | BSD 2-Clause |
| Linux kernel and BusyBox (Buildroot image from the v86 project) | GPL-2.0 |
| SeaBIOS and VGABIOS firmware | LGPL-3.0 |
| Atkinson Hyperlegible font, Braille Institute of America | SIL Open Font License 1.1 |
| JetBrains Mono font | SIL Open Font License 1.1 |

The Linux image, firmware and emulator are served unchanged from this site. Their sources and checksums are listed in `assets/linux/manifest.json` and `assets/linux/NOTICE.txt`.

Course concepts (shell, kernel, processes and threads, synchronization) are adapted from Orhan Konak's operating systems lecture material. All texts, exercises and data on this site were written for this course.
