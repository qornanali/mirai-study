import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  selectVoiceForJapanesePlayback,
  submitSessionAnswer,
  type DailySessionPlan,
  type SessionAnswerResult,
  type SessionQueueItem,
} from "../../app/session";
import type { IJapaneseDataRepo, IProgressRepo } from "../../data/contracts";
import type { SentenceItem, VocabItem } from "../../types";

export interface PracticeScreenProps {
  sessionPlan: DailySessionPlan | null;
  availableVoices: SpeechSynthesisVoice[];
  voicePreference: string | undefined;
  furiganaEnabled: boolean;
  dataRepo: IJapaneseDataRepo;
  progressRepo: IProgressRepo;
  onNavigateToHome: () => void;
}

export function PracticeScreen({
  sessionPlan,
  availableVoices,
  voicePreference,
  furiganaEnabled,
  dataRepo,
  progressRepo,
  onNavigateToHome,
}: PracticeScreenProps) {
  const [sessionStatus, setSessionStatus] = useState<
    "idle" | "active" | "complete"
  >("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeItem, setActiveItem] = useState<SessionQueueItem | null>(null);
  const [activePrompt, setActivePrompt] = useState<VocabItem | null>(null);
  const [activeSentencePrompt, setActiveSentencePrompt] =
    useState<SentenceItem | null>(null);
  const [answer, setAnswer] = useState("");
  const [submission, setSubmission] = useState<SessionAnswerResult | null>(
    null,
  );
  const [completedSessionSummary, setCompletedSessionSummary] = useState<{
    answered: number;
    correct: number;
  } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const isWritingPrompt = activeItem?.module === "writing";
  const isListeningPrompt = activeItem?.module === "listening";

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

    async function loadPrompt() {
      if (
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
        let prompt: VocabItem | null = null;
        let sentence: SentenceItem | null = null;

        if (item.module === "listening" && item.promptType === "sentence") {
          sentence = await dataRepo.getSentenceById(item.itemId);
          if (!sentence) {
            throw new Error(
              `Missing sentence item ${item.itemId} for listening prompt.`,
            );
          }
        } else {
          prompt = await dataRepo.getVocabById(item.itemId);
          if (!prompt) {
            throw new Error(
              `Missing vocab item ${item.itemId} for session prompt.`,
            );
          }
        }

        if (cancelled) {
          return;
        }

        setActiveItem(item);
        setActivePrompt(prompt);
        setActiveSentencePrompt(sentence);
        setSessionError(null);
        setAudioError(null);
        setAnswer("");
        setSubmission(null);

        if (item.module === "listening") {
          if (item.promptType === "sentence" && sentence) {
            playListeningText(sentence.reading ?? sentence.japanese);
          } else if (prompt) {
            playListeningAudio(prompt);
          }
        }

        if (item.module === "listening") {
          if (item.promptType === "sentence" && sentence) {
            playListeningText(sentence.reading ?? sentence.japanese);
          } else if (prompt) {
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
      return;
    }

    setActiveIndex(nextIndex);
  }

  function handleEndSession() {
    setSessionStatus("idle");
    setActiveIndex(0);
    setActiveItem(null);
    setActivePrompt(null);
    setActiveSentencePrompt(null);
    setAnswer("");
    setSubmission(null);
    setCompletedSessionSummary(null);
    onNavigateToHome();
  }

  if (!sessionPlan || sessionStatus === "idle") {
    return (
      <main className="app-shell">
        <section className="status-card">
          <div>
            <p className="section-label">Practice session</p>
            <h2>Ready to practice?</h2>
          </div>
          <p className="status-message">
            {!sessionPlan
              ? "Session plan is loading..."
              : "Start a session to begin studying."}
          </p>
          {sessionPlan && (
            <>
              <button
                className="primary-button"
                type="button"
                onClick={handleStartSession}
                disabled={sessionPlan.items.length === 0}
              >
                {sessionPlan.items.length === 0
                  ? "No items available"
                  : "Start session"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={onNavigateToHome}
              >
                Back to home
              </button>
            </>
          )}
        </section>
      </main>
    );
  }

  if (sessionStatus === "complete") {
    return (
      <main className="app-shell">
        <section className="status-card">
          <p className="section-label">Session complete</p>
          <h2>Great work!</h2>
          <div className="completion-panel">
            <p className="status-message">
              You answered {completedSessionSummary?.answered ?? 0} item
              {(completedSessionSummary?.answered ?? 0) === 1 ? "" : "s"}, with{" "}
              {completedSessionSummary?.correct ?? 0} correct.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={handleEndSession}
            >
              Back to home
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {sessionStatus === "active" && activePrompt && activeItem && (
        <section className="practice-panel">
          <div className="practice-card">
            <div className="practice-card__meta">
              <span>
                Item {activeIndex + 1} of {sessionPlan?.items.length}
              </span>
              <span className="practice-badge">{activeItem.type}</span>
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
                <div className="practice-word">{activePrompt.english}</div>
                <p className="practice-hint">
                  Enter Japanese script or normalized romaji.
                </p>
              </>
            ) : isListeningPrompt ? (
              <>
                <div className="practice-word">Audio prompt</div>
                <p className="practice-hint">Listen and type what you hear.</p>
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
                <div className="practice-word">{activePrompt.japanese}</div>
                {furiganaEnabled && activePrompt.reading && (
                  <p className="practice-hint">
                    Furigana: {activePrompt.reading}
                  </p>
                )}
                <p className="practice-hint">Meaning: {activePrompt.english}</p>
              </>
            )}

            <form className="practice-form" onSubmit={handleSubmit}>
              <label className="practice-label" htmlFor="reading-answer">
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
                disabled={answer.trim().length === 0 || submission !== null}
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
                  {new Date(submission.reviewState.dueAt).toLocaleString()}
                </p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleNextItem}
                >
                  {activeIndex + 1 >= (sessionPlan?.items.length ?? 0)
                    ? "Finish session"
                    : "Next item"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
