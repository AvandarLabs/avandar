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
import { denoRestrictions } from "./eslint/deno-restrictions.js";
import { packageRestrictions } from "./eslint/package-restrictions.js";
import { privacyChokepoint } from "./eslint/privacy-chokepoint.js";
import { videoProducerFunctionLength } from "./eslint/video-producer-function-length.js";
import { videoThemeRestrictions } from "./eslint/video-theme-restrictions.js";

export default [
  {
    ignores: [
      "**/dist/**",
      ".agents/**",
      ".claude",
      ".claude/**",
      ".cursor",
      ".cursor/**",
      ".opencode",
      ".opencode/**",
      "agent-skills/**",
      "apps/desktop/build/**",
      // Video exports and generated browser bundles are not source code.
      "**/.videos/**",
      "apps/ava-video-producer/out/**",
      "apps/ava-video-producer/src/avandar/generated/**",
      "apps/ava-video-producer/showcase/motion-gallery.js",
      "apps/desktop/bundle/**",
      "apps/desktop/.electrobun-cache/**",
      // `playwright test` writes its minified HTML report and trace viewer
      // bundles here. Gitignored, but still linted, so `pnpm lint` failed with
      // thousands of errors on any machine that had run the e2e suite.
      "playwright-report/**",
      // Browser automation scratch files are generated, Git-ignored output.
      ".playwright-mcp/**",
      // Lingui-compiled catalogs, each generated from the `messages.po` beside
      // it.
      "**/locales/**/messages.ts",
      // The repo's scratch directory (AGENTS.md sends screenshots and one-off
      // scripts here, per branch). Gitignored, but still linted, so `pnpm lint`
      // failed on whatever throwaway script the last debugging session left
      // behind.
      "**/.temp/**",
      "**/.superpowers/**",
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
        // oxfmt sorts imports but, unlike the Prettier import-sort plugin it
        // replaced, never inserts a blank line after the import block.
        "import-x/newline-after-import": ["error", { count: 1 }],
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
              // Closer on disk than apps/ava-video-producer/tsconfig*.json.
              // Those configs do not map `@/*`. The resolver reuses the
              // nearest cached project, so without this entry a producer
              // test linted in the same run leaves adapter imports unresolved.
              "apps/ava-video-producer/avandar-adapter/tsconfig.json",
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
  ...denoRestrictions,
  ...packageRestrictions,
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

  ...privacyChokepoint,
  // Video producer renderers read every style value from the video theme.
  ...videoThemeRestrictions,
  // Video producer renderers keep functions at 45 lines, with a ratchet.
  ...videoProducerFunctionLength,
  {
    // Plain JavaScript has no syntax for parameter or return types, so the
    // rule cannot be satisfied there. Such files carry their types in a
    // sibling `.d.ts` or in JSDoc instead.
    files: ["**/*.js"],
    rules: { "@typescript-eslint/explicit-module-boundary-types": "off" },
  },
  {
    // This config loads via Node's native ESM loader, not a bundler, so its
    // own relative imports need real extensions to resolve at all.
    files: ["eslint.config.js", "eslint/**/*.js"],
    rules: {
      "import-x/extensions": ["error", "ignorePackages", { js: "always" }],
    },
  },
];
