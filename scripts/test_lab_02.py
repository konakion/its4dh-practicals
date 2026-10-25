"""Tests for the Codespaces part of Practical 02 (labs/practical-02/p02.py).

    python3 scripts/test_lab_02.py

Copies the lab into a temporary folder and runs the real checker, like a student would:
the untouched starter files must be rejected with helpful feedback, typical mistakes must
get their specific feedback, and the model solutions must pass with a valid result code.
Every result code printed here is checked again by test_learning.cjs with the JavaScript
checksum of the page (scripts/lab_codes.json).
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "labs" / "practical-02"
SOLUTIONS = ROOT / "scripts" / "lab_solutions" / "practical-02"
sys.path.insert(0, str(LAB))
import p02  # noqa: E402

# Checksum vectors shared with the JavaScript side (test_learning.cjs).
VECTORS = {"P02-THREADS-2.01": p02.signature("P02-THREADS-2.01"), "P02-HELLO": p02.signature("P02-HELLO")}
assert re.fullmatch(r"[A-Z2-9]{4}", VECTORS["P02-HELLO"])

tmp = Path(tempfile.mkdtemp(prefix="its4dh-lab02-"))
lab = tmp / "practical-02"
shutil.copytree(LAB, lab, ignore=shutil.ignore_patterns("work", "__pycache__"))
codes = {}
count = 0


def sh(*args):
    p = subprocess.run([sys.executable, "p02.py", *args], cwd=lab, capture_output=True, text=True, timeout=300)
    return p.returncode, p.stdout + p.stderr


def put(name, text):
    (lab / "work" / name).write_text(text)


def expect_fail(task, pattern, label):
    global count
    rc, out = sh("check", task)
    assert rc == 1 and "No result code yet" in out, f"{task} {label}: should fail\n{out}"
    assert re.search(pattern, out, re.S), f"{task} {label}: feedback should match {pattern!r}\n{out}"
    assert "Your result code" not in out
    count += 1


def expect_pass(task, label="model solution"):
    global count
    rc, out = sh("check", task)
    assert rc == 0, f"{task} {label}: should pass\n{out}"
    m = re.search(r"Your result code: (P02-[A-Z]+(?:-[0-9.]+)*-[A-Z2-9]{4})", out)
    assert m, out
    code = m.group(1)
    body, sig = code[:-5], code[-4:]
    assert p02.signature(body) == sig
    codes.setdefault(task, []).append(code)
    count += 1
    return code, out


def solution(name, target=None):
    shutil.copy(SOLUTIONS / name, lab / "work" / (target or name))


try:
    # nothing there yet
    expect_fail("hello", r"no work/hello\.py yet.*nano work/hello\.py", "missing file")
    rc, out = sh("start")
    assert rc == 0 and "Copied: counter.py, cpu_compare.py, sequential.py, threaded.py, ward_monitor.py" in out, out
    rc, out = sh("start")
    assert "nothing new" in out
    count += 2

    # chapter 1
    put("hello.py", 'print("hello digital health")\n')
    expect_fail("hello", r"Almost.*exclamation mark", "letter case")
    put("hello.py", 'print("Hello Digital Health!"\n')
    expect_fail("hello", r"cannot read hello\.py.*bracket", "syntax error")
    put("hello.py", "")
    expect_fail("hello", r"prints nothing.*Ctrl\+O", "empty file")
    solution("hello.py")
    expect_pass("hello")
    expect_fail("vim", r"only the first line.*:wq", "not saved yet")
    put("hello.py", 'print("Hello Digital Health!")\niprint("Edited with vim")\n')
    expect_fail("vim", r"stopped with an error.*iprint", "typed i into the file")
    solution("hello_vim.py", "hello.py")
    expect_pass("vim")
    expect_pass("hello", "hello still passes after vim")

    # chapter 4
    expect_fail("sequential", r"does not print the total time yet.*TODO 1", "starter")
    seq = (SOLUTIONS / "sequential.py").read_text()
    put("sequential.py", seq.replace("start = time.perf_counter()\n\nfor name in sensors:\n    read_sensor(name)\n\nelapsed = time.perf_counter() - start",
                                     "start = time.perf_counter()\nelapsed = time.perf_counter() - start\n\nfor name in sensors:\n    read_sensor(name)\n"))
    expect_fail("sequential", r"second perf_counter\(\) call must come after the loop", "measured too early")
    solution("sequential.py")
    code, _ = expect_pass("sequential")
    t = float(code.split("-")[2])
    assert 5.9 <= t <= 6.6, code

    expect_fail("threads", r"does not create any thread yet", "starter")
    thr = (SOLUTIONS / "threaded.py").read_text()
    put("threaded.py", thr.replace("target=read_sensor, args=(name,)", "target=read_sensor(name)"))
    expect_fail("threads", r"calls the function immediately", "target=call")
    put("threaded.py", thr.replace("    t.start()\n    threads.append(t)\n\nfor t in threads:\n    t.join()\n",
                                   "    t.start()\n    t.join()\n    threads.append(t)\n"))
    expect_fail("threads", r"ran one after another.*second loop", "join inside the loop")
    put("threaded.py", thr.replace("for t in threads:\n    t.join()\n", ""))
    expect_fail("threads", r"did not wait for the threads.*join\(\)", "no join")
    put("threaded.py", thr.replace("t.start()", "t.run()"))
    expect_fail("threads", r"never started.*t\.run\(\) does not start a thread", "run instead of start")
    solution("threaded.py")
    code, _ = expect_pass("threads")
    assert 1.9 <= float(code.split("-")[2]) <= 2.6, code

    # chapter 5
    code, out = expect_pass("cpu-threads", "starter already complete for threads")
    expect_fail("cpu", r"does not use a ProcessPoolExecutor yet", "starter")
    cpu = (SOLUTIONS / "cpu_compare.py").read_text()
    put("cpu_compare.py", cpu.replace("return list(pool.map(count_primes, BLOCKS))\n\n\ndef measure", "pool.map(count_primes, BLOCKS)\n\n\ndef measure"))
    expect_fail("cpu", r"with_processes\(\) returns None", "result not returned")
    solution("cpu_compare.py")
    code, out = expect_pass("cpu")
    seq_t, thr_t, proc_t, cores = map(float, code.split("-")[2:6])
    assert cores >= 1 and thr_t > 0.8 * seq_t, code          # the GIL: threads are not faster
    if cores >= 2:
        assert proc_t < 0.8 * seq_t, code                     # processes use more cores
    p = subprocess.run([sys.executable, "work/cpu_compare.py"], cwd=lab, capture_output=True, text=True, timeout=120)
    assert p.returncode == 0 and p.stdout.count("primes found: 41538") == 3, p.stdout + p.stderr

    # chapter 6
    p = subprocess.run([sys.executable, "work/counter.py"], cwd=lab, capture_output=True, text=True, timeout=30)
    lost = int(re.search(r"Admitted: (\d+)", p.stdout).group(1))
    assert lost < 10, p.stdout                                # the starter loses updates, reliably
    expect_fail("lock", r"instead of 10: updates got lost.*with lock:", "starter")
    lock = (SOLUTIONS / "counter.py").read_text()
    put("counter.py", lock.replace("            time.sleep(0.01)            # a short pause, like a moment of other work\n", ""))
    expect_fail("lock", r"removed the pause", "pause removed")
    put("counter.py", lock.replace("lock = threading.Lock()\n", "").replace("    for _ in range(patients):", "    lock = threading.Lock()\n    for _ in range(patients):"))
    expect_fail("lock", r"created inside admit\(\)", "lock per call")
    put("counter.py", lock.replace("        with lock:                      # only one thread at a time from here ...\n            value = admitted",
                                   "        value = admitted").replace("            time.sleep(0.01)            # a short", "        time.sleep(0.01)\n        with lock:  # a short")
                          .replace("            admitted = value + 1", "            admitted = value + 1"))
    expect_fail("lock", r"does not cover the whole critical section", "lock only around the write")
    solution("counter.py")
    expect_pass("lock")

    # chapter 7
    expect_fail("ward", r"one after another.*one thread per bed", "starter")
    solution("ward_monitor.py")
    code, out = expect_pass("ward")
    assert code.split("-")[3] == "4" and 1.4 <= float(code.split("-")[2]) <= 2.2, code
    summary = (lab / "work" / "summary.txt").read_text()
    assert summary.count("bed-0") == 4, summary

    # reset keeps a backup
    rc, out = sh("reset", "counter.py")
    assert rc == 0 and (lab / "work" / "counter.py.bak").exists() and "TODO" in (lab / "work" / "counter.py").read_text()
    rc, out = sh("check", "nonsense")
    assert rc == 2 and "Tasks:" in out
    count += 2

    (ROOT / "scripts" / "lab_codes.json").write_text(json.dumps({"vectors": VECTORS, "codes": codes}, indent=1) + "\n")
    print(f"PASS: Practical 02 lab checker, {count} checks with Python {sys.version.split()[0]} "
          f"(starter files rejected, typical mistakes explained, model solutions accepted with valid result codes)")
finally:
    shutil.rmtree(tmp, ignore_errors=True)
