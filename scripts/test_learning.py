"""Regression checks for fixture counts and real learner artifact verification."""
from pathlib import Path
import importlib.util
import json
import shutil
import subprocess
import tempfile
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('check_work', ROOT/'scripts/check_work.py')
checker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
for name,total,errors in [('upload_small.log',8,4),('upload.log',1000,100)]:
    lines=(ROOT/'data/logs'/name).read_text().splitlines()
    assert len(lines)==total and sum(' ERROR ' in l for l in lines)==errors
with tempfile.TemporaryDirectory() as folder:
    root=Path(folder); shutil.copytree(ROOT/'data',root/'data')
    empty=checker.assess(root)['checks']; assert empty['sources'] and not any(v for k,v in empty.items() if k!='sources')
    subprocess.run(['bash','-eu','-o','pipefail','-c', '''
mkdir -p work/scratch work/reports
cp data/config/platform.conf.backup work/scratch/review.conf
awk '$2 == "ERROR"' data/logs/upload.log > work/reports/upload-errors.txt
grep ' ERROR ' data/logs/platform.log > work/reports/errors.txt
grep connection_refused data/logs/platform.log > work/reports/storage-errors.txt
'''],cwd=root,check=True)
    report='Observed 20 records, 6 ERROR and 3 WARN for band-03. ' + 'Interpret evidence carefully before claiming recovery. '*16
    assert 100<=len(report.split())<=150
    (root/'work/reports/incident.txt').write_text(report)
    assert all(checker.assess(root)['checks'].values())
    (root/'work/reports/upload-errors.txt').write_text('100\n')
    assert not checker.assess(root)['checks']['upload_errors']
    (root/'data/logs/platform.log').write_text('changed')
    assert not checker.assess(root)['checks']['sources']
steps=json.loads((ROOT/'docs/assets/learning.json').read_text())
assert len(steps)==7 and len({s['id'] for s in steps})==7
for step in steps:
    assert len(step['intro'].split())<100
    assert len(step['options'])>=3 and 0<=step['correct']<len(step['options'])
print('PASS: fixture counts, alternative awk solution, missing/wrong artifacts, changed sources, report structure and learning schema')
