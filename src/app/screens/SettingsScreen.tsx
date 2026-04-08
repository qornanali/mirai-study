import type { AppBootstrapResult } from "../../app/bootstrap";
import type { ISettingsRepo } from "../../data/contracts";

export interface SettingsScreenProps {
  bootstrapResult: AppBootstrapResult | null;
  availableVoices: SpeechSynthesisVoice[];
  voicePreference: string | undefined;
  furiganaEnabled: boolean;
  isAppInstalled: boolean;
  installPromptEvent: any;
  isInstallingApp: boolean;
  isRefreshingSeed: boolean;
  isSavingVoicePreference: boolean;
  isSavingFuriganaPreference: boolean;
  settingsError: string | null;
  settingsRepo: ISettingsRepo;
  onInstallApp: () => void;
  onRefreshSeed: () => Promise<void>;
  onVoicePreferenceChange: (preference: string) => Promise<void>;
  onFuriganaPreferenceChange: (enabled: boolean) => Promise<void>;
  onNavigateToHome: () => void;
}

export function SettingsScreen({
  bootstrapResult,
  availableVoices,
  voicePreference,
  furiganaEnabled,
  isAppInstalled,
  installPromptEvent,
  isInstallingApp,
  isRefreshingSeed,
  isSavingVoicePreference,
  isSavingFuriganaPreference,
  settingsError,
  onInstallApp,
  onRefreshSeed,
  onVoicePreferenceChange,
  onFuriganaPreferenceChange,
  onNavigateToHome,
}: SettingsScreenProps) {
  const availableJapaneseVoices = availableVoices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("ja"),
  );

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <p className="app-brand">設定 Settings</p>
        <button
          className="icon-button"
          type="button"
          aria-label="Back to home"
          onClick={onNavigateToHome}
        >
          ⌂
        </button>
      </header>

      <section className="status-card">
        <header className="status-header">
          <div>
            <p className="section-label">Settings</p>
            <h2>Customize your study flow</h2>
          </div>
          <img
            src="/smart_phone_boy.png"
            alt="Boy with smartphone"
            className="mascot mascot--settings"
            aria-hidden="true"
          />
        </header>

        <section className="settings-panel">
          <div className="install-panel">
            <p className="section-label">Install app</p>
            {isAppInstalled ? (
              <p className="practice-hint">App is installed on this device.</p>
            ) : installPromptEvent ? (
              <>
                <p className="practice-hint">
                  Install for a full-screen, native-like experience.
                </p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onInstallApp}
                  disabled={isInstallingApp}
                >
                  {isInstallingApp ? "Opening prompt..." : "Install app"}
                </button>
              </>
            ) : (
              <p className="practice-hint">
                Install option appears when supported by your browser.
              </p>
            )}
          </div>

          <div className="voice-panel">
            <p className="section-label">Seed data</p>
            <p className="practice-hint">
              Refresh pulls latest curriculum and re-merges local seed packs.
            </p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                void onRefreshSeed();
              }}
              disabled={isRefreshingSeed}
            >
              {isRefreshingSeed ? "Refreshing seed..." : "Refresh seed data"}
            </button>
            {bootstrapResult && (
              <div className="summary-grid">
                <article>
                  <span className="summary-label">Vocabulary</span>
                  <strong>{bootstrapResult.summary.vocab}</strong>
                </article>
                <article>
                  <span className="summary-label">Kanji</span>
                  <strong>{bootstrapResult.summary.kanji}</strong>
                </article>
                <article>
                  <span className="summary-label">Sentences</span>
                  <strong>{bootstrapResult.summary.sentences}</strong>
                </article>
              </div>
            )}
            <p className="practice-hint">
              Remote Jisho enrichment currently expands vocabulary only. Kanji
              and sentence pools are from local seed packs.
            </p>
          </div>

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
            className="secondary-button"
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
