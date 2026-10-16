"""The scraper's browser: Google Chrome through Playwright, on its own profile with the user's saved
Adressa login.

Pages are read the way a logged-in reader sees them. extract_page.js decides from the rendered
page alone whether the article is readable, and only visible text is ever returned. Top-level
navigation can never leave adressa.no, not even through a redirect, and pages are opened at most
one every 1.2 seconds. Errors carry only a code and a fixed message, never the browser's own
error text, which can contain session URLs.
"""

import time
from contextlib import suppress
from pathlib import Path
from typing import Self
from urllib.parse import urljoin

from playwright.sync_api import BrowserContext, Page, Playwright, Route, sync_playwright
from playwright.sync_api import Error as PlaywrightError

from app.scraper.adressa import HOME, ScraperError, safe_url

_HERE = Path(__file__).parent
# Wrapped in parentheses so page.evaluate gets a function to call, not a declaration.
EXTRACT_PAGE = f"({(_HERE / 'extract_page.js').read_text(encoding='utf-8')})"
EXTRACT_STRUCTURE = f"({(_HERE / 'extract_structure.js').read_text(encoding='utf-8')})"
PAGE_GAP = 1.2  # seconds between two article pages
READY = (
    "() => document.querySelector("
    "'article#main-article .article-body p, iframe#dakapopaywall, main h1, article h1')"
)


class AdressaBrowser:
    """Opened on first use and closed by close(), or by leaving a `with` block."""

    def __init__(self, profile_dir: Path, *, channel: str = "chrome", headless: bool = True):
        self.profile_dir = profile_dir
        self.channel = channel
        self.headless = headless
        self._playwright: Playwright | None = None
        self._context: BrowserContext | None = None
        self._last_page = 0.0

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def _open(self) -> BrowserContext:
        if self._context is not None:
            return self._context
        self.profile_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.profile_dir.chmod(0o700)
        try:
            self._playwright = sync_playwright().start()
            self._context = self._playwright.chromium.launch_persistent_context(
                self.profile_dir,
                channel=None if self.channel == "chromium" else self.channel,
                headless=self.headless,
                locale="nb-NO",
                timezone_id="Europe/Oslo",
                viewport={"width": 1440, "height": 1000},
                accept_downloads=False,
                service_workers="block",
            )
        except PlaywrightError:
            self.close()
            raise ScraperError(
                "BROWSER_UNAVAILABLE",
                "Nettleseren kunne ikke åpnes. Lukk andre vinduer som bruker Adressa-profilen. "
                "Installer Google Chrome, eller sett ADRESSA_BROWSER=chromium og kjør "
                "`uv run --group scraper playwright install chromium`.",
            ) from None
        self._context.set_default_timeout(12_000)
        self._context.set_default_navigation_timeout(25_000)
        return self._context

    def read(self, url: str) -> tuple[dict, dict | None]:
        """What the logged-in article page shows.

        Returns extract_page.js's view of the page, and, only when it found the article readable
        («available»), the page's structure from extract_structure.js.
        """
        url = safe_url(url, article=True)
        wait = PAGE_GAP - (time.monotonic() - self._last_page)
        if wait > 0:
            time.sleep(wait)
        self._last_page = time.monotonic()
        page = self._open().new_page()
        try:
            page.route("**/*", lambda route: _stay_on_adressa(page, route))
            _navigate(page, url)
            safe_url(page.url, article=True)
            visible = page.evaluate(EXTRACT_PAGE)
            if visible["access"]["state"] != "available":
                return visible, None
            return visible, page.evaluate(EXTRACT_STRUCTURE, visible["body"].split("\n\n"))
        finally:
            with suppress(PlaywrightError):
                page.close()

    def login(self) -> None:
        """Open adressa.no in a visible window and wait until the user has closed it."""
        self.headless = False
        context = self._open()
        page = context.pages[0] if context.pages else context.new_page()
        try:
            page.goto(HOME, wait_until="domcontentloaded")
        except PlaywrightError:
            raise ScraperError(
                "NAVIGATION_FAILED", "Kunne ikke åpne adressa.no. Kontroller nettet og prøv igjen."
            ) from None
        with suppress(PlaywrightError):  # raised when the whole browser is closed
            while open_pages := [p for p in context.pages if not p.is_closed()]:
                open_pages[0].wait_for_event("close", timeout=0)

    def close(self) -> None:
        context, playwright = self._context, self._playwright
        self._context = self._playwright = None
        if context is not None:
            with suppress(PlaywrightError):
                context.close()
        if playwright is not None:
            with suppress(PlaywrightError):
                playwright.stop()


def _navigate(page: Page, url: str) -> None:
    try:
        response = page.goto(url, wait_until="domcontentloaded")
    except PlaywrightError:
        raise ScraperError(
            "NAVIGATION_FAILED", "Siden kunne ikke åpnes. Kontroller nettet og innloggingen."
        ) from None
    if response is None or response.status >= 400:
        raise ScraperError(
            "SITE_UNAVAILABLE", "Adressa returnerte en feil eller avviste forespørselen."
        )
    # Wait for the page's own rendering and paywall decision; hidden bodies are never requested.
    with suppress(PlaywrightError):
        page.wait_for_function(READY, timeout=10_000)
    page.wait_for_timeout(1500)


def _stay_on_adressa(page: Page, route: Route) -> None:
    """Top-level navigations may never leave adressa.no, not even through a redirect."""
    request = route.request
    try:
        if not (request.is_navigation_request() and request.frame == page.main_frame):
            route.continue_()
            return
        url = request.url
        for _ in range(6):
            safe_url(url)
            response = route.fetch(url=url, max_redirects=0, timeout=25_000)
            try:
                location = response.headers.get("location")
                if 300 <= response.status < 400 and location:
                    # Checked before any redirected request is made, same-page redirects too.
                    url = urljoin(url, location)
                    safe_url(url)
                    continue
                route.fulfill(response=response)
                return
            finally:
                response.dispose()
    # Anything else ends in the generic navigation failure; never with session URLs.
    except (PlaywrightError, ScraperError):
        pass
    with suppress(PlaywrightError):
        route.abort()
