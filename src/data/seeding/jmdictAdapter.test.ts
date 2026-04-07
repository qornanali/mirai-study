import { describe, expect, it } from "vitest";
import { adaptSeedSentenceItem, adaptSeedVocabItem } from "./jmdictAdapter";

describe("jmdictAdapter", () => {
  it("adapts a raw vocab entry into a validated vocab item", () => {
    const result = adaptSeedVocabItem({
      id: "v1",
      level: "N5",
      japanese: "猫",
      reading: "ねこ",
      english: "cat",
      partOfSpeech: "noun",
      tags: ["animal"],
    });

    expect(result.english).toBe("cat");
  });

  it("adapts a raw sentence entry into a validated sentence item", () => {
    const result = adaptSeedSentenceItem({
      id: "s1",
      level: "N5",
      japanese: "猫です。",
      reading: "ねこです。",
      english: "It is a cat.",
      vocabIds: ["v1"],
    });

    expect(result.vocabIds).toEqual(["v1"]);
  });
});
