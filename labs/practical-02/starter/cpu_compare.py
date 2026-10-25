"""Practical 02, chapter 5: CPU-bound work, with threads and with processes.

Counting prime numbers keeps the CPU busy all the time: there is no waiting.
"""
import os
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

# Four blocks of numbers. Each block is one piece of work.
BLOCKS = [(1, 125_000), (125_000, 250_000), (250_000, 375_000), (375_000, 500_000)]


def count_primes(block):
    """Count the prime numbers in one block. Pure calculation, no waiting."""
    start, end = block
    count = 0
    for n in range(max(start, 2), end):
        is_prime = True
        for d in range(2, int(n ** 0.5) + 1):
            if n % d == 0:
                is_prime = False
                break
        if is_prime:
            count += 1
    return count


def sequential():
    """One block after another, in this process."""
    return [count_primes(block) for block in BLOCKS]


def with_threads():
    """Four threads in this process. They share one Python interpreter (and its GIL)."""
    with ThreadPoolExecutor(max_workers=4) as pool:
        return list(pool.map(count_primes, BLOCKS))


def with_processes():
    """Four worker processes, each with its own Python interpreter."""
    # TODO (chapter 5, step 2): do the same as with_threads(), but with a ProcessPoolExecutor.
    return None


def measure(label, function):
    start = time.perf_counter()
    result = function()
    elapsed = time.perf_counter() - start
    found = sum(result) if result else "-"
    print(f"{label:<11} {elapsed:6.2f} s   primes found: {found}")
    return elapsed


# Worker processes import this file. The check below makes sure that only the
# main program runs the measurements, not every worker process.
if __name__ == "__main__":
    print(f"CPU cores available: {os.cpu_count()}")
    measure("sequential", sequential)
    measure("threads", with_threads)
    measure("processes", with_processes)
