import type {
  IJapaneseDataRepo,
  IProgressRepo,
  ISettingsRepo,
  PracticeMode,
  UserSettings,
} from "../../data/contracts";
import type { JLPTLevel, StudyModule } from "../../types";

export interface SessionQueueItem {
  itemId: string;
  module: StudyModule;
  type: "review" | "new";
  promptType?: "word" | "sentence";
  dueAt?: string | undefined;
}

export interface DailySessionPlan {
  generatedAt: string;
  dailyCap: number;
  dueCount: number;
  newCount: number;
  mode: PracticeMode;
  items: SessionQueueItem[];
}

export interface BuildDailySessionDeps {
  dataRepo: IJapaneseDataRepo;
  progressRepo: IProgressRepo;
  settingsRepo: ISettingsRepo;
}

export interface BuildDailySessionInput {
  nowIso: string;
  level?: JLPTLevel;
  overrideMode?: PracticeMode | undefined;
}

const DEFAULT_LEVEL: JLPTLevel = "N5";
const PAGE_SIZE = 50;
const MAX_SCAN_ITEMS = 400;

function isPureHiragana(text: string): boolean {
  return /^[\u3040-\u309fー]+$/u.test(text);
}

function isPureKatakana(text: string): boolean {
  return /^[\u30a0-\u30ffー]+$/u.test(text);
}

async function isSentenceItem(
  dataRepo: IJapaneseDataRepo,
  itemId: string,
): Promise<boolean> {
  const sentence = await dataRepo.getSentenceById(itemId);
  return sentence !== null;
}

async function isReviewEligible(
  deps: BuildDailySessionDeps,
  settings: UserSettings,
  mode: PracticeMode,
  review: { itemId: string; module: StudyModule },
): Promise<boolean> {
  if (mode === "streak") {
    return (
      review.module === "reading" ||
      review.module === "writing" ||
      review.module === "listening"
    );
  }

  if (mode === "listening") {
    if (review.module !== "listening") {
      return false;
    }

    const sentence = await isSentenceItem(deps.dataRepo, review.itemId);
    return settings.listeningFocus === "sentence" ? sentence : !sentence;
  }

  if (mode === "reading") {
    if (review.module !== "reading") {
      return false;
    }

    const sentence = await isSentenceItem(deps.dataRepo, review.itemId);
    return settings.readingFocus === "sentence" ? sentence : !sentence;
  }

  if (settings.writingFocus === "kanji") {
    return review.module === "kanji";
  }

  if (review.module !== "writing") {
    return false;
  }

  const vocab = await deps.dataRepo.getVocabById(review.itemId);
  if (!vocab) {
    return false;
  }

  return settings.writingFocus === "hiragana"
    ? isPureHiragana(vocab.japanese)
    : isPureKatakana(vocab.japanese);
}

export async function buildDailySession(
  deps: BuildDailySessionDeps,
  input: BuildDailySessionInput,
): Promise<DailySessionPlan> {
  const level = input.level ?? DEFAULT_LEVEL;
  const settings = await deps.settingsRepo.getUserSettings();
  const mode = input.overrideMode ?? settings.practiceMode;
  const dailyCap =
    mode === "streak"
      ? Math.max(settings.dailyReviewCap, 30)
      : settings.dailyReviewCap;

  const dueReviews = await deps.progressRepo.getDueReviews(
    input.nowIso,
    dailyCap * 3,
  );

  const reviewItems: SessionQueueItem[] = [];

  for (const review of dueReviews) {
    if (reviewItems.length >= dailyCap) {
      break;
    }

    const eligible = await isReviewEligible(deps, settings, mode, {
      itemId: review.itemId,
      module: review.module,
    });

    if (!eligible) {
      continue;
    }

    const promptType =
      review.module === "listening" || review.module === "reading"
        ? (await isSentenceItem(deps.dataRepo, review.itemId))
          ? ("sentence" as const)
          : ("word" as const)
        : undefined;

    reviewItems.push({
      itemId: review.itemId,
      module: review.module,
      type: "review",
      dueAt: review.dueAt,
      ...(promptType && { promptType }),
    });
  }

  const remainingSlots = Math.max(0, dailyCap - reviewItems.length);
  const newItems = await getNewItems(
    deps,
    level,
    remainingSlots,
    settings,
    mode,
  );

  return {
    generatedAt: input.nowIso,
    dailyCap,
    dueCount: reviewItems.length,
    newCount: newItems.length,
    mode,
    items: [...reviewItems, ...newItems],
  };
}

