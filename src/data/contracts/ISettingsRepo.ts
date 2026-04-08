export interface UserSettings {
  theme: "dark" | "light" | "system";
  voicePreference?: string | undefined;
  furiganaEnabled?: boolean | undefined;
  dailyReviewCap: number;
  ttsRate: number;
  ttsPitch: number;
}

export interface ISettingsRepo {
  getUserSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<UserSettings>;
}
