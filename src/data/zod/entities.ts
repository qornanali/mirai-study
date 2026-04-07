import { z } from "zod";

export const jlptLevelSchema = z.enum(["N5", "N4", "N3"]);

export const studyModuleSchema = z.enum([
  "reading",
  "writing",
  "listening",
  "kanji",
]);

export const vocabItemSchema = z.object({
  id: z.string().min(1),
  level: jlptLevelSchema,
  japanese: z.string().min(1),
  reading: z.string().min(1).optional(),
  english: z.string().min(1),
  partOfSpeech: z.enum(["verb", "noun", "adjective", "adverb", "other"]),
  tags: z.array(z.string()),
});

export const kanjiItemSchema = z.object({
  id: z.string().min(1),
  level: jlptLevelSchema,
  character: z.string().min(1),
  meaning: z.string().min(1),
  onyomi: z.array(z.string()),
  kunyomi: z.array(z.string()),
  strokeSvgPaths: z.array(z.string()).min(1),
  radicals: z.array(z.string()),
});

export const sentenceItemSchema = z.object({
  id: z.string().min(1),
  level: jlptLevelSchema,
  japanese: z.string().min(1),
  english: z.string().min(1),
  reading: z.string().min(1).optional(),
  vocabIds: z.array(z.string()),
});
