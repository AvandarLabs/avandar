import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Import specifiers plugin code may use, as regex fragments joined into one
 * allowlist: relative files, the plugin SDK packages, React, and the approved
 * npm packages. Keep this in sync with `APPROVED_PLUGIN_DEPENDENCIES` in
 * `@avandar/plugin-manifest`: a plugin may only depend on the packages the
 * manifest approves, and must not reach into app code.
 * `plugin-restrictions.test.js` fails when the two drift apart.
 *
 * Every entry other than relative files, `react/jsx-runtime` (the automatic
 * JSX runtime), `@avandar/plugin-ui/charts` (the chart building blocks), and
 * the `date-fns` subpaths must be an exact package name.
 */
export const APPROVED_PLUGIN_IMPORT_PATTERNS = [
  "\\.{1,2}/",
  "@avandar/plugin-sdk$",
  "@avandar/plugin-ui$",
  "@avandar/plugin-ui/charts$",
  "react$",
  "react/jsx-runtime$",
  "simple-statistics$",
  "d3-array$",
  "date-fns(/.*)?$",
];

/**
 * Regex matching every import specifier that is NOT approved for plugin code.
 * ESLint's `no-restricted-imports` reports an import when its specifier
 * matches, so this is the negation of the allowlist.
 */
export const UNAPPROVED_PLUGIN_IMPORT_REGEX = `^(?!(?:${APPROVED_PLUGIN_IMPORT_PATTERNS.join("|")}))`;

/** The repo root, which the plugin path zones below are relative to. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Folders outside its own folder that a plugin's imports may still resolve
 * into: npm packages and the two plugin SDK packages.
 */
const SHARED_PLUGIN_IMPORT_FOLDERS = [
  "./node_modules",
  "./packages/web/plugin-sdk",
  "./packages/web/plugin-ui",
];

/**
 * Builds flat-config blocks that keep each named plugin's imports inside its
 * own folder under `plugins/`, apart from npm packages and the plugin SDK
 * packages, so a relative path cannot reach app code (`src`, `shared`,
 * `packages`, `apps`, `scripts`, `supabase`, `tests`) or a sibling plugin.
 * `pluginRestrictions` builds them from the folders in `plugins/`, and
 * `plugin-restrictions.test.js` from made-up plugin names.
 *
 * @param {readonly string[]} pluginNames
 * @returns {import("eslint").Linter.Config[]}
 */
// This file is plain JS that Node loads without a TypeScript step, so it
// cannot carry the annotations this rule asks for. JSDoc types them instead.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function makePluginPathRestrictionsFromPluginNames(pluginNames) {
  if (pluginNames.length === 0) {
    return [];
  }
  return [
    {
      files: ["plugins/**/*.{js,jsx,ts,tsx}"],
      rules: {
        "import-x/no-restricted-paths": [
          "error",
          {
            basePath: REPO_ROOT,
            zones: pluginNames.map((pluginName) => {
              return {
                target: `plugins/${pluginName}`,
                from: ".",
                except: [
                  `./plugins/${pluginName}`,
                  ...SHARED_PLUGIN_IMPORT_FOLDERS,
                ],
                message: `A plugin may import only files inside plugins/${pluginName}, @avandar/plugin-sdk, @avandar/plugin-ui, and approved npm packages.`,
              };
            }),
          },
        ],
      },
    },
  ];
}

function _readPluginNames() {
  const pluginsDirectory = join(REPO_ROOT, "plugins");
  if (!existsSync(pluginsDirectory)) {
    return [];
  }
  return readdirSync(pluginsDirectory, { withFileTypes: true })
    .filter((entry) => {
      return entry.isDirectory();
    })
    .map((entry) => {
      return entry.name;
    });
}

/**
 * Flat-config blocks keeping plugin code to the plugin SDK, React, relative
 * files, and approved npm packages, and keeping every import, relative or
 * not, inside the plugin's own folder apart from those packages. Plugin tests
 * are exempt from the package allowlist because they import the test runner,
 * but not from the folder rule.
 *
 * This must sit AFTER any block that declares `no-restricted-imports` or
 * `import-x/no-restricted-paths` for a glob overlapping `plugins/**`: flat
 * config replaces a rule's options wholesale rather than merging them.
 */
export const pluginRestrictions = [
  {
    files: ["plugins/**/*.{js,jsx,ts,tsx}"],
    ignores: ["plugins/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: UNAPPROVED_PLUGIN_IMPORT_REGEX,
              message:
                "Plugins may import only @avandar/plugin-sdk, @avandar/plugin-ui, @avandar/plugin-ui/charts, React, relative files, and approved npm packages (see APPROVED_PLUGIN_DEPENDENCIES in @avandar/plugin-manifest).",
            },
          ],
        },
      ],
    },
  },
  ...makePluginPathRestrictionsFromPluginNames(_readPluginNames()),
];
