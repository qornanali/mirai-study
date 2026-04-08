import { useEffect, useState } from "react";
import type { AppBootstrapResult } from "./app/bootstrap";
import {
  initializeAppData,
  refreshAppData,
  useAppUpdate,
} from "./app/bootstrap";
import type { DailySessionPlan } from "./app/session";
import { buildDailySession } from "./app/session";
import { HomeScreen, PracticeScreen, SettingsScreen } from "./app/screens";
import {
  db,
  DexieJapaneseDataRepo,
  DexieProgressRepo,
  DexieSettingsRepo,
} from "./data/dexie";
import type {
  DailyGoals,
  ListeningFocus,
  PracticeMode,
  ReadingFocus,
  WritingFocus,
} from "./data/contracts";
import "./App.css";

type AppStatus = "loading" | "ready" | "error";
type CurrentScreen = "home" | "practice" | "settings";

type InstallPromptOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallPromptOutcome;
    platform: string;
  }>;
}

const dataRepo = new DexieJapaneseDataRepo(db);
const progressRepo = new DexieProgressRepo(db);
const settingsRepo = new DexieSettingsRepo(db);

let bootstrapPromise: Promise<AppBootstrapResult> | null = null;
let appReadyPromise: Promise<{
  bootstrapResult: AppBootstrapResult;
  sessionPlan: DailySessionPlan;
}> | null = null;

async function loadLatestSessionPlan(
  nowIso: string,
  overrideMode?: PracticeMode,
) {
  return buildDailySession(
    {
      dataRepo,
      progressRepo,
      settingsRepo,
    },
    {
      nowIso,
      overrideMode,
    },
  );
}

