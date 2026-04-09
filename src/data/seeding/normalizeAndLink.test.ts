import { describe, expect, it } from "vitest";
import { buildPhase45SeedPacks } from "./normalizeAndLink";
import type { ExtractionResult } from "./extractionTypes";

describe("buildPhase45SeedPacks", () => {
  it("normalizes vocab and links sentence references", () => {
    const result: ExtractionResult = {
      source: "jmdict",
      timestamp: new Date().toISOString(),
      vocab: [
        {
          id: "jmdict-vocab-a1",
          source: "jmdict",
          sourceId: "1001",
          japanese: "猫",
          reading: "ねこ",
          english: "cat",
          partOfSpeech: "noun",
          jlptLevel: "N5",
          tags: ["n5"],
          metadata: {},
        },
      ],
      kanji: [],
      sentences: [
        {
          id: "tatoeba-sentence-1",
          source: "tatoeba",
          sourceId: "1",
          japanese: "猫がいます。",
          english: "There is a cat.",
          jlptLevel: "N5",
          vocabReferences: [{ japanese: "猫", reading: "ねこ" }],
          tags: ["n5"],
          metadata: {},
        },
      ],
      stats: {
        inputRecords: 2,
        extractedRecords: 2,
        skippedRecords: 0,
        errors: [],
      },
    };

    const output = buildPhase45SeedPacks([result]);
    const n5Pack = output.packs.find((pack) => pack.level === "N5");

    expect(n5Pack).toBeDefined();
    expect(n5Pack?.vocab).toHaveLength(1);
    expect(n5Pack?.sentences).toHaveLength(1);
    expect(n5Pack?.sentences[0]?.vocabIds).toEqual(["jmdict-vocab-a1"]);
    expect(output.report.unresolvedSentenceReferences).toBe(0);
    expect(output.report.validationErrors).toHaveLength(0);
  });

  it("drops records when level cannot be inferred and reports unresolved refs", () => {
    const result: ExtractionResult = {
      source: "tatoeba",
      timestamp: new Date().toISOString(),
      vocab: [
        {
          id: "v1",
          source: "jmdict",
          sourceId: "1002",
          japanese: "空",
          reading: "そら",
          english: "sky",
          partOfSpeech: "noun",
          tags: [],
          metadata: {},
        },
      ],
      kanji: [],
      sentences: [
        {
          id: "s1",
          source: "tatoeba",
          sourceId: "2",
          japanese: "空は青い。",
          english: "The sky is blue.",
          jlptLevel: "N5",
          vocabReferences: [{ japanese: "空", reading: "そら" }],
          tags: [],
          metadata: {},
        },
      ],
      stats: {
        inputRecords: 2,
        extractedRecords: 2,
        skippedRecords: 0,
        errors: [],
      },
    };

    const output = buildPhase45SeedPacks([result]);
    const n5Pack = output.packs.find((pack) => pack.level === "N5");

    expect(output.report.dropped.vocab).toBe(1);
    expect(output.report.unresolvedSentenceReferences).toBe(1);
    expect(n5Pack?.sentences[0]?.vocabIds).toEqual([]);
  });
});
