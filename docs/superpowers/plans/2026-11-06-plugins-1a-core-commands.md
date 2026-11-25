# Plugins Slice 1a (Plugin Core and Commands) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bundled first-party plugins that a settings admin installs per workspace, which add lazily loaded commands to the Data Explorer toolbar, proven end to end by an epidemiology plugin's "Linear regression" command.

**Architecture:** Plugins live in `plugins/<name>/` with an `ava.yaml` manifest. A Vite plugin compiles every bundled manifest at build time into a tiny virtual index plus one lazy manifest chunk and one lazy code chunk per plugin. A `PluginHost` provider reads `plugin_installations` for the workspace, loads manifests only for enabled installs, and renders their commands in a `PluginMenuSlot`. A plugin's code chunk loads on first click and receives a scoped, async `avandar` API.

**Tech Stack:** TypeScript, React 19, Mantine 9, Lingui 6, Zod 4, `yaml` 2 (YAML 1.2), Vite 7, Vitest, Supabase Postgres + pgTAP, Playwright, `@avandar/acclimate` CLI.

**Spec:** `docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md` (parent: `2026-11-06-plugin-ecosystem-design.md`).

---

## Conventions every task follows

- **Imports.** Code under `packages/shared/**` uses path-alias imports with the `.ts` extension (`@plugin-manifest/...ts`). It never uses relative imports, because ESLint's Deno rule forbids them there. Code under `packages/web/**` uses its alias without an extension (`@plugin-sdk/...`). App code uses `@/` (src) and `$/` (shared).
- **Function bodies.** Arrow functions always use braces and an explicit `return`, matching the surrounding code.
- **Translation.** All user-visible text in app code goes through Lingui (`useLingui().t`, `<Trans>`, `<Plural>`). Plugin text goes through the plugin's `locales/en.json`.
- **Testing.** Red, then green. Write the test, watch it fail for the stated reason, implement, watch it pass, commit.
- **Commits.** Stage files by path, never `git add -A`. A Supabase switch rewrites `supabase/config.toml`, and that file must never be committed. End every commit message with:

  ```text
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

- **Formatting.** Run `pnpm format` before each commit. It formats changed files only.

## File structure

Created:

| Path | Responsibility |
| --- | --- |
| `packages/shared/plugin-manifest/` | Manifest schema, `ava.yaml` compiler, `when` evaluator, slot fact registry, approved dependencies, Node-side plugin folder reader |
| `packages/web/plugin-sdk/` | `definePlugin`, the `avandar` API types, `PluginError`, plugin translator, `useAvandar()`/`useT()` |
| `packages/web/plugin-ui/` | The components plugin UI may render (Mantine re-exports) |
| `scripts/vite-plugin-ava-plugins/` | Vite plugin: virtual index, manifest and locale modules, dev reload, bundle check |
| `src/lib/plugins/` | App-side plugin host: module cache, active-plugin selection, menu items, query handles, API factory, command runner, drawer host, menu slot |
| `src/types/virtualAvaPluginIndex.d.ts` | Types for `virtual:ava-plugin-index` |
| `src/test-utils/virtualAvaPluginIndexStub.ts` | Empty plugin index for Vitest |
| `supabase/schemas/10.plugin_installations.sql` | Table, triggers, grants, RLS |
| `supabase/tests/database/permissions/rls_plugin_installations.test.sql` | RLS contract |
| `shared/models/PluginInstallation/` | Model namespace, types, parsers |
| `src/clients/plugins/PluginInstallationClient/` | CRUD client |
| `src/views/DataExplorerApp/useDataExplorerPluginContext/` | Builds the Data Explorer invocation context and `when` facts |
| `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/` | Settings → Plugins tab |
| `apps/ava-cli/src/PluginCli/` | `ava plugin init` and `ava plugin validate` |
| `eslint/plugin-restrictions.js` | Import allowlist for `plugins/**` |
| `plugins/bundled.yaml`, `plugins/epidemiology/` | Bundled plugin list and the first plugin |
| `tests/e2e/plugins-epidemiology-regression.spec.ts` | End-to-end flow |
| `docs/plugin-authoring.md` | How to write a bundled plugin |

Modified: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `tsconfig.app.json`, `vite.config.ts`, `tests/vitestAliases.ts`, `.changeset/config.json`, `eslint.config.js`, `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`, `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx`, `src/views/DataExplorerApp/DataExplorerApp.tsx`, `src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx`, `apps/ava-cli/src/main.ts`, `apps/ava-cli/package.json`, `apps/ava-cli/tsup.config.ts`, `.github/workflows/pr-develop.yaml`, `CLAUDE.md`, `docs/avandar-packages.md`, `shared/types/database.types.ts` (generated).

---

### Task 0: Implementation worktree and local database

**Files:** none

- [ ] **Step 1: Create the implementation worktree from the spec branch**

The spec and this plan live on `docs/plugins`, so branch from it:

```bash
cd /Users/pablo/src/avandar
cd "$(wt new feat plugins-core docs/plugins)"
git fetch origin && git rebase origin/develop
```

Expected: a worktree on branch `feat/plugins-core`, rebased cleanly.

- [ ] **Step 2: Switch to an isolated Supabase project**

```bash
ava supabase status
ava supabase switch
ava supabase status
```

Expected: the final status's first line is green and names this worktree's own project, not the shared `avandar` stack. If `ava` is missing, run `pnpm build:ava-cli` first. Do not run any database command until the status is green.

---

### Task 1: Workspace wiring for the three plugin packages

**Files:**
- Create: `packages/shared/plugin-manifest/{package.json,tsconfig.json,tsconfig.build.json,tsup.config.ts,vitest.config.ts,README.md,LICENSE,src/index.ts,src/runtime.ts,src/node/index.ts}`
- Create: `packages/web/plugin-sdk/{package.json,tsconfig.json,tsconfig.build.json,tsup.config.ts,vitest.config.ts,README.md,LICENSE,src/index.ts}`
- Create: `packages/web/plugin-ui/{package.json,tsconfig.json,tsconfig.build.json,tsup.config.ts,README.md,LICENSE,src/index.ts}`
- Modify: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `tsconfig.app.json`, `vite.config.ts`, `tests/vitestAliases.ts`, `.changeset/config.json`

- [ ] **Step 1: Add `plugins/*` to the pnpm workspace**

In `pnpm-workspace.yaml`, under `packages:`, add the last line:

```yaml
packages:
  - "apps/*"
  - "packages/shared/*"
  - "packages/web/*"
  - "packages/node/*"
  - "plugins/*"
```

- [ ] **Step 2: Create `packages/shared/plugin-manifest/package.json`**

```json
{
  "name": "@avandar/plugin-manifest",
  "version": "0.1.0",
  "private": true,
  "description": "Avandar plugin manifest schema, ava.yaml compiler, and `when` condition evaluator.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/AvandarLabs/avandar.git",
    "directory": "packages/shared/plugin-manifest"
  },
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./runtime": "./src/runtime.ts",
    "./node": "./src/node/index.ts"
  },
  "sideEffects": false,
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "yaml": "^2.9.0"
  },
  "peerDependencies": {
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "@types/node": "^22.19.19",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:",
    "zod": "catalog:"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "./runtime": { "types": "./dist/runtime.d.ts", "default": "./dist/runtime.js" },
      "./node": { "types": "./dist/node.d.ts", "default": "./dist/node.js" }
    }
  }
}
```

`private: true` keeps it off npm until external authors need it in Milestone 2.

- [ ] **Step 3: Create the plugin-manifest config files**

`packages/shared/plugin-manifest/tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ESNext"],
    "types": ["node"]
  },
  "include": ["src"]
}
```

`packages/shared/plugin-manifest/tsconfig.build.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": "../../../",
    "lib": ["ESNext"],
    "types": ["node"],
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": false
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

`packages/shared/plugin-manifest/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  // One entry per declared `exports` subpath.
  entry: {
    index: "src/index.ts",
    runtime: "src/runtime.ts",
    node: "src/node/index.ts",
  },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  target: "es2022",
  outDir: "dist",
});
```

`packages/shared/plugin-manifest/vitest.config.ts`:

```ts
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases.ts";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

export default defineConfig({
  resolve: {
    alias: getAppVitestAliases({
      repoRootDir,
      include: ["shared"],
    }),
  },
  test: {
    environment: "node",
  },
});
```

Copy `packages/shared/utils/LICENSE` to `packages/shared/plugin-manifest/LICENSE`.

`packages/shared/plugin-manifest/README.md`:

```markdown
# @avandar/plugin-manifest

The Avandar plugin manifest: its Zod schema, the `ava.yaml` compiler, the
`when` condition evaluator, and the Node-side reader for plugin folders.

| Entry | Use it for |
| --- | --- |
| `@avandar/plugin-manifest` | Everything below, for build tools and the CLI |
| `@avandar/plugin-manifest/runtime` | Browser code: types, `evaluateWhenCondition`, `resolveManifestString`, `SlotFactRegistry`. No Zod or YAML |
| `@avandar/plugin-manifest/node` | Node only: `readPluginDirectory`, `readBundledPlugins`, `readBundledPluginFolders` |

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
```

Leave the exports table body empty for now. Tasks 2 to 6 add a row for each export they create.

Create the three entry files, each containing only `export {};` for now:
- `packages/shared/plugin-manifest/src/index.ts`
- `packages/shared/plugin-manifest/src/runtime.ts`
- `packages/shared/plugin-manifest/src/node/index.ts`

- [ ] **Step 4: Create `packages/web/plugin-sdk`**

`packages/web/plugin-sdk/package.json`:

```json
{
  "name": "@avandar/plugin-sdk",
  "version": "0.1.0",
  "private": true,
  "description": "The API Avandar plugins are written against.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/AvandarLabs/avandar.git",
    "directory": "packages/web/plugin-sdk"
  },
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "sideEffects": false,
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@lingui/core": "^6.2.0",
    "@lingui/message-utils": "^6.2.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "react": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
    }
  }
}
```

`packages/web/plugin-sdk/tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "typeRoots": ["./node_modules/@types"]
  },
  "include": ["src", "../../../shared/types", "../../../tests/vitest.setup.ts"]
}
```

`packages/web/plugin-sdk/tsconfig.build.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": "../../../",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": false
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

`packages/web/plugin-sdk/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  external: ["react", "react/jsx-runtime"],
});
```

`packages/web/plugin-sdk/vitest.config.ts`:

```ts
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { getAppVitestAliases } from "../../../tests/vitestAliases";

const repoRootDir: string = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

export default defineConfig({
  resolve: {
    alias: getAppVitestAliases({
      repoRootDir,
      include: ["shared", "web"],
    }),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [resolve(repoRootDir, "tests/vitest.setup.ts")],
  },
});
```

Copy the LICENSE from `packages/web/ui/LICENSE`.

`packages/web/plugin-sdk/README.md`:

```markdown
# @avandar/plugin-sdk

The API Avandar plugins are written against. Every call is async and passes
only serializable data, so the same plugin runs in-process today and inside
the sandbox later.

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
```

Leave the exports table body empty for now. Task 7 fills it in.

Create `packages/web/plugin-sdk/src/index.ts` containing only `export {};`.

- [ ] **Step 5: Create `packages/web/plugin-ui`**

`packages/web/plugin-ui/package.json`:

```json
{
  "name": "@avandar/plugin-ui",
  "version": "0.1.0",
  "private": true,
  "description": "The components Avandar plugin UI may render.",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/AvandarLabs/avandar.git",
    "directory": "packages/web/plugin-ui"
  },
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "sideEffects": false,
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "@mantine/core": "^9.2.0",
    "react": "^19.0.0"
  },
  "devDependencies": {
    "@mantine/core": "catalog:",
    "react": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
    }
  }
}
```

Create `tsconfig.json` and `tsconfig.build.json` identical to plugin-sdk's (Step 4).

`packages/web/plugin-ui/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  tsconfig: "tsconfig.build.json",
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  external: ["react", "@mantine/core"],
});
```

Copy the LICENSE from `packages/web/ui/LICENSE`.

`packages/web/plugin-ui/src/index.ts`:

```ts
/**
 * The components plugin UI may render. In-process plugins get these Mantine
 * components directly. When plugins move into the sandbox, the same names
 * become remote components, so plugin code does not change.
 */
