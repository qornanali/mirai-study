import Dexie, { type EntityTable } from "dexie";
import type {
  KanjiItem,
  ReviewState,
  SentenceItem,
  StudyAttempt,
  UserProgress,
  VocabItem,
} from "../../types";
import type { UserSettings } from "../contracts";

export interface StoredSettings extends UserSettings {
  id: "user";
}

export interface AppMetaRecord {
  id: string;
  value: string;
}

export class RenshuuDexieDatabase extends Dexie {
  vocabItems!: EntityTable<VocabItem, "id">;
  kanjiItems!: EntityTable<KanjiItem, "id">;
  sentenceItems!: EntityTable<SentenceItem, "id">;
  reviewStates!: EntityTable<ReviewState, "id">;
  userProgress!: EntityTable<UserProgress, "id">;
  attempts!: EntityTable<StudyAttempt, "id">;
  settings!: EntityTable<StoredSettings, "id">;
  appMeta!: EntityTable<AppMetaRecord, "id">;

  constructor(name = "renshuu") {
    super(name);

    this.version(1).stores({
      vocabItems: "id, level",
      kanjiItems: "id, level",
      sentenceItems: "id, level, *vocabIds",
      reviewStates: "id, itemId, dueAt, module, algorithm",
      userProgress: "id, itemId, module, updatedAt",
      attempts: "id, itemId, module, createdAt",
      settings: "id",
    });

    this.version(2).stores({
      vocabItems: "id, level",
      kanjiItems: "id, level",
      sentenceItems: "id, level, *vocabIds",
      reviewStates: "id, itemId, dueAt, module, algorithm",
      userProgress: "id, itemId, module, updatedAt",
      attempts: "id, itemId, module, createdAt",
      settings: "id",
      appMeta: "id",
    });
  }
}

export function createRenshuuDexieDatabase(
  name?: string,
): RenshuuDexieDatabase {
  return new RenshuuDexieDatabase(name);
}

export const db = createRenshuuDexieDatabase();
