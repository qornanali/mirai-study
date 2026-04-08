import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProgressId, type ProgressRecord } from "../../types";
import {
  createRenshuuDexieDatabase,
  DexieJapaneseDataRepo,
  DexieProgressRepo,
  DexieSettingsRepo,
  type RenshuuDexieDatabase,
} from ".";

describe("Dexie repositories", () => {
  let database: RenshuuDexieDatabase;
  let dataRepo: DexieJapaneseDataRepo;
  let progressRepo: DexieProgressRepo;
  let settingsRepo: DexieSettingsRepo;

  beforeEach(async () => {
    database = createRenshuuDexieDatabase(
      `renshuu-test-${crypto.randomUUID()}`,
    );
    await database.open();

    dataRepo = new DexieJapaneseDataRepo(database);
    progressRepo = new DexieProgressRepo(database);
    settingsRepo = new DexieSettingsRepo(database);
  });

  afterEach(async () => {
    await database.delete();
  });

  it("queries vocab, kanji, and sentences by contract", async () => {
    await database.vocabItems.bulkAdd([
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
    ]);

    await database.kanjiItems.add({
      id: "k1",
      level: "N5",
      character: "日",
      meaning: "sun",
      onyomi: ["ニチ"],
      kunyomi: ["ひ"],
      strokeSvgPaths: ["M0 0"],
      radicals: ["日"],
    });

    await database.sentenceItems.add({
      id: "s1",
      level: "N5",
      japanese: "猫です。",
      english: "It is a cat.",
      vocabIds: ["v1"],
    });

    const vocabById = await dataRepo.getVocabById("v1");
    const sentenceById = await dataRepo.getSentenceById("s1");
    const vocab = await dataRepo.getVocabBatch("N5", 10, 0);
    const kanji = await dataRepo.getKanjiByLevel("N5", 10, 0);
    const sentences = await dataRepo.searchSentencesByVocab("v1", 10);
    const count = await dataRepo.countItemsByLevel("N5");

    expect(vocabById?.japanese).toBe("猫");
    expect(sentenceById?.english).toBe("It is a cat.");
    expect(vocab).toHaveLength(2);
    expect(kanji).toHaveLength(1);
    expect(sentences).toHaveLength(1);
    expect(count).toBe(4);
  });

  it("records and queries progress data", async () => {
    const record: ProgressRecord = {
      attempt: {
        id: "a1",
        itemId: "v1",
        module: "reading",
        expectedAnswer: "cat",
        userAnswer: "cat",
        createdAt: "2026-04-07T00:00:00.000Z",
        result: {
          isCorrect: true,
          score: 1,
          normalizedExpected: "cat",
          normalizedActual: "cat",
        },
      },
      reviewState: {
        id: createProgressId("v1", "reading"),
        itemId: "v1",
        module: "reading",
        algorithm: "leitner",
        dueAt: "2026-04-07T00:00:00.000Z",
        leitner: {
          box: 1,
          successfulReviews: 1,
        },
      },
      userProgress: {
        id: createProgressId("v1", "reading"),
        itemId: "v1",
        module: "reading",
        streak: 1,
        totalAttempts: 1,
        correctAttempts: 1,
        updatedAt: "2026-04-07T00:00:00.000Z",
      },
    };

    await progressRepo.recordAttempt(record);

    const reviewState = await progressRepo.getReviewState("v1", "reading");
    const userProgress = await progressRepo.getUserProgress("v1", "reading");
    const due = await progressRepo.getDueReviews(
      "2026-04-08T00:00:00.000Z",
      10,
    );
    const snapshot = await progressRepo.getSnapshot();

    expect(reviewState?.itemId).toBe("v1");
    expect(userProgress?.correctAttempts).toBe(1);
    expect(due).toHaveLength(1);
    expect(snapshot.totalItems).toBe(1);
    expect(snapshot.moduleBreakdown.reading).toBe(1);
  });

  it("loads and updates user settings with defaults", async () => {
    const defaults = await settingsRepo.getUserSettings();
    const updated = await settingsRepo.updateSettings({
      theme: "dark",
      dailyReviewCap: 50,
      voicePreference: "ja-JP-default",
      ttsRate: 1.2,
      ttsPitch: 0.9,
      furiganaEnabled: false,
    });
    const clearedVoicePreference = await settingsRepo.updateSettings({
      voicePreference: undefined,
    });
    const enabledFurigana = await settingsRepo.updateSettings({
      furiganaEnabled: true,
    });

    expect(defaults.theme).toBe("system");
    expect(defaults.dailyReviewCap).toBe(30);
    expect(defaults.ttsRate).toBe(1);
    expect(defaults.ttsPitch).toBe(1);
    expect(defaults.furiganaEnabled).toBe(true);
    expect(defaults.practiceMode).toBe("streak");
    expect(defaults.listeningFocus).toBe("word");
    expect(defaults.readingFocus).toBe("word");
    expect(defaults.writingFocus).toBe("hiragana");
    expect(defaults.dailyGoals.listening).toBe(10);
    expect(defaults.dailyGoals.reading).toBe(10);
    expect(defaults.dailyGoals.writing).toBe(10);

    expect(updated.theme).toBe("dark");
    expect(updated.dailyReviewCap).toBe(50);
    expect(updated.voicePreference).toBe("ja-JP-default");
    expect(updated.ttsRate).toBe(1.2);
    expect(updated.ttsPitch).toBe(0.9);
    expect(updated.furiganaEnabled).toBe(false);

    expect(clearedVoicePreference.voicePreference).toBeUndefined();
    expect(clearedVoicePreference.furiganaEnabled).toBe(false);

    expect(enabledFurigana.furiganaEnabled).toBe(true);

    // Updated values should be set correctly
  });
});
