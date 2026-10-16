"""Log in to Adressa in the scraper's own browser profile.

    uv run --group scraper python -m app.scraper.login    (make adressa-login)

Opens adressa.no in a visible Chrome window. Log in through the user menu, answer the cookie
question if asked, and close the window when done. The login stays in ADRESSA_PROFILE_DIR, outside
the repo, and only the scraper uses it. Only one program can use the profile at a time.
"""

import sys
from pathlib import Path

from app.config import settings
from app.scraper.adressa import ScraperError
from app.scraper.browser import AdressaBrowser
from app.scraper.run import check_profile

HOW_TO = """Logg inn via Brukermeny i Adressa-vinduet, og svar på informasjonskapsler om du blir spurt.
Lukk vinduet når du er ferdig. Innloggingen lagres bare i scraperens egen nettleserprofil."""


def main() -> None:
    profile = Path(settings.adressa_profile_dir).expanduser()
    try:
        check_profile(profile)
        print(HOW_TO)
        with AdressaBrowser(profile, channel=settings.adressa_browser) as browser:
            browser.login()
    except ScraperError as error:
        sys.exit(f"{error.code}: {error.message}")
    print("Vinduet er lukket. Hent saker med make scrape (når importen ikke er satt på pause).")


if __name__ == "__main__":
    main()
