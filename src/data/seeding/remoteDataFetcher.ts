import type { RawSeedPack, RawSeedVocab } from "./types";

interface JishoJapanese {
  word?: string;
  reading: string;
}

interface JishoSense {
  english_definitions: string[];
  parts_of_speech: string[];
}

interface JishoWord {
  slug: string;
  jlpt: string[];
  japanese: JishoJapanese[];
  senses: JishoSense[];
}

interface JishoResponse {
  meta: { status: number };
  data: JishoWord[];
}

function mapPartOfSpeech(jishoPos: string[]): RawSeedVocab["partOfSpeech"] {
  const flat = jishoPos.join(" ").toLowerCase();
  if (flat.includes("verb")) return "verb";
  if (flat.includes("adjective")) return "adjective";
  if (flat.includes("adverb")) return "adverb";
  if (flat.includes("noun")) return "noun";
  return "other";
}

function jishoWordToVocab(
  entry: JishoWord,
  level: "N5" | "N4" | "N3",
): RawSeedVocab | null {
  const japanese = entry.japanese[0];
  if (!japanese) return null;

  const wordForm: string = japanese.word ?? japanese.reading;
  const reading: string = japanese.reading;
  const sense = entry.senses.find(
    (s) => !s.parts_of_speech.includes("Wikipedia definition"),
  );
  if (!sense || sense.english_definitions.length === 0) return null;

  const english = sense.english_definitions[0];
  if (!english) return null;

  return {
    id: `${level.toLowerCase()}-vocab-${entry.slug}`,
    level,
    japanese: wordForm,
    reading,
    english,
    partOfSpeech: mapPartOfSpeech(sense.parts_of_speech),
    tags: [level.toLowerCase()],
  };
}

export class RemoteDataFetcher {
  private static readonly JISHO_BASE = "https://jisho.org/api/v1/search/words";

  static async fetchJishoVocab(
    level: "N5" | "N4" | "N3",
    maxPages = 5,
  ): Promise<RawSeedVocab[]> {
    const keyword = encodeURIComponent(`#jlpt-${level.toLowerCase()}`);
    const vocab: RawSeedVocab[] = [];
    const seenIds = new Set<string>();

    for (let page = 1; page <= maxPages; page++) {
      try {
        const url = `${this.JISHO_BASE}?keyword=${keyword}&page=${page}`;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) {
          console.warn(
            `Jisho HTTP ${response.status} for ${level} page ${page}`,
          );
          break;
        }

        const data: JishoResponse = await response.json();
        if (data.meta.status !== 200 || data.data.length === 0) {
          console.log(`Jisho ${level} reached end at page ${page}`);
          break;
        }

        let itemsAdded = 0;
        for (const entry of data.data) {
          const item = jishoWordToVocab(entry, level);
          if (item && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            vocab.push(item);
            itemsAdded++;
          }
        }
        console.log(
          `Jisho ${level} page ${page}: +${itemsAdded} items (total: ${vocab.length})`,
        );
      } catch (error) {
        console.warn(`Failed to fetch Jisho page ${page} for ${level}:`, error);
        if (vocab.length === 0) break;
      }
    }

    console.log(`Jisho ${level} fetch complete: ${vocab.length} items`);
    return vocab;
  }

  static async buildEnrichedN5N3Curriculum(): Promise<RawSeedPack | null> {
    try {
      console.log("Starting remote curriculum fetch from Jisho...");
      const startTime = Date.now();
      const [n5Vocab, n4Vocab, n3Vocab] = await Promise.all([
        this.fetchJishoVocab("N5", 2),
        this.fetchJishoVocab("N4", 2),
        this.fetchJishoVocab("N3", 2),
      ]);

      const allVocab = [...n5Vocab, ...n4Vocab, ...n3Vocab];
      const elapsed = Date.now() - startTime;
      console.log(
        `Remote curriculum complete in ${elapsed}ms: ${allVocab.length} total vocab`,
      );
      if (allVocab.length < 30) {
        console.warn(
          `Remote vocab too small (${allVocab.length} < 30), falling back to local seeds`,
        );
        return null;
      }

      console.log("✓ Remote curriculum loaded successfully");
      return {
        id: "jlpt-n5-n3-enriched",
        level: "N5",
        version: 1,
        schemaVersion: "1.0.0",
        sourceAttribution: {
          source: "jisho",
          attribution: "Jisho.org - Japanese-English Dictionary API",
          licenseUrl: "https://jisho.org/about",
        },
        vocab: allVocab,
        kanji: [],
        sentences: [],
      };
    } catch (error) {
      console.error("✗ Failed to build enriched curriculum:", error);
      return null;
    }
  }
}
