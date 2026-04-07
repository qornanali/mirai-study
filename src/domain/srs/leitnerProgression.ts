import type { LeitnerState } from "../../types";

const LEITNER_INTERVALS: Record<LeitnerState["box"], number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
};

export function leitnerProgression(
  state: LeitnerState,
  quality: 0 | 1 | 2 | 3 | 4 | 5,
): { next: LeitnerState; intervalDays: number } {
  if (quality >= 3) {
    const nextBox = Math.min(4, state.box + 1) as LeitnerState["box"];
    const next: LeitnerState = {
      box: nextBox,
      successfulReviews: state.successfulReviews + 1,
    };

    return { next, intervalDays: LEITNER_INTERVALS[nextBox] };
  }

  const next: LeitnerState = {
    box: 1,
    successfulReviews: Math.max(0, state.successfulReviews - 1),
  };

  return { next, intervalDays: LEITNER_INTERVALS[1] };
}
