import type { IJapaneseDataRepo } from "../contracts";
import type {
  JLPTLevel,
  SentenceItem,
  VocabItem,
  KanjiItem,
} from "../../types";
import { kanjiItemSchema, sentenceItemSchema, vocabItemSchema } from "../zod";
import type { RenshuuDexieDatabase } from "./db";

export class DexieJapaneseDataRepo implements IJapaneseDataRepo {
  constructor(private readonly database: RenshuuDexieDatabase) {}

  async getVocabById(id: string): Promise<VocabItem | null> {
    const row = await this.database.vocabItems.get(id);
    return row ? vocabItemSchema.parse(row) : null;
  }

  async getKanjiById(id: string): Promise<KanjiItem | null> {
    const row = await this.database.kanjiItems.get(id);
    return row ? kanjiItemSchema.parse(row) : null;
  }

  async getSentenceById(id: string): Promise<SentenceItem | null> {
    const row = await this.database.sentenceItems.get(id);
    return row ? sentenceItemSchema.parse(row) : null;
  }

  async getVocabBatch(
    level: JLPTLevel,
    limit: number,
    offset: number,
  ): Promise<VocabItem[]> {
    const rows = await this.database.vocabItems
      .where("level")
      .equals(level)
      .offset(offset)
      .limit(limit)
      .toArray();

    return rows.map((row) => vocabItemSchema.parse(row));
  }

  async getKanjiByLevel(
    level: JLPTLevel,
    limit: number,
    offset: number,
  ): Promise<KanjiItem[]> {
    const rows = await this.database.kanjiItems
      .where("level")
      .equals(level)
      .offset(offset)
      .limit(limit)
      .toArray();

    return rows.map((row) => kanjiItemSchema.parse(row));
  }

  async searchSentencesByVocab(
    vocabId: string,
    limit: number,
  ): Promise<SentenceItem[]> {
    const rows = await this.database.sentenceItems
      .where("vocabIds")
      .equals(vocabId)
      .limit(limit)
      .toArray();

    return rows.map((row) => sentenceItemSchema.parse(row));
  }

  async countItemsByLevel(level: JLPTLevel): Promise<number> {
    const [vocabCount, kanjiCount, sentenceCount] = await Promise.all([
      this.database.vocabItems.where("level").equals(level).count(),
      this.database.kanjiItems.where("level").equals(level).count(),
      this.database.sentenceItems.where("level").equals(level).count(),
    ]);

    return vocabCount + kanjiCount + sentenceCount;
  }
}