function App() {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>("home");
  const [bootstrapResult, setBootstrapResult] =
    useState<AppBootstrapResult | null>(null);
  const [sessionPlan, setSessionPlan] = useState<DailySessionPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [voicePreference, setVoicePreference] = useState<string | undefined>();
  const [isSavingVoicePreference, setIsSavingVoicePreference] = useState(false);
  const [furiganaEnabled, setFuriganaEnabled] = useState(true);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("streak");
  const [listeningFocus, setListeningFocus] = useState<ListeningFocus>("word");
  const [readingFocus, setReadingFocus] = useState<ReadingFocus>("word");
  const [writingFocus, setWritingFocus] = useState<WritingFocus>("hiragana");
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    listening: 10,
    reading: 10,
    writing: 10,
  });
  const [dailyProgress, setDailyProgress] = useState({
    listening: 0,
    reading: 0,
    writing: 0,
  });
  const [isSavingFuriganaPreference, setIsSavingFuriganaPreference] =
    useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isInstallingApp, setIsInstallingApp] = useState(false);
  const [isRefreshingSeed, setIsRefreshingSeed] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const { updateAvailable } = useAppUpdate();

  const showUpdateBanner = updateAvailable && !updateDismissed;

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
        const todayProgress = await progressRepo.getDailyModuleAttempts(
          new Date().toISOString(),
        );

        setVoicePreference(settings.voicePreference);
        setFuriganaEnabled(settings.furiganaEnabled ?? true);
        setPracticeMode(settings.practiceMode);
        setListeningFocus(settings.listeningFocus);
        setReadingFocus(settings.readingFocus);
        setWritingFocus(settings.writingFocus);
        setDailyGoals(settings.dailyGoals);
        setDailyProgress({
          listening: todayProgress.listening,
          reading: todayProgress.reading,
          writing: todayProgress.writing,
        });
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

  async function handleRefreshSeed() {
    setIsRefreshingSeed(true);
    setSettingsError(null);

    try {
      const nowIso = new Date().toISOString();
      const result = await refreshAppData(db);
      const plannedSession = await loadLatestSessionPlan(nowIso, practiceMode);
      const todayProgress = await progressRepo.getDailyModuleAttempts(nowIso);
      setBootstrapResult(result);
      setSessionPlan(plannedSession);
      setDailyProgress({
        listening: todayProgress.listening,
        reading: todayProgress.reading,
        writing: todayProgress.writing,
      });
      appReadyPromise = null;
      bootstrapPromise = null;
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Failed to refresh study seed data.",
      );
    } finally {
      setIsRefreshingSeed(false);
    }
  }

  async function handlePracticeModeChange(nextMode: PracticeMode) {
    setSettingsError(null);

    try {
      const updated = await settingsRepo.updateSettings({
        practiceMode: nextMode,
      });
      const nowIso = new Date().toISOString();
      const plannedSession = await loadLatestSessionPlan(nowIso, nextMode);
      const todayProgress = await progressRepo.getDailyModuleAttempts(nowIso);
      setPracticeMode(updated.practiceMode);
      setListeningFocus(updated.listeningFocus);
      setReadingFocus(updated.readingFocus);
      setWritingFocus(updated.writingFocus);
      setDailyGoals(updated.dailyGoals);
      setSessionPlan(plannedSession);
      setDailyProgress({
        listening: todayProgress.listening,
        reading: todayProgress.reading,
        writing: todayProgress.writing,
      });
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Failed to update practice mode.",
      );
    }
  }

  async function handlePracticeFiltersChange(input: {
    listeningFocus?: ListeningFocus;
    readingFocus?: ReadingFocus;
    writingFocus?: WritingFocus;
  }) {
    setSettingsError(null);

    try {
      const updated = await settingsRepo.updateSettings(input);
      const nowIso = new Date().toISOString();
      const plannedSession = await loadLatestSessionPlan(
        nowIso,
        updated.practiceMode,
      );
      setPracticeMode(updated.practiceMode);
      setListeningFocus(updated.listeningFocus);
      setReadingFocus(updated.readingFocus);
      setWritingFocus(updated.writingFocus);
      setDailyGoals(updated.dailyGoals);
      setSessionPlan(plannedSession);
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Failed to update practice filters.",
      );
    }
  }

  async function handleDailyGoalsChange(nextGoals: DailyGoals) {
    setSettingsError(null);

    try {
      const sanitizedGoals: DailyGoals = {
        listening: Math.max(1, Math.min(300, Math.round(nextGoals.listening))),
        reading: Math.max(1, Math.min(300, Math.round(nextGoals.reading))),
        writing: Math.max(1, Math.min(300, Math.round(nextGoals.writing))),
      };
      const updated = await settingsRepo.updateSettings({
        dailyGoals: sanitizedGoals,
      });
      setDailyGoals(updated.dailyGoals);
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Failed to update daily goals.",
      );
    }
  }

  async function handleSessionProgressUpdate() {
    const nowIso = new Date().toISOString();
    const todayProgress = await progressRepo.getDailyModuleAttempts(nowIso);
    setDailyProgress({
      listening: todayProgress.listening,
      reading: todayProgress.reading,
      writing: todayProgress.writing,
    });
  }

  if (status === "loading") {
    return (
      <main className="app-shell">
        <section className="hero-panel">
          <p className="eyebrow">Offline-first Japanese study</p>
          <h1>Renshuu</h1>
        </section>

        <section className="status-card" aria-live="polite">
          <p className="section-label">Startup status</p>
          <h2>Preparing local study data</h2>
          <p className="status-message">
            Initializing IndexedDB and checking whether starter content needs to
            be imported.
          </p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="app-shell">
        <section className="hero-panel">
          <p className="eyebrow">Offline-first Japanese study</p>
          <h1>Renshuu</h1>
        </section>

        <section className="status-card" aria-live="polite">
          <p className="section-label">Startup error</p>
          <h2>Failed to initialize</h2>
          <p className="status-message status-message--error">{errorMessage}</p>
        </section>
      </main>
    );
  }

  return (
    <>
      {showUpdateBanner && (
        <div className="update-banner" role="alert">
          <span>New version available</span>
          <div className="update-banner__actions">
            <button
              className="update-banner__reload"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              className="update-banner__dismiss"
              type="button"
              aria-label="Dismiss update notification"
              onClick={() => setUpdateDismissed(true)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {currentScreen === "home" && (
        <HomeScreen
          bootstrapResult={bootstrapResult}
          sessionPlan={sessionPlan}
          practiceMode={practiceMode}
          dailyGoals={dailyGoals}
          dailyProgress={dailyProgress}
          onNavigateToSettings={() => setCurrentScreen("settings")}
          onNavigateToPractice={() => setCurrentScreen("practice")}
        />
      )}

      {currentScreen === "practice" && (
        <PracticeScreen
          sessionPlan={sessionPlan}
          practiceMode={practiceMode}
          listeningFocus={listeningFocus}
          readingFocus={readingFocus}
          writingFocus={writingFocus}
          dailyGoals={dailyGoals}
          dailyProgress={dailyProgress}
          availableVoices={availableVoices}
          voicePreference={voicePreference}
          furiganaEnabled={furiganaEnabled}
          dataRepo={dataRepo}
          progressRepo={progressRepo}
          onPracticeModeChange={handlePracticeModeChange}
          onPracticeFiltersChange={handlePracticeFiltersChange}
          onSessionProgressUpdate={handleSessionProgressUpdate}
          onNavigateToHome={() => setCurrentScreen("home")}
        />
      )}

      {currentScreen === "settings" && (
        <SettingsScreen
          bootstrapResult={bootstrapResult}
          availableVoices={availableVoices}
          voicePreference={voicePreference}
          furiganaEnabled={furiganaEnabled}
          practiceMode={practiceMode}
          listeningFocus={listeningFocus}
          readingFocus={readingFocus}
          writingFocus={writingFocus}
          dailyGoals={dailyGoals}
          dailyProgress={dailyProgress}
          isAppInstalled={isAppInstalled}
          installPromptEvent={installPromptEvent}
          isInstallingApp={isInstallingApp}
          isRefreshingSeed={isRefreshingSeed}
          isSavingVoicePreference={isSavingVoicePreference}
          isSavingFuriganaPreference={isSavingFuriganaPreference}
          settingsError={settingsError}
          settingsRepo={settingsRepo}
          onInstallApp={handleInstallApp}
          onRefreshSeed={handleRefreshSeed}
          onVoicePreferenceChange={handleVoicePreferenceChange}
          onFuriganaPreferenceChange={handleFuriganaPreferenceChange}
          onPracticeModeChange={handlePracticeModeChange}
          onPracticeFiltersChange={handlePracticeFiltersChange}
          onDailyGoalsChange={handleDailyGoalsChange}
          onNavigateToHome={() => setCurrentScreen("home")}
        />
      )}
    </>
  );
}

export default App;
