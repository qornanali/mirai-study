import type {
  ReviewState,
  SchedulingInput,
  SchedulingResult,
  SM2State,
} from "../../types";
import { leitnerProgression } from "./leitnerProgression";
import { sm2Scheduler } from "./sm2Scheduler";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDaysIso(isoDate: string, days: number): string {
  return new Date(new Date(isoDate).getTime() + days * DAY_MS).toISOString();
}

function toSm2InitialState(previous?: SM2State): SM2State {
  if (previous) {
    return previous;
  }

  return {
    easinessFactor: 2.5,
    repetition: 0,
    intervalDays: 1,
  };
}

export function calculateNextReview(
  input: SchedulingInput,
  transitionSuccessfulReviews = 10,
): SchedulingResult {
  const { state, quality, nowIso } = input;

  if (state.algorithm === "sm2") {
    const current = toSm2InitialState(state.sm2);
    const result = sm2Scheduler(current, quality);

    return {
      promotedToSM2: false,
      state: {
        ...state,
        sm2: result.next,
        dueAt: addDaysIso(nowIso, result.intervalDays),
        lastReviewedAt: nowIso,
      },
    };
  }

  const currentLeitner = state.leitner ?? {
    box: 1 as const,
    successfulReviews: 0,
  };
  const result = leitnerProgression(currentLeitner, quality);
  const promoted =
    result.next.box === 4 &&
    result.next.successfulReviews >= transitionSuccessfulReviews;

  if (promoted) {
    const sm2 = toSm2InitialState(state.sm2);
    const sm2Result = sm2Scheduler(sm2, quality);

    return {
      promotedToSM2: true,
      state: {
        ...state,
        algorithm: "sm2",
        leitner: result.next,
        sm2: sm2Result.next,
        dueAt: addDaysIso(nowIso, sm2Result.intervalDays),
        lastReviewedAt: nowIso,
      },
    };
  }

  const nextState: ReviewState = {
    ...state,
    leitner: result.next,
    dueAt: addDaysIso(nowIso, result.intervalDays),
    lastReviewedAt: nowIso,
  };

  return {
    promotedToSM2: false,
    state: nextState,
  };
}
