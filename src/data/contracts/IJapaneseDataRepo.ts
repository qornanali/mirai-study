import type {
  JLPTLevel,
  KanjiItem,
  SentenceItem,
  VocabItem,
} from "../../types";

export interface IJapaneseDataRepo {
  getVocabById(id: string): Promise<VocabItem | null>;
  getKanjiById(id: string): Promise<KanjiItem | null>;
  getSentenceById(id: string): Promise<SentenceItem | null>;
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
