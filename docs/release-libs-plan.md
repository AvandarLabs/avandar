# Releasing `packages/*` to npm

Working plan. Ten packages ship to npm under the `@avandar` scope, MIT
licensed, lockstep-versioned at `0.1.0`, independent of the app version.

## Locked decisions

| Decision | Choice |
| --- | --- |
| Versioning | Lockstep (Changesets `fixed` mode), independent of app version |
| Start version | `0.1.0` for all packages |
| License | MIT per package; repo and app stay CPAL-1.0 |
| Registry access | Public |
| Module format | ESM only |
| Build | `tsup` (`--format esm --dts`); Vite library mode for `@avandar/ui` |
| Entry points | One general entry per package. A second entry only for a genuinely different concern (`utils/encoding`, `utils/sql`, `ui/hooks`, `models/zod`). Never a subpath mirroring an internal folder. |
| Local dev | `workspace:*` + `exports` -> `src`, `publishConfig.exports` -> `dist` |
| Peer deps | Anything whose objects cross the API boundary (React, Mantine, react-query, supabase-js, duckdb) |
| React | `^19` |

### Architecture rule

The dependency arrow runs one way and never reverses:

    src/ + apps/  ->  shared/  ->  packages/

- `packages/` is generic, reusable, Avandar-agnostic. Publishable.
- `shared/` is business logic shared across apps and runtimes (Vite app,
  Deno edge functions, desktop). Not publishable.
- `src/` is the Vite web app specifically.

A package under `packages/` may never import from `shared/`, `src/`, or
`apps/`. `@avandar/clients` violated this until Phase 7; the rule now holds
across all ten packages.

## Entry-point surface

Gap measured across all declared entry points, counting only imports from
*outside* each package (a package's own internal deep imports never need to be
public). Resolved in Phase 2:

| Package | Entries | Exported | External deep-imports | Was missing |
| --- | --- | --- | --- | --- |
| `utils` | 3 | 177 | 73 | `objectFilter` |
| `clients` | 1 | 22 | 8 | `RegisteredSupabaseDatabase` |
| `models` | 2 | 1 | 1 | none |
| `modules` | 1 | 8 | 4 | none |
| `logger` | 1 | 4 | 2 | none |
| `ui` | 2 | 46 | 1 | none |
| `hooks` | 1 | 21 | 2 | none |
| `browser-utils` | 1 | 8 | 0 | none |

The barrels were already near-complete. Both gaps are now closed.

## Progress

- Phase 1 Licensing — **done**
- Phase 2 `utils` public surface — **done**
- Phase 3 `@avandar/query-hooks` — **done**, `ui` <-> `hooks` cycle broken,
  40 tests added (the query layer had none before)
- Phase 4 Alias to package-name imports — **done**, 112 sites across 51 files
- Phase 5 Dependency graph cleanup — **done**
- Phase 5b i18n decoupling — **done**, `packages/` is now framework-free
- Phase 6 Build — **done**, all 10 packages building and validated
- Phase 7 `clients` dependency inversion — **done**, `packages/` no longer
  imports from `shared/`, `src/`, or `apps/`
- Phase 8 Release infrastructure — **done**, nothing published. See
  `docs/releasing-packages.md` for the runbook and the one-time `NPM_TOKEN`
  setup that is still outstanding
- Phase 9 Repo-wide alias migration — **done**, 622 statements across 418
  files outside `packages/`. See "Phase 9" below

All 10 built packages pass `publint` ("All good!") and `attw` with every entry
green for `node16 (from ESM)` and `bundler`, and zero internal-resolution or
masquerading problems. `node10` and `require`-from-CJS notes are expected: the
packages are deliberately ESM-only.

### `ava-etl`: annotate concrete module exports

`Accessors.set()` is typed with type-fest's `Paths<State>`, so letting
TypeScript infer the type of a concrete `createModule` value forces it to
serialise that generic during declaration emit. That failed three ways at once
(`TS2527` inaccessible unique symbol, `TS2742` non-portable path into
`type-fest/source/internal`, `TS7056` inferred type too long). Naming the type
keeps the emitted declaration pointing at `@avandar/modules` exports:

```ts
export type EtlEngineApi = ModuleFactory<IEtlEngine> & {
  storeExtractedData: typeof storeExtractedData;
  // …
};
export const EtlEngine: EtlEngineApi = Object.assign(EtlEngineFactory, { … });
```

