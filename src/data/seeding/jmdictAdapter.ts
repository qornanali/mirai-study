import type { SentenceItem, VocabItem } from "../../types";
import { sentenceItemSchema, vocabItemSchema } from "../zod";
import type { RawSeedSentence, RawSeedVocab } from "./types";

export function adaptSeedVocabItem(input: RawSeedVocab): VocabItem {
  return vocabItemSchema.parse({
    id: input.id,
    level: input.level,
    japanese: input.japanese,
    reading: input.reading,
    english: input.english,
    partOfSpeech: input.partOfSpeech,
    tags: input.tags,
  });
}

export function adaptSeedSentenceItem(input: RawSeedSentence): SentenceItem {
  return sentenceItemSchema.parse({
    id: input.id,
    level: input.level,
    japanese: input.japanese,
    reading: input.reading,
    english: input.english,
    vocabIds: input.vocabIds,
  });
}
