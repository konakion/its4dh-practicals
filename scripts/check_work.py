"""Read-only formative checks of actual learner artifacts. Run from repository root."""
from pathlib import Path
import hashlib
import json
ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'scripts/fixture_hashes.json'

def assess(root):
    checks = {}
    def read(name):
        try:
            return (root / name).read_bytes()
        except OSError:
            return None
    hashes = json.loads(MANIFEST.read_text())
    checks['sources'] = all(read(name) is not None and hashlib.sha256(read(name)).hexdigest() == digest for name, digest in hashes.items())
    checks['review_copy'] = read('work/scratch/review.conf') == read('data/config/platform.conf.backup') and read('work/scratch/review.conf') is not None
    for key, source, target, pattern in [
        ('upload_errors','upload.log','upload-errors.txt',b' ERROR '),
        ('platform_errors','platform.log','errors.txt',b' ERROR '),
        ('storage_errors','platform.log','storage-errors.txt',b'connection_refused')]:
        original = read('data/logs/' + source)
        expected = [line for line in original.splitlines() if pattern in line] if original else []
        actual = read('work/reports/' + target)
        checks[key] = actual is not None and actual.splitlines() == expected and bool(expected)
    report = read('work/reports/incident.txt')
    text = report.decode('utf-8',errors='replace') if report else ''
    checks['incident_structure'] = 100 <= len(text.split()) <= 150 and all(term in text.lower() for term in ['20','6','3','band-03'])
    return {'schema':'its4dh-work-v1','checks':checks,'note':'Report structure only: discuss evidence, limitations and next investigation with a peer. Browser results are self-assessment, not authenticated grading.'}

if __name__ == '__main__':
    print(json.dumps(assess(ROOT),indent=2))
