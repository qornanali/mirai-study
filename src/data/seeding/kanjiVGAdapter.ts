import type { KanjiItem } from "../../types";
import { kanjiItemSchema } from "../zod";
import type { RawSeedKanji } from "./types";

export function adaptSeedKanjiItem(input: RawSeedKanji): KanjiItem {
  return kanjiItemSchema.parse({
    id: input.id,
    level: input.level,
    character: input.character,
    meaning: input.meaning,
    onyomi: input.onyomi,
    kunyomi: input.kunyomi,
    strokeSvgPaths: input.strokeSvgPaths,
    radicals: input.radicals,
  });
}
