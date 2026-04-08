import type { AppBootstrapResult } from "../../app/bootstrap";
import type { DailySessionPlan } from "../../app/session";

export interface HomeScreenProps {
  bootstrapResult: AppBootstrapResult | null;
  sessionPlan: DailySessionPlan | null;
  onNavigateToSettings: () => void;
  onNavigateToPractice: () => void;
}

export function HomeScreen({
  bootstrapResult,
  sessionPlan,
  onNavigateToSettings,
  onNavigateToPractice,
}: HomeScreenProps) {
  const canStartSession = sessionPlan && sessionPlan.items.length > 0;

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <p className="app-brand">練習 Renshuu</p>
        <button
          className="icon-button"
          type="button"
          aria-label="Open settings"
          onClick={onNavigateToSettings}
        >
          ☰
        </button>
      </header>

      <section className="hero-panel">
        <p className="eyebrow">Offline-first Japanese study</p>
        <h1>Renshuu</h1>
        <p className="hero-copy">
          Small daily drills. Calm rhythm. Better memory.
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
