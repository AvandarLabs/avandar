/**
 * Exact legacy samples and authored-content changes exercise distinct
 * contracts.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { yamlPlugin } from "../../../../../../scripts/yaml/yamlPlugin";

test("content contracts have no transitive renderer or JSX runtime dependency", async () => {
  const bundled = await build({
    entryPoints: [
      fileURLToPath(
        new URL("../../../../registry/stockContracts.ts", import.meta.url),
      ),
    ],
    bundle: true,
    plugins: [yamlPlugin],
    write: false,
    packages: "external",
    platform: "neutral",
    format: "esm",
    metafile: true,
    logLevel: "silent",
  });
  const modules = Object.keys(bundled.metafile!.inputs);
  assert.deepEqual(
    modules.filter((module) => {
      return /\.tsx$/.test(module);
    }),
    [],
  );
  const runtimePackages = Object.values(bundled.metafile!.inputs).flatMap(
    ({ imports }) => {
      return imports
        .filter(({ external }) => {
          return external;
        })
        .map(({ path }) => {
          return path;
        });
    },
  );
  assert.deepEqual(
    runtimePackages.filter((specifier) => {
      return /^(?:react|react-dom|remotion|@remotion)(?:\/|$)/.test(specifier);
    }),
    [],
  );
});
