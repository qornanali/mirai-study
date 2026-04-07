import { describe, expect, it } from "vitest";
import type { IJapaneseDataRepo, IProgressRepo } from "../../data/contracts";
import type {
  JLPTLevel,
  KanjiItem,
  ProgressRecord,
  ProgressSnapshot,
  ReviewState,
  SentenceItem,
  StudyModule,
  UserProgress,
  VocabItem,
} from "../../types";
import { submitSessionAnswer } from "./submitSessionAnswer";

class FakeDataRepo implements IJapaneseDataRepo {
  constructor(private readonly vocab: VocabItem | null) {}

  async getVocabById(id: string): Promise<VocabItem | null> {
    void id;
    return this.vocab;
  }

  async getVocabBatch(
    level: JLPTLevel,
    limit: number,
    offset: number,
  ): Promise<VocabItem[]> {
    void level;
    void limit;
    void offset;
    return [];
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
    return this.vocab ? 1 : 0;
  }
}

class FakeProgressRepo implements IProgressRepo {
  public recorded: ProgressRecord | null = null;

  constructor(
    private readonly reviewState: ReviewState | null,
    private readonly userProgress: UserProgress | null,
  ) {}

  async recordAttempt(record: ProgressRecord): Promise<void> {
    this.recorded = record;
  }

  async updateReviewState(
    itemId: string,
    module: StudyModule,
    reviewState: ReviewState,
  ): Promise<void> {
    void itemId;
    void module;
    void reviewState;
  }

  async getReviewState(
    itemId: string,
    module: StudyModule,
  ): Promise<ReviewState | null> {
    void itemId;
    void module;
    return this.reviewState;
  }

  async getUserProgress(
    itemId: string,
    module: StudyModule,
  ): Promise<UserProgress | null> {
    void itemId;
    void module;
    return this.userProgress;
  }

  async getDueReviews(nowIso: string, limit: number): Promise<ReviewState[]> {
    void nowIso;
    void limit;
    return [];
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

describe("submitSessionAnswer", () => {
  it("creates and records a correct first attempt for a new reading item", async () => {
    const progressRepo = new FakeProgressRepo(null, null);

    const result = await submitSessionAnswer(
      {
        dataRepo: new FakeDataRepo({
          id: "v1",
          level: "N5",
          japanese: "猫",
          reading: "ねこ",
          english: "cat",
          partOfSpeech: "noun",
          tags: ["animal"],
        }),
        progressRepo,
      },
      {
        item: {
          itemId: "v1",
          module: "reading",
          type: "new",
        },
        nowIso: "2026-04-07T12:00:00.000Z",
        userAnswer: "ネコ",
      },
    );

    expect(result.attempt.result.isCorrect).toBe(true);
    expect(result.userProgress.totalAttempts).toBe(1);
    expect(result.userProgress.correctAttempts).toBe(1);
    expect(result.userProgress.streak).toBe(1);
    expect(result.reviewState.algorithm).toBe("leitner");
    expect(progressRepo.recorded?.attempt.itemId).toBe("v1");
  });

  it("accepts normalized romaji answers for writing items", async () => {
    const progressRepo = new FakeProgressRepo(null, null);

    const result = await submitSessionAnswer(
      {
        dataRepo: new FakeDataRepo({
          id: "v2",
          level: "N5",
          japanese: "食べる",
          reading: "たべる",
          english: "eat",
          partOfSpeech: "verb",
          tags: ["food"],
        }),
        progressRepo,
      },
      {
        item: {
          itemId: "v2",
          module: "writing",
          type: "new",
        },
        nowIso: "2026-04-07T12:30:00.000Z",
        userAnswer: "taberu",
      },
    );

    expect(result.attempt.result.isCorrect).toBe(true);
    expect(result.attempt.expectedAnswer).toBe("食べる");
    expect(result.userProgress.module).toBe("writing");
    expect(result.userProgress.id).toBe("writing:v2");
  });

  it("grades listening answers with fuzzy matching", async () => {
    const progressRepo = new FakeProgressRepo(null, null);

    const result = await submitSessionAnswer(
      {
        dataRepo: new FakeDataRepo({
          id: "v3",
          level: "N5",
          japanese: "学生",
          reading: "がくせい",
          english: "student",
          partOfSpeech: "noun",
          tags: ["school"],
        }),
        progressRepo,
      },
      {
        item: {
          itemId: "v3",
          module: "listening",
          type: "new",
        },
        nowIso: "2026-04-07T12:45:00.000Z",
        userAnswer: "がくせ",
      },
    );

    expect(result.attempt.result.score).toBe(0.75);
    expect(result.attempt.result.isCorrect).toBe(false);
    expect(result.userProgress.id).toBe("listening:v3");
  });

  it("resets streak on an incorrect answer for an existing review item", async () => {
    const progressRepo = new FakeProgressRepo(
      {
        id: "reading:v1",
        itemId: "v1",
        module: "reading",
        algorithm: "leitner",
        dueAt: "2026-04-07T00:00:00.000Z",
        leitner: {
          box: 2,
          successfulReviews: 3,
        },
      },
      {
        id: "reading:v1",
        itemId: "v1",
        module: "reading",
        streak: 4,
        totalAttempts: 4,
        correctAttempts: 4,
        updatedAt: "2026-04-06T12:00:00.000Z",
      },
    );

    const result = await submitSessionAnswer(
      {
        dataRepo: new FakeDataRepo({
          id: "v1",
          level: "N5",
          japanese: "犬",
          reading: "いぬ",
          english: "dog",
          partOfSpeech: "noun",
          tags: ["animal"],
        }),
        progressRepo,
      },
      {
        item: {
          itemId: "v1",
          module: "reading",
          type: "review",
          dueAt: "2026-04-07T00:00:00.000Z",
        },
        nowIso: "2026-04-07T12:00:00.000Z",
        userAnswer: "ねこ",
      },
    );

    expect(result.attempt.result.isCorrect).toBe(false);
    expect(result.userProgress.totalAttempts).toBe(5);
    expect(result.userProgress.correctAttempts).toBe(4);
    expect(result.userProgress.streak).toBe(0);
    expect(result.reviewState.leitner?.box).toBe(1);
  });
});
