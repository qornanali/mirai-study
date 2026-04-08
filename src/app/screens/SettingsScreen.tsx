import type { ISettingsRepo } from "../../data/contracts";

export interface SettingsScreenProps {
  availableVoices: SpeechSynthesisVoice[];
  voicePreference: string | undefined;
  furiganaEnabled: boolean;
  isSavingVoicePreference: boolean;
  isSavingFuriganaPreference: boolean;
  settingsError: string | null;
  settingsRepo: ISettingsRepo;
  onVoicePreferenceChange: (preference: string) => Promise<void>;
  onFuriganaPreferenceChange: (enabled: boolean) => Promise<void>;
  onNavigateToHome: () => void;
}

export function SettingsScreen({
  availableVoices,
  voicePreference,
  furiganaEnabled,
  isSavingVoicePreference,
  isSavingFuriganaPreference,
  settingsError,
  onVoicePreferenceChange,
  onFuriganaPreferenceChange,
  onNavigateToHome,
}: SettingsScreenProps) {
  const availableJapaneseVoices = availableVoices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("ja"),
  );

  return (
    <main className="app-shell">
      <section className="status-card">
        <header className="status-header">
          <div>
            <p className="section-label">Settings</p>
            <h2>Customize your experience</h2>
          </div>
        </header>

        <section className="settings-panel">
          <div className="voice-panel">
            <p className="section-label">Listening voice</p>
            <label className="settings-label" htmlFor="voice-preference-select">
              Japanese voice
            </label>
            <select
              id="voice-preference-select"
              className="settings-select"
              value={voicePreference ?? ""}
              disabled={
                availableJapaneseVoices.length === 0 || isSavingVoicePreference
              }
              onChange={(event) => {
                void onVoicePreferenceChange(event.target.value);
              }}
            >
              <option value="">Automatic (default)</option>
              {availableJapaneseVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                </option>
              ))}
            </select>
            {availableJapaneseVoices.length === 0 && (
              <p className="practice-hint">
                No Japanese TTS voice is currently available.
              </p>
            )}
          </div>

          <div className="furigana-panel">
            <p className="section-label">Reading aid</p>
            <label className="settings-toggle" htmlFor="furigana-toggle">
              <input
                id="furigana-toggle"
                className="settings-checkbox"
                type="checkbox"
                checked={furiganaEnabled}
                disabled={isSavingFuriganaPreference}
                onChange={(event) => {
                  void onFuriganaPreferenceChange(event.target.checked);
                }}
              />
              Show furigana during reading practice
            </label>
          </div>

          {settingsError && (
            <p className="status-message status-message--error">
              {settingsError}
            </p>
          )}
        </section>

        <div className="settings-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onNavigateToHome}
          >
            Back to home
          </button>
        </div>
      </section>
    </main>
  );
}
