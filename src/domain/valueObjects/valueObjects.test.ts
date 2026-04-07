import { describe, expect, it } from "vitest";
import { ReviewState, StudyAttempt, UserProgress } from ".";

describe("value objects", () => {
  it("creates a valid review state value object", () => {
    const reviewState = ReviewState.create({
      id: "reading:v1",
      itemId: "v1",
      module: "reading",
      algorithm: "leitner",
      dueAt: "2026-04-08T00:00:00.000Z",
      leitner: {
        box: 1,
        successfulReviews: 1,
      },
    });

    expect(reviewState.toJSON().itemId).toBe("v1");
  });

  it("rejects an invalid study attempt", () => {
    const create = () =>
      StudyAttempt.create({
        id: "",
        itemId: "v1",
        module: "reading",
        expectedAnswer: "cat",
        userAnswer: "cat",
        createdAt: "2026-04-07T00:00:00.000Z",
        result: {
          isCorrect: true,
          score: 1,
          normalizedExpected: "cat",
          normalizedActual: "cat",
        },
      });

    expect(create).toThrow();
  });

  it("creates a valid user progress value object", () => {
    const progress = UserProgress.create({
      id: "writing:v1",
      itemId: "v1",
      module: "writing",
      streak: 2,
      totalAttempts: 3,
      correctAttempts: 2,
      updatedAt: "2026-04-07T00:00:00.000Z",
    });

    expect(progress.toJSON().streak).toBe(2);
  });
});
