import { describe, expect, it } from "vitest";
import { selectVoiceForJapanesePlayback } from "./voiceSelection";

describe("selectVoiceForJapanesePlayback", () => {
  it("returns a default japanese voice when available", () => {
    const voice = selectVoiceForJapanesePlayback([
      {
        voiceURI: "voice-ja",
        name: "Japanese Voice",
        lang: "ja-JP",
        default: true,
      },
      {
        voiceURI: "voice-ja-2",
        name: "Japanese Voice 2",
        lang: "ja-JP",
        default: false,
      },
    ]);

    expect(voice?.voiceURI).toBe("voice-ja");
  });

  it("returns first japanese voice when default is unavailable", () => {
    const voice = selectVoiceForJapanesePlayback([
      {
        voiceURI: "voice-en",
        name: "English Voice",
        lang: "en-US",
        default: true,
      },
      {
        voiceURI: "voice-ja",
        name: "Japanese Voice",
        lang: "ja-JP",
        default: false,
      },
    ]);

    expect(voice?.voiceURI).toBe("voice-ja");
  });

  it("returns null when japanese voices are missing", () => {
    const voice = selectVoiceForJapanesePlayback([
      {
        voiceURI: "voice-en",
        name: "English Voice",
        lang: "en-US",
        default: false,
      },
      {
        voiceURI: "voice-fr",
        name: "French Voice",
        lang: "fr-FR",
        default: false,
      },
    ]);

    expect(voice).toBeNull();
  });
});
