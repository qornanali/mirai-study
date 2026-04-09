import { z } from "zod";
import { jlptLevelSchema } from "../zod";

export const sourceAttributionSchema = z.object({
  source: z.enum(["local", "jmdict", "kanjiapi", "tatoeba", "jisho"]),
  attribution: z.string(),
  licenseUrl: z.string().url().optional(),
});

export const rawSeedVocabSchema = z.object({
  id: z.string().min(1),
  level: jlptLevelSchema,
  japanese: z.string().min(1),
  reading: z.string().min(1).optional(),
  english: z.string().min(1),
  partOfSpeech: z.enum(["verb", "noun", "adjective", "adverb", "other"]),
  tags: z.array(z.string()).default([]),
});

export const rawSeedKanjiSchema = z.object({
  id: z.string().min(1),
  level: jlptLevelSchema,
  character: z.string().min(1),
  meaning: z.string().min(1),
  onyomi: z.array(z.string()),
  kunyomi: z.array(z.string()),
  strokeSvgPaths: z.array(z.string()).min(1),
  radicals: z.array(z.string()).default([]),
});

export const rawSeedSentenceSchema = z.object({
  id: z.string().min(1),
  level: jlptLevelSchema,
  japanese: z.string().min(1),
  english: z.string().min(1),
  reading: z.string().min(1).optional(),
  vocabIds: z.array(z.string()),
});

export const rawSeedPackSchema = z.object({
  id: z.string().min(1),
  level: jlptLevelSchema,
  version: z.number().int().min(1),
  schemaVersion: z.string().default("1.0.0"),
  sourceAttribution: sourceAttributionSchema.optional(),
  vocab: z.array(rawSeedVocabSchema),
  kanji: z.array(rawSeedKanjiSchema),
  sentences: z.array(rawSeedSentenceSchema),
});

export type SourceAttribution = z.infer<typeof sourceAttributionSchema>;
export type RawSeedVocab = z.infer<typeof rawSeedVocabSchema>;
export type RawSeedKanji = z.infer<typeof rawSeedKanjiSchema>;
export type RawSeedSentence = z.infer<typeof rawSeedSentenceSchema>;
export type RawSeedPack = z.infer<typeof rawSeedPackSchema>;
