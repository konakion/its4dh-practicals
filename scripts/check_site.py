"""Validate the generated site/: local links, assets and the GitHub Pages base path."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1] / 'site'


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links = []
        self.ids = set()
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.add(a['id'])
        for k in ('href', 'src'):
            if k in a:
                self.links.append(a[k])


assert ROOT.is_dir(), 'Build the site first: mkdocs build --strict'
pages = {p: Page(p.read_text()) for p in ROOT.rglob('*.html') if p.name != '404.html'}
count = 0
for p, page in pages.items():
    for link in page.links:
        u = urlsplit(link)
        if u.scheme or u.netloc or link.startswith('#'):
            continue
        # Absolute paths would break under the /its4dh-practicals/ base path.
        assert not u.path.startswith('/'), (p, link, 'absolute path breaks the Pages base path')
        target = (p.parent / unquote(u.path)).resolve()
        if target.is_dir():
            target = target / 'index.html'
        assert target.is_file(), (p, link, target)
        count += 1
assert (ROOT / 'index.html').is_file() and (ROOT / 'about/index.html').is_file() and (ROOT / '404.html').is_file()
index = (ROOT / 'index.html').read_text()
for script in ['linux-session.js', 'practical-01.js', 'course-app.js']:
    assert f'assets/{script}' in index, script
print(f'PASS: {len(pages)} pages, {count} local links and assets, all relative to the base path')
