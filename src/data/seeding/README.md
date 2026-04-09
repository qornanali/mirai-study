# Seed Data

This folder contains the full seed pipeline: extraction, normalization, artifact emission, and remote update logic.

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

| File                  | Purpose                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `types.ts`            | Core seed pack contracts (`RawSeedPack`, `VocabItem`, etc.)                   |
| `seedManifest.ts`     | Zod schema for `seed-manifest.json`                                           |
| `extractionTypes.ts`  | Intermediate record types produced by source extractors                       |
| `idGeneration.ts`     | Deterministic ID generation (vocab hash, kanji codepoint, sentence source ID) |
| `extractors/`         | Per-source extractor modules (JMDict, KanjiAPI, Tatoeba) + orchestrator       |
| `normalizeAndLink.ts` | Phase 4-5: dedup, JLPT inference, sentence → vocab linking, QA report         |
| `ingestSeedData.ts`   | Transactional Dexie ingestion for single and batch packs                      |
| `remoteSeedUpdate.ts` | Remote manifest fetch, checksum verify, schema parse, and apply               |

## Remote Update Flow

1. App reads `VITE_SEED_MANIFEST_URL` from env
2. Fetches `seed-manifest.json`; compares `manifestVersion` against stored value in IndexedDB
3. If newer: downloads each pack, verifies SHA-256, Zod-validates, applies via `ingestSeedDataBatch`
4. Persists new `remoteSeedManifestVersion` only after full success (rollback-safe)