Any package exporting a concrete `createModule` value may need the same
treatment. `clients` turned out not to, despite the prediction. `logger` escapes it only because it exports
functions and named types rather than a module instance.

### `ui`: Vite for JS and CSS, tsup for declarations

Neither tool can do both halves:

- esbuild (so tsup) mishandles CSS modules — it emitted selectors globally and
  handed the JS an empty class-name object, rendering components unstyled.
- `vite-plugin-dts` cannot roll declarations up: `rollupTypes` supports only a
  single entry and this package has two. Unrolled declarations import each
  other with extensionless specifiers, which `node16` resolution rejects (56
  files, 39 such imports, and `attw` failed both entries).

So `build` runs `vite build && tsup`, with tsup in `dts: { only: true }` mode.
Result: 3 declaration files, and the one cross-entry import carries a `.js`
extension, so `node16 (from ESM)` and `bundler` are both green.

### Phase 6 status

All ten build and validate. Eight use tsup (ESM only, bundled `.d.ts`,
sourcemaps); `ui` uses Vite for JS/CSS plus tsup for declarations.

Three needed specific fixes, each written up below: `models` (declaration
bundler vs the namespace merge), `ava-etl` (explicit type annotation), and
`clients` (the `$/` leak, resolved in Phase 7).

### The model namespace pattern (keep it)

The pattern is: implementation in one file, types in another, both merged under
a single name so consumers write `import { Dashboard } from "..."` and then use
`Dashboard.T` and `Dashboard.someFunc()`. This is idiomatic TypeScript
declaration merging and should be kept.

Only one syntactic detail broke the declaration bundler: exporting the value as
an **aliased re-export**. `rollup-plugin-dts` cannot reconcile
`export { X as Y } from "..."` with `export namespace Y`. A locally declared
`const` merges fine:

```ts
// before — breaks the declaration build
export { ModelModule as Model } from "./ModelModule.ts";

// after — builds, identical public API
import { ModelModule } from "./ModelModule.ts";
export const Model = ModelModule;
```

The `export namespace Model { ... }` block is unchanged. Verified from a clean
consumer installing the packed tarball: `Model.Base<…>` / `Model.TypedId<…>`
(types) and `Model.make(…)` (value) all resolve from one import, and the
runtime call returns `{"__type":"User","name":"Ada"}`.

Both eslint disables are still required: `import-x/export` still sees two
exports named `Model`, and `no-namespace` still applies.

`shared/models/*` has about a dozen files using the aliased form. They are not
built or published, so they work as-is; apply the same one-line change only if
those ever move into `packages/`.

### `ui` builds with Vite, not tsup

tsup/esbuild produced a **silently broken** artifact: every `.module.css`
selector was emitted globally (so the two files that both define `.root`
collided) while the JS received an empty class-name object
(`var ActionIcon_default = {}`), meaning every component rendered unstyled.
Neither `loader` nor `esbuildOptions` fixed it. Vite scopes CSS modules
correctly (`._root_1rvy6_1` vs `._root_30x46_1`) and extracts one stylesheet,
published as `@avandar/ui/styles.css`.

### Verifying the published artifact

Local dev never exercises the published `exports`, so builds must be validated
against a real tarball. Two things this caught:

1. `@avandar/utils` shipped an `import type ... from "zod"` at the top of
   `index.d.ts` because `ZodSchemaEqualsTypes` sat in the root barrel. Any
   consumer without zod failed to type-check. Fixed by moving it to a
   `@avandar/utils/zod` entry with zod as an optional peer, mirroring the
   `@avandar/models/zod` precedent.
2. `import.meta.env.DEV` in `ava-query` is a Vite-only global. Outside Vite
   `import.meta.env` is `undefined`, so reading `.DEV` throws at runtime.
   Replaced with a defensive `isDevBuild()` that treats unknown as production.

**`attw` must run against the pnpm-produced tarball, not `--pack`.**
`--pack` shells out to `npm pack`, which does not apply `publishConfig`, so it
reports total resolution failure for a package that is actually fine.
`node10` and `require`-from-CJS failures are expected and intended: these are
ESM-only packages.

### i18n decoupling (Phase 5b)

`@avandar/ui` depended on Lingui, which is an adoption blocker: an i18n
framework is an app-level singleton, so the dependency would force every
consumer onto Lingui. Lingui macros compile to `i18n._(id)` calls, so consumers
would also need our message IDs in their catalogs.

