export type JLPTLevel = "N5" | "N4" | "N3";

export type StudyModule = "reading" | "writing" | "listening" | "kanji";

export interface VocabItem {
  id: string;
  level: JLPTLevel;
  japanese: string;
  reading?: string | undefined;
  english: string;
  partOfSpeech: "verb" | "noun" | "adjective" | "adverb" | "other";
  tags: string[];
}

export interface KanjiItem {
  id: string;
  level: JLPTLevel;
  character: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  strokeSvgPaths: string[];
  radicals: string[];
}

export interface SentenceItem {
  id: string;
  level: JLPTLevel;
  japanese: string;
  english: string;
  reading?: string | undefined;
  vocabIds: string[];
}
