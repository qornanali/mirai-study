# Seed Data

This folder contains the runtime seeding contracts, adapters, and manifest updater.

## Pipeline Overview

```
seeds/input/*.json
    └─ seed:emit ──► seeds/<version>/
                         ├── jlpt-n5-vocab.json
                         ├── jlpt-n4-vocab.json
                         ├── jlpt-n3-vocab.json
                         └── seed-manifest.json
```

## Key Modules

| File                  | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `types.ts`            | Core seed pack contracts (`RawSeedPack`, `VocabItem`, etc.)     |
| `seedManifest.ts`     | Zod schema for `seed-manifest.json`                             |
| `kanaStrokeSeed.ts`   | Remote pack loader + validation for kana stroke trainer         |
| `ingestSeedData.ts`   | Transactional Dexie ingestion for single and batch packs        |
| `remoteSeedUpdate.ts` | Remote manifest fetch, checksum verify, schema parse, and apply |

## Remote Update Flow

1. App reads `VITE_SEED_MANIFEST_URL` from env
2. Fetches `seed-manifest.json`; compares `manifestVersion` against stored value in IndexedDB
3. If newer: downloads each pack, verifies SHA-256, Zod-validates, applies via `ingestSeedDataBatch`
4. Persists new `remoteSeedManifestVersion` only after full success (rollback-safe)
