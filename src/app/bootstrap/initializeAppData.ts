import type { RenshuuDexieDatabase } from "../../data/dexie";
import { ingestSeedData } from "../../data/seeding/ingestSeedData";
import { starterN5Seed } from "../../data/seeding/starterN5Seed";
import { jlptN4Seed } from "../../data/seeding/jlptN4Seed";
import { jlptN3Seed } from "../../data/seeding/jlptN3Seed";
import { RemoteDataFetcher } from "../../data/seeding/remoteDataFetcher";

/**
 * Bump this string whenever seed content changes (new vocab, kanji, sentences, etc.).
 * On next app load, existing users will automatically receive the updated content
 * while their study progress is preserved.
 */
const SEED_VERSION = "1";

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

async function getStoredSeedVersion(
  database: RenshuuDexieDatabase,
): Promise<string | null> {
  const record = await database.appMeta.get("seedVersion");
  return record?.value ?? null;
}

async function setStoredSeedVersion(
  database: RenshuuDexieDatabase,
): Promise<void> {
  await database.appMeta.put({ id: "seedVersion", value: SEED_VERSION });
}

async function runSeed(database: RenshuuDexieDatabase): Promise<string> {
  const enrichedPack = await RemoteDataFetcher.buildEnrichedN5N3Curriculum();

  if (enrichedPack && enrichedPack.vocab.length > 30) {
    console.log(`✓ Loaded ${enrichedPack.vocab.length} vocab from Jisho.org`);
    await ingestSeedData(database, enrichedPack);
    await ingestSeedData(database, starterN5Seed);
    await ingestSeedData(database, jlptN4Seed);
    await ingestSeedData(database, jlptN3Seed);
    return `${enrichedPack.id} (Jisho.org + local)`;
  }

  console.log("⚠ Loading local seeds (remote fetch failed or too small)");
  await ingestSeedData(database, starterN5Seed);
  await ingestSeedData(database, jlptN4Seed);
  await ingestSeedData(database, jlptN3Seed);
  return `${starterN5Seed.id}+${jlptN4Seed.id}+${jlptN3Seed.id} (local)`;
}

export async function initializeAppData(
  database: RenshuuDexieDatabase,
): Promise<AppBootstrapResult> {
  const storedVersion = await getStoredSeedVersion(database);
  const needsSeed = storedVersion !== SEED_VERSION;

  if (!needsSeed) {
    return {
      seeded: false,
      seedPackId: null,
      summary: await getContentSummary(database),
    };
  }

  const seedPackId = await runSeed(database);
  await setStoredSeedVersion(database);

  return {
    seeded: true,
    seedPackId,
    summary: await getContentSummary(database),
  };
}
