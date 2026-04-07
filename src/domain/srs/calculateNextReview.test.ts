import { describe, expect, it } from "vitest";
import { calculateNextReview } from "./calculateNextReview";

describe("calculateNextReview", () => {
  it("advances leitner on successful review", () => {
    const result = calculateNextReview({
      nowIso: "2026-04-07T00:00:00.000Z",
      quality: 4,
      state: {
        id: "reading:v1",
        itemId: "v1",
        module: "reading",
        algorithm: "leitner",
        dueAt: "2026-04-07T00:00:00.000Z",
        leitner: {
          box: 1,
          successfulReviews: 0,
        },
      },
    });

    expect(result.promotedToSM2).toBe(false);
    expect(result.state.leitner?.box).toBe(2);
    expect(result.state.dueAt).toBe("2026-04-10T00:00:00.000Z");
  });

  it("resets leitner box on low quality review", () => {
    const result = calculateNextReview({
      nowIso: "2026-04-07T00:00:00.000Z",
      quality: 1,
      state: {
        id: "reading:v1",
        itemId: "v1",
        module: "reading",
        algorithm: "leitner",
        dueAt: "2026-04-07T00:00:00.000Z",
        leitner: {
          box: 3,
          successfulReviews: 4,
        },
      },
    });

    expect(result.state.leitner?.box).toBe(1);
    expect(result.state.dueAt).toBe("2026-04-08T00:00:00.000Z");
  });

  it("promotes from leitner to sm2 at transition threshold", () => {
    const result = calculateNextReview(
      {
        nowIso: "2026-04-07T00:00:00.000Z",
        quality: 5,
        state: {
          id: "reading:v1",
          itemId: "v1",
          module: "reading",
          algorithm: "leitner",
          dueAt: "2026-04-07T00:00:00.000Z",
          leitner: {
            box: 4,
            successfulReviews: 9,
          },
        },
      },
      10,
    );

    expect(result.promotedToSM2).toBe(true);
    expect(result.state.algorithm).toBe("sm2");
    expect(result.state.sm2?.repetition).toBe(1);
    expect(result.state.dueAt).toBe("2026-04-08T00:00:00.000Z");
  });

  it("continues sm2 scheduling once promoted", () => {
    const result = calculateNextReview({
      nowIso: "2026-04-07T00:00:00.000Z",
      quality: 4,
      state: {
        id: "reading:v1",
        itemId: "v1",
        module: "reading",
        algorithm: "sm2",
        dueAt: "2026-04-07T00:00:00.000Z",
        sm2: {
          easinessFactor: 2.5,
          repetition: 1,
          intervalDays: 1,
        },
      },
    });

    expect(result.promotedToSM2).toBe(false);
    expect(result.state.sm2?.repetition).toBe(2);
    expect(result.state.dueAt).toBe("2026-04-13T00:00:00.000Z");
  });
});
