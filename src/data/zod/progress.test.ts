import { describe, expect, it } from "vitest";
import { progressRecordSchema, reviewStateSchema } from "./progress";

describe("progress schemas", () => {
  it("validates a review state", () => {
    const result = reviewStateSchema.parse({
      itemId: "v1",
      module: "reading",
      algorithm: "leitner",
      dueAt: "2026-04-08T00:00:00.000Z",
      leitner: {
        box: 1,
        successfulReviews: 0,
      },
    });

    expect(result.module).toBe("reading");
  });

  it("rejects grading scores outside range", () => {
    const parse = () =>
      progressRecordSchema.parse({
        attempt: {
          id: "a1",
          itemId: "v1",
          module: "writing",
          expectedAnswer: "猫",
          userAnswer: "ねこ",
          createdAt: "2026-04-07T00:00:00.000Z",
          result: {
            isCorrect: false,
            score: 2,
            normalizedExpected: "猫",
            normalizedActual: "ねこ",
          },
        },
        reviewState: {
          itemId: "v1",
          module: "writing",
          algorithm: "leitner",
          dueAt: "2026-04-08T00:00:00.000Z",
          leitner: {
            box: 1,
            successfulReviews: 0,
          },
        },
        userProgress: {
          itemId: "v1",
          module: "writing",
          streak: 1,
          totalAttempts: 1,
          correctAttempts: 0,
          updatedAt: "2026-04-07T00:00:00.000Z",
        },
      });

    expect(parse).toThrow();
  });
});