async function getNewItems(
  deps: BuildDailySessionDeps,
  level: JLPTLevel,
  limit: number,
  settings: UserSettings,
  mode: PracticeMode,
): Promise<SessionQueueItem[]> {
  if (limit <= 0) {
    return [];
  }

  if (mode === "writing" && settings.writingFocus === "kanji") {
    return getKanjiNewItems(deps, level, limit);
  }

  const newItems: SessionQueueItem[] = [];
  const seenKeys = new Set<string>();
  let offset = 0;
  let scannedItems = 0;

  while (newItems.length < limit && scannedItems < MAX_SCAN_ITEMS) {
    const batch = await deps.dataRepo.getVocabBatch(level, PAGE_SIZE, offset);

    if (batch.length === 0) {
      break;
    }

    offset += batch.length;

    for (const vocab of batch) {
      scannedItems += 1;
      const candidates = await buildCandidatesForVocab(
        deps,
        vocab.id,
        vocab.japanese,
        settings,
        mode,
      );

      for (const candidate of candidates) {
        const key = `${candidate.module}:${candidate.itemId}:${candidate.promptType ?? "none"}`;
        if (seenKeys.has(key)) {
          continue;
        }

        const existing = await deps.progressRepo.getReviewState(
          candidate.itemId,
          candidate.module,
        );

        if (existing) {
          continue;
        }

        seenKeys.add(key);
        newItems.push(candidate);

        if (newItems.length >= limit) {
          break;
        }
      }

      if (newItems.length >= limit || scannedItems >= MAX_SCAN_ITEMS) {
        break;
      }
    }
  }

  if (mode === "streak" && newItems.length < limit) {
    const kanjiFallback = await getKanjiNewItems(deps, level, 1);
    if (kanjiFallback && kanjiFallback.length > 0) {
      newItems.push(kanjiFallback[0]!);
    }
  }

  return newItems;
}

async function buildCandidatesForVocab(
  deps: BuildDailySessionDeps,
  vocabId: string,
  japanese: string,
  settings: UserSettings,
  mode: PracticeMode,
): Promise<SessionQueueItem[]> {
  const candidates: SessionQueueItem[] = [];

  if (mode === "streak") {
    candidates.push({
      itemId: vocabId,
      module: "reading",
      type: "new",
      promptType: "word",
    });
    candidates.push({ itemId: vocabId, module: "writing", type: "new" });
    candidates.push({
      itemId: vocabId,
      module: "listening",
      type: "new",
      promptType: "word",
    });

    const sentence = (
      await deps.dataRepo.searchSentencesByVocab(vocabId, 1)
    )[0];
    if (sentence) {
      candidates.push({
        itemId: sentence.id,
        module: "reading",
        type: "new",
        promptType: "sentence",
      });
      candidates.push({
        itemId: sentence.id,
        module: "listening",
        type: "new",
        promptType: "sentence",
      });
    }

    return candidates;
  }

  if (mode === "listening") {
    if (settings.listeningFocus === "word") {
      candidates.push({
        itemId: vocabId,
        module: "listening",
        type: "new",
        promptType: "word",
      });
      return candidates;
    }

    const sentence = (
      await deps.dataRepo.searchSentencesByVocab(vocabId, 1)
    )[0];
    if (sentence) {
      candidates.push({
        itemId: sentence.id,
        module: "listening",
        type: "new",
        promptType: "sentence",
      });
    }

    return candidates;
  }

  if (mode === "reading") {
    if (settings.readingFocus === "word") {
      candidates.push({
        itemId: vocabId,
        module: "reading",
        type: "new",
        promptType: "word",
      });
      return candidates;
    }

    const sentence = (
      await deps.dataRepo.searchSentencesByVocab(vocabId, 1)
    )[0];
    if (sentence) {
      candidates.push({
        itemId: sentence.id,
        module: "reading",
        type: "new",
        promptType: "sentence",
      });
    }

    return candidates;
  }

  if (settings.writingFocus === "hiragana" && isPureHiragana(japanese)) {
    candidates.push({ itemId: vocabId, module: "writing", type: "new" });
  }

  if (settings.writingFocus === "katakana" && isPureKatakana(japanese)) {
    candidates.push({ itemId: vocabId, module: "writing", type: "new" });
  }

  return candidates;
}

async function getKanjiNewItems(
  deps: BuildDailySessionDeps,
  level: JLPTLevel,
  limit: number,
): Promise<SessionQueueItem[]> {
  if (limit <= 0) {
    return [];
  }

  const newItems: SessionQueueItem[] = [];
  let offset = 0;
  let scannedItems = 0;

  while (newItems.length < limit && scannedItems < MAX_SCAN_ITEMS) {
    const kanjiBatch = await deps.dataRepo.getKanjiByLevel(
      level,
      PAGE_SIZE,
      offset,
    );

    if (kanjiBatch.length === 0) {
      break;
    }

    offset += kanjiBatch.length;

    for (const kanji of kanjiBatch) {
      scannedItems += 1;
      const kanjiReviewState = await deps.progressRepo.getReviewState(
        kanji.id,
        "kanji",
      );

      if (!kanjiReviewState) {
        newItems.push({
          itemId: kanji.id,
          module: "kanji",
          type: "new",
        });
      }

      if (newItems.length >= limit || scannedItems >= MAX_SCAN_ITEMS) {
        break;
      }
    }
  }

  return newItems;
}
