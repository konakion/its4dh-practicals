# 1 · Why learn a Linux terminal?

<div class="learning-lab" data-step="terminal"></div>

<details class="chapter-reference" markdown="1">
<summary>Reference, guided walkthrough and extra practice</summary>

**Core path · 0–10 minutes** · Read → predict → run → explain.

## Why this matters
Imagine training a model that detects motion patterns from wearable signals. Your laptop
controls a powerful remote server with GPUs. That server may be **headless**: it has
no attached screen and often no desktop session. You still need to find datasets,
start software and inspect logs. A command-line interface makes these operations
precise and repeatable. Today we investigate a small log snapshot, not train a model.

## Understand the idea
A **GUI** offers windows and buttons. A **CLI** accepts textual commands. A **terminal**
is the application displaying that text. A **shell**, here Bash, interprets commands.
The shell starts utilities such as `cat`; some commands, including `cd`, are built
into the shell. The **kernel** manages CPU time, memory, devices and protected access
to files. Programs request kernel services through **system calls**, such as opening,
reading and writing a file, usually through libraries. A command is not a system call.

```text
Browser on your laptop → remote Codespace terminal → Bash → cat utility
                                                           ↓ open/read/write
                                                       Linux kernel
                                                           ↓
                                                   files and devices
```

Think of a restaurant: the terminal is the order counter, the shell interprets an
order and utilities carry out tasks. The kernel coordinates shared resources and
access. The analogy explains roles, not a literal implementation: the kernel is
not a separate user-space kitchen process. A GUI program also uses kernel services;
it does not need to pass through a shell.

Codespaces gives us remote Linux through the browser. SSH is another way to reach
a remote shell; it is optional today. Commands run where the terminal is connected,
not necessarily on the laptop displaying it. Closing the browser does not itself
stop a running remote machine.

## Follow along
Start at the repository root in the same Bash terminal. Copy only the code, never the output. Run lines from top to bottom.

```bash
printf '%s\n' 'Hello from the Linux workspace'
```

**Expected result**

```text
Hello from the Linux workspace
```

`printf` formats text. `%s` means “insert a string”; `\n` adds a newline.
Single quotes keep text together. Enter executes a command; the prompt returns
when it finishes. No `$` prompt is included in our code blocks.

## Your turn
Print a second greeting containing the word `wearable`. Change only the quoted message.

## Checkpoint
Does a GUI bypass the kernel? Is Bash the kernel?

??? note "Hint 1 · Think about the goal"
    Trace the arrows in the diagram.

??? note "Hint 2 · Choose a tool"
    Use the same printf format, replacing the final quoted string.

??? success "Check your understanding — open after trying"
    No to both. A GUI and a shell are interfaces; programs use kernel services. Your greeting appears once and leaves files unchanged.

## Mini-challenge
Explain to an imaginary colleague why a browser on Windows can show a Linux shell. Check: the computation runs remotely, while your laptop displays the session.

[Continue →](02-orientation.md) · [Core path map](index.md)

</details>

[Next learning step →](02-orientation.md) · [Learning path](index.md)
