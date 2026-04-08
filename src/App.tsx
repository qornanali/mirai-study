import { useEffect, useState } from "react";
import type { AppBootstrapResult } from "./app/bootstrap";
import { initializeAppData } from "./app/bootstrap";
import type { DailySessionPlan } from "./app/session";
import { buildDailySession } from "./app/session";
import { HomeScreen, PracticeScreen, SettingsScreen } from "./app/screens";
import {
  db,
  DexieJapaneseDataRepo,
  DexieProgressRepo,
  DexieSettingsRepo,
} from "./data/dexie";
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
  const [isSavingFuriganaPreference, setIsSavingFuriganaPreference] =
    useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isInstallingApp, setIsInstallingApp] = useState(false);

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
      {currentScreen === "home" && (
        <HomeScreen
          bootstrapResult={bootstrapResult}
          sessionPlan={sessionPlan}
          isAppInstalled={isAppInstalled}
          installPromptEvent={installPromptEvent}
          isInstallingApp={isInstallingApp}
          onInstallApp={handleInstallApp}
          onNavigateToSettings={() => setCurrentScreen("settings")}
          onNavigateToPractice={() => setCurrentScreen("practice")}
        />
      )}

      {currentScreen === "practice" && (
        <PracticeScreen
          sessionPlan={sessionPlan}
          availableVoices={availableVoices}
          voicePreference={voicePreference}
          furiganaEnabled={furiganaEnabled}
          dataRepo={dataRepo}
          progressRepo={progressRepo}
          onNavigateToHome={() => setCurrentScreen("home")}
        />
      )}

      {currentScreen === "settings" && (
        <SettingsScreen
          availableVoices={availableVoices}
          voicePreference={voicePreference}
          furiganaEnabled={furiganaEnabled}
          isSavingVoicePreference={isSavingVoicePreference}
          isSavingFuriganaPreference={isSavingFuriganaPreference}
          settingsError={settingsError}
          settingsRepo={settingsRepo}
          onVoicePreferenceChange={handleVoicePreferenceChange}
          onFuriganaPreferenceChange={handleFuriganaPreferenceChange}
          onNavigateToHome={() => setCurrentScreen("home")}
        />
      )}
    </>
  );
}

export default App;
