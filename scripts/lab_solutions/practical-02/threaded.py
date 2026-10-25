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
    t = threading.Thread(target=read_sensor, args=(name,))
    t.start()
    threads.append(t)

for t in threads:
    t.join()

elapsed = time.perf_counter() - start
print(f"Total time: {elapsed:.2f} s")
