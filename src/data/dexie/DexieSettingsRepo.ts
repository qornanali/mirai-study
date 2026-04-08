import type { ISettingsRepo, UserSettings } from "../contracts";
import type { RenshuuDexieDatabase, StoredSettings } from "./db";

const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  dailyReviewCap: 30,
  ttsRate: 1,
  ttsPitch: 1,
  furiganaEnabled: true,
  practiceMode: "streak",
  listeningFocus: "word",
  readingFocus: "word",
  writingFocus: "hiragana",
  dailyGoals: {
    listening: 10,
    reading: 10,
    writing: 10,
  },
};

function toUserSettings(settings: StoredSettings | undefined): UserSettings {
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  const result: UserSettings = {
    theme: settings.theme,
    dailyReviewCap: settings.dailyReviewCap,
    ttsRate: settings.ttsRate ?? DEFAULT_SETTINGS.ttsRate,
    ttsPitch: settings.ttsPitch ?? DEFAULT_SETTINGS.ttsPitch,
    furiganaEnabled:
      settings.furiganaEnabled ?? DEFAULT_SETTINGS.furiganaEnabled,
    practiceMode: settings.practiceMode ?? DEFAULT_SETTINGS.practiceMode,
    listeningFocus: settings.listeningFocus ?? DEFAULT_SETTINGS.listeningFocus,
    readingFocus: settings.readingFocus ?? DEFAULT_SETTINGS.readingFocus,
    writingFocus: settings.writingFocus ?? DEFAULT_SETTINGS.writingFocus,
    dailyGoals: {
      listening:
        settings.dailyGoals?.listening ?? DEFAULT_SETTINGS.dailyGoals.listening,
      reading:
        settings.dailyGoals?.reading ?? DEFAULT_SETTINGS.dailyGoals.reading,
      writing:
        settings.dailyGoals?.writing ?? DEFAULT_SETTINGS.dailyGoals.writing,
    },
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
      ttsRate: settings.ttsRate ?? current.ttsRate,
      ttsPitch: settings.ttsPitch ?? current.ttsPitch,
      furiganaEnabled: Object.prototype.hasOwnProperty.call(
        settings,
        "furiganaEnabled",
      )
        ? settings.furiganaEnabled
        : current.furiganaEnabled,
      practiceMode: settings.practiceMode ?? current.practiceMode,
      listeningFocus: settings.listeningFocus ?? current.listeningFocus,
      readingFocus: settings.readingFocus ?? current.readingFocus,
      writingFocus: settings.writingFocus ?? current.writingFocus,
      dailyGoals: {
        listening:
          settings.dailyGoals?.listening ?? current.dailyGoals.listening,
        reading: settings.dailyGoals?.reading ?? current.dailyGoals.reading,
        writing: settings.dailyGoals?.writing ?? current.dailyGoals.writing,
      },
    };

    const hasVoicePreferenceUpdate = Object.prototype.hasOwnProperty.call(
      settings,
      "voicePreference",
    );
    const voicePreference = hasVoicePreferenceUpdate
      ? settings.voicePreference
      : current.voicePreference;

    if (voicePreference) {
      merged.voicePreference = voicePreference;
    }

    await this.database.settings.put(merged);

    return toUserSettings(merged);
  }
}
