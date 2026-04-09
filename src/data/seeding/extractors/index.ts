/**
 * Seed Extraction Pipeline
 *
 * Phase 3: Convert external sources (JMDict, KanjiAPI, Tatoeba, Jisho)
 * into normalized intermediate records with stable IDs.
 *
 * Exported extractors:
 * - extractFromJMDict: vocab from JMDict JSON
 * - extractFromKanjiAPI: kanji from KanjiAPI REST API
 * - extractFromTatoeba: sentences from Tatoeba CSV export
 * - orchestrateExtraction: coordinate multi-source extraction
 *
 * Each extractor produces ExtractionResult with:
 * - Extracted records (ExtractedVocab, ExtractedKanji, ExtractedSentence)
 * - Stats (input, extracted, skipped counts)
 * - Errors list
 *
 * Next phase (Phase 4-5):
 * - Normalize records (JLPT assignment, part-of-speech mapping)
 * - Deduplicate by composite keys
 * - Link sentences → vocab IDs
 * - Validate referential integrity
 */

export type {
  ExtractedVocab,
  ExtractedKanji,
  ExtractedSentence,
  ExtractionResult,
} from "../extractionTypes";

export {
  extractedVocabSchema,
  extractedKanjiSchema,
  extractedSentenceSchema,
  extractionResultSchema,
} from "../extractionTypes";

export {
  generateVocabId,
  generateKanjiId,
  generateSentenceId,
} from "../idGeneration";

export type { ExtractionConfig } from "./orchestrator";
export {
  orchestrateExtraction,
  DEFAULT_EXTRACTION_CONFIG,
} from "./orchestrator";
