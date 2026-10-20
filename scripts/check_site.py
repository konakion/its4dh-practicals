"""Validate generated local href/src targets, anchors, nav and publication boundary."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]/'site'
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__(); self.links=[]; self.ids=set(); self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.add(a['id'])
        for k in ('href','src'):
            if k in a:self.links.append(a[k])
assert ROOT.is_dir(), 'Build MkDocs first'
pages={p:Page(p.read_text()) for p in ROOT.rglob('*.html')}
count=0
for p,page in pages.items():
    for link in page.links:
        u=urlsplit(link)
        if u.scheme or u.netloc or u.path.startswith('/'):continue
        target=(p.parent/unquote(u.path)).resolve() if u.path else p.resolve()
        if target.is_dir():target=target/'index.html'
        assert target.is_file(),(p,link,target)
        if u.fragment and target.suffix=='.html':
            assert unquote(u.fragment) in pages[target].ids,(p,link,'missing anchor')
        count+=1
for forbidden in ['solutions','teaching']:
    assert not (ROOT/forbidden).exists()
    assert f'/{forbidden}/' not in (ROOT/'search/search_index.json').read_text()
assert len(pages)>=13
print(f'PASS: {len(pages)} HTML pages; {count} local links/assets/anchors; no legacy teaching or solutions pages')
