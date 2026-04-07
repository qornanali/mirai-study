import { describe, expect, it } from "vitest";
import { gradeReadingAnswer, normalizeReadingText } from "./gradeReadingAnswer";

describe("gradeReadingAnswer", () => {
  it("normalizes katakana, spacing, and punctuation", () => {
    expect(normalizeReadingText(" ネコ。 ")).toBe("ねこ");
  });

  it("accepts equivalent readings after normalization", () => {
    const result = gradeReadingAnswer("ねこ", "ネ コ");

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("returns an incorrect grade when the reading does not match", () => {
    const result = gradeReadingAnswer("いぬ", "ねこ");

    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });
});
