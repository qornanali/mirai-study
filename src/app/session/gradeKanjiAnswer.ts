import type { GradingResult } from "../../types";

export interface StrokePath {
  points: Array<{ x: number; y: number }>;
  timestamp: number;
}

export function gradeKanjiAnswer(
  userStrokes: StrokePath[],
  expectedStrokeCount: number,
): GradingResult {
  const userStrokeCount = userStrokes.length;

  if (userStrokeCount === 0) {
    return {
      isCorrect: false,
      score: 0,
      normalizedExpected: String(expectedStrokeCount),
      normalizedActual: "0",
    };
  }

  if (userStrokeCount !== expectedStrokeCount) {
    return {
      isCorrect: false,
      score: Math.max(
        0,
        1 -
          Math.abs(userStrokeCount - expectedStrokeCount) / expectedStrokeCount,
      ),
      normalizedExpected: String(expectedStrokeCount),
      normalizedActual: String(userStrokeCount),
    };
  }

  return {
    isCorrect: true,
    score: 1,
    normalizedExpected: String(expectedStrokeCount),
    normalizedActual: String(userStrokeCount),
  };
}
