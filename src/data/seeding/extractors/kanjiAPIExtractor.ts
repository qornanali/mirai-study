/**
 * KanjiAPI Source Extractor - Placeholder
 * Phase 3: Source extraction interface
 */

import type { ExtractedKanji, ExtractionResult } from "../extractionTypes";

/**
 * Extract kanji from KanjiAPI
 * Placeholder implementation - to be completed in Phase 3 integration
 */
export async function extractFromKanjiAPI(
  _maxRecords?: number,
): Promise<ExtractionResult> {
  const extracted: ExtractedKanji[] = [];
  const errors: string[] = [];

  // TODO: Fetch kanji from KanjiAPI REST endpoints
  // For now, return empty result to allow build to proceed

  console.log("[KanjiAPI] Extractor initialized (placeholder)");

  return {
    source: "kanjiapi",
    timestamp: new Date().toISOString(),
    vocab: [],
    kanji: extracted,
    sentences: [],
    stats: {
      inputRecords: 0,
      extractedRecords: extracted.length,
      skippedRecords: 0,
      errors,
    },
  };
}
