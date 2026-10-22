# About this practical

Practical 01 of **IT Systems for Digital Health Experts** (Hasso Plattner Institute, University of Potsdam) introduces the Linux terminal in about 90 minutes. Every exercise runs in a real Linux system inside your browser. Nothing is installed on your computer.

## How the terminal works

When you open the practical, your browser starts a small x86 computer emulator, [v86](https://github.com/copy/v86), compiled to WebAssembly. It boots a real Linux kernel (6.8) with [BusyBox](https://busybox.net/) tools. Your commands are executed by the Linux shell `/bin/sh` as the user `student`, and the output you see is exactly what Linux printed.

- The Linux system has **no network connection** and **no access to your files**. It only sees the course files.
- Your files and your current folder stay between exercises until you restart Linux or reload the page.
- Commands that run longer than 10 seconds are stopped.
- BusyBox provides compact versions of the standard tools. Their options for this practical behave like the full GNU tools, but a few rarely used options are missing, and interactive programs such as `less`, `nano` or `vi` cannot be used here.

## How your answers are checked

Your command is never compared with a stored solution. After it has run, the page checks the **result**: the output on the screen, or the files and folders you created, compared with what Linux itself produces for the task. Different correct commands therefore all count as correct.

This is self-assessment for practice. Progress and quiz results are stored only in this browser (local storage). Nothing is sent to a server, and nothing is graded.

## The data

PulseBridge is fictional. The logs `upload_small.log` (8 records) and `upload.log` (1,000 records from 100 wristbands, 09:00 to 09:09) are entirely synthetic. One line is one upload attempt, not one patient.

## Credits and licences

| Component | Licence |
|---|---|
| v86 emulator (`libv86.js`, `v86.wasm`) by Fabian Hemmer and contributors | BSD 2-Clause |
| Linux kernel and BusyBox (Buildroot image from the v86 project) | GPL-2.0 |
| SeaBIOS and VGABIOS firmware | LGPL-3.0 |
| Atkinson Hyperlegible font, Braille Institute of America | SIL Open Font License 1.1 |
| JetBrains Mono font | SIL Open Font License 1.1 |

The Linux image, firmware and emulator are served unchanged from this site. Their sources and checksums are listed in `assets/linux/manifest.json` and `assets/linux/NOTICE.txt`.

Course concepts (shell, kernel, safe copies of evidence, incident analysis) are adapted from Orhan Konak's operating systems lecture material. All texts, exercises and data on this site were written for this course.
