# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static, no-build flashcard web app for Dutch inburgering (A1/A2) vocabulary. Plain HTML/CSS/vanilla JS — no package manager, bundler, linter, or test suite. Live at https://inburgering.guilhermeborgesbastos.com/ (S3 + CloudFront).

## Commands

- **Run locally:** serve the repo root over HTTP — opening `index.html` via `file://` breaks the `fetch` of `cards.json`.
  ```bash
  python3 -m http.server 8000   # then open http://localhost:8000
  ```
- **Validate card data** after editing (there are no tests; this is the main sanity check):
  ```bash
  python3 -c "import json,collections;d=json.load(open('assets/data/cards.json'));print(len(d),collections.Counter(c['category'] for c in d))"
  ```
- **Deploy** (PowerShell + AWS CLI; syncs repo root to S3 with `--delete`, excluding `.git`, `scripts/`, `README.md`, etc.):
  ```powershell
  ./scripts/deploy-s3.ps1 -DryRun
  ./scripts/deploy-s3.ps1 -BucketName inburgering -CloudFrontDistributionId <id>
  ```
  Anything not excluded in `scripts/deploy-s3.ps1` gets published — add an `--exclude` there when introducing new non-site files.

## Architecture

Three files make up the app:

- `index.html` — static markup with fixed element IDs that `app.js` binds to at load time; also contains the inline GA4 `gtag` snippet (`G-21RSDRNMG3`).
- `assets/js/app.js` — all logic in a single global-scope script (no modules). State is a few top-level `let`s: `allCards`, `filteredCards`, `currentIndex`, `isFlipped`. Flow: `initializeApp()` → `loadCards()` (fetch + `normalizeCards`) → `populateCategoryFilter()` (derived from distinct `category` values, so new categories appear automatically) → `updateCard()`. Navigation, shuffle (Fisher–Yates on `filteredCards`), and category filtering all mutate `filteredCards`/`currentIndex` then call `updateCard()`, which re-renders the card and the progress UI. Pronunciation uses the Web Speech API (`speechSynthesis`, `lang = 'nl-NL'`); playing the word flips to the front, playing the phrase flips to the back. User interactions call `trackEvent()` for GA.
- `assets/css/style.css` — single stylesheet; card flip is a CSS 3D transform toggled by the `.flip` class. The `html`/`body` height rules (`100dvh`, `-webkit-fill-available`, `overscroll-behavior-y`) are a deliberate fix for a bottom-of-page jump in Chrome on iPhone — don't "simplify" them back to `100vh`.

## Card data (`assets/data/cards.json`)

Flat JSON array; every entry has exactly these string fields, in this key order, 2-space indent:

```json
{ "word": "...", "translation": "...", "example": "...", "exampleTranslation": "...", "category": "verb" }
```

- `category` is lowercase snake_case (`verb`, `noun`, `adjective`, `pronoun`, `article`, `connector_and_adverb`, `phrase`, `daily_phrase`); displayed via `titleCaseCategory()`. Missing category falls back to `general`.
- Nouns include their article in `word` (e.g. `de afspraak`). New entries are appended to the end; no IDs or ordering.
- Card fields are injected with `innerHTML` unescaped, so avoid raw `<`/`&` in text.
- `.claude/agent-memory/vocab-card-extender/` holds notes from a card-extending agent (schema, duplicate-detection pitfalls) — consult it before bulk-adding cards.

## Conventions

- Commit messages use a `(feat)` / `(fix)` prefix, e.g. `(fix) mitigate the bottom-of-page jump issue...`.
- `app.js` and `README.md` are saved as UTF-8 with BOM; preserve that when editing.
