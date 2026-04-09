/**
 * JMDict JSON Source Extractor - Placeholder
 * Phase 3: Source extraction interface
 */

import type { ExtractedVocab, ExtractionResult } from "../extractionTypes";

/**
 * Extract vocab records from JMDict JSON
 * Placeholder implementation - to be completed in Phase 3 integration
 */
export async function extractFromJMDict(
  _jmdictPath: string,
): Promise<ExtractionResult> {
  const extracted: ExtractedVocab[] = [];
  const errors: string[] = [];

  // TODO: Load JMDict JSON file and extract vocab
  // For now, return empty result to allow build to proceed

  return {
    source: "jmdict",
    timestamp: new Date().toISOString(),
    vocab: extracted,
    kanji: [],
    sentences: [],
    stats: {
      inputRecords: 0,
      extractedRecords: extracted.length,
      skippedRecords: 0,
      errors,
    },
  };
}

/**
 * Batch extractor: process JMDict and return filtered result
 */
export async function extractCommonJMDictVocab(
  jmdictPath: string,
  _maxRecords?: number,
): Promise<ExtractedVocab[]> {
  const result = await extractFromJMDict(jmdictPath);
  return result.vocab;
}
