export interface SelectableVoice {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
}

export function selectVoiceForJapanesePlayback<T extends SelectableVoice>(
  voices: T[],
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

  return (
    japaneseVoices.find((voice) => voice.default) ?? japaneseVoices[0] ?? null
  );
}
