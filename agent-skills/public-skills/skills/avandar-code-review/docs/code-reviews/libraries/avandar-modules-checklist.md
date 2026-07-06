# `@avandar/modules` Checklist

Use this checklist when the repo under review depends on
`@avandar/modules`. Confirm by checking `package.json` (or any
`package.json` in a monorepo) for a `@avandar/modules` dependency, OR by
grepping the diff and surrounding code for imports from `@avandar/modules`.
A short alias such as `@modules` counts only when the repo config shows
that it resolves to `@avandar/modules`.

If `@avandar/modules` is not present in the repo, **skip this entire
checklist**, even if the repo has unrelated functions named
`createModule`.

## Group related helpers into `createModule(...)`

- Group multiple related helpers that share storage, configuration, or
  purpose into a `createModule(...)` module instead of leaving them as
  loose free functions. Once a group of functions has a shared purpose
  (for example, a "PreferenceStorage" wrapping `readPreference`,
  `writePreference`, and `resolvePreference`), use the module
  pattern so callers reach for `PreferenceStorage.resolvePreference(...)`
  rather than a flat namespace of unrelated imports.

  This is bad:

  ```ts
  // preferenceStorage.ts
  export function readPreference(): string | undefined { ... }
  export function writePreference(value: string): void { ... }
  export function resolvePreference(args: { ... }): string { ... }

  // call site
  import {
    readPreference,
    resolvePreference,
    writePreference,
  } from "./preferenceStorage";
  ```

  This is good:

  ```ts
  // PreferenceStorage.ts
  export const PreferenceStorage = createModule("PreferenceStorage", {
    builder: () => {
      return {
        writePreference: (value: string) => { ... },
        resolvePreference: (args: { ... }) => { ... },
      };
    },
  });

  // call site
  import { PreferenceStorage } from "./PreferenceStorage/PreferenceStorage";
  PreferenceStorage.resolvePreference({ ... });
  ```
