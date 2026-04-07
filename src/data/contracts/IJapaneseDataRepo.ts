import type {
  JLPTLevel,
  KanjiItem,
  SentenceItem,
  VocabItem,
} from "../../types";

export interface IJapaneseDataRepo {
  getVocabBatch(
    level: JLPTLevel,
    limit: number,
    offset: number,
  ): Promise<VocabItem[]>;
  getKanjiByLevel(
    level: JLPTLevel,
    limit: number,
    offset: number,
  ): Promise<KanjiItem[]>;
  searchSentencesByVocab(
    vocabId: string,
    limit: number,
  ): Promise<SentenceItem[]>;
  countItemsByLevel(level: JLPTLevel): Promise<number>;
}
