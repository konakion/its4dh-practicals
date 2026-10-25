#!/usr/bin/env python3
"""Practical 02 helper for the Codespaces terminal.

    python3 p02.py start          copy the starter files into work/ (never overwrites your files)
    python3 p02.py check TASK     run your program, check it and print feedback and a result code
    python3 p02.py reset FILE     put the starter version of FILE back into work/ (keeps a .bak copy)
    python3 p02.py list           show all tasks

Run it from the folder labs/practical-02. Your own files live in work/; starter/ keeps the
originals. The checker really runs your program, measures it and looks at your code. When
everything is right it prints a result code such as P02-THREADS-2.01-QK7M: paste it into
the practical page. The last four letters are a checksum, so typos are noticed. This is
self-assessment for practice, not an exam.
"""
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
STARTER = HERE / "starter"
WORK = HERE / "work"
PY = sys.executable

TASKS = {
    "hello": "chapter 1: hello.py written with nano",
    "vim": "chapter 1: second line added with vim",
    "sequential": "chapter 4: measure the sequential version",
    "threads": "chapter 4: one thread per sensor",
    "cpu-threads": "chapter 5: CPU-bound work with threads",
    "cpu": "chapter 5: add the process pool",
    "lock": "chapter 6: protect the shared counter",
    "ward": "chapter 7: the patient monitoring simulator",
}

# ---------------------------------------------------------------- result codes
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def signature(body):
    """FNV-1a (32 bit) over the code, as four characters. Same function as in course-app.js."""
    x = 0x811C9DC5
    for b in (body + "|its4dh").encode():
        x ^= b
        x = (x * 0x01000193) & 0xFFFFFFFF
    out = ""
    for _ in range(4):
        out += ALPHABET[x & 31]
        x >>= 5
    return out


def result_code(task, *values):
    parts = ["P02", task.replace("-", "").upper()]
    for v in values:
        parts.append(str(v) if isinstance(v, int) else f"{v:.2f}")
    body = "-".join(parts)
    return f"{body}-{signature(body)}"


# ---------------------------------------------------------------- output helpers
class Failed(Exception):
    """A check did not pass. The message explains why and what to try."""


def say(text=""):
    print(text, flush=True)


def passed(task, message, *values):
    say(f"✔ {message}")
    say()
    say(f"Your result code: {result_code(task, *values)}")
    say("Paste this line into the practical page.")


def work_file(name, created_by="python3 p02.py start"):
    path = WORK / name
    if not path.exists():
        if name == "hello.py":
            raise Failed("There is no work/hello.py yet. Create it with:  nano work/hello.py\n"
                         "(Are you in the folder labs/practical-02? Check with pwd.)")
        raise Failed(f"There is no work/{name} yet. Run  {created_by}  first.\n"
                     "(Are you in the folder labs/practical-02? Check with pwd.)")
    return path


