import type { ExtractionResult } from "./extractionTypes";
import { rawSeedPackSchema, type RawSeedPack } from "./types";

type JlptLevel = "N5" | "N4" | "N3";
type PartOfSpeech = "verb" | "noun" | "adjective" | "adverb" | "other";

interface SentenceReference {
  japanese: string;
  reading?: string;
  sourceVocabId?: string;
}

export interface Phase45Report {
  input: {
    vocab: number;
    kanji: number;
    sentences: number;
  };
  normalized: {
    vocab: number;
    kanji: number;
    sentences: number;
  };
  dropped: {
    vocab: number;
    kanji: number;
    sentences: number;
  };
  unresolvedSentenceReferences: number;
  validationErrors: string[];
}

export interface Phase45Result {
  packs: RawSeedPack[];
  report: Phase45Report;
}

export interface Phase45Options {
  packVersion?: number;
  schemaVersion?: string;
}

function normalizePartOfSpeech(value: string): PartOfSpeech {
  const input = value.toLowerCase();
  if (input.includes("verb")) return "verb";
  if (input.includes("noun")) return "noun";
  if (input.includes("adj")) return "adjective";
  if (input.includes("adverb") || input.includes("adv")) return "adverb";
  return "other";
}

function inferLevel(
  explicitLevel: JlptLevel | undefined,
  tags: string[],
  source: string,
): JlptLevel | null {
  if (explicitLevel) return explicitLevel;

  const lowerTags = tags.map((tag) => tag.toLowerCase());
  if (lowerTags.includes("n5") || lowerTags.includes("jlpt-n5")) return "N5";
  if (lowerTags.includes("n4") || lowerTags.includes("jlpt-n4")) return "N4";
  if (lowerTags.includes("n3") || lowerTags.includes("jlpt-n3")) return "N3";

  if (source === "jisho") {
    if (lowerTags.some((tag) => tag.includes("n5"))) return "N5";
    if (lowerTags.some((tag) => tag.includes("n4"))) return "N4";
    if (lowerTags.some((tag) => tag.includes("n3"))) return "N3";
  }

  return null;
}

function uniqueByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function buildVocabIndexes(
  vocab: Array<{ id: string; japanese: string; reading: string | undefined }>,
): {
  byId: Map<string, string>;
  byTextWithReading: Map<string, string>;
  byText: Map<string, string>;
} {
  const byId = new Map<string, string>();
  const byTextWithReading = new Map<string, string>();
  const byText = new Map<string, string>();

  for (const item of vocab) {
    byId.set(item.id, item.id);
    byTextWithReading.set(`${item.japanese}|${item.reading ?? ""}`, item.id);
    if (!byText.has(item.japanese)) {
      byText.set(item.japanese, item.id);
    }
  }

  return { byId, byTextWithReading, byText };
}

function resolveSentenceVocabIds(
  references: SentenceReference[],
  indexes: ReturnType<typeof buildVocabIndexes>,
): { ids: string[]; unresolvedCount: number } {
  const resolved = new Set<string>();
  let unresolvedCount = 0;

  for (const ref of references) {
    let resolvedId: string | undefined;

    if (ref.sourceVocabId) {
      resolvedId = indexes.byId.get(ref.sourceVocabId);
    }

    if (!resolvedId) {
      resolvedId = indexes.byTextWithReading.get(
        `${ref.japanese}|${ref.reading ?? ""}`,
      );
    }

    if (!resolvedId) {
      resolvedId = indexes.byText.get(ref.japanese);
    }

    if (resolvedId) {
      resolved.add(resolvedId);
    } else {
      unresolvedCount += 1;
    }
  }

  return { ids: Array.from(resolved), unresolvedCount };
}

