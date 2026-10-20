# Optional challenges · after the core session

These reinforce file navigation and text analysis; they require no scripts,
network access, editors or process tools. Attempt first, then open the solutions.

## A · Locate configuration (5 minutes)

From the repository root, use `find data -name '*.conf*'` to locate both configuration
files. Quotes prevent the shell from expanding `*` before `find` receives it.
Compare them with `diff data/config/platform.conf.backup data/config/platform.conf`.
Which line differs? Does a difference prove the cause of an incident?

## B · Two filters (5 minutes)

How many error records mention `band-03`? Combine two `grep -F` stages and `wc -l`.
Explain why counting all `band-03` records answers a different question.

## C · Preserve context (5 minutes)

Use `grep -n -F ' WARN ' work/logs/platform.log` to identify warning line numbers.
Does every warning immediately lead to an error for the same device? Inspect
`cat -n work/logs/platform.log` and give a counterexample.

## D · A filename containing spaces (3 minutes)

Copy `work/reports/incident.txt` to `work/reports/incident copy.txt`, using quotes
around the destination. Read it back with `cat`. Explain what the shell would do
with an unquoted space. Keep the original note intact.
