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

# 3. Every file the course loads into Linux exists, and the Linux image matches its manifest.
content = (ASSETS / 'practical-01.js').read_text()
urls = re.findall(r"url: '([^']+)'", content)
assert urls, 'no course files declared'
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

print('PASS: datasets unchanged (8/4 and 1000/100 records, 50 refused, 50 timeouts, 100 devices); '
      'browser copies identical; Linux image matches manifest; theme assets present')
