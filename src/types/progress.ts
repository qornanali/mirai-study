import type { StudyAttempt } from "./grading";
import type { ReviewState } from "./srs";

export interface UserProgress {
  itemId: string;
  module: "reading" | "writing" | "listening" | "kanji";
  streak: number;
  totalAttempts: number;
  correctAttempts: number;
  updatedAt: string;
}

export interface ProgressSnapshot {
  id: string;
  capturedAt: string;
  totalItems: number;
  dueItems: number;
  moduleBreakdown: Record<
    "reading" | "writing" | "listening" | "kanji",
    number
  >;
}

export interface ProgressRecord {
  attempt: StudyAttempt;
  reviewState: ReviewState;
  userProgress: UserProgress;
}
