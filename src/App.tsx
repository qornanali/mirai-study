import { useEffect, useState } from "react";
import { initializeAppData, type AppBootstrapResult } from "./app/bootstrap";
import { buildDailySession, type DailySessionPlan } from "./app/session";
import {
  db,
  DexieJapaneseDataRepo,
  DexieProgressRepo,
  DexieSettingsRepo,
} from "./data/dexie";
import "./App.css";

type AppStatus = "loading" | "ready" | "error";

let bootstrapPromise: Promise<AppBootstrapResult> | null = null;

function App() {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [bootstrapResult, setBootstrapResult] =
    useState<AppBootstrapResult | null>(null);
  const [sessionPlan, setSessionPlan] = useState<DailySessionPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        bootstrapPromise ??= initializeAppData(db);
        const [result, plannedSession] = await Promise.all([
          bootstrapPromise,
          buildDailySession(
            {
              dataRepo: new DexieJapaneseDataRepo(db),
              progressRepo: new DexieProgressRepo(db),
              settingsRepo: new DexieSettingsRepo(db),
            },
            {
              nowIso: new Date().toISOString(),
            },
          ),
        ]);

        if (cancelled) {
          return;
        }

        setBootstrapResult(result);
        setSessionPlan(plannedSession);
        setStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to initialize app data.";

        setErrorMessage(message);
        setStatus("error");
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

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
              {status === "loading" && "Preparing local study data"}
              {status === "ready" && "Local study data is ready"}
              {status === "error" && "Startup failed"}
            </h2>
          </div>
          <span className={`status-pill status-pill--${status}`}>{status}</span>
        </header>

        {status === "loading" && (
          <p className="status-message">
            Initializing IndexedDB and checking whether starter content needs to
            be imported.
          </p>
        )}

        {status === "error" && (
          <p className="status-message status-message--error">{errorMessage}</p>
        )}

        {status === "ready" && bootstrapResult && (
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

export default App;
