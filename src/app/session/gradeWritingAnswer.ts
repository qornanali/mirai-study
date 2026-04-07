import { toKana } from "wanakana";
import type { GradingResult } from "../../types";

function normalizeKanaText(input: string): string {
  return toKana(input.normalize("NFKC").toLowerCase(), {
    useObsoleteKana: false,
  })
    .replace(/[\s\u3000]/g, "")
    .replace(/[。、,.!?！？]/g, "");
}

function normalizeJapaneseScript(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\s\u3000]/g, "")
    .replace(/[。、,.!?！？]/g, "");
}

export function gradeWritingAnswer(
  expectedJapanese: string,
  actual: string,
  reading?: string,
): GradingResult {
  const normalizedExpected = normalizeJapaneseScript(expectedJapanese);
  const normalizedActual = normalizeJapaneseScript(actual);
  const normalizedExpectedReading = reading ? normalizeKanaText(reading) : null;
  const normalizedActualReading = normalizeKanaText(actual);
  const isCorrect =
    normalizedActual === normalizedExpected ||
    (normalizedExpectedReading !== null &&
      normalizedActualReading === normalizedExpectedReading);

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    normalizedExpected,
    normalizedActual,
  };
}
