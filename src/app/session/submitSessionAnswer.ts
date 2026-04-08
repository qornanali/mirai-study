import { calculateNextReview } from "../../domain/srs";
import type { IJapaneseDataRepo, IProgressRepo } from "../../data/contracts";
import { createProgressId } from "../../types";
import type { ProgressRecord, ReviewState, UserProgress } from "../../types";
import type { SessionQueueItem } from "./buildDailySession";
import { gradeListeningAnswer } from "./gradeListeningAnswer";
import { gradeReadingAnswer } from "./gradeReadingAnswer";
import { gradeWritingAnswer } from "./gradeWritingAnswer";
import { gradeKanjiAnswer, type StrokePath } from "./gradeKanjiAnswer";

export interface SubmitSessionAnswerDeps {
  dataRepo: IJapaneseDataRepo;
  progressRepo: IProgressRepo;
}

export interface SubmitSessionAnswerInput {
  item: SessionQueueItem;
  nowIso: string;
  userAnswer: string;
  strokes?: StrokePath[];
}

export interface SessionAnswerResult extends ProgressRecord {
  promotedToSM2: boolean;
}

function createInitialReviewState(
  item: SessionQueueItem,
  nowIso: string,
): ReviewState {
  return {
    id: createProgressId(item.itemId, item.module),
    itemId: item.itemId,
    module: item.module,
    algorithm: "leitner",
    dueAt: nowIso,
    leitner: {
      box: 1,
      successfulReviews: 0,
    },
  };
}

function createInitialProgress(
  item: SessionQueueItem,
  nowIso: string,
): UserProgress {
  return {
    id: createProgressId(item.itemId, item.module),
    itemId: item.itemId,
    module: item.module,
    streak: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    updatedAt: nowIso,
  };
}

export async function submitSessionAnswer(
  deps: SubmitSessionAnswerDeps,
  input: SubmitSessionAnswerInput,
): Promise<SessionAnswerResult> {
  if (
    input.item.module !== "reading" &&
    input.item.module !== "writing" &&
    input.item.module !== "listening" &&
    input.item.module !== "kanji"
  ) {
    throw new Error(`Unsupported session module ${input.item.module}.`);
  }

  let result;
  let resolvedExpectedAnswer = "";

  if (input.item.module === "kanji") {
    const kanji = await deps.dataRepo.getKanjiById(input.item.itemId);

    if (!kanji) {
      throw new Error(`Missing kanji item ${input.item.itemId}.`);
    }

    if (!input.strokes) {
      throw new Error("Kanji submission requires stroke data.");
    }

    result = gradeKanjiAnswer(input.strokes, kanji.strokeSvgPaths.length);
    resolvedExpectedAnswer = kanji.character;
  } else {
    const vocab = await deps.dataRepo.getVocabById(input.item.itemId);

    if (!vocab) {
      throw new Error(`Missing vocab item ${input.item.itemId}.`);
    }

    const expectedAnswer =
      input.item.module === "writing"
        ? vocab.japanese
        : (vocab.reading ?? vocab.japanese);
    result = gradeReadingAnswer(expectedAnswer, input.userAnswer);
    resolvedExpectedAnswer = expectedAnswer;

    if (input.item.module === "writing") {
      result = gradeWritingAnswer(
        vocab.japanese,
        input.userAnswer,
        vocab.reading,
      );
    }

    if (input.item.module === "listening") {
      if (input.item.promptType === "sentence") {
        const sentence = await deps.dataRepo.getSentenceById(input.item.itemId);

        if (!sentence) {
          throw new Error(`Missing sentence item ${input.item.itemId}.`);
        }

        resolvedExpectedAnswer = sentence.reading ?? sentence.japanese;
        result = gradeListeningAnswer({
          expected: resolvedExpectedAnswer,
          actual: input.userAnswer,
          promptType: "sentence",
        });
      } else {
        resolvedExpectedAnswer = vocab.reading ?? vocab.japanese;
        result = gradeListeningAnswer({
          expected: resolvedExpectedAnswer,
          actual: input.userAnswer,
          promptType: "word",
        });
      }
    }
  }

  const quality = result.isCorrect ? 4 : 1;
  const currentReviewState =
    (await deps.progressRepo.getReviewState(
      input.item.itemId,
      input.item.module,
    )) ?? createInitialReviewState(input.item, input.nowIso);
  const currentProgress =
    (await deps.progressRepo.getUserProgress(
      input.item.itemId,
      input.item.module,
    )) ?? createInitialProgress(input.item, input.nowIso);
  const nextReview = calculateNextReview({
    nowIso: input.nowIso,
    quality,
    state: currentReviewState,
  });

  const progressRecord: ProgressRecord = {
    attempt: {
      id: crypto.randomUUID(),
      itemId: input.item.itemId,
      module: input.item.module,
      expectedAnswer: resolvedExpectedAnswer,
      userAnswer: input.userAnswer,
      createdAt: input.nowIso,
      result,
    },
    reviewState: nextReview.state,
    userProgress: {
      ...currentProgress,
      streak: result.isCorrect ? currentProgress.streak + 1 : 0,
      totalAttempts: currentProgress.totalAttempts + 1,
      correctAttempts: result.isCorrect
        ? currentProgress.correctAttempts + 1
        : currentProgress.correctAttempts,
      updatedAt: input.nowIso,
    },
  };

  await deps.progressRepo.recordAttempt(progressRecord);

  return {
    ...progressRecord,
    promotedToSM2: nextReview.promotedToSM2,
  };
}
