import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { initializeAppData, type AppBootstrapResult } from "./app/bootstrap";
import {
  buildDailySession,
  selectVoiceForJapanesePlayback,
  submitSessionAnswer,
  type DailySessionPlan,
  type SessionAnswerResult,
  type SessionQueueItem,
} from "./app/session";
import {
  db,
  DexieJapaneseDataRepo,
  DexieProgressRepo,
  DexieSettingsRepo,
} from "./data/dexie";
import type { VocabItem } from "./types";
import "./App.css";

type AppStatus = "loading" | "ready" | "error";
type SessionStatus = "idle" | "active" | "complete";

interface CompletedSessionSummary {
  answered: number;
  correct: number;
}

let bootstrapPromise: Promise<AppBootstrapResult> | null = null;
let appReadyPromise: Promise<{
  bootstrapResult: AppBootstrapResult;
  sessionPlan: DailySessionPlan;
}> | null = null;

const dataRepo = new DexieJapaneseDataRepo(db);
const progressRepo = new DexieProgressRepo(db);
const settingsRepo = new DexieSettingsRepo(db);

async function loadLatestSessionPlan(nowIso: string) {
  return buildDailySession(
    {
      dataRepo,
      progressRepo,
      settingsRepo,
    },
    {
      nowIso,
    },
  );
}

