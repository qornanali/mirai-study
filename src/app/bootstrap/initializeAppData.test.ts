import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRenshuuDexieDatabase,
  type RenshuuDexieDatabase,
} from "../../data/dexie";
import { initializeAppData } from "./initializeAppData";

function sha256Hex(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  return crypto.subtle.digest("SHA-256", encoded).then((digest) =>
    Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  );
}

describe("initializeAppData", () => {
  let database: RenshuuDexieDatabase;
  let fetchMock: ReturnType<typeof vi.fn>;

  const manifestUrl = "https://example.com/seeds/seed-manifest.json";
  const packUrl = "https://example.com/seeds/jlpt-n5-vocab.json";
  let packJson = "";
  let manifestJson = "";

  beforeEach(async () => {
    database = createRenshuuDexieDatabase(
      `renshuu-bootstrap-${crypto.randomUUID()}`,
    );
    await database.open();

    const pack = {
      id: "jlpt-n5-vocab",
      level: "N5",
      version: 1,
      schemaVersion: "1.0.0",
      sourceAttribution: {
        source: "local",
        attribution: "test",
      },
      vocab: [
        {
          id: "local-vocab-kotoba",
          level: "N5",
          japanese: "言葉",
          reading: "ことば",
          english: "word",
          partOfSpeech: "noun",
          tags: ["core"],
        },
      ],
      kanji: [],
      sentences: [],
    };

    packJson = JSON.stringify(pack);
    const packSha256 = await sha256Hex(packJson);

    manifestJson = JSON.stringify({
      manifestVersion: "2026-04-09",
      published: "2026-04-09T00:00:00.000Z",
      packs: [
        {
          id: "jlpt-n5-vocab",
          type: "vocab",
          level: "N5",
          packVersion: 1,
          recordCount: 1,
          sha256: packSha256,
          url: packUrl,
          sourceAttribution: "test",
        },
      ],
    });

    fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url === manifestUrl) {
        return new Response(manifestJson, { status: 200 });
      }

      if (url === packUrl) {
        return new Response(packJson, { status: 200 });
      }

      return new Response("Not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await database.delete();
  });

  it("seeds from remote manifest when local database is empty", async () => {
    const result = await initializeAppData(database, { manifestUrl });

    expect(result.seeded).toBe(true);
    expect(result.seedPackId).toBe("remote:2026-04-09");
    expect(result.summary.vocab).toBe(1);
    expect(result.summary.kanji).toBe(0);
    expect(result.summary.sentences).toBe(0);
  });

  it("returns not-seeded when manifest version is already applied", async () => {
    await database.appMeta.bulkPut([
      { id: "remoteSeedManifestVersion", value: "2026-04-09" },
      { id: "remoteSeedPublishedAt", value: "2026-04-09T00:00:00.000Z" },
    ]);
    await database.vocabItems.add({
      id: "existing-vocab",
      level: "N5",
      japanese: "水",
      reading: "みず",
      english: "water",
      partOfSpeech: "noun",
      tags: ["nature"],
    });

    const result = await initializeAppData(database, { manifestUrl });

    expect(result.seeded).toBe(false);
    expect(result.seedPackId).toBeNull();
    expect(result.summary.vocab).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(manifestUrl, { cache: "no-store" });
  });
});
