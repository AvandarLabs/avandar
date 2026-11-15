import { constants } from "node:fs";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertSafeManifest,
  safeRelativePath,
  sanitizeText,
  sha256File,
  sourceUrl,
  validateId,
} from "./capture-lib.mjs";
import { requireLicense } from "./require-license.mjs";

const HASH = /^[a-f0-9]{64}$/;
const IMAGE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)$/;

async function optionalStat(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** Inspect every path segment before reading or writing through it. */
async function plainPath(root, name, directory = false, create = false) {
  safeRelativePath(name);
  let current = root;
  const parts = name.split("/");
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let info = await optionalStat(current);
    if (!info && create) {
      await mkdir(current);
      info = await lstat(current);
    }
    if (!info || info.isSymbolicLink())
      throw new Error("Curation paths must exist without symbolic links");
    const needsDirectory = index < parts.length - 1 || directory;
    if (needsDirectory ? !info.isDirectory() : !info.isFile())
      throw new Error("Curation path has the wrong file type");
  }
  return current;
}

async function inspectExistingTree(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink())
    throw new Error("Existing curated output must not contain symbolic links");
  if (info.isDirectory()) {
    for (const name of await readdir(path)) {
      safeRelativePath(name);
      await inspectExistingTree(join(path, name));
    }
  } else if (!info.isFile())
    throw new Error("Existing curated output must contain plain files only");
}

function array(value, label) {
  if (!Array.isArray(value)) throw new Error(`Capture manifest needs ${label}`);
  return value;
}

function digest(value, label) {
  if (typeof value !== "string" || !HASH.test(value))
    throw new Error(`Invalid SHA-256 for ${label}`);
  return value;
}

function safeUrl(value) {
  if (typeof value !== "string")
    throw new Error("Capture source URL must be text");
  const clean = sourceUrl(value);
  if (clean.startsWith("["))
    throw new Error("Capture source URL must be HTTP(S)");
  return sanitizeText(clean);
}

