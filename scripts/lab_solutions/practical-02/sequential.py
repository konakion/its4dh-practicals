"""Practical 02, chapter 4: three sensors, asked one after another."""
import time


def read_sensor(name):
    """Pretend to ask a wireless sensor for its value. Most of the time is waiting."""
    print(f"{name}: asking the sensor ...")
    time.sleep(2)                       # waiting for the reply (I/O): the CPU is idle
    print(f"{name}: value received")


sensors = ["heart rate", "blood oxygen", "temperature"]

start = time.perf_counter()

for name in sensors:
    read_sensor(name)

elapsed = time.perf_counter() - start
print(f"Total time: {elapsed:.2f} s")
