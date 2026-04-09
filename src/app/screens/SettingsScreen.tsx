import type { AppBootstrapResult } from "../../app/bootstrap";
import type {
  DailyGoals,
  ISettingsRepo,
  ListeningFocus,
  PracticeMode,
  ReadingFocus,
  WritingFocus,
} from "../../data/contracts";

export interface SettingsScreenProps {
  bootstrapResult: AppBootstrapResult | null;
  availableVoices: SpeechSynthesisVoice[];
  voicePreference: string | undefined;
  furiganaEnabled: boolean;
  practiceMode: PracticeMode;
  listeningFocus: ListeningFocus;
  readingFocus: ReadingFocus;
  writingFocus: WritingFocus;
  dailyGoals: DailyGoals;
  dailyProgress: {
    listening: number;
    reading: number;
    writing: number;
  };
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
  onPracticeModeChange: (mode: PracticeMode) => Promise<void>;
  onPracticeFiltersChange: (input: {
    listeningFocus?: ListeningFocus;
    readingFocus?: ReadingFocus;
    writingFocus?: WritingFocus;
  }) => Promise<void>;
  onDailyGoalsChange: (goals: DailyGoals) => Promise<void>;
  onNavigateToHome: () => void;
}

export function SettingsScreen({
  bootstrapResult,
  availableVoices,
  voicePreference,
  furiganaEnabled,
  practiceMode,
  listeningFocus,
  readingFocus,
  writingFocus,
  dailyGoals,
  dailyProgress,
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
  onPracticeModeChange,
  onPracticeFiltersChange,
  onDailyGoalsChange,
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
              Manually checks remote manifest and applies updates when a newer
              version is available.
            </p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                void onRefreshSeed();
              }}
              disabled={isRefreshingSeed}
            >
              {isRefreshingSeed
                ? "Checking seed updates..."
                : "Check seed updates"}
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
              Remote updates are applied only when checksums and schema
              validation pass.
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

          <div className="voice-panel">
            <p className="section-label">Practice mode</p>
            <label className="settings-label" htmlFor="practice-mode-select">
              Mode
            </label>
            <select
              id="practice-mode-select"
              className="settings-select"
              value={practiceMode}
              onChange={(event) => {
                void onPracticeModeChange(event.target.value as PracticeMode);
              }}
            >
              <option value="streak">Never ending streak</option>
              <option value="listening">Listening only</option>
              <option value="reading">Reading only</option>
              <option value="writing">Writing only</option>
            </select>
          </div>

          {practiceMode === "listening" && (
            <div className="voice-panel">
              <label
                className="settings-label"
                htmlFor="listening-focus-select"
              >
                Listening focus
              </label>
              <select
                id="listening-focus-select"
                className="settings-select"
                value={listeningFocus}
                onChange={(event) => {
                  void onPracticeFiltersChange({
                    listeningFocus: event.target.value as ListeningFocus,
                  });
                }}
              >
                <option value="sentence">Sentence</option>
                <option value="word">Word</option>
              </select>
            </div>
          )}

          {practiceMode === "reading" && (
            <div className="voice-panel">
              <label className="settings-label" htmlFor="reading-focus-select">
                Reading focus
              </label>
              <select
                id="reading-focus-select"
                className="settings-select"
                value={readingFocus}
                onChange={(event) => {
                  void onPracticeFiltersChange({
                    readingFocus: event.target.value as ReadingFocus,
                  });
                }}
              >
                <option value="sentence">Sentence</option>
                <option value="word">Word</option>
              </select>
            </div>
          )}

          {practiceMode === "writing" && (
            <div className="voice-panel">
              <label className="settings-label" htmlFor="writing-focus-select">
                Writing focus
              </label>
              <select
                id="writing-focus-select"
                className="settings-select"
                value={writingFocus}
                onChange={(event) => {
                  void onPracticeFiltersChange({
                    writingFocus: event.target.value as WritingFocus,
                  });
                }}
              >
                <option value="hiragana">Hiragana only</option>
                <option value="katakana">Katakana only</option>
                <option value="kanji">Kanji stroke</option>
              </select>
            </div>
          )}

          <div className="voice-panel">
            <p className="section-label">Daily goals</p>
            <p className="practice-hint">
              Track listening, reading, and writing attempts. Finish goals and
              continue learning.
            </p>
            <div className="summary-grid">
              <article>
                <label className="settings-label" htmlFor="listening-goal">
                  Listening
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    id="listening-goal"
                    className="settings-checkbox"
                    type="number"
                    min="1"
                    max="300"
                    value={dailyGoals.listening}
                    onChange={(event) => {
                      void onDailyGoalsChange({
                        ...dailyGoals,
                        listening: parseInt(event.target.value, 10) || 1,
                      });
                    }}
                    style={{ width: "60px" }}
                  />
                  <span style={{ fontSize: "0.85rem" }}>
                    {dailyProgress.listening}/{dailyGoals.listening}
                  </span>
                </div>
              </article>
              <article>
                <label className="settings-label" htmlFor="reading-goal">
                  Reading
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    id="reading-goal"
                    className="settings-checkbox"
                    type="number"
                    min="1"
                    max="300"
                    value={dailyGoals.reading}
                    onChange={(event) => {
                      void onDailyGoalsChange({
                        ...dailyGoals,
                        reading: parseInt(event.target.value, 10) || 1,
                      });
                    }}
                    style={{ width: "60px" }}
                  />
                  <span style={{ fontSize: "0.85rem" }}>
                    {dailyProgress.reading}/{dailyGoals.reading}
                  </span>
                </div>
              </article>
              <article>
                <label className="settings-label" htmlFor="writing-goal">
                  Writing
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  <input
                    id="writing-goal"
                    className="settings-checkbox"
                    type="number"
                    min="1"
                    max="300"
                    value={dailyGoals.writing}
                    onChange={(event) => {
                      void onDailyGoalsChange({
                        ...dailyGoals,
                        writing: parseInt(event.target.value, 10) || 1,
                      });
                    }}
                    style={{ width: "60px" }}
                  />
                  <span style={{ fontSize: "0.85rem" }}>
                    {dailyProgress.writing}/{dailyGoals.writing}
                  </span>
                </div>
              </article>
            </div>
          </div>

          {settingsError && (
            <p className="status-message status-message--error">
              {settingsError}
            </p>
          )}

          <div className="voice-panel">
            <p className="section-label">About</p>
            <p className="practice-hint">Built with love by Ali Qornan.</p>
            <p className="practice-hint">
              <a
                href="https://github.com/qornanali"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              {" · "}
              <a
                href="https://www.linkedin.com/in/aliqornan/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </p>
            <p className="practice-hint">
              Illustrations by{" "}
              <a
                href="https://www.irasutoya.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                いらすとや (irasutoya.com)
              </a>
            </p>
            <p className="practice-hint">
              ⚠️ This app is a study aid. Always verify with a dictionary and
              consult your teacher.
            </p>
          </div>
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
