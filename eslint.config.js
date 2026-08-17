import js from "@eslint/js";
import eslintPluginQuery from "@tanstack/eslint-plugin-query";
import eslintPluginRouter from "@tanstack/eslint-plugin-router";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import eslintPluginImportX from "eslint-plugin-import-x";
import eslintPluginJSXA11y from "eslint-plugin-jsx-a11y";
import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * The Deno-safe `@avandar/*` packages are exactly those mapped in every
 * `deno.json` import map: clients, logger, models, modules, and utils. The rest
 * are browser- or Node-only, have no Deno mapping, and will fail `deno check`
 * if they reach Deno-allowable code.
 */
const DENO_UNSAFE_PACKAGES = [
  { name: "@avandar/etl", runtime: "Node-only" },
  { name: "@avandar/query-hooks", runtime: "browser-only" },
  { name: "@avandar/browser-utils", runtime: "browser-only" },
  { name: "@avandar/hooks", runtime: "browser-only" },
  { name: "@avandar/ui", runtime: "browser-only" },
].map(({ name, runtime }) => {
  return {
    name,
    message: `Deno-allowable code: ${name} is ${runtime} and is not in the deno.json import maps.`,
  };
});

const NO_RELATIVE_IMPORTS = {
  regex: "^\\.{1,2}/",
  message:
    "Deno-allowable code: this file may run under Deno; use absolute path-alias imports instead of relative imports (no ./ or ../).",
};

const NO_APP_IMPORTS = {
  group: ["@/*", "$/*"],
  message:
    "Publishable packages cannot import app code. `@/*` (src) and `$/*` (shared) resolve here but would be bundled into the published tarball. Move what you need into a package, or take it as a parameter.",
};