export {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
```

`packages/web/plugin-ui/README.md`:

```markdown
# @avandar/plugin-ui

The components Avandar plugin UI may render. Plugins must import UI only from
this package, so their code moves into the sandbox unchanged.

## Exports

| Export | Kind | Purpose |
| --- | --- | --- |
| `Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`, `NumberInput`, `Select`, `SimpleGrid`, `Stack`, `Table`, `Text`, `TextInput`, `Title` | Components | Re-exported from Mantine with Avandar's theme |
```

- [ ] **Step 6: Register path aliases**

In `tsconfig.base.json` `compilerOptions.paths`, after the `@browser-utils/*` entry, add:

```json
      "@plugin-manifest": ["./packages/shared/plugin-manifest/src/index.ts"],
      "@plugin-manifest/*": ["./packages/shared/plugin-manifest/src/*"],
      "@plugin-sdk": ["./packages/web/plugin-sdk/src/index.ts"],
      "@plugin-sdk/*": ["./packages/web/plugin-sdk/src/*"],
      "@plugin-ui": ["./packages/web/plugin-ui/src/index.ts"],
      "@plugin-ui/*": ["./packages/web/plugin-ui/src/*"],
```

In `vite.config.ts` `resolve.alias`, after `"@browser-utils": "/packages/web/browser-utils/src",`, add:

```ts
        "@plugin-manifest": "/packages/shared/plugin-manifest/src",
        "@plugin-sdk": "/packages/web/plugin-sdk/src",
        "@plugin-ui": "/packages/web/plugin-ui/src",
```

In `tests/vitestAliases.ts`:

- In `_getSharedPackageVitestAliases`, add
  `"@plugin-manifest": resolve(rootDir, "packages/shared/plugin-manifest/src"),`.
- In `_getWebPackageVitestAliases`, add
  `"@plugin-sdk": resolve(rootDir, "packages/web/plugin-sdk/src"),` and
  `"@plugin-ui": resolve(rootDir, "packages/web/plugin-ui/src"),`.
- Update both functions' doc comments to list the new aliases.

- [ ] **Step 7: Root dependencies, app tsconfig, changesets**

In root `package.json` `dependencies`, after `"@avandar/models": "workspace:*",`, add:

```json
    "@avandar/plugin-manifest": "workspace:*",
    "@avandar/plugin-sdk": "workspace:*",
    "@avandar/plugin-ui": "workspace:*",
```

In `tsconfig.app.json` `include`, add `"./plugins/*/src"` after `"./packages/web/*/src"`.

In `.changeset/config.json`, change `"ignore"` to:

```json
  "ignore": [
    "@avandar/ava-cli",
    "@avandar/plugin-manifest",
    "@avandar/plugin-sdk",
    "@avandar/plugin-ui"
  ]
```

- [ ] **Step 8: Install and verify**

```bash
pnpm install
pnpm type-check
```

Expected: install links the three packages, and `type-check` passes with no new errors.

- [ ] **Step 9: Commit**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.app.json vite.config.ts tests/vitestAliases.ts .changeset/config.json packages/shared/plugin-manifest packages/web/plugin-sdk packages/web/plugin-ui
git commit -m "chore(plugins): scaffold plugin-manifest, plugin-sdk, and plugin-ui packages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `when` conditions and the slot fact registry

**Files:**
- Create: `packages/shared/plugin-manifest/src/WhenCondition/WhenCondition.types.ts`
- Create: `packages/shared/plugin-manifest/src/WhenCondition/whenConditionGuards.ts`
- Create: `packages/shared/plugin-manifest/src/WhenCondition/evaluateWhenCondition.ts`
- Test: `packages/shared/plugin-manifest/src/WhenCondition/evaluateWhenCondition.test.ts`
- Create: `packages/shared/plugin-manifest/src/SlotFacts/SlotFactRegistry.ts`

- [ ] **Step 1: Write the types**

`WhenCondition.types.ts`:

```ts
/** A comparison operator a `when` condition can apply to a fact. */
export type WhenOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in";

/** A value a contribution slot exposes as a fact. */
export type FactValue = string | number | boolean;

/** Facts a slot exposes to `when` conditions, keyed by fact name. */
export type WhenFacts = Readonly<Record<string, FactValue>>;

/**
 * A comparison against one fact, such as `{ rowCount: { gt: 0 } }`. Schema
 * validation guarantees exactly one fact per comparison.
 */
export type FactComparison = Readonly<
  Record<
    string,
    Readonly<Partial<Record<WhenOperator, FactValue | readonly FactValue[]>>>
  >
>;

/** Every condition in `all` must hold. */
export type AllCondition = Readonly<{ all: readonly WhenCondition[] }>;

/** At least one condition in `any` must hold. */
export type AnyCondition = Readonly<{ any: readonly WhenCondition[] }>;

/** The condition in `not` must not hold. */
export type NotCondition = Readonly<{ not: WhenCondition }>;

/** A declarative condition deciding whether a contribution is shown. */
export type WhenCondition =
  | AllCondition
  | AnyCondition
  | NotCondition
  | FactComparison;
```

`whenConditionGuards.ts`:

```ts
import type {
  AllCondition,
  AnyCondition,
  NotCondition,
  WhenCondition,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

/** True when `condition` is an `{ all: [...] }` combinator. */
export function isAllCondition(
  condition: WhenCondition,
): condition is AllCondition {
  return Array.isArray((condition as Partial<AllCondition>).all);
}

/** True when `condition` is an `{ any: [...] }` combinator. */
export function isAnyCondition(
  condition: WhenCondition,
): condition is AnyCondition {
  return Array.isArray((condition as Partial<AnyCondition>).any);
}

/**
 * True when `condition` is a `{ not: ... }` combinator. `all`, `any`, and
 * `not` are reserved: no slot declares a fact with those names.
 */
export function isNotCondition(
  condition: WhenCondition,
): condition is NotCondition {
  return Object.keys(condition).length === 1 && "not" in condition;
}
```

`SlotFactRegistry.ts`:

```ts
/** The value type of a fact a slot exposes to `when` conditions. */
export type FactType = "boolean" | "number" | "string";

/**
 * Every contribution slot and the facts it exposes to `when` conditions. A
 * manifest condition on a fact its slot does not list fails validation.
 */
export const SlotFactRegistry = {
  "dataExplorer.toolbar": {
    hasResult: "boolean",
    rowCount: "number",
    columnCount: "number",
    numericColumnCount: "number",
    dateColumnCount: "number",
  },
} as const satisfies Readonly<Record<string, Readonly<Record<string, FactType>>>>;

/** A contribution slot, such as `dataExplorer.toolbar`. */
export type SlotId = keyof typeof SlotFactRegistry;

/** Every slot ID, as a non-empty tuple for schema enums. */
export const SLOT_IDS = Object.keys(SlotFactRegistry) as [SlotId, ...SlotId[]];
```

- [ ] **Step 2: Write the failing test**

`evaluateWhenCondition.test.ts`:

```ts
import { evaluateWhenCondition } from "@plugin-manifest/WhenCondition/evaluateWhenCondition.ts";
import { describe, expect, it } from "vitest";
import type { WhenCondition } from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

const FACTS = {
  hasResult: true,
  rowCount: 20,
  numericColumnCount: 2,
  label: "cases",
};

describe("evaluateWhenCondition", () => {
  it("is true when there is no condition", () => {
    expect(evaluateWhenCondition(undefined, FACTS)).toBe(true);
  });

  it.each<[WhenCondition, boolean]>([
    [{ rowCount: { eq: 20 } }, true],
    [{ rowCount: { ne: 20 } }, false],
    [{ rowCount: { gt: 19 } }, true],
    [{ rowCount: { gte: 21 } }, false],
    [{ rowCount: { lt: 21 } }, true],
    [{ rowCount: { lte: 19 } }, false],
    [{ label: { in: ["cases", "deaths"] } }, true],
    [{ label: { in: ["deaths"] } }, false],
    [{ hasResult: { eq: true } }, true],
  ])("evaluates %j as %s", (condition, expected) => {
    expect(evaluateWhenCondition(condition, FACTS)).toBe(expected);
  });

  it("combines conditions with all, any, and not", () => {
    expect(
      evaluateWhenCondition(
        {
          all: [
            { numericColumnCount: { gte: 2 } },
            { any: [{ rowCount: { eq: 0 } }, { hasResult: { eq: true } }] },
            { not: { label: { eq: "deaths" } } },
          ],
        },
        FACTS,
      ),
    ).toBe(true);
  });

  it("is false for a fact the slot did not provide", () => {
    expect(evaluateWhenCondition({ unknownFact: { eq: 1 } }, FACTS)).toBe(
      false,
    );
  });

  it("is false when a numeric operator meets a non-number", () => {
    expect(evaluateWhenCondition({ label: { gt: 1 } }, FACTS)).toBe(false);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: FAIL, because `evaluateWhenCondition.ts` does not exist.

- [ ] **Step 4: Implement**

`evaluateWhenCondition.ts`:

```ts
import {
  isAllCondition,
  isAnyCondition,
  isNotCondition,
} from "@plugin-manifest/WhenCondition/whenConditionGuards.ts";
import type {
  FactComparison,
  FactValue,
  WhenCondition,
  WhenFacts,
  WhenOperator,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

function _compareFact(options: {
  operator: WhenOperator;
  actualValue: FactValue;
  expectedValue: FactValue | readonly FactValue[];
}): boolean {
  const { operator, actualValue, expectedValue } = options;
  if (operator === "in") {
    return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
  }
  if (operator === "eq") {
    return actualValue === expectedValue;
  }
  if (operator === "ne") {
    return actualValue !== expectedValue;
  }
  if (typeof actualValue !== "number" || typeof expectedValue !== "number") {
    return false;
  }
  switch (operator) {
    case "gt":
      return actualValue > expectedValue;
    case "gte":
      return actualValue >= expectedValue;
    case "lt":
      return actualValue < expectedValue;
    case "lte":
      return actualValue <= expectedValue;
  }
}

function _evaluateFactComparison(
  comparison: FactComparison,
  facts: WhenFacts,
): boolean {
  const [factName, operators] = Object.entries(comparison)[0] ?? [];
  if (factName === undefined || operators === undefined) {
    return false;
  }
  const actualValue = facts[factName];
  if (actualValue === undefined) {
    return false;
  }
  return Object.entries(operators).every(([operator, expectedValue]) => {
    return (
      expectedValue !== undefined &&
      _compareFact({
        operator: operator as WhenOperator,
        actualValue,
        expectedValue,
      })
    );
  });
}

/**
 * Evaluates a `when` condition against a slot's facts. A condition naming a
 * fact the slot did not provide evaluates to false, so a contribution stays
 * hidden rather than appearing somewhere it was not written for.
 */
export function evaluateWhenCondition(
  condition: WhenCondition | undefined,
  facts: WhenFacts,
): boolean {
  if (condition === undefined) {
    return true;
  }
  if (isAllCondition(condition)) {
    return condition.all.every((child) => {
      return evaluateWhenCondition(child, facts);
    });
  }
  if (isAnyCondition(condition)) {
    return condition.any.some((child) => {
      return evaluateWhenCondition(child, facts);
    });
  }
  if (isNotCondition(condition)) {
    return !evaluateWhenCondition(condition.not, facts);
  }
  return _evaluateFactComparison(condition as FactComparison, facts);
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: PASS, 14 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/plugin-manifest/src/WhenCondition packages/shared/plugin-manifest/src/SlotFacts
git commit -m "feat(plugins): evaluate structured when conditions against slot facts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The strict manifest schema

**Files:**
- Create: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.ts`
- Create: `packages/shared/plugin-manifest/src/PluginManifest/collectWhenConditionIssues.ts`
- Test: `packages/shared/plugin-manifest/src/PluginManifest/PluginManifestSchema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { PluginManifestSchema } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import { describe, expect, it } from "vitest";

function _makeValidManifest(): Record<string, unknown> {
  return {
    id: "avandar.epidemiology",
    name: "%plugin.name%",
    description: "%plugin.description%",
    version: "0.1.0",
    license: "MIT",
    engines: { avandar: "^1" },
    entry: "src/index.tsx",
    icon: "chart-dots",
    permissions: ["data:context"],
    contributes: {
      commands: [
        {
          id: "regression.linear",
          title: "%regression.linear.title%",
          icon: "trending-up",
        },
      ],
      menus: {
        "dataExplorer.toolbar": [
          {
            command: "regression.linear",
            when: { numericColumnCount: { gte: 2 } },
          },
        ],
      },
    },
  };
}

function _getIssueMessages(input: unknown): string[] {
  const result = PluginManifestSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => {
        return `${issue.path.join(".")}: ${issue.message}`;
      });
}

describe("PluginManifestSchema", () => {
  it("accepts a valid manifest and defaults omitted lists", () => {
    const manifest = _makeValidManifest();
    delete manifest.permissions;
    const result = PluginManifestSchema.parse(manifest);
    expect(result.permissions).toEqual([]);
    expect(result.contributes.commands).toHaveLength(1);
  });

  it("rejects unknown keys", () => {
    expect(
      _getIssueMessages({ ..._makeValidManifest(), colour: "red" }),
    ).not.toEqual([]);
  });

  it("rejects an id that is not publisher.name", () => {
    expect(
      _getIssueMessages({ ..._makeValidManifest(), id: "Epidemiology" })[0],
    ).toContain("publisher.name");
  });

  it("rejects a version YAML would have parsed as a number", () => {
    expect(
      _getIssueMessages({ ..._makeValidManifest(), version: 1.1 })[0],
    ).toContain("quoted semver");
  });

  it("rejects a menu item that references a missing command", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [],
      menus: { "dataExplorer.toolbar": [{ command: "regression.linear" }] },
    };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'unknown command "regression.linear"',
    );
  });

  it("rejects duplicate command ids", () => {
    const manifest = _makeValidManifest();
    const command = {
      id: "regression.linear",
      title: "%regression.linear.title%",
      icon: "trending-up",
    };
    manifest.contributes = { commands: [command, command], menus: {} };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'duplicate command id "regression.linear"',
    );
  });

  it("rejects a when condition on a fact the slot does not declare", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [
        { id: "x", title: "%x%", icon: "trending-up" },
      ],
      menus: {
        "dataExplorer.toolbar": [
          { command: "x", when: { mapZoom: { gt: 3 } } },
        ],
      },
    };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'unknown fact "mapZoom"',
    );
  });

  it("rejects an operator that does not fit the fact's type", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [{ id: "x", title: "%x%", icon: "trending-up" }],
      menus: {
        "dataExplorer.toolbar": [
          { command: "x", when: { hasResult: { gt: 1 } } },
        ],
      },
    };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'operator "gt" does not apply to boolean fact "hasResult"',
    );
  });

  it("rejects a permission this schema version does not support", () => {
    expect(
      _getIssueMessages({
        ..._makeValidManifest(),
        permissions: ["data:read"],
      }),
    ).not.toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: FAIL, because `PluginManifestSchema.ts` does not exist.

- [ ] **Step 3: Implement the `when` validator**

`collectWhenConditionIssues.ts`:

```ts
import {
  isAllCondition,
  isAnyCondition,
  isNotCondition,
} from "@plugin-manifest/WhenCondition/whenConditionGuards.ts";
import type { FactType } from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
import type {
  FactComparison,
  WhenCondition,
  WhenOperator,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

/** A schema issue located inside a `when` condition. */
export type WhenConditionIssue = Readonly<{
  path: ReadonlyArray<string | number>;
  message: string;
}>;

const OPERATORS_BY_FACT_TYPE = {
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "in"],
  boolean: ["eq", "ne"],
  string: ["eq", "ne", "in"],
} as const satisfies Readonly<Record<FactType, readonly WhenOperator[]>>;

function _isValueOfFactType(value: unknown, factType: FactType): boolean {
  return typeof value === factType;
}

function _collectComparisonIssues(options: {
  comparison: FactComparison;
  slotFacts: Readonly<Record<string, FactType>>;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { comparison, slotFacts, path } = options;
  return Object.entries(comparison).flatMap(([factName, operators]) => {
    const factType = slotFacts[factName];
    if (factType === undefined) {
      return [
        {
          path,
          message: `unknown fact "${factName}" for this slot. Known facts: ${Object.keys(slotFacts).join(", ")}`,
        },
      ];
    }
    return Object.entries(operators).flatMap(([operator, value]) => {
      const allowed: readonly string[] = OPERATORS_BY_FACT_TYPE[factType];
      if (!allowed.includes(operator)) {
        return [
          {
            path: [...path, factName],
            message: `operator "${operator}" does not apply to ${factType} fact "${factName}"`,
          },
        ];
      }
      const values = operator === "in" && Array.isArray(value) ? value : [value];
      const isValid = values.every((item: unknown) => {
        return _isValueOfFactType(item, factType);
      });
      return isValid
        ? []
        : [
            {
              path: [...path, factName, operator],
              message: `"${factName}" is a ${factType} fact`,
            },
          ];
    });
  });
}

/**
 * Checks a `when` condition against the facts its slot declares: every fact
 * must exist, and every operator and value must fit the fact's type.
 */
export function collectWhenConditionIssues(options: {
  condition: WhenCondition;
  slotFacts: Readonly<Record<string, FactType>>;
  path: ReadonlyArray<string | number>;
}): WhenConditionIssue[] {
  const { condition, slotFacts, path } = options;
  if (isAllCondition(condition) || isAnyCondition(condition)) {
    const key = isAllCondition(condition) ? "all" : "any";
    const children = isAllCondition(condition) ? condition.all : condition.any;
    return children.flatMap((child, index) => {
      return collectWhenConditionIssues({
        condition: child,
        slotFacts,
        path: [...path, key, index],
      });
    });
  }
  if (isNotCondition(condition)) {
    return collectWhenConditionIssues({
      condition: condition.not,
      slotFacts,
      path: [...path, "not"],
    });
  }
  return _collectComparisonIssues({
    comparison: condition as FactComparison,
    slotFacts,
    path,
  });
}
```

- [ ] **Step 4: Implement the schema**

`PluginManifestSchema.ts`:

```ts
import { collectWhenConditionIssues } from "@plugin-manifest/PluginManifest/collectWhenConditionIssues.ts";
import {
  SLOT_IDS,
  SlotFactRegistry,
} from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
import { z } from "zod";
import type { WhenCondition } from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

const PLUGIN_ID_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const LOCALIZED_KEY_PATTERN = /^%[A-Za-z0-9_.-]+%$/;
const COMMAND_ID_PATTERN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/;
const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ENTRY_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+\.tsx?$/;
const WHEN_OPERATORS = ["eq", "ne", "gt", "gte", "lt", "lte", "in"] as const;

/** Permissions a manifest may request in this version of the schema. */
export const PLUGIN_PERMISSIONS = ["data:context"] as const;

/** A permission a plugin may request. */
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

const LocalizedStringSchema = z
  .string()
  .regex(LOCALIZED_KEY_PATTERN, "must be a %key% reference to locales/en.json");

const IconNameSchema = z
  .string()
  .regex(ICON_NAME_PATTERN, "must be a Tabler icon name, e.g. chart-dots");

const FactValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const FactComparisonSchema = z
  .record(
    z.string(),
    z
      .partialRecord(
        z.enum(WHEN_OPERATORS),
        z.union([FactValueSchema, z.array(FactValueSchema)]),
      )
      .refine(
        (operators) => {
          return Object.keys(operators).length >= 1;
        },
        { message: "a fact comparison needs an operator" },
      ),
  )
  .refine(
    (comparison) => {
      return Object.keys(comparison).length === 1;
    },
    { message: "a fact comparison names exactly one fact" },
  );

const WhenConditionSchema: z.ZodType<WhenCondition> = z.lazy(() => {
  return z.union([
    z.strictObject({ all: z.array(WhenConditionSchema).min(1) }),
    z.strictObject({ any: z.array(WhenConditionSchema).min(1) }),
    z.strictObject({ not: WhenConditionSchema }),
    FactComparisonSchema,
  ]);
});

const CommandSchema = z.strictObject({
  id: z.string().regex(COMMAND_ID_PATTERN, "must be lowercase words separated by dots"),
  title: LocalizedStringSchema,
  icon: IconNameSchema,
});

const MenuItemSchema = z.strictObject({
  command: z.string(),
  when: WhenConditionSchema.optional(),
});

const BasePluginManifestSchema = z.strictObject({
  id: z
    .string()
    .regex(PLUGIN_ID_PATTERN, "must look like publisher.name, e.g. avandar.epidemiology"),
  name: LocalizedStringSchema,
  description: LocalizedStringSchema,
  version: z
    .string({ error: 'must be a quoted semver string, e.g. "1.2.0"' })
    .regex(SEMVER_PATTERN, 'must be a quoted semver string, e.g. "1.2.0"'),
  license: z.string().min(1),
  engines: z.strictObject({ avandar: z.string().min(1) }),
  entry: z
    .string()
    .regex(ENTRY_PATTERN, "must be a relative path to a .ts or .tsx file inside the plugin folder"),
  icon: IconNameSchema,
  permissions: z.array(z.enum(PLUGIN_PERMISSIONS)).default([]),
  contributes: z.strictObject({
    commands: z.array(CommandSchema).default([]),
    menus: z.partialRecord(z.enum(SLOT_IDS), z.array(MenuItemSchema)).default({}),
  }),
});

type BasePluginManifest = z.output<typeof BasePluginManifestSchema>;

function _refineCommands(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const seenIds = new Set<string>();
  manifest.contributes.commands.forEach((command, index) => {
    if (seenIds.has(command.id)) {
      context.addIssue({
        code: "custom",
        path: ["contributes", "commands", index, "id"],
        message: `duplicate command id "${command.id}"`,
      });
    }
    seenIds.add(command.id);
  });
}

function _refineMenus(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const commandIds = new Set(
    manifest.contributes.commands.map((command) => {
      return command.id;
    }),
  );
  SLOT_IDS.forEach((slotId) => {
    const items = manifest.contributes.menus[slotId] ?? [];
    items.forEach((item, index) => {
      const path = ["contributes", "menus", slotId, index];
      if (!commandIds.has(item.command)) {
        context.addIssue({
          code: "custom",
          path: [...path, "command"],
          message: `unknown command "${item.command}"`,
        });
      }
      if (item.when !== undefined) {
        collectWhenConditionIssues({
          condition: item.when,
          slotFacts: SlotFactRegistry[slotId],
          path: [...path, "when"],
        }).forEach((issue) => {
          context.addIssue({
            code: "custom",
            path: [...issue.path],
            message: issue.message,
          });
        });
      }
    });
  });
}

/**
 * The schema for a compiled `ava.yaml`. Strict: unknown keys fail, so a typo
 * is a build error rather than a silently ignored setting.
 */
export const PluginManifestSchema = BasePluginManifestSchema.superRefine(
  (manifest, context) => {
    _refineCommands(manifest, context);
    _refineMenus(manifest, context);
  },
);

/** A validated plugin manifest. */
export type PluginManifest = z.output<typeof PluginManifestSchema>;

/** A command a plugin declares. */
export type PluginCommand = PluginManifest["contributes"]["commands"][number];

/** A plugin command placed in a slot. */
export type PluginMenuEntry = z.output<typeof MenuItemSchema>;
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: PASS. If a message assertion fails, check that the Zod issue path and message strings match exactly, and fix the implementation, not the test.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/plugin-manifest/src/PluginManifest
git commit -m "feat(plugins): add the strict plugin manifest schema

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Compile `ava.yaml` and resolve manifest strings

**Files:**
- Create: `packages/shared/plugin-manifest/src/compileManifest/PluginManifestError.ts`
- Create: `packages/shared/plugin-manifest/src/compileManifest/compileManifest.ts`
- Create: `packages/shared/plugin-manifest/src/strings/resolveManifestString.ts`
- Create: `packages/shared/plugin-manifest/src/icons/toTablerIconComponentName.ts`
- Test: `packages/shared/plugin-manifest/src/compileManifest/compileManifest.test.ts`
- Test: `packages/shared/plugin-manifest/src/strings/resolveManifestString.test.ts`
- Test: `packages/shared/plugin-manifest/src/icons/toTablerIconComponentName.test.ts`

- [ ] **Step 1: Write the failing tests**

`compileManifest.test.ts`:

```ts
import { compileManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { describe, expect, it } from "vitest";

const VALID_YAML = `
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
`;

const LOCALES = {
  en: {
    "plugin.name": "Epidemiology",
    "plugin.description": "Statistical tools.",
    "regression.linear.title": "Linear regression",
    "regression.unused": "Not referenced by the manifest",
  },
  es: { "plugin.name": "Epidemiología" },
};

function _compile(yamlText: string, locales = LOCALES) {
  return compileManifest({ yamlText, sourcePath: "plugins/epi/ava.yaml", locales });
}

describe("compileManifest", () => {
  it("returns the manifest and only the strings it references", () => {
    const { manifest, strings } = _compile(VALID_YAML);
    expect(manifest.id).toBe("avandar.epidemiology");
    expect(strings.en).toEqual({
      "plugin.name": "Epidemiology",
      "plugin.description": "Statistical tools.",
      "regression.linear.title": "Linear regression",
    });
    expect(strings.es).toEqual({ "plugin.name": "Epidemiología" });
  });

  it("rejects an unquoted version that YAML parses as a number", () => {
    expect(() => {
      return _compile(VALID_YAML.replace('version: "0.1.0"', "version: 1.10"));
    }).toThrow(/quoted semver/);
  });

  it("keeps a NO country code as a string under YAML 1.2", () => {
    const yamlText = VALID_YAML.replace("license: MIT", "license: NO");
    expect(_compile(yamlText).manifest.license).toBe("NO");
  });

  it("rejects YAML aliases before schema validation", () => {
    // The alias sits in an otherwise valid manifest, so only the alias guard
    // can make this throw. The message names aliasing, not a schema issue.
    const yamlText = VALID_YAML.replace(
      'engines:\n  avandar: "^1"',
      'engines:\n  avandar: &range "^1"',
    ).replace("license: MIT", "license: *range");
    expect(() => {
      return _compile(yamlText);
    }).toThrow(/alias/i);
  });

  it("reports a missing English string", () => {
    expect(() => {
      return _compile(VALID_YAML, { en: { "plugin.name": "Epidemiology" } });
    }).toThrow(/"plugin.description" is referenced but missing from locales\/en.json/);
  });

  it("requires locales/en.json", () => {
    expect(() => {
      return _compile(VALID_YAML, { es: LOCALES.es } as never);
    }).toThrow(/locales\/en.json is required/);
  });

  it("lists every schema issue with its path", () => {
    try {
      _compile(VALID_YAML.replace("id: avandar.epidemiology", "id: Bad"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginManifestError);
      expect((error as PluginManifestError).issues[0]).toMatch(/^id: /);
    }
  });
});
```

`resolveManifestString.test.ts`:

```ts
import { resolveManifestString } from "@plugin-manifest/strings/resolveManifestString.ts";
import { describe, expect, it } from "vitest";

const STRINGS = {
  en: { "plugin.name": "Epidemiology" },
  es: { "plugin.name": "Epidemiología" },
};

describe("resolveManifestString", () => {
  it("resolves a key in the requested locale", () => {
    expect(
      resolveManifestString({ strings: STRINGS, locale: "es", value: "%plugin.name%" }),
    ).toBe("Epidemiología");
  });

  it("falls back to English", () => {
    expect(
      resolveManifestString({ strings: STRINGS, locale: "fr", value: "%plugin.name%" }),
    ).toBe("Epidemiology");
  });

  it("returns plain text unchanged", () => {
    expect(
      resolveManifestString({ strings: STRINGS, locale: "en", value: "Plain" }),
    ).toBe("Plain");
  });
});
```

`toTablerIconComponentName.test.ts`:

```ts
import { toTablerIconComponentName } from "@plugin-manifest/icons/toTablerIconComponentName.ts";
import { describe, expect, it } from "vitest";

describe("toTablerIconComponentName", () => {
  it.each([
    ["chart-dots", "IconChartDots"],
    ["trending-up", "IconTrendingUp"],
    ["number-1", "IconNumber1"],
    ["puzzle", "IconPuzzle"],
  ])("maps %s to %s", (iconName, componentName) => {
    expect(toTablerIconComponentName(iconName)).toBe(componentName);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: FAIL, because the three modules do not exist.

- [ ] **Step 3: Implement**

`PluginManifestError.ts`:

```ts
/**
 * Thrown when a plugin's manifest is invalid. Carries every problem found,
 * not only the first, so one build run surfaces them all.
 */
export class PluginManifestError extends Error {
  readonly sourcePath: string;
  readonly issues: readonly string[];

  constructor(options: { sourcePath: string; issues: readonly string[] }) {
    const issueLines = options.issues
      .map((issue) => {
        return `  - ${issue}`;
      })
      .join("\n");
    super(`Invalid plugin manifest ${options.sourcePath}:\n${issueLines}`);
    this.name = "PluginManifestError";
    this.sourcePath = options.sourcePath;
    this.issues = options.issues;
  }
}
```

`resolveManifestString.ts`:

```ts
/** Locale code to message key to text, as loaded from `locales/<lang>.json`. */
export type PluginLocaleMessages = Readonly<
  Record<string, Readonly<Record<string, string>>>
>;

const LOCALIZED_KEY_PATTERN = /^%([A-Za-z0-9_.-]+)%$/;

/** The message key in a `%key%` reference, or undefined for plain text. */
export function getLocalizedKey(value: string): string | undefined {
  return LOCALIZED_KEY_PATTERN.exec(value)?.[1];
}

/**
 * Resolves a manifest string. `%key%` references resolve in `locale`, then
 * English, then fall back to the bare key. Plain text is returned unchanged.
 */
export function resolveManifestString(options: {
  strings: PluginLocaleMessages;
  locale: string;
  value: string;
}): string {
  const { strings, locale, value } = options;
  const key = getLocalizedKey(value);
  if (key === undefined) {
    return value;
  }
  return strings[locale]?.[key] ?? strings.en?.[key] ?? key;
}
```

`toTablerIconComponentName.ts`:

```ts
/**
 * Converts a Tabler icon name from a manifest, such as `trending-up`, to the
 * component `@tabler/icons-react` exports for it, such as `IconTrendingUp`.
 */
export function toTablerIconComponentName(iconName: string): string {
  const pascalCaseName = iconName
    .split("-")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
  return `Icon${pascalCaseName}`;
}
```

`compileManifest.ts`:

```ts
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { PluginManifestSchema } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import { getLocalizedKey } from "@plugin-manifest/strings/resolveManifestString.ts";
import { parseDocument } from "yaml";
import type { PluginManifest } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/resolveManifestString.ts";

/** A validated manifest plus the locale strings its `%key%` references need. */
export type CompiledPluginManifest = Readonly<{
  manifest: PluginManifest;
  strings: PluginLocaleMessages;
}>;

/** Every message key the manifest's user-facing strings reference. */
export function getManifestStringKeys(manifest: PluginManifest): string[] {
  const values = [
    manifest.name,
    manifest.description,
    ...manifest.contributes.commands.map((command) => {
      return command.title;
    }),
  ];
  return values.flatMap((value) => {
    const key = getLocalizedKey(value);
    return key === undefined ? [] : [key];
  });
}

function _parseYaml(options: { yamlText: string; sourcePath: string }): unknown {
  const document = parseDocument(options.yamlText, {
    version: "1.2",
    schema: "core",
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new PluginManifestError({
      sourcePath: options.sourcePath,
      issues: document.errors.map((error) => {
        return error.message;
      }),
    });
  }
  try {
    // `maxAliasCount: 0` rejects every alias: manifests have no use for
    // them, and they enable exponential expansion.
    return document.toJS({ maxAliasCount: 0 });
  } catch (error) {
    throw new PluginManifestError({
      sourcePath: options.sourcePath,
      issues: [error instanceof Error ? error.message : String(error)],
    });
  }
}

function _pickReferencedStrings(options: {
  locales: PluginLocaleMessages;
  keys: readonly string[];
}): PluginLocaleMessages {
  return Object.fromEntries(
    Object.entries(options.locales).map(([locale, messages]) => {
      const picked = options.keys.flatMap((key) => {
        const text = messages[key];
        return text === undefined ? [] : [[key, text] as const];
      });
      return [locale, Object.fromEntries(picked)];
    }),
  );
}

/**
 * Parses an `ava.yaml` as strict YAML 1.2, validates it, and resolves its
 * `%key%` strings against the plugin's locale files. Throws
 * `PluginManifestError` listing every problem.
 */
export function compileManifest(options: {
  yamlText: string;
  sourcePath: string;
  locales: PluginLocaleMessages;
}): CompiledPluginManifest {
  const { sourcePath, locales } = options;
  const result = PluginManifestSchema.safeParse(_parseYaml(options));
  if (!result.success) {
    throw new PluginManifestError({
      sourcePath,
      issues: result.error.issues.map((issue) => {
        return `${issue.path.join(".") || "(root)"}: ${issue.message}`;
      }),
    });
  }
  const englishMessages = locales.en;
  if (englishMessages === undefined) {
    throw new PluginManifestError({
      sourcePath,
      issues: ["locales/en.json is required"],
    });
  }
  const keys = getManifestStringKeys(result.data);
  const missingKeys = keys.filter((key) => {
    return englishMessages[key] === undefined;
  });
  if (missingKeys.length > 0) {
    throw new PluginManifestError({
      sourcePath,
      issues: missingKeys.map((key) => {
        return `"${key}" is referenced but missing from locales/en.json`;
      }),
    });
  }
  return {
    manifest: result.data,
    strings: _pickReferencedStrings({ locales, keys }),
  };
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: PASS.

If `rejects YAML aliases before schema validation` fails, `toJS({ maxAliasCount: 0 })` is accepting aliases in this `yaml` version. In that case, walk the document with `visit(document, { Alias: () => { throw ... } })` from `yaml` before calling `toJS`, and keep the test as it is.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/plugin-manifest/src/compileManifest packages/shared/plugin-manifest/src/strings packages/shared/plugin-manifest/src/icons
git commit -m "feat(plugins): compile ava.yaml as strict YAML 1.2 with locale checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Read plugin folders from disk

**Files:**
- Create: `packages/shared/plugin-manifest/src/dependencies/approvedDependencies.ts`
- Create: `packages/shared/plugin-manifest/src/node/readPluginDirectory.ts`
- Create: `packages/shared/plugin-manifest/src/node/readBundledPlugins.ts`
- Test: `packages/shared/plugin-manifest/src/dependencies/approvedDependencies.test.ts`
- Test: `packages/shared/plugin-manifest/src/node/readPluginDirectory.test.ts`

- [ ] **Step 1: Write the failing tests**

`approvedDependencies.test.ts`:

```ts
import { findUnapprovedDependencies } from "@plugin-manifest/dependencies/approvedDependencies.ts";
import { describe, expect, it } from "vitest";

describe("findUnapprovedDependencies", () => {
  it("returns only dependencies outside the approved list", () => {
    expect(
      findUnapprovedDependencies({
        dependencies: {
          "@avandar/plugin-sdk": "workspace:*",
          "simple-statistics": "^7.8.8",
          lodash: "^4.17.21",
        },
      }),
    ).toEqual(["lodash"]);
  });

  it("accepts a package.json with no dependencies", () => {
    expect(findUnapprovedDependencies({})).toEqual([]);
  });
});
```

`readPluginDirectory.test.ts`:

```ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { readBundledPlugins } from "@plugin-manifest/node/readBundledPlugins.ts";
import { readPluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const MANIFEST_YAML = `
id: avandar.hello
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: puzzle
contributes:
  commands:
    - id: hello
      title: "%hello.title%"
      icon: hand-stop
`;

let repoRoot: string;

function _writeFile(path: string, contents: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, contents);
}

function _writePlugin(folderName: string, overrides: { yaml?: string; dependencies?: Record<string, string> } = {}): string {
  const directory = join(repoRoot, "plugins", folderName);
  _writeFile(join(directory, "ava.yaml"), overrides.yaml ?? MANIFEST_YAML);
  _writeFile(
    join(directory, "locales/en.json"),
    JSON.stringify({
      "plugin.name": "Hello",
      "plugin.description": "Says hello.",
      "hello.title": "Say hello",
    }),
  );
  _writeFile(join(directory, "src/index.tsx"), "export default {};\n");
  _writeFile(
    join(directory, "package.json"),
    JSON.stringify({ dependencies: overrides.dependencies ?? {} }),
  );
  return directory;
}

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "ava-plugins-"));
  const iconsDirectory = join(repoRoot, "node_modules/@tabler/icons-react/dist/esm/icons");
  mkdirSync(iconsDirectory, { recursive: true });
  writeFileSync(join(iconsDirectory, "IconPuzzle.mjs"), "");
  writeFileSync(join(iconsDirectory, "IconHandStop.mjs"), "");
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
});

describe("readPluginDirectory", () => {
  it("reads and validates a plugin folder", () => {
    const directory = _writePlugin("hello");
    const plugin = readPluginDirectory({ directory, repoRoot });
    expect(plugin.folderName).toBe("hello");
    expect(plugin.compiled.manifest.id).toBe("avandar.hello");
    expect(plugin.entryPath).toBe(join(directory, "src/index.tsx"));
    expect(plugin.locales.en?.["hello.title"]).toBe("Say hello");
  });

  it("reports an unknown icon, a missing entry, and an unapproved dependency together", () => {
    const directory = _writePlugin("hello", {
      yaml: MANIFEST_YAML.replace("icon: puzzle", "icon: no-such-icon").replace(
        "entry: src/index.tsx",
        "entry: src/missing.tsx",
      ),
      dependencies: { lodash: "^4.17.21" },
    });
    try {
      readPluginDirectory({ directory, repoRoot });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginManifestError);
      const issues = (error as PluginManifestError).issues.join("\n");
      expect(issues).toContain('unknown Tabler icon "no-such-icon"');
      expect(issues).toContain("entry: src/missing.tsx does not exist");
      expect(issues).toContain('dependency "lodash" is not approved');
    }
  });
});

describe("readBundledPlugins", () => {
  it("returns no plugins when plugins/bundled.yaml is missing", () => {
    expect(readBundledPlugins(repoRoot)).toEqual([]);
  });

  it("reads every folder listed in plugins/bundled.yaml", () => {
    _writePlugin("hello");
    _writeFile(join(repoRoot, "plugins/bundled.yaml"), "plugins:\n  - hello\n");
    expect(
      readBundledPlugins(repoRoot).map((plugin) => {
        return plugin.compiled.manifest.id;
      }),
    ).toEqual(["avandar.hello"]);
  });

  it("rejects two bundled folders with the same plugin id", () => {
    _writePlugin("hello");
    _writePlugin("hello-copy");
    _writeFile(
      join(repoRoot, "plugins/bundled.yaml"),
      "plugins:\n  - hello\n  - hello-copy\n",
    );
    expect(() => {
      return readBundledPlugins(repoRoot);
    }).toThrow(/avandar.hello is bundled twice/);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: FAIL, because the modules do not exist.

- [ ] **Step 3: Implement**

`approvedDependencies.ts`:

```ts
/**
 * npm packages plugin code may depend on. Keep this in sync with the import
 * allowlist in `eslint/plugin-restrictions.js`.
 */
export const APPROVED_PLUGIN_DEPENDENCIES = [
  "@avandar/plugin-sdk",
  "@avandar/plugin-ui",
  "react",
  "simple-statistics",
  "d3-array",
  "date-fns",
] as const;

/** Names in a plugin's `package.json` dependencies that are not approved. */
export function findUnapprovedDependencies(
  packageJson: Readonly<{ dependencies?: Readonly<Record<string, string>> }>,
): string[] {
  const approved: readonly string[] = APPROVED_PLUGIN_DEPENDENCIES;
  return Object.keys(packageJson.dependencies ?? {}).filter((name) => {
    return !approved.includes(name);
  });
}
```

`readPluginDirectory.ts`:

```ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { compileManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
import { findUnapprovedDependencies } from "@plugin-manifest/dependencies/approvedDependencies.ts";
import { toTablerIconComponentName } from "@plugin-manifest/icons/toTablerIconComponentName.ts";
import type { CompiledPluginManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
import type { PluginLocaleMessages } from "@plugin-manifest/strings/resolveManifestString.ts";

/** A plugin folder read from disk and fully validated. */
export type PluginDirectory = Readonly<{
  folderName: string;
  directory: string;
  entryPath: string;
  compiled: CompiledPluginManifest;
  locales: PluginLocaleMessages;
}>;

function _readLocales(directory: string): PluginLocaleMessages {
  const localesDirectory = join(directory, "locales");
  if (!existsSync(localesDirectory)) {
    return {};
  }
  return Object.fromEntries(
    readdirSync(localesDirectory)
      .filter((fileName) => {
        return fileName.endsWith(".json");
      })
      .map((fileName) => {
        const messages = JSON.parse(
          readFileSync(join(localesDirectory, fileName), "utf8"),
        ) as Record<string, string>;
        return [fileName.replace(/\.json$/, ""), messages];
      }),
  );
}

function _collectFileIssues(options: {
  directory: string;
  repoRoot: string;
  compiled: CompiledPluginManifest;
}): string[] {
  const { directory, repoRoot, compiled } = options;
  const { manifest } = compiled;
  const issues: string[] = [];
  if (!existsSync(join(directory, manifest.entry))) {
    issues.push(`entry: ${manifest.entry} does not exist`);
  }
  const iconsDirectory = join(repoRoot, "node_modules/@tabler/icons-react/dist/esm/icons");
  const iconNames = [
    manifest.icon,
    ...manifest.contributes.commands.map((command) => {
      return command.icon;
    }),
  ];
  new Set(iconNames).forEach((iconName) => {
    const iconFile = `${toTablerIconComponentName(iconName)}.mjs`;
    if (!existsSync(join(iconsDirectory, iconFile))) {
      issues.push(`unknown Tabler icon "${iconName}"`);
    }
  });
  const packageJsonPath = join(directory, "package.json");
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };
    findUnapprovedDependencies(packageJson).forEach((name) => {
      issues.push(`dependency "${name}" is not approved for plugins`);
    });
  }
  return issues;
}

/**
 * Reads a plugin folder: compiles `ava.yaml` against its locales, then checks
 * that the entry file exists, every icon is a real Tabler icon, and every
 * dependency is approved. Throws `PluginManifestError` listing every problem.
 */
export function readPluginDirectory(options: {
  directory: string;
  repoRoot: string;
}): PluginDirectory {
  const { directory, repoRoot } = options;
  const manifestPath = join(directory, "ava.yaml");
  const sourcePath = relative(repoRoot, manifestPath);
  if (!existsSync(manifestPath)) {
    throw new PluginManifestError({ sourcePath, issues: ["ava.yaml not found"] });
  }
  const locales = _readLocales(directory);
  const compiled = compileManifest({
    yamlText: readFileSync(manifestPath, "utf8"),
    sourcePath,
    locales,
  });
  const issues = _collectFileIssues({ directory, repoRoot, compiled });
  if (issues.length > 0) {
    throw new PluginManifestError({ sourcePath, issues });
  }
  return {
    folderName: basename(directory),
    directory,
    entryPath: join(directory, compiled.manifest.entry),
    compiled,
    locales,
  };
}
```

`readBundledPlugins.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";
import { parse } from "yaml";
import { z } from "zod";
import type { PluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";

const BundledPluginsSchema = z.strictObject({
  plugins: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default([]),
});

/** The plugin folders `plugins/bundled.yaml` lists, in order. */
export function readBundledPluginFolders(repoRoot: string): string[] {
  const bundledListPath = join(repoRoot, "plugins/bundled.yaml");
  if (!existsSync(bundledListPath)) {
    return [];
  }
  const parsed: unknown = parse(readFileSync(bundledListPath, "utf8")) ?? {};
  return BundledPluginsSchema.parse(parsed).plugins;
}

/**
 * Reads and validates every plugin this deployment bundles. Throws when two
 * folders declare the same plugin id.
 */
export function readBundledPlugins(repoRoot: string): PluginDirectory[] {
  const plugins = readBundledPluginFolders(repoRoot).map((folderName) => {
    return readPluginDirectory({
      directory: join(repoRoot, "plugins", folderName),
      repoRoot,
    });
  });
  const seenIds = new Set<string>();
  plugins.forEach((plugin) => {
    const pluginId = plugin.compiled.manifest.id;
    if (seenIds.has(pluginId)) {
      throw new Error(`${pluginId} is bundled twice (plugins/${plugin.folderName})`);
    }
    seenIds.add(pluginId);
  });
  return plugins;
}
```

- [ ] **Step 4: Run them and watch them pass**

Run: `pnpm --filter @avandar/plugin-manifest test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/plugin-manifest/src/dependencies packages/shared/plugin-manifest/src/node
git commit -m "feat(plugins): read and validate plugin folders from disk

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: plugin-manifest entry points and README

**Files:**
- Modify: `packages/shared/plugin-manifest/src/index.ts`
- Modify: `packages/shared/plugin-manifest/src/runtime.ts`
- Modify: `packages/shared/plugin-manifest/src/node/index.ts`
- Modify: `packages/shared/plugin-manifest/README.md`

- [ ] **Step 1: Write the browser runtime entry**

`src/runtime.ts`. Browser code imports only this file, so it must never pull in Zod schemas or `yaml`:

```ts
export { evaluateWhenCondition } from "@plugin-manifest/WhenCondition/evaluateWhenCondition.ts";
export { resolveManifestString } from "@plugin-manifest/strings/resolveManifestString.ts";
export { SLOT_IDS, SlotFactRegistry } from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
export type { CompiledPluginManifest } from "@plugin-manifest/compileManifest/compileManifest.ts";
export type {
  PluginCommand,
  PluginManifest,
  PluginMenuEntry,
  PluginPermission,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
export type { FactType, SlotId } from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
export type { PluginLocaleMessages } from "@plugin-manifest/strings/resolveManifestString.ts";
export type {
  FactValue,
  WhenCondition,
  WhenFacts,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";
```

- [ ] **Step 2: Write the main and Node entries**

`src/index.ts`:

```ts
export * from "@plugin-manifest/runtime.ts";
export { compileManifest, getManifestStringKeys } from "@plugin-manifest/compileManifest/compileManifest.ts";
export { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
export {
  APPROVED_PLUGIN_DEPENDENCIES,
  findUnapprovedDependencies,
} from "@plugin-manifest/dependencies/approvedDependencies.ts";
export { toTablerIconComponentName } from "@plugin-manifest/icons/toTablerIconComponentName.ts";
export {
  PLUGIN_PERMISSIONS,
  PluginManifestSchema,
} from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
```

`src/node/index.ts`:

```ts
export {
  readBundledPluginFolders,
  readBundledPlugins,
} from "@plugin-manifest/node/readBundledPlugins.ts";
export { readPluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";
export type { PluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";
```

- [ ] **Step 3: Fill in the README exports table**

Under `## Exports` in `packages/shared/plugin-manifest/README.md`, add one row per export, using these purposes:

| Export | Kind | Purpose |
| --- | --- | --- |
| `evaluateWhenCondition` | Function | Evaluates a `when` condition against slot facts |
| `resolveManifestString` | Function | Resolves a `%key%` string in a locale, falling back to English |
| `SlotFactRegistry`, `SLOT_IDS` | Constants | Slots and the facts each exposes |
| `compileManifest` | Function | Parses and validates `ava.yaml`, picks referenced strings |
| `getManifestStringKeys` | Function | Message keys a manifest references |
| `PluginManifestError` | Class | Error listing every manifest problem |
| `PluginManifestSchema`, `PLUGIN_PERMISSIONS` | Schema, constant | The strict manifest schema and the allowed permissions |
| `APPROVED_PLUGIN_DEPENDENCIES`, `findUnapprovedDependencies` | Constant, function | The npm allowlist for plugins |
| `toTablerIconComponentName` | Function | `trending-up` to `IconTrendingUp` |
| `readPluginDirectory`, `readBundledPlugins`, `readBundledPluginFolders` | Functions (Node) | Read and validate plugin folders |
| `PluginManifest`, `PluginCommand`, `PluginMenuEntry`, `PluginPermission`, `CompiledPluginManifest`, `PluginLocaleMessages`, `PluginDirectory`, `SlotId`, `FactType`, `FactValue`, `WhenCondition`, `WhenFacts` | Types | Manifest and condition types |

- [ ] **Step 4: Verify**

```bash
pnpm --filter @avandar/plugin-manifest test
pnpm --filter @avandar/plugin-manifest type-check
pnpm --filter @avandar/plugin-manifest build
```

Expected: tests PASS, type-check is clean, and the build writes `dist/index.js`, `dist/runtime.js`, and `dist/node.js`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/plugin-manifest/src/index.ts packages/shared/plugin-manifest/src/runtime.ts packages/shared/plugin-manifest/src/node/index.ts packages/shared/plugin-manifest/README.md
git commit -m "feat(plugins): expose plugin-manifest runtime, node, and main entries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The plugin SDK

**Files:**
- Create: `packages/web/plugin-sdk/src/PluginApi.types.ts`
- Create: `packages/web/plugin-sdk/src/PluginError.ts`
- Create: `packages/web/plugin-sdk/src/definePlugin.ts`
- Create: `packages/web/plugin-sdk/src/createPluginTranslator.ts`
- Create: `packages/web/plugin-sdk/src/AvandarContext.tsx`
- Modify: `packages/web/plugin-sdk/src/index.ts`, `packages/web/plugin-sdk/README.md`
- Test: `packages/web/plugin-sdk/src/definePlugin.test.ts`
- Test: `packages/web/plugin-sdk/src/createPluginTranslator.test.ts`
- Test: `packages/web/plugin-sdk/src/AvandarContext.test.tsx`

- [ ] **Step 1: Write the API types**

`PluginApi.types.ts`:

```ts
import type { ReactNode } from "react";

/** A column type in a query result, matching Avandar's data types. */
export type PluginColumnDataType =
  | "boolean"
  | "bigint"
  | "double"
  | "time"
  | "date"
  | "timestamp"
  | "varchar";

/**
 * An opaque reference to a query result. A plugin passes it back to
 * `avandar.data.fetchRows` and never sees the query behind it.
 */
export type QueryHandle = string & { readonly __brand: "QueryHandle" };

/** What a Data Explorer toolbar command was invoked on. */
export type DataExplorerToolbarContext = Readonly<{
  slotId: "dataExplorer.toolbar";
  queryHandle: QueryHandle;
  columns: ReadonlyArray<Readonly<{ name: string; dataType: PluginColumnDataType }>>;
  rowCount: number;
}>;

/** What a command was invoked on. One variant per slot. */
export type PluginInvocationContext = DataExplorerToolbarContext;

/** Options for `avandar.data.fetchRows`. */
export type FetchRowsOptions = Readonly<{
  columns: readonly string[];
  limit?: number;
}>;

/** Rows returned by `avandar.data.fetchRows`. */
export type FetchRowsResult = Readonly<{
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  isTruncated: boolean;
}>;

/** Values interpolated into an ICU message. */
export type TranslationValues = Readonly<Record<string, string | number>>;

/** Locale code to message key to ICU message, from `locales/<lang>.json`. */
export type PluginMessages = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** A modal or drawer a plugin opens. */
export type PluginOverlayOptions = Readonly<{ title: string; content: ReactNode }>;

/** A notification a plugin shows. */
export type PluginNotifyOptions = Readonly<{
  title?: string;
  message: string;
  color?: "blue" | "green" | "red" | "yellow";
}>;

/**
 * The API a plugin receives, scoped to one plugin, workspace, user, and
 * invocation. Every call is async or fire-and-forget and passes only
 * serializable data, so plugins run unchanged inside the sandbox later.
 */
export type AvandarApi = Readonly<{
  context: PluginInvocationContext;
  workspace: Readonly<{ id: string; slug: string; locale: string }>;
  data: Readonly<{
    fetchRows: (
      queryHandle: QueryHandle,
      options: FetchRowsOptions,
    ) => Promise<FetchRowsResult>;
  }>;
  ui: Readonly<{
    openModal: (options: PluginOverlayOptions) => void;
    openDrawer: (options: PluginOverlayOptions) => void;
    notify: (options: PluginNotifyOptions) => void;
  }>;
  i18n: Readonly<{
    t: (key: string, values?: TranslationValues) => string;
  }>;
}>;

/** Runs when a user invokes a plugin command. */
export type CommandHandler = (avandar: AvandarApi) => Promise<void> | void;

/** What a plugin's entry module exports as its default. */
export type PluginDefinition = Readonly<{
  kind: "avandar-plugin";
  commands: Readonly<Record<string, CommandHandler>>;
}>;
```

`PluginError.ts`:

```ts
/** Why a plugin API call failed. */
export type PluginErrorCode =
  | "PermissionDenied"
  | "InvalidHandle"
  | "LoadFailed"
  | "CommandFailed";

/** A typed error from the plugin API. Plugins can branch on `code`. */
export class PluginError extends Error {
  readonly code: PluginErrorCode;

  constructor(code: PluginErrorCode, message: string) {
    super(message);
    this.name = "PluginError";
    this.code = code;
  }
}
```

- [ ] **Step 2: Write the failing tests**

`definePlugin.test.ts`:

```ts
import { definePlugin, isPluginDefinition } from "@plugin-sdk/definePlugin";
import { describe, expect, it } from "vitest";

describe("definePlugin", () => {
  it("marks the definition so the host can recognize it", () => {
    const definition = definePlugin({ commands: { hello: () => {} } });
    expect(isPluginDefinition(definition)).toBe(true);
  });

  it("rejects values that are not plugin definitions", () => {
    expect(isPluginDefinition({ commands: {} })).toBe(false);
    expect(isPluginDefinition(undefined)).toBe(false);
  });
});
```

`createPluginTranslator.test.ts`:

```ts
import { createPluginTranslator } from "@plugin-sdk/createPluginTranslator";
import { describe, expect, it } from "vitest";

const MESSAGES = {
  en: {
    "rows.count": "{count, plural, one {# row} other {# rows}}",
    "greeting": "Hello, {name}",
  },
  es: { "greeting": "Hola, {name}" },
};

describe("createPluginTranslator", () => {
  it("formats ICU messages in the requested locale", () => {
    const t = createPluginTranslator({ locale: "es", messages: MESSAGES });
    expect(t("greeting", { name: "Ana" })).toBe("Hola, Ana");
  });

  it("falls back to English for a missing translation", () => {
    const t = createPluginTranslator({ locale: "es", messages: MESSAGES });
    expect(t("rows.count", { count: 2 })).toBe("2 rows");
  });

  it("returns the key when no locale has it", () => {
    const t = createPluginTranslator({ locale: "en", messages: MESSAGES });
    expect(t("missing.key")).toBe("missing.key");
  });
});
```

`AvandarContext.test.tsx`:

```tsx
import { AvandarProvider, useAvandar, useT } from "@plugin-sdk/AvandarContext";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

const API = {
  i18n: {
    t: (key: string) => {
      return `t:${key}`;
    },
  },
} as unknown as AvandarApi;

function _wrapper({ children }: { children: ReactNode }): JSX.Element {
  return <AvandarProvider api={API}>{children}</AvandarProvider>;
}

describe("useAvandar", () => {
  it("returns the API inside an AvandarProvider", () => {
    const { result } = renderHook(useAvandar, { wrapper: _wrapper });
    expect(result.current).toBe(API);
  });

  it("throws outside plugin UI", () => {
    expect(() => {
      return renderHook(useAvandar);
    }).toThrow(/inside plugin UI/);
  });

  it("exposes the plugin translator through useT", () => {
    const { result } = renderHook(useT, { wrapper: _wrapper });
    expect(result.current("hello")).toBe("t:hello");
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm --filter @avandar/plugin-sdk test`
Expected: FAIL, because the modules do not exist.

- [ ] **Step 4: Implement**

`definePlugin.ts`:

```ts
import type { CommandHandler, PluginDefinition } from "@plugin-sdk/PluginApi.types";

/**
 * Declares a plugin's command handlers. The plugin's entry module must export
 * the result as its default export.
 */
export function definePlugin(
  definition: Readonly<{ commands: Readonly<Record<string, CommandHandler>> }>,
): PluginDefinition {
  return { kind: "avandar-plugin", commands: definition.commands };
}

/** True when `value` came from `definePlugin`. */
export function isPluginDefinition(value: unknown): value is PluginDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "avandar-plugin" &&
    typeof (value as { commands?: unknown }).commands === "object"
  );
}
```

`createPluginTranslator.ts`:

```ts
import { setupI18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import type { PluginMessages, TranslationValues } from "@plugin-sdk/PluginApi.types";

/**
 * Builds a translator for a plugin's own messages. Messages are ICU strings
 * compiled at runtime. A key missing from `locale` falls back to English,
 * then to the bare key.
 */
export function createPluginTranslator(options: {
  locale: string;
  messages: PluginMessages;
}): (key: string, values?: TranslationValues) => string {
  const { locale, messages } = options;
  const i18n = setupI18n();
  i18n.setMessagesCompiler(compileMessage);
  i18n.load(locale, { ...messages.en, ...messages[locale] });
  i18n.activate(locale);
  return (key, values) => {
    return i18n._(key, values);
  };
}
```

`AvandarContext.tsx`:

```tsx
import { PluginError } from "@plugin-sdk/PluginError";
import { createContext, useContext } from "react";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

const AvandarApiContext = createContext<AvandarApi | undefined>(undefined);

/** Gives plugin UI access to its scoped `avandar` API. The host renders it. */
export function AvandarProvider(props: {
  api: AvandarApi;
  children: ReactNode;
}): JSX.Element {
  return (
    <AvandarApiContext.Provider value={props.api}>
      {props.children}
    </AvandarApiContext.Provider>
  );
}

/** The scoped `avandar` API, for components inside plugin UI. */
export function useAvandar(): AvandarApi {
  const api = useContext(AvandarApiContext);
  if (api === undefined) {
    throw new PluginError(
      "CommandFailed",
      "useAvandar() must be called inside plugin UI opened through avandar.ui",
    );
  }
  return api;
}

/** The plugin's translator, for components inside plugin UI. */
export function useT(): AvandarApi["i18n"]["t"] {
  return useAvandar().i18n.t;
}
```

`src/index.ts`:

```ts
export { AvandarProvider, useAvandar, useT } from "@plugin-sdk/AvandarContext";
export { createPluginTranslator } from "@plugin-sdk/createPluginTranslator";
export { definePlugin, isPluginDefinition } from "@plugin-sdk/definePlugin";
export { PluginError } from "@plugin-sdk/PluginError";
export type { PluginErrorCode } from "@plugin-sdk/PluginError";
export type {
  AvandarApi,
  CommandHandler,
  DataExplorerToolbarContext,
  FetchRowsOptions,
  FetchRowsResult,
  PluginColumnDataType,
  PluginDefinition,
  PluginInvocationContext,
  PluginMessages,
  PluginNotifyOptions,
  PluginOverlayOptions,
  QueryHandle,
  TranslationValues,
} from "@plugin-sdk/PluginApi.types";
```

Add a README exports row for each export above, in the same three-column format used in Task 6.

- [ ] **Step 5: Run them and watch them pass**

Run: `pnpm --filter @avandar/plugin-sdk test && pnpm --filter @avandar/plugin-sdk type-check`
Expected: PASS, and type-check is clean.

- [ ] **Step 6: Commit**

```bash
git add packages/web/plugin-sdk
git commit -m "feat(plugins): add the plugin SDK API, translator, and context hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The Vite plugin's code generators

**Files:**
- Create: `scripts/vite-plugin-ava-plugins/pluginModuleIds.ts`
- Create: `scripts/vite-plugin-ava-plugins/buildPluginModules.ts`
- Test: `scripts/vite-plugin-ava-plugins/buildPluginModules.test.ts`

- [ ] **Step 1: Write the module ID constants**

`pluginModuleIds.ts`:

```ts
/** The virtual module listing every bundled plugin's lazy loaders. */
export const PLUGIN_INDEX_MODULE_ID = "virtual:ava-plugin-index";

/** Prefix of the per-plugin manifest module: manifest, strings, icons. */
export const PLUGIN_MANIFEST_MODULE_PREFIX = "virtual:ava-plugin-manifest/";

/** Prefix of the per-plugin locales module: every locale file's messages. */
export const PLUGIN_LOCALES_MODULE_PREFIX = "virtual:ava-plugin-locales/";
```

- [ ] **Step 2: Write the failing test**

`buildPluginModules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildPluginIndexModule,
  buildPluginLocalesModule,
  buildPluginManifestModule,
} from "./buildPluginModules";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";

const PLUGIN = {
  folderName: "epidemiology",
  directory: "/repo/plugins/epidemiology",
  entryPath: "/repo/plugins/epidemiology/src/index.tsx",
  compiled: {
    manifest: {
      id: "avandar.epidemiology",
      icon: "chart-dots",
      contributes: {
        commands: [{ id: "regression.linear", title: "%t%", icon: "trending-up" }],
        menus: {},
      },
    },
    strings: { en: { t: "Linear regression" } },
  },
  locales: { en: { t: "Linear regression", "modal.fit": "Fit regression" } },
} as unknown as PluginDirectory;

describe("buildPluginIndexModule", () => {
  it("emits lazy loaders with root-relative entry paths and no eager imports", () => {
    const code = buildPluginIndexModule({ plugins: [PLUGIN], repoRoot: "/repo" });
    expect(code).not.toMatch(/^import /m);
    expect(code).toContain('id: "avandar.epidemiology"');
    expect(code).toContain('import("virtual:ava-plugin-manifest/avandar.epidemiology")');
    expect(code).toContain('import("/plugins/epidemiology/src/index.tsx")');
    expect(code).toContain('import("virtual:ava-plugin-locales/avandar.epidemiology")');
  });

  it("emits an empty index when nothing is bundled", () => {
    expect(buildPluginIndexModule({ plugins: [], repoRoot: "/repo" })).toBe(
      "export const PLUGIN_INDEX = [\n\n];\n",
    );
  });
});

describe("buildPluginManifestModule", () => {
  it("imports each distinct icon once and exports manifest, strings, icons", () => {
    const code = buildPluginManifestModule(PLUGIN);
    expect(code).toContain(
      'import { IconChartDots, IconTrendingUp } from "@tabler/icons-react";',
    );
    expect(code).toContain('export const manifest = {"id":"avandar.epidemiology"');
    expect(code).toContain('export const strings = {"en":{"t":"Linear regression"}};');
    expect(code).toContain(
      'export const icons = { "chart-dots": IconChartDots, "trending-up": IconTrendingUp };',
    );
  });
});

describe("buildPluginLocalesModule", () => {
  it("exports every locale file", () => {
    expect(buildPluginLocalesModule(PLUGIN)).toBe(
      'export default {"en":{"t":"Linear regression","modal.fit":"Fit regression"}};\n',
    );
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins`
Expected: FAIL, because `buildPluginModules.ts` does not exist.

- [ ] **Step 4: Implement**

`buildPluginModules.ts`:

```ts
import { relative, sep } from "node:path";
import { toTablerIconComponentName } from "@avandar/plugin-manifest";
import {
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "./pluginModuleIds";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";

function _toRootRelativePath(options: { path: string; repoRoot: string }): string {
  return `/${relative(options.repoRoot, options.path).split(sep).join("/")}`;
}

/**
 * Source for `virtual:ava-plugin-index`: one entry per bundled plugin with
 * lazy `loadManifest` and `loadCode` loaders. It must contain no static
 * imports, so the main bundle carries only these few bytes per plugin.
 */
export function buildPluginIndexModule(options: {
  plugins: readonly PluginDirectory[];
  repoRoot: string;
}): string {
  const entries = options.plugins.map((plugin) => {
    const pluginId = plugin.compiled.manifest.id;
    const entryPath = _toRootRelativePath({ path: plugin.entryPath, repoRoot: options.repoRoot });
    return [
      "  {",
      `    id: ${JSON.stringify(pluginId)},`,
      `    loadManifest: () => import(${JSON.stringify(`${PLUGIN_MANIFEST_MODULE_PREFIX}${pluginId}`)}),`,
      "    loadCode: async () => {",
      "      const [code, locales] = await Promise.all([",
      `        import(${JSON.stringify(entryPath)}),`,
      `        import(${JSON.stringify(`${PLUGIN_LOCALES_MODULE_PREFIX}${pluginId}`)}),`,
      "      ]);",
      "      return { definition: code.default, messages: locales.default };",
      "    },",
      "  },",
    ].join("\n");
  });
  return `export const PLUGIN_INDEX = [\n${entries.join("\n")}\n];\n`;
}

/**
 * Source for `virtual:ava-plugin-manifest/<id>`: the compiled manifest, the
 * strings it references, and the Tabler icon components it names.
 */
export function buildPluginManifestModule(plugin: PluginDirectory): string {
  const { manifest, strings } = plugin.compiled;
  const iconNames = [
    ...new Set([
      manifest.icon,
      ...manifest.contributes.commands.map((command) => {
        return command.icon;
      }),
    ]),
  ];
  const componentNames = iconNames.map(toTablerIconComponentName);
  const iconEntries = iconNames.map((iconName) => {
    return `${JSON.stringify(iconName)}: ${toTablerIconComponentName(iconName)}`;
  });
  return [
    `import { ${componentNames.join(", ")} } from "@tabler/icons-react";`,
    `export const manifest = ${JSON.stringify(manifest)};`,
    `export const strings = ${JSON.stringify(strings)};`,
    `export const icons = { ${iconEntries.join(", ")} };`,
    "",
  ].join("\n");
}

/** Source for `virtual:ava-plugin-locales/<id>`: every locale file. */
export function buildPluginLocalesModule(plugin: PluginDirectory): string {
  return `export default ${JSON.stringify(plugin.locales)};\n`;
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/vite-plugin-ava-plugins/pluginModuleIds.ts scripts/vite-plugin-ava-plugins/buildPluginModules.ts scripts/vite-plugin-ava-plugins/buildPluginModules.test.ts
git commit -m "feat(plugins): generate the virtual plugin index, manifest, and locale modules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The bundle check

**Files:**
- Create: `scripts/vite-plugin-ava-plugins/checkPluginBundle.ts`
- Test: `scripts/vite-plugin-ava-plugins/checkPluginBundle.test.ts`

The check measures, in a single build, the rendered bytes of the plugin host's modules in the statically reachable chunks. It does not compare against a second, plugin-free build. The result is the same and the build runs once. The budget is in raw rendered bytes: 24,000 for the host, plus 600 per bundled plugin, which is roughly the spec's 8 KB and 200 bytes gzipped.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  checkPluginBundle,
  HOST_BUDGET_BYTES,
} from "./checkPluginBundle";
import type { ChunkSummary } from "./checkPluginBundle";

const PLUGINS_DIRECTORY = "/repo/plugins";

function _chunk(overrides: Partial<ChunkSummary> & { fileName: string }): ChunkSummary {
  return { isEntry: false, imports: [], moduleLengths: {}, ...overrides };
}

describe("checkPluginBundle", () => {
  it("passes when plugin code is only in lazy chunks", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 1,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: { "\0virtual:ava-plugin-index": 300, "/repo/src/lib/plugins/PluginHost/PluginHost.tsx": 4_000 },
        }),
        _chunk({ fileName: "epi.js", moduleLengths: { "/repo/plugins/epidemiology/src/index.tsx": 9_000 } }),
      ],
    });
    expect(violations).toEqual([]);
  });

  it("fails when a plugin module is statically reachable from the entry", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 1,
      chunks: [
        _chunk({ fileName: "index.js", isEntry: true, imports: ["shared.js"] }),
        _chunk({ fileName: "shared.js", moduleLengths: { "/repo/plugins/epidemiology/src/index.tsx": 9_000 } }),
      ],
    });
    expect(violations[0]).toContain("plugins/epidemiology/src/index.tsx");
  });

  it("fails when a plugin manifest module is statically reachable", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 1,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: { "\0virtual:ava-plugin-manifest/avandar.epidemiology": 900 },
        }),
      ],
    });
    expect(violations).toHaveLength(1);
  });

  it("fails when the plugin host exceeds its budget", () => {
    const violations = checkPluginBundle({
      pluginsDirectory: PLUGINS_DIRECTORY,
      pluginCount: 0,
      chunks: [
        _chunk({
          fileName: "index.js",
          isEntry: true,
          moduleLengths: { "/repo/src/lib/plugins/PluginHost/PluginHost.tsx": HOST_BUDGET_BYTES + 1 },
        }),
      ],
    });
    expect(violations[0]).toMatch(/plugin host adds .* bytes/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement**

`checkPluginBundle.ts`:

```ts
import { relative } from "node:path";
import {
  PLUGIN_INDEX_MODULE_ID,
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "./pluginModuleIds";
import type { OutputBundle } from "rollup";

/** The parts of a Rollup output chunk the bundle check reads. */
export type ChunkSummary = Readonly<{
  fileName: string;
  isEntry: boolean;
  imports: readonly string[];
  moduleLengths: Readonly<Record<string, number>>;
}>;

/** Rendered bytes the plugin host may add to statically loaded chunks. */
export const HOST_BUDGET_BYTES = 24_000;

/** Rendered bytes each bundled plugin may add to statically loaded chunks. */
export const PER_PLUGIN_BUDGET_BYTES = 600;

const HOST_MODULE_MARKERS = [
  "/src/lib/plugins/",
  "/packages/shared/plugin-manifest/",
  `\0${PLUGIN_INDEX_MODULE_ID}`,
];

/** Summarizes a Rollup bundle for `checkPluginBundle`. */
export function toChunkSummaries(bundle: OutputBundle): ChunkSummary[] {
  return Object.values(bundle).flatMap((output) => {
    if (output.type !== "chunk") {
      return [];
    }
    const moduleLengths = Object.fromEntries(
      Object.entries(output.modules).map(([moduleId, info]) => {
        return [moduleId, info.renderedLength];
      }),
    );
    return [
      {
        fileName: output.fileName,
        isEntry: output.isEntry,
        imports: output.imports,
        moduleLengths,
      },
    ];
  });
}

function _getStaticallyReachableChunks(
  chunks: readonly ChunkSummary[],
): ChunkSummary[] {
  const chunksByFileName = new Map(
    chunks.map((chunk) => {
      return [chunk.fileName, chunk] as const;
    }),
  );
  const visited = new Set<string>();
  const pending = chunks
    .filter((chunk) => {
      return chunk.isEntry;
    })
    .map((chunk) => {
      return chunk.fileName;
    });
  while (pending.length > 0) {
    const fileName = pending.pop();
    if (fileName === undefined || visited.has(fileName)) {
      continue;
    }
    visited.add(fileName);
    pending.push(...(chunksByFileName.get(fileName)?.imports ?? []));
  }
  return chunks.filter((chunk) => {
    return visited.has(chunk.fileName);
  });
}

function _isLazyPluginModule(moduleId: string, pluginsDirectory: string): boolean {
  return (
    moduleId.startsWith(`${pluginsDirectory}/`) ||
    moduleId.startsWith(`\0${PLUGIN_MANIFEST_MODULE_PREFIX}`) ||
    moduleId.startsWith(`\0${PLUGIN_LOCALES_MODULE_PREFIX}`)
  );
}

/**
 * Checks that workspaces without plugins pay nothing for them: no plugin
 * code, manifest, or locale module may be statically reachable from an entry
 * chunk, and the plugin host must stay within its byte budget. Returns one
 * message per violation.
 */
export function checkPluginBundle(options: {
  chunks: readonly ChunkSummary[];
  pluginsDirectory: string;
  pluginCount: number;
}): string[] {
  const { chunks, pluginsDirectory, pluginCount } = options;
  const reachableChunks = _getStaticallyReachableChunks(chunks);
  const violations: string[] = [];
  let hostBytes = 0;
  reachableChunks.forEach((chunk) => {
    Object.entries(chunk.moduleLengths).forEach(([moduleId, length]) => {
      if (_isLazyPluginModule(moduleId, pluginsDirectory)) {
        const displayId = moduleId.startsWith("\0")
          ? moduleId.slice(1)
          : `plugins/${relative(pluginsDirectory, moduleId)}`;
        violations.push(
          `${displayId} is statically reachable from ${chunk.fileName}. Plugin code must load only through loadManifest() and loadCode().`,
        );
      }
      if (HOST_MODULE_MARKERS.some((marker) => {
        return moduleId.includes(marker);
      })) {
        hostBytes += length;
      }
    });
  });
  const budgetBytes = HOST_BUDGET_BYTES + PER_PLUGIN_BUDGET_BYTES * pluginCount;
  if (hostBytes > budgetBytes) {
    violations.push(
      `The plugin host adds ${hostBytes} bytes to statically loaded chunks, over its ${budgetBytes} byte budget.`,
    );
  }
  return violations;
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run scripts/vite-plugin-ava-plugins/checkPluginBundle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/vite-plugin-ava-plugins/checkPluginBundle.ts scripts/vite-plugin-ava-plugins/checkPluginBundle.test.ts
git commit -m "feat(plugins): check that plugin code stays out of the main bundle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Wire the Vite plugin into the build

**Files:**
- Create: `scripts/vite-plugin-ava-plugins/vitePluginAvaPlugins.ts`
- Create: `src/lib/plugins/PluginIndex.types.ts`
- Create: `src/types/virtualAvaPluginIndex.d.ts`
- Create: `src/test-utils/virtualAvaPluginIndexStub.ts`
- Create: `plugins/bundled.yaml`
- Modify: `vite.config.ts`, `package.json`, `.github/workflows/pr-develop.yaml`

- [ ] **Step 1: Write the host's index types**

`src/lib/plugins/PluginIndex.types.ts`:

```ts
import type { CompiledPluginManifest } from "@avandar/plugin-manifest/runtime";
import type { PluginMessages } from "@avandar/plugin-sdk";
import type { ComponentType } from "react";

/** A Tabler icon component a manifest names. */
export type PluginIconComponent = ComponentType<{
  size?: number | string;
  "aria-hidden"?: boolean;
}>;

/** The lazily loaded manifest chunk of one plugin. */
export type PluginManifestModule = CompiledPluginManifest &
  Readonly<{ icons: Readonly<Record<string, PluginIconComponent>> }>;

/**
 * The lazily loaded code chunk of one plugin. `definition` is unknown until
 * the host checks it with `isPluginDefinition`.
 */
export type PluginCodeModule = Readonly<{
  definition: unknown;
  messages: PluginMessages;
}>;

/** One bundled plugin in `virtual:ava-plugin-index`. */
export type PluginIndexEntry = Readonly<{
  id: string;
  loadManifest: () => Promise<PluginManifestModule>;
  loadCode: () => Promise<PluginCodeModule>;
}>;
```

`src/types/virtualAvaPluginIndex.d.ts`:

```ts
declare module "virtual:ava-plugin-index" {
  import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

  /** Every plugin this deployment bundles, with lazy loaders. */
  export const PLUGIN_INDEX: readonly PluginIndexEntry[];
}
```

`src/test-utils/virtualAvaPluginIndexStub.ts`:

```ts
import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

/**
 * Stand-in for `virtual:ava-plugin-index` under Vitest, where the Vite plugin
 * that generates it is not registered. Tests that need entries mock
 * `@/lib/plugins/pluginIndex`.
 */
export const PLUGIN_INDEX: readonly PluginIndexEntry[] = [];
```

- [ ] **Step 2: Write the Vite plugin**

`scripts/vite-plugin-ava-plugins/vitePluginAvaPlugins.ts`:

```ts
import { join } from "node:path";
import { readBundledPlugins } from "@avandar/plugin-manifest/node";
import {
  buildPluginIndexModule,
  buildPluginLocalesModule,
  buildPluginManifestModule,
} from "./buildPluginModules";
import { checkPluginBundle, toChunkSummaries } from "./checkPluginBundle";
import {
  PLUGIN_INDEX_MODULE_ID,
  PLUGIN_LOCALES_MODULE_PREFIX,
  PLUGIN_MANIFEST_MODULE_PREFIX,
} from "./pluginModuleIds";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";
import type { Plugin } from "vite";

const VIRTUAL_PREFIX = "\0";

function _isPluginVirtualId(id: string): boolean {
  return (
    id === PLUGIN_INDEX_MODULE_ID ||
    id.startsWith(PLUGIN_MANIFEST_MODULE_PREFIX) ||
    id.startsWith(PLUGIN_LOCALES_MODULE_PREFIX)
  );
}

function _isPluginSourceFile(file: string): boolean {
  return (
    file.endsWith("/ava.yaml") ||
    file.endsWith("/plugins/bundled.yaml") ||
    (file.includes("/plugins/") && file.includes("/locales/"))
  );
}

function _loadVirtualModule(options: {
  id: string;
  plugins: readonly PluginDirectory[];
  repoRoot: string;
}): string | undefined {
  const { id, plugins, repoRoot } = options;
  if (id === PLUGIN_INDEX_MODULE_ID) {
    return buildPluginIndexModule({ plugins, repoRoot });
  }
  const findPlugin = (prefix: string) => {
    return plugins.find((plugin) => {
      return `${prefix}${plugin.compiled.manifest.id}` === id;
    });
  };
  const manifestPlugin = findPlugin(PLUGIN_MANIFEST_MODULE_PREFIX);
  if (manifestPlugin) {
    return buildPluginManifestModule(manifestPlugin);
  }
  const localesPlugin = findPlugin(PLUGIN_LOCALES_MODULE_PREFIX);
  return localesPlugin ? buildPluginLocalesModule(localesPlugin) : undefined;
}

/**
 * Bundles the plugins listed in `plugins/bundled.yaml`. Generates
 * `virtual:ava-plugin-index` plus one lazy manifest and locale module per
 * plugin, reloads the dev server when a manifest or locale file changes, and
 * when `isBundleCheckEnabled` is set fails the build if plugin code reaches
 * the main bundle.
 */
export function vitePluginAvaPlugins(options: {
  repoRoot: string;
  isBundleCheckEnabled: boolean;
}): Plugin {
  const { repoRoot, isBundleCheckEnabled } = options;
  let plugins: PluginDirectory[] = [];
  return {
    name: "ava-plugins",
    buildStart() {
      plugins = readBundledPlugins(repoRoot);
    },
    resolveId(id) {
      return _isPluginVirtualId(id) ? `${VIRTUAL_PREFIX}${id}` : null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) {
        return null;
      }
      return _loadVirtualModule({ id: id.slice(1), plugins, repoRoot }) ?? null;
    },
    configureServer(server) {
      server.watcher.on("change", (file) => {
        if (!_isPluginSourceFile(file)) {
          return;
        }
        try {
          plugins = readBundledPlugins(repoRoot);
        } catch (error) {
          server.config.logger.error(String(error));
          return;
        }
        server.moduleGraph.idToModuleMap.forEach((module, moduleId) => {
          if (moduleId.startsWith(`${VIRTUAL_PREFIX}virtual:ava-plugin`)) {
            server.moduleGraph.invalidateModule(module);
          }
        });
        server.ws.send({ type: "full-reload" });
      });
    },
    generateBundle(_outputOptions, bundle) {
      if (!isBundleCheckEnabled) {
        return;
      }
      const violations = checkPluginBundle({
        chunks: toChunkSummaries(bundle),
        pluginsDirectory: join(repoRoot, "plugins"),
        pluginCount: plugins.length,
      });
      if (violations.length > 0) {
        this.error(`Plugin bundle check failed:\n${violations.join("\n")}`);
      }
    },
  };
}
```

- [ ] **Step 3: Register it in `vite.config.ts`**

Add the import below the other imports:

```ts
import { vitePluginAvaPlugins } from "./scripts/vite-plugin-ava-plugins/vitePluginAvaPlugins";
```

In the non-test `plugins` array, insert this right after `TanStackRouterVite({...}),`:

```ts
            vitePluginAvaPlugins({
              repoRoot: process.cwd(),
              isBundleCheckEnabled: process.env.AVA_PLUGIN_BUNDLE_CHECK === "1",
            }),
```

In the test-mode alias block, next to `"virtual:pwa-register"`, add:

```ts
              "virtual:ava-plugin-index":
                "/src/test-utils/virtualAvaPluginIndexStub.ts",
```

- [ ] **Step 4: Create an empty bundled list**

`plugins/bundled.yaml`:

```yaml
# Plugin folders under plugins/ that this deployment bundles into the app.
# Each listed plugin becomes its own lazy chunk. Installing it per workspace
# happens in Settings → Plugins.
plugins: []
```

- [ ] **Step 5: Add the bundle check script and CI step**

In root `package.json` `scripts`, after `"build"`, add:

```json
    "check:plugin-bundle": "AVA_PLUGIN_BUNDLE_CHECK=1 vite build --outDir node_modules/.tmp/plugin-bundle-check",
```

In `.github/workflows/pr-develop.yaml`, in the `test-quick` job, right after the step `- run: bash scripts/ci/prepare-envs/prepare-envs.sh`, add:

```yaml
      - run: pnpm check:plugin-bundle
```

- [ ] **Step 6: Verify the build and dev server**

```bash
pnpm check:plugin-bundle
pnpm type-check
```

Expected: the build completes with the check enabled and an empty plugin list, and type-check is clean.

If loading `vite.config.ts` fails to resolve `@plugin-manifest/...` imports inside `@avandar/plugin-manifest`, Vite's config bundler is not applying the tsconfig `paths`. Fix it by adding the same three aliases to the config bundle. Register `vite-tsconfig-paths`, which is already a dev dependency, as the first plugin in `vite.config.ts`'s `plugins` for both modes, then re-run.

- [ ] **Step 7: Commit**

```bash
git add scripts/vite-plugin-ava-plugins/vitePluginAvaPlugins.ts src/lib/plugins/PluginIndex.types.ts src/types/virtualAvaPluginIndex.d.ts src/test-utils/virtualAvaPluginIndexStub.ts plugins/bundled.yaml vite.config.ts package.json .github/workflows/pr-develop.yaml
git commit -m "feat(plugins): bundle listed plugins as lazy chunks and check it in CI

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The `plugin_installations` table

**Files:**
- Test: `supabase/tests/database/permissions/rls_plugin_installations.test.sql`
- Create: `supabase/schemas/10.plugin_installations.sql`
- Create: `supabase/migrations/<timestamp>_add_plugin_installations.sql` (generated)
- Modify: `shared/types/database.types.ts` (generated)

Use the `supabase-declarative-schema` skill for this task. Confirm `ava supabase status` is green before every database command.

- [ ] **Step 1: Write the failing pgTAP test**

`supabase/tests/database/permissions/rls_plugin_installations.test.sql`:

```sql
\set ON_ERROR_STOP on

/**
 * RLS contract for `plugin_installations`. Workspace members can read the
 * installs of their workspace. Only settings admins (the owner here) can
 * install, update, or uninstall. Other workspaces see nothing.
 */
begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role)
values
  ('a7000001-0000-4000-8000-000000000001'::uuid, 'plugins_owner@test.dev', 'authenticated', 'authenticated'),
  ('a7000002-0000-4000-8000-000000000002'::uuid, 'plugins_member@test.dev', 'authenticated', 'authenticated'),
  ('a7000003-0000-4000-8000-000000000003'::uuid, 'plugins_outsider@test.dev', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_id, name, slug)
values
  ('a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid, 'plugins ws a', 'plugins-ws-a'),
  ('a7001002-0000-4000-8000-000000000002'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid, 'plugins ws b', 'plugins-ws-b')
on conflict (id) do nothing;

insert into public.workspace_memberships (id, workspace_id, user_id)
values
  ('a7002001-0000-4000-8000-000000000001'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000001-0000-4000-8000-000000000001'::uuid),
  ('a7002002-0000-4000-8000-000000000002'::uuid, 'a7001001-0000-4000-8000-000000000001'::uuid, 'a7000002-0000-4000-8000-000000000002'::uuid),
  ('a7002003-0000-4000-8000-000000000003'::uuid, 'a7001002-0000-4000-8000-000000000002'::uuid, 'a7000003-0000-4000-8000-000000000003'::uuid)
on conflict (id) do nothing;

insert into public.plugin_installations (id, workspace_id, plugin_id, installed_version, granted_permissions)
values (
  'a700a001-0000-4000-8000-000000000001'::uuid,
  'a7001001-0000-4000-8000-000000000001'::uuid,
  'avandar.epidemiology',
  '0.1.0',
  array['data:context']
);

select plan (9);

-- 1. A plain member reads their workspace's install.
select lives_ok (
  $t1$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations) <> 1 then
      raise exception 'a member cannot read their workspace plugin installs';
    end if;
  end $chk$;
  $t1$,
  'a workspace member selects the workspace plugin installs'
);

-- 2. Another workspace's member reads nothing.
select lives_ok (
  $t2$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations where workspace_id = 'a7001001-0000-4000-8000-000000000001'::uuid) <> 0 then
      raise exception 'an outsider read another workspace plugin installs';
    end if;
  end $chk$;
  $t2$,
  'a user outside the workspace reads no plugin installs'
);

-- 3. A plain member cannot install.
select throws_ok (
  $t3$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'avandar.other', '0.1.0');
  $t3$,
  '42501',
  null,
  'a member without settings admin cannot install a plugin'
);

-- 4. An outsider cannot install into another workspace.
select throws_ok (
  $t4$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000003-0000-4000-8000-000000000003","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'avandar.other', '0.1.0');
  $t4$,
  '42501',
  null,
  'an outsider cannot install a plugin into another workspace'
);

-- 5. The owner installs.
select lives_ok (
  $t5$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'avandar.other', '0.1.0');
  $t5$,
  'the workspace owner installs a plugin'
);

-- 6. A plain member's update is filtered by RLS.
select lives_ok (
  $t6$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  update public.plugin_installations set is_enabled = false where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select is_enabled from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) is not true then
      raise exception 'a member disabled a plugin';
    end if;
  end $chk$;
  $t6$,
  'a member without settings admin cannot disable a plugin'
);

-- 7. A plain member's delete is filtered by RLS.
select lives_ok (
  $t7$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000002-0000-4000-8000-000000000002","role":"authenticated"}', true);
  delete from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select count(*)::int from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) <> 1 then
      raise exception 'a member uninstalled a plugin';
    end if;
  end $chk$;
  $t7$,
  'a member without settings admin cannot uninstall a plugin'
);

-- 8. The owner disables.
select lives_ok (
  $t8$
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"a7000001-0000-4000-8000-000000000001","role":"authenticated"}', true);
  update public.plugin_installations set is_enabled = false where id = 'a700a001-0000-4000-8000-000000000001'::uuid;
  reset role;
  do $chk$
  begin
    if (select is_enabled from public.plugin_installations where id = 'a700a001-0000-4000-8000-000000000001'::uuid) is not false then
      raise exception 'the owner could not disable a plugin';
    end if;
  end $chk$;
  $t8$,
  'the workspace owner disables a plugin'
);

-- 9. A malformed plugin id violates the check constraint.
select throws_ok (
  $t9$
  insert into public.plugin_installations (workspace_id, plugin_id, installed_version)
  values ('a7001001-0000-4000-8000-000000000001'::uuid, 'Not A Plugin Id', '0.1.0');
  $t9$,
  '23514',
  null,
  'plugin_id must look like publisher.name'
);

select * from finish ();

rollback;
```

- [ ] **Step 2: Run it and watch it fail**

```bash
ava supabase status
pnpm test:db
```

Expected: `rls_plugin_installations.test.sql` FAILS with `relation "public.plugin_installations" does not exist`.

- [ ] **Step 3: Write the declarative schema**

`supabase/schemas/10.plugin_installations.sql`:

```sql
/**
 * One plugin installed in one workspace. The row exists only while the plugin
 * is installed. Uninstalling deletes it.
 */
create table public.plugin_installations (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Workspace the plugin is installed in.
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Plugin id in `publisher.name` form, e.g. `avandar.epidemiology`.
  plugin_id text not null constraint plugin_installations__plugin_id_format check (plugin_id ~ '^[a-z0-9-]+\.[a-z0-9-]+$'),
  -- Manifest version when the plugin was installed or last re-approved.
  installed_version text not null,
  -- A disabled plugin keeps its row but contributes nothing.
  is_enabled boolean not null default true,
  -- Manifest permissions an admin approved. A bundled manifest asking for
  -- more is hidden until an admin approves again.
  granted_permissions text[] not null default '{}',
  -- User who installed the plugin.
  installed_by uuid default auth.uid () references auth.users (id) on update cascade on delete set null,
  -- Timestamp of when the plugin was installed.
  created_at timestamptz not null default now(),
  -- Timestamp of the last change to this install.
  updated_at timestamptz not null default now(),
  constraint plugin_installations__workspace_plugin_unique unique (workspace_id, plugin_id)
);

alter table public.plugin_installations enable row level security;

-- Data API privileges. `anon` is intentionally omitted.
grant
select
,
  insert,
update,
delete on table public.plugin_installations to authenticated,
service_role;

/** Prevents an install from moving to another workspace. */
create or replace function public.plugin_installations__prevent_workspace_id_change () returns trigger language plpgsql
set
  search_path = '' as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'plugin installation workspace_id cannot be changed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Trigger-only. The trigger machinery does not consult EXECUTE.
revoke
execute on function public.plugin_installations__prevent_workspace_id_change ()
from
  public,
  anon,
  authenticated,
  service_role;

create trigger tr__plugin_installations__prevent_workspace_id_change before
update of workspace_id on public.plugin_installations for each row
execute function public.plugin_installations__prevent_workspace_id_change ();

create trigger tr__plugin_installations__set_updated_at before
update on public.plugin_installations for each row
execute function public.util__set_updated_at ();

-- Policies
create policy "Members can SELECT plugin installations" on public.plugin_installations for
select
  to authenticated using (
    public.plugin_installations.workspace_id = any (
      array(
        select
          public.util__get_auth_user_workspaces ()
      )
    )
  );

create policy "Settings admins can INSERT plugin installations" on public.plugin_installations for insert to authenticated
with
  check (
    public.util__can_manage_workspace_settings (public.plugin_installations.workspace_id)
  );

create policy "Settings admins can UPDATE plugin installations" on public.plugin_installations
for update
  to authenticated using (
    public.util__can_manage_workspace_settings (public.plugin_installations.workspace_id)
  )
with
  check (
    public.util__can_manage_workspace_settings (public.plugin_installations.workspace_id)
  );

create policy "Settings admins can DELETE plugin installations" on public.plugin_installations for delete to authenticated using (
  public.util__can_manage_workspace_settings (public.plugin_installations.workspace_id)
);
```

- [ ] **Step 4: Generate and review the migration**

```bash
ava supabase status
pnpm db:reset
pnpm db:new-migration add_plugin_installations
```

Expected: a new `supabase/migrations/<timestamp>_add_plugin_installations.sql` that creates the table, function, triggers, grants, and four policies. Open it and confirm it contains **no `drop` of any object this task did not create**. If it does, the database was not built from this branch's migrations alone: run `pnpm db:reset` again and regenerate before continuing.

- [ ] **Step 5: Apply, regenerate types, and run the test**

```bash
pnpm db:apply-migrations
pnpm db:gen-types
pnpm test:db
```

Expected: `rls_plugin_installations.test.sql` passes all 9 assertions. `exact_data_api_grants.test.sql` still passes, since the table uses the standard authenticated grants. `shared/types/database.types.ts` now contains `plugin_installations`.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/10.plugin_installations.sql supabase/migrations/*_add_plugin_installations.sql supabase/tests/database/permissions/rls_plugin_installations.test.sql shared/types/database.types.ts
git commit -m "feat(plugins): add plugin_installations with settings-admin RLS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The `PluginInstallation` model, client, and permission key

**Files:**
- Create: `shared/models/PluginInstallation/PluginInstallation.types.ts`
- Create: `shared/models/PluginInstallation/PluginInstallation.ts`
- Create: `shared/models/PluginInstallation/PluginInstallationParsers.ts`
- Test: `shared/models/PluginInstallation/PluginInstallationParsers.test.ts`
- Create: `src/clients/plugins/PluginInstallationClient/PluginInstallationClient.ts`
- Modify: `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`

- [ ] **Step 1: Write the types and namespace**

`PluginInstallation.types.ts`:

```ts
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

/** Identifies a plugin install. */
export type PluginInstallationId = UUID<"PluginInstallation">;

/** One plugin installed in one workspace. */
export type PluginInstallationRead = Model.Base<
  "PluginInstallation",
  {
    /** Timestamp of when the plugin was installed. */
    createdAt: string;

    /** Manifest permissions an admin approved. */
    grantedPermissions: string[];

    /** The install's unique identifier. */
    id: PluginInstallationId;

    /** User who installed the plugin, if that user still exists. */
    installedBy: User.Id | undefined;

    /** Manifest version when installed or last re-approved. */
    installedVersion: string;

    /** A disabled plugin contributes nothing. */
    isEnabled: boolean;

    /** Plugin id in `publisher.name` form. */
    pluginId: string;

    /** Timestamp of the last change to this install. */
    updatedAt: string;

    /** Workspace the plugin is installed in. */
    workspaceId: Workspace.Id;
  }
>;

type PluginInstallationCrudSpec = {
  tableName: "plugin_installations";
  modelName: "PluginInstallation";
  modelPrimaryKeyType: PluginInstallationId;
  modelTypes: {
    Read: PluginInstallationRead;
    Insert: SetOptional<
      PluginInstallationRead,
      "createdAt" | "id" | "installedBy" | "isEnabled" | "updatedAt"
    >;
    Update: Partial<PluginInstallationRead>;
  };
};

/** CRUD type definitions for the PluginInstallation model. */
export type PluginInstallationModel = SupabaseCrudModelSpec<
  PluginInstallationCrudSpec,
  { dbTablePrimaryKey: "id" }
>;
```

`PluginInstallation.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PluginInstallationId,
  PluginInstallationModel,
} from "$/models/PluginInstallation/PluginInstallation.types.ts";

/** Parsers for persisted plugin install rows. */
export { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers.ts";

/** Public namespace for the plugin install model. */
export namespace PluginInstallation {
  /** Selects a CRUD variant of the model. */
  export type T<K extends keyof PluginInstallationModel = "Read"> =
    PluginInstallationModel[K];

  /** Identifies a plugin install. */
  export type Id = PluginInstallationId;
}
```

- [ ] **Step 2: Write the failing parser test**

`PluginInstallationParsers.test.ts`:

```ts
import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DB_ROW = {
  created_at: "2026-11-06T10:00:00+00:00",
  granted_permissions: ["data:context"],
  id: "a700a001-0000-4000-8000-000000000001",
  installed_by: null,
  installed_version: "0.1.0",
  is_enabled: true,
  plugin_id: "avandar.epidemiology",
  updated_at: "2026-11-06T10:00:00+00:00",
  workspace_id: "a7001001-0000-4000-8000-000000000001",
};

describe("PluginInstallationParsers", () => {
  it("reads a database row into the model", () => {
    const model = PluginInstallationParsers.fromDBReadToModelRead(DB_ROW);
    expect(model.pluginId).toBe("avandar.epidemiology");
    expect(model.grantedPermissions).toEqual(["data:context"]);
    expect(model.installedBy).toBeUndefined();
    expect(model.isEnabled).toBe(true);
  });

  it("writes an insert in snake case without unset optional fields", () => {
    const insert = PluginInstallationParsers.fromModelInsertToDBInsert(
      Model.make("PluginInstallation", {
        grantedPermissions: ["data:context"],
        installedVersion: "0.1.0",
        pluginId: "avandar.epidemiology",
        workspaceId: DB_ROW.workspace_id as Workspace.Id,
      }) as PluginInstallation.T<"Insert">,
    );
    expect(insert).toMatchObject({
      granted_permissions: ["data:context"],
      installed_version: "0.1.0",
      plugin_id: "avandar.epidemiology",
      workspace_id: DB_ROW.workspace_id,
    });
    expect(insert).not.toHaveProperty("installed_by");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run shared/models/PluginInstallation`
Expected: FAIL, because `PluginInstallationParsers.ts` does not exist.

- [ ] **Step 4: Implement the parsers**

`PluginInstallationParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type {
  PluginInstallationId,
  PluginInstallationModel,
} from "$/models/PluginInstallation/PluginInstallation.types.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  granted_permissions: z.array(z.string()),
  id: z.uuid(),
  installed_by: z.uuid().nullable(),
  installed_version: z.string(),
  is_enabled: z.boolean(),
  plugin_id: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/** Parses `public.plugin_installations` rows. */
export const PluginInstallationParsers =
  makeParserRegistry<PluginInstallationModel>().build({
    modelName: "PluginInstallation",
    DBReadSchema,
    fromDBReadToModelRead: (databaseReadRow): PluginInstallationModel["Read"] => {
      const modelRow = nullsToUndefinedDeep(
        camelCaseKeysDeep(databaseReadRow),
      ) as PluginInstallationModel["Read"];
      return Model.make("PluginInstallation", {
        ...modelRow,
        id: modelRow.id as PluginInstallationId,
        installedBy: modelRow.installedBy as User.Id | undefined,
        workspaceId: modelRow.workspaceId as Workspace.Id,
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const nullableRow = undefinedsToNullsDeep(snakeCaseKeysDeep(model));
      return excludeNullsExceptInProps([])(
        nullableRow,
      ) as PluginInstallationModel["DBInsert"];
    },
    fromModelUpdateToDBUpdate: (model) => {
      const nullableRow = undefinedsToNullsDeep(snakeCaseKeysDeep(model));
      return excludeNullsExceptInProps([])(
        nullableRow,
      ) as PluginInstallationModel["DBUpdate"];
    },
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = PluginInstallationModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
```

- [ ] **Step 5: Implement the client and permission key**

`src/clients/plugins/PluginInstallationClient/PluginInstallationClient.ts`:

```ts
import { PluginInstallationParsers } from "$/models/PluginInstallation/PluginInstallationParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/** Reads and writes the plugins installed in a workspace. */
export const PluginInstallationClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "PluginInstallation",
    tableName: "plugin_installations",
    dbTablePrimaryKey: "id",
    parsers: PluginInstallationParsers,
  }),
  {
    mutationFns: ["insert", "update", "delete"],
  },
);
```

In `shared/models/Permissions/PermissionsModule/PermissionRegistry.ts`, add the last entry to `settings.admin`:

```ts
    admin: [
      "settings__can_manage_workspace_users",
      "settings__can_manage_roles_and_tags",
      "settings__can_manage_billing",
      "settings__can_manage_plugins",
    ] as const,
```

- [ ] **Step 6: Run the tests and type-check**

```bash
pnpm vitest run shared/models/PluginInstallation shared/models/Permissions
pnpm type-check
```

Expected: PASS and a clean type-check. If `createRdbCrudClient` rejects being called without a `mutations` option, pass `mutations: () => { return {}; }`.

- [ ] **Step 7: Commit**

```bash
git add shared/models/PluginInstallation src/clients/plugins shared/models/Permissions/PermissionsModule/PermissionRegistry.ts
git commit -m "feat(plugins): add the PluginInstallation model, client, and manage permission

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Module cache, install status, and active-plugin selection

**Files:**
- Create: `src/lib/plugins/pluginIndex.ts`
- Create: `src/lib/plugins/createPluginModuleCache.ts`
- Create: `src/lib/plugins/getPluginInstallStatus.ts`
- Create: `src/lib/plugins/selectActivePlugins.ts`
- Test: `src/lib/plugins/createPluginModuleCache.test.ts`
- Test: `src/lib/plugins/getPluginInstallStatus.test.ts`
- Test: `src/lib/plugins/selectActivePlugins.test.ts`

- [ ] **Step 1: Write the index accessor**

`pluginIndex.ts`:

```ts
import { PLUGIN_INDEX } from "virtual:ava-plugin-index";
import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

/** Every plugin this deployment bundles. */
export function getBundledPluginEntries(): readonly PluginIndexEntry[] {
  return PLUGIN_INDEX;
}

/** The bundled plugin with `pluginId`, if this deployment bundles it. */
export function getPluginIndexEntry(
  pluginId: string,
): PluginIndexEntry | undefined {
  return PLUGIN_INDEX.find((entry) => {
    return entry.id === pluginId;
  });
}
```

- [ ] **Step 2: Write the failing tests**

`createPluginModuleCache.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createPluginModuleCache } from "@/lib/plugins/createPluginModuleCache";
import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

function _entry(loadCode: PluginIndexEntry["loadCode"]): PluginIndexEntry {
  return {
    id: "avandar.test",
    loadManifest: vi.fn(),
    loadCode,
  };
}

describe("createPluginModuleCache", () => {
  it("loads a plugin's code once", async () => {
    const loadCode = vi.fn().mockResolvedValue({ definition: {}, messages: {} });
    const cache = createPluginModuleCache();
    const entry = _entry(loadCode);
    await cache.loadCode(entry);
    await cache.loadCode(entry);
    expect(loadCode).toHaveBeenCalledTimes(1);
  });

  it("forgets a failed load so the next call retries", async () => {
    const loadCode = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ definition: {}, messages: {} });
    const cache = createPluginModuleCache();
    const entry = _entry(loadCode);
    await expect(cache.loadCode(entry)).rejects.toThrow("offline");
    await expect(cache.loadCode(entry)).resolves.toEqual({ definition: {}, messages: {} });
    expect(loadCode).toHaveBeenCalledTimes(2);
  });
});
```

`getPluginInstallStatus.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPluginInstallStatus } from "@/lib/plugins/getPluginInstallStatus";

const GRANTED = { isEnabled: true, grantedPermissions: ["data:context"] };

describe("getPluginInstallStatus", () => {
  it.each([
    [undefined, ["data:context"], "not_installed"],
    [GRANTED, undefined, "unavailable"],
    [{ ...GRANTED, isEnabled: false }, ["data:context"], "disabled"],
    [GRANTED, ["data:context", "data:read"], "needs_review"],
    [GRANTED, ["data:context"], "installed"],
    [GRANTED, [], "installed"],
  ] as const)("maps %j with manifest permissions %j to %s", (installation, manifestPermissions, expected) => {
    expect(
      getPluginInstallStatus({
        installation,
        manifestPermissions,
      }),
    ).toBe(expected);
  });
});
```

`selectActivePlugins.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  selectActivePlugins,
  selectLoadableInstallations,
} from "@/lib/plugins/selectActivePlugins";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginIndexEntry, PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

const ENTRY = { id: "avandar.epidemiology" } as PluginIndexEntry;

function _installation(overrides: Partial<PluginInstallation.T>): PluginInstallation.T {
  return {
    pluginId: "avandar.epidemiology",
    isEnabled: true,
    grantedPermissions: ["data:context"],
    ...overrides,
  } as PluginInstallation.T;
}

function _manifestModule(permissions: string[]): PluginManifestModule {
  return {
    manifest: { id: "avandar.epidemiology", permissions },
  } as unknown as PluginManifestModule;
}

const getEntry = (pluginId: string) => {
  return pluginId === ENTRY.id ? ENTRY : undefined;
};

describe("selectLoadableInstallations", () => {
  it("keeps enabled installs of bundled plugins only", () => {
    const loadable = selectLoadableInstallations({
      installations: [
        _installation({}),
        _installation({ isEnabled: false }),
        _installation({ pluginId: "avandar.removed" }),
      ],
      getEntry,
    });
    expect(loadable).toHaveLength(1);
    expect(loadable[0]?.entry).toBe(ENTRY);
  });
});

describe("selectActivePlugins", () => {
  it("activates a plugin whose permissions are granted", () => {
    const loadable = selectLoadableInstallations({ installations: [_installation({})], getEntry });
    expect(
      selectActivePlugins({ loadable, manifestModules: [_manifestModule(["data:context"])] }),
    ).toHaveLength(1);
  });

  it("hides a plugin whose manifest asks for permissions not yet granted", () => {
    const loadable = selectLoadableInstallations({ installations: [_installation({})], getEntry });
    expect(
      selectActivePlugins({
        loadable,
        manifestModules: [_manifestModule(["data:context", "data:read"])],
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm vitest run src/lib/plugins`
Expected: FAIL, because the modules do not exist.

- [ ] **Step 4: Implement**

`createPluginModuleCache.ts`:

```ts
import type {
  PluginCodeModule,
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

function _loadOnce<T>(options: {
  cache: Map<string, Promise<T>>;
  key: string;
  load: () => Promise<T>;
}): Promise<T> {
  const { cache, key, load } = options;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const pending = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

/**
 * Loads each plugin's manifest and code chunks at most once per session. A
 * failed load is forgotten so the next attempt retries the network.
 */
export function createPluginModuleCache(): Readonly<{
  loadManifest: (entry: PluginIndexEntry) => Promise<PluginManifestModule>;
  loadCode: (entry: PluginIndexEntry) => Promise<PluginCodeModule>;
}> {
  const manifests = new Map<string, Promise<PluginManifestModule>>();
  const codeModules = new Map<string, Promise<PluginCodeModule>>();
  return {
    loadManifest: (entry) => {
      return _loadOnce({ cache: manifests, key: entry.id, load: entry.loadManifest });
    },
    loadCode: (entry) => {
      return _loadOnce({ cache: codeModules, key: entry.id, load: entry.loadCode });
    },
  };
}

/** The app-wide plugin module cache. */
export const PluginModuleCache = createPluginModuleCache();
```

`getPluginInstallStatus.ts`:

```ts
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/** Where a plugin stands in a workspace. */
export type PluginInstallStatus =
  | "not_installed"
  | "installed"
  | "disabled"
  | "needs_review"
  | "unavailable";

/**
 * Derives a plugin's status. `manifestPermissions` is undefined when this
 * deployment no longer bundles the plugin.
 */
export function getPluginInstallStatus(options: {
  installation:
    | Pick<PluginInstallation.T, "isEnabled" | "grantedPermissions">
    | undefined;
  manifestPermissions: readonly string[] | undefined;
}): PluginInstallStatus {
  const { installation, manifestPermissions } = options;
  if (installation === undefined) {
    return "not_installed";
  }
  if (manifestPermissions === undefined) {
    return "unavailable";
  }
  if (!installation.isEnabled) {
    return "disabled";
  }
  const hasUngranted = manifestPermissions.some((permission) => {
    return !installation.grantedPermissions.includes(permission);
  });
  return hasUngranted ? "needs_review" : "installed";
}
```

`selectActivePlugins.ts`:

```ts
import { getPluginInstallStatus } from "@/lib/plugins/getPluginInstallStatus";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

/** An enabled install of a bundled plugin, before its manifest loads. */
export type LoadablePluginInstallation = Readonly<{
  installation: PluginInstallation.T;
  entry: PluginIndexEntry;
}>;

/** An installed plugin whose contributions are live in this workspace. */
export type ActivePlugin = LoadablePluginInstallation &
  Readonly<{ manifestModule: PluginManifestModule }>;

/** Enabled installs of plugins this deployment bundles. */
export function selectLoadableInstallations(options: {
  installations: readonly PluginInstallation.T[];
  getEntry: (pluginId: string) => PluginIndexEntry | undefined;
}): LoadablePluginInstallation[] {
  return options.installations.flatMap((installation) => {
    const entry = options.getEntry(installation.pluginId);
    return installation.isEnabled && entry !== undefined
      ? [{ installation, entry }]
      : [];
  });
}

/**
 * Pairs loadable installs with their manifests and keeps those whose status
 * is `installed`. A plugin asking for permissions not yet granted stays
 * hidden until an admin approves them.
 */
export function selectActivePlugins(options: {
  loadable: readonly LoadablePluginInstallation[];
  manifestModules: readonly PluginManifestModule[];
}): ActivePlugin[] {
  return options.loadable.flatMap((loadablePlugin) => {
    const manifestModule = options.manifestModules.find((candidate) => {
      return candidate.manifest.id === loadablePlugin.entry.id;
    });
    if (manifestModule === undefined) {
      return [];
    }
    const status = getPluginInstallStatus({
      installation: loadablePlugin.installation,
      manifestPermissions: manifestModule.manifest.permissions,
    });
    return status === "installed" ? [{ ...loadablePlugin, manifestModule }] : [];
  });
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `pnpm vitest run src/lib/plugins`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/plugins/pluginIndex.ts src/lib/plugins/createPluginModuleCache.ts src/lib/plugins/createPluginModuleCache.test.ts src/lib/plugins/getPluginInstallStatus.ts src/lib/plugins/getPluginInstallStatus.test.ts src/lib/plugins/selectActivePlugins.ts src/lib/plugins/selectActivePlugins.test.ts
git commit -m "feat(plugins): cache plugin chunks and select active installs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Query handles and `fetchRows`

**Files:**
- Create: `src/lib/plugins/QueryHandleRegistry.ts`
- Create: `src/lib/plugins/fetchRowsForInvocation.ts`
- Test: `src/lib/plugins/fetchRowsForInvocation.test.ts`

In 1a, a handle points at the result rows Data Explorer already holds in memory. It does not re-run the query. That is exactly the result the user invoked the command on, and it avoids a second DuckDB run.

- [ ] **Step 1: Write the failing test**

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import {
  fetchRowsForInvocation,
  MAX_FETCH_ROWS_LIMIT,
} from "@/lib/plugins/fetchRowsForInvocation";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry";

const ROWS = [
  { x: 1, y: 3, label: "a" },
  { x: 2, y: 5, label: "b" },
  { x: 3, y: 7, label: "c" },
];

describe("fetchRowsForInvocation", () => {
  it("projects the requested columns", () => {
    const handle = QueryHandleRegistry.getOrCreate(ROWS);
    const result = fetchRowsForInvocation({
      invocationHandle: handle,
      queryHandle: handle,
      columns: ["x", "y"],
    });
    expect(result.rows).toEqual([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);
    expect(result.isTruncated).toBe(false);
  });

  it("applies the limit and reports truncation", () => {
    const handle = QueryHandleRegistry.getOrCreate(ROWS);
    const result = fetchRowsForInvocation({
      invocationHandle: handle,
      queryHandle: handle,
      columns: ["x"],
      limit: 2,
    });
    expect(result.rows).toHaveLength(2);
    expect(result.isTruncated).toBe(true);
  });

  it("caps the limit at the maximum", () => {
    const handle = QueryHandleRegistry.getOrCreate(ROWS);
    expect(() => {
      return fetchRowsForInvocation({
        invocationHandle: handle,
        queryHandle: handle,
        columns: ["x"],
        limit: MAX_FETCH_ROWS_LIMIT * 10,
      });
    }).not.toThrow();
  });

  it("returns the same handle for the same rows", () => {
    expect(QueryHandleRegistry.getOrCreate(ROWS)).toBe(
      QueryHandleRegistry.getOrCreate(ROWS),
    );
  });

  it("rejects a handle from another invocation", () => {
    const invocationHandle = QueryHandleRegistry.getOrCreate(ROWS);
    const otherHandle = QueryHandleRegistry.getOrCreate([{ x: 9 }]);
    try {
      fetchRowsForInvocation({ invocationHandle, queryHandle: otherHandle, columns: ["x"] });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginError);
      expect((error as PluginError).code).toBe("PermissionDenied");
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/plugins/fetchRowsForInvocation.test.ts`
Expected: FAIL, because the modules do not exist.

- [ ] **Step 3: Implement**

`QueryHandleRegistry.ts`:

```ts
import type { QueryHandle } from "@avandar/plugin-sdk";

type UnknownRow = Readonly<Record<string, unknown>>;

const MAX_LIVE_HANDLES = 10;
const handlesByRows = new WeakMap<readonly UnknownRow[], QueryHandle>();
const rowsByHandle = new Map<QueryHandle, readonly UnknownRow[]>();

/**
 * Maps opaque query handles to result rows already in memory. `getOrCreate`
 * is idempotent for the same rows array, so it is safe to call during
 * render. Only the most recent handles stay live.
 */
export const QueryHandleRegistry = {
  getOrCreate: (rows: readonly UnknownRow[]): QueryHandle => {
    const existing = handlesByRows.get(rows);
    if (existing !== undefined) {
      return existing;
    }
    const handle = crypto.randomUUID() as QueryHandle;
    handlesByRows.set(rows, handle);
    rowsByHandle.set(handle, rows);
    if (rowsByHandle.size > MAX_LIVE_HANDLES) {
      const oldestHandle = rowsByHandle.keys().next().value;
      if (oldestHandle !== undefined) {
        rowsByHandle.delete(oldestHandle);
      }
    }
    return handle;
  },

  getRows: (handle: QueryHandle): readonly UnknownRow[] | undefined => {
    return rowsByHandle.get(handle);
  },
};
```

`fetchRowsForInvocation.ts`:

```ts
import { PluginError } from "@avandar/plugin-sdk";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry";
import type { FetchRowsResult, QueryHandle } from "@avandar/plugin-sdk";

/** Rows returned when a plugin does not pass a limit. */
export const DEFAULT_FETCH_ROWS_LIMIT = 50_000;

/** The most rows one `fetchRows` call returns. */
export const MAX_FETCH_ROWS_LIMIT = 200_000;

/**
 * Implements `avandar.data.fetchRows` under `data:context`: only the handle
 * of the current invocation is readable, and only the requested columns are
 * returned.
 */
export function fetchRowsForInvocation(options: {
  invocationHandle: QueryHandle;
  queryHandle: QueryHandle;
  columns: readonly string[];
  limit?: number;
}): FetchRowsResult {
  const { invocationHandle, queryHandle, columns } = options;
  if (queryHandle !== invocationHandle) {
    throw new PluginError(
      "PermissionDenied",
      "fetchRows only accepts the query handle of the current invocation.",
    );
  }
  const rows = QueryHandleRegistry.getRows(queryHandle);
  if (rows === undefined) {
    throw new PluginError(
      "InvalidHandle",
      "This query result is no longer available. Run the command again.",
    );
  }
  const requestedLimit = Math.floor(options.limit ?? DEFAULT_FETCH_ROWS_LIMIT);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_FETCH_ROWS_LIMIT);
  const projectedRows = rows.slice(0, limit).map((row) => {
    return Object.fromEntries(
      columns.map((column) => {
        return [column, row[column]];
      }),
    );
  });
  return { rows: projectedRows, isTruncated: rows.length > limit };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/plugins/fetchRowsForInvocation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plugins/QueryHandleRegistry.ts src/lib/plugins/fetchRowsForInvocation.ts src/lib/plugins/fetchRowsForInvocation.test.ts
git commit -m "feat(plugins): scope fetchRows to the invocation's query handle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: The API factory, drawer host, and command runner

**Files:**
- Create: `src/lib/plugins/PluginDrawerHost/PluginDrawerStore.ts`
- Create: `src/lib/plugins/PluginDrawerHost/PluginDrawerHost.tsx`
- Create: `src/lib/plugins/PluginErrorBoundary/PluginErrorBoundary.tsx`
- Create: `src/lib/plugins/createPluginApi.tsx`
- Create: `src/lib/plugins/runPluginCommand.ts`
- Test: `src/lib/plugins/runPluginCommand.test.ts`

- [ ] **Step 1: Write the drawer store and host**

`PluginDrawerStore.ts`:

```ts
import type { ReactNode } from "react";

type PluginDrawerState = Readonly<{ title: string; content: ReactNode }> | undefined;

let drawerState: PluginDrawerState;
const listeners = new Set<() => void>();

function _emit(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/** The one drawer plugin UI can open. Read with `useSyncExternalStore`. */
export const PluginDrawerStore = {
  open: (nextState: NonNullable<PluginDrawerState>): void => {
    drawerState = nextState;
    _emit();
  },
  close: (): void => {
    drawerState = undefined;
    _emit();
  },
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: (): PluginDrawerState => {
    return drawerState;
  },
};
```

`PluginDrawerHost.tsx`:

```tsx
import { Drawer } from "@mantine/core";
import { useSyncExternalStore } from "react";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";

/** Renders the drawer plugins open with `avandar.ui.openDrawer`. */
export function PluginDrawerHost(): JSX.Element {
  const drawer = useSyncExternalStore(
    PluginDrawerStore.subscribe,
    PluginDrawerStore.getSnapshot,
  );
  return (
    <Drawer
      opened={drawer !== undefined}
      onClose={PluginDrawerStore.close}
      title={drawer?.title}
      position="right"
      size="lg"
    >
      {drawer?.content}
    </Drawer>
  );
}
```

`PluginErrorBoundary.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Alert } from "@mantine/core";
import { Component } from "react";
import { Logger } from "@/utils/Logger";
import type { ReactNode } from "react";

type Props = Readonly<{ pluginName: string; children: ReactNode }>;
type State = Readonly<{ hasError: boolean }>;

/**
 * Contains a crash inside plugin UI to the modal or drawer that renders it,
 * so the rest of the app keeps working.
 */
export class PluginErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    Logger.error("Plugin UI crashed", { pluginName: this.props.pluginName, error });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      const { pluginName } = this.props;
      return (
        <Alert color="red" title={pluginName}>
          <Trans>Something went wrong in this plugin. Close this panel and try again.</Trans>
        </Alert>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Write the API factory**

`createPluginApi.tsx`:

```tsx
import { AvandarProvider, createPluginTranslator } from "@avandar/plugin-sdk";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { fetchRowsForInvocation } from "@/lib/plugins/fetchRowsForInvocation";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import { PluginErrorBoundary } from "@/lib/plugins/PluginErrorBoundary/PluginErrorBoundary";
import type {
  AvandarApi,
  PluginInvocationContext,
  PluginMessages,
} from "@avandar/plugin-sdk";
import type { ReactNode } from "react";

/**
 * Builds the `avandar` object one command invocation receives: scoped to
 * the plugin, workspace, user, and the result it was invoked on.
 */
export function createPluginApi(options: {
  pluginName: string;
  context: PluginInvocationContext;
  workspace: AvandarApi["workspace"];
  messages: PluginMessages;
}): AvandarApi {
  const { pluginName, context, workspace, messages } = options;
  const wrapContent = (content: ReactNode): ReactNode => {
    return (
      <PluginErrorBoundary pluginName={pluginName}>
        <AvandarProvider api={api}>{content}</AvandarProvider>
      </PluginErrorBoundary>
    );
  };
  const api: AvandarApi = {
    context,
    workspace,
    data: {
      fetchRows: async (queryHandle, fetchOptions) => {
        return fetchRowsForInvocation({
          invocationHandle: context.queryHandle,
          queryHandle,
          columns: fetchOptions.columns,
          limit: fetchOptions.limit,
        });
      },
    },
    ui: {
      openModal: ({ title, content }) => {
        modals.open({ title, size: "lg", children: wrapContent(content) });
      },
      openDrawer: ({ title, content }) => {
        PluginDrawerStore.open({ title, content: wrapContent(content) });
      },
      notify: ({ title, message, color }) => {
        notifications.show({ title: title ?? pluginName, message, color: color ?? "blue" });
      },
    },
    i18n: { t: createPluginTranslator({ locale: workspace.locale, messages }) },
  };
  return api;
}
```

- [ ] **Step 3: Write the failing runner test**

`runPluginCommand.test.ts`:

```ts
import { definePlugin } from "@avandar/plugin-sdk";
import { describe, expect, it, vi } from "vitest";
import { runPluginCommand } from "@/lib/plugins/runPluginCommand";
import type { ActivePlugin } from "@/lib/plugins/selectActivePlugins";
import type { DataExplorerToolbarContext, QueryHandle } from "@avandar/plugin-sdk";

const PLUGIN = { entry: { id: "avandar.test" } } as ActivePlugin;
const CONTEXT: DataExplorerToolbarContext = {
  slotId: "dataExplorer.toolbar",
  queryHandle: "handle" as QueryHandle,
  columns: [],
  rowCount: 0,
};
const WORKSPACE = { id: "w", slug: "w", locale: "en" };

function _run(loadCode: () => Promise<unknown>, commandId = "hello") {
  return runPluginCommand({
    plugin: PLUGIN,
    pluginName: "Test",
    commandId,
    context: CONTEXT,
    workspace: WORKSPACE,
    loadCode: loadCode as never,
  });
}

describe("runPluginCommand", () => {
  it("runs the handler with a scoped API and reports no failure", async () => {
    const handler = vi.fn();
    const failure = await _run(async () => {
      return { definition: definePlugin({ commands: { hello: handler } }), messages: { en: {} } };
    });
    expect(failure).toBeUndefined();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ context: CONTEXT }));
  });

  it("reports a load failure", async () => {
    const failure = await _run(async () => {
      throw new Error("offline");
    });
    expect(failure?.kind).toBe("load_failed");
  });

  it("reports a missing handler", async () => {
    const failure = await _run(async () => {
      return { definition: definePlugin({ commands: {} }), messages: { en: {} } };
    });
    expect(failure?.kind).toBe("missing_handler");
  });

  it("reports a handler that throws", async () => {
    const failure = await _run(async () => {
      return {
        definition: definePlugin({
          commands: {
            hello: () => {
              throw new Error("boom");
            },
          },
        }),
        messages: { en: {} },
      };
    });
    expect(failure?.kind).toBe("command_failed");
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `pnpm vitest run src/lib/plugins/runPluginCommand.test.ts`
Expected: FAIL, because `runPluginCommand.ts` does not exist.

- [ ] **Step 5: Implement the runner**

`runPluginCommand.ts`:

```ts
import { isPluginDefinition } from "@avandar/plugin-sdk";
import { createPluginApi } from "@/lib/plugins/createPluginApi";
import type { PluginCodeModule, PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";
import type { ActivePlugin } from "@/lib/plugins/selectActivePlugins";
import type { AvandarApi, PluginInvocationContext } from "@avandar/plugin-sdk";

/** Why a plugin command did not complete. */
export type PluginCommandFailure = Readonly<{
  kind: "load_failed" | "missing_handler" | "command_failed";
  error?: unknown;
}>;

/**
 * Loads a plugin's code if needed, then runs one command with a freshly
 * scoped API. Returns undefined on success. Never throws, so the caller
 * decides how to report a failure.
 */
export async function runPluginCommand(options: {
  plugin: ActivePlugin;
  pluginName: string;
  commandId: string;
  context: PluginInvocationContext;
  workspace: AvandarApi["workspace"];
  loadCode: (entry: PluginIndexEntry) => Promise<PluginCodeModule>;
}): Promise<PluginCommandFailure | undefined> {
  const { plugin, pluginName, commandId, context, workspace } = options;
  let codeModule: PluginCodeModule;
  try {
    codeModule = await options.loadCode(plugin.entry);
  } catch (error) {
    return { kind: "load_failed", error };
  }
  const definition = codeModule.definition;
  const handler = isPluginDefinition(definition)
    ? definition.commands[commandId]
    : undefined;
  if (handler === undefined) {
    return { kind: "missing_handler" };
  }
  const api = createPluginApi({
    pluginName,
    context,
    workspace,
    messages: codeModule.messages,
  });
  try {
    await handler(api);
    return undefined;
  } catch (error) {
    return { kind: "command_failed", error };
  }
}
```

- [ ] **Step 6: Run it and watch it pass**

Run: `pnpm vitest run src/lib/plugins/runPluginCommand.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/plugins/PluginDrawerHost src/lib/plugins/PluginErrorBoundary src/lib/plugins/createPluginApi.tsx src/lib/plugins/runPluginCommand.ts src/lib/plugins/runPluginCommand.test.ts
git commit -m "feat(plugins): build the scoped avandar API and run plugin commands

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: `PluginHost`, menu items, and `PluginMenuSlot`

**Files:**
- Create: `src/lib/plugins/selectPluginMenuItems.ts`
- Test: `src/lib/plugins/selectPluginMenuItems.test.ts`
- Create: `src/lib/plugins/PluginHost/PluginHost.tsx`
- Create: `src/lib/plugins/PluginMenuSlot/usePluginCommandRunner.ts`
- Create: `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.tsx`
- Test: `src/lib/plugins/PluginMenuSlot/PluginMenuSlot.test.tsx`

- [ ] **Step 1: Write the failing menu-item test**

`selectPluginMenuItems.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { selectPluginMenuItems } from "@/lib/plugins/selectPluginMenuItems";
import type { ActivePlugin } from "@/lib/plugins/selectActivePlugins";

const ICON = () => {
  return null;
};

function _plugin(when?: unknown): ActivePlugin {
  return {
    entry: { id: "avandar.epidemiology" },
    manifestModule: {
      manifest: {
        id: "avandar.epidemiology",
        name: "%plugin.name%",
        contributes: {
          commands: [{ id: "regression.linear", title: "%t%", icon: "trending-up" }],
          menus: { "dataExplorer.toolbar": [{ command: "regression.linear", when }] },
        },
      },
      strings: { en: { "plugin.name": "Epidemiology", t: "Linear regression" } },
      icons: { "trending-up": ICON },
    },
  } as unknown as ActivePlugin;
}

describe("selectPluginMenuItems", () => {
  it("returns items whose when condition holds, with resolved titles", () => {
    const items = selectPluginMenuItems({
      activePlugins: [_plugin({ numericColumnCount: { gte: 2 } })],
      slotId: "dataExplorer.toolbar",
      facts: { numericColumnCount: 2 },
      locale: "en",
    });
    expect(items).toEqual([
      expect.objectContaining({
        key: "avandar.epidemiology/regression.linear",
        commandId: "regression.linear",
        title: "Linear regression",
        pluginName: "Epidemiology",
        Icon: ICON,
      }),
    ]);
  });

  it("omits items whose when condition fails", () => {
    expect(
      selectPluginMenuItems({
        activePlugins: [_plugin({ numericColumnCount: { gte: 2 } })],
        slotId: "dataExplorer.toolbar",
        facts: { numericColumnCount: 1 },
        locale: "en",
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/plugins/selectPluginMenuItems.test.ts`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement `selectPluginMenuItems` and `PluginHost`**

`selectPluginMenuItems.ts`:

```ts
import {
  evaluateWhenCondition,
  resolveManifestString,
} from "@avandar/plugin-manifest/runtime";
import type { PluginIconComponent } from "@/lib/plugins/PluginIndex.types";
import type { ActivePlugin } from "@/lib/plugins/selectActivePlugins";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";

/** A plugin command to render in a slot. */
export type PluginMenuItem = Readonly<{
  key: string;
  plugin: ActivePlugin;
  pluginName: string;
  commandId: string;
  title: string;
  Icon: PluginIconComponent | undefined;
}>;

/** The commands active plugins place in `slotId` whose `when` holds. */
export function selectPluginMenuItems(options: {
  activePlugins: readonly ActivePlugin[];
  slotId: SlotId;
  facts: WhenFacts;
  locale: string;
}): PluginMenuItem[] {
  const { activePlugins, slotId, facts, locale } = options;
  return activePlugins.flatMap((plugin) => {
    const { manifest, strings, icons } = plugin.manifestModule;
    const pluginName = resolveManifestString({ strings, locale, value: manifest.name });
    return (manifest.contributes.menus[slotId] ?? []).flatMap((menuEntry) => {
      const command = manifest.contributes.commands.find((candidate) => {
        return candidate.id === menuEntry.command;
      });
      if (command === undefined || !evaluateWhenCondition(menuEntry.when, facts)) {
        return [];
      }
      return [
        {
          key: `${manifest.id}/${command.id}`,
          plugin,
          pluginName,
          commandId: command.id,
          title: resolveManifestString({ strings, locale, value: command.title }),
          Icon: icons[command.icon],
        },
      ];
    });
  });
}
```

`PluginHost/PluginHost.tsx`:

```tsx
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PluginModuleCache } from "@/lib/plugins/createPluginModuleCache";
import { PluginDrawerHost } from "@/lib/plugins/PluginDrawerHost/PluginDrawerHost";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndex";
import {
  selectActivePlugins,
  selectLoadableInstallations,
} from "@/lib/plugins/selectActivePlugins";
import { selectPluginMenuItems } from "@/lib/plugins/selectPluginMenuItems";
import type { ActivePlugin } from "@/lib/plugins/selectActivePlugins";
import type { PluginMenuItem } from "@/lib/plugins/selectPluginMenuItems";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

const ActivePluginsContext = createContext<readonly ActivePlugin[]>([]);

/**
 * Loads the manifests of this workspace's enabled plugins and provides them to
 * slots. Workspaces with no installs load nothing.
 */
export function PluginHost(props: { children: ReactNode }): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [installations = []] = PluginInstallationClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const loadable = useMemo(() => {
    return selectLoadableInstallations({ installations, getEntry: getPluginIndexEntry });
  }, [installations]);
  const manifestsQuery = useQuery({
    queryKey: [
      "plugins",
      "manifests",
      ...loadable.map((item) => {
        return item.entry.id;
      }),
    ],
    queryFn: () => {
      return Promise.all(
        loadable.map((item) => {
          return PluginModuleCache.loadManifest(item.entry);
        }),
      );
    },
    enabled: loadable.length > 0,
    staleTime: Infinity,
  });
  const activePlugins = useMemo(() => {
    return selectActivePlugins({ loadable, manifestModules: manifestsQuery.data ?? [] });
  }, [loadable, manifestsQuery.data]);
  return (
    <ActivePluginsContext.Provider value={activePlugins}>
      {props.children}
      <PluginDrawerHost />
    </ActivePluginsContext.Provider>
  );
}

/** The commands active plugins place in `slotId` whose `when` holds. */
export function usePluginMenuItems(options: {
  slotId: SlotId;
  facts: WhenFacts;
}): PluginMenuItem[] {
  const activePlugins = useContext(ActivePluginsContext);
  const { i18n } = useLingui();
  return selectPluginMenuItems({ activePlugins, locale: i18n.locale, ...options });
}
```

- [ ] **Step 4: Write the failing slot test**

`PluginMenuSlot.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { PluginMenuSlot } from "@/lib/plugins/PluginMenuSlot/PluginMenuSlot";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { PluginMenuItem } from "@/lib/plugins/selectPluginMenuItems";
import type { DataExplorerToolbarContext, QueryHandle } from "@avandar/plugin-sdk";

const runPluginCommand = vi.fn();
let menuItems: PluginMenuItem[] = [];

vi.mock("@/lib/plugins/PluginHost/PluginHost", () => {
  return {
    usePluginMenuItems: () => {
      return menuItems;
    },
  };
});
vi.mock("@/lib/plugins/runPluginCommand", () => {
  return { runPluginCommand: (...args: unknown[]) => runPluginCommand(...args) };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "w", slug: "w" };
    },
  };
});
const notifyError = vi.fn();
vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: (...args: unknown[]) => notifyError(...args) };
});

const CONTEXT: DataExplorerToolbarContext = {
  slotId: "dataExplorer.toolbar",
  queryHandle: "h" as QueryHandle,
  columns: [],
  rowCount: 1,
};

function _item(index: number): PluginMenuItem {
  return {
    key: `p/c${index}`,
    plugin: {} as PluginMenuItem["plugin"],
    pluginName: "Epidemiology",
    commandId: `c${index}`,
    title: `Command ${index}`,
    Icon: undefined,
  };
}

describe("PluginMenuSlot", () => {
  it("renders nothing without items", () => {
    menuItems = [];
    const { container } = render(
      <PluginMenuSlot slotId="dataExplorer.toolbar" context={CONTEXT} facts={{}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders up to two items as buttons and runs one on click", async () => {
    menuItems = [_item(1), _item(2)];
    runPluginCommand.mockResolvedValue(undefined);
    render(<PluginMenuSlot slotId="dataExplorer.toolbar" context={CONTEXT} facts={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));
    await waitFor(() => {
      expect(runPluginCommand).toHaveBeenCalledWith(
        expect.objectContaining({ commandId: "c1", context: CONTEXT }),
      );
    });
  });

  it("collapses more than two items into one menu button", () => {
    menuItems = [_item(1), _item(2), _item(3)];
    render(<PluginMenuSlot slotId="dataExplorer.toolbar" context={CONTEXT} facts={{}} />);
    expect(screen.getByRole("button", { name: "Plugins" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Command 1" })).toBeNull();
  });

  it("disables buttons when there is no result to run on", () => {
    menuItems = [_item(1)];
    render(<PluginMenuSlot slotId="dataExplorer.toolbar" context={undefined} facts={{}} />);
    expect(screen.getByRole("button", { name: "Command 1" })).toBeDisabled();
  });

  it("shows a loading state while the command's chunk loads", () => {
    menuItems = [_item(1)];
    runPluginCommand.mockReturnValue(new Promise(() => {}));
    render(<PluginMenuSlot slotId="dataExplorer.toolbar" context={CONTEXT} facts={{}} />);
    const button = screen.getByRole("button", { name: "Command 1" });
    fireEvent.click(button);
    expect(button).toHaveAttribute("data-loading");
  });

  it("reports a failed command in a notification", async () => {
    menuItems = [_item(1)];
    runPluginCommand.mockResolvedValue({ kind: "command_failed", error: new Error("boom") });
    render(<PluginMenuSlot slotId="dataExplorer.toolbar" context={CONTEXT} facts={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Command 1" }));
    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Epidemiology: the command failed" }),
      );
    });
  });
});
```

- [ ] **Step 5: Run it and watch it fail**

Run: `pnpm vitest run src/lib/plugins/PluginMenuSlot`
Expected: FAIL, because `PluginMenuSlot.tsx` does not exist.

- [ ] **Step 6: Implement the runner hook and slot**

`usePluginCommandRunner.ts`:

```ts
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PluginModuleCache } from "@/lib/plugins/createPluginModuleCache";
import { runPluginCommand } from "@/lib/plugins/runPluginCommand";
import { Logger } from "@/utils/Logger";
import { notifyError } from "@/utils/notifications/notify";
import type { PluginMenuItem } from "@/lib/plugins/selectPluginMenuItems";
import type { PluginInvocationContext } from "@avandar/plugin-sdk";

/**
 * Runs plugin commands from a slot and reports failures. `runningKey` is the
 * key of the item whose handler has not settled yet.
 */
export function usePluginCommandRunner(context: PluginInvocationContext | undefined): Readonly<{
  runningKey: string | undefined;
  run: (item: PluginMenuItem) => Promise<void>;
}> {
  const { t, i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  const [runningKey, setRunningKey] = useState<string>();
  const run = async (item: PluginMenuItem): Promise<void> => {
    if (context === undefined) {
      return;
    }
    setRunningKey(item.key);
    const failure = await runPluginCommand({
      plugin: item.plugin,
      pluginName: item.pluginName,
      commandId: item.commandId,
      context,
      workspace: { id: workspace.id, slug: workspace.slug, locale: i18n.locale },
      loadCode: PluginModuleCache.loadCode,
    });
    setRunningKey(undefined);
    if (failure === undefined) {
      return;
    }
    Logger.error("Plugin command failed", { key: item.key, kind: failure.kind, error: failure.error });
    const pluginName = item.pluginName;
    notifyError({
      title: matchLiteral(failure.kind, {
        load_failed: t`Could not load ${pluginName}`,
        missing_handler: t`${pluginName}: this command is not available`,
        command_failed: t`${pluginName}: the command failed`,
      }),
      message: matchLiteral(failure.kind, {
        load_failed: t`Check your connection and click the button again to retry.`,
        missing_handler: t`The plugin may be out of date. Ask an admin to check Settings → Plugins.`,
        command_failed: t`Try again. If it keeps failing, contact the plugin's publisher.`,
      }),
    });
  };
  return { runningKey, run };
}
```

`PluginMenuSlot.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Menu } from "@mantine/core";
import { IconPuzzle } from "@tabler/icons-react";
import { usePluginMenuItems } from "@/lib/plugins/PluginHost/PluginHost";
import { usePluginCommandRunner } from "@/lib/plugins/PluginMenuSlot/usePluginCommandRunner";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";
import type { PluginInvocationContext } from "@avandar/plugin-sdk";

const MAX_INLINE_ITEMS = 2;

type Props = Readonly<{
  slotId: SlotId;
  context: PluginInvocationContext | undefined;
  facts: WhenFacts;
}>;

/**
 * Renders the commands installed plugins place in `slotId`. Up to two show as
 * buttons, and more collapse into one "Plugins" menu.
 */
export function PluginMenuSlot({ slotId, context, facts }: Props): JSX.Element | null {
  const { t } = useLingui();
  const items = usePluginMenuItems({ slotId, facts });
  const { runningKey, run } = usePluginCommandRunner(context);
  const isDisabled = context === undefined || runningKey !== undefined;
  if (items.length === 0) {
    return null;
  }
  if (items.length <= MAX_INLINE_ITEMS) {
    return (
      <>
        {items.map((item) => {
          const { Icon } = item;
          return (
            <Button
              key={item.key}
              variant="outline"
              color="neutral"
              size="compact-sm"
              leftSection={Icon ? <Icon size={16} aria-hidden /> : undefined}
              loading={runningKey === item.key}
              disabled={isDisabled}
              onClick={() => {
                void run(item);
              }}
            >
              {item.title}
            </Button>
          );
        })}
      </>
    );
  }
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <Button
          variant="outline"
          color="neutral"
          size="compact-sm"
          leftSection={<IconPuzzle size={16} aria-hidden />}
          loading={runningKey !== undefined}
        >
          {t`Plugins`}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item) => {
          const { Icon } = item;
          return (
            <Menu.Item
              key={item.key}
              leftSection={Icon ? <Icon size={16} aria-hidden /> : undefined}
              disabled={isDisabled}
              onClick={() => {
                void run(item);
              }}
            >
              {item.title}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/plugins`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/plugins/selectPluginMenuItems.ts src/lib/plugins/selectPluginMenuItems.test.ts src/lib/plugins/PluginHost src/lib/plugins/PluginMenuSlot
git commit -m "feat(plugins): add PluginHost and the plugin menu slot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Mount the host and the Data Explorer slot

**Files:**
- Create: `src/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext.ts`
- Test: `src/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext.test.ts`
- Modify: `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx`
- Modify: `src/views/DataExplorerApp/DataExplorerApp.tsx`

- [ ] **Step 1: Write the failing facts test**

```ts
import { describe, expect, it } from "vitest";
import { makeDataExplorerToolbarFacts } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";

describe("makeDataExplorerToolbarFacts", () => {
  it("counts numeric and date columns", () => {
    expect(
      makeDataExplorerToolbarFacts({
        hasResult: true,
        rowCount: 20,
        columns: [
          { name: "x", dataType: "bigint" },
          { name: "y", dataType: "double" },
          { name: "onset", dataType: "date" },
          { name: "district", dataType: "varchar" },
        ],
      }),
    ).toEqual({
      hasResult: true,
      rowCount: 20,
      columnCount: 4,
      numericColumnCount: 2,
      dateColumnCount: 1,
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/views/DataExplorerApp/useDataExplorerPluginContext`
Expected: FAIL, because the module does not exist.

- [ ] **Step 3: Implement the hook**

`useDataExplorerPluginContext.ts`:

```ts
import { useMemo } from "react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { QueryHandleRegistry } from "@/lib/plugins/QueryHandleRegistry";
import type { WhenFacts } from "@avandar/plugin-manifest/runtime";
import type { DataExplorerToolbarContext } from "@avandar/plugin-sdk";

type ResultColumn = Readonly<{ name: string; dataType: AvaDataType.T }>;

type ExplorerResult = Readonly<{
  columns: readonly ResultColumn[];
  data: ReadonlyArray<Readonly<Record<string, unknown>>>;
}>;

/** The `when` facts of the `dataExplorer.toolbar` slot. */
export function makeDataExplorerToolbarFacts(options: {
  hasResult: boolean;
  rowCount: number;
  columns: readonly ResultColumn[];
}): WhenFacts {
  const { hasResult, rowCount, columns } = options;
  return {
    hasResult,
    rowCount,
    columnCount: columns.length,
    numericColumnCount: columns.filter((column) => {
      return AvaDataType.isNumeric(column.dataType);
    }).length,
    dateColumnCount: columns.filter((column) => {
      return AvaDataType.isDateOrTimestamp(column.dataType);
    }).length,
  };
}

/**
 * The invocation context and `when` facts for plugin commands in the Data
 * Explorer toolbar. The context is undefined while there is no settled
 * result to run on.
 */
export function useDataExplorerPluginContext(options: {
  queryResults: ExplorerResult | undefined;
  isLoadingResults: boolean;
}): Readonly<{ context: DataExplorerToolbarContext | undefined; facts: WhenFacts }> {
  const { queryResults, isLoadingResults } = options;
  return useMemo(() => {
    if (isLoadingResults || queryResults === undefined) {
      return {
        context: undefined,
        facts: makeDataExplorerToolbarFacts({ hasResult: false, rowCount: 0, columns: [] }),
      };
    }
    const { columns, data } = queryResults;
    return {
      context: {
        slotId: "dataExplorer.toolbar",
        queryHandle: QueryHandleRegistry.getOrCreate(data),
        columns: columns.map((column) => {
          return { name: column.name, dataType: column.dataType };
        }),
        rowCount: data.length,
      },
      facts: makeDataExplorerToolbarFacts({ hasResult: true, rowCount: data.length, columns }),
    };
  }, [queryResults, isLoadingResults]);
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/views/DataExplorerApp/useDataExplorerPluginContext`
Expected: PASS.

- [ ] **Step 5: Mount `PluginHost`**

In `src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx`, import it:

```tsx
import { PluginHost } from "@/lib/plugins/PluginHost/PluginHost";
```

Wrap the contents of `ModalsProvider` with it, since `modals.open` needs the provider above:

```tsx
    <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
      <PluginHost>
        <DataExplorerStateManager.Provider>
          {/* everything that was already here, unchanged */}
        </DataExplorerStateManager.Provider>
      </PluginHost>
    </ModalsProvider>
```

- [ ] **Step 6: Render the slot in Data Explorer**

In `src/views/DataExplorerApp/DataExplorerApp.tsx`, add the imports:

```tsx
import { PluginMenuSlot } from "@/lib/plugins/PluginMenuSlot/PluginMenuSlot";
import { useDataExplorerPluginContext } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";
```

After the line `const queryResultData = queryResults?.data ?? [];`, add:

```tsx
  const pluginContext = useDataExplorerPluginContext({
    queryResults,
    isLoadingResults,
  });
```

In the toolbar `<Group>`, make the slot the first child, before the Reset `<Button>`:

```tsx
          <PluginMenuSlot
            slotId="dataExplorer.toolbar"
            context={pluginContext.context}
            facts={pluginContext.facts}
          />
```

- [ ] **Step 7: Verify nothing regressed**

```bash
pnpm vitest run src/views/DataExplorerApp src/components/layouts
pnpm type-check
```

Expected: PASS. If a layout test now fails because `PluginHost` queries Supabase, mock `@/lib/plugins/PluginHost/PluginHost` in that test so `PluginHost` renders only its `children`, `usePluginMenuItems` returns `[]`, and the test stays focused on what it covered before.

- [ ] **Step 8: Commit**

```bash
git add src/views/DataExplorerApp/useDataExplorerPluginContext src/components/layouts/RootLayout/WorkspaceLayoutContents.tsx src/views/DataExplorerApp/DataExplorerApp.tsx
git commit -m "feat(plugins): mount the plugin host and the Data Explorer toolbar slot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Settings → Plugins

**Files:**
- Create: `src/lib/plugins/countPluginContributions.ts`
- Test: `src/lib/plugins/countPluginContributions.test.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginSettingsCard.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions.ts`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginStatusBadge.tsx`
- Create: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails.tsx`
- Test: `src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions.test.tsx`
- Modify: `src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx`

- [ ] **Step 1: Write the failing contribution-count test**

`countPluginContributions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { countPluginContributions } from "@/lib/plugins/countPluginContributions";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

describe("countPluginContributions", () => {
  it("counts Data Explorer toolbar items", () => {
    const manifest = {
      contributes: {
        commands: [],
        menus: { "dataExplorer.toolbar": [{ command: "a" }, { command: "b" }] },
      },
    } as unknown as PluginManifest;
    expect(countPluginContributions(manifest)).toEqual({ dataExplorerToolbarItems: 2 });
  });
});
```

- [ ] **Step 2: Run it, watch it fail, then implement**

Run: `pnpm vitest run src/lib/plugins/countPluginContributions.test.ts`. It fails because the module is missing. Then write `countPluginContributions.ts`:

```ts
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/** How much a plugin adds, as counts the settings page translates. */
export type PluginContributionCounts = Readonly<{ dataExplorerToolbarItems: number }>;

/** Counts a manifest's contributions for the settings summary. */
export function countPluginContributions(
  manifest: PluginManifest,
): PluginContributionCounts {
  return {
    dataExplorerToolbarItems:
      manifest.contributes.menus["dataExplorer.toolbar"]?.length ?? 0,
  };
}
```

Run it again. Expected: PASS.

- [ ] **Step 3: Write the actions hook**

`usePluginInstallationActions.ts`:

```ts
import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/** Install, enable, disable, approve, and uninstall for one plugin. */
export function usePluginInstallationActions(options: {
  pluginName: string;
  manifest: PluginManifest | undefined;
  installation: PluginInstallation.T | undefined;
}) {
  const { pluginName, manifest, installation } = options;
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const queriesToInvalidate = [PluginInstallationClient.QueryKeys.getAll()];
  const onError = (error: Error) => {
    notifyError({ title: t`Could not update ${pluginName}`, message: error.message });
  };
  const [insertInstallation, isInserting] = PluginInstallationClient.useInsert({
    queryToInvalidate: PluginInstallationClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess(t`${pluginName} installed`);
    },
    onError,
  });
  const [updateInstallation, isUpdating] = PluginInstallationClient.useUpdate({
    queriesToInvalidate,
    onError,
  });
  const [deleteInstallation, isDeleting] = PluginInstallationClient.useDelete({
    queriesToInvalidate,
    onSuccess: () => {
      notifySuccess(t`${pluginName} uninstalled`);
    },
    onError,
  });
  return {
    isPending: isInserting || isUpdating || isDeleting,
    install: () => {
      if (manifest === undefined) {
        return;
      }
      insertInstallation({
        data: Model.make("PluginInstallation", {
          workspaceId: workspace.id,
          pluginId: manifest.id,
          installedVersion: manifest.version,
          grantedPermissions: [...manifest.permissions],
        }),
      });
    },
    setIsEnabled: (isEnabled: boolean) => {
      if (installation !== undefined) {
        updateInstallation({ id: installation.id, data: { isEnabled } });
      }
    },
    approvePermissions: () => {
      if (installation !== undefined && manifest !== undefined) {
        updateInstallation({
          id: installation.id,
          data: {
            grantedPermissions: [...manifest.permissions],
            installedVersion: manifest.version,
          },
        });
      }
    },
    uninstall: () => {
      if (installation !== undefined) {
        deleteInstallation({ id: installation.id });
      }
    },
  };
}
```

- [ ] **Step 4: Write the failing actions test**

`PluginActions.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions";
import { render, screen } from "@/test-utils";

const ACTIONS = {
  isPending: false,
  install: vi.fn(),
  setIsEnabled: vi.fn(),
  approvePermissions: vi.fn(),
  uninstall: vi.fn(),
};

function _labels(): string[] {
  return screen.getAllByRole("button").map((button) => {
    return button.textContent ?? "";
  });
}

describe("PluginActions", () => {
  it.each([
    ["not_installed", ["Install"]],
    ["installed", ["Disable", "Uninstall"]],
    ["disabled", ["Enable", "Uninstall"]],
    ["needs_review", ["Review new permissions", "Disable", "Uninstall"]],
    ["unavailable", ["Uninstall"]],
  ] as const)("offers the right actions when %s", (status, expected) => {
    render(
      <PluginActions status={status} pluginName="Epidemiology" canManage actions={ACTIONS} />,
    );
    expect(_labels()).toEqual(expected);
  });

  it("disables every action for users who cannot manage plugins", () => {
    render(
      <PluginActions status="installed" pluginName="Epidemiology" canManage={false} actions={ACTIONS} />,
    );
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
```

- [ ] **Step 5: Run it and watch it fail**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: FAIL, because `PluginActions.tsx` does not exist.

- [ ] **Step 6: Implement the actions component**

`PluginActions.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatus";
import type { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions";

type Props = Readonly<{
  status: PluginInstallStatus;
  pluginName: string;
  canManage: boolean;
  actions: ReturnType<typeof usePluginInstallationActions>;
}>;

/** The buttons for one plugin's current status. Each confirms first. */
export function PluginActions({ status, pluginName, canManage, actions }: Props): JSX.Element {
  const { t } = useLingui();
  const confirm = (options: {
    title: string;
    body: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }) => {
    modals.openConfirmModal({
      title: options.title,
      children: <Text size="sm">{options.body}</Text>,
      labels: { confirm: options.confirmLabel, cancel: t`Cancel` },
      confirmProps: options.isDestructive ? { color: "danger" } : undefined,
      onConfirm: options.onConfirm,
    });
  };
  const isDisabled = !canManage || actions.isPending;
  const installButton = (
    <Button key="install" size="compact-sm" disabled={isDisabled} onClick={() => {
      confirm({ title: t`Install ${pluginName}?`, body: t`${pluginName} will be available to every member of this workspace.`, confirmLabel: t`Install`, onConfirm: actions.install });
    }}>{t`Install`}</Button>
  );
  const reviewButton = (
    <Button key="review" size="compact-sm" disabled={isDisabled} onClick={() => {
      confirm({ title: t`Approve new permissions for ${pluginName}?`, body: t`This version asks for permissions listed on its card. It stays hidden until you approve them.`, confirmLabel: t`Approve`, onConfirm: actions.approvePermissions });
    }}>{t`Review new permissions`}</Button>
  );
  const enableButton = (
    <Button key="enable" size="compact-sm" variant="outline" disabled={isDisabled} onClick={() => {
      confirm({ title: t`Enable ${pluginName}?`, body: t`Its features come back for every member.`, confirmLabel: t`Enable`, onConfirm: () => { actions.setIsEnabled(true); } });
    }}>{t`Enable`}</Button>
  );
  const disableButton = (
    <Button key="disable" size="compact-sm" variant="outline" color="neutral" disabled={isDisabled} onClick={() => {
      confirm({ title: t`Disable ${pluginName}?`, body: t`Its features disappear for every member until you enable it again.`, confirmLabel: t`Disable`, onConfirm: () => { actions.setIsEnabled(false); } });
    }}>{t`Disable`}</Button>
  );
  const uninstallButton = (
    <Button key="uninstall" size="compact-sm" variant="subtle" color="danger" disabled={isDisabled} onClick={() => {
      confirm({ title: t`Uninstall ${pluginName}?`, body: t`Its features are removed from this workspace.`, confirmLabel: t`Uninstall`, isDestructive: true, onConfirm: actions.uninstall });
    }}>{t`Uninstall`}</Button>
  );
  const buttonsByStatus: Record<PluginInstallStatus, JSX.Element[]> = {
    not_installed: [installButton],
    installed: [disableButton, uninstallButton],
    disabled: [enableButton, uninstallButton],
    needs_review: [reviewButton, disableButton, uninstallButton],
    unavailable: [uninstallButton],
  };
  return <Group gap="xs" wrap="nowrap">{buttonsByStatus[status]}</Group>;
}
```

`pnpm format` reflows the long JSX lines. This function runs past 45 lines because of the five button definitions. If the reviewer objects, extract a `PluginActionButton` component that takes `label`, `variant`, `color`, and a `confirm` options object.

- [ ] **Step 7: Run it and watch it pass**

Run: `pnpm vitest run src/views/WorkspaceSettingsPage/WorkspacePluginsTab`
Expected: PASS.

- [ ] **Step 8: Write the badge, details, card, and tab**

`PluginStatusBadge.tsx`:

```tsx
import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatus";

/** A plugin's status, as a colored badge. */
export function PluginStatusBadge({ status }: { status: PluginInstallStatus }): JSX.Element {
  const { t } = useLingui();
  const label = matchLiteral(status, {
    not_installed: t`Not installed`,
    installed: t`Installed`,
    disabled: t`Disabled`,
    needs_review: t`Needs review`,
    unavailable: t`Unavailable`,
  });
  const color = matchLiteral(status, {
    not_installed: "gray",
    installed: "green",
    disabled: "gray",
    needs_review: "yellow",
    unavailable: "red",
  });
  return <Badge color={color} variant="light">{label}</Badge>;
}
```

`PluginDetails.tsx`:

```tsx
import { matchLiteral } from "@avandar/utils";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import { countPluginContributions } from "@/lib/plugins/countPluginContributions";
import type { PluginManifest, PluginPermission } from "@avandar/plugin-manifest/runtime";

/** What a plugin adds and which permissions it uses, in plain language. */
export function PluginDetails({ manifest }: { manifest: PluginManifest }): JSX.Element {
  const { t } = useLingui();
  const { dataExplorerToolbarItems } = countPluginContributions(manifest);
  const describePermission = (permission: PluginPermission): string => {
    return matchLiteral(permission, {
      "data:context": t`Reads the query result you run it on`,
    });
  };
  return (
    <>
      <Text size="sm">
        <Plural
          value={dataExplorerToolbarItems}
          one="Adds # button to Data Explorer"
          other="Adds # buttons to Data Explorer"
        />
      </Text>
      {manifest.permissions.length === 0 ? (
        <Text size="sm" c="dimmed">
          <Trans>Uses no workspace data.</Trans>
        </Text>
      ) : (
        <List size="sm">
          {manifest.permissions.map((permission) => {
            return <List.Item key={permission}>{describePermission(permission)}</List.Item>;
          })}
        </List>
      )}
    </>
  );
}
```

`PluginSettingsCard.tsx`:

```tsx
import { resolveManifestString } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { getPluginInstallStatus } from "@/lib/plugins/getPluginInstallStatus";
import { PluginActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions";
import { PluginDetails } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails";
import { PluginStatusBadge } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginStatusBadge";
import { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  manifestModule: PluginManifestModule | undefined;
  installation: PluginInstallation.T | undefined;
  canManage: boolean;
}>;

/**
 * One plugin on the settings page. Without a manifest module, the plugin is
 * installed but no longer bundled, so the card offers only Uninstall.
 */
export function PluginSettingsCard({ manifestModule, installation, canManage }: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const manifest = manifestModule?.manifest;
  const resolve = (value: string) => {
    return manifestModule
      ? resolveManifestString({ strings: manifestModule.strings, locale: i18n.locale, value })
      : value;
  };
  const pluginName = manifest ? resolve(manifest.name) : (installation?.pluginId ?? "");
  const status = getPluginInstallStatus({ installation, manifestPermissions: manifest?.permissions });
  const actions = usePluginInstallationActions({ pluginName, manifest, installation });
  const PluginIcon = manifest ? manifestModule?.icons[manifest.icon] : undefined;
  const publisher = manifest?.id.split(".")[0] ?? "";
  const version = manifest?.version ?? "";
  return (
    <Card component="section" aria-label={pluginName} withBorder padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group align="flex-start" wrap="nowrap">
          {PluginIcon ? <PluginIcon size={28} aria-hidden /> : null}
          <Stack gap={4}>
            <Group gap="xs">
              <Title order={4}>{pluginName}</Title>
              <PluginStatusBadge status={status} />
            </Group>
            {manifest ? (
              <>
                <Text size="sm" c="dimmed">{t`${publisher} · version ${version}`}</Text>
                <Text size="sm">{resolve(manifest.description)}</Text>
                <PluginDetails manifest={manifest} />
              </>
            ) : null}
          </Stack>
        </Group>
        <PluginActions status={status} pluginName={pluginName} canManage={canManage} actions={actions} />
      </Group>
    </Card>
  );
}
```

`WorkspacePluginsTab.tsx`:

```tsx
import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PluginModuleCache } from "@/lib/plugins/createPluginModuleCache";
import { getBundledPluginEntries } from "@/lib/plugins/pluginIndex";
import { PluginSettingsCard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginSettingsCard";

/** Lists bundled plugins and lets settings admins install and manage them. */
export function WorkspacePluginsTab(): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const canManage = useHasPermission("settings__can_manage_plugins");
  const [installations = [], isLoadingInstallations] = PluginInstallationClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const manifestsQuery = useQuery({
    queryKey: ["plugins", "manifests", "bundled"],
    queryFn: () => {
      return Promise.all(getBundledPluginEntries().map(PluginModuleCache.loadManifest));
    },
    staleTime: Infinity,
  });
  if (isLoadingInstallations || manifestsQuery.isLoading) {
    return <Loader aria-label={t`Loading plugins`} />;
  }
  const manifestModules = manifestsQuery.data ?? [];
  const bundledIds = new Set(manifestModules.map((module) => {
    return module.manifest.id;
  }));
  const unavailableInstallations = installations.filter((installation) => {
    return !bundledIds.has(installation.pluginId);
  });
  return (
    <Stack gap="lg">
      <Text c="dimmed">
        <Trans>Plugins add features to this workspace. Installing or removing a plugin affects every member.</Trans>
      </Text>
      {manifestModules.length === 0 ? (
        <Text><Trans>No plugins are available in this deployment.</Trans></Text>
      ) : null}
      {manifestModules.map((manifestModule) => {
        return (
          <PluginSettingsCard
            key={manifestModule.manifest.id}
            manifestModule={manifestModule}
            installation={installations.find((installation) => {
              return installation.pluginId === manifestModule.manifest.id;
            })}
            canManage={canManage}
          />
        );
      })}
      {unavailableInstallations.map((installation) => {
        return (
          <PluginSettingsCard key={installation.id} manifestModule={undefined} installation={installation} canManage={canManage} />
        );
      })}
    </Stack>
  );
}
```

- [ ] **Step 9: Add the tab**

In `src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx`:

- Import `WorkspacePluginsTab`.
- Add `"plugins"` after `"language"` in both `OWNER_TAB_IDS` and `NON_OWNER_TAB_IDS`.
- Add `plugins: t\`Plugins\`,` to `tabHeaders`.
- In both `<Tabs>` blocks, add `plugins: tabHeaders.plugins,` to `renderTabHeader` and this entry to `renderTabPanel`:

```tsx
              plugins: () => {
                return <WorkspacePluginsTab />;
              },
```

- [ ] **Step 10: Verify**

```bash
pnpm vitest run src/views/WorkspaceSettingsPage src/lib/plugins
pnpm type-check
```

Expected: PASS and a clean type-check.

- [ ] **Step 11: Commit**

```bash
git add src/lib/plugins/countPluginContributions.ts src/lib/plugins/countPluginContributions.test.ts src/views/WorkspaceSettingsPage/WorkspacePluginsTab src/views/WorkspaceSettingsPage/WorkspaceSettingsPage.tsx
git commit -m "feat(plugins): add the Settings → Plugins tab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Import restrictions for plugins

**Files:**
- Create: `eslint/plugin-restrictions.js`
- Modify: `eslint.config.js`

- [ ] **Step 1: Write the rule block**

`eslint/plugin-restrictions.js`:

```js
/**
 * Plugin code may import only the plugin SDK packages, React, relative
 * files, and approved npm packages. Keep this list in sync with
 * `APPROVED_PLUGIN_DEPENDENCIES` in `@avandar/plugin-manifest`: a plugin
 * that reaches into app code would break when it moves into the sandbox.
 */
const APPROVED_PLUGIN_IMPORT = [
  "\\.{1,2}/",
  "@avandar/plugin-sdk$",
  "@avandar/plugin-ui$",
  "react$",
  "react/jsx-runtime$",
  "simple-statistics$",
  "d3-array$",
  "date-fns(/.*)?$",
].join("|");

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
              regex: `^(?!(?:${APPROVED_PLUGIN_IMPORT}))`,
              message:
                "Plugins may import only @avandar/plugin-sdk, @avandar/plugin-ui, React, relative files, and approved npm packages (see APPROVED_PLUGIN_DEPENDENCIES in @avandar/plugin-manifest).",
            },
          ],
        },
      ],
    },
  },
];
```

- [ ] **Step 2: Register it**

In `eslint.config.js`, import it next to the other restriction blocks:

```js
import { pluginRestrictions } from "./eslint/plugin-restrictions.js";
```

Spread it right after `...packageRestrictions,`:

```js
  ...pluginRestrictions,
```

- [ ] **Step 3: Prove the rule bites**

Create a throwaway file `plugins/lint-probe.ts` containing `import { Logger } from "@/utils/Logger";\nexport const probe = Logger;\n`, then run:

```bash
pnpm exec eslint plugins/lint-probe.ts
```

Expected: one `no-restricted-imports` error naming the plugin rule. Delete `plugins/lint-probe.ts`.

- [ ] **Step 4: Commit**

```bash
git add eslint/plugin-restrictions.js eslint.config.js
git commit -m "chore(plugins): restrict plugin imports to the SDK and approved packages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: The epidemiology plugin

**Files:**
- Create: `plugins/epidemiology/{ava.yaml,package.json,tsconfig.json,locales/en.json}`
- Create: `plugins/epidemiology/src/fitLinearRegression.ts`
- Test: `plugins/epidemiology/src/fitLinearRegression.test.ts`
- Create: `plugins/epidemiology/src/RegressionModal.tsx`
- Create: `plugins/epidemiology/src/index.tsx`
- Modify: `plugins/bundled.yaml`

- [ ] **Step 1: Write the plugin metadata**

`plugins/epidemiology/ava.yaml`:

```yaml
# The epidemiology plugin: statistical tools for public-health data.
id: avandar.epidemiology
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: chart-dots
permissions:
  - data:context
contributes:
  commands:
    - id: regression.linear
      title: "%regression.linear.title%"
      icon: trending-up
  menus:
    dataExplorer.toolbar:
      - command: regression.linear
        when:
          numericColumnCount: { gte: 2 }
```

`plugins/epidemiology/package.json`:

```json
{
  "name": "@avandar-plugins/epidemiology",
  "version": "0.1.0",
  "private": true,
  "license": "MIT",
  "type": "module",
  "dependencies": {
    "@avandar/plugin-sdk": "workspace:*",
    "@avandar/plugin-ui": "workspace:*",
    "simple-statistics": "^7.8.8"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

`plugins/epidemiology/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

`plugins/epidemiology/locales/en.json`:

```json
{
  "plugin.name": "Epidemiology",
  "plugin.description": "Statistical modeling tools for public-health data.",
  "regression.linear.title": "Linear regression",
  "modal.xColumn": "Predictor (X)",
  "modal.yColumn": "Outcome (Y)",
  "modal.fit": "Fit regression",
  "modal.slope": "Slope",
  "modal.intercept": "Intercept",
  "modal.rSquared": "R²",
  "modal.n": "Rows used",
  "modal.truncated": "Fitted on the first {count, plural, one {# row} other {# rows}} of the result.",
  "modal.notEnoughData": "Pick two different numeric columns with at least two rows where X varies.",
  "modal.failed": "Could not read the result: {message}"
}
```

Then add the plugin to `plugins/bundled.yaml`:

```yaml
plugins:
  - epidemiology
```

Run `pnpm install`. Expected: it links the plugin's dependencies and installs `simple-statistics`.

- [ ] **Step 2: Write the failing math test**

`plugins/epidemiology/src/fitLinearRegression.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fitLinearRegression, toRegressionPoints } from "./fitLinearRegression";

describe("fitLinearRegression", () => {
  it("recovers an exact line", () => {
    const points = [1, 2, 3, 4, 5].map((x) => {
      return [x, 2 * x + 1] as const;
    });
    const fit = fitLinearRegression(points);
    expect(fit?.slope).toBeCloseTo(2);
    expect(fit?.intercept).toBeCloseTo(1);
    expect(fit?.rSquared).toBeCloseTo(1);
    expect(fit?.n).toBe(5);
  });

  it("returns undefined for fewer than two points or constant X", () => {
    expect(fitLinearRegression([[1, 1]])).toBeUndefined();
    expect(fitLinearRegression([[1, 1], [1, 2]])).toBeUndefined();
  });
});

describe("toRegressionPoints", () => {
  it("converts bigints and numeric strings and drops non-numeric rows", () => {
    expect(
      toRegressionPoints({
        rows: [
          { x: 1n, y: "3" },
          { x: 2, y: 5 },
          { x: null, y: 7 },
          { x: "n/a", y: 9 },
        ],
        xColumn: "x",
        yColumn: "y",
      }),
    ).toEqual([
      [1, 3],
      [2, 5],
    ]);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run plugins/epidemiology`
Expected: FAIL, because `fitLinearRegression.ts` does not exist.

- [ ] **Step 4: Implement the math**

`plugins/epidemiology/src/fitLinearRegression.ts`:

```ts
import { linearRegression, linearRegressionLine, rSquared } from "simple-statistics";

/** A fitted simple linear regression. */
export type LinearRegressionFit = Readonly<{
  slope: number;
  intercept: number;
  rSquared: number;
  n: number;
}>;

function _toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const numericValue = typeof value === "bigint" ? Number(value) : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

/** Pairs of numeric X and Y values, skipping rows where either is missing. */
export function toRegressionPoints(options: {
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>;
  xColumn: string;
  yColumn: string;
}): Array<readonly [number, number]> {
  return options.rows.flatMap((row) => {
    const x = _toFiniteNumber(row[options.xColumn]);
    const y = _toFiniteNumber(row[options.yColumn]);
    return x === undefined || y === undefined ? [] : [[x, y] as const];
  });
}

/**
 * Fits Y = slope · X + intercept by least squares. Undefined when there are
 * fewer than two points or X never varies.
 */
export function fitLinearRegression(
  points: ReadonlyArray<readonly [number, number]>,
): LinearRegressionFit | undefined {
  const firstX = points[0]?.[0];
  const hasVariation = points.some((point) => {
    return point[0] !== firstX;
  });
  if (points.length < 2 || !hasVariation) {
    return undefined;
  }
  const mutablePoints = points.map((point) => {
    return [point[0], point[1]];
  });
  const { m: slope, b: intercept } = linearRegression(mutablePoints);
  const line = linearRegressionLine({ m: slope, b: intercept });
  return { slope, intercept, rSquared: rSquared(mutablePoints, line), n: points.length };
}
```

Run it again: `pnpm vitest run plugins/epidemiology`. Expected: PASS.

- [ ] **Step 5: Write the modal and entry**

`plugins/epidemiology/src/RegressionModal.tsx`:

```tsx
import { useAvandar, useT } from "@avandar/plugin-sdk";
import { Alert, Button, Group, Select, SimpleGrid, Stack, Text } from "@avandar/plugin-ui";
import { useState } from "react";
import { fitLinearRegression, toRegressionPoints } from "./fitLinearRegression";
import type { LinearRegressionFit } from "./fitLinearRegression";

type FitState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "fitted"; fit: LinearRegressionFit; isTruncated: boolean; rowCount: number }>
  | Readonly<{ kind: "error"; message: string }>;

/** Picks an X and a Y column, fits a regression, and shows the result. */
export function RegressionModal(): JSX.Element {
  const avandar = useAvandar();
  const t = useT();
  const numericColumns = avandar.context.columns
    .filter((column) => {
      return column.dataType === "bigint" || column.dataType === "double";
    })
    .map((column) => {
      return column.name;
    });
  const [xColumn, setXColumn] = useState(numericColumns[0] ?? null);
  const [yColumn, setYColumn] = useState(numericColumns[1] ?? null);
  const [fitState, setFitState] = useState<FitState>({ kind: "idle" });
  const [isFitting, setIsFitting] = useState(false);
  const formatNumber = (value: number) => {
    return value.toLocaleString(avandar.workspace.locale, { maximumFractionDigits: 4 });
  };

  const onFit = async () => {
    if (xColumn === null || yColumn === null || xColumn === yColumn) {
      setFitState({ kind: "error", message: t("modal.notEnoughData") });
      return;
    }
    setIsFitting(true);
    try {
      const { rows, isTruncated } = await avandar.data.fetchRows(avandar.context.queryHandle, {
        columns: [xColumn, yColumn],
      });
      const fit = fitLinearRegression(toRegressionPoints({ rows, xColumn, yColumn }));
      setFitState(
        fit === undefined
          ? { kind: "error", message: t("modal.notEnoughData") }
          : { kind: "fitted", fit, isTruncated, rowCount: rows.length },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFitState({ kind: "error", message: t("modal.failed", { message }) });
    } finally {
      setIsFitting(false);
    }
  };

  return (
    <Stack>
      <Group grow>
        <Select label={t("modal.xColumn")} data={numericColumns} value={xColumn} onChange={setXColumn} allowDeselect={false} />
        <Select label={t("modal.yColumn")} data={numericColumns} value={yColumn} onChange={setYColumn} allowDeselect={false} />
      </Group>
      <Button onClick={() => { void onFit(); }} loading={isFitting}>
        {t("modal.fit")}
      </Button>
      {fitState.kind === "error" ? <Alert color="yellow">{fitState.message}</Alert> : null}
      {fitState.kind === "fitted" ? (
        <Stack gap="xs">
          <SimpleGrid cols={4}>
            {[
              [t("modal.slope"), formatNumber(fitState.fit.slope)],
              [t("modal.intercept"), formatNumber(fitState.fit.intercept)],
              [t("modal.rSquared"), formatNumber(fitState.fit.rSquared)],
              [t("modal.n"), formatNumber(fitState.fit.n)],
            ].map(([label, value]) => {
              return (
                <Stack key={label} gap={0} aria-label={label}>
                  <Text size="xs" c="dimmed">{label}</Text>
                  <Text fw={600}>{value}</Text>
                </Stack>
              );
            })}
          </SimpleGrid>
          {fitState.isTruncated ? (
            <Text size="xs" c="dimmed">{t("modal.truncated", { count: fitState.rowCount })}</Text>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
```

`plugins/epidemiology/src/index.tsx`:

```tsx
import { definePlugin } from "@avandar/plugin-sdk";
import { RegressionModal } from "./RegressionModal";

export default definePlugin({
  commands: {
    "regression.linear": (avandar) => {
      avandar.ui.openModal({
        title: avandar.i18n.t("regression.linear.title"),
        content: <RegressionModal />,
      });
    },
  },
});
```

- [ ] **Step 6: Verify the plugin, the bundle, and the dev loop**

```bash
pnpm exec eslint plugins/epidemiology
pnpm type-check
pnpm check:plugin-bundle
```

Expected: no lint errors, a clean type-check, and the bundle check passes. That proves the plugin code and its manifest are lazy chunks only.

Then run `pnpm dev`. As the seeded admin from `seed/SeedData.ts`:

1. Install Epidemiology in Settings → Plugins.
2. Open Data Explorer with `?sql=SELECT x, 2 * x + 1 AS y FROM range(1, 21) t(x)`.
3. Click "Linear regression", then "Fit regression".

Expected: slope 2, intercept 1, R² 1, rows used 20. Take headless screenshots into `.temp/feat-plugins-core/`. Uninstall the plugin afterwards.

- [ ] **Step 7: Commit**

```bash
git add plugins/bundled.yaml plugins/epidemiology pnpm-lock.yaml
git commit -m "feat(plugins): add the epidemiology plugin with linear regression

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: `ava plugin init` and `ava plugin validate`

**Files:**
- Create: `apps/ava-cli/src/PluginCli/PluginCli.ts`
- Create: `apps/ava-cli/src/PluginCli/InitPluginCli/buildPluginScaffoldFiles.ts`
- Create: `apps/ava-cli/src/PluginCli/InitPluginCli/InitPluginCli.ts`
- Test: `apps/ava-cli/src/PluginCli/InitPluginCli/InitPluginCli.test.ts`
- Create: `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.ts`
- Test: `apps/ava-cli/src/PluginCli/ValidatePluginCli/ValidatePluginCli.test.ts`
- Modify: `apps/ava-cli/src/main.ts`, `apps/ava-cli/package.json`, `apps/ava-cli/tsup.config.ts`

- [ ] **Step 1: Add the dependency and bundling**

In `apps/ava-cli/package.json` `dependencies`, add `"@avandar/plugin-manifest": "workspace:*"` and `"yaml": "^2.9.0"`.

In `apps/ava-cli/tsup.config.ts`, extend `noExternal`:

```ts
  noExternal: [
    "@avandar/utils",
    "@avandar/models",
    "@avandar/clients",
    "@avandar/plugin-manifest",
  ],
```

Run `pnpm install`.

- [ ] **Step 2: Write the failing tests**

`InitPluginCli.test.ts`:

```ts
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initPluginCommand } from "@ava-cli/PluginCli/InitPluginCli/InitPluginCli";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let repoRoot: string;

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "ava-plugin-init-"));
  mkdirSync(join(repoRoot, "plugins"));
  writeFileSync(join(repoRoot, "plugins/bundled.yaml"), "# Bundled plugins.\nplugins: []\n");
  vi.spyOn(Acclimate, "log").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
});

