"""The scraper's browser in a real headless Chrome, against pages served from this machine.

Never contacts adressa.no: the URL policy is swapped for one that allows only 127.0.0.1.
Skipped where Playwright (uv sync --group scraper) or Google Chrome is missing.
"""

import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

import pytest

pytest.importorskip("playwright")

from app.scraper import browser as browser_module
from app.scraper.adressa import ScraperError
from app.scraper.browser import AdressaBrowser

PARAGRAPH = (
    "Studentene i Trondheim får flere boliger neste høst. Sit bygger nye hybler på Moholt, "
    "og de første kan flytte inn i august. Det er godt nytt for alle som står i kø."
)
ARTICLE = f"""<!doctype html>
<html><head>
<title>Ny studentbolig</title>
<link rel="canonical" href="https://www.adressa.no/nyheter/trondheim/i/abc123/ny-studentbolig">
<meta property="og:image" content="https://vcdn.polarismedia.no/og?w=1200">
</head><body>
<article id="main-article">
  <header class="article-header"><h1>Studentene får ny studentbolig</h1>
    <p class="lead">Sit bygger 300 nye hybler.</p></header>
  <div class="article-body">
    <div class="ArticleSummary"><h2>Kort oppsummert</h2>
      <ul><li>Sit bygger 300 hybler.</li><li>Innflytting i august.</li></ul>
      <small>Oppsummeringen er laget med KI og kontrollert av redaksjonen.
        <a href="https://www.adressa.no/om/i/ki1/ki">Les mer</a></small></div>
    <p>{PARAGRAPH}</p>
    <h2>Lang kø</h2>
    <p>{PARAGRAPH} Køen er lang.</p>
    <ul><li>Moholt studentby</li><li>Gløshaugen</li></ul>
    <p>{PARAGRAPH} Mer kommer.</p>
  </div>
</article>
</body></html>"""
PAYWALLED = ARTICLE.replace(
    '<div class="article-body">',
    '<iframe id="dakapopaywall"></iframe><div class="article-body">',
)
PAGES = {
    "/nyheter/trondheim/i/abc123/ny-studentbolig": ARTICLE,
    "/nyheter/trondheim/i/pay123/betalt": PAYWALLED,
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/nyheter/i/away123/videre":
            self.send_response(302)
            self.send_header("Location", "https://example.com/")
            self.end_headers()
            return
        page = PAGES.get(self.path)
        self.send_response(200 if page else 404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write((page or "").encode())

    def log_message(self, *args):
        pass


def local_only(value: str, *, article: bool = False) -> str:
    parts = urlsplit(value)
    if parts.hostname != "127.0.0.1":
        raise ScraperError("INVALID_URL", "Bare HTTPS-adresser på adressa.no er tillatt.")
    if article and "/i/" not in parts.path:
        raise ScraperError("INVALID_ARTICLE", "Bruk en artikkellenke.")
    return value


@pytest.fixture
def site(monkeypatch):
    monkeypatch.setattr(browser_module, "safe_url", local_only)
    monkeypatch.setattr(browser_module, "PAGE_GAP", 0)
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()


@pytest.fixture
def chrome(tmp_path):
    browser = AdressaBrowser(tmp_path / "profile")
    try:
        browser._open()
    except ScraperError:
        pytest.skip("Google Chrome kunne ikke åpnes")
    yield browser
    browser.close()


def test_a_readable_article_gives_its_text_summary_and_structure(site, chrome):
    visible, structure = chrome.read(f"{site}/nyheter/trondheim/i/abc123/ny-studentbolig")
    assert visible["access"]["state"] == "available"
    assert visible["title"] == "Studentene får ny studentbolig"
    assert visible["url"] == "https://www.adressa.no/nyheter/trondheim/i/abc123/ny-studentbolig"
    assert structure["lead"] == "Sit bygger 300 nye hybler."
    assert structure["summary"] == {
        "heading": "Kort oppsummert",
        "bullets": ["Sit bygger 300 hybler.", "Innflytting i august."],
        "disclosure": "Oppsummeringen er laget med KI og kontrollert av redaksjonen.",
        "disclosureUrl": "https://www.adressa.no/om/i/ki1/ki",
    }
    assert [b["type"] for b in structure["blocks"]] == [
        "paragraph",
        "heading",
        "paragraph",
        "list",
        "paragraph",
    ]
    assert structure["blocks"][3]["items"] == ["Moholt studentby", "Gløshaugen"]
    assert structure["ogImage"] == "https://vcdn.polarismedia.no/og?w=1200"


def test_a_paywalled_article_gives_no_structure(site, chrome):
    visible, structure = chrome.read(f"{site}/nyheter/trondheim/i/pay123/betalt")
    assert visible["access"]["state"] in ("partial", "restricted")
    assert "gate" in visible["access"]["reason"]
    assert structure is None


def test_a_redirect_off_the_site_is_never_followed(site, chrome):
    with pytest.raises(ScraperError) as error:
        chrome.read(f"{site}/nyheter/i/away123/videre")
    assert error.value.code == "NAVIGATION_FAILED"
