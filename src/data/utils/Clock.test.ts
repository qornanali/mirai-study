import { describe, expect, it } from "vitest";
import { FixedClock, SystemClock } from "./Clock";

describe("Clock", () => {
  it("returns an ISO date string from system clock", () => {
    const clock = new SystemClock();

    expect(() => new Date(clock.nowIso())).not.toThrow();
  });

  it("returns a deterministic value from fixed clock", () => {
    const clock = new FixedClock(new Date("2026-04-07T10:00:00.000Z"));

    expect(clock.nowIso()).toBe("2026-04-07T10:00:00.000Z");
  });
});