def source_of(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    try:
        return text, ast.parse(text)
    except SyntaxError as e:
        line = (e.text or "").rstrip()
        raise Failed(f"Python cannot read {path.name}: {e.msg} in line {e.lineno}.\n"
                     f"    {line}\n"
                     "Look for a missing bracket, quote or colon, or wrong indentation.")


def run(path, timeout=30, args=()):
    start = time.perf_counter()
    try:
        p = subprocess.run([PY, str(path), *args], capture_output=True, text=True, timeout=timeout, cwd=HERE)
    except subprocess.TimeoutExpired:
        raise Failed(f"{path.name} was still running after {timeout} s, so the check stopped it.\n"
                     "Does a loop never end, or does a thread wait for something that never happens?")
    wall = time.perf_counter() - start
    if p.returncode != 0:
        last = (p.stderr.strip().splitlines() or ["(no message)"])[-1]
        raise Failed(f"{path.name} stopped with an error:\n    {last}\n"
                     f"Run  python3 work/{path.name}  to see the full message.")
    return p.stdout, wall


def calls(tree, name):
    """All calls of a function or method with this name (e.g. 'Thread', 'join')."""
    found = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            f = node.func
            if (isinstance(f, ast.Name) and f.id == name) or (isinstance(f, ast.Attribute) and f.attr == name):
                found.append(node)
    return found


def total_time(out, label="Total time"):
    m = re.findall(rf"{label}:?\s*([0-9]+(?:\.[0-9]+)?)", out)
    return float(m[-1]) if m else None


# ---------------------------------------------------------------- the checks
def check_hello():
    path = work_file("hello.py")
    source_of(path)
    out, _ = run(path, timeout=10)
    lines = out.splitlines()
    want = "Hello Digital Health!"
    if not lines:
        raise Failed("hello.py runs, but prints nothing. Did you save the file in nano (Ctrl+O, Enter)?")
    first = lines[0]
    if first != want:
        if first.lower().strip(" !") == want.lower().strip(" !"):
            raise Failed(f"Almost: your program prints\n    {first}\n"
                         f"but the task asks for exactly\n    {want}\n"
                         "Check capital letters, the exclamation mark and spaces.")
        raise Failed(f"Your program prints\n    {first}\nbut the first line should be\n    {want}")
    passed("hello", "hello.py prints the greeting. You created, saved and ran a file with a terminal editor.")


def check_vim():
    path = work_file("hello.py")
    swap = path.with_name(".hello.py.swp")
    source_of(path)
    out, _ = run(path, timeout=10)
    lines = out.splitlines()
    want = ["Hello Digital Health!", "Edited with vim"]
    if lines == want:
        msg = "hello.py now prints two lines. You edited and saved a file in vim."
        if swap.exists():
            msg += "\n(Note: vim left a swap file .hello.py.swp. If vim is closed everywhere, you can delete it.)"
        passed("vim", msg)
        return
    if lines[:1] == want[:1] and len(lines) == 1:
        hint = "Did you save? In vim: press Esc, then type :wq and Enter."
        if swap.exists():
            hint += "\nvim seems to be still open (there is a swap file). Go back to it and save with :wq."
        raise Failed("hello.py still prints only the first line.\n" + hint)
    raise Failed("hello.py prints:\n    " + "\n    ".join(lines or ["(nothing)"]) + "\n"
                 "It should print exactly these two lines:\n    " + "\n    ".join(want) + "\n"
                 "In vim, press i to type, Esc to stop typing, :wq to save and quit.")


def check_sequential():
    path = work_file("sequential.py")
    text, tree = source_of(path)
    out, wall = run(path)
    reported = total_time(out)
    received = out.count("value received")
    if received != 3:
        raise Failed(f"Expected three lines 'value received', found {received}. Did you change the loop or read_sensor()?")
    if reported is None:
        if len(calls(tree, "perf_counter")) < 2:
            raise Failed("The program does not print the total time yet.\n"
                         "TODO 1: start = time.perf_counter() before the loop.\n"
                         "TODO 2: elapsed = time.perf_counter() - start after the loop, then print it.")
        raise Failed('No line "Total time: ... s" found. Print it like this:  print(f"Total time: {elapsed:.2f} s")')
    if reported < 1:
        raise Failed(f"Your program says it took {reported:.2f} s, but it really ran for {wall:.1f} s.\n"
                     "The second perf_counter() call must come after the loop, when all sensors have answered.")
    if abs(reported - wall) > 0.8:
        raise Failed(f"Your program says {reported:.2f} s, but it really ran for {wall:.1f} s.\n"
                     "Measure from just before the loop to just after it.")
    if not 5.5 <= reported <= 8:
        raise Failed(f"The total time is {reported:.2f} s, but three waits of 2 s should take about 6 s.\n"
                     "Did you change time.sleep(2)? Reset the file with:  python3 p02.py reset sequential.py")
    passed("sequential", f"Three sensors one after another took {reported:.2f} s: 2 s of waiting, three times in a row.", reported)


def check_threads():
    path = work_file("threaded.py")
    text, tree = source_of(path)
    thread_calls = calls(tree, "Thread")
    if not thread_calls:
        raise Failed("threaded.py does not create any thread yet.\n"
                     "TODO 1: t = threading.Thread(target=read_sensor, args=(name,)), then t.start() and threads.append(t).")
    for c in thread_calls:
        for kw in c.keywords:
            if kw.arg == "target" and isinstance(kw.value, ast.Call):
                raise Failed("target=read_sensor(...) calls the function immediately, in the main thread,\n"
                             "and hands its result (None) to the thread. Pass the function itself and the\n"
                             "argument separately:  threading.Thread(target=read_sensor, args=(name,))")
    if not calls(tree, "start"):
        raise Failed("The threads are created, but never started. Call t.start() for each thread."
                     + (" (t.run() does not start a thread: it runs the function in the main thread.)" if calls(tree, "run") else ""))
    out, wall = run(path)
    reported = total_time(out)
    received = out.count("value received")
    lines = out.splitlines()
    if reported is None:
        raise Failed('No line "Total time: ... s" found. Did you delete the last two lines of the starter file?')
    total_at = max(i for i, l in enumerate(lines) if "Total time" in l)
    if received < 3 or any("value received" in l for l in lines[total_at + 1:]):
        raise Failed(f"The program printed its total time ({reported:.2f} s) before all sensors had answered.\n"
                     "The main program did not wait for the threads. TODO 2: call join() on every thread\n"
                     "in the list, after the loop that starts them.")
    if reported >= 4.5:
        raise Failed(f"It took {reported:.2f} s, as long as the sequential version: the threads ran one after another.\n"
                     "Is join() inside the same loop as start()? Then the main program waits for each thread\n"
                     "before it starts the next one. Start all threads first, then join them in a second loop.")
    if reported < 1.5 or abs(reported - wall) > 1:
        raise Failed(f"The program reports {reported:.2f} s but ran for {wall:.1f} s. Keep the measurement lines from the starter file.")
    passed("threads", f"With three threads the program took {reported:.2f} s: the three waits overlapped.", reported)


def _cpu_measure(with_processes):
    """Runs in a child process: import cpu_compare from work/ and time the functions."""
    sys.path.insert(0, str(WORK))
    import cpu_compare as m  # noqa: E402  (the student's module)
    expected = [11734, 10310, 9860, 9634]
    result = {"cores": len(os.sched_getaffinity(0)) if hasattr(os, "sched_getaffinity") else os.cpu_count()}
    names = ["sequential", "with_threads"] + (["with_processes"] if with_processes else [])
    for name in names:
        fn = getattr(m, name, None)
        if fn is None:
            result["error"] = f"cpu_compare.py has no function {name}(). Reset it with: python3 p02.py reset cpu_compare.py"
            break
        start = time.perf_counter()
        value = fn()
        result[name] = time.perf_counter() - start
        if value is None:
            result["error"] = f"{name}() returns None. " + ("Complete the TODO: create a ProcessPoolExecutor, map count_primes over BLOCKS and return the list." if name == "with_processes" else "Did you change it?")
            break
        if list(value) != expected or getattr(m, "BLOCKS", None) != [(1, 125_000), (125_000, 250_000), (250_000, 375_000), (375_000, 500_000)]:
            result["error"] = f"{name}() returns {list(value)}, but the prime counts per block should be {expected}. Did you change BLOCKS or count_primes()?"
            break
    print(json.dumps(result))


def cpu_results(with_processes):
    path = work_file("cpu_compare.py")
    text, tree = source_of(path)
    if with_processes:
        fn = next((n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == "with_processes"), None)
        if fn is None or not calls(fn, "ProcessPoolExecutor"):
            raise Failed("with_processes() does not use a ProcessPoolExecutor yet.\n"
                         "Copy the body of with_threads() and replace ThreadPoolExecutor with ProcessPoolExecutor.")
    say("Measuring, this takes a few seconds ...")
    try:
        p = subprocess.run([PY, str(Path(__file__).resolve()), "_cpu", "1" if with_processes else "0"],
                           capture_output=True, text=True, timeout=180, cwd=HERE)
    except subprocess.TimeoutExpired:
        raise Failed("The measurement did not finish within 3 minutes. Is something waiting forever?")
    if p.returncode != 0 or not p.stdout.strip():
        last = (p.stderr.strip().splitlines() or ["(no message)"])[-1]
        raise Failed(f"cpu_compare.py stopped with an error:\n    {last}\nRun  python3 work/cpu_compare.py  to see the full message.")
    r = json.loads(p.stdout.strip().splitlines()[-1])
    if "error" in r:
        raise Failed(r["error"])
    return r


def check_cpu_threads():
    r = cpu_results(False)
    seq, thr, cores = r["sequential"], r["with_threads"], r["cores"]
    say(f"sequential  {seq:6.2f} s")
    say(f"threads     {thr:6.2f} s")
    note = ("Four threads were not faster: in standard Python only one thread at a time runs Python code (the GIL)."
            if thr > 0.8 * seq else
            "Interesting: threads were faster here. Are you using a free-threaded Python build without the GIL?")
    passed("cpu-threads", note, seq, thr, cores)


def check_cpu():
    r = cpu_results(True)
    seq, thr, proc, cores = r["sequential"], r["with_threads"], r["with_processes"], r["cores"]
    say(f"CPU cores   {cores}")
    say(f"sequential  {seq:6.2f} s")
    say(f"threads     {thr:6.2f} s")
    say(f"processes   {proc:6.2f} s")
    if cores > 1:
        note = f"The processes ran on up to {cores} cores at the same time: speedup {seq / proc:.2f} compared with sequential."
    else:
        note = "This machine has only one CPU core, so separate processes cannot run at the same time here."
    passed("cpu", note, seq, thr, proc, cores)


def check_lock():
    path = work_file("counter.py")
    text, tree = source_of(path)
    admit = next((n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == "admit"), None)
    if admit is None:
        raise Failed("counter.py has no function admit() any more. Reset it with: python3 p02.py reset counter.py")
    if not calls(admit, "sleep"):
        raise Failed("You removed the pause from admit(). That makes the error rarer, but it does not fix it:\n"
                     "on a busy server the threads can still be switched between read and write.\n"
                     "Put time.sleep(0.01) back between reading and writing, and protect both with a lock.")
    results = []
    for _ in range(3):
        out, _ = run(path, timeout=20)
        m = re.findall(r"Admitted:\s*(\d+)", out)
        if not m:
            raise Failed('No line "Admitted: ..." found. Keep the last print() of the starter file.')
        results.append(int(m[-1]))
    lock_calls = calls(tree, "Lock")
    if all(r == 10 for r in results):
        if not lock_calls:
            raise Failed("The result is 10, but there is no threading.Lock() in your code. Did you change how the threads run?\n"
                         "The task is to keep both threads running at the same time and protect the counter with a lock.")
        passed("lock", "Three runs, three times 10 patients. The lock keeps read and write together.", 10)
        return
    got = ", ".join(map(str, results))
    if not lock_calls:
        raise Failed(f"Three runs gave {got} instead of 10: updates got lost.\n"
                     "Create one lock at the top (lock = threading.Lock()) and put the read, the pause and the write\n"
                     "inside  with lock:")
    if calls(admit, "Lock"):
        raise Failed(f"Three runs gave {got}. Your lock is created inside admit(), so every thread gets its own lock\n"
                     "and nobody ever waits. Create the lock once, outside the function, and use that one.")
    raise Failed(f"Three runs gave {got} instead of 10. The lock does not cover the whole critical section:\n"
                 "the read (value = admitted), the pause and the write (admitted = value + 1) must all be inside  with lock:")


def check_ward():
    path = work_file("ward_monitor.py")
    text, tree = source_of(path)
    summary = HERE / "work" / "summary.txt"
    if summary.exists():
        summary.unlink()
    out, wall = run(path, timeout=30)
    took = total_time(out, "Receiving took")
    if took is None:
        raise Failed('No line "Receiving took ... s" found. Keep the last lines of the starter file.')
    if not summary.exists():
        raise Failed("The program did not write summary.txt. Keep the line that writes the summary.")
    rows = [l for l in summary.read_text().splitlines() if l.strip()]
    if len(rows) != 4:
        raise Failed(f"summary.txt has {len(rows)} lines, but there are 4 beds. Did every receive() thread finish before the analysis?")
    if took >= 4.5:
        raise Failed(f"Receiving took {took:.2f} s: the beds were still asked one after another.\n"
                     "Create one thread per bed with target=receive, start them all, then join them all.")
    if not calls(tree, "Thread"):
        raise Failed("Receiving was fast, but there is no threading.Thread in your code. Keep receive() unchanged and use threads.")
    if took < 1.2:
        raise Failed(f"Receiving took only {took:.2f} s, less than one sensor needs. Did the main program wait (join) for the threads?")
    passed("ward", f"All 4 beds were received in {took:.2f} s instead of about 6 s, and summary.txt has one line per bed.", took, len(rows))


CHECKS = {
    "hello": check_hello, "vim": check_vim, "sequential": check_sequential, "threads": check_threads,
    "cpu-threads": check_cpu_threads, "cpu": check_cpu, "lock": check_lock, "ward": check_ward,
}


# ---------------------------------------------------------------- commands
def start():
    WORK.mkdir(exist_ok=True)
    copied = []
    for src in sorted(STARTER.glob("*.py")):
        dst = WORK / src.name
        if not dst.exists():
            shutil.copy2(src, dst)
            copied.append(src.name)
    say("Your work folder: labs/practical-02/work")
    say("Copied: " + (", ".join(copied) if copied else "nothing new, your files are kept"))
    say("Next: open the practical page and follow chapter 1.")


def reset(name):
    src = STARTER / Path(name).name
    if not src.exists():
        say(f"There is no starter file called {name}. Available: " + ", ".join(p.name for p in sorted(STARTER.glob('*.py'))))
        return 1
    WORK.mkdir(exist_ok=True)
    dst = WORK / src.name
    if dst.exists():
        shutil.copy2(dst, dst.with_suffix(dst.suffix + ".bak"))
        say(f"Your old version is saved as work/{dst.name}.bak")
    shutil.copy2(src, dst)
    say(f"work/{dst.name} is back to the starter version.")
    return 0


def main(argv):
    if len(argv) >= 2 and argv[0] == "_cpu":
        _cpu_measure(argv[1] == "1")
        return 0
    if not argv or argv[0] in ("-h", "--help", "help"):
        say(__doc__.strip())
        return 0
    cmd = argv[0]
    if cmd == "start":
        start()
        return 0
    if cmd == "list":
        for k, v in TASKS.items():
            say(f"  {k:<12} {v}")
        return 0
    if cmd == "reset" and len(argv) == 2:
        return reset(argv[1])
    if cmd == "check" and len(argv) == 2 and argv[1] in CHECKS:
        say(f"Checking {argv[1]} ({TASKS[argv[1]]}) ...")
        try:
            CHECKS[argv[1]]()
            return 0
        except Failed as e:
            say()
            say("✘ Not yet.")
            say(str(e))
            say()
            say("Fix it and run the check again. No result code yet.")
            return 1
    say("Usage: python3 p02.py start | check TASK | reset FILE | list")
    say("Tasks: " + ", ".join(CHECKS))
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
