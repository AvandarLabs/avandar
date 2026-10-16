import {
  DENO_UNSAFE_PACKAGES,
  NO_RELATIVE_IMPORTS,
} from "./deno-restrictions.js";

export const NO_APP_IMPORTS = {
  group: ["@/*", "$/*"],
  message:
    "Publishable packages cannot import app code. `@/*` (src) and `$/*` (shared) resolve here but would be bundled into the published tarball. Move what you need into a package, or take it as a parameter.",
};

/**
 * Flat-config blocks keeping publishable packages from reaching back into
 * app code.
 */
export const packageRestrictions = [
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
];
