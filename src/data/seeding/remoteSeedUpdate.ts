import type { RenshuuDexieDatabase } from "../dexie";
import { ingestSeedDataBatch } from "./ingestSeedData";
import { seedManifestSchema, type SeedManifest } from "./seedManifest";
import { rawSeedPackSchema, type RawSeedPack } from "./types";

export interface RemoteSeedUpdateResult {
  status: "updated" | "up-to-date";
  manifestVersion: string;
  summary: {
    vocab: number;
    kanji: number;
    sentences: number;
  };
}

interface RemoteSeedUpdateOptions {
  manifestUrl?: string;
}

function resolveManifestUrl(options?: RemoteSeedUpdateOptions): string {
  const configured =
    options?.manifestUrl ?? import.meta.env.VITE_SEED_MANIFEST_URL;
  if (!configured || configured.trim().length === 0) {
    throw new Error("Missing VITE_SEED_MANIFEST_URL for remote seed updates.");
  }
  return configured;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

async function getSummary(database: RenshuuDexieDatabase): Promise<{
  vocab: number;
  kanji: number;
  sentences: number;
}> {
  const [vocab, kanji, sentences] = await Promise.all([
    database.vocabItems.count(),
    database.kanjiItems.count(),
    database.sentenceItems.count(),
  ]);

  return { vocab, kanji, sentences };
}

async function fetchJsonText(url: string): Promise<string> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

async function fetchManifest(manifestUrl: string): Promise<SeedManifest> {
  const raw = await fetchJsonText(manifestUrl);
  return seedManifestSchema.parse(JSON.parse(raw));
}

async function fetchAndValidatePacks(
  manifest: SeedManifest,
): Promise<RawSeedPack[]> {
  const packs: RawSeedPack[] = [];

  for (const metadata of manifest.packs) {
    const raw = await fetchJsonText(metadata.url);
    const hash = await sha256(raw);

    if (hash.toLowerCase() !== metadata.sha256.toLowerCase()) {
      throw new Error(`Checksum mismatch for pack ${metadata.id}`);
    }

    const parsedPack = rawSeedPackSchema.parse(JSON.parse(raw));
    packs.push(parsedPack);
  }

  return packs;
}

export async function checkAndApplyRemoteSeedUpdate(
  database: RenshuuDexieDatabase,
  options?: RemoteSeedUpdateOptions,
): Promise<RemoteSeedUpdateResult> {
  const manifestUrl = resolveManifestUrl(options);
  const manifest = await fetchManifest(manifestUrl);

  const currentVersion = (
    await database.appMeta.get("remoteSeedManifestVersion")
  )?.value;
  if (currentVersion === manifest.manifestVersion) {
    return {
      status: "up-to-date",
      manifestVersion: manifest.manifestVersion,
      summary: await getSummary(database),
    };
  }

  const packs = await fetchAndValidatePacks(manifest);
  await ingestSeedDataBatch(database, packs);

  await database.appMeta.bulkPut([
    { id: "remoteSeedManifestVersion", value: manifest.manifestVersion },
    { id: "remoteSeedPublishedAt", value: manifest.published },
  ]);

  return {
    status: "updated",
    manifestVersion: manifest.manifestVersion,
    summary: await getSummary(database),
  };
}
