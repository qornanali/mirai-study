import type { IProgressRepo } from "../contracts";
import type {
  ProgressRecord,
  ProgressSnapshot,
  ReviewState,
  UserProgress,
} from "../../types";
import {
  progressRecordSchema,
  progressSnapshotSchema,
  reviewStateSchema,
  userProgressSchema,
} from "../zod";
import type { RenshuuDexieDatabase } from "./db";

export class DexieProgressRepo implements IProgressRepo {
  constructor(private readonly database: RenshuuDexieDatabase) {}

  async recordAttempt(record: ProgressRecord): Promise<void> {
    const parsed = progressRecordSchema.parse(record);

    await this.database.transaction(
      "rw",
      this.database.attempts,
      this.database.reviewStates,
      this.database.userProgress,
      async () => {
        await this.database.attempts.put(parsed.attempt);
        await this.database.reviewStates.put(parsed.reviewState);
        await this.database.userProgress.put(parsed.userProgress);
      },
    );
  }

  async updateReviewState(
    itemId: string,
    reviewState: ReviewState,
  ): Promise<void> {
    const parsed = reviewStateSchema.parse(reviewState);

    if (parsed.itemId !== itemId) {
      throw new Error("Review state itemId does not match update target.");
    }

    await this.database.reviewStates.put(parsed);
  }

  async getReviewState(itemId: string): Promise<ReviewState | null> {
    const row = await this.database.reviewStates.get(itemId);
    return row ? reviewStateSchema.parse(row) : null;
  }

  async getUserProgress(itemId: string): Promise<UserProgress | null> {
    const row = await this.database.userProgress.get(itemId);
    return row ? userProgressSchema.parse(row) : null;
  }

  async getDueReviews(nowIso: string, limit: number): Promise<ReviewState[]> {
    const rows = await this.database.reviewStates
      .where("dueAt")
      .belowOrEqual(nowIso)
      .limit(limit)
      .sortBy("dueAt");

    return rows.map((row) => reviewStateSchema.parse(row));
  }

  async getSnapshot(): Promise<ProgressSnapshot> {
    const [totalItems, dueItems, moduleCounts] = await Promise.all([
      this.database.userProgress.count(),
      this.database.reviewStates
        .where("dueAt")
        .belowOrEqual(new Date().toISOString())
        .count(),
      Promise.all([
        this.database.userProgress.where("module").equals("reading").count(),
        this.database.userProgress.where("module").equals("writing").count(),
        this.database.userProgress.where("module").equals("listening").count(),
        this.database.userProgress.where("module").equals("kanji").count(),
      ]),
    ]);

    const snapshot = {
      id: "current",
      capturedAt: new Date().toISOString(),
      totalItems,
      dueItems,
      moduleBreakdown: {
        reading: moduleCounts[0],
        writing: moduleCounts[1],
        listening: moduleCounts[2],
        kanji: moduleCounts[3],
      },
    };

    return progressSnapshotSchema.parse(snapshot);
  }
}
