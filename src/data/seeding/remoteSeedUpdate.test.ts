import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRenshuuDexieDatabase,
  type RenshuuDexieDatabase,
} from "../dexie";
import { checkAndApplyRemoteSeedUpdate } from "./remoteSeedUpdate";

function sha256Hex(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  return crypto.subtle.digest("SHA-256", encoded).then((digest) =>
    Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  );
}

describe("checkAndApplyRemoteSeedUpdate", () => {
  let database: RenshuuDexieDatabase;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    database = createRenshuuDexieDatabase(
      `renshuu-remote-${crypto.randomUUID()}`,
    );
    await database.open();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    await database.delete();
  });

  it("downloads, validates and applies remote seed packs", async () => {
    const manifestUrl = "https://example.com/seed-manifest.json";
    const packUrl = "https://example.com/jlpt-n5-vocab.json";

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
          id: "v1",
          level: "N5",
          japanese: "猫",
          reading: "ねこ",
          english: "cat",
          partOfSpeech: "noun",
          tags: ["animal"],
        },
      ],
      kanji: [],
      sentences: [
        {
          id: "s1",
          level: "N5",
          japanese: "猫です。",
          english: "It is a cat.",
          reading: "ねこです。",
          vocabIds: ["v1"],
        },
      ],
    };

    const packRaw = JSON.stringify(pack);
    const packHash = await sha256Hex(packRaw);

    const manifest = {
      manifestVersion: "v2026-04-09",
      published: new Date().toISOString(),
      packs: [
        {
          id: "jlpt-n5-vocab",
          type: "vocab",
          level: "N5",
          packVersion: 1,
          recordCount: 1,
          sha256: packHash,
          url: packUrl,
          sourceAttribution: "local:test",
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === manifestUrl) {
        return new Response(JSON.stringify(manifest), { status: 200 });
      }
      if (url === packUrl) {
        return new Response(packRaw, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await checkAndApplyRemoteSeedUpdate(database, {
      manifestUrl,
    });

    expect(result.status).toBe("updated");
    expect(await database.vocabItems.count()).toBe(1);
    expect(await database.sentenceItems.count()).toBe(1);
    expect(
      (await database.appMeta.get("remoteSeedManifestVersion"))?.value,
    ).toBe("v2026-04-09");
  });

  it("returns up-to-date when remote manifest version is already applied", async () => {
    const manifestUrl = "https://example.com/seed-manifest.json";

    await database.appMeta.put({
      id: "remoteSeedManifestVersion",
      value: "v2026-04-09",
    });

    const manifest = {
      manifestVersion: "v2026-04-09",
      published: new Date().toISOString(),
      packs: [],
    };

    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(manifest), { status: 200 }),
    );

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await checkAndApplyRemoteSeedUpdate(database, {
      manifestUrl,
    });

    expect(result.status).toBe("up-to-date");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
