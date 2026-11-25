import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { StockFingerprintModule } from "./StockFingerprintModule";

async function _withSources(action: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stock-fingerprint-"));
  try {
    await fs.mkdir(path.join(root, "src/stock/presets/Nested"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, "src/stock/presets/Nested/input.ts"),
      "export const input = 1;",
    );
    await action(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

const REQUEST: {
  preset: string;
  schemaVersion: number;
  input: { branches: string[] };
} = {
  preset: "decision-fork",
  schemaVersion: 1,
  input: { branches: ["a", "b"] },
};

test("canonical values sort nested object keys while retaining array order", () => {
  assert.equal(
    JSON.stringify(
      StockFingerprintModule.getCanonicalValueFromValue({
        z: [{ b: 2, a: 1 }],
        a: true,
      }),
    ),
    '{"a":true,"z":[{"a":1,"b":2}]}',
  );
  assert.notDeepEqual(
    StockFingerprintModule.getCanonicalValueFromValue([1, 2]),
    StockFingerprintModule.getCanonicalValueFromValue([2, 1]),
  );
});

test("canonical values reject unsupported objects, sparse arrays and nonfinite numbers", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  [
    NaN,
    Infinity,
    -Infinity,
    undefined,
    () => {
      return 1;
    },
    1n,
    Symbol("value"),
    new Date(),
    new Map(),
    [undefined],
    Array(2),
    cyclic,
    { [Symbol("key")]: 1 },
  ].forEach((value) => {
    assert.throws(() => {
      return StockFingerprintModule.getCanonicalValueFromValue(value);
    }, /stock value/i);
  });
});

test("equivalent object key order shares evidence but selected content and array order do not", async () => {
  await _withSources(async (root) => {
    const initial = await StockFingerprintModule.fromRequest({
      root,
      request: REQUEST,
    });
    assert.deepEqual(
      await StockFingerprintModule.fromRequest({
        root,
        request: {
          input: { branches: ["a", "b"] },
          schemaVersion: 1,
          preset: "decision-fork",
        },
      }),
      initial,
    );
    await _assertChangedRequestHashes({ root, initial });
  });
});

test("nested renderer, local geography, assets and shared motion edits invalidate evidence", async () => {
  await _withSources(async (root) => {
    let digest = await StockFingerprintModule.getSourceHashFromRoot(root);
    await [
      "src/stock/presets/Nested/input.ts",
      "src/stock/presets/Nested/Preset.metadata.yaml",
      "scripts/yaml/makeEsModuleFromYaml.ts",
      "src/stock/presets/Nested/Renderer.tsx",
      "src/stock/geography/land.json",
      "src/stock/generated/registry.gen.ts",
      "src/motion.ts",
      "public/fonts/font.woff2",
    ].reduce(async (previous, file) => {
      await previous;
      await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await fs.writeFile(path.join(root, file), `changed ${file}`);
      const changed = await StockFingerprintModule.getSourceHashFromRoot(root);
      assert.notEqual(changed, digest, file);
      digest = changed;
    }, Promise.resolve());
  });
});

[
  "scripts/showcase/renderFilm.ts",
  "scripts/showcase/getDeliveryThemeFromFilm/getDeliveryThemeFromFilm.ts",
  "scripts/showcase/ShowcaseFilms/ShowcaseFilms.ts",
  "scripts/checkFrames/runCheckFrames.ts",
  "scripts/lib/FrameGateMeasurements/FrameGateMeasurements.ts",
  "scripts/lib/FrameGateMeasurements/getFrameMeasurementsFromVideo.ts",
  "scripts/lib/MediaHelpers/runProcess.ts",
  "scripts/lib/planHelpers/getPreviewFramesFromPlan.ts",
  "scripts/buildProduct/compileProductSource.ts",
  "scripts/runProducerCommand/ProducerCli/ProducerCli.mjs",
  "scripts/runProducerCommand/runShellCommand.mjs",
  "scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts",
  "scripts/requireLicense.ts",
].forEach((file) => {
  test(`editing ${file} invalidates stock source evidence`, async () => {
    await _withSources(async (root) => {
      const filename = path.join(root, file);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename, "export const value = 1;");
      const digest = await StockFingerprintModule.getSourceHashFromRoot(root);
      await fs.writeFile(filename, "export const value = 2;");
      assert.notEqual(
        await StockFingerprintModule.getSourceHashFromRoot(root),
        digest,
      );
    });
  });
});

test("ignored exports and tests cannot invalidate the current renderer", async () => {
  await _withSources(async (root) => {
    const digest = await StockFingerprintModule.getSourceHashFromRoot(root);
    await [
      "out/showcase/exports/inputs.json",
      "src/stock/presets/Nested/input.test.ts",
      "scripts/showcase/renderFilm.test.ts",
      "scripts/checkFrames/__tests__/fixture.ts",
      "scripts/lib/MediaHelpers/MediaHelpers.test.ts",
      "scripts/lib/FrameGateMeasurements/out/measurements.json",
      "scripts/buildProduct/node_modules/dependency/index.js",
      "scripts/runProducerCommand/__tests__/fixture.mjs",
      "scripts/videoTheme/.cache/generated.ts",
      "scripts/showcase/.env.local",
      "scripts/lib/.env/credentials.ts",
      "scripts/unrelated.ts",
      "src/unrelated.ts",
    ].reduce(async (previous, file) => {
      await previous;
      const filename = path.join(root, file);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.writeFile(filename, "unrelated");
    }, Promise.resolve());
    assert.equal(
      await StockFingerprintModule.getSourceHashFromRoot(root),
      digest,
    );
  });
});

test("escaping source symlinks are rejected before reading their contents", async () => {
  await _withSources(async (root) => {
    await fs.symlink(os.tmpdir(), path.join(root, "src/stock/escaped"));
    await assert.rejects(
      StockFingerprintModule.getSourceHashFromRoot(root),
      /outside|symlink/i,
    );
  });
});

[
  "scripts/showcase/escaped",
  "scripts/checkFrames/escaped",
  "scripts/lib/escaped",
  "scripts/buildProduct/escaped",
  "scripts/runProducerCommand/escaped",
  "scripts/videoTheme/escaped",
  "scripts/requireLicense.ts",
].forEach((file) => {
  test(`escaping symlinks in ${file} are rejected`, async () => {
    await _withSources(async (root) => {
      const filename = path.join(root, file);
      await fs.mkdir(path.dirname(filename), { recursive: true });
      await fs.symlink(os.tmpdir(), filename);
      await assert.rejects(
        StockFingerprintModule.getSourceHashFromRoot(root),
        /outside|symlink/i,
      );
    });
  });
});

test("source changes during an export prevent acceptance of its completed file", async () => {
  await _withSources(async (root) => {
    const digest = await StockFingerprintModule.getSourceHashFromRoot(root);
    await fs.writeFile(
      path.join(root, "src/stock/presets/Nested/input.ts"),
      "export const input = 2;",
    );
    await assert.rejects(
      StockFingerprintModule.verifySources({ root, sourceHash: digest }),
      /changed during/,
    );
  });
});

test("a dense preview preserves the exact unchanged default preview", async () => {
  await _withSources(async (root) => {
    const defaultEvidence = await StockFingerprintModule.fromRequest({
      root,
      request: REQUEST,
    });
    const denseEvidence = await StockFingerprintModule.fromRequest({
      root,
      request: {
        ...REQUEST,
        input: { branches: ["a", "b", "c"] },
      },
    });
    await _writeFingerprintPreviewFixtures({
      root,
      fingerprints: [defaultEvidence, denseEvidence],
    });
    assert.equal(
      await StockFingerprintModule.requirePreview({
        root,
        preset: REQUEST.preset,
        fingerprint: defaultEvidence,
      }),
      StockFingerprintModule.getPreviewDirectoryFromOptions({
        root,
        preset: REQUEST.preset,
        fingerprint: defaultEvidence,
      }),
    );
    assert.notEqual(
      StockFingerprintModule.getPreviewDirectoryFromOptions({
        root,
        preset: REQUEST.preset,
        fingerprint: defaultEvidence,
      }),
      StockFingerprintModule.getPreviewDirectoryFromOptions({
        root,
        preset: REQUEST.preset,
        fingerprint: denseEvidence,
      }),
    );
  });
});

test("source edits after input validation cannot be rebound to a newer fingerprint", async () => {
  await _withSources(async (root) => {
    const sourceHash = await StockFingerprintModule.getSourceHashFromRoot(root);
    await fs.writeFile(
      path.join(root, "src/stock/presets/Nested/input.ts"),
      "export const input = 2;",
    );
    await assert.rejects(
      StockFingerprintModule.fromRequest({
        root,
        request: REQUEST,
        expectedSourceHash: sourceHash,
      }),
      /changed during/,
    );
  });
});

/** Checks that content order, values and sample parameters change the hash. */
async function _assertChangedRequestHashes({
  root,
  initial,
}: Readonly<{
  root: string;
  initial: Awaited<ReturnType<typeof StockFingerprintModule.fromRequest>>;
}>): Promise<void> {
  assert.notEqual(
    (
      await StockFingerprintModule.fromRequest({
        root,
        request: {
          ...REQUEST,
          input: { branches: ["b", "a"] },
        },
      })
    ).configurationHash,
    initial.configurationHash,
  );
  assert.notEqual(
    (
      await StockFingerprintModule.fromRequest({
        root,
        request: {
          ...REQUEST,
          input: { branches: ["a", "changed"] },
        },
      })
    ).configurationHash,
    initial.configurationHash,
  );
  assert.notEqual(
    (
      await StockFingerprintModule.fromRequest({
        root,
        request: REQUEST,
        parameters: { samples: [0, 90] },
      })
    ).configurationHash,
    initial.configurationHash,
  );
}

/** Writes ordered preview evidence and contact sheets for each fingerprint. */
async function _writeFingerprintPreviewFixtures({
  root,
  fingerprints,
}: Readonly<{
  root: string;
  fingerprints: ReadonlyArray<
    Awaited<ReturnType<typeof StockFingerprintModule.fromRequest>>
  >;
}>): Promise<void> {
  await fingerprints.reduce(async (previous, fingerprint) => {
    await previous;
    const directory = StockFingerprintModule.getPreviewDirectoryFromOptions({
      root,
      preset: REQUEST.preset,
      fingerprint,
    });
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, "manifest.json"),
      JSON.stringify({ complete: true, fingerprint }),
    );
    await fs.writeFile(
      path.join(directory, "contact-sheet.jpg"),
      "inspected test fixture",
    );
  }, Promise.resolve());
}
