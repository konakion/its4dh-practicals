# Command reference

All paths below assume the repository root and an existing `work/` workspace.
Options are case-sensitive. A successful write often prints nothing.

| Command | Meaning | Example |
|---|---|---|
| `uname` | Kernel name | `uname` → `Linux` |
| `pwd` | Current directory | `pwd` |
| `ls`, `ls -la` | List; include hidden entries and details | `ls -la data` |
| `cd`, `..`, `.` | Change directory; parent; current | `cd data`, then `cd ..` |
| `mkdir` | Create directory | `mkdir work/scratch/new` |
| `touch` | Create empty file, or update timestamp | `touch work/scratch/new.txt` |
| `cp -i` | Copy; ask before overwrite | `cp -i data/README.txt work/scratch/readme.txt` |
| `mv -i` | Move/rename; ask before overwrite | `mv -i work/scratch/new.txt work/scratch/old.txt` |
| `rm -i` | Delete one named file, with prompt | `rm -i work/scratch/old.txt` |
| `cat` | Print short files | `cat data/README.txt` |
| `head -n`, `tail -n` | First/last n lines | `head -n 3 data/logs/platform.log` |
| `less` | Read-only pager; `q` exits | `less data/logs/platform.log` |
| `grep -F` | Literal text filter | `grep -F ' ERROR ' data/logs/platform.log` |
| `grep -n`, `grep -c` | Match line numbers; count matching lines | `grep -c -F ' WARN ' data/logs/platform.log` |
| `wc -l` | Count newline characters | `wc -l < data/logs/platform.log` |
| `printf` | Print formatted text | `printf '%s\n' 'A short note'` |
| `find` | Find paths, not file content | `find data -name '*.conf*'` |
| `diff` | Compare text files | `diff data/config/platform.conf.backup data/config/platform.conf` |
| `man`, `--help` | Read documentation | `man grep`, `grep --help` |

| Operator | Meaning |
|---|---|
| `command1 \| command2` | Send standard output to another command |
| `command > path` | Create or replace output file |
| `command >> path` | Append output to a file |
| `command < path` | Read standard input from a file |

A line count is not always a record count: a file without a final newline or
multi-line records needs a different interpretation. Our fixture has one newline
per record. `grep` with no matches prints nothing (or 0 with `-c`) and returns
status 1; that does not mean the file was changed. `diff` status 0 means identical,
1 means differences, and values above 1 indicate an error.
