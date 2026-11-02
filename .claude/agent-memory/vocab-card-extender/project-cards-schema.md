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

**Categories observed (as of 2026-07-22):**
- `verb` — Dutch infinitives (includes eten, drinken added 2026-07-22; total verb count is large, always re-read file to verify)
- `noun` — nouns with article (de/het) in the word field
- `adjective`
- `pronoun`
- `article`
- `connector_and_adverb`
- `phrase` — full sentence starters, email openers, exam instructions
- `daily_phrase` — conversational everyday phrases

**Formatting:** 2-space indentation, keys in the order word/translation/example/exampleTranslation/category, double quotes, Unix line endings.

**Duplicate pitfalls:**
- A verb may appear as a word in a `phrase` or `daily_phrase` entry (e.g., "herhalen" appears in "Kunt u dat herhalen?" phrase card) — this does NOT count as a duplicate for the verb category.
- Multi-word verb expressions like "boodschappen doen", "vrij vragen", "contact opnemen" are accepted as verb entries.

**Why:** Needed to avoid schema drift and duplicate detection errors in future sessions. See [[project-cards-existing-verbs]] for the full verb inventory.
