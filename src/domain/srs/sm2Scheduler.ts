import type { SM2State } from "../../types";

function normalizeQuality(quality: 0 | 1 | 2 | 3 | 4 | 5): number {
  return Math.max(0, Math.min(5, quality));
}

export function sm2Scheduler(
  state: SM2State,
  qualityInput: 0 | 1 | 2 | 3 | 4 | 5,
): { next: SM2State; intervalDays: number } {
  const quality = normalizeQuality(qualityInput);
  const nextEf = Math.max(
    1.3,
    state.easinessFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality < 3) {
    const next: SM2State = {
      easinessFactor: nextEf,
      repetition: 0,
      intervalDays: 1,
    };

    return { next, intervalDays: next.intervalDays };
  }

  const nextRepetition = state.repetition + 1;
  const intervalDays =
    nextRepetition === 1
      ? 1
      : nextRepetition === 2
        ? 6
        : Math.max(1, Math.round(state.intervalDays * nextEf));

  const next: SM2State = {
    easinessFactor: nextEf,
    repetition: nextRepetition,
    intervalDays,
  };

  return { next, intervalDays };
}
