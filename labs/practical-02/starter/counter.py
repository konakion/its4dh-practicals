"""Practical 02, chapter 6: two threads update one shared counter."""
import threading
import time

admitted = 0          # shared by both threads: the number of admitted patients

# TODO: create one lock for the counter here, and use it in admit()
#       to protect the critical section. Keep the pause!


def admit(name, patients):
    global admitted
    for _ in range(patients):
        value = admitted            # read the shared counter
        time.sleep(0.01)            # a short pause, like a moment of other work
        admitted = value + 1        # write the new value back
    print(f"{name} has admitted {patients} patients")


a = threading.Thread(target=admit, args=("Nurse A", 5))
b = threading.Thread(target=admit, args=("Nurse B", 5))
a.start()
b.start()
a.join()
b.join()
print(f"Admitted: {admitted} (expected 10)")
