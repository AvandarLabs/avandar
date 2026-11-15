import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { withWorkspaceAliases } from "../lib/withWorkspaceAliases.mjs";

const bootstrap = fileURLToPath(new URL("./registerYaml.mjs", import.meta.url));
const webpack = createRequire(import.meta.resolve("@remotion/bundler"))(
  "webpack",
);
const expected = {
  id: "decision-fork",
  count: 2,
  enabled: true,
  copy: ["First", "Second"],
};

async function _withFixture(action) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "producer-yaml-"));
  try {
    await fs.writeFile(path.join(root, "package.json"), '{"type":"module"}');
    await fs.writeFile(
      path.join(root, "preset.yaml"),
      "id: decision-fork\ncount: 2\nenabled: true\ncopy:\n  - First\n  - Second\n",
    );
    await fs.writeFile(
      path.join(root, "entry.ts"),
      'import data from "./preset.yaml"; globalThis.result = data; console.log(JSON.stringify(data));',
    );
    await action(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function _buildWebpack(root) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(
      withWorkspaceAliases({
        mode: "development",
        target: "web",
        devtool: false,
        entry: path.join(root, "entry.ts"),
        output: { path: path.join(root, "out"), filename: "bundle.js" },
      }),
    );
    compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error || closeError || stats.hasErrors()) {
          reject(
            error ??
              closeError ??
              new Error(stats.toString({ all: false, errors: true })),
          );
        } else {
          resolve();
        }
      });
    });
  });
}

test("Node imports YAML values without generated source files", async () => {
  await _withFixture(async (root) => {
    const output = execFileSync(
      process.execPath,
      ["--import", "tsx", "--import", bootstrap, path.join(root, "entry.ts")],
      { encoding: "utf8" },
    );
    assert.deepEqual(JSON.parse(output), expected);
  });
});

test("esbuild browser bundles contain the same authored YAML values", async () => {
  await _withFixture(async (root) => {
    const { yamlPlugin } = await import("./yamlPlugin/yamlPlugin.js");
    const output = await build({
      entryPoints: [path.join(root, "entry.ts")],
      bundle: true,
      write: false,
      platform: "browser",
      plugins: [yamlPlugin],
      logLevel: "silent",
    });
    const sandbox = { console: { log() {} } };
    runInNewContext(output.outputFiles[0].text, sandbox);
    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.result)), expected);
  });
});

test("Remotion webpack bundles contain the same authored YAML values", async () => {
  await _withFixture(async (root) => {
    await _buildWebpack(root);
    const sandbox = { console: { log() {} } };
    runInNewContext(
      await fs.readFile(path.join(root, "out/bundle.js"), "utf8"),
      sandbox,
    );
    assert.deepEqual(JSON.parse(JSON.stringify(sandbox.result)), expected);
  });
});

test("malformed YAML prevents Node and browser bundles from loading", async () => {
  await _withFixture(async (root) => {
    await fs.writeFile(path.join(root, "preset.yaml"), "copy: [unterminated");
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            "--import",
            "tsx",
            "--import",
            bootstrap,
            path.join(root, "entry.ts"),
          ],
          { stdio: "pipe" },
        ),
      /YAML|Flow sequence/,
    );
    const { yamlPlugin } = await import("./yamlPlugin/yamlPlugin.js");
    await assert.rejects(
      build({
        entryPoints: [path.join(root, "entry.ts")],
        bundle: true,
        write: false,
        plugins: [yamlPlugin],
        logLevel: "silent",
      }),
      /YAML|Flow sequence/,
    );
    await assert.rejects(_buildWebpack(root), /YAML|Flow sequence/);
  });
});

test("esbuild watch refreshes authored YAML edits without a conversion command", async () => {
  await _withFixture(async (root) => {
    const { context } = await import("esbuild");
    const { setTimeout } = await import("node:timers/promises");
    const { yamlPlugin } = await import("./yamlPlugin/yamlPlugin.js");
    let completed = Promise.withResolvers();
    const watcher = await context({
      entryPoints: [path.join(root, "entry.ts")],
      bundle: true,
      write: false,
      plugins: [
        yamlPlugin,
        {
          name: "observe-output",
          setup(builder) {
            builder.onEnd((result) => {
              completed.resolve(result);
            });
          },
        },
      ],
      logLevel: "silent",
    });
    try {
      await watcher.watch();
      await completed.promise;
      completed = Promise.withResolvers();
      await fs.writeFile(path.join(root, "preset.yaml"), "id: edited-live\n");
      const output = await Promise.race([
        completed.promise,
        setTimeout(5000, undefined, { ref: false }).then(() => {
          throw new Error("YAML edit did not trigger a rebuild");
        }),
      ]);
      assert.equal(output.errors.length, 0);
      const sandbox = { console: { log() {} } };
      runInNewContext(output.outputFiles[0].text, sandbox);
      assert.deepEqual(JSON.parse(JSON.stringify(sandbox.result)), {
        id: "edited-live",
      });
    } finally {
      await watcher.dispose();
    }
  });
});
