/**
 * Deterministic ID Strategy for Seed Data
 *
 * All seed records must have stable, deterministic IDs that:
 * 1. Are globally unique across all sources
 * 2. Are reproducible (same source data always produces same ID)
 * 3. Enable referential integrity validation (e.g., sentence vocabIds resolve in vocab packs)
 *
 * Format: `{source}-{type}-{stableId}`
 *
 * Examples:
 * - Vocab from JMDict: "jmdict-vocab-e8e7632f" (SHA-256 of Japanese+reading, truncated)
 * - Kanji from KanjiAPI: "kanjiapi-kanji-20ac" (unicode codepoint)
 * - Sentence from Tatoeba: "tatoeba-sentence-1234567" (Tatoeba sentence ID)
 * - Local pack: "local-vocab-n5-greeting-konnichiwa" (semantic slug)
 *
 * Source Values (enum):
 * - "local": Manually curated vocabulary (e.g., kana starter packs)
 * - "jmdict": JMDict Japanese-English dictionary
 * - "kanjiapi": KanjiAPI kanji stroke and radical data
 * - "tatoeba": Tatoeba sentence corpus
 * - "jisho": Jisho.org API (enrichment/fallback)
 *
 * Stable ID Generation Rules:
 *
 * 1. Vocab (structured sources like JMDict, KanjiAPI):
 *    - Use SHA-256(japanese + reading + english) truncated to 8 hex chars
 *    - Ensures deduplication across source updates
 *    - Example: "jmdict-vocab-5a3f8c2b"
 *
 * 2. Kanji:
 *    - Use unicode codepoint in hex (5-6 digits)
 *    - Example: "kanjiapi-kanji-7edd" (for 絝)
 *
 * 3. Sentences (Tatoeba):
 *    - Use Tatoeba paragraph ID directly
 *    - Example: "tatoeba-sentence-12345678"
 *
 * 4. Local packs:
 *    - Use semantic slug: "{level}-{type}-{slug}"
 *    - Example: "local-vocab-n5-greeting-konnichiwa"
 *
 * Referential Integrity Rules:
 *
 * All sentence vocabIds must resolve in the published vocab packs for that level.
 * Linker stage validates:
 * - For sentence in pack level N, all vocabIds must map to vocab entries in N-level vocab pack
 * - On validation failure, sentence is dropped with reason logged
 * - Final QA report includes list of dropped sentences + reason
 *
 * Cross-Pack Rules:
 *
 * Sentence packs may reference vocab from multiple levels:
 * - Example: N3 sentence may use N5 or N4 vocab
 * - Solution: At link time, create cross-level vocab index
 * - Example: vocabIndex = {n5: {...}, n4: {...}, n3: {...}}
 * - Then validate each sentence.vocabIds against combined index
 */

export const ID_STRATEGY_V1 = "1.0.0";
