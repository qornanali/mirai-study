import { describe, expect, it } from "vitest";
import type {
  IJapaneseDataRepo,
  IProgressRepo,
  ISettingsRepo,
  UserSettings,
} from "../../data/contracts";
import type {
  JLPTLevel,
  KanjiItem,
  ProgressRecord,
  ProgressSnapshot,
  ReviewState,
  SentenceItem,
  UserProgress,
  VocabItem,
} from "../../types";
import { buildDailySession } from "./buildDailySession";

class FakeDataRepo implements IJapaneseDataRepo {
  constructor(private readonly vocabItems: VocabItem[]) {}

  async getVocabBatch(
    level: JLPTLevel,
    limit: number,
    offset: number,
  ): Promise<VocabItem[]> {
    void level;
    return this.vocabItems.slice(offset, offset + limit);
  }

  async getKanjiByLevel(
    level: JLPTLevel,
    limit: number,
    offset: number,
  ): Promise<KanjiItem[]> {
    void level;
    void limit;
    void offset;
    return [];
  }

  async searchSentencesByVocab(
    vocabId: string,
    limit: number,
  ): Promise<SentenceItem[]> {
    void vocabId;
    void limit;
    return [];
  }

  async countItemsByLevel(level: JLPTLevel): Promise<number> {
    void level;
    return this.vocabItems.length;
  }
}

class FakeProgressRepo implements IProgressRepo {
  constructor(
    private readonly dueReviews: ReviewState[],
    private readonly knownReviewStateIds: Set<string>,
  ) {}

  async recordAttempt(record: ProgressRecord): Promise<void> {
    void record;
  }

  async updateReviewState(
    itemId: string,
    reviewState: ReviewState,
  ): Promise<void> {
    void itemId;
    void reviewState;
  }

  async getReviewState(itemId: string): Promise<ReviewState | null> {
    if (!this.knownReviewStateIds.has(itemId)) {
      return null;
    }

    return {
      itemId,
      module: "reading",
      algorithm: "leitner",
      dueAt: "2026-04-07T00:00:00.000Z",
      leitner: {
        box: 1,
        successfulReviews: 0,
      },
    };
  }

  async getUserProgress(itemId: string): Promise<UserProgress | null> {
    void itemId;
    return null;
  }

  async getDueReviews(nowIso: string, limit: number): Promise<ReviewState[]> {
    void nowIso;
    return this.dueReviews.slice(0, limit);
  }

  async getSnapshot(): Promise<ProgressSnapshot> {
    return {
      id: "current",
      capturedAt: "2026-04-07T00:00:00.000Z",
      totalItems: 0,
      dueItems: 0,
      moduleBreakdown: {
        reading: 0,
        writing: 0,
        listening: 0,
        kanji: 0,
      },
    };
  }
}

class FakeSettingsRepo implements ISettingsRepo {
  constructor(private readonly settings: UserSettings) {}

  async getUserSettings(): Promise<UserSettings> {
    return this.settings;
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return {
      ...this.settings,
      ...settings,
    };
  }
}

describe("buildDailySession", () => {
  it("fills remaining cap with unseen N5 vocab after due reviews", async () => {
    const dueReviews: ReviewState[] = [
      {
        itemId: "due-1",
        module: "reading",
        algorithm: "leitner",
        dueAt: "2026-04-07T00:00:00.000Z",
        leitner: {
          box: 2,
          successfulReviews: 2,
        },
      },
    ];

    const vocab: VocabItem[] = [
      {
        id: "v1",
        level: "N5",
        japanese: "猫",
        reading: "ねこ",
        english: "cat",
        partOfSpeech: "noun",
        tags: ["animal"],
      },
      {
        id: "v2",
        level: "N5",
        japanese: "犬",
        reading: "いぬ",
        english: "dog",
        partOfSpeech: "noun",
        tags: ["animal"],
      },
      {
        id: "v3",
        level: "N5",
        japanese: "水",
        reading: "みず",
        english: "water",
        partOfSpeech: "noun",
        tags: ["nature"],
      },
    ];

    const plan = await buildDailySession(
      {
        dataRepo: new FakeDataRepo(vocab),
        progressRepo: new FakeProgressRepo(dueReviews, new Set(["v2"])),
        settingsRepo: new FakeSettingsRepo({
          theme: "system",
          dailyReviewCap: 3,
        }),
      },
      { nowIso: "2026-04-07T10:00:00.000Z" },
    );

    expect(plan.dailyCap).toBe(3);
    expect(plan.dueCount).toBe(1);
    expect(plan.newCount).toBe(2);
    expect(plan.items).toEqual([
      {
        itemId: "due-1",
        module: "reading",
        type: "review",
        dueAt: "2026-04-07T00:00:00.000Z",
      },
      {
        itemId: "v1",
        module: "reading",
        type: "new",
      },
      {
        itemId: "v3",
        module: "reading",
        type: "new",
      },
    ]);
  });

  it("returns only due reviews when the cap is already full", async () => {
    const dueReviews: ReviewState[] = [
      {
        itemId: "due-1",
        module: "reading",
        algorithm: "leitner",
        dueAt: "2026-04-07T00:00:00.000Z",
        leitner: {
          box: 2,
          successfulReviews: 2,
        },
      },
      {
        itemId: "due-2",
        module: "writing",
        algorithm: "leitner",
        dueAt: "2026-04-07T00:01:00.000Z",
        leitner: {
          box: 1,
          successfulReviews: 1,
        },
      },
    ];

    const plan = await buildDailySession(
      {
        dataRepo: new FakeDataRepo([]),
        progressRepo: new FakeProgressRepo(dueReviews, new Set()),
        settingsRepo: new FakeSettingsRepo({
          theme: "system",
          dailyReviewCap: 2,
        }),
      },
      { nowIso: "2026-04-07T10:00:00.000Z" },
    );

    expect(plan.items).toHaveLength(2);
    expect(plan.dueCount).toBe(2);
    expect(plan.newCount).toBe(0);
    expect(plan.items.every((item) => item.type === "review")).toBe(true);
  });
});
