import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prop } from "@avandar/utils";
import { APPROVED_PLUGIN_DEPENDENCIES } from "@plugin-manifest/dependencies/getUnapprovedDependenciesFromPackageJson.ts";
import { beforeAll, describe, expect, it } from "vitest";
import {
  APPROVED_PLUGIN_IMPORT_PATTERNS,
  UNAPPROVED_PLUGIN_IMPORT_REGEX,
} from "./plugin-restrictions.js";

/**
 * Verifies that `eslint/plugin-restrictions.js` stays synchronized with
 * `APPROVED_PLUGIN_DEPENDENCIES` and that `oxlint` enforces both the package
 * allowlist and the plugin folder boundary across `plugins/**`.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OXLINT_BINARY = resolve(REPO_ROOT, "node_modules", ".bin", "oxlint");

const RELATIVE_PATTERN = "\\.{1,2}/";
const JSX_RUNTIME_PATTERN = "react/jsx-runtime$";
const CHARTS_SUBPATH_PATTERN = "@avandar/plugin-ui/charts$";
const NON_PACKAGE_PATTERNS = [
  RELATIVE_PATTERN,
  JSX_RUNTIME_PATTERN,
  CHARTS_SUBPATH_PATTERN,
];

const UNAPPROVED_IMPORT_CODE = "plugin-restrictions(no-unapproved-imports)";
const RESTRICTED_PATH_CODE = "plugin-restrictions(no-restricted-paths)";

const unapprovedImportRegex = new RegExp(UNAPPROVED_PLUGIN_IMPORT_REGEX, "u");

function _isImportRestricted(specifier) {
  return unapprovedImportRegex.test(specifier);
}

/**
 * Package names the allowlist admits, with regex anchors and the `date-fns`
 * subpath group removed. Relative files, the JSX runtime, and the
 * `@avandar/plugin-ui/charts` subpath are not standalone npm dependencies.
 */
function _getPackageNamesFromAllowlist() {
  return APPROVED_PLUGIN_IMPORT_PATTERNS.filter((pattern) => {
    return !NON_PACKAGE_PATTERNS.includes(pattern);
  })
    .map((pattern) => {
      return pattern.replace("(/.*)?$", "").replace(/\$$/, "");
    })
    .sort();
}

const BLOCKED_RELATIVE_SPECIFIERS = [
  "../../../src/utils/Logger",
  "../../../shared/EmailClient/EmailClientConfig",
  "../../../packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema",
  "../../../apps/ava-cli/src/AvaEnv/AvaEnv",
  "../../../scripts/vite-plugin-ava-plugins/pluginModuleIds",
  "../../../supabase/functions/_shared/AvaHTTPError",
  "../../../tests/vitest.setup",
  "./nested/../../../../src/utils/Logger",
];

const BLOCKED_PACKAGE_SPECIFIERS = [
  "@/utils/Logger",
  "$/models/User/User",
  "@avandar/utils",
  "@avandar/plugin-sdk/internal",
  "@avandar/plugin-ui/internal",
  "@mantine/core",
  "react-dom",
  "react/jsx-dev-runtime",
  "date-fns-tz",
  "lodash",
  "vitest",
];

const ALLOWED_SOURCE_SPECIFIERS = [
  "./RegressionModal/RegressionModal",
  "../locales/en.json",
  "@avandar/plugin-sdk",
  "@avandar/plugin-ui",
  "@avandar/plugin-ui/charts",
  "react",
  "react/jsx-runtime",
  "simple-statistics",
  "d3-array",
  "date-fns",
  "date-fns/format",
];

const ALLOWED_TEST_ONLY_SPECIFIERS = [
  "vitest",
  "@testing-library/react",
  "@mantine/core",
  "@duckdb/node-api",
];

const BLOCKED_TEST_BOUNDARY_SPECIFIERS = [
  "../../../src/utils/Logger",
  "../../../tests/vitest.setup",
  "../../epidemiology/src/index",
  "@/utils/Logger",
  "$/models/User/User",
  "@avandar/utils",
];

