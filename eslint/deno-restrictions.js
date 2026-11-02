/**
 * The Deno-safe `@avandar/*` packages are exactly those mapped in every
 * `deno.json` import map: clients, logger, models, modules, and utils. The rest
 * are browser- or Node-only, have no Deno mapping, and will fail `deno check`
 * if they reach Deno-allowable code.
 */
export const DENO_UNSAFE_PACKAGES = [
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

export const NO_RELATIVE_IMPORTS = {
  regex: "^\\.{1,2}/",
  message:
    "Deno-allowable code: this file may run under Deno; use absolute path-alias imports instead of relative imports (no ./ or ../).",
};

/**
 * Flat-config blocks keeping Deno-reachable code off Deno-unsafe packages
 * and relative imports.
 */
export const denoRestrictions = [
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
];
