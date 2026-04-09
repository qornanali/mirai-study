/**
 * Tatoeba Source Extractor - Placeholder
 * Phase 3: Source extraction interface
 */

import type { ExtractionResult } from "../extractionTypes";

/**
 * Extract sentences from Tatoeba CSV files
 * Placeholder implementation - to be completed in Phase 3 integration
 */
export async function extractFromTatoeba(
  _japaneseCSVPath: string,
  _englishCSVPath: string,
  _linksCSVPath: string,
  _maxRecords?: number,
): Promise<ExtractionResult> {
  const errors: string[] = [];

  // TODO: Parse Tatoeba CSV files and extract sentence pairs
  // For now, return empty result to allow build to proceed

  console.log("[Tatoeba] Extractor initialized (placeholder)");

  return {
    source: "tatoeba",
    timestamp: new Date().toISOString(),
    vocab: [],
    kanji: [],
    sentences: [],
    stats: {
      inputRecords: 0,
      extractedRecords: 0,
      skippedRecords: 0,
      errors,
    },
  };
}

/**
 * Fallback extractor for Tatoeba API
 */
export async function extractFromTatoebaAPI(
  _maxRecords?: number,
): Promise<ExtractionResult> {
  console.warn("[Tatoeba] API extraction not yet implemented; use CSV export");

  return {
    source: "tatoeba",
    timestamp: new Date().toISOString(),
    vocab: [],
    kanji: [],
    sentences: [],
    stats: {
      inputRecords: 0,
      extractedRecords: 0,
      skippedRecords: 0,
      errors: ["API extraction not implemented"],
    },
  };
}
