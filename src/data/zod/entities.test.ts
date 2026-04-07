import { describe, expect, it } from "vitest";
import {
  kanjiItemSchema,
  sentenceItemSchema,
  vocabItemSchema,
} from "./entities";

describe("entity schemas", () => {
  it("validates a vocab item", () => {
    const result = vocabItemSchema.parse({
      id: "v1",
      level: "N5",
      japanese: "猫",
      reading: "ねこ",
      english: "cat",
      partOfSpeech: "noun",
      tags: ["animal"],
    });

    expect(result.id).toBe("v1");
  });

  it("rejects a kanji item without stroke paths", () => {
    const parse = () =>
      kanjiItemSchema.parse({
        id: "k1",
        level: "N5",
        character: "日",
        meaning: "sun",
        onyomi: ["ニチ"],
        kunyomi: ["ひ"],
        strokeSvgPaths: [],
        radicals: ["日"],
      });

    expect(parse).toThrow();
  });

  it("validates a sentence item", () => {
    const result = sentenceItemSchema.parse({
      id: "s1",
      level: "N4",
      japanese: "今日は晴れです。",
      english: "It is sunny today.",
      vocabIds: ["v1"],
    });

    expect(result.level).toBe("N4");
  });
});
