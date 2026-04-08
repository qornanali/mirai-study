export type PracticeMode = "streak" | "listening" | "reading" | "writing";

export type ListeningFocus = "word" | "sentence";
export type ReadingFocus = "word" | "sentence";
export type WritingFocus = "hiragana" | "katakana" | "kanji";

export interface DailyGoals {
  listening: number;
  reading: number;
  writing: number;
}

export interface DailyGoalProgress {
  date: string;
  listening: number;
  reading: number;
  writing: number;
}

export interface UserSettings {
  theme: "dark" | "light" | "system";
  voicePreference?: string | undefined;
  furiganaEnabled?: boolean | undefined;
  dailyReviewCap: number;
  ttsRate: number;
  ttsPitch: number;
  practiceMode: PracticeMode;
  listeningFocus: ListeningFocus;
  readingFocus: ReadingFocus;
  writingFocus: WritingFocus;
  dailyGoals: DailyGoals;
}

export interface ISettingsRepo {
  getUserSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<UserSettings>;
}