export default [
  {
    ignores: [
      "**/dist/**",
      ".agents/**",
      ".claude",
      ".claude/**",
      "agent-skills/**",
      "apps/desktop/build/**",
      "apps/desktop/bundle/**",
      "apps/desktop/.electrobun-cache/**",
      "src/i18n/locales/**/messages.ts",
      // `supabase start` writes a minified edge-runtime bundle here. It is
      // gitignored but was still linted, so `pnpm lint` failed with hundreds of
      // errors on any machine where the local stack had been started, and
      // passed in CI where it had not.
      "supabase/.temp/**",
    ],
  },
  eslintPluginImportX.flatConfigs.recommended,
  ...eslintPluginRouter.configs["flat/recommended"],
  ...eslintPluginQuery.configs["flat/recommended"],
  ...tseslint.config(
    { ignores: ["dist"] },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ["**/*.{js,jsx,ts,tsx}"],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
        ecmaVersion: 2020,
        globals: {
          ...globals.browser,
          ...globals.node,
          ...globals.es2023,
        },
      },
      plugins: {
        react: eslintPluginReact,
        "react-hooks": eslintPluginReactHooks,
        "react-refresh": eslintPluginReactRefresh,
        "jsx-a11y": eslintPluginJSXA11y,
        "unused-imports": eslintPluginUnusedImports,
      },
      rules: {
        ...eslintPluginReactHooks.configs.recommended.rules,
        "@typescript-eslint/explicit-module-boundary-types": "error",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-shadow": "error",
        "arrow-body-style": ["error", "always"],
        camelcase: "off",
        "@typescript-eslint/array-type": ["error", { default: "array-simple" }],
        "react/function-component-definition": [
          "error",
          {
            namedComponents: "function-declaration",
            unnamedComponents: "arrow-function",
          },
        ],
        "react/jsx-filename-extension": [
          "warn",
          { extensions: [".tsx", ".jsx"] },
        ],
        "react/no-unused-prop-types": "off",
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off",
        "react/require-default-props": "off",
        "react-hooks/exhaustive-deps": "error",
        "react-hooks/rules-of-hooks": "error",
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],
        "import-x/extensions": [
          "error",
          "ignorePackages",
          {
            js: "never",
            jsx: "never",
            ts: "never",
            tsx: "never",
          },
        ],
        "import-x/no-duplicates": "error",
        // Vite virtual modules (e.g. vite-plugin-pwa's virtual:pwa-register)
        "import-x/no-unresolved": ["error", { ignore: ["^virtual:"] }],
        "import-x/prefer-default-export": "off",
        "jsx-a11y/anchor-is-valid": [
          "error",
          {
            components: ["Link"],
            specialLink: ["to"],
          },
        ],
        "jsx-a11y/label-has-associated-control": [
          "error",
          {
            labelComponents: ["LabelWrapper"],
            labelAttributes: ["label"],
            controlComponents: [],
          },
        ],
        "no-unused-vars": "off",

        // we use the @typescript-eslint one instead
        "no-shadow": "off",
      },
      settings: {
        react: {
          version: "detect",
        },
        "import-x/resolver-next": [
          createTypeScriptImportResolver({
            // Scoped to the real monorepo layout only. Do not use a repo-wide
            // `tsconfig.*.json` glob: `.claude/worktrees` copies add hundreds
            // of tsconfigs and slow `pnpm lint` dramatically.
            project: [
              "tsconfig.json",
              "tsconfig.app.json",
              "tsconfig.node.json",
              "tsconfig.base.json",
              "shared/tsconfig.json",
              "apps/*/tsconfig.json",
              "apps/*/tsconfig.*.json",
              "packages/*/*/tsconfig.json",
            ],

            // always try to resolve types under `<root>@types` directory even
            // it doesn't contain any source code, like `@types/unist`
            alwaysTryTypes: true,

            // we intentionally have multiple tsconfigs (per-app, per-package)
            noWarnOnMultipleProjects: true,
          }),
        ],
      },
    },
  ),
  eslintConfigPrettier,
  {
    rules: {
      "max-len": [
        "error",
        {
          code: 80,
          tabWidth: 2,
          comments: 80,
          ignorePattern: "^import\\s.+\\sfrom\\s.+;$",
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreRegExpLiterals: true,
          ignoreTemplateLiterals: true,
        },
      ],
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    rules: {
      "import-x/no-unresolved": "off",
      "import-x/extensions": "off",
    },
  },
  {
    /*
     * The desktop shell runs on Bun in the main process. Bun built-ins
     * like `bun:sqlite` and `bun:test` aren't resolvable by the standard
     * TS/Node import resolver, so ignore them here. Source files use
     * `bun:sqlite`; integration tests use `bun:test`. The native `duckdb`
     * binding is a desktop-workspace dependency only; the repo-root ESLint
     * resolver does not see it.
     */
    files: ["apps/desktop/**/*.{ts,tsx}"],
    rules: {
      "import-x/no-unresolved": ["error", { ignore: ["^bun:", "^duckdb$"] }],
    },
  },
  {
    // we require import extensions for directories that will be used in
    // Deno runtimes (such as Supabase edge functions).
    files: ["shared/**/*.{ts,tsx}", "packages/shared/**/*.{ts,tsx}"],
    rules: {
      "import-x/extensions": [
        "error",
        "ignorePackages",
        {
          js: "always",
          jsx: "always",
          ts: "always",
          tsx: "always",
          checkTypeImports: true,
        },
      ],
    },
  },
  {
    files: [
      "supabase/**/*.{js,jsx,ts,tsx}",
      "shared/**/*.{js,jsx,ts,tsx}",
      "packages/shared/**/*.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: DENO_UNSAFE_PACKAGES, patterns: [NO_RELATIVE_IMPORTS] },
      ],
    },
  },
  {
    // Publishable packages must not reach back into the app.
    // `tsconfig.base.json` maps `@/*` and `$/*` for the whole repo, so these
    // resolve from inside a package and type-check cleanly; tsup would then
    // inline app source into the published `dist/`, and nothing downstream
    // would notice. `verify:packages` cannot catch it either, because the
    // resulting tarball is self-consistent. This is the only thing standing
    // between the app and the registry.
    //
    // This must sit AFTER the Deno block: flat config replaces a rule's options
    // wholesale rather than merging them, so an earlier declaration would be
    // dropped for `packages/shared/**`. For the same reason the block below
    // re-states the Deno restrictions, which apply only to
    // `packages/shared/**`. Note `shared/**` and `supabase/**` are app code and
    // may import `$/*` freely; only `packages/**` is restricted.
    files: ["packages/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [NO_APP_IMPORTS] }],
    },
  },
  {
    files: ["packages/shared/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: DENO_UNSAFE_PACKAGES,
          patterns: [NO_RELATIVE_IMPORTS, NO_APP_IMPORTS],
        },
      ],
    },
  },
  {
    files: ["**/vitest.config.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // Avoid false-positives in Playwright fixtures where the function `use()`
    // is not a hook, it is part of Playwright's fixture system.
    files: ["tests/e2e/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
  {
    // Playwright requires object destructuring on the first fixture argument;
    // `{}` is valid but triggers `no-empty-pattern` without this override.
    files: ["tests/e2e/**/*.fixture.ts"],
    rules: {
      "no-empty-pattern": "off",
    },
  },
  {
    ignores: [
      "shared/types/database.types.ts",
      // Lingui compiled catalogs — autogenerated, colocated with messages.po
      "src/i18n/locales/*/messages.ts",
    ],
  },

  /**
   * Enforce that all data crossing the LLM boundary goes through
   * `src/lib/privacy/decideIfDataCanCrossBoundary.tsx`. The ack-token issuance
   * and the pending-acks queue are the load-bearing pieces of the consent
   * pipeline, importing them anywhere else lets a caller forge a token
   * or drop the queue check. This forces `decideIfDataCanCrossBoundary` as the
   * single chokepoint for data crossing the LLM boundary.
   *
   * Adding a new caller for `issueAckToken` or `registerAck`? Don't. Add
   * a new context to `CrossBoundaryContext` and route through
   * `decideIfDataCanCrossBoundary` instead.
   */
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/privacy/decideIfDataCanCrossBoundary.tsx",
      "src/lib/privacy/sessionSecret.ts",
      "src/lib/privacy/pendingAcks.ts",
      "src/lib/privacy/**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/privacy/sessionSecret",
              importNames: ["issueAckToken"],
              message:
                "Privacy chokepoint: ack tokens must only be minted inside decideIfDataCanCrossBoundary.tsx. Route your call through decideIfDataCanCrossBoundary() instead.",
            },
            {
              name: "@/lib/privacy/pendingAcks",
              importNames: ["registerAck"],
              message:
                "Privacy chokepoint: pending acks must only be registered inside decideIfDataCanCrossBoundary.tsx. Route your call through decideIfDataCanCrossBoundary() instead.",
            },
          ],
        },
      ],
    },
  },
];