function _buildImportFixtures(options) {
  const { specifiers, keyPrefix, pluginFolder, fileStem, extension } = options;
  return specifiers.map((specifier, idx) => {
    return {
      key: `${keyPrefix}-${idx}`,
      relativePath: `plugins/${pluginFolder}/src/${fileStem}-${idx}.${extension}`,
      code: `import "${specifier}";\n`,
    };
  });
}

function _makeFixtures(options) {
  const { pluginFolder, siblingFolder } = options;
  return [
    ..._buildImportFixtures({
      specifiers: BLOCKED_RELATIVE_SPECIFIERS,
      keyPrefix: "rel",
      pluginFolder,
      fileStem: "rel",
      extension: "ts",
    }),
    ..._buildImportFixtures({
      specifiers: BLOCKED_PACKAGE_SPECIFIERS,
      keyPrefix: "pkg",
      pluginFolder,
      fileStem: "pkg",
      extension: "ts",
    }),
    ..._buildImportFixtures({
      specifiers: ALLOWED_SOURCE_SPECIFIERS,
      keyPrefix: "ok",
      pluginFolder,
      fileStem: "ok",
      extension: "ts",
    }),
    ..._buildImportFixtures({
      specifiers: ALLOWED_TEST_ONLY_SPECIFIERS,
      keyPrefix: "test-ok",
      pluginFolder,
      fileStem: "ok",
      extension: "test.ts",
    }),
    ..._buildImportFixtures({
      specifiers: BLOCKED_TEST_BOUNDARY_SPECIFIERS,
      keyPrefix: "test-bad",
      pluginFolder,
      fileStem: "bad",
      extension: "test.ts",
    }),
    {
      key: "sibling-escape",
      relativePath: `plugins/${siblingFolder}/src/index.ts`,
      code: `import "../../epidemiology/src/index";\n`,
    },
    {
      key: "reexport-named",
      relativePath: `plugins/${pluginFolder}/src/reexport-named.ts`,
      code: `export { chunk } from "lodash";\n`,
    },
    {
      key: "reexport-all",
      relativePath: `plugins/${pluginFolder}/src/reexport-all.ts`,
      code: `export * from "../../../src/utils/Logger";\n`,
    },
    {
      key: "dynamic-import",
      relativePath: `plugins/${pluginFolder}/src/dynamic-import.ts`,
      code: `export const loaded = import("lodash");\n`,
    },
  ];
}

/**
 * Writes temporary plugin fixtures, runs `oxlint` once in JSON mode, and
 * removes the temporary plugin folders before returning rule codes per fixture.
 */
