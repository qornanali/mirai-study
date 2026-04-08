import type { AppBootstrapResult } from "../../app/bootstrap";
import type { DailySessionPlan } from "../../app/session";

export interface HomeScreenProps {
  bootstrapResult: AppBootstrapResult | null;
  sessionPlan: DailySessionPlan | null;
  isAppInstalled: boolean;
  installPromptEvent: any;
  isInstallingApp: boolean;
  onInstallApp: () => void;
  onNavigateToSettings: () => void;
  onNavigateToPractice: () => void;
}

export function HomeScreen({
  bootstrapResult,
  sessionPlan,
  isAppInstalled,
  installPromptEvent,
  isInstallingApp,
  onInstallApp,
  onNavigateToSettings,
  onNavigateToPractice,
}: HomeScreenProps) {
  const canStartSession = sessionPlan && sessionPlan.items.length > 0;

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Offline-first Japanese study</p>
        <h1>Renshuu</h1>
        <p className="hero-copy">
          The app now boots its local database on first run and loads starter
          JLPT N5 study content automatically.
        </p>
      </section>

      <section className="status-card" aria-live="polite">
        <header className="status-header">
          <div>
            <p className="section-label">Startup status</p>
            <h2>
              {bootstrapResult
                ? "Local study data is ready"
                : "Preparing local study data"}
            </h2>
          </div>
          <span className="status-pill status-pill--ready">ready</span>
        </header>

        {bootstrapResult && (
          <>
            <p className="status-message">
              {bootstrapResult.seeded
                ? `Starter seed pack ${bootstrapResult.seedPackId} was imported on this run.`
                : "Existing local content was found, so seeding was skipped."}
            </p>

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

            <section className="settings-panel">
              <div className="install-panel">
                <p className="section-label">Install app</p>
                {isAppInstalled ? (
                  <p className="practice-hint">
                    App is installed on this device.
                  </p>
                ) : installPromptEvent ? (
                  <>
                    <p className="practice-hint">
                      Install Renshuu for a full-screen, app-like experience.
                    </p>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={onInstallApp}
                      disabled={isInstallingApp}
                    >
                      {isInstallingApp
                        ? "Opening install prompt..."
                        : "Install app"}
                    </button>
                  </>
                ) : (
                  <p className="practice-hint">
                    Install option will appear when supported by your browser.
                  </p>
                )}
              </div>

              <div className="home-actions">
                <p className="section-label">Get started</p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={onNavigateToPractice}
                  disabled={!canStartSession}
                >
                  {canStartSession ? "Start practicing" : "No items available"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={onNavigateToSettings}
                >
                  Settings
                </button>
              </div>
            </section>

            {sessionPlan && (
              <section className="queue-panel">
                <p className="section-label">Today&apos;s queue</p>
                <div className="summary-grid">
                  <article>
                    <span className="summary-label">Planned items</span>
                    <strong>{sessionPlan.items.length}</strong>
                  </article>
                  <article>
                    <span className="summary-label">Due reviews</span>
                    <strong>{sessionPlan.dueCount}</strong>
                  </article>
                  <article>
                    <span className="summary-label">New items</span>
                    <strong>{sessionPlan.newCount}</strong>
                  </article>
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
