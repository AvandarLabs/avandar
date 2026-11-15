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
    () => 1,
    1n,
    Symbol("value"),
    new Date(),
    new Map(),
    [undefined],
    Array(2),
    cyclic,
    { [Symbol("key")]: 1 },
  ].forEach((value) => {
    assert.throws(
      () => StockFingerprintModule.getCanonicalValueFromValue(value),
      /stock value/i,
    );
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
  });
});

test("nested renderer, local geography, assets and shared motion edits invalidate evidence", async () => {
  await _withSources(async (root) => {
    let digest = await StockFingerprintModule.getSourceHashFromRoot(root);
    await [
      "src/stock/presets/Nested/input.ts",
      "src/stock/presets/Nested/Preset.metadata.yaml",
      "scripts/yaml/compileYaml.cjs",
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

test("ignored exports and tests cannot invalidate the current renderer", async () => {
  await _withSources(async (root) => {
    const digest = await StockFingerprintModule.getSourceHashFromRoot(root);
    await fs.mkdir(path.join(root, "out/showcase/exports"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(root, "out/showcase/exports/film.mp4"),
      "unrelated",
    );
    await fs.writeFile(
      path.join(root, "src/stock/presets/Nested/input.test.ts"),
      "unrelated",
    );
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
    await [defaultEvidence, denseEvidence].reduce(
      async (previous, fingerprint) => {
        await previous;
        const directory = StockFingerprintModule.getPreviewDirectoryFromOptions(
          {
            root,
            preset: REQUEST.preset,
            fingerprint,
          },
        );
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(
          path.join(directory, "manifest.json"),
          JSON.stringify({ complete: true, fingerprint }),
        );
        await fs.writeFile(
          path.join(directory, "contact-sheet.jpg"),
          "inspected test fixture",
        );
      },
      Promise.resolve(),
    );
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
