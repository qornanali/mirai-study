import type { GradingResult } from "../../types";

function toHiragana(input: string): string {
  return Array.from(input)
    .map((char) => {
      const code = char.charCodeAt(0);

      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }

      return char;
    })
    .join("");
}

export function normalizeReadingText(input: string): string {
  return toHiragana(input.normalize("NFKC").toLowerCase())
    .replace(/[\s\u3000]/g, "")
    .replace(/[。、,.!?！？]/g, "");
}

export function gradeReadingAnswer(
  expected: string,
  actual: string,
): GradingResult {
  const normalizedExpected = normalizeReadingText(expected);
  const normalizedActual = normalizeReadingText(actual);
  const isCorrect = normalizedExpected === normalizedActual;

  return {
    isCorrect,
    score: isCorrect ? 1 : 0,
    normalizedExpected,
    normalizedActual,
  };
}
