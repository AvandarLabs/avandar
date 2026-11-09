import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APPROVED_PLUGIN_DEPENDENCIES } from "@plugin-manifest/dependencies/getUnapprovedDependenciesFromPackageJson.ts";
import { ESLint } from "eslint";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import eslintPluginImportX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";
import {
  APPROVED_PLUGIN_IMPORT_PATTERNS,
  makePluginPathRestrictionsFromPluginNames,
  UNAPPROVED_PLUGIN_IMPORT_REGEX,
} from "./plugin-restrictions.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const RELATIVE_PATTERN = "\\.{1,2}/";
const JSX_RUNTIME_PATTERN = "react/jsx-runtime$";

/** Mirrors how ESLint compiles a `no-restricted-imports` `regex` option. */
const unapprovedImportRegex = new RegExp(UNAPPROVED_PLUGIN_IMPORT_REGEX, "u");

function isImportRestricted(specifier) {
  return unapprovedImportRegex.test(specifier);
}

/**
 * Package names the ESLint allowlist admits, with the regex anchors and the
 * `date-fns` subpath group removed. Relative files and the JSX runtime are
 * not npm dependencies, so they are left out.
 */
function getPackageNamesFromAllowlist() {
  return APPROVED_PLUGIN_IMPORT_PATTERNS.filter((pattern) => {
    return pattern !== RELATIVE_PATTERN && pattern !== JSX_RUNTIME_PATTERN;
  })
    .map((pattern) => {
      return pattern.replace("(/.*)?$", "").replace(/\$$/, "");
    })
    .sort();
}

describe("plugin import allowlist", () => {
  it("admits exactly the approved plugin dependencies", () => {
    expect(getPackageNamesFromAllowlist()).toEqual(
      [...APPROVED_PLUGIN_DEPENDENCIES].sort(),
    );
  });

  it.each(APPROVED_PLUGIN_DEPENDENCIES)(
    "lets a plugin import the approved package %s",
    (packageName) => {
      expect(isImportRestricted(packageName)).toBe(false);
    },
  );

  it.each([
    "./helpers",
    "../shared/helpers",
    "react/jsx-runtime",
    "date-fns/format",
  ])("lets a plugin import %s", (specifier) => {
    expect(isImportRestricted(specifier)).toBe(false);
  });

  it.each([
    "@/utils/Logger",
    "$/models/User/User",
    "@avandar/utils",
    "@avandar/plugin-sdk/internal",
    "@mantine/core",
    "react-dom",
    "react/jsx-dev-runtime",
    "date-fns-tz",
    "lodash",
    "vitest",
  ])("stops a plugin from importing %s", (specifier) => {
    expect(isImportRestricted(specifier)).toBe(true);
  });
});

/**
 * Lints `code` as the file at `filePath`, relative to the repo root, with only
 * the plugin path restrictions for the real `epidemiology` plugin and a
 * made-up `zz-sibling` plugin. `import-x/no-unresolved` is on as well, so an
 * import that does not resolve, which the path rule would skip, still fails.
 */
async function getRuleIdsFromLintedPluginFile({ filePath, code }) {
  const eslint = new ESLint({
    cwd: REPO_ROOT,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ["plugins/**/*.{js,jsx,ts,tsx}"],
        languageOptions: { parser: tseslint.parser },
        plugins: { "import-x": eslintPluginImportX },
        rules: { "import-x/no-unresolved": "error" },
        settings: {
          "import-x/resolver-next": [createTypeScriptImportResolver()],
        },
      },
      ...makePluginPathRestrictionsFromPluginNames([
        "epidemiology",
        "zz-sibling",
      ]),
    ],
  });
  const [result] = await eslint.lintText(code, {
    filePath: join(REPO_ROOT, filePath),
  });
  return result.messages.map((message) => {
    return message.ruleId;
  });
}

describe("plugin path restrictions", () => {
  it.each([
    "../../../src/utils/Logger",
    "../../../shared/EmailClient/EmailClientConfig",
    "../../../packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema",
    "../../../apps/ava-cli/src/AvaEnv/AvaEnv",
    "../../../scripts/vite-plugin-ava-plugins/pluginModuleIds",
    "../../../supabase/functions/_shared/AvaHTTPError",
    "../../../tests/vitest.setup",
  ])("stops a plugin from importing %s", async (specifier) => {
    const ruleIds = await getRuleIdsFromLintedPluginFile({
      filePath: "plugins/epidemiology/src/zz.ts",
      code: `import "${specifier}";\n`,
    });

    expect(ruleIds).toEqual(["import-x/no-restricted-paths"]);
  });

  it("stops a plugin from importing another plugin's files", async () => {
    const ruleIds = await getRuleIdsFromLintedPluginFile({
      filePath: "plugins/zz-sibling/src/index.ts",
      code: `import "../../epidemiology/src/index";\n`,
    });

    expect(ruleIds).toEqual(["import-x/no-restricted-paths"]);
  });

  it.each([
    "./RegressionModal/RegressionModal",
    "../locales/en.json",
    "@avandar/plugin-sdk",
    "@avandar/plugin-ui",
    "react",
    "simple-statistics",
  ])("lets a plugin import %s", async (specifier) => {
    const ruleIds = await getRuleIdsFromLintedPluginFile({
      filePath: "plugins/epidemiology/src/zz.ts",
      code: `import "${specifier}";\n`,
    });

    expect(ruleIds).toEqual([]);
  });
});
