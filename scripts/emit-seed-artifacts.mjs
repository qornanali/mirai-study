import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const LEVELS = new Set(["N5", "N4", "N3"]);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function parseArgs(argv) {
  const args = {
    input: "./seeds/input",
    output: "./seeds",
    version: `v${new Date().toISOString().slice(0, 10)}`,
    baseUrl: "",
    manifestVersion: "1.0.0",
    includeEmpty: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value || !value.startsWith("--")) continue;

    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) continue;

    if (key in args) {
      if (key === "includeEmpty") {
        args[key] = next === "true";
      } else {
        args[key] = next;
      }
      index += 1;
    }
  }

  return args;
}

function validatePack(pack, sourceFile) {
  const required = ["id", "level", "version", "vocab", "kanji", "sentences"];
  for (const field of required) {
    if (!(field in pack)) {
      throw new Error(`Invalid pack ${sourceFile}: missing field '${field}'`);
    }
  }

  if (!LEVELS.has(pack.level)) {
    throw new Error(
      `Invalid pack ${sourceFile}: unsupported level '${pack.level}'`,
    );
  }

  if (
    !Array.isArray(pack.vocab) ||
    !Array.isArray(pack.kanji) ||
    !Array.isArray(pack.sentences)
  ) {
    throw new Error(
      `Invalid pack ${sourceFile}: vocab/kanji/sentences must be arrays`,
    );
  }
}

function buildTypeArtifacts(pack) {
  const level = String(pack.level).toLowerCase();
  const source = pack.sourceAttribution?.source ?? "local";
  const attribution =
    pack.sourceAttribution?.attribution ?? "generated-pipeline";
  const licenseUrl = pack.sourceAttribution?.licenseUrl;

  return [
    {
      id: `jlpt-${level}-vocab`,
      type: "vocab",
      level: pack.level,
      packVersion: pack.version,
      records: pack.vocab,
      source,
      attribution,
      licenseUrl,
    },
    {
      id: `jlpt-${level}-kanji`,
      type: "kanji",
      level: pack.level,
      packVersion: pack.version,
      records: pack.kanji,
      source,
      attribution,
      licenseUrl,
    },
    {
      id: `jlpt-${level}-sentence`,
      type: "sentence",
      level: pack.level,
      packVersion: pack.version,
      records: pack.sentences,
      source,
      attribution,
      licenseUrl,
    },
  ];
}

async function main() {
  const args = parseArgs(process.argv);
  const inputDir = resolve(args.input);
  const outputDir = resolve(args.output, args.version);

  // Rebuild output directory per version to avoid stale artifact files.
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const fileNames = await readdir(inputDir);
  const jsonFiles = fileNames.filter((file) => file.endsWith(".json"));

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON seed packs found in ${inputDir}`);
  }

  const manifest = {
    manifestVersion: args.manifestVersion,
    published: new Date().toISOString(),
    packs: [],
  };

  for (const fileName of jsonFiles) {
    const filePath = join(inputDir, fileName);
    const raw = await readFile(filePath, "utf8");
    const pack = JSON.parse(raw);
    validatePack(pack, fileName);

    const artifacts = buildTypeArtifacts(pack).filter(
      (artifact) => args.includeEmpty || artifact.records.length > 0,
    );

    for (const artifact of artifacts) {
      const payload = {
        id: artifact.id,
        level: artifact.level,
        version: artifact.packVersion,
        schemaVersion: "1.0.0",
        sourceAttribution: {
          source: artifact.source,
          attribution: artifact.attribution,
          ...(artifact.licenseUrl ? { licenseUrl: artifact.licenseUrl } : {}),
        },
        vocab: artifact.type === "vocab" ? artifact.records : [],
        kanji: artifact.type === "kanji" ? artifact.records : [],
        sentences: artifact.type === "sentence" ? artifact.records : [],
      };

      const serialized = `${JSON.stringify(payload, null, 2)}\n`;
      const outName = `${artifact.id}.json`;
      const outPath = join(outputDir, outName);
      await writeFile(outPath, serialized, "utf8");

      const hash = sha256(serialized);
      const urlBase = args.baseUrl.replace(/\/$/, "");
      const url = urlBase
        ? `${urlBase}/seeds/${args.version}/${outName}`
        : `seeds/${args.version}/${outName}`;

      manifest.packs.push({
        id: artifact.id,
        type: artifact.type,
        level: artifact.level,
        packVersion: artifact.packVersion,
        recordCount: artifact.records.length,
        sha256: hash,
        url,
        sourceAttribution: `${artifact.source}: ${artifact.attribution}`,
      });
    }
  }

  if (manifest.packs.length === 0) {
    throw new Error(
      "No artifacts were emitted. Input packs may be empty. Use --includeEmpty true to force emission.",
    );
  }

  manifest.packs.sort((a, b) => a.id.localeCompare(b.id));

  const manifestPath = join(outputDir, "seed-manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`Emitted ${manifest.packs.length} artifacts to ${outputDir}`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
