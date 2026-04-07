export type SRSAlgorithm = "leitner" | "sm2";

export interface LeitnerState {
  box: 1 | 2 | 3 | 4;
  successfulReviews: number;
}

export interface SM2State {
  easinessFactor: number;
  intervalDays: number;
  repetition: number;
}

export interface ReviewState {
  itemId: string;
  module: "reading" | "writing" | "listening" | "kanji";
  algorithm: SRSAlgorithm;
  dueAt: string;
  lastReviewedAt?: string | undefined;
  leitner?: LeitnerState | undefined;
  sm2?: SM2State | undefined;
}

export interface SchedulingInput {
  nowIso: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  state: ReviewState;
}

export interface SchedulingResult {
  state: ReviewState;
  promotedToSM2: boolean;
}
