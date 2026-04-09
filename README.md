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
- Remote seed update via versioned manifest (manual, checksum-validated)

## Tech Stack

- React + TypeScript + Vite
- Dexie (IndexedDB)
- Zod runtime validation
- Wanakana (kana conversion)
- Vitest + Testing Library

## Getting Started

```bash
npm install
cp .env.example .env   # then fill in VITE_SEED_MANIFEST_URL
npm run dev
```

## Environment Variables

| Variable                 | Required | Description                                                                                             |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `VITE_SEED_MANIFEST_URL` | No       | GitHub raw URL to a `seed-manifest.json` artifact. Enables the "Check seed updates" action in Settings. |

Example:

```
VITE_SEED_MANIFEST_URL=https://raw.githubusercontent.com/<owner>/<repo>/main/seeds/v2026-04-09/seed-manifest.json
```

## Data and Seeding

Seed data is managed through a versioned pipeline:

1. **Source kana packs** live in `src/data/seeding/kana/` (N5, N4, N3 JSON files)
2. **Build input** — `npm run seed:prepare-input` reads those files and writes staging packs to `seeds/input/` (git-ignored)
3. **Emit artifacts** — `npm run seed:emit` reads `seeds/input/`, splits by type, computes SHA-256 checksums, and writes versioned output + a `seed-manifest.json` to `seeds/<version>/`
4. **Remote updates** — after publishing to GitHub, set `VITE_SEED_MANIFEST_URL` in `.env`; the app fetches the manifest, validates checksums and schema, and applies updates transactionally

## Scripts

| Command                      | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `npm run dev`                | Start Vite dev server                           |
| `npm run build`              | Typecheck + production build                    |
| `npm test`                   | Run all tests                                   |
| `npm run test:watch`         | Tests in watch mode                             |
| `npm run typecheck`          | TypeScript build checks only                    |
| `npm run seed:prepare-input` | Build seed staging input from kana source files |
| `npm run seed:emit`          | Emit versioned seed artifacts and manifest      |

## Quality Status

- Strict TypeScript enabled
- Tests passing for session planning, grading, seeding, and bootstrap flows
