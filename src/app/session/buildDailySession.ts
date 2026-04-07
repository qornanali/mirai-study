import type {
  IJapaneseDataRepo,
  IProgressRepo,
  ISettingsRepo,
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
}

const DEFAULT_LEVEL: JLPTLevel = "N5";
const PAGE_SIZE = 50;
const MAX_SCAN_ITEMS = 300;

export async function buildDailySession(
  deps: BuildDailySessionDeps,
  input: BuildDailySessionInput,
): Promise<DailySessionPlan> {
  const level = input.level ?? DEFAULT_LEVEL;
  const settings = await deps.settingsRepo.getUserSettings();
  const dueReviews = await deps.progressRepo.getDueReviews(
    input.nowIso,
    settings.dailyReviewCap,
  );

  const reviewItems: SessionQueueItem[] = dueReviews.map((review) => ({
    itemId: review.itemId,
    module: review.module,
    type: "review",
    dueAt: review.dueAt,
  }));

  const remainingSlots = Math.max(
    0,
    settings.dailyReviewCap - reviewItems.length,
  );
  const newItems = await getNewItems(deps, level, remainingSlots);

  return {
    generatedAt: input.nowIso,
    dailyCap: settings.dailyReviewCap,
    dueCount: reviewItems.length,
    newCount: newItems.length,
    items: [...reviewItems, ...newItems],
  };
}

async function getNewItems(
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
    const batch = await deps.dataRepo.getVocabBatch(level, PAGE_SIZE, offset);

    if (batch.length === 0) {
      break;
    }

    offset += batch.length;

    for (const vocab of batch) {
      scannedItems += 1;
      const readingReviewState = await deps.progressRepo.getReviewState(
        vocab.id,
        "reading",
      );

      if (!readingReviewState) {
        newItems.push({
          itemId: vocab.id,
          module: "reading",
          type: "new",
        });
      }

      if (newItems.length === limit || scannedItems >= MAX_SCAN_ITEMS) {
        break;
      }

      const writingReviewState = await deps.progressRepo.getReviewState(
        vocab.id,
        "writing",
      );

      if (!writingReviewState) {
        newItems.push({
          itemId: vocab.id,
          module: "writing",
          type: "new",
        });
      }

      if (newItems.length === limit || scannedItems >= MAX_SCAN_ITEMS) {
        break;
      }

      const listeningReviewState = await deps.progressRepo.getReviewState(
        vocab.id,
        "listening",
      );

      if (!listeningReviewState) {
        newItems.push({
          itemId: vocab.id,
          module: "listening",
          type: "new",
          promptType: "word",
        });
      }

      if (newItems.length === limit || scannedItems >= MAX_SCAN_ITEMS) {
        break;
      }

      const sentence = (
        await deps.dataRepo.searchSentencesByVocab(vocab.id, 1)
      )[0];

      if (sentence) {
        const sentenceListeningReviewState =
          await deps.progressRepo.getReviewState(sentence.id, "listening");

        if (!sentenceListeningReviewState) {
          newItems.push({
            itemId: sentence.id,
            module: "listening",
            type: "new",
            promptType: "sentence",
          });
        }
      }

      if (newItems.length === limit || scannedItems >= MAX_SCAN_ITEMS) {
        break;
      }
    }
  }

  return newItems;
}