Replaced with the dictionary-via-provider pattern used by MUI (`localeText`),
Ant Design (`ConfigProvider locale`), and AG Grid (`localeText`):

- `AvandarUIProvider` takes an `i18nMessages` prop, `Partial<I18nMessages>`,
  merged over English defaults. Mounting it is optional.
- Interpolated strings are functions, not templates, so translators control
  word order.
- The app binds Lingui to that contract in exactly one place
  (`src/components/providers/AvandarUiProvider.tsx`), so Lingui stays an app
  dependency and its extractor still sees the `t` macros.

The notification modules moved to `src/lib/notifications/`, since they are
app concerns (they own a Mantine `Notifications` instance) rather than UI
primitives.

That forced a matching change in `@avandar/query-hooks`, whose `useMutation`
imported `notifyError` from `@avandar/ui`. It now takes an injected reporter
via `AvaQueryProvider onError`, defaulting to `console.error`. `ava-query` no
longer depends on `@avandar/ui` or `@mantine/notifications` at all, so the
graph edge `ava-query -> ui` is gone.

### The catalog is now the fix for a recurring class of bug

Three separate forks appeared as packages gained their own declarations, each
breaking the build in a different way:

| Package | Forked into | Failure |
| --- | --- | --- |
| `react` | 19.2.4 / 19.2.5 | "Invalid hook call" at runtime |
| `type-fest` | 5.4.4 / 5.6.0 | `Paths` did not satisfy `_Paths` |
| `zod` | 4.3.6 / 4.4.3 | `ZodObject` did not match `ObjectDBReadSchema` |

The cause is always the same: a new declaration re-resolves independently while
the existing lockfile entry stays put, so one specifier becomes two versions.
The catalog gives every importer one specifier. It now covers React, the
structural-type packages, the runtime singletons (`@mantine/*`,
`@tanstack/react-*`, `@supabase/supabase-js`), and the shared toolchain.

**Rule: any dependency declared by two or more workspace packages belongs in
the catalog**, and `peerDependencies` must never reference `catalog:`, because
pnpm expands it on publish and would pin consumers to our exact version.

### Package dependency graph (verified acyclic)

    utils, browser-utils, hooks   (leaves, no internal deps)
    models     -> utils
    modules    -> utils
    logger     -> modules
    clients    -> utils, logger, modules
    ava-etl    -> utils, modules
    ui         -> utils, browser-utils, hooks
    ava-query  -> utils, clients, ui

### Second architecture violation found and fixed (Phase 5)

Three `@avandar/ui` components imported `useForm` from `@/lib/hooks/ui/useForm`,
that is, from the Vite app. Same class as the `$/` leak fixed in Phase 2 and an
outright blocker for publishing `ui`. `useForm` is generic Mantine-form
infrastructure with no business logic, so it moved to
`packages/web/ui/src/hooks/useForm/` and is exported from the `@avandar/ui/hooks`
entry. 16 consumers updated.

`packages/` is now free of `@/` imports. Only `clients` still reaches into
`$/`, which is Phase 7.

### Suppressing a React Doctor diagnostic

React Doctor honours inline suppressions by default (`--no-respect-inline-disables`
turns them off for an audit). The eslint-style form is:

    // react-doctor-disable-next-line <rule-name>

`react-doctor why <file>:<line>` explains why a rule fired, or why a
suppression failed to apply. Rule-wide alternatives live in `doctor.config.ts`
via `react-doctor rules disable|set <rule> <severity>`; prefer the inline
comment for a one-off false positive so the rule keeps running everywhere else.

### Singleton dependency catalog (added during Phase 3)

Creating `ava-query` exposed a latent bug. `packages/web/*` declared
`react: ^19.0.0` while the root declared `^19.2.0`, so pnpm resolved two
Reacts (19.2.4 and 19.2.5). Once `@tanstack/react-query` bound to the second
copy, every app test rendering a query hook threw "Invalid hook call".

Fixed with a pnpm `catalog:` in `pnpm-workspace.yaml` pinning `react` and
`react-dom` to one exact version, referenced by the root and by every
`packages/web/*` devDependency. `peerDependencies` stay a broad `^19.0.0`,
which is the correct split: broad for consumers, exact for local dev.

Any dependency carrying context or module identity belongs in this catalog.
Phase 5 should extend it to `@mantine/*` and `@tanstack/react-query`.

## Phases

### Phase 1 — Licensing

