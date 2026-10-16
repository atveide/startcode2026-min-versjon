"""Write the week's question pool, data/questions.json, from the local Adressa cache.

    uv run python -m app.generate_questions

For every imported story in ADRESSA_CACHE_DIR, Claude suggests sentences with one missing
word, written in its own words. A suggestion is kept only if the answer is in the story but
neither in the story's title (the quiz shows the title) nor in the sentence itself. The pool
holds just the sentence, the answer and the story id; the article text stays in the cache.
Each story gets two questions, so the daily game, which uses one question per story, varies
through the week.

The same run refreshes data/week.json from the cache, like `app.export_week`, so a new week
needs only the import and this command. Nothing is written unless there are enough questions
for a full day's game.
"""

import json
import re
import sys
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

import anthropic
from pydantic import BaseModel

from app import export_week
from app.config import settings
from app.headlines import BLANK, QUESTIONS_FILE, QUESTIONS_PER_DAY, Headline
from app.stories import Story, cache_dir, load_stories

MODEL = "claude-opus-5-5"
PER_STORY = 2  # questions per story, each with its own answer
SUGGESTIONS = 4  # per request, best first; the first ones that pass are kept
ATTEMPTS = 2  # requests per story before settling for fewer questions
COPIED_WORDS = 8  # this many words in a row from the story count as copying it

SYSTEM_PROMPT = f"""\
You write questions for «Dagens spill», a daily quiz that helps students in Trondheim \
keep up with this week's news from Adresseavisen. You get one story. Suggest \
{SUGGESTIONS} questions about it, best first, each with a different answer.

A question is one sentence in Norwegian bokmål with exactly one word replaced by {BLANK}. \
The player guesses the missing word.

The sentence:
- states an important fact from the story, in your own words. Do not copy phrases from \
the story.
- makes sense without the story, and gives enough context that someone who followed the \
news this week could guess the word.
- is short: at most about 20 words.

The missing word (the answer):
- is a single word, written exactly as it appears in the story (same form and spelling), \
so a player who gets stuck can find it there.
- does not appear in the story's title, not even in another form or inside a compound \
word. The quiz shows the title next to the question.
- does not appear anywhere else in the sentence.
- is a meaningful word central to the story, such as a thing, a place, an organisation or \
what happened. Not a number, not a private person's name, not a small word like a \
preposition."""


class Suggestion(BaseModel):
    text: str  # the sentence, with BLANK where the answer goes
    answer: str


class Suggestions(BaseModel):
    questions: list[Suggestion]


Ask = Callable[[Story], list[Suggestion]]


def _plain(text: str) -> str:
    """Lower case, without the soft hyphens Adressa puts inside long words in titles."""
    return text.replace("\u00ad", "").lower()


def _words(text: str) -> list[str]:
    return re.findall(r"[^\W_]+", _plain(text))


def _stem(word: str) -> str:
    """The start that other forms of a word share: «bolig» for «boligene» and «boliger»."""
    return word[: max(4, len(word) - 3)]


def gives_away(answer: str, text: str) -> bool:
    """True if the text holds the answer, also in another form or inside a longer word."""
    return _stem(_plain(answer)) in _plain(text)


def _copied(sentence: str, story_text: str) -> bool:
    words = _words(sentence)
    source = f" {' '.join(_words(story_text))} "
    return any(
        f" {' '.join(words[i : i + COPIED_WORDS])} " in source
        for i in range(len(words) - COPIED_WORDS + 1)
    )


def problems(headline: Headline, story: Story) -> list[str]:
    """Why a question can't be used with its story; empty if it can."""
    answer = headline.answer
    found = []
    if headline.text.count(BLANK) != 1:
        found.append(f"setningen må ha nøyaktig én {BLANK}")
    if not re.fullmatch(r"[^\W_]+(-[^\W_]+)*", answer):
        found.append("svaret må være ett ord")
    if not re.search(rf"(?<!\w){re.escape(_plain(answer))}(?!\w)", _plain(story.text)):
        found.append("svaret står ikke i saken")
    if gives_away(answer, story.title):
        found.append("svaret står i tittelen")
    if gives_away(answer, headline.text):
        found.append("svaret står i setningen")
    if _copied(headline.full_text, story.text):
        found.append("setningen er kopiert fra saken")
    return found


def questions_for(story: Story, ask: Ask) -> tuple[list[Headline], list[str]]:
    """The first suggestions for the story that pass, and why the others didn't."""
    kept: list[Headline] = []
    rejected = []
    for _ in range(ATTEMPTS):
        for suggestion in ask(story):
            headline = Headline(0, suggestion.text.strip(), suggestion.answer.strip(), story.id)
            found = problems(headline, story)
            if any(gives_away(h.answer, headline.answer) for h in kept):
                found.append("samme svar som et annet spørsmål om saken")
            if found:
                rejected.append(f"«{headline.text}» [{headline.answer}]: {', '.join(found)}")
                continue
            kept.append(headline)
            if len(kept) == PER_STORY:
                return kept, rejected
    return kept, rejected


def build_pool(stories: list[Story], ask: Ask) -> list[dict]:
    """The questions for every story, in story order. A story with none is left out."""
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda story: questions_for(story, ask), stories))
    questions = []
    for story, (headlines, rejected) in zip(stories, results):
        for reason in rejected:
            print(f"  Forkastet ({story.id}) {reason}")
        if not headlines:
            print(f"  Ingen gyldige spørsmål for {story.id}, saken er utelatt")
        questions += [
            {"text": h.text, "answer": h.answer, "story_id": h.story_id} for h in headlines
        ]
    return questions


def _story_prompt(story: Story) -> str:
    parts = [f"Tittel: {story.title}"]
    if story.lead:
        parts.append(f"Ingress: {story.lead}")
    if story.summary:
        parts.append("Kort oppsummert:\n" + "\n".join(f"- {b}" for b in story.summary.bullets))
    for block in story.body:
        if block.text:
            parts.append(block.text)
        if block.items:
            parts.append("\n".join(f"- {item}" for item in block.items))
    return "\n\n".join(parts)


def ask_claude(story: Story) -> list[Suggestion]:
    response = client.beta.messages.parse(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _story_prompt(story)}],
        output_format=Suggestions,
        output_config={"effort": "high"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    )
    suggestions = response.parsed_output
    if response.stop_reason == "refusal" or suggestions is None:
        raise RuntimeError(f"No questions for {story.id} (stop_reason={response.stop_reason})")
    return suggestions.questions


# An empty ANTHROPIC_API_KEY= in .env counts as unset.
client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None)


def main() -> None:
    folder = cache_dir()
    if folder is None:
        sys.exit("Sett ADRESSA_CACHE_DIR i backend/.env til mappen med articles.json")
    stories = [s for s in load_stories()[0] if s.imported]
    if not stories:
        sys.exit(f"Fant ingen importerte saker i {folder / 'articles.json'}")

    print(f"Lager spørsmål til {len(stories)} saker med {MODEL} …")
    questions = build_pool(stories, ask_claude)
    if len({q["story_id"] for q in questions}) < QUESTIONS_PER_DAY:
        sys.exit(
            f"Bare {len(questions)} saker fikk et gyldig spørsmål, og dagens spill trenger "
            f"{QUESTIONS_PER_DAY}. Ingenting er skrevet."
        )

    week = export_week.write(folder / "articles.json")
    QUESTIONS_FILE.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Skrev {len(questions)} spørsmål for uke {week['week']} til {QUESTIONS_FILE}")


if __name__ == "__main__":
    main()
