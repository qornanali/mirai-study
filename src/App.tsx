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
import type { SentenceItem, VocabItem } from "./types";
import "./App.css";

type AppStatus = "loading" | "ready" | "error";
type SessionStatus = "idle" | "active" | "complete";

interface CompletedSessionSummary {
  answered: number;
  correct: number;
}

type InstallPromptOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallPromptOutcome;
    platform: string;
  }>;
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
  const [activeSentencePrompt, setActiveSentencePrompt] =
    useState<SentenceItem | null>(null);
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
  const [audioError, setAudioError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [voicePreference, setVoicePreference] = useState<string | undefined>();
  const [isSavingVoicePreference, setIsSavingVoicePreference] = useState(false);
  const [furiganaEnabled, setFuriganaEnabled] = useState(true);
  const [isSavingFuriganaPreference, setIsSavingFuriganaPreference] =
    useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isInstallingApp, setIsInstallingApp] = useState(false);

  const isWritingPrompt = activeItem?.module === "writing";
  const isListeningPrompt = activeItem?.module === "listening";
  const availableJapaneseVoices = availableVoices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("ja"),
  );

  const playListeningAudio = useCallback(
    (prompt: VocabItem) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setAudioError(
          "Japanese text-to-speech is not available in this browser.",
        );
        return;
      }

      const synthesis = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(
        prompt.reading ?? prompt.japanese,
      );
      const selectedVoice = selectVoiceForJapanesePlayback(
        availableVoices,
        voicePreference,
      );

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        setAudioError("No Japanese voice is available on this device.");
        return;
      }
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onerror = () => {
        setAudioError("Unable to play audio prompt.");
      };
      utterance.onend = () => {
        setAudioError(null);
      };

      synthesis.cancel();
      synthesis.speak(utterance);
    },
    [availableVoices, voicePreference],
  );

  const playListeningText = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setAudioError(
          "Japanese text-to-speech is not available in this browser.",
        );
        return;
      }

      const synthesis = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = selectVoiceForJapanesePlayback(
        availableVoices,
        voicePreference,
      );

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        setAudioError("No Japanese voice is available on this device.");
        return;
      }
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onerror = () => {
        setAudioError("Unable to play audio prompt.");
      };
      utterance.onend = () => {
        setAudioError(null);
      };

      synthesis.cancel();
      synthesis.speak(utterance);
    },
    [availableVoices, voicePreference],
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
        setFuriganaEnabled(settings.furiganaEnabled ?? true);
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
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synthesis = window.speechSynthesis;
    const updateVoices = () => {
      setAvailableVoices(synthesis.getVoices());
    };

    updateVoices();
    synthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      synthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean(
          (navigator as Navigator & { standalone?: boolean }).standalone,
        ));

    if (isStandalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setInstallPromptEvent(null);
      setIsInstallingApp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
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
        setActiveSentencePrompt(null);
        setSessionError(null);
        setAudioError(null);
        setAnswer("");
        setSubmission(null);

        if (item.module === "listening") {
          if (item.promptType === "sentence") {
            const sentence = await dataRepo.getSentenceById(item.itemId);

            if (!sentence) {
              throw new Error(
                `Missing sentence item ${item.itemId} for listening prompt.`,
              );
            }

            if (cancelled) {
              return;
            }

            setActiveSentencePrompt(sentence);
            playListeningText(sentence.reading ?? sentence.japanese);
          } else {
            playListeningAudio(prompt);
          }
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
  }, [
    activeIndex,
    playListeningAudio,
    playListeningText,
    sessionPlan,
    sessionStatus,
    status,
  ]);

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

  async function handleVoicePreferenceChange(nextPreference: string) {
    setIsSavingVoicePreference(true);
    setSettingsError(null);

    try {
      const updated = await settingsRepo.updateSettings({
        voicePreference: nextPreference.length > 0 ? nextPreference : undefined,
      });

      setVoicePreference(updated.voicePreference);
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Failed to update voice preference.",
      );
    } finally {
      setIsSavingVoicePreference(false);
    }
  }

  async function handleFuriganaPreferenceChange(nextEnabled: boolean) {
    setIsSavingFuriganaPreference(true);
    setSettingsError(null);

    try {
      const updated = await settingsRepo.updateSettings({
        furiganaEnabled: nextEnabled,
      });

      setFuriganaEnabled(updated.furiganaEnabled ?? true);
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Failed to update furigana preference.",
      );
    } finally {
      setIsSavingFuriganaPreference(false);
    }
  }

  async function handleInstallApp() {
    if (!installPromptEvent) {
      return;
    }

    setIsInstallingApp(true);

    try {
      await installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;

      if (choiceResult.outcome === "accepted") {
        setIsAppInstalled(true);
      }

      setInstallPromptEvent(null);
    } finally {
      setIsInstallingApp(false);
    }
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
      setActiveSentencePrompt(null);
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
                      onClick={() => {
                        void handleInstallApp();
                      }}
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

              <div className="voice-panel">
                <p className="section-label">Listening voice</p>
                <label
                  className="settings-label"
                  htmlFor="voice-preference-select"
                >
                  Japanese voice
                </label>
                <select
                  id="voice-preference-select"
                  className="settings-select"
                  value={voicePreference ?? ""}
                  disabled={
                    availableJapaneseVoices.length === 0 ||
                    isSavingVoicePreference
                  }
                  onChange={(event) => {
                    void handleVoicePreferenceChange(event.target.value);
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
                {settingsError && (
                  <p className="status-message status-message--error">
                    {settingsError}
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
                      void handleFuriganaPreferenceChange(event.target.checked);
                    }}
                  />
                  Show furigana during reading practice
                </label>
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
                          {activeItem.promptType === "sentence" &&
                            activeSentencePrompt && (
                              <p className="practice-hint">
                                Sentence hint: {activeSentencePrompt.english}
                              </p>
                            )}
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              if (
                                activeItem.promptType === "sentence" &&
                                activeSentencePrompt
                              ) {
                                playListeningText(
                                  activeSentencePrompt.reading ??
                                    activeSentencePrompt.japanese,
                                );
                                return;
                              }

                              if (activePrompt) {
                                playListeningAudio(activePrompt);
                              }
                            }}
                          >
                            Replay audio
                          </button>
                          {audioError && (
                            <div className="audio-error-panel">
                              <p className="status-message status-message--error">
                                {audioError}
                              </p>
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={handleNextItem}
                              >
                                Skip item
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="practice-word">
                            {activePrompt.japanese}
                          </div>
                          {furiganaEnabled && activePrompt.reading && (
                            <p className="practice-hint">
                              Furigana: {activePrompt.reading}
                            </p>
                          )}
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
