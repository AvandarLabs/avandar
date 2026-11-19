import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { build, type Plugin } from "esbuild";
import { buildStockContracts } from "../scripts/stock/buildStockContracts/buildStockContracts";
import { yamlPlugin } from "../scripts/yaml/yamlPlugin/yamlPlugin";
import { parseStockInput } from "../src/stock/contracts/parseStockInput/parseStockInput";
import type { StockInputByPreset } from "../src/stock/contracts/StockContract.types";

const execute: typeof execFile.__promisify__ = promisify(execFile);
const root: string = process.cwd();
const authored: StockInputByPreset["decision-fork"] = {
  ...parseStockInput({ preset: "decision-fork" }),
  prompt: "Keep {authored} copy exactly",
};
const probeSource: string = `import {parseStockInput} from ${JSON.stringify(path.join(root, "src/stock/contracts/parseStockInput/parseStockInput.ts"))}; export const result = {omitted:parseStockInput({preset:"decision-fork"}),supplied:parseStockInput({preset:"decision-fork",rawInput:${JSON.stringify(authored)}})};`;
const expected: { omitted: typeof authored; supplied: typeof authored } = {
  omitted: parseStockInput({ preset: "decision-fork" }),
  supplied: authored,
};
const productBundle: Plugin = {
  name: "product-bundle",
  setup(builder) {
    builder.onResolve(
      {
        filter: /generated\/product\.(js|css)$/,
      },
      ({ path: filename }) => {
        return {
          path: path.join(
            root,
            "out/showcase/browser/product",
            path.basename(filename),
          ),
        };
      },
    );
  },
};
test("direct tsx and immutable Node contracts preserve English omission and supplied copy", async () => {
  const direct = await execute(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/yaml/registerYaml.mjs",
      "--input-type=module",
      "-e",
      `${probeSource.replace("export const result =", "const result =")}console.log(JSON.stringify(result));`,
    ],
    {
      cwd: root,
    },
  );
  assert.deepEqual(JSON.parse(direct.stdout), expected);
  const generation = await buildStockContracts(root);
  assert.deepEqual(
    generation.stockRequestSchema.parse({
      preset: "decision-fork",
    }).input,
    expected.omitted,
  );
  assert.deepEqual(
    generation.stockRequestSchema.parse({
      preset: "decision-fork",
      input: authored,
    }).input,
    authored,
  );
});
async function _assertBrowserBundle(entry: string): Promise<void> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "stock-copy-bundle-"),
  );
  try {
    await fs.writeFile(
      path.join(directory, "package.json"),
      '{"type":"module"}',
    );
    const probe = path.join(directory, "probe.ts");
    await fs.writeFile(probe, probeSource);
    const result = await build({
      absWorkingDir: root,
      entryPoints: {
        entry,
        probe,
      },
      bundle: true,
      splitting: true,
      format: "esm",
      platform: "browser",
      jsx: "automatic",
      outdir: path.join(directory, "out"),
      loader: {
        ".woff2": "dataurl",
      },
      plugins: [yamlPlugin, productBundle],
      metafile: true,
      logLevel: "silent",
    });
    assert.ok(
      Object.keys(result.metafile!.inputs).some((filename) => {
        return filename.startsWith("src/stock/");
      }),
    );
    const loaded = await import(
      pathToFileURL(path.join(directory, "out/probe.js")).href
    );
    assert.deepEqual(loaded.result, expected);
  } finally {
    await fs.rm(directory, {
      recursive: true,
      force: true,
    });
  }
}
[
  "src/gallery/MotionGallery/MotionGallery.tsx",
  "src/stock-entry.tsx",
  "src/showcase/LivePlayer.tsx",
].forEach((entry) => {
  test(`${entry} shares the same English defaults and untouched authored copy`, () => {
    return _assertBrowserBundle(entry);
  });
});
test("producer source modules do not import Lingui, except the generated product bundle", async () => {
  const filenames = await fs.readdir(path.join(root, "src"), {
    recursive: true,
  });
  await Promise.all(
    filenames
      .filter((filename) => {
        return (
          /\.[tj]sx?$/.test(filename) &&
          !filename.startsWith(`avandar${path.sep}generated${path.sep}`)
        );
      })
      .map(async (filename) => {
        assert.doesNotMatch(
          await fs.readFile(path.join(root, "src", filename), "utf8"),
          /(?:from\s*|import\s*\()["']@lingui\//,
          filename,
        );
      }),
  );
});
