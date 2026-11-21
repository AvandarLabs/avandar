import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LicenseFixtures } from "../../tests/LicenseFixtures";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CONFIG_READ_GUARD = `
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const writeMarker = fs.writeFileSync.bind(fs);
const environment = process.env;
const marker = environment.PRODUCER_HELP_CONFIG_MARKER;
const blocked = new Set(["PORT", "TITLE_OFFSET", "SETTLE", "DELIVER", "RENDER_OUT_DIR", "RENDER_OUTPUT_ID", "STANDALONE", "DECLARED_CUTS", "KEEP_RENDER_FRAMES", "FORCE", "OUT_SUFFIX", "PREVIEW_ONLY", "FFMPEG_BIN", "REMOTION_KEYS_FILE", "AVANDAR_REMOTION_KEYS_FILE", "REMOTION_PUBLIC_KEY", "REMOTION_PRIVATE_KEY", "REMOTION_PRIVATE_LICENSE_KEY", "AVANDAR_REMOTION_PRIVATE_KEY"]);
function rejectAccess(kind, name) {
  writeMarker(marker, kind + ":" + name);
  throw new Error("Help accessed business configuration: " + name);
}
process.env = new Proxy(environment, {
  get(target, name, receiver) {
    if (blocked.has(name)) rejectAccess("business-environment", name);
    return Reflect.get(target, name, receiver);
  },
  ownKeys(target) {
    return Reflect.ownKeys(target).filter(name => !blocked.has(name));
  }
});
function guardFilename(filename) {
  if (/(?:^|[\\\\/])\\.env(?:\\.video-producer)?\\.local$/.test(String(filename))) rejectAccess("private-file", "credential filename");
}
for (const name of ["readFile", "readFileSync", "open", "openSync", "writeFile", "writeFileSync", "copyFile", "copyFileSync", "rename", "renameSync"]) {
  const original = fs[name].bind(fs);
  fs[name] = function(filename, ...args) {
    guardFilename(filename);
    if (/copyFile|rename/.test(name)) guardFilename(args[0]);
    return original(filename, ...args);
  };
}
for (const name of ["readFile", "open", "writeFile", "copyFile", "rename"]) {
  const original = fs.promises[name].bind(fs.promises);
  fs.promises[name] = function(filename, ...args) {
    guardFilename(filename);
    if (/copyFile|rename/.test(name)) guardFilename(args[0]);
    return original(filename, ...args);
  };
}
syncBuiltinESMExports();
`;

const HELP_ROUTES: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    process.execPath,
    ["scripts/runProducerCommand/runProducerCommand.mjs", "render", "--help"],
  ],
  [process.execPath, ["--import", "tsx", "scripts/newVideo.ts", "--help"]],
  ["sh", ["scripts/preview.sh", "--help"]],
  ["python3", ["demo-data/generate.py", "--help"]],
];

test("package and native help read no business defaults or Remotion credentials", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "producer-help-config-"));
  const preload = path.join(directory, "guard.mjs");
  await writeFile(preload, CONFIG_READ_GUARD);
  try {
    for (const [index, [program, arguments_]] of HELP_ROUTES.entries()) {
      await context.test(arguments_.join(" "), async () => {
        const marker = path.join(directory, `route-${index}.txt`);
        const result = spawnSync(program, arguments_, {
          cwd: APP_ROOT,
          env: {
            ...LicenseFixtures.licenseTestEnvironment("/dev/null"),
            NODE_OPTIONS: `--import=${pathToFileURL(preload).href}`,
            PRODUCER_HELP_CONFIG_MARKER: marker,
          },
          encoding: "utf8",
          timeout: 10000,
        });
        const accessed = existsSync(marker)
          ? await readFile(marker, "utf8")
          : "";
        assert.equal(accessed, "", result.stderr + accessed);
        assert.equal(result.error, undefined);
        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stderr, "");
        assert.match(result.stdout, /Usage:/);
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
