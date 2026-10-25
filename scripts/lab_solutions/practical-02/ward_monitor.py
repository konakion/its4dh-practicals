"""Practical 02, chapter 7: a small patient monitoring simulator (synthetic data only).

receive()  waits for measurements from a bedside sensor   -> I/O-bound
analyse()  computes a mean and an alarm rule               -> CPU work (tiny here)
print()    shows a status line per patient                 -> display
summary    is written to summary.txt                       -> storage
"""
import random
import statistics
import threading
import time
from pathlib import Path

BEDS = ["bed-01", "bed-02", "bed-03", "bed-04"]
readings = {}                       # bed -> list of heart rates, shared by all threads
readings_lock = threading.Lock()    # protects `readings` (chapter 6)


def receive(bed):
    """Wait for three heart-rate measurements from the sensor of one bed."""
    rng = random.Random(bed)        # synthetic values, the same in every run
    for _ in range(3):
        time.sleep(0.5)             # waiting for the sensor (I/O)
        value = rng.randint(55, 110)
        with readings_lock:         # several threads add to the same dict
            readings.setdefault(bed, []).append(value)


def analyse(values):
    """Mean heart rate and a simple alarm rule."""
    status = "ALARM" if max(values) > 100 else "ok"
    return statistics.mean(values), status


start = time.perf_counter()

# TODO: receive the data of all beds at the same time instead of one after another.
#       Reuse the pattern from chapter 4: one thread per bed, start all, then join all.
threads = [threading.Thread(target=receive, args=(bed,)) for bed in BEDS]
for t in threads:
    t.start()
for t in threads:
    t.join()

received = time.perf_counter() - start

lines = []
for bed in BEDS:
    mean, status = analyse(readings[bed])
    line = f"{bed}: mean heart rate {mean:5.1f}  {status}"
    print(line)
    lines.append(line)

Path(__file__).with_name("summary.txt").write_text("\n".join(lines) + "\n")
print(f"Receiving took {received:.2f} s")
