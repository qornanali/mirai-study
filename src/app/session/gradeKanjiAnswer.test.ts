import { describe, expect, it } from "vitest";
import { gradeKanjiAnswer } from "./gradeKanjiAnswer";

describe("gradeKanjiAnswer", () => {
  it("accepts the correct onyomi reading in katakana", () => {
    const result = gradeKanjiAnswer(["ニチ", "ジツ"], "ニチ");

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("accepts the correct onyomi reading in hiragana", () => {
    const result = gradeKanjiAnswer(["ニチ", "ジツ"], "にち");

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("accepts any onyomi reading from the list", () => {
    const result = gradeKanjiAnswer(["ニチ", "ジツ"], "じつ");

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("ignores spacing and normalization", () => {
    const result = gradeKanjiAnswer(["ニチ"], "ニ チ");

    expect(result.isCorrect).toBe(true);
  });

  it("rejects incorrect readings", () => {
    const result = gradeKanjiAnswer(["ニチ", "ジツ"], "ひ");

    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });

  it("includes all onyomi in the expected answer", () => {
    const result = gradeKanjiAnswer(["ニチ", "ジツ"], "りん");

    expect(result.normalizedExpected).toBe("にち、じつ");
  });
});
