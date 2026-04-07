import type { ISettingsRepo, UserSettings } from "../contracts";
import type { RenshuuDexieDatabase, StoredSettings } from "./db";

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  dailyReviewCap: 30,
};

function toUserSettings(settings: StoredSettings | undefined): UserSettings {
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  const result: UserSettings = {
    theme: settings.theme,
    dailyReviewCap: settings.dailyReviewCap,
  };

  if (settings.voicePreference) {
    result.voicePreference = settings.voicePreference;
  }

  return result;
}

export class DexieSettingsRepo implements ISettingsRepo {
  constructor(private readonly database: RenshuuDexieDatabase) {}

  async getUserSettings(): Promise<UserSettings> {
    const settings = await this.database.settings.get("user");
    return toUserSettings(settings);
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getUserSettings();
    const merged: StoredSettings = {
      id: "user",
      theme: settings.theme ?? current.theme,
      dailyReviewCap: settings.dailyReviewCap ?? current.dailyReviewCap,
    };

    const voicePreference = settings.voicePreference ?? current.voicePreference;

    if (voicePreference) {
      merged.voicePreference = voicePreference;
    }

    await this.database.settings.put(merged);

    return toUserSettings(merged);
  }
}
