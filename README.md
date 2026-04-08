# Mirai Study

Mirai Study is an offline-first Japanese learning PWA focused on daily practice from JLPT N5 to N3.

## Features

- Practice modes:
  - Never-ending streak mode (mixes listening, reading, and writing)
  - Listening-only mode (word or sentence)
  - Reading-only mode (word or sentence)
  - Writing-only mode (hiragana, katakana, or kanji)
- Daily goals for listening, reading, and writing with live progress tracking
- Furigana toggle support
- Kana input support with visible keyboard mode selector:
  - Auto
  - Hiragana
  - Katakana
- Kanji stroke practice module
- Offline-first data layer with IndexedDB (Dexie)
- PWA support with service worker update notifications

## Tech Stack

- React + TypeScript + Vite
- Dexie (IndexedDB)
- Zod runtime validation
- Wanakana (kana conversion)
- Vitest + Testing Library

## Data and Seeding

- Local seed packs for N5, N4, and N3 content
- Additional kana JSON seed packs by level:
  - `src/data/seeding/kana/n5.vocab.json`
  - `src/data/seeding/kana/n4.vocab.json`
  - `src/data/seeding/kana/n3.vocab.json`
- Remote enrichment is supported during bootstrap; local seed fallback is always available

## Scripts

- `npm run dev`: start dev server
- `npm run build`: typecheck + production build
- `npm test`: run tests
- `npm run test:watch`: test watch mode
- `npm run typecheck`: run TypeScript build checks

## Getting Started

```bash
npm install
npm run dev
```

## Quality Status

- Strict TypeScript enabled
- Tests passing for session planning, grading, seeding, and bootstrap flows
