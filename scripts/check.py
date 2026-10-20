"""Execute handbook command blocks in an isolated copy; no third-party packages."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import sys
ROOT = Path(__file__).resolve().parents[1]
def snapshot():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (ROOT/'data').rglob('*') if p.is_file()}
before = snapshot()
config = json.loads((ROOT/'.devcontainer/devcontainer.json').read_text())
assert config['remoteUser'] == 'vscode'
assert (ROOT/'.devcontainer'/config['build']['dockerfile']).is_file()
assert set(p.name for p in (ROOT/'docs').glob('*.md')) == {
    'index.md','setup.md','01-motivation.md','02-orientation.md','03-navigation.md',
    '04-files.md','05-logs.md','06-pipelines.md','07-mission.md','recap.md','08-deep-dives.md','sources.md'}
for page in (ROOT/'docs').glob('*.md'):
    for link in re.findall(r'\]\(([^)]+)\)', page.read_text()):
        if '://' not in link and not link.startswith('#'):
            assert (page.parent/link.split('#')[0]).is_file(), (page,link)
with tempfile.TemporaryDirectory(prefix='pulsebridge-check-') as folder:
    base = Path(folder)
    shutil.copytree(ROOT/'data',base/'data')
    def run(cmd,expected=None,code=0):
        r = subprocess.run(['bash','-e','-o','pipefail','-c',cmd],cwd=base,
                           input='y\ny\n',text=True,capture_output=True)
        assert r.returncode == code,(cmd,r.stdout,r.stderr,r.returncode)
        if expected is not None:
            assert r.stdout.strip() == expected,(cmd,r.stdout,expected)
        return r.stdout
    blocks=[]
    for p in sorted((ROOT/'docs').glob('0[1-7]-*.md')):
        for block in re.findall(r'```bash\n(.*?)```',p.read_text(),re.S):
            # Interactive viewer gets a separate smoke test; keep one Bash session
            # so ROOT survives navigation exercises.
            blocks.append('\n'.join(line for line in block.splitlines()
                                    if not line.startswith('less ')))
    run('\n'.join(blocks))
    log='work/logs/platform.log'
    for cmd,out in [
        (f'wc -l < {log}','20'),
        (f"grep -c -F ' ERROR ' {log}",'6'),
        (f"grep -c -F ' WARN ' {log}",'3'),
        (f"grep -F ' ERROR ' {log} | grep -F band-03 | wc -l",'3'),
        (f"grep -F band-03 {log} | wc -l",'6'),
        (f"grep -F band-03 {log} | tail -n 1",'2026-10-19T09:19:00Z INFO gateway band-03 upload accepted')]:
        # wc padding is platform-dependent
        run(cmd,out)
    run("grep -F connection_refused work/logs/platform.log > work/reports/storage-errors.txt")
    run('wc -l < work/reports/storage-errors.txt','3')
    assert [int(x.split(':')[0]) for x in run(f"grep -n -F connection_refused {log}").splitlines()] == [6,10,15]
    assert [int(x.split(':')[0]) for x in run(f"grep -n -F ' WARN ' {log}").splitlines()] == [3,9,18]
    grouped=run("cut -d ' ' -f 2 work/logs/platform.log | sort | uniq -c")
    assert [x.split() for x in grouped.splitlines()] == [['6','ERROR'],['11','INFO'],['3','WARN']]
    # Core mini-exercises
    run('cd data/config; ls; cd ../..; touch work/scratch/second.txt; cp work/scratch/second.txt work/scratch/second-copy.txt; rm -i work/scratch/second-copy.txt')
    run('cp work/scratch/platform-copy.conf "work/scratch/config copy.txt"')
    run('diff work/scratch/platform-copy.conf "work/scratch/config copy.txt"','')
    assert (base/log).read_bytes() == (ROOT/'data/logs/platform.log').read_bytes()
    assert not (base/'work/scratch/practice.txt').exists()
    # Semantic diff checks: no dependency on BSD/GNU normal-diff hunk formatting.
    old=base/'data/config/platform.conf.backup'; new=base/'data/config/platform.conf'
    assert old.read_text().splitlines()[2] == 'retry_limit=1'
    assert new.read_text().splitlines()[2] == 'retry_limit=3'
    diff=run('diff -u data/config/platform.conf.backup data/config/platform.conf',code=1)
    assert '-retry_limit=1' in diff and '+retry_limit=3' in diff
    run('diff data/logs/platform.log work/logs/platform.log','')
    run('diff data/config/platform.conf.backup data/config/platform.conf',code=1)
    assert set(run("find data -name '*.conf*'").splitlines()) == {'data/config/platform.conf','data/config/platform.conf.backup'}
    # Execute the noninteractive optional blocks verbatim.
    deep=(ROOT/'docs/08-deep-dives.md').read_text()
    for block in re.findall(r'```bash\n(.*?)```',deep,re.S):
        if any(s in block for s in ['diff -u', 'http.server','curl --fail','nano ','vim ','tail -n 1 work/scratch/editor']):
            continue
        run("shopt -s expand_aliases\n"+'\n'.join(line for line in block.splitlines() if line != 'man grep' and not (line == 'grep --help' and sys.platform == 'darwin')))
    # Real local HTTP request, no external network dependency.
    from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
    from functools import partial
    from threading import Thread
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(base/'data')))
    worker=Thread(target=server.serve_forever,daemon=True); worker.start()
    try:
        port=server.server_address[1]
        run(f'curl --fail --silent --show-error http://127.0.0.1:{port}/README.txt > work/scratch/downloaded-readme.txt')
        run('diff data/README.txt work/scratch/downloaded-readme.txt','')
    finally:
        server.shutdown(); server.server_close(); worker.join()
assert snapshot() == before
print('PASS: core handbook blocks, exercises, mission counts, optional noninteractive labs, semantic diff, local HTTP, fixture integrity and configuration')
print('MANUAL: less/man/editor keystrokes, Tab/history, Codespace creation and actual SSH transfers require interactive acceptance.')
