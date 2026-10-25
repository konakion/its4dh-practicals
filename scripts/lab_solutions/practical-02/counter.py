"""Practical 02, chapter 6: two threads update one shared counter."""
import threading
import time

admitted = 0          # shared by both threads: the number of admitted patients

lock = threading.Lock()


def admit(name, patients):
    global admitted
    for _ in range(patients):
        with lock:                      # only one thread at a time from here ...
            value = admitted            # read the shared counter
            time.sleep(0.01)            # a short pause, like a moment of other work
            admitted = value + 1        # write the new value back (... to here)
    print(f"{name} has admitted {patients} patients")


a = threading.Thread(target=admit, args=("Nurse A", 5))
b = threading.Thread(target=admit, args=("Nurse B", 5))
a.start()
b.start()
a.join()
b.join()
print(f"Admitted: {admitted} (expected 10)")