describe("initPluginCommand", () => {
  it("scaffolds the plugin and adds it to bundled.yaml, keeping comments", () => {
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    const directory = join(repoRoot, "plugins/case-tools");
    expect(readFileSync(join(directory, "ava.yaml"), "utf8")).toContain("id: avandar.case-tools");
    expect(existsSync(join(directory, "src/index.tsx"))).toBe(true);
    expect(existsSync(join(directory, "locales/en.json"))).toBe(true);
    const bundled = readFileSync(join(repoRoot, "plugins/bundled.yaml"), "utf8");
    expect(bundled).toContain("# Bundled plugins.");
    expect(bundled).toContain("- case-tools");
  });

  it("refuses a name that is not kebab-case", () => {
    expect(() => {
      return initPluginCommand({ name: "CaseTools", publisher: "avandar", repoRoot });
    }).toThrow(/kebab-case/);
  });

  it("refuses to overwrite an existing plugin", () => {
    initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    expect(() => {
      return initPluginCommand({ name: "case-tools", publisher: "avandar", repoRoot });
    }).toThrow(/already exists/);
  });
});
```

`ValidatePluginCli.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePluginCommand } from "@ava-cli/PluginCli/ValidatePluginCli/ValidatePluginCli";
import { Acclimate } from "@avandar/acclimate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as PluginManifestNode from "@avandar/plugin-manifest/node";

