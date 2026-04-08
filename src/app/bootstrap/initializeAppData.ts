import type { RenshuuDexieDatabase } from "../../data/dexie";
import { ingestSeedData } from "../../data/seeding/ingestSeedData";
import { starterN5Seed } from "../../data/seeding/starterN5Seed";
import { jlptN4Seed } from "../../data/seeding/jlptN4Seed";
import { jlptN3Seed } from "../../data/seeding/jlptN3Seed";
import { RemoteDataFetcher } from "../../data/seeding/remoteDataFetcher";

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
    const enrichedPack = await RemoteDataFetcher.buildEnrichedN5N3Curriculum();

    if (enrichedPack && enrichedPack.vocab.length > 50) {
      await ingestSeedData(database, enrichedPack);
      await ingestSeedData(database, starterN5Seed);
      await ingestSeedData(database, jlptN4Seed);
      await ingestSeedData(database, jlptN3Seed);

      return {
        seeded: true,
        seedPackId: `${enrichedPack.id} (Jisho.org + local)`,
        summary: await getContentSummary(database),
      };
    }

    await ingestSeedData(database, starterN5Seed);
    await ingestSeedData(database, jlptN4Seed);
    await ingestSeedData(database, jlptN3Seed);

    return {
      seeded: true,
      seedPackId: `${starterN5Seed.id}+${jlptN4Seed.id}+${jlptN3Seed.id} (local)`,
      summary: await getContentSummary(database),
    };
  }

  return {
    seeded: false,
    seedPackId: null,
    summary: currentSummary,
  };
}
