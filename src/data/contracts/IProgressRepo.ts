import type {
  ProgressRecord,
  ProgressSnapshot,
  ReviewState,
  UserProgress,
} from "../../types";

export interface IProgressRepo {
  recordAttempt(record: ProgressRecord): Promise<void>;
  updateReviewState(itemId: string, reviewState: ReviewState): Promise<void>;
  getReviewState(itemId: string): Promise<ReviewState | null>;
  getUserProgress(itemId: string): Promise<UserProgress | null>;
  getDueReviews(nowIso: string, limit: number): Promise<ReviewState[]>;
  getSnapshot(): Promise<ProgressSnapshot>;
}
