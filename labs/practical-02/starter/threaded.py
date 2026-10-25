"""Practical 02, chapter 4: the same three sensors, now with one thread per sensor."""
import threading
import time


def read_sensor(name):
    """Pretend to ask a wireless sensor for its value. Most of the time is waiting."""
    print(f"{name}: asking the sensor ...")
    time.sleep(2)                       # waiting for the reply (I/O): the CPU is idle
    print(f"{name}: value received")


sensors = ["heart rate", "blood oxygen", "temperature"]
start = time.perf_counter()

threads = []
for name in sensors:
    # TODO 1: create a thread that will run read_sensor(name),
    #         start it, and append it to the list `threads`.
    pass

# TODO 2: wait until every thread in `threads` has finished.

elapsed = time.perf_counter() - start
print(f"Total time: {elapsed:.2f} s")
