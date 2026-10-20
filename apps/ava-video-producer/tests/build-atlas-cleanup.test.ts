import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { buildLicenseFixture, licenseTestEnvironment } from "./license-fixture";

async function _createFailedBuildFixture(root: string): Promise<void> {
  await fs.symlink(
    path.resolve("node_modules"),
    path.join(root, "node_modules"),
  );
  await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}');
  await fs.writeFile(
    path.join(root, "test-license.env"),
    buildLicenseFixture(),
  );
  const filenames = [
    "scripts/buildAtlas/buildAtlas.mjs",
    "scripts/yaml/yamlPlugin/yamlPlugin.js",
    "scripts/yaml/compileYaml.cjs",
    "scripts/require-license.mjs",
    "scripts/lib/readLicense.mjs",
  ];
  await Promise.all(
    filenames.map(async (filename) => {
      const destination = path.join(root, filename);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(filename, destination);
    }),
  );
  // Isolate esbuild's real context lifecycle from translation generation.
  await fs.writeFile(
    path.join(root, "scripts/buildAtlas/createGalleryPlugin.mjs"),
    'export function createGalleryPlugin() { return { name: "fixture", setup() {} }; }',
  );
  const entry = path.join(root, "src/gallery/MotionGallery/MotionGallery.tsx");
  await fs.mkdir(path.dirname(entry), { recursive: true });
  await fs.writeFile(entry, "export const =");
}

test("failed initial Atlas builds release their context so the process exits", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "atlas-build-failure-"));
  try {
    await _createFailedBuildFixture(root);
    const entry = pathToFileURL(
      path.join(root, "scripts/buildAtlas/buildAtlas.mjs"),
    ).href;
    const script = `
      import assert from "node:assert/strict";
      import { buildAtlas } from ${JSON.stringify(entry)};
      await assert.rejects(buildAtlas({ watch: true }), /Build failed/);
      process.stdout.write("initial build rejected");
    `;
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["--input-type=module", "--eval", script],
      {
        cwd: root,
        env: licenseTestEnvironment(path.join(root, "test-license.env")),
        timeout: 5000,
      },
    );
    assert.equal(stdout, "initial build rejected");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
