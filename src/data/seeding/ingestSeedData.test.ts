import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createRenshuuDexieDatabase,
  type RenshuuDexieDatabase,
} from "../dexie";
import { ingestSeedData } from "./ingestSeedData";

const testSeedPack = {
  id: "test-n5-seed",
  level: "N5" as const,
  version: 1,
  schemaVersion: "1.0.0",
  sourceAttribution: {
    source: "local" as const,
    attribution: "unit test seed",
  },
  vocab: [
    {
      id: "vocab-mizu",
      level: "N5" as const,
      japanese: "水",
      reading: "みず",
      english: "water",
      partOfSpeech: "noun" as const,
      tags: ["nature"],
    },
    {
      id: "vocab-neko",
      level: "N5" as const,
      japanese: "猫",
      reading: "ねこ",
      english: "cat",
      partOfSpeech: "noun" as const,
      tags: ["animals"],
    },
    {
      id: "vocab-taberu",
      level: "N5" as const,
      japanese: "食べる",
      reading: "たべる",
      english: "to eat",
      partOfSpeech: "verb" as const,
      tags: ["daily"],
    },
  ],
  kanji: [
    {
      id: "kanji-mizu",
      level: "N5" as const,
      character: "水",
      meaning: "water",
      onyomi: ["スイ"],
      kunyomi: ["みず"],
      strokeSvgPaths: ["M0 0", "M1 1"],
      radicals: ["水"],
    },
    {
      id: "kanji-neko",
      level: "N3" as const,
      character: "猫",
      meaning: "cat",
      onyomi: ["ビョウ"],
      kunyomi: ["ねこ"],
      strokeSvgPaths: ["M0 0"],
      radicals: ["犭", "苗"],
    },
  ],
  sentences: [
    {
      id: "sentence-1",
      level: "N5" as const,
      japanese: "猫です。",
      english: "It is a cat.",
      vocabIds: ["vocab-neko"],
    },
    {
      id: "sentence-2",
      level: "N5" as const,
      japanese: "水を飲みます。",
      english: "I drink water.",
      vocabIds: ["vocab-mizu"],
    },
  ],
};

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
    const result = await ingestSeedData(database, testSeedPack);

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
      ...testSeedPack,
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
