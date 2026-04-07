import type { StudyModule } from "../../types";
import type {
  ProgressRecord,
  ProgressSnapshot,
  ReviewState,
  UserProgress,
} from "../../types";

export interface IProgressRepo {
  recordAttempt(record: ProgressRecord): Promise<void>;
  updateReviewState(
    itemId: string,
    module: StudyModule,
    reviewState: ReviewState,
  ): Promise<void>;
  getReviewState(
    itemId: string,
    module: StudyModule,
  ): Promise<ReviewState | null>;
  getUserProgress(
    itemId: string,
    module: StudyModule,
  ): Promise<UserProgress | null>;
  getDueReviews(nowIso: string, limit: number): Promise<ReviewState[]>;
  getSnapshot(): Promise<ProgressSnapshot>;
}
