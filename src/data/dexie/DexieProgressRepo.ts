import type { IProgressRepo } from "../contracts";
import { createProgressId } from "../../types";
import type {
  DailyModuleAttempts,
  ProgressRecord,
  ProgressSnapshot,
  ReviewState,
  StudyModule,
  UserProgress,
} from "../../types";
import {
  progressRecordSchema,
  progressSnapshotSchema,
  reviewStateSchema,
  userProgressSchema,
} from "../zod";
import type { RenshuuDexieDatabase } from "./db";

function toProgressId(itemId: string, module: StudyModule): string {
  return createProgressId(itemId, module);
}

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
    module: StudyModule,
    reviewState: ReviewState,
  ): Promise<void> {
    const parsed = reviewStateSchema.parse(reviewState);
    const expectedId = toProgressId(itemId, module);

    if (parsed.itemId !== itemId || parsed.module !== module) {
      throw new Error("Review state target does not match update request.");
    }

    if (parsed.id !== expectedId) {
      throw new Error("Review state id does not match item and module.");
    }

    await this.database.reviewStates.put(parsed);
  }

  async getReviewState(
    itemId: string,
    module: StudyModule,
  ): Promise<ReviewState | null> {
    const row = await this.database.reviewStates.get(
      toProgressId(itemId, module),
    );
    return row ? reviewStateSchema.parse(row) : null;
  }

  async getUserProgress(
    itemId: string,
    module: StudyModule,
  ): Promise<UserProgress | null> {
    const row = await this.database.userProgress.get(
      toProgressId(itemId, module),
    );
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

  async getDailyModuleAttempts(nowIso: string): Promise<DailyModuleAttempts> {
    const now = new Date(nowIso);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const todayAttempts = await this.database.attempts
      .where("createdAt")
      .between(dayStart.toISOString(), dayEnd.toISOString(), true, false)
      .toArray();

    const counts = {
      listening: 0,
      reading: 0,
      writing: 0,
    };

    for (const attempt of todayAttempts) {
      if (attempt.module === "listening") {
        counts.listening += 1;
      }

      if (attempt.module === "reading") {
        counts.reading += 1;
      }

      if (attempt.module === "writing" || attempt.module === "kanji") {
        counts.writing += 1;
      }
    }

    return {
      date: dayStart.toISOString().slice(0, 10),
      ...counts,
    };
  }
}
