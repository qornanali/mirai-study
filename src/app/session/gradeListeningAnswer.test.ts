import { describe, expect, it } from "vitest";
import { gradeListeningAnswer } from "./gradeListeningAnswer";

describe("gradeListeningAnswer", () => {
  it("accepts exact matches for word prompts", () => {
    const result = gradeListeningAnswer({
      expected: "ねこ",
      actual: "ネコ",
      promptType: "word",
    });

    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("accepts near matches for sentence prompts with a lenient threshold", () => {
    const result = gradeListeningAnswer({
      expected: "わたしはがくせいです",
      actual: "わたしはがくせです",
      promptType: "sentence",
    });

    expect(result.score).toBeGreaterThanOrEqual(0.8);
    expect(result.isCorrect).toBe(true);
  });

  it("rejects low similarity answers for word prompts", () => {
    const result = gradeListeningAnswer({
      expected: "いぬ",
      actual: "ねこ",
      promptType: "word",
    });

    expect(result.isCorrect).toBe(false);
    expect(result.score).toBeLessThan(0.9);
  });
});
