import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createRenshuuDexieDatabase,
  type RenshuuDexieDatabase,
} from "../../data/dexie";
import { initializeAppData } from "./initializeAppData";

describe("initializeAppData", () => {
  let database: RenshuuDexieDatabase;

  beforeEach(async () => {
    database = createRenshuuDexieDatabase(
      `renshuu-bootstrap-${crypto.randomUUID()}`,
    );
    await database.open();
  });

  afterEach(async () => {
    await database.delete();
  });

  it(
    "seeds starter content when the database is empty",
    { timeout: 35000 },
    async () => {
      const result = await initializeAppData(database);

      expect(result.seeded).toBe(true);
      expect(result.seedPackId).not.toBeNull();
      expect(result.summary.vocab).toBeGreaterThan(25);
      expect(result.summary.kanji).toBeGreaterThan(5);
      expect(result.summary.sentences).toBeGreaterThan(5);
    },
  );

  it("does not reseed when seed version is current", async () => {
    await database.appMeta.add({ id: "seedVersion", value: "2" });
    await database.vocabItems.add({
      id: "existing-vocab",
      level: "N5",
      japanese: "水",
      reading: "みず",
      english: "water",
      partOfSpeech: "noun",
      tags: ["nature"],
    });

    const result = await initializeAppData(database);

    expect(result.seeded).toBe(false);
    expect(result.seedPackId).toBeNull();
    expect(result.summary.vocab).toBe(1);
  });
});
