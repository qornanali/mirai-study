export interface UserSettings {
  theme: "dark" | "light" | "system";
  voicePreference?: string | undefined;
  dailyReviewCap: number;
}

export interface ISettingsRepo {
  getUserSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<UserSettings>;
}
