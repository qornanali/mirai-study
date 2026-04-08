import n5KanaVocab from "./kana/n5.vocab.json";
import n4KanaVocab from "./kana/n4.vocab.json";
import n3KanaVocab from "./kana/n3.vocab.json";
import type { RawSeedPack, RawSeedVocab } from "./types";

const KANA_SEED_VERSION = 1;

function createKanaPack(
  level: "N5" | "N4" | "N3",
  vocab: RawSeedVocab[],
): RawSeedPack {
  return {
    id: `kana-${level.toLowerCase()}`,
    level,
    version: KANA_SEED_VERSION,
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
