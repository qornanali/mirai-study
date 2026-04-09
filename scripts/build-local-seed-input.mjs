import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const outDir = resolve("./seeds/input");
  await mkdir(outDir, { recursive: true });

  const n5Vocab = await loadJson(
    resolve("./src/data/seeding/kana/jlpt-n5-vocab.json"),
  );
  const n4Vocab = await loadJson(
    resolve("./src/data/seeding/kana/jlpt-n4-vocab.json"),
  );
  const n3Vocab = await loadJson(
    resolve("./src/data/seeding/kana/jlpt-n3-vocab.json"),
  );

  const packs = [
    {
      id: "local-n5-pack",
      level: "N5",
      version: 1,
      schemaVersion: "1.0.0",
      sourceAttribution: {
        source: "local",
        attribution: "Mirai Study local kana vocab",
      },
      vocab: n5Vocab,
      kanji: [],
      sentences: [],
    },
    {
      id: "local-n4-pack",
      level: "N4",
      version: 1,
      schemaVersion: "1.0.0",
      sourceAttribution: {
        source: "local",
        attribution: "Mirai Study local kana vocab",
      },
      vocab: n4Vocab,
      kanji: [],
      sentences: [],
    },
    {
      id: "local-n3-pack",
      level: "N3",
      version: 1,
      schemaVersion: "1.0.0",
      sourceAttribution: {
        source: "local",
        attribution: "Mirai Study local kana vocab",
      },
      vocab: n3Vocab,
      kanji: [],
      sentences: [],
    },
  ];

  for (const pack of packs) {
    const filePath = resolve(outDir, `${pack.id}.json`);
    await writeFile(filePath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  }

  console.log(`Wrote ${packs.length} seed input packs to ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