- Add an MIT `LICENSE` to each package directory.
- Set `"license": "MIT"` in each package `package.json`.
- Root `LICENSE` stays CPAL-1.0; note the split in the root README.

### Phase 2 — `utils` public surface

- Move `camelToTitleCase` from `shared/lib/strings/transformations` into
  `packages/shared/utils/src/strings/`, removing the last `$/` leak in `ui`.
- Update callers.
- Resolve the 16 + 6 + 3 barrel gaps.

### Phase 3 — `@avandar/query-hooks`

Breaks the `ui` <-> `hooks` cycle.

- Create `packages/web/query-hooks`.
- Move `useMutation`, the `useQuery` wrappers, and `withQueryHooks` out of
  `hooks` into it. These are the members that reach into `@ui/notifications`
  and `@clients`.
- After the move: `ui -> hooks` remains, `hooks -> ui` is gone, and
  `ava-query -> {ui, hooks, clients}` is a clean leaf.
- Verify no cycle remains.

### Phase 4 — Alias to package-name imports

- Add `workspace:*` dependency edges between packages.
- Rewrite the 108 cross-package import sites inside `packages/` from
  `@utils/...` style aliases to `@avandar/utils` style package names.
- Leave the app's own alias usage alone for now; both resolve correctly.
  Repo-wide migration is a follow-up. **Done in Phase 9.**

### Phase 5 — Dependency graph cleanup

- Declare every dependency each package actually imports. Current gaps:
  `modules` (type-fest), `clients` (zod, ts-pattern), `hooks`
  (@tanstack/react-query, @mantine/notifications), `ui` (@lingui/core,
  ts-pattern, type-fest).
- Apply the peer/dependency split. Notably move `react`, `react-dom`, and
  `@mantine/*` out of `ui`'s `dependencies` into `peerDependencies`, and make
  `@supabase/supabase-js` and `duckdb` peers.
- Mirror every peer into `devDependencies` so local dev and tests resolve.
- Remove package-owned dependencies from the root `package.json`, keeping only
  what the Vite app itself uses.

### Phase 6 — Build

- `tsup` config per package; Vite library mode for `ui` (CSS modules +
  `postcss-preset-mantine`), bundling to `dist/style.css`.
- Per package: `publishConfig.exports` -> `dist`, `files`,
  `sideEffects: false` (except `ui`), `repository`, `homepage`,
  `prepublishOnly`.

### Phase 7 outcome

`ServerApiClient/` moved wholesale to `shared/ServerApiClient/`. All five files
leaked (`AvaSupabase`, `callIpc`, `ServerApiContracts`, `isDesktop`,
`ServerApiClient.types`) because the module is Avandar's own RPC surface, not a
reusable primitive. Its 8 tests moved with it and now run under
`test:frontend`, which is why `clients` went 29 -> 21 tests and the frontend
suite went 941 -> 949.

`createSqliteCrudClient` was inverted. Its coupling turned out to be narrow:
`callIpc(RdbContracts.query|run, { sql, params })` and nothing else. That is
now a `SqliteTransport` interface with two methods, injected by the caller. The
Avandar implementation lives at `shared/RdbCrudClient/ipcSqliteTransport.ts`
and is wired in by `createRdbCrudClient`.

Two side benefits:

- The Sqlite tests dropped a 70-line fake IPC bridge (which patched a
  module-level global via `__setIpcBridgeForTests`) in favour of two `vi.fn()`
  spies. Injecting a dependency is simply easier to test than patching one.
- `@avandar/clients` now works against any SQLite backend, not just Electrobun
  IPC.

The predicted `EtlEngineApi`-style annotation was **not** needed here;
`clients` builds without it.

### `Register` augmentation, and a zod leak it exposed

`Register.types.ts` documents how consumers register their Supabase `Database`
type. Its example told them to `declare module "@clients/Register.types.ts"`,
an internal alias that does not exist outside this repo. It now says
`declare module "@avandar/clients"`.

That works only because declarations are bundled: `Register` ends up genuinely
*declared* in `dist/index.d.ts` rather than re-exported from another module, so
the augmentation merges. Verified against the packed tarball from a clean
consumer, with a negative control — removing the augmentation makes
`RegisteredSupabaseDatabaseTableNames` fall back to `string` and TypeScript
reports an unused `@ts-expect-error`, so the check genuinely discriminates.

