import type { GradingResult } from "../../types";
import { normalizeReadingText } from "./gradeReadingAnswer";

export interface ListeningThresholds {
  word: number;
  sentence: number;
}

export interface GradeListeningInput {
  expected: string;
  actual: string;
  promptType: "word" | "sentence";
  thresholds?: ListeningThresholds;
}

const DEFAULT_THRESHOLDS: ListeningThresholds = {
  word: 0.9,
  sentence: 0.8,
};

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row += 1) {
    let diagonal = previous[0] as number;
    previous[0] = row;

    for (let column = 1; column <= b.length; column += 1) {
      const current = previous[column] as number;
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;

      previous[column] = Math.min(
        (previous[column - 1] as number) + 1,
        current + 1,
        diagonal + substitutionCost,
      );

      diagonal = current;
    }
  }

  return previous[b.length] as number;
}

function similarityScore(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) {
    return 1;
  }

  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLength;
}

export function gradeListeningAnswer(
  input: GradeListeningInput,
): GradingResult {
  const normalizedExpected = normalizeReadingText(input.expected);
  const normalizedActual = normalizeReadingText(input.actual);
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const threshold =
    input.promptType === "sentence" ? thresholds.sentence : thresholds.word;
  const score = similarityScore(normalizedExpected, normalizedActual);

  return {
    isCorrect: score >= threshold,
    score,
    normalizedExpected,
    normalizedActual,
  };
}
