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
import eslintPluginTailwindCSS from "eslint-plugin-tailwindcss";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  eslintPluginImportX.flatConfigs.recommended,
  ...eslintPluginTailwindCSS.configs["flat/recommended"],
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
        tailwindcss: eslintPluginTailwindCSS,
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
        "no-shadow": "off", // we use the @typescript-eslint one instead
        "tailwindcss/no-custom-classname": "off",
        "tailwindcss/classnames-order": "off", // we use the prettier tailwind plugin for ordering
      },
      settings: {
        react: {
          version: "detect",
        },
        "import-x/resolver-next": [
          createTypeScriptImportResolver({
            // use a glob pattern to find the project's tsconfig
            project: "tsconfig.*.json",

            // always try to resolve types under `<root>@types` directory even
            // it doesn't contain any source code, like `@types/unist`
            alwaysTryTypes: true,
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
        },
      ],
    },
  },
];