Testing that surfaced a ship-blocking bug: the published `index.d.ts` opens
with `import { z } from 'zod'`, so any consumer without zod failed to
type-check. This is the same class of leak fixed in `utils`, but the remedy
differs. In `utils`, zod was incidental to one type and moved to a `./zod`
subpath. In `clients` zod is intrinsic — `makeParserRegistry` is built on it
and `ModelCrudParserRegistry` is a parameter of every CRUD client — so
splitting it out would be artificial. `zod` is now a **required** peer
dependency (`peerDependenciesMeta.optional` removed), which is the honest
description of the package.

### Phase 7 — `clients` dependency inversion

The last build blocker: declaration emit currently follows `clients` into
`shared/db/supabase/AvaSupabase.ts` through the `$/` leak.

Move to `shared/` (Avandar-specific business logic):

- `AvaSupabase`
- the `ServerApiClient` contracts
- `Register.types.ts` / `RegisteredSupabaseDatabase`
- `createBrowserServerApiClient`, `createIpcServerApiClient`
- `ServerApiSessionRefresher`

Keep in `packages/shared/clients`, parameterized:

- `ModelCrudClient`, `makeParserRegistry`
- `createSupabaseCrudClient`, taking an injected `SupabaseClient`
- `createSqliteCrudClient`, taking an injected transport rather than importing
  `callIpc`
- `ServiceClient` / `createServiceClient` and the mixins

Expect the `EtlEngineApi`-style explicit annotation to be needed here too:
`clients` exports concrete `createModule` values.

### Phase 8 — Release infrastructure (last phase before publishing)

Deliberately last. It is the final gate: every package must already build and
validate before wiring up anything that can actually publish.

- Changesets in `fixed` mode covering all `@avandar/*` packages.
- `publint` + `arethetypeswrong` in CI **against the pnpm-produced tarball**,
  not `attw --pack` (which shells out to `npm pack` and ignores
  `publishConfig`, reporting total resolution failure for a healthy package).
- Release workflow with `NPM_TOKEN` and npm provenance.
- Add `@avandar/*` to `minimumReleaseAgeExclude` so the 3-day supply-chain
  cooldown does not block our own fresh publishes.
- First publish at `0.1.0`, then consume the packages from a scratch project
  outside the monorepo to confirm resolution and types.

### Phase 9 — Repo-wide alias migration

Everything outside `packages/` now imports the published package names.
`packages/` themselves are unchanged: a package still uses its own `@name/...`
alias for its internal imports, and `@avandar/*` for cross-package imports.
That split is deliberate, and it is why the legacy aliases stay in
`tsconfig.base.json` and `vite.config.ts` rather than being deleted.

**Deep imports collapse to the barrel.** `@utils/objects/getValue/getValue.ts`
became `@avandar/utils`, because the exports map deliberately publishes only
`.` plus a few real subpaths. The alternative — a `"./*": "./src/*"` wildcard —
would publish the entire internal file tree as public API and make every
internal file a breaking-change surface. Only imports landing on a genuinely
declared subpath (`utils/encoding`, `utils/sql`, `utils/zod`, `models/zod`,
`ui/hooks`) kept a subpath.

Two barrel gaps surfaced and were closed: `clients` was missing
`AnySupabaseCrudModelSpec` and `SupabaseCrudClient`.

**Deno needs explicit entries.** Edge functions have no pnpm workspace links,
so every `deno.json` (root, all 13 per-function configs, and the
`newEdgeFunction` template) maps each package name straight to source. Each
declared subpath needs its own entry: a trailing-slash prefix map would
resolve `@avandar/utils/sql` to a directory, which Deno will not load.

This fixed a pre-existing breakage. `deno check` was already failing before
this phase, because `shared/` imported bare `@clients`, the import maps only
had the `@clients/` prefix form, and Deno rejects `@clients` as an npm
package name.

**The `no-restricted-imports` rule was inverted.** It used to ban bare
`@utils`-style imports in Deno-allowable code, since only the prefix form
resolved. Bare package names now resolve, so the rule instead bans the five
packages that have no Deno mapping and never should: `ava-etl`, `ava-query`,
`browser-utils`, `hooks`, and `ui`.

Two `vi.mock()` calls in `DashboardEditorView.test.tsx` pointed at
`@ui/notifications/*`, which does not exist — the app has its own
`src/utils/notifications/notify`. They were inert and are now removed.

## Verification gate

Each phase ends green on:

    pnpm type-check
    pnpm test
    pnpm lint

plus, for any package whose build changed: `pnpm build`, `publint`, and `attw`
against the packed tarball.
