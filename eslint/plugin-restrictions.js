/**
 * Import specifiers plugin code may use, as regex fragments joined into one
 * allowlist: relative files, the plugin SDK packages, React, and the approved
 * npm packages. Keep this in sync with `APPROVED_PLUGIN_DEPENDENCIES` in
 * `@avandar/plugin-manifest`: a plugin that reaches into app code would break
 * when it moves into the sandbox. `plugin-restrictions.test.js` fails when
 * the two drift apart.
 *
 * Every entry other than relative files, `react/jsx-runtime` (the automatic
 * JSX runtime), and the `date-fns` subpaths must be an exact package name.
 */
export const APPROVED_PLUGIN_IMPORT_PATTERNS = [
  "\\.{1,2}/",
  "@avandar/plugin-sdk$",
  "@avandar/plugin-ui$",
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

/**
 * Flat-config block keeping plugin code to the plugin SDK, React, relative
 * files, and approved npm packages. Plugin tests are exempt because they
 * import the test runner.
 *
 * This must sit AFTER any block that declares `no-restricted-imports` for a
 * glob overlapping `plugins/**`: flat config replaces a rule's options
 * wholesale rather than merging them.
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
                "Plugins may import only @avandar/plugin-sdk, @avandar/plugin-ui, React, relative files, and approved npm packages (see APPROVED_PLUGIN_DEPENDENCIES in @avandar/plugin-manifest).",
            },
          ],
        },
      ],
    },
  },
];
