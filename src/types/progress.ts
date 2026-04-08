import type { StudyModule } from "./entities";
import type { StudyAttempt } from "./grading";
import type { ReviewState } from "./srs";

export function createProgressId(itemId: string, module: StudyModule): string {
  return `${module}:${itemId}`;
}

export interface UserProgress {
  id: string;
  itemId: string;
  module: StudyModule;
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

export interface DailyModuleAttempts {
  date: string;
  listening: number;
  reading: number;
  writing: number;
}