export function buildPhase45SeedPacks(
  extractionResults: ExtractionResult[],
  options: Phase45Options = {},
): Phase45Result {
  const packVersion = options.packVersion ?? 1;
  const schemaVersion = options.schemaVersion ?? "1.0.0";

  const allVocab = extractionResults.flatMap((result) => result.vocab);
  const allKanji = extractionResults.flatMap((result) => result.kanji);
  const allSentences = extractionResults.flatMap((result) => result.sentences);

  const normalizedVocab = uniqueByKey(
    allVocab
      .map((item) => {
        const level = inferLevel(item.jlptLevel, item.tags, item.source);
        if (!level) return null;
        return {
          id: item.id,
          level,
          japanese: item.japanese,
          reading: item.reading,
          english: item.english,
          partOfSpeech: normalizePartOfSpeech(item.partOfSpeech),
          tags: uniqueByKey([...item.tags, `source:${item.source}`], (x) => x),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    (item) =>
      `${item.level}|${item.japanese}|${item.reading ?? ""}|${item.english}`,
  );

  const normalizedKanji = uniqueByKey(
    allKanji
      .map((item) => {
        const level = inferLevel(item.jlptLevel, item.tags, item.source);
        if (!level) return null;
        return {
          id: item.id,
          level,
          character: item.character,
          meaning: item.meaning,
          onyomi: item.onyomi,
          kunyomi: item.kunyomi,
          strokeSvgPaths: ["M0 0 L10 10"],
          radicals: item.radicals,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    (item) => `${item.level}|${item.character}`,
  );

  const vocabIndexes = buildVocabIndexes(
    normalizedVocab.map((item) => ({
      id: item.id,
      japanese: item.japanese,
      reading: item.reading,
    })),
  );

  let unresolvedSentenceReferences = 0;

  const normalizedSentences = uniqueByKey(
    allSentences
      .map((item) => {
        const level = inferLevel(item.jlptLevel, item.tags, item.source);
        if (!level) return null;

        const resolved = resolveSentenceVocabIds(
          item.vocabReferences as SentenceReference[],
          vocabIndexes,
        );

        unresolvedSentenceReferences += resolved.unresolvedCount;

        return {
          id: item.id,
          level,
          japanese: item.japanese,
          english: item.english,
          reading: item.reading,
          vocabIds: resolved.ids,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
    (item) => `${item.level}|${item.japanese}|${item.english}`,
  );

  const levels: JlptLevel[] = ["N5", "N4", "N3"];

  const packs = levels.map((level) => {
    const sourceNames = Array.from(
      new Set(
        extractionResults
          .map((result) => result.source)
          .filter((source) => source.length > 0),
      ),
    );

    const pack: RawSeedPack = {
      id: `generated-${level.toLowerCase()}`,
      level,
      version: packVersion,
      schemaVersion,
      sourceAttribution: {
        source: "local",
        attribution: sourceNames.join(", ") || "generated-pipeline",
      },
      vocab: normalizedVocab.filter((item) => item.level === level),
      kanji: normalizedKanji.filter((item) => item.level === level),
      sentences: normalizedSentences.filter((item) => item.level === level),
    };

    return pack;
  });

  const validationErrors: string[] = [];
  for (const pack of packs) {
    const parsed = rawSeedPackSchema.safeParse(pack);
    if (!parsed.success) {
      validationErrors.push(
        `Pack ${pack.id} failed schema validation: ${parsed.error.message}`,
      );
    }
  }

  const report: Phase45Report = {
    input: {
      vocab: allVocab.length,
      kanji: allKanji.length,
      sentences: allSentences.length,
    },
    normalized: {
      vocab: normalizedVocab.length,
      kanji: normalizedKanji.length,
      sentences: normalizedSentences.length,
    },
    dropped: {
      vocab: allVocab.length - normalizedVocab.length,
      kanji: allKanji.length - normalizedKanji.length,
      sentences: allSentences.length - normalizedSentences.length,
    },
    unresolvedSentenceReferences,
    validationErrors,
  };

  return { packs, report };
}
