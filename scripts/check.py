"""Static checks for the practical: data integrity and the files the browser Linux receives.

Runs without third-party packages:  python3 scripts/check.py
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
ASSETS = DOCS / 'assets'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


# 1. The browser copies must be byte-identical to the course datasets in data/.
pairs = {
    'data/logs/upload_small.log': 'docs/assets/fixtures/upload_small.log',
    'data/logs/upload.log': 'docs/assets/fixtures/upload.log',
    'data/config/platform.conf': 'docs/assets/fixtures/platform.conf',
    'data/practical-02/bin/monitor': 'docs/assets/fixtures/p02/monitor',
    'data/practical-02/bin/analyse': 'docs/assets/fixtures/p02/analyse',
    'data/practical-02/notes/handover.txt': 'docs/assets/fixtures/p02/handover.txt',
}
for source, copy in pairs.items():
    assert sha(ROOT / source) == sha(ROOT / copy), f'{copy} differs from {source}'

# 2. The datasets still have the documented shape.
def records(name):
    return (ROOT / 'data/logs' / name).read_text().splitlines()

small, full = records('upload_small.log'), records('upload.log')
assert len(small) == 8 and sum(' ERROR ' in l for l in small) == 4
assert len(full) == 1000 and sum(' ERROR ' in l for l in full) == 100
assert sum('connection refused' in l for l in full) == 50
assert sum('upload timeout' in l for l in full) == 50
assert len({l.split()[2] for l in full}) == 100
assert all(len(l.split()) >= 4 for l in small + full)

# 3. Every ready practical in the registry has its page, its content file and its course files,
#    and the Linux image matches its manifest.
registry = (ASSETS / 'practicals.js').read_text()
ready = re.findall(r"slug: '(practical-\d\d)'[^\n]*\n[^\n]*status: 'ready'", registry)
assert ready, 'no ready practical in practicals.js'
nav = (ROOT / 'mkdocs.yml').read_text()
for slug in ready:
    content = (ASSETS / f'{slug}.js').read_text()
    assert (DOCS / f'{slug}.md').is_file() and f'practical: {slug}' in (DOCS / f'{slug}.md').read_text(), f'{slug}.md'
    assert f'{slug}.md' in nav, f'{slug} missing in the mkdocs nav'
    urls = re.findall(r"url: '([^']+)'", content)
    assert urls, f'no course files declared in {slug}.js'
    for url in urls:
        assert (ASSETS / url).is_file(), f'missing course file {url}'
manifest = json.loads((ASSETS / 'linux/manifest.json').read_text())
for name, entry in manifest.items():
    path = ASSETS / 'linux' / name
    assert path.stat().st_size == entry['bytes'] and sha(path) == entry['sha256'], f'{name} does not match manifest'

# 4. Pages and scripts referenced by the theme exist.
theme = (ROOT / 'theme/main.html').read_text()
for ref in re.findall(r"'(assets/[^']+)' \| url", theme):
    assert (DOCS / ref).is_file(), f'theme references missing {ref}'
for name in ['course-app.js', 'linux-session.js', 'shell-worker.js', 'practical.css']:
    assert (ASSETS / name).is_file(), name

# 5. The Practical 02 lab: starter files and the checker exist.
LAB = ROOT / 'labs' / 'practical-02'
for name in ['p02.py', 'starter/sequential.py', 'starter/threaded.py', 'starter/cpu_compare.py', 'starter/counter.py', 'starter/ward_monitor.py']:
    assert (LAB / name).is_file(), f'labs/practical-02/{name}'

print('PASS: datasets unchanged (8/4 and 1000/100 records, 50 refused, 50 timeouts, 100 devices); '
      f'browser copies identical; practicals ready: {", ".join(ready)}; Linux image matches manifest; '
      'theme assets and Practical 02 lab present')
