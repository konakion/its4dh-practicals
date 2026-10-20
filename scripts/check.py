"""Check handbook examples in a temporary workspace, without changing user data."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
ROOT = Path(__file__).resolve().parents[1]
def snapshot():
    return {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'data').rglob('*') if p.is_file()}
before = snapshot()
config = json.loads((ROOT/'.devcontainer/devcontainer.json').read_text())
assert config['remoteUser'] == 'vscode' and config['forwardPorts'] == [8000]
assert (ROOT/'.devcontainer'/config['build']['dockerfile']).is_file()
for page in (ROOT/'docs').glob('*.md'):
    for link in re.findall(r'\]\(([^)]+)\)', page.read_text()):
        if '://' not in link and not link.startswith('#'):
            assert (page.parent/link.split('#')[0]).is_file(), (page, link)
with tempfile.TemporaryDirectory(prefix='pulsebridge-') as folder:
    base = Path(folder)
    shutil.copytree(ROOT/'data', base/'data')
    def run(cmd, expected=None, code=0):
        r = subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', cmd], cwd=base,
                           input='y\n', text=True, capture_output=True)
        assert r.returncode == code, (cmd, r.stderr, r.returncode)
        if expected is not None:
            assert r.stdout.strip() == expected, (cmd, r.stdout, expected)
        return r.stdout
    for block in re.findall(r'```bash\n(.*?)```', (ROOT/'docs/practical.md').read_text(), re.S):
        run('\n'.join(x for x in block.splitlines() if not x.startswith(('less ', 'man '))))
    log = 'work/logs/platform.log'
    for cmd, output in [
        (f'wc -l < {log}', '20'),
        (f"grep -c -F ' ERROR ' {log}", '6'),
        (f"grep -c -F ' WARN ' {log}", '3'),
        (f"grep -F ' ERROR ' {log} | wc -l", '6'),
        (f"grep -F ' ERROR ' {log} | grep -F 'band-03' | wc -l", '3')]:
        run(cmd, output)
    run(f"grep -F 'connection_refused' {log} > work/reports/storage-errors.txt")
    run('wc -l < work/reports/storage-errors.txt', '3')
    assert [int(x.split(':')[0]) for x in run(f"grep -n -F 'connection_refused' {log}").splitlines()] == [6,10,15]
    assert len(run(f"grep -F 'band-03' {log}").splitlines()) == 6
    assert run(f"grep -F 'band-03' {log} | tail -n 1").startswith('2026-10-19T09:19:00Z INFO')
    run('diff data/config/platform.conf.backup data/config/platform.conf', '3c3\n< retry_limit=1\n---\n> retry_limit=3', code=1)
    assert set(run("find data -name '*.conf*'").splitlines()) == {'data/config/platform.conf','data/config/platform.conf.backup'}
    run("cp -i work/reports/incident.txt 'work/reports/incident copy.txt'")
    run("diff work/reports/incident.txt 'work/reports/incident copy.txt'", '')
    assert not (base/'work/scratch/practice.txt').exists()
    assert (base/'work/scratch/platform-copy.conf').exists()
    assert (base/'work/reports/incident.txt').read_text() == 'PulseBridge: six failed upload attempts.\nThree attempts reported connection_refused.\n'
    assert (base/log).read_bytes() == (ROOT/'data/logs/platform.log').read_bytes()
assert snapshot() == before
print('PASS: core commands, fixture integrity and configuration')
