import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  selectVoiceForJapanesePlayback,
  submitSessionAnswer,
  useKanaInput,
  type DailySessionPlan,
  type SessionAnswerResult,
  type SessionQueueItem,
  type StrokePath,
} from "../../app/session";
import type { IJapaneseDataRepo, IProgressRepo } from "../../data/contracts";
import type { KanjiItem, SentenceItem, VocabItem } from "../../types";
import { KanjiStrokeCanvas } from "./KanjiStrokeCanvas";

const STUDY_MASCOTS = [
  "/study_school_jugyou_boy.png",
  "/study_benkyou_old_man.png",
  "/study_benkyou_old_woman.png",
];

const GENKI_MASCOTS = [
  "/genki_pose_schoolboy.png",
  "/genki_pose_schoolgirl.png",
];

const KANJI_MASCOTS = [
  "/eto_tora_kakizome.png",
  "/eto_usagi_kakizome.png",
  "/eto_ushi_kakizome.png",
];

const THINKING_MASCOTS = ["/fukidashi7_man.png", "/fukidashi8_woman.png"];

const COMPLETE_MASCOTS = [
  "/character_juken_tako_okuto_pass.png",
  "/banzai_schoolboy2.png",
  "/banzai_schoolgirl2.png",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

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
  const [activeKanji, setActiveKanji] = useState<KanjiItem | null>(null);
  const [kanjiStrokes, setKanjiStrokes] = useState<StrokePath[]>([]);
  const kanaInput = useKanaInput();
  const [submission, setSubmission] = useState<SessionAnswerResult | null>(
    null,
  );
  const [completedSessionSummary, setCompletedSessionSummary] = useState<{
    answered: number;
    correct: number;
  } | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [idleMascot] = useState(() => pickRandom(STUDY_MASCOTS));
  const [genkiMascot] = useState(() => pickRandom(GENKI_MASCOTS));
  const [kanjiMascot] = useState(() => pickRandom(KANJI_MASCOTS));
  const [loadingMascot] = useState(() => pickRandom(THINKING_MASCOTS));
  const [completeMascot] = useState(() => pickRandom(COMPLETE_MASCOTS));
  const [correctStreak, setCorrectStreak] = useState(0);

  const isWritingPrompt = activeItem?.module === "writing";
  const isListeningPrompt = activeItem?.module === "listening";
  const isKanjiPrompt = activeItem?.module === "kanji";

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

      setPromptLoading(true);

      try {
        let prompt: VocabItem | null = null;
        let sentence: SentenceItem | null = null;
        let kanji: KanjiItem | null = null;

        if (item.module === "kanji") {
          kanji = await dataRepo.getKanjiById(item.itemId);
          if (!kanji) {
            throw new Error(`Missing kanji item ${item.itemId} for session.`);
          }
        } else if (
          item.module === "listening" &&
          item.promptType === "sentence"
        ) {
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
        setActiveKanji(kanji);
        setKanjiStrokes([]);
        setSessionError(null);
        setAudioError(null);
        kanaInput.reset();
        setSubmission(null);
        setPromptLoading(false);

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

        setPromptLoading(false);
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

    if (activeItem.module === "kanji" && kanjiStrokes.length === 0) {
      setSessionError("Please draw the kanji strokes before submitting.");
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
          userAnswer: activeItem.module === "kanji" ? "" : kanaInput.value,
          ...(activeItem.module === "kanji" && {
            strokes: kanjiStrokes,
          }),
        },
      );

      setSubmission(result);
      setCompletedSessionSummary((current) => ({
        answered: (current?.answered ?? 0) + 1,
        correct:
          (current?.correct ?? 0) + (result.attempt.result.isCorrect ? 1 : 0),
      }));
      setSessionError(null);
      if (result.attempt.result.isCorrect) {
        setCorrectStreak((prev) => prev + 1);
      } else {
        setCorrectStreak(0);
      }
    } catch (error) {
      setSessionError(
        error instanceof Error ? error.message : "Failed to submit answer.",
      );
    }
  }

  function handleStartSession() {
    setActiveIndex(0);
    setPromptLoading(true);
    setSessionStatus("active");
    setCompletedSessionSummary({ answered: 0, correct: 0 });
    setSessionError(null);
    setAudioError(null);
    setSubmission(null);
    kanaInput.reset();
    setCorrectStreak(0);
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
      setActiveKanji(null);
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
    setActiveKanji(null);
    setKanjiStrokes([]);
    kanaInput.reset();
    setSubmission(null);
    setCompletedSessionSummary(null);
    onNavigateToHome();
  }

  if (!sessionPlan || sessionStatus === "idle") {
    return (
      <main className="app-shell">
        <header className="app-topbar">
          <p className="app-brand">練習 Practice</p>
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
          <img
            src={idleMascot}
            alt="Study mascot"
            className="mascot mascot--idle"
            aria-hidden="true"
          />
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
                Exit
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
        <header className="app-topbar">
          <p className="app-brand">練習 Complete</p>
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
          <p className="section-label">Session complete</p>
          <h2>Great work!</h2>
          <img
            src={completeMascot}
            alt="Celebrating character"
            className="complete-illustration"
            aria-hidden="true"
          />
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

  if (sessionStatus === "active" && promptLoading) {
    return (
      <main className="app-shell">
        <header className="app-topbar">
          <p className="app-brand">練習 Practice</p>
          <button
            className="icon-button"
            type="button"
            aria-label="Exit session"
            onClick={handleEndSession}
          >
            ✕
          </button>
        </header>

        <section className="status-card">
          <img
            src={loadingMascot}
            alt="Thinking mascot"
            className="mascot mascot--loading"
            aria-hidden="true"
          />
          <p className="status-message">Loading next item...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <p className="app-brand">練習 Practice</p>
        <button
          className="icon-button"
          type="button"
          aria-label="Exit session"
          onClick={handleEndSession}
        >
          ✕
        </button>
      </header>

      {sessionStatus === "active" &&
        activeItem &&
        (activePrompt || activeKanji || activeSentencePrompt) && (
          <section className="practice-panel">
            <div className="practice-card">
              <div className="practice-card__meta">
                <span>
                  Item {activeIndex + 1} of {sessionPlan?.items.length}
                </span>
                <span className="practice-badge">{activeItem.type}</span>
              </div>

              <p className="section-label">
                {isKanjiPrompt
                  ? "Draw the kanji strokes"
                  : isWritingPrompt
                    ? "Write the Japanese answer"
                    : isListeningPrompt
                      ? "Transcribe the dictation"
                      : "Type the kana reading"}
              </p>
              {isKanjiPrompt && activeKanji ? (
                <>
                  <div className="practice-word">Show the meaning</div>
                  <p className="practice-hint">
                    Kanji meaning: {activeKanji.meaning}
                  </p>
                  <img
                    src={kanjiMascot}
                    alt="Calligraphy mascot"
                    className="mascot mascot--kanji"
                    aria-hidden="true"
                  />
                  <KanjiStrokeCanvas
                    character={activeKanji.character}
                    svgPaths={activeKanji.strokeSvgPaths}
                    onStrokesChange={setKanjiStrokes}
                    disabled={submission !== null}
                  />
                </>
              ) : isWritingPrompt ? (
                <>
                  {activePrompt && (
                    <>
                      <div className="practice-word">
                        {activePrompt.english}
                      </div>
                      <p className="practice-hint">
                        Enter Japanese script or normalized romaji.
                      </p>
                    </>
                  )}
                </>
              ) : isListeningPrompt ? (
                <>
                  <img
                    src="/english_smartphone_honyakuki.png"
                    alt="Listening prompt illustration"
                    className="mascot mascot--listening"
                    aria-hidden="true"
                  />
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
                  {activePrompt && (
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
                </>
              )}

              <form className="practice-form" onSubmit={handleSubmit}>
                {!isKanjiPrompt && (
                  <>
                    <label className="practice-label" htmlFor="reading-answer">
                      Your answer
                    </label>
                    <input
                      id="reading-answer"
                      className="practice-input"
                      value={kanaInput.value}
                      onChange={kanaInput.onChange}
                      placeholder={
                        isWritingPrompt
                          ? "日本語または romaji"
                          : isListeningPrompt
                            ? "ききとったかな"
                            : "かなで入力"
                      }
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      disabled={submission !== null}
                    />
                  </>
                )}
                <button
                  className="primary-button"
                  type="submit"
                  disabled={
                    isKanjiPrompt
                      ? kanjiStrokes.length === 0 || submission !== null
                      : kanaInput.value.trim().length === 0 ||
                        submission !== null
                  }
                >
                  {isKanjiPrompt ? "Check strokes" : "Check answer"}
                </button>
              </form>

              {sessionError && (
                <p className="status-message status-message--error">
                  {sessionError}
                </p>
              )}

              {submission && (
                <div className="feedback-panel">
                  <img
                    src={
                      submission.attempt.result.isCorrect
                        ? genkiMascot
                        : "/kandou_book_woman_sad.png"
                    }
                    alt={
                      submission.attempt.result.isCorrect
                        ? "Great job!"
                        : "Review notes"
                    }
                    className={
                      submission.attempt.result.isCorrect
                        ? "mascot mascot--correct"
                        : "mascot mascot--incorrect"
                    }
                    aria-hidden="true"
                  />
                  {submission.attempt.result.isCorrect &&
                    correctStreak >= 3 && (
                      <div className="streak-banner">
                        <img
                          src="/pose_hoppe_heart_schoolgirl.png"
                          alt="Streak celebration"
                          className="mascot mascot--streak"
                          aria-hidden="true"
                        />
                        <span className="streak-count">
                          {correctStreak}連続正解！
                        </span>
                        <span className="streak-label">Streak</span>
                      </div>
                    )}
                  <p
                    className={
                      submission.attempt.result.isCorrect
                        ? "feedback-text feedback-text--correct"
                        : "feedback-text feedback-text--incorrect"
                    }
                  >
                    {submission.attempt.result.isCorrect
                      ? "Correct!"
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