let repoRoot: string;

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "ava-plugin-validate-"));
  vi.spyOn(Acclimate, "log").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("validatePluginCommand", () => {
  it("runs the manifest check, tsc, and eslint for each plugin", () => {
    vi.spyOn(PluginManifestNode, "readPluginDirectory").mockReturnValue({} as never);
    const runCommand = vi.fn().mockReturnValue({ isOk: true, output: "" });
    validatePluginCommand({ name: "epidemiology", repoRoot, runCommand });
    expect(runCommand).toHaveBeenCalledWith(
      "pnpm",
      ["exec", "tsc", "-p", "plugins/epidemiology/tsconfig.json", "--noEmit"],
      repoRoot,
    );
    expect(runCommand).toHaveBeenCalledWith("pnpm", ["exec", "eslint", "plugins/epidemiology"], repoRoot);
  });

  it("fails when a check fails", () => {
    vi.spyOn(PluginManifestNode, "readPluginDirectory").mockReturnValue({} as never);
    const runCommand = vi.fn().mockReturnValue({ isOk: false, output: "type error" });
    expect(() => {
      return validatePluginCommand({ name: "epidemiology", repoRoot, runCommand });
    }).toThrow(/1 plugin failed validation/);
  });
});
```

- [ ] **Step 3: Run them and watch them fail**

Run: `pnpm --filter @avandar/ava-cli test -- PluginCli`
Expected: FAIL, because the modules do not exist.

- [ ] **Step 4: Implement the scaffold**

`buildPluginScaffoldFiles.ts`:

```ts
function _toTitleCase(name: string): string {
  return name
    .split("-")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/** The files of a new plugin, keyed by path relative to its folder. */
export function buildPluginScaffoldFiles(options: {
  name: string;
  publisher: string;
}): Record<string, string> {
  const { name, publisher } = options;
  const displayName = _toTitleCase(name);
  return {
    "ava.yaml": [
      `id: ${publisher}.${name}`,
      'name: "%plugin.name%"',
      'description: "%plugin.description%"',
      'version: "0.1.0"',
      "license: MIT",
      "engines:",
      '  avandar: "^1"',
      "entry: src/index.tsx",
      "icon: puzzle",
      "permissions: []",
      "contributes:",
      "  commands:",
      "    - id: hello",
      '      title: "%hello.title%"',
      "      icon: hand-stop",
      "  menus:",
      "    dataExplorer.toolbar:",
      "      - command: hello",
      "",
    ].join("\n"),
    "package.json": `${JSON.stringify(
      {
        name: `@avandar-plugins/${name}`,
        version: "0.1.0",
        private: true,
        license: "MIT",
        type: "module",
        dependencies: {
          "@avandar/plugin-sdk": "workspace:*",
          "@avandar/plugin-ui": "workspace:*",
        },
        peerDependencies: { react: "^19.0.0" },
      },
      null,
      2,
    )}\n`,
    "tsconfig.json": `${JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        compilerOptions: { lib: ["ESNext", "DOM", "DOM.Iterable"], jsx: "react-jsx" },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
    "locales/en.json": `${JSON.stringify(
      {
        "plugin.name": displayName,
        "plugin.description": "Describe what this plugin adds.",
        "hello.title": "Say hello",
        "hello.message": "Hello from {pluginName}!",
      },
      null,
      2,
    )}\n`,
    "src/index.tsx": [
      'import { definePlugin } from "@avandar/plugin-sdk";',
      "",
      "export default definePlugin({",
      "  commands: {",
      "    hello: (avandar) => {",
      "      avandar.ui.notify({",
      `        message: avandar.i18n.t("hello.message", { pluginName: "${displayName}" }),`,
      "      });",
      "    },",
      "  },",
      "});",
      "",
    ].join("\n"),
  };
}
```

`InitPluginCli.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildPluginScaffoldFiles } from "@ava-cli/PluginCli/InitPluginCli/buildPluginScaffoldFiles";
import { printInfo, printSuccess } from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";
import { isSeq, parseDocument } from "yaml";

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BUNDLED_LIST_HEADER =
  "# Plugin folders under plugins/ that this deployment bundles into the app.\n";

function _addToBundledList(options: { repoRoot: string; name: string }): void {
  const bundledListPath = join(options.repoRoot, "plugins/bundled.yaml");
  const yamlText = existsSync(bundledListPath)
    ? readFileSync(bundledListPath, "utf8")
    : `${BUNDLED_LIST_HEADER}plugins: []\n`;
  const document = parseDocument(yamlText);
  const plugins = document.get("plugins");
  if (!isSeq(plugins)) {
    document.set("plugins", [options.name]);
  } else if (!plugins.items.some((item) => {
    return String(item) === options.name;
  })) {
    plugins.flow = false;
    plugins.add(options.name);
  }
  writeFileSync(bundledListPath, document.toString());
}

/** Scaffolds `plugins/<name>/` and adds it to `plugins/bundled.yaml`. */
export function initPluginCommand(options: {
  name: string;
  publisher: string;
  repoRoot?: string;
}): void {
  const { name, publisher } = options;
  if (!KEBAB_CASE_PATTERN.test(name) || !KEBAB_CASE_PATTERN.test(publisher)) {
    throw new Error("Plugin and publisher names must be kebab-case, e.g. case-tools.");
  }
  const repoRoot = options.repoRoot ?? findRepoRoot();
  if (repoRoot === undefined) {
    throw new Error("Run this command from inside the Avandar repository.");
  }
  const directory = join(repoRoot, "plugins", name);
  if (existsSync(directory)) {
    throw new Error(`plugins/${name} already exists.`);
  }
  Object.entries(buildPluginScaffoldFiles({ name, publisher })).forEach(([path, contents]) => {
    const filePath = join(directory, path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  });
  _addToBundledList({ repoRoot, name });
  printSuccess(`Created plugins/${name} and added it to plugins/bundled.yaml.`);
  printInfo(`Next: pnpm install, then ava plugin validate ${name}, then pnpm dev.`);
}

export const InitPluginCli = Acclimate.createCLI("init")
  .description("Scaffold a bundled plugin under plugins/ with a working hello command.")
  .addPositionalArg({
    name: "name",
    required: true,
    description: "The plugin folder name, in kebab-case.",
    type: "string",
  })
  .addOption({
    name: "--publisher",
    type: "string",
    required: false,
    defaultValue: "avandar",
    description: "The publisher part of the plugin id (publisher.name).",
  })
  .action(({ name, publisher }: Readonly<{ name: string; publisher: string }>) => {
    initPluginCommand({ name, publisher });
  });
```

- [ ] **Step 5: Implement validate**

`ValidatePluginCli.ts`:

```ts
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { PluginManifestError } from "@avandar/plugin-manifest";
import { readBundledPluginFolders, readPluginDirectory } from "@avandar/plugin-manifest/node";
import { printError, printSuccess } from "@ava-cli/utils/cliOutput/cliOutput";
import { findRepoRoot } from "@ava-cli/utils/findRepoRoot";
import { Acclimate } from "@avandar/acclimate";

type CommandResult = Readonly<{ isOk: boolean; output: string }>;
type RunCommand = (command: string, args: string[], cwd: string) => CommandResult;

const runCommandWithSpawn: RunCommand = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return { isOk: result.status === 0, output: `${result.stdout}${result.stderr}` };
};

function _validateOnePlugin(options: {
  folderName: string;
  repoRoot: string;
  runCommand: RunCommand;
}): string[] {
  const { folderName, repoRoot, runCommand } = options;
  const problems: string[] = [];
  try {
    readPluginDirectory({ directory: join(repoRoot, "plugins", folderName), repoRoot });
  } catch (error) {
    problems.push(error instanceof PluginManifestError ? error.message : String(error));
  }
  const typeCheck = runCommand(
    "pnpm",
    ["exec", "tsc", "-p", `plugins/${folderName}/tsconfig.json`, "--noEmit"],
    repoRoot,
  );
  if (!typeCheck.isOk) {
    problems.push(`tsc:\n${typeCheck.output}`);
  }
  const lint = runCommand("pnpm", ["exec", "eslint", `plugins/${folderName}`], repoRoot);
  if (!lint.isOk) {
    problems.push(`eslint:\n${lint.output}`);
  }
  return problems;
}

/**
 * Validates one plugin, or every bundled plugin: manifest schema, locale
 * keys, icons, approved dependencies, `tsc`, and the import lint.
 */
export function validatePluginCommand(options: {
  name?: string;
  repoRoot?: string;
  runCommand?: RunCommand;
}): void {
  const repoRoot = options.repoRoot ?? findRepoRoot();
  if (repoRoot === undefined) {
    throw new Error("Run this command from inside the Avandar repository.");
  }
  const runCommand = options.runCommand ?? runCommandWithSpawn;
  const folderNames = options.name ? [options.name] : readBundledPluginFolders(repoRoot);
  const failedFolders = folderNames.filter((folderName) => {
    const problems = _validateOnePlugin({ folderName, repoRoot, runCommand });
    if (problems.length === 0) {
      printSuccess(`plugins/${folderName} is valid.`);
      return false;
    }
    printError(`plugins/${folderName} failed validation:`);
    problems.forEach((problem) => {
      printError(problem);
    });
    return true;
  });
  if (failedFolders.length > 0) {
    throw new Error(
      `${failedFolders.length} plugin${failedFolders.length === 1 ? "" : "s"} failed validation.`,
    );
  }
}

export const ValidatePluginCli = Acclimate.createCLI("validate")
  .description("Validate a plugin's manifest, types, and imports. Validates every bundled plugin when no name is given.")
  .addPositionalArg({
    name: "name",
    required: false,
    description: "The plugin folder name. Omit to validate every bundled plugin.",
    type: "string",
  })
  .action(({ name }: Readonly<{ name: string | undefined }>) => {
    validatePluginCommand({ name });
  });
```

`PluginCli.ts`:

```ts
import { InitPluginCli } from "@ava-cli/PluginCli/InitPluginCli/InitPluginCli";
import { ValidatePluginCli } from "@ava-cli/PluginCli/ValidatePluginCli/ValidatePluginCli";
import { Acclimate } from "@avandar/acclimate";

/** Create and validate bundled plugins. */
export const PluginCli = Acclimate.createCLI("plugin")
  .description("Create and validate bundled Avandar plugins.")
  .addCommand("init", InitPluginCli)
  .addCommand("validate", ValidatePluginCli);
```

In `apps/ava-cli/src/main.ts`, import `PluginCli` and register it alphabetically, between `pipeline` and `polar`:

```ts
  .addCommand("plugin", PluginCli)
```

- [ ] **Step 6: Run the tests and try the CLI**

```bash
pnpm --filter @avandar/ava-cli test -- PluginCli
pnpm build:ava-cli
ava plugin validate
```

Expected: tests PASS, and `ava plugin validate` prints `plugins/epidemiology is valid.`

- [ ] **Step 7: Commit**

```bash
git add apps/ava-cli/src/PluginCli apps/ava-cli/src/main.ts apps/ava-cli/package.json apps/ava-cli/tsup.config.ts pnpm-lock.yaml
git commit -m "feat(plugins): add ava plugin init and ava plugin validate

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22: End-to-end test

**Files:**
- Create: `tests/e2e/plugins-epidemiology-regression.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const REGRESSION_SQL = "SELECT x, 2 * x + 1 AS y FROM range(1, 21) t(x)";
const PLUGIN_ID = "avandar.epidemiology";

async function _confirmDialog(page: Page, buttonName: string): Promise<void> {
  await page.getByRole("dialog").getByRole("button", { name: buttonName }).click();
}

test.describe("Epidemiology plugin", () => {
  test("an admin installs it and fits a regression from Data Explorer", async ({
    page,
    e2eWorkerDb,
  }) => {
    const adminClient = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      client: adminClient,
      slug: e2eWorkerDb.workspaceSlug,
    });
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await page.goto(`/${e2eWorkerDb.workspaceSlug}/settings/plugins`);
      const card = page.getByRole("region", { name: "Epidemiology" });
      await card.getByRole("button", { name: "Install" }).click();
      await _confirmDialog(page, "Install");
      await expect(card.getByText("Installed", { exact: true })).toBeVisible({ timeout: MEDIUM_WAIT });

      await page.goto(
        `/${e2eWorkerDb.workspaceSlug}/data-explorer?sql=${encodeURIComponent(REGRESSION_SQL)}`,
      );
      await dismissBlockingOverlays(page);
      await expect(page.getByRole("columnheader", { name: /^y$/i })).toBeVisible({ timeout: MEDIUM_WAIT });

      await page.getByRole("button", { name: "Linear regression" }).click();
      const dialog = page.getByRole("dialog", { name: "Linear regression" });
      await dialog.getByRole("button", { name: "Fit regression" }).click();
      await expect(dialog.getByLabel("Slope")).toContainText("2");
      await expect(dialog.getByLabel("Intercept")).toContainText("1");
      await expect(dialog.getByLabel("R²")).toContainText("1");
      await expect(dialog.getByLabel("Rows used")).toContainText("20");
      await page.keyboard.press("Escape");

      await page.goto(`/${e2eWorkerDb.workspaceSlug}/settings/plugins`);
      await card.getByRole("button", { name: "Uninstall" }).click();
      await _confirmDialog(page, "Uninstall");
      await expect(card.getByText("Not installed", { exact: true })).toBeVisible({ timeout: MEDIUM_WAIT });
    } finally {
      // Safety net if the test failed before its own UI uninstall. Removes
      // only the row this test may have created.
      await adminClient
        .from("plugin_installations")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("plugin_id", PLUGIN_ID);
    }
  });
});
```

Check `getWorkspaceIdBySlug`'s signature in `tests/e2e/helpers/supabaseAdminClient.ts`, and match its option names if they differ from `{ client, slug }`.

- [ ] **Step 2: Run it alone**

Run: `pnpm test:e2e plugins-epidemiology-regression.spec.ts`
Expected: PASS within the 45-second local limit. Screenshots on failure land in `test-results/`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/plugins-epidemiology-regression.spec.ts
git commit -m "test(plugins): cover installing epidemiology and fitting a regression

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23: Documentation, translations, and final verification

**Files:**
- Create: `docs/plugin-authoring.md`
- Modify: `CLAUDE.md`, `docs/avandar-packages.md`
- Modify: `src/i18n/locales/*/messages.po` (extracted)

- [ ] **Step 1: Write the authoring guide**

`docs/plugin-authoring.md`:

````markdown
# Authoring a bundled plugin

Bundled plugins live in `plugins/<name>/`, are listed in
`plugins/bundled.yaml`, and are built into the app as lazy chunks. A
workspace pays nothing for a plugin until a settings admin installs it in
Settings → Plugins, and a plugin's code downloads only when someone first
uses it.

Design: `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md` and
`docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`.

## Create one

```bash
ava plugin init case-tools
pnpm install
ava plugin validate case-tools
pnpm dev
```

## Layout

```text
plugins/<name>/
  ava.yaml            the manifest
  package.json        approved dependencies only
  tsconfig.json
  locales/en.json     every user-visible string (other locales optional)
  src/index.tsx       export default definePlugin({ commands: { ... } })
```

## The manifest

`ava.yaml` is strict YAML 1.2 validated by `@avandar/plugin-manifest`.
Unknown keys fail the build.

- **Versions** are quoted strings, for example `version: "0.1.0"`.
- **User-visible strings** are `%key%` references to `locales/en.json`.
- **Icons** are Tabler icon names, for example `trending-up`.

## `when` conditions

A menu entry's `when` decides whether its button shows, without loading
plugin code. A condition is either a single fact comparison, or a combination
of conditions:

- **A fact comparison** names one fact and one operator, for example
  `numericColumnCount: { gte: 2 }`.
- **A combination** wraps other conditions in `all: [...]`, `any: [...]`, or
  `not: ...`.

The available operators are `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, and `in`.
Each slot declares its own facts in `SlotFactRegistry`.

`dataExplorer.toolbar` facts: `hasResult`, `rowCount`, `columnCount`,
`numericColumnCount`, `dateColumnCount`.

## The API

| Member | Purpose | Permission |
| --- | --- | --- |
| `avandar.context` | What the command was invoked on | none |
| `avandar.data.fetchRows(handle, { columns, limit })` | Rows of the invoked-on result. Default 50,000 rows, at most 200,000 | `data:context` |
| `avandar.ui.openModal`, `openDrawer`, `notify` | Show UI built from `@avandar/plugin-ui` | none |
| `avandar.i18n.t(key, values)`, `useT()` | Plugin strings, as ICU messages | none |
| `avandar.workspace` | `{ id, slug, locale }` | none |

Inside plugin UI, read the API with `useAvandar()`.

## Rules

- **Imports.** Import only `@avandar/plugin-sdk`, `@avandar/plugin-ui`, React,
  relative files, and approved packages (`APPROVED_PLUGIN_DEPENDENCIES`).
  ESLint enforces this, so a plugin moves into the sandbox unchanged.
- **Async and serializable.** Every API call is async and passes serializable
  data only.
- **Permissions.** Permissions are declared and shown to admins. Today they are
  not enforced, since bundled plugins run in-process. Enforcement starts with
  the sandbox.
- **Contract plugins.** Never bundle a contract plugin. This repository is
  public.
````

- [ ] **Step 2: Link it and document the packages**

In `CLAUDE.md`, under `## Documentation`, after the line about `docs/design/app-view-layout.md`, add:

```markdown
- How to write a bundled plugin (manifest, `when`, the `avandar` API, import
  rules): `docs/plugin-authoring.md`.
```

In `docs/avandar-packages.md`:

- Add `plugin-manifest/` under `shared/` and `plugin-sdk/` and `plugin-ui/` under `web/` in the layout tree.
- Add one section per package, in the existing format, pointing to its README.

- [ ] **Step 3: Extract translations**

```bash
pnpm i18n:extract
pnpm i18n:compile
```

Expected: new host strings ("Plugins", "Install", the status labels, and others) appear in `src/i18n/locales/*/messages.po`. Do not hand-edit the compiled `messages.ts` files.

- [ ] **Step 4: Full verification**

```bash
pnpm format
pnpm lint
pnpm type-check
pnpm test:frontend
pnpm --filter "./packages/**" test
pnpm --filter @avandar/ava-cli test
pnpm verify:packages
ava supabase status
pnpm test:db
pnpm check:plugin-bundle
pnpm test:e2e plugins-epidemiology-regression.spec.ts
```

Expected: every command passes. `verify:packages` builds, packs, and publint-checks the three new private packages along with the existing ones. Report any failure with its output. Do not mark the slice done with a red check.

- [ ] **Step 5: Commit**

```bash
git add docs/plugin-authoring.md CLAUDE.md docs/avandar-packages.md src/i18n/locales
git commit -m "docs(plugins): add the plugin authoring guide and package docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Leave the database switch for the user**

Do not run `ava supabase restore` and do not merge. Tell the user that the branch is ready for review, and that they are responsible for running `ava supabase restore` when they finish validating it.