function App() {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [bootstrapResult, setBootstrapResult] =
    useState<AppBootstrapResult | null>(null);
  const [sessionPlan, setSessionPlan] = useState<DailySessionPlan | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [activeItem, setActiveItem] = useState<SessionQueueItem | null>(null);
  const [activePrompt, setActivePrompt] = useState<VocabItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submission, setSubmission] = useState<SessionAnswerResult | null>(
    null,
  );
  const [completedSessionSummary, setCompletedSessionSummary] =
    useState<CompletedSessionSummary | null>(null);
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voicePreference, setVoicePreference] = useState<string | undefined>();
  const [audioError, setAudioError] = useState<string | null>(null);

  const isWritingPrompt = activeItem?.module === "writing";
  const isListeningPrompt = activeItem?.module === "listening";

  const playListeningAudio = useCallback(
    (prompt: VocabItem) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setAudioError("Speech synthesis is not available in this browser.");
        return;
      }

      const synthesis = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(
        prompt.reading ?? prompt.japanese,
      );
      const voices = synthesis.getVoices();
      const selectedVoice = selectVoiceForJapanesePlayback(
        voices,
        voicePreference,
      );

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = "ja-JP";
      }

      utterance.onerror = () => {
        setAudioError("Unable to play audio prompt.");
      };
      utterance.onend = () => {
        setAudioError(null);
      };

      synthesis.cancel();
      synthesis.speak(utterance);
    },
    [voicePreference],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        bootstrapPromise ??= initializeAppData(db);
        appReadyPromise ??= bootstrapPromise.then(async (result) => ({
          bootstrapResult: result,
          sessionPlan: await loadLatestSessionPlan(new Date().toISOString()),
        }));
        const { bootstrapResult: result, sessionPlan: plannedSession } =
          await appReadyPromise;
        const settings = await settingsRepo.getUserSettings();

        if (cancelled) {
          return;
        }

        setBootstrapResult(result);
        setSessionPlan(plannedSession);
        setVoicePreference(settings.voicePreference);
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

  useEffect(() => {
    let cancelled = false;

    async function loadPrompt() {
      if (
        status !== "ready" ||
        sessionStatus !== "active" ||
        !sessionPlan ||
        sessionPlan.items.length === 0
      ) {
        return;
      }

      const item = sessionPlan.items[activeIndex] ?? null;

      if (!item) {
        if (!cancelled) {
          setActiveItem(null);
          setActivePrompt(null);
          setSessionStatus("complete");
        }
        return;
      }

      try {
        const prompt = await dataRepo.getVocabById(item.itemId);

        if (cancelled) {
          return;
        }

        if (!prompt) {
          throw new Error(
            `Missing vocab item ${item.itemId} for session prompt.`,
          );
        }

        setActiveItem(item);
        setActivePrompt(prompt);
        setSessionError(null);
        setAudioError(null);
        setAnswer("");
        setSubmission(null);

        if (item.module === "listening") {
          playListeningAudio(prompt);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionError(
          error instanceof Error
            ? error.message
            : "Failed to load session item.",
        );
      }
    }

    void loadPrompt();

    return () => {
      cancelled = true;
    };
  }, [activeIndex, playListeningAudio, sessionPlan, sessionStatus, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeItem) {
      return;
    }

    try {
      const result = await submitSessionAnswer(
        {
          dataRepo,
          progressRepo,
        },
        {
          item: activeItem,
          nowIso: new Date().toISOString(),
          userAnswer: answer,
        },
      );

      setSubmission(result);
      setCompletedSessionSummary((current) => ({
        answered: (current?.answered ?? 0) + 1,
        correct:
          (current?.correct ?? 0) + (result.attempt.result.isCorrect ? 1 : 0),
      }));
      setSessionError(null);
    } catch (error) {
      setSessionError(
        error instanceof Error ? error.message : "Failed to submit answer.",
      );
    }
  }

  function handleStartSession() {
    setActiveIndex(0);
    setSessionStatus("active");
    setCompletedSessionSummary({ answered: 0, correct: 0 });
    setSessionError(null);
    setAudioError(null);
    setSubmission(null);
    setAnswer("");
  }

  async function handleNextItem() {
    if (!sessionPlan) {
      return;
    }

    const nextIndex = activeIndex + 1;

    if (nextIndex >= sessionPlan.items.length) {
      setSessionStatus("complete");
      setActiveItem(null);
      setActivePrompt(null);
      setIsRefreshingPlan(true);

      try {
        const refreshedPlan = await loadLatestSessionPlan(
          new Date().toISOString(),
        );

        setSessionPlan(refreshedPlan);
        setSessionError(null);
      } catch (error) {
        setSessionError(
          error instanceof Error
            ? error.message
            : "Failed to refresh session plan.",
        );
      } finally {
        setIsRefreshingPlan(false);
      }

      return;
    }

    setActiveIndex(nextIndex);
  }

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

                <div className="session-panel">
                  <div className="session-panel__header">
                    <div>
                      <p className="section-label">Reading practice</p>
                      <h3>Play today&apos;s first session</h3>
                    </div>
                    {sessionStatus === "idle" &&
                      sessionPlan.items.length > 0 && (
                        <button
                          className="primary-button"
                          type="button"
                          onClick={handleStartSession}
                        >
                          Start session
                        </button>
                      )}
                  </div>

                  {sessionPlan.items.length === 0 && (
                    <p className="status-message">
                      No items are queued yet. Add more content or wait until
                      reviews are due.
                    </p>
                  )}

                  {sessionStatus === "complete" && (
                    <div className="completion-panel">
                      <p className="status-message">
                        Session complete. You answered{" "}
                        {completedSessionSummary?.answered ?? 0} item
                        {(completedSessionSummary?.answered ?? 0) === 1
                          ? ""
                          : "s"}
                        , with {completedSessionSummary?.correct ?? 0} correct.
                      </p>
                      {isRefreshingPlan ? (
                        <p className="practice-hint">
                          Refreshing today&apos;s queue...
                        </p>
                      ) : (
                        <>
                          <p className="practice-hint">
                            Updated queue: {sessionPlan.items.length} remaining
                            item
                            {sessionPlan.items.length === 1 ? "" : "s"}.
                          </p>
                          {sessionPlan.items.length > 0 && (
                            <button
                              className="primary-button"
                              type="button"
                              onClick={handleStartSession}
                            >
                              Start another session
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {sessionStatus === "active" && activePrompt && activeItem && (
                    <div className="practice-card">
                      <div className="practice-card__meta">
                        <span>
                          Item {activeIndex + 1} of {sessionPlan.items.length}
                        </span>
                        <span className="practice-badge">
                          {activeItem.type}
                        </span>
                      </div>

                      <p className="section-label">
                        {isWritingPrompt
                          ? "Write the Japanese answer"
                          : isListeningPrompt
                            ? "Transcribe the dictation"
                            : "Type the kana reading"}
                      </p>
                      {isWritingPrompt ? (
                        <>
                          <div className="practice-word">
                            {activePrompt.english}
                          </div>
                          <p className="practice-hint">
                            Enter Japanese script or normalized romaji.
                          </p>
                        </>
                      ) : isListeningPrompt ? (
                        <>
                          <div className="practice-word">Audio prompt</div>
                          <p className="practice-hint">
                            Listen and type what you hear.
                          </p>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() =>
                              activePrompt && playListeningAudio(activePrompt)
                            }
                          >
                            Replay audio
                          </button>
                          {audioError && (
                            <p className="status-message status-message--error">
                              {audioError}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="practice-word">
                            {activePrompt.japanese}
                          </div>
                          <p className="practice-hint">
                            Meaning: {activePrompt.english}
                          </p>
                        </>
                      )}

                      <form className="practice-form" onSubmit={handleSubmit}>
                        <label
                          className="practice-label"
                          htmlFor="reading-answer"
                        >
                          Your answer
                        </label>
                        <input
                          id="reading-answer"
                          className="practice-input"
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          placeholder={
                            isWritingPrompt
                              ? "日本語または romaji"
                              : isListeningPrompt
                                ? "ききとったかな"
                                : "かなで入力"
                          }
                          autoComplete="off"
                          disabled={submission !== null}
                        />
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={
                            answer.trim().length === 0 || submission !== null
                          }
                        >
                          Check answer
                        </button>
                      </form>

                      {sessionError && (
                        <p className="status-message status-message--error">
                          {sessionError}
                        </p>
                      )}

                      {submission && (
                        <div className="feedback-panel">
                          <p
                            className={
                              submission.attempt.result.isCorrect
                                ? "feedback-text feedback-text--correct"
                                : "feedback-text feedback-text--incorrect"
                            }
                          >
                            {submission.attempt.result.isCorrect
                              ? "Correct"
                              : "Not quite"}
                          </p>
                          <p className="practice-hint">
                            {activeItem.module === "writing"
                              ? `Expected answer: ${submission.attempt.expectedAnswer}`
                              : `Expected reading: ${submission.attempt.expectedAnswer}`}
                          </p>
                          <p className="practice-hint">
                            Next review:{" "}
                            {new Date(
                              submission.reviewState.dueAt,
                            ).toLocaleString()}
                          </p>
                          <button
                            className="primary-button"
                            type="button"
                            onClick={handleNextItem}
                          >
                            {activeIndex + 1 >= sessionPlan.items.length
                              ? "Finish session"
                              : "Next item"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
