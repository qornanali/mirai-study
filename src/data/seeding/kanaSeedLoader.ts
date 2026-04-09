import n5KanaVocab from "./kana/jlpt-n5-vocab.json";
import n4KanaVocab from "./kana/jlpt-n4-vocab.json";
import n3KanaVocab from "./kana/jlpt-n3-vocab.json";
import type { RawSeedPack, RawSeedVocab } from "./types";

const KANA_SEED_VERSION = 1;

function createKanaPack(
  level: "N5" | "N4" | "N3",
  vocab: RawSeedVocab[],
): RawSeedPack {
  return {
    id: `jlpt-${level.toLowerCase()}-vocab`,
    level,
    version: KANA_SEED_VERSION,
    schemaVersion: "1.0.0",
    sourceAttribution: {
      source: "local",
      attribution: "Mirai Study - curated kana vocabulary",
    },
    vocab,
    kanji: [],
    sentences: [],
  };
}

export function getKanaSeedPacks(): RawSeedPack[] {
  return [
    createKanaPack("N5", n5KanaVocab as RawSeedVocab[]),
    createKanaPack("N4", n4KanaVocab as RawSeedVocab[]),
    createKanaPack("N3", n3KanaVocab as RawSeedVocab[]),
  ];
}
