import { calculateNextReview } from "../../domain/srs";
import type { IJapaneseDataRepo, IProgressRepo } from "../../data/contracts";
import { createProgressId } from "../../types";
import type { ProgressRecord, ReviewState, UserProgress } from "../../types";
import type { SessionQueueItem } from "./buildDailySession";
import { gradeListeningAnswer } from "./gradeListeningAnswer";
import { gradeReadingAnswer } from "./gradeReadingAnswer";
import { gradeWritingAnswer } from "./gradeWritingAnswer";

export interface SubmitSessionAnswerDeps {
  dataRepo: IJapaneseDataRepo;
  progressRepo: IProgressRepo;
}

export interface SubmitSessionAnswerInput {
  item: SessionQueueItem;
  nowIso: string;
  userAnswer: string;
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
    input.item.module !== "listening"
  ) {
    throw new Error(`Unsupported session module ${input.item.module}.`);
  }

  const vocab = await deps.dataRepo.getVocabById(input.item.itemId);

  if (!vocab) {
    throw new Error(`Missing vocab item ${input.item.itemId}.`);
  }

  const expectedAnswer =
    input.item.module === "writing"
      ? vocab.japanese
      : (vocab.reading ?? vocab.japanese);
  let result = gradeReadingAnswer(expectedAnswer, input.userAnswer);

  if (input.item.module === "writing") {
    result = gradeWritingAnswer(
      vocab.japanese,
      input.userAnswer,
      vocab.reading,
    );
  }

  if (input.item.module === "listening") {
    result = gradeListeningAnswer({
      expected: vocab.reading ?? vocab.japanese,
      actual: input.userAnswer,
      promptType: "word",
    });
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
      expectedAnswer,
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
