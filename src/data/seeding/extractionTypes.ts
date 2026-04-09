import { z } from "zod";
import { jlptLevelSchema } from "../zod";

/**
 * Intermediate Record Types
 *
 * Used during source extraction phase to hold denormalized records before:
 * 1. Normalization (JLPT assignment, part-of-speech mapping)
 * 2. Deduplication
 * 3. Linking (sentence -> vocab resolution)
 * 4. Final packing into RawSeedPack format
 */

/**
 * Raw intermediate vocab record from source extractor.
 * May contain extra metadata not in final RawSeedVocab.
 */
export const extractedVocabSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["jmdict", "kanjiapi", "tatoeba", "jisho", "local"]),
  sourceId: z.string(),
  japanese: z.string().min(1),
  reading: z.string().min(1).optional(),
  english: z.string().min(1),
  partOfSpeech: z.string(),
  jlptLevel: jlptLevelSchema.optional(),
  frequency: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).default(() => []),
  metadata: z.record(z.string(), z.unknown()).default(() => ({})),
});

/**
 * Raw intermediate kanji record from source extractor.
 */
export const extractedKanjiSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["kanjiapi", "kanjiVG", "local"]),
  sourceId: z.string(),
  character: z.string().length(1),
  codepoint: z.string(),
  meaning: z.string().min(1),
  onyomi: z.array(z.string()),
  kunyomi: z.array(z.string()),
  strokeCount: z.number().int().positive().optional(),
  jlptLevel: jlptLevelSchema.optional(),
  radicals: z.array(z.string()).default(() => []),
  tags: z.array(z.string()).default(() => []),
  metadata: z.record(z.string(), z.unknown()).default(() => ({})),
});

/**
 * Raw intermediate sentence record from source extractor.
 */
export const extractedSentenceSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["tatoeba", "local"]),
  sourceId: z.string(),
  japanese: z.string().min(1),
  english: z.string().min(1),
  reading: z.string().optional(),
  jlptLevel: jlptLevelSchema.optional(),
  vocabReferences: z.array(
    z.object({
      japanese: z.string(),
      reading: z.string().optional(),
      sourceVocabId: z.string().optional(),
    }),
  ).default(() => []),
  tags: z.array(z.string()).default(() => []),
  metadata: z.record(z.string(), z.unknown()).default(() => ({})),
});

/**
 * Extraction result from a single source.
 */
export const extractionResultSchema = z.object({
  source: z.enum(["jmdict", "kanjiapi", "tatoeba", "jisho"]),
  timestamp: z.string().datetime(),
  vocab: z.array(extractedVocabSchema).default(() => []),
  kanji: z.array(extractedKanjiSchema).default(() => []),
  sentences: z.array(extractedSentenceSchema).default(() => []),
  stats: z.object({
    inputRecords: z.number().int().nonnegative(),
    extractedRecords: z.number().int().nonnegative(),
    skippedRecords: z.number().int().nonnegative(),
    errors: z.array(z.string()).default(() => []),
  }),
});

export type ExtractedVocab = z.infer<typeof extractedVocabSchema>;
export type ExtractedKanji = z.infer<typeof extractedKanjiSchema>;
export type ExtractedSentence = z.infer<typeof extractedSentenceSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
