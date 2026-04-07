import { describe, expect, it } from "vitest";
import { gradeWritingAnswer } from "./gradeWritingAnswer";

describe("gradeWritingAnswer", () => {
  it("accepts direct Japanese script answers", () => {
    const result = gradeWritingAnswer("猫", "猫", "ねこ");

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("accepts romanized input via kana normalization", () => {
    const result = gradeWritingAnswer("食べる", "taberu", "たべる");

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("rejects non-matching answers", () => {
    const result = gradeWritingAnswer("犬", "neko", "いぬ");

    expect(result.isCorrect).toBe(false);
    expect(result.score).toBe(0);
  });
});
