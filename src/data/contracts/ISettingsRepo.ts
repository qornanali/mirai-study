export interface UserSettings {
  theme: "dark" | "light" | "system";
  voicePreference?: string;
  dailyReviewCap: number;
}

export interface ISettingsRepo {
  getUserSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<UserSettings>;
}
