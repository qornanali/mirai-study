import type { RenshuuDexieDatabase } from "../../data/dexie";
import { checkAndApplyRemoteSeedUpdate } from "../../data/seeding/remoteSeedUpdate";

export interface AppContentSummary {
  vocab: number;
  kanji: number;
  sentences: number;
}

export interface AppBootstrapResult {
  seeded: boolean;
  seedPackId: string | null;
  summary: AppContentSummary;
}

interface InitializeAppDataOptions {
  manifestUrl?: string;
}

export async function initializeAppData(
  database: RenshuuDexieDatabase,
  options?: InitializeAppDataOptions,
): Promise<AppBootstrapResult> {
  const remoteResult = await checkAndApplyRemoteSeedUpdate(
    database,
    options?.manifestUrl ? { manifestUrl: options.manifestUrl } : undefined,
  );

  return {
    seeded: remoteResult.status === "updated",
    seedPackId:
      remoteResult.status === "updated"
        ? `remote:${remoteResult.manifestVersion}`
        : null,
    summary: remoteResult.summary,
  };
}
