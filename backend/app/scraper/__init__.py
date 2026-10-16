"""The scraper: the week's student-relevant Adressa articles, read with the user's own login.

    uv run --group scraper python -m app.scraper          # import (make scrape)
    uv run --group scraper python -m app.scraper.login    # log in again (make adressa-login)

run.py is the import job, adressa.py the selection and other pure helpers, browser.py the
logged-in Chrome, and the .js files what runs inside the article page.
"""
