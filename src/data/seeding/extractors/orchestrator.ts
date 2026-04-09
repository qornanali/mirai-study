/**
 * Seed Extraction Orchestrator
 *
 * Coordinates extraction from multiple sources (JMDict, KanjiAPI, Tatoeba, Jisho)
 * and produces a unified ExtractionResult for downstream processing
 */

import type { ExtractionResult } from "../extractionTypes";

export interface ExtractionConfig {
  sources: {
    jmdict?: {
      enabled: boolean;
      path?: string;
    };
    kanjiapi?: {
      enabled: boolean;
    };
    tatoeba?: {
      enabled: boolean;
      japaneseCSVPath?: string;
      englishCSVPath?: string;
      linksCSVPath?: string;
    };
    jisho?: {
      enabled: boolean;
    };
  };
  maxRecordsPerSource?: number;
  parallelFetch?: boolean;
}

/**
 * Orchestrate extraction from all enabled sources
 */
export async function orchestrateExtraction(config: ExtractionConfig): Promise<{
  results: ExtractionResult[];
  totalVocab: number;
  totalKanji: number;
  totalSentences: number;
  errors: string[];
}> {
  const results: ExtractionResult[] = [];
  const errors: string[] = [];

  console.log("Starting seed extraction from multiple sources...");

  const startTime = Date.now();

  try {
    // JMDict extraction
    if (config.sources.jmdict?.enabled) {
      console.log("[Orchestrator] Starting JMDict extraction...");
      try {
        const { extractFromJMDict } = await import("./jmdictExtractor");
        const path = config.sources.jmdict.path || "./data/jmdict_english.json";
        const result = await extractFromJMDict(path);
        results.push(result);
        console.log(
          `[Orchestrator] JMDict: ${result.stats.extractedRecords} vocab extracted`,
        );
      } catch (err) {
        errors.push(`JMDict extraction failed: ${err}`);
        console.warn(`[Orchestrator] JMDict extraction failed:`, err);
      }
    }

    // KanjiAPI extraction
    if (config.sources.kanjiapi?.enabled) {
      console.log("[Orchestrator] Starting KanjiAPI extraction...");
      try {
        const { extractFromKanjiAPI } = await import("./kanjiAPIExtractor");
        const result = await extractFromKanjiAPI(config.maxRecordsPerSource);
        results.push(result);
        console.log(
          `[Orchestrator] KanjiAPI: ${result.stats.extractedRecords} kanji extracted`,
        );
      } catch (err) {
        errors.push(`KanjiAPI extraction failed: ${err}`);
        console.warn(`[Orchestrator] KanjiAPI extraction failed:`, err);
      }
    }

    // Tatoeba extraction
    if (config.sources.tatoeba?.enabled) {
      console.log("[Orchestrator] Starting Tatoeba extraction...");
      try {
        const { extractFromTatoeba } = await import("./tatoebaExtractor");
        const config_ = config.sources.tatoeba;
        const result = await extractFromTatoeba(
          config_.japaneseCSVPath || "./data/sentences_jpn.csv",
          config_.englishCSVPath || "./data/sentences_eng.csv",
          config_.linksCSVPath || "./data/links.csv",
          config.maxRecordsPerSource,
        );
        results.push(result);
        console.log(
          `[Orchestrator] Tatoeba: ${result.stats.extractedRecords} sentences extracted`,
        );
      } catch (err) {
        errors.push(`Tatoeba extraction failed: ${err}`);
        console.warn(`[Orchestrator] Tatoeba extraction failed:`, err);
      }
    }

    // Jisho extraction (optional enrichment, uses existing remoteDataFetcher)
    if (config.sources.jisho?.enabled) {
      console.log("[Orchestrator] Starting Jisho enrichment...");
      try {
        const { RemoteDataFetcher } = await import("../remoteDataFetcher");
        const [n5, n4, n3] = await Promise.all([
          RemoteDataFetcher.fetchJishoVocab("N5", 2),
          RemoteDataFetcher.fetchJishoVocab("N4", 2),
          RemoteDataFetcher.fetchJishoVocab("N3", 2),
        ]);
        console.log(
          `[Orchestrator] Jisho: ${n5.length + n4.length + n3.length} vocab from enrichment`,
        );
      } catch (err) {
        console.warn(`[Orchestrator] Jisho enrichment failed (optional):`, err);
      }
    }
  } catch (err) {
    errors.push(`Extraction orchestration failed: ${err}`);
  }

  const elapsed = Date.now() - startTime;

  // Aggregate stats
  let totalVocab = 0;
  let totalKanji = 0;
  let totalSentences = 0;

  for (const result of results) {
    totalVocab += result.vocab.length;
    totalKanji += result.kanji.length;
    totalSentences += result.sentences.length;
  }

  console.log(`\n[Orchestrator] Extraction complete in ${elapsed}ms`);
  console.log(`  - Total vocab: ${totalVocab}`);
  console.log(`  - Total kanji: ${totalKanji}`);
  console.log(`  - Total sentences: ${totalSentences}`);
  if (errors.length > 0) {
    console.log(`  - Errors: ${errors.length}`);
  }

  return {
    results,
    totalVocab,
    totalKanji,
    totalSentences,
    errors,
  };
}

/**
 * Default configuration for full pipeline
 */
export const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  sources: {
    jmdict: { enabled: true },
    kanjiapi: { enabled: true },
    tatoeba: { enabled: true },
    jisho: { enabled: true },
  },
  parallelFetch: true,
} as const as ExtractionConfig;
