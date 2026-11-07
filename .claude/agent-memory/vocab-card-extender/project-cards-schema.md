---
name: project-cards-schema
description: Schema, conventions, and category taxonomy for assets/data/cards.json in the Dutch inburgering flashcard app
metadata:
  type: project
---

The data file is a flat JSON array at `assets/data/cards.json`. Each entry has exactly these fields (all strings, all required):

- `word` — Dutch word, phrase, or multi-word expression
- `translation` — English equivalent
- `example` — Dutch example sentence
- `exampleTranslation` — English translation of the example sentence
- `category` — free-form lowercase string with underscores

There are no IDs, no nesting, no optional fields. New entries are appended to the end of the array. No alphabetical or other ordering is enforced within categories.

**Categories and counts (as of 2026-11-06, 463 cards; always re-read the file to verify):**
- `verb` (97) — Dutch infinitives
- `noun` (146) — nouns with article (de/het) in the word field
- `adjective` (45)
- `pronoun` (17) — paired forms use a slash, e.g. `jij / je`, `zij / ze`, `onze / ons`
- `article` (3)
- `connector_and_adverb` (34)
- `phrase` (71) — full sentence starters, email openers, exam instructions
- `daily_phrase` (18) — conversational everyday phrases (greetings, small talk, "Kunt u dat herhalen?")
- `abbreviation` (32) — Dutch abbreviations as written (`bijv.`, `t/m`, `BSN`, `DigiD`); the translation gives the English meaning followed by the full Dutch form in parentheses, e.g. `for example (bijvoorbeeld)`

**Formatting:** 2-space indentation, keys in the order word/translation/example/exampleTranslation/category, double quotes, Unix line endings.

**Duplicate pitfalls:**
- A verb may appear as a word in a `phrase` or `daily_phrase` entry (e.g., "herhalen" appears in the "Kunt u dat herhalen?" daily_phrase card) — this does NOT count as a duplicate for the verb category.
- Multi-word verb expressions like "boodschappen doen", "vrij vragen", "contact opnemen" are accepted as verb entries.

**Why:** Needed to avoid schema drift and duplicate detection errors in future sessions. See [[project-cards-existing-verbs]] for the full verb inventory.
