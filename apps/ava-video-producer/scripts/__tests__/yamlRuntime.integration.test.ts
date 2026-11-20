import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as pause } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { webpack } from "@remotion/bundler";
import { type BuildResult, build, context } from "esbuild";
import { makeWorkspaceWebpackConfigFromConfig } from "../lib/makeWorkspaceWebpackConfigFromConfig";
import { yamlPlugin } from "../yaml/yamlPlugin";

const bootstrap = fileURLToPath(
  new URL("../yaml/registerYaml.ts", import.meta.url),
);
const expected = {
  id: "decision-fork",
  count: 2,
  enabled: true,
  copy: ["First", "Second"],
};

async function _withFixture(
  action: (root: string) => Promise<void>,
): Promise<void> {
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

function _buildWebpack(root: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const compiler = webpack(
      makeWorkspaceWebpackConfigFromConfig({
        mode: "development",
        target: "web",
        devtool: false,
        entry: path.join(root, "entry.ts"),
        output: { path: path.join(root, "out"), filename: "bundle.js" },
      }),
    );
    compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error || closeError || stats?.hasErrors()) {
          reject(
            error ??
              closeError ??
              new Error(stats?.toString({ all: false, errors: true })),
          );
        } else {
          resolve();
        }
      });
    });
  });
}

/** Runs a browser bundle in a sandbox and returns the YAML value it exposed. */
function _readBundleResult(code: string): unknown {
  const sandbox: { console: { log: () => void }; result?: unknown } = {
    console: { log: () => {} },
  };
  runInNewContext(code, sandbox);
  // Copy into this realm so deepEqual compares plain objects.
  return structuredClone(sandbox.result);
}

/** A promise with its resolver, so a test can wait for the next rebuild. */
function _createGate<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
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
    const output = await build({
      entryPoints: [path.join(root, "entry.ts")],
      bundle: true,
      write: false,
      platform: "browser",
      plugins: [yamlPlugin],
      logLevel: "silent",
    });
    assert.deepEqual(_readBundleResult(output.outputFiles[0].text), expected);
  });
});

test("Remotion webpack bundles contain the same authored YAML values", async () => {
  await _withFixture(async (root) => {
    await _buildWebpack(root);
    const bundle = await fs.readFile(path.join(root, "out/bundle.js"), "utf8");
    assert.deepEqual(_readBundleResult(bundle), expected);
  });
});

test("malformed YAML prevents Node and browser bundles from loading", async () => {
  await _withFixture(async (root) => {
    await fs.writeFile(path.join(root, "preset.yaml"), "copy: [unterminated");
    assert.throws(() => {
      return execFileSync(
        process.execPath,
        ["--import", "tsx", "--import", bootstrap, path.join(root, "entry.ts")],
        { stdio: "pipe" },
      );
    }, /YAML|Flow sequence/);
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
    let completed = _createGate<BuildResult>();
    const watcher = await context({
      entryPoints: [path.join(root, "entry.ts")],
      bundle: true,
      write: false,
      plugins: [
        yamlPlugin,
        {
          name: "observe-output",
          setup: (builder) => {
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
      completed = _createGate<BuildResult>();
      await fs.writeFile(path.join(root, "preset.yaml"), "id: edited-live\n");
      const output = await Promise.race([
        completed.promise,
        pause(5000, undefined, { ref: false }).then(() => {
          throw new Error("YAML edit did not trigger a rebuild");
        }),
      ]);
      assert.equal(output.errors.length, 0);
      assert.deepEqual(_readBundleResult(output.outputFiles?.[0].text ?? ""), {
        id: "edited-live",
      });
    } finally {
      await watcher.dispose();
    }
  });
});
