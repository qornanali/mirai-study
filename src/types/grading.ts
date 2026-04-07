export interface GradingResult {
  isCorrect: boolean;
  score: number;
  normalizedExpected: string;
  normalizedActual: string;
}

export interface StudyAttempt {
  id: string;
  itemId: string;
  module: "reading" | "writing" | "listening" | "kanji";
  expectedAnswer: string;
  userAnswer: string;
  createdAt: string;
  result: GradingResult;
}
