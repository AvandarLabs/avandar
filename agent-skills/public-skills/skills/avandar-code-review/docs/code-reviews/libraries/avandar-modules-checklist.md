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

## Group related helpers into a module

- Group multiple related helpers that share storage, configuration, or
  purpose into a single named **module** instead of leaving them as loose
  free functions. In this codebase a "module" simply means an object that
  groups related functions (and any supporting constants) under one named
  export, so callers reach for `PreferenceStorage.resolvePreference(...)`
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
  export const PreferenceStorage = {
    readPreference: _readPreference,
    writePreference: _writePreference,
    resolvePreference: _resolvePreference,
  };

  // call site
  import { PreferenceStorage } from "./PreferenceStorage/PreferenceStorage";
  PreferenceStorage.resolvePreference({ ... });
  ```

## Plain object vs `createModule(...)`

- A module does **not** have to use `createModule`. Whether a module should
  be a plain object literal or an `@avandar/modules` `createModule(...)`
  module depends entirely on whether it needs state or mixins, never on how
  many functions it groups:
  - **Stateless collection of functions/constants: plain object literal.**
    This is the default. Flag any stateless `createModule(...)` (a `builder`
    that only returns functions/constants, with no `state` and no mixins) and
    ask for it to be a plain object instead.
  - **Tracks state (needs `createModule`'s generated getters/setters) or uses
    mixins: `createModule(...)`.**

  Stateful case where `createModule` is warranted:

  ```ts
  export const Counter = createModule("Counter", {
    state: { count: 0 },
    builder: () => {
      return { ... };
    },
  });
  ```
