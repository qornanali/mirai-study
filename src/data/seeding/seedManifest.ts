import { z } from "zod";
import { jlptLevelSchema } from "../zod";

/**
 * Metadata about a single seed pack published to remote storage.
 * Includes version, checksum for integrity validation, URL, and source attribution.
 */
export const seedPackMetadataSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe("Unique pack identifier (e.g., jlpt-n5-vocab)"),
  type: z.enum(["vocab", "kanji", "sentence"]).describe("Pack content type"),
  level: jlptLevelSchema.describe("JLPT level (N5, N4, N3, N2, N1)"),
  packVersion: z.number().int().min(1).describe("Pack-level version counter"),
  recordCount: z.number().int().min(0).describe("Total records in this pack"),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .describe("SHA-256 checksum of pack file"),
  url: z
    .string()
    .url()
    .describe("Remote URL to download pack (GitHub raw URL)"),
  sourceAttribution: z
    .string()
    .describe("Attribution and license info (e.g., 'JMDict CC-BY-SA 4.0')"),
});

/**
 * Global manifest published alongside seed packs.
 * Versioned, immutable, and used by app to detect available updates.
 */
export const seedManifestSchema = z.object({
  manifestVersion: z
    .string()
    .describe("Semantic version of manifest format itself (e.g., '1.0.0')"),
  published: z
    .string()
    .datetime()
    .describe("ISO 8601 timestamp when manifest was published"),
  packs: z
    .array(seedPackMetadataSchema)
    .describe("Array of all available seed packs"),
});

export type SeedPackMetadata = z.infer<typeof seedPackMetadataSchema>;
export type SeedManifest = z.infer<typeof seedManifestSchema>;

/**
 * Generates a seed-manifest.json file path for a given version.
 * Versions are immutable and stored in versioned directories.
 * @param version - Version identifier (e.g., "v1.0.0" or "v2026-04-09")
 */
export function getManifestUrl(baseUrl: string, version: string): string {
  return `${baseUrl}/seeds/${version}/seed-manifest.json`;
}

/**
 * Generates a seed pack file path for a given version.
 * @param baseUrl - Base GitHub raw URL (e.g., https://raw.githubusercontent.com/org/repo/main)
 * @param version - Version identifier (e.g., "v1.0.0" or "v2026-04-09")
 * @param packId - Pack ID (e.g., "jlpt-n5-vocab")
 */
export function getPackUrl(
  baseUrl: string,
  version: string,
  packId: string,
): string {
  return `${baseUrl}/seeds/${version}/${packId}.json`;
}
