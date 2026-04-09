/**
 * Stable ID generation utilities
 * Implements deterministic ID strategy for all seed records
 */

/**
 * Simple hash function for generating stable IDs
 * Note: For production build scripts, use crypto.createHash('sha256')
 * This is a simple fallback for app-side code
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}

/**
 * Generate stable ID for vocab record
 */
export function generateVocabId(
  source: string,
  japanese: string,
  reading: string | undefined,
  english: string,
): string {
  const combined = `${japanese}|${reading || ""}|${english}`;
  const stableId = simpleHash(combined);
  return `${source}-vocab-${stableId}`;
}

/**
 * Generate stable ID for kanji record
 */
export function generateKanjiId(source: string, character: string): string {
  const codepoint = character.charCodeAt(0).toString(16).toLowerCase();
  return `${source}-kanji-${codepoint}`;
}

/**
 * Generate stable ID for sentence record
 */
export function generateSentenceId(source: string, sourceId: string): string {
  return `${source}-sentence-${sourceId}`;
}

/**
 * Generate stable ID for local/manual vocab
 */
export function generateLocalVocabId(
  level: string,
  slug: string,
): string {
  return `local-vocab-${level.toLowerCase()}-${slug.toLowerCase()}`;
}

/**
 * Extract unicode codepoint from character in hex format
 */
export function getCharacterCodepoint(character: string): string {
  return character.charCodeAt(0).toString(16).toLowerCase().padStart(4, "0");
}