/** Curate one passed capture. Never read source paths outside that run directory. */
export async function curateCapture({
  root = process.cwd(),
  runDir,
  replace = false,
}) {
  const requestedRoot = resolve(root);
  root = await realpath(requestedRoot);
  if (
    typeof runDir !== "string" ||
    runDir.split(/[\\/]/).some((part) => part.startsWith("."))
  )
    throw new Error(
      "Capture run path must be plain without hidden segments or traversal",
    );
  const runRelative = isAbsolute(runDir)
    ? relative(requestedRoot, runDir).split("\\").join("/")
    : runDir;
  safeRelativePath(runRelative, "capture run directory");
  if (
    !runRelative.startsWith("out/captures/") ||
    runRelative === "out/captures/"
  )
    throw new Error("Capture run must be inside project out/captures");
  const sourceDirectory = await plainPath(root, runRelative, true);
  const manifestPath = await plainPath(sourceDirectory, "manifest.json");
  if ((await lstat(manifestPath)).size > 10_000_000)
    throw new Error("Capture manifest exceeds 10 MB");
  const manifestSha256 = await sha256File(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assertSafeManifest(manifest);
  if (manifest.schemaVersion !== 1 || manifest.status !== "passed")
    throw new Error("Only a passed version 1 capture can be curated");
  if (manifest.runId !== basename(sourceDirectory))
    throw new Error("Capture run ID does not match its directory");
  const features = array(manifest.features, "features");
  const flows = new Set();
  for (const feature of features) {
    validateId(feature.id, "flow id");
    if (feature.status !== "passed" || flows.has(feature.id))
      throw new Error("Capture features must be unique and passed");
    flows.add(feature.id);
  }
  if (!flows.size) throw new Error("Capture has no passed features");
  const actions = array(manifest.actions, "actions").map((action) => {
    if (action.status !== "passed" || !flows.has(action.flowId))
      throw new Error(
        "Every capture action must belong to a passed flow and be passed",
      );
    return {
      ...action,
      sourceUrl: safeUrl(action.sourceUrl),
      ...(action.resultUrl ? { resultUrl: safeUrl(action.resultUrl) } : {}),
    };
  });
  const fixtures = array(manifest.fixtures, "fixtures").map((fixture) => ({
    path: safeRelativePath(fixture.path, "fixture metadata path"),
    sha256: digest(fixture.sha256, "fixture"),
    bytes: fixture.bytes,
  }));
  const resources = array(manifest.resources, "resources");
  if (resources.some((resource) => !flows.has(resource.flowId)))
    throw new Error("Capture resource refers to an unknown flow");
  const filenames = new Set();
  const checkpoints = array(manifest.checkpoints, "checkpoints");
  if (!checkpoints.length)
    throw new Error("Capture has no screenshots to curate");
  const screenshots = [];
  for (const checkpoint of checkpoints) {
    if (checkpoint.status !== "passed" || !flows.has(checkpoint.flowId))
      throw new Error(
        "Every checkpoint must belong to a passed flow and be passed",
      );
    validateId(checkpoint.id, "checkpoint id");
    const capturePath = safeRelativePath(
      checkpoint.screenshot?.path,
      "screenshot path",
    );
    const filename = basename(capturePath);
    if (!IMAGE.test(filename) || filenames.has(filename))
      throw new Error("Screenshot filenames must be unique plain image names");
    filenames.add(filename);
    const source = await plainPath(sourceDirectory, capturePath);
    const sha256 = digest(checkpoint.screenshot.sha256, "screenshot");
    if ((await sha256File(source)) !== sha256)
      throw new Error(`Screenshot hash mismatch: ${capturePath}`);
    screenshots.push({
      flowId: checkpoint.flowId,
      checkpointId: checkpoint.id,
      capturePath,
      asset: `avandar/screens/${filename}`,
      sha256,
      sourceUrl: safeUrl(checkpoint.sourceUrl),
      atMs: checkpoint.atMs ?? null,
      videoAtMs: checkpoint.videoAtMs ?? null,
    });
  }
  const evidence = {
    schemaVersion: 1,
    curatedAt: new Date().toISOString(),
    source: {
      runId: manifest.runId,
      runDirectory: runRelative,
      manifest: `${runRelative}/manifest.json`,
      manifestSha256,
      status: "passed",
      startedAt: manifest.startedAt,
      finishedAt: manifest.finishedAt,
    },
    fixtures,
    actions,
    resources,
    screenshots,
  };
  assertSafeManifest(evidence);

  const publicDirectory = await plainPath(root, "public/avandar", true, true);
  const targets = ["screens", "capture-evidence.json"];
  const existing = [];
  for (const name of targets) {
    const target = join(publicDirectory, name);
    if (await optionalStat(target)) {
      await inspectExistingTree(target);
      if (!replace)
        throw new Error(
          "Curated output already exists; use --replace to back it up before replacement",
        );
      existing.push(name);
    }
  }
  const stagingRoot = await plainPath(root, "out/capture-curation", true, true);
  const stage = await mkdtemp(join(stagingRoot, "curation-"));
  await mkdir(join(stage, "screens"));
  for (const screenshot of screenshots) {
    const destination = join(stage, "screens", basename(screenshot.asset));
    await copyFile(
      await plainPath(sourceDirectory, screenshot.capturePath),
      destination,
      constants.COPYFILE_EXCL,
    );
    if ((await sha256File(destination)) !== screenshot.sha256)
      throw new Error(
        "Screenshot changed during curation; staged output retained",
      );
  }
  await writeFile(
    join(stage, "capture-evidence.json"),
    JSON.stringify(evidence, null, 2) + "\n",
    { flag: "wx", mode: 0o600 },
  );
  if ((await sha256File(manifestPath)) !== manifestSha256)
    throw new Error(
      "Capture manifest changed during curation; staged output retained",
    );
  const backup = existing.length ? join(stage, "previous") : null;
  if (backup) await mkdir(backup);
  const backedUp = [];
  const installed = [];
  try {
    for (const name of existing) {
      await rename(join(publicDirectory, name), join(backup, name));
      backedUp.push(name);
    }
    for (const name of targets) {
      await rename(join(stage, name), join(publicDirectory, name));
      installed.push(name);
    }
  } catch (error) {
    for (const name of installed.reverse())
      await rename(join(publicDirectory, name), join(stage, name));
    for (const name of backedUp.reverse())
      await rename(join(backup, name), join(publicDirectory, name));
    throw error;
  }
  const receipt = {
    source: evidence.source,
    screenshots: screenshots.length,
    evidence: "public/avandar/capture-evidence.json",
    backup: backup ? relative(root, backup) : null,
  };
  await writeFile(
    join(stage, "receipt.json"),
    JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" },
  );
  return {
    ...receipt,
    evidencePath: join(publicDirectory, "capture-evidence.json"),
    screensDirectory: join(publicDirectory, "screens"),
  };
}

/** CLI entry: curate a passed capture run into public/avandar, with --help and --replace. */
export async function main(args = process.argv.slice(2)) {
  requireLicense();
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log(
      "Usage: node scripts/curate-capture.mjs out/captures/<passed-run> [--replace]",
    );
    return;
  }
  if (
    !args[0] ||
    args[0].startsWith("--") ||
    args.length > 2 ||
    (args[1] && args[1] !== "--replace")
  )
    throw new Error(
      "Usage: node scripts/curate-capture.mjs out/captures/<passed-run> [--replace]",
    );
  const result = await curateCapture({
    runDir: args[0],
    replace: args[1] === "--replace",
  });
  console.log(
    `Curated ${result.screenshots} screenshots: ${result.evidencePath}`,
  );
  if (result.backup) console.log(`Previous curated output: ${result.backup}`);
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
