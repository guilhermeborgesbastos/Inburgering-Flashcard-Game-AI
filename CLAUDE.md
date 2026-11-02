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
  Anything not excluded in `scripts/deploy-s3.ps1` gets published — add an `--exclude` there when introducing new non-site files. `index.html` is excluded from the sync and uploaded last with `Cache-Control: no-cache`, so new deploys show up without a CloudFront invalidation.
- **Asset versions:** `index.html` loads `style.css` and `app.js` with `?v=<first 12 hex chars of the file's SHA-256>`. After editing either file, update its value (`sha256sum assets/js/app.js | cut -c1-12`); the deploy script refuses to run otherwise.

## Architecture

Three files make up the app:

- `index.html` — static markup with fixed element IDs that `app.js` binds to at load time; also contains the inline GA4 `gtag` snippet (`G-21RSDRNMG3`).
- `assets/js/app.js` — all logic in a single global-scope script (no modules). State is a few top-level `let`s: `allCards`, `filteredCards`, `currentIndex`, `isFlipped`, `selectedCategory`, plus `decks` (per-deck progress). Flow: `initializeApp()` → `loadCards()` (fetch + `normalizeCards`) → `restoreProgress(loadProgress())` → `populateCategoryFilter()` (builds category chip buttons with counts from distinct `category` values, so new categories appear automatically) → `showDeck()` → `updateCard()`, which rebuilds both card faces with `createElement`/`textContent` and updates progress.
- **Progress model:** `decks[category]` (`'all'` or a category) is `{ order: [card keys], index }`, keyed by `category|word`. `index === order.length` means the deck is finished (`isFinished()`), which shows a "Deck complete" message and turns the Reveal button into Start over. Navigation never wraps, so cards don't repeat until the deck is finished or reset. Shuffle (Fisher–Yates) only reorders cards from `currentIndex` on. `syncDeck()` reconciles saved order with the current `cards.json` (drops removed cards, appends new ones unseen). Everything is saved to `localStorage` under `inburgering-progress-v1` by `saveProgress()`, which is guarded by `progressReady` so a failed or empty load never overwrites saved progress. The small `#start-over-btn` link needs a second tap to confirm (`START_OVER_CONFIRM_MS`). `resetCardFlip()` snaps back to the front with transitions disabled so the next card's meaning never shows mid-rotation; `updateFlipState()` keeps the `.flip` class, aria attributes and the Reveal button label in sync. Input: click/Enter/Space flips, ←/→ navigate, horizontal swipe on the card navigates (a click within 400ms of a swipe is ignored). Pronunciation uses the Web Speech API (`speechSynthesis`, `lang = 'nl-NL'`); playing the word flips to the front, playing the phrase flips to the back. Speed is native radio inputs styled as a segmented control. User interactions call `trackEvent()` for GA.
- `assets/css/style.css` — single stylesheet driven by `:root` tokens (warm ivory / deep teal / burnt-orange accent; Fraunces for Dutch words and headings, Manrope for UI, loaded from Google Fonts in `index.html`). Card flip is a CSS 3D transform toggled by `.flip`, with a crossfade fallback under `prefers-reduced-motion`. Under 640px the category chips scroll horizontally and `.action-bar` (Previous / Reveal / Next) is sticky to the bottom. The `html`/`body` height rules (`100dvh`, `-webkit-fill-available`, `overscroll-behavior-y`) are a deliberate fix for a bottom-of-page jump in Chrome on iPhone — don't "simplify" them back to `100vh`.

## Card data (`assets/data/cards.json`)

Flat JSON array; every entry has exactly these string fields, in this key order, 2-space indent:

```json
{ "word": "...", "translation": "...", "example": "...", "exampleTranslation": "...", "category": "verb" }
```

- `category` is lowercase snake_case (`verb`, `noun`, `adjective`, `pronoun`, `article`, `connector_and_adverb`, `phrase`, `daily_phrase`); displayed via `titleCaseCategory()`. Missing category falls back to `general`.
- Nouns include their article in `word` (e.g. `de afspraak`). New entries are appended to the end; no IDs or ordering.
- Words or translations longer than `LONG_WORD_LENGTH` (22 chars) get a smaller `.is-long` type size; card faces have a fixed height and the back scrolls if content overflows.
- `.claude/agent-memory/vocab-card-extender/` holds notes from a card-extending agent (schema, duplicate-detection pitfalls) — consult it before bulk-adding cards.

## Conventions

- Commit messages use a `(feat)` / `(fix)` prefix, e.g. `(fix) mitigate the bottom-of-page jump issue...`.
- `app.js` and `README.md` are saved as UTF-8 with BOM; preserve that when editing.
