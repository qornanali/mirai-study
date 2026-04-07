import type { RenshuuDexieDatabase } from "../../data/dexie";
import { ingestSeedData } from "../../data/seeding/ingestSeedData";
import { starterN5Seed } from "../../data/seeding/starterN5Seed";

export interface AppContentSummary {
  vocab: number;
  kanji: number;
  sentences: number;
}

export interface AppBootstrapResult {
  seeded: boolean;
  seedPackId: string | null;
  summary: AppContentSummary;
}

async function getContentSummary(
  database: RenshuuDexieDatabase,
): Promise<AppContentSummary> {
  const [vocab, kanji, sentences] = await Promise.all([
    database.vocabItems.count(),
    database.kanjiItems.count(),
    database.sentenceItems.count(),
  ]);

  return { vocab, kanji, sentences };
}

export async function initializeAppData(
  database: RenshuuDexieDatabase,
): Promise<AppBootstrapResult> {
  const currentSummary = await getContentSummary(database);
  const hasSeedData =
    currentSummary.vocab > 0 ||
    currentSummary.kanji > 0 ||
    currentSummary.sentences > 0;

  if (!hasSeedData) {
    await ingestSeedData(database, starterN5Seed);

    return {
      seeded: true,
      seedPackId: starterN5Seed.id,
      summary: await getContentSummary(database),
    };
  }

  return {
    seeded: false,
    seedPackId: null,
    summary: currentSummary,
  };
}
