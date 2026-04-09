import { z } from "zod";
import { seedManifestSchema } from "./seedManifest";
import { rawSeedPackSchema } from "./types";

export type KanaStrokeScript = "hiragana" | "katakana";

export interface KanaStrokeSeedItem {
  character: string;
  strokes: number;
}

const kanaStrokeSeedItemSchema = z.object({
  character: z.string().min(1),
  strokes: z.number().int().min(1),
});

const kanaStrokeSeedSchema = z.array(kanaStrokeSeedItemSchema).min(1);

let kanaStrokeCache: {
  hiragana: KanaStrokeSeedItem[];
  katakana: KanaStrokeSeedItem[];
} | null = null;

function resolveKanaSeedManifestUrl(): string {
  const configured = import.meta.env.VITE_SEED_MANIFEST_URL;
  if (configured && configured.trim().length > 0) {
    return configured;
  }

  return "/seeds/v2026-04-09/seed-manifest.json";
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch kana seed data from ${url}`);
  }

  return response.json();
}

export async function loadKanaStrokeSeeds(): Promise<{
  hiragana: KanaStrokeSeedItem[];
  katakana: KanaStrokeSeedItem[];
}> {
  if (kanaStrokeCache) {
    return kanaStrokeCache;
  }

  const manifestRaw = await fetchJson(resolveKanaSeedManifestUrl());
  const manifest = seedManifestSchema.parse(manifestRaw);

  const hiraganaPackMetadata = manifest.packs.find(
    (pack) => pack.type === "hiragana",
  );
  const katakanaPackMetadata = manifest.packs.find(
    (pack) => pack.type === "katakana",
  );

  if (!hiraganaPackMetadata || !katakanaPackMetadata) {
    throw new Error("Kana stroke packs are missing from seed manifest.");
  }

  const [hiraganaPackRaw, katakanaPackRaw] = await Promise.all([
    fetchJson(hiraganaPackMetadata.url),
    fetchJson(katakanaPackMetadata.url),
  ]);

  const hiraganaPack = rawSeedPackSchema.parse(hiraganaPackRaw);
  const katakanaPack = rawSeedPackSchema.parse(katakanaPackRaw);

  kanaStrokeCache = {
    hiragana: kanaStrokeSeedSchema.parse(hiraganaPack.hiragana ?? []),
    katakana: kanaStrokeSeedSchema.parse(katakanaPack.katakana ?? []),
  };

  return kanaStrokeCache;
}

export async function getKanaStrokeSeedByScript(
  script: KanaStrokeScript,
): Promise<KanaStrokeSeedItem[]> {
  const seeds = await loadKanaStrokeSeeds();
  return script === "hiragana" ? seeds.hiragana : seeds.katakana;
}

export function createKanaStrokeGuidePaths(strokeCount: number): string[] {
  return Array.from({ length: strokeCount }, (_, index) => {
    const y = 24 + index * 4;
    return `M 12 ${y} L 188 ${y}`;
  });
}