function _runOxlintOnFixtures() {
  const runSuffix = `${process.pid}-${Date.now()}`;
  const pluginFolder = `zz-plugin-test-${runSuffix}`;
  const siblingFolder = `zz-sibling-test-${runSuffix}`;
  const pluginRoot = join(REPO_ROOT, "plugins", pluginFolder);
  const siblingRoot = join(REPO_ROOT, "plugins", siblingFolder);
  const fixtures = _makeFixtures({ pluginFolder, siblingFolder });

  try {
    fixtures.forEach((fixture) => {
      const fullPath = join(REPO_ROOT, fixture.relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, fixture.code, "utf8");
    });

    const result = spawnSync(
      OXLINT_BINARY,
      ["--format", "json", pluginRoot, siblingRoot],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    const { diagnostics } = JSON.parse(result.stdout);

    return new Map(
      fixtures.map((fixture) => {
        const codes = diagnostics
          .filter((diagnostic) => {
            const normalizedPath = relative(
              REPO_ROOT,
              resolve(REPO_ROOT, diagnostic.filename),
            );
            return normalizedPath === fixture.relativePath;
          })
          .map(prop("code"));
        return [fixture.key, codes];
      }),
    );
  } finally {
    rmSync(pluginRoot, { recursive: true, force: true });
    rmSync(siblingRoot, { recursive: true, force: true });
  }
}

describe("plugin import allowlist", () => {
  it("admits exactly the approved plugin dependencies", () => {
    expect(_getPackageNamesFromAllowlist()).toEqual(
      [...APPROVED_PLUGIN_DEPENDENCIES].sort(),
    );
  });

  it.each(APPROVED_PLUGIN_DEPENDENCIES)(
    "lets a plugin import the approved package %s",
    (packageName) => {
      expect(_isImportRestricted(packageName)).toBe(false);
    },
  );

  it.each([
    "./helpers",
    "../shared/helpers",
    "react/jsx-runtime",
    "date-fns/format",
    "@avandar/plugin-ui/charts",
  ])("lets a plugin import %s", (specifier) => {
    expect(_isImportRestricted(specifier)).toBe(false);
  });

  it.each(BLOCKED_PACKAGE_SPECIFIERS)(
    "stops a plugin from importing %s",
    (specifier) => {
      expect(_isImportRestricted(specifier)).toBe(true);
    },
  );
});

function _makeCases(options) {
  const { specifiers, keyPrefix } = options;
  return specifiers.map((specifier, idx) => {
    return [specifier, `${keyPrefix}-${idx}`];
  });
}

describe("oxlint plugin restrictions", () => {
  let codesByFixture = new Map();

  beforeAll(() => {
    codesByFixture = _runOxlintOnFixtures();
  }, 30_000);

  it.each(
    _makeCases({ specifiers: BLOCKED_RELATIVE_SPECIFIERS, keyPrefix: "rel" }),
  )("flags relative escape %s in plugin code", (_specifier, key) => {
    expect(codesByFixture.get(key)).toEqual([RESTRICTED_PATH_CODE]);
  });

  it("flags imports into a sibling plugin folder", () => {
    expect(codesByFixture.get("sibling-escape")).toEqual([
      RESTRICTED_PATH_CODE,
    ]);
  });

  it.each(
    _makeCases({ specifiers: BLOCKED_PACKAGE_SPECIFIERS, keyPrefix: "pkg" }),
  )("flags unapproved specifier %s in plugin source", (_specifier, key) => {
    expect(codesByFixture.get(key)).toContain(UNAPPROVED_IMPORT_CODE);
  });

  it.each(
    _makeCases({ specifiers: ALLOWED_SOURCE_SPECIFIERS, keyPrefix: "ok" }),
  )("reports no errors when plugin source imports %s", (_specifier, key) => {
    expect(codesByFixture.get(key)).toEqual([]);
  });

  it.each(
    _makeCases({
      specifiers: ALLOWED_TEST_ONLY_SPECIFIERS,
      keyPrefix: "test-ok",
    }),
  )(
    "allows test-only package %s in plugin .test.ts files",
    (_specifier, key) => {
      expect(codesByFixture.get(key)).toEqual([]);
    },
  );

  it.each(
    _makeCases({
      specifiers: BLOCKED_TEST_BOUNDARY_SPECIFIERS,
      keyPrefix: "test-bad",
    }),
  )(
    "flags %s when a plugin .test.ts file reaches outside its plugin folder",
    (_specifier, key) => {
      expect(codesByFixture.get(key)).toEqual([RESTRICTED_PATH_CODE]);
    },
  );

  it("flags unapproved packages in named re-exports", () => {
    expect(codesByFixture.get("reexport-named")).toEqual([
      UNAPPROVED_IMPORT_CODE,
    ]);
  });

  it("flags restricted paths in wildcard re-exports", () => {
    expect(codesByFixture.get("reexport-all")).toEqual([RESTRICTED_PATH_CODE]);
  });

  it("flags unapproved packages in dynamic import expressions", () => {
    expect(codesByFixture.get("dynamic-import")).toEqual([
      UNAPPROVED_IMPORT_CODE,
    ]);
  });
});
