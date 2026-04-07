export interface SelectableVoice {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
}

export function selectVoiceForJapanesePlayback<T extends SelectableVoice>(
  voices: T[],
  preferredVoice?: string,
): T | null {
  if (voices.length === 0) {
    return null;
  }

  const japaneseVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("ja"),
  );

  if (japaneseVoices.length === 0) {
    return null;
  }

  if (preferredVoice) {
    const preferred = japaneseVoices.find(
      (voice) =>
        voice.voiceURI === preferredVoice ||
        voice.name.toLowerCase() === preferredVoice.toLowerCase(),
    );

    if (preferred) {
      return preferred;
    }
  }

  return (
    japaneseVoices.find((voice) => voice.default) ?? japaneseVoices[0] ?? null
  );
}
