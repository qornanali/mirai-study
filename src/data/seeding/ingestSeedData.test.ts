import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createRenshuuDexieDatabase,
  type RenshuuDexieDatabase,
} from "../dexie";
import { ingestSeedData } from "./ingestSeedData";
import { starterN5Seed } from "./starterN5Seed";

describe("ingestSeedData", () => {
  let database: RenshuuDexieDatabase;

  beforeEach(async () => {
    database = createRenshuuDexieDatabase(
      `renshuu-seed-${crypto.randomUUID()}`,
    );
    await database.open();
  });

  afterEach(async () => {
    await database.delete();
  });

  it("ingests a starter seed pack into Dexie tables", async () => {
    const result = await ingestSeedData(database, starterN5Seed);

    expect(result).toEqual({
      vocabInserted: 3,
      kanjiInserted: 2,
      sentencesInserted: 2,
    });

    expect(await database.vocabItems.count()).toBe(3);
    expect(await database.kanjiItems.count()).toBe(2);
    expect(await database.sentenceItems.count()).toBe(2);
  });

  it("rejects seed packs with missing vocab references", async () => {
    const invalidPack = {
      ...starterN5Seed,
      sentences: [
        {
          id: "broken-sentence",
          level: "N5" as const,
          japanese: "猫です。",
          english: "It is a cat.",
          vocabIds: ["missing-vocab"],
        },
      ],
    };

    await expect(ingestSeedData(database, invalidPack)).rejects.toThrow(
      "references unknown vocabId missing-vocab",
    );
  });
});
