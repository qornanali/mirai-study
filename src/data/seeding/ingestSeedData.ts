import type { RenshuuDexieDatabase } from "../dexie";
import { adaptSeedKanjiItem } from "./kanjiVGAdapter";
import { adaptSeedSentenceItem, adaptSeedVocabItem } from "./jmdictAdapter";
import { rawSeedPackSchema, type RawSeedPack } from "./types";

export interface SeedIngestionResult {
  vocabInserted: number;
  kanjiInserted: number;
  sentencesInserted: number;
}

async function ingestSeedPacksInternal(
  database: RenshuuDexieDatabase,
  rawSeedPacks: RawSeedPack[],
): Promise<SeedIngestionResult> {
  const parsedPacks = rawSeedPacks.map((pack) => rawSeedPackSchema.parse(pack));
  const vocab = parsedPacks.flatMap((pack) =>
    pack.vocab.map(adaptSeedVocabItem),
  );
  const kanji = parsedPacks.flatMap((pack) =>
    pack.kanji.map(adaptSeedKanjiItem),
  );
  const sentences = parsedPacks.flatMap((pack) =>
    pack.sentences.map(adaptSeedSentenceItem),
  );
  const vocabIds = new Set(vocab.map((item) => item.id));

  for (const sentence of sentences) {
    for (const vocabId of sentence.vocabIds) {
      if (!vocabIds.has(vocabId)) {
        throw new Error(
          `Sentence ${sentence.id} references unknown vocabId ${vocabId}.`,
        );
      }
    }
  }

  await database.transaction(
    "rw",
    database.vocabItems,
    database.kanjiItems,
    database.sentenceItems,
    async () => {
      await database.vocabItems.bulkPut(vocab);
      await database.kanjiItems.bulkPut(kanji);
      await database.sentenceItems.bulkPut(sentences);
    },
  );

  return {
    vocabInserted: vocab.length,
    kanjiInserted: kanji.length,
    sentencesInserted: sentences.length,
  };
}

export async function ingestSeedData(
  database: RenshuuDexieDatabase,
  rawSeedPack: RawSeedPack,
): Promise<SeedIngestionResult> {
  return ingestSeedPacksInternal(database, [rawSeedPack]);
}

export async function ingestSeedDataBatch(
  database: RenshuuDexieDatabase,
  rawSeedPacks: RawSeedPack[],
): Promise<SeedIngestionResult> {
  return ingestSeedPacksInternal(database, rawSeedPacks);
}
