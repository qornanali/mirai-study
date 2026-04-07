import type { GradingResult } from "../../types";
import { normalizeReadingText } from "./gradeReadingAnswer";

export function gradeKanjiAnswer(
  onyomiReadings: string[],
  actual: string,
): GradingResult {
  const normalizedActual = normalizeReadingText(actual);
  const normalizedOnyomi = onyomiReadings.map((reading) =>
    normalizeReadingText(reading),
  );

  const isCorrect = normalizedOnyomi.includes(normalizedActual);

  const normalizedExpected = normalizedOnyomi.join("、");

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    normalizedExpected,
    normalizedActual,
  };
}
