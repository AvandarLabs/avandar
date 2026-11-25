# Avandar Packages

Reference for every workspace package under `packages/`. Each entry lists
the package name, location, intended runtime, what it provides, and a
pointer to its README for full API docs.

The repo is a pnpm workspace. Internal packages reference each other via
`workspace:*` and are published under the `@avandar/*` scope. Path imports
within each package use the `@<package>/...` alias (e.g. `@utils/...`,
`@clients/...`) wired up in each `tsconfig.json`.

## Layout

```
packages/
├── node/
│   └── etl/      # Node-only: ETL pipelines + DuckDB wrapper
├── shared/
│   ├── clients/      # Typed CRUD client primitives (Supabase + generic)
│   ├── logger/       # Browser logger + module mixin
│   ├── models/       # `Model` discriminated-data primitives
│   ├── modules/      # Composable object modules (replaces class hierarchies)
│   ├── plugin-manifest/  # Plugin manifest schema, ava.yaml compiler, `when` evaluator
│   └── utils/        # General-purpose TypeScript utilities
└── web/
    ├── hooks/        # React hooks (state + react-query wrappers)
    ├── plugin-sdk/   # The API plugins are written against
    ├── plugin-ui/    # The components plugin UI may render
    └── ui/           # React components, styled on top of Mantine
```

`shared/*` packages run in both the browser and Node. `node/*` is
Node-only. `web/*` is browser-only and React-aware.

## Dependency direction

The packages form a layered graph; lower layers know nothing about higher
layers.

```
                            web/ui  web/hooks
                              │        │
                              └────┬───┘
                                   │
                             shared/clients
                                   │
                          ┌────────┼─────────┐
                          │        │         │
                    shared/models  │   shared/logger
                                   │         │
                            shared/modules   │
                                   │         │
                              shared/utils ──┘

                            node/etl ── shared/modules, shared/utils
```

---

## `@avandar/utils` — `packages/shared/utils`

General-purpose TypeScript utilities with no business logic. Tree-shakeable
exports grouped into arrays, asserts, dates, numbers, strings, filters,
guards, maps, objects (operations + case conversion + deep transforms +
higher-order curried variants), and miscellaneous helpers (`identity`,
`noop`, `pipe`, `sleep`, `traverse`). Also exports common types (`UUID`,
`Brand`, `UnknownObject`, etc.) and utility types.

Runtime dependencies are deliberately minimal (`dayjs`, `ts-pattern`,
`type-fest`).

See [`packages/shared/utils/README.md`](../packages/shared/utils/README.md)
for the full export list.

---

## `@avandar/modules` — `packages/shared/modules`

Library for building composable object modules in place of class
hierarchies. Exports `createModule`, `createModuleFactory`, and a
`withNewMembers` mixin helper, plus the `Module` and `ModuleFactory`
types.

Every other Avandar package (logger, clients, ETL) builds its primitives
as modules so they compose uniformly and stay immutable.

See [`packages/shared/modules/README.md`](../packages/shared/modules/README.md).

---

## `@avandar/models` — `packages/shared/models`

Lightweight primitives for representing typed, discriminated data models.
The package exports a single `Model` object whose helpers (`make`,
`match`, `getTypedId`, `isModel`, `isOfModelType`, `valIsOfModelType`)
and types (`Model.Base`, `Model.Versioned`, `Model.Type`, `Model.TypedId`)
center on a `__type` string discriminator.

The convention is what makes `@avandar/clients` and `@avandar/hooks` able
to auto-generate parsers, CRUD methods, and React Query hooks against any
model.

See [`packages/shared/models/README.md`](../packages/shared/models/README.md).

---

## `@avandar/logger` — `packages/shared/logger`

Avandar's logging library. Provides `createWebLogger`, a styled browser
logger with caller tracing and immutable configuration, and `withLogger`,
a `@avandar/modules` mixin that attaches a scoped, disabled-by-default
logger to any module (enabled with `MyModule.withLogger()`).

A Node.js logger is planned but not yet implemented.

See [`packages/shared/logger/README.md`](../packages/shared/logger/README.md).

---

## `@avandar/clients` — `packages/shared/clients`

Typed CRUD client primitives. Provides:

- `createServiceClient` — the base named-module primitive.
- `createModelCrudClient` — generic CRUD client (`getById`, `getAll`,
  `getPage`, `insert`, `update`, `delete`, etc.) decoupled from any
  particular data store.
- `createSupabaseCrudClient` / `withSupabaseClient` — concrete Supabase
  implementation that reads table-name-aware DB types from a registered
  `Database` type.
- `makeParserRegistry` — builder for translating between DB and frontend
  model variants (validates `DBRead` rows via Zod and strips unknown keys
  on insert/update).
- `Register` — declaration-merging interface that consumers augment to
  register their Supabase `Database` type.

The interface is shaped so that `@avandar/hooks`' `withQueryHooks` can
auto-generate `useQuery` / `useMutation` hooks for every method on a CRUD
client.

See [`packages/shared/clients/README.md`](../packages/shared/clients/README.md).

---

## `@avandar/hooks` — `packages/web/hooks`

React hooks for the Avandar web app. Despite the directory name, it is
published as `@avandar/hooks`.

Contents:

- `useBoolean`, `useToggleBoolean` — small boolean-state hooks.
- `useQuery`, `useMutation` — wrappers around `@tanstack/react-query` that
  add tuple return shapes, default error notifications, and convenience
  options for invalidating/refetching queries after mutations.
- `withQueryHooks(client, { queryFns, mutationFns })` — augments any
  `@avandar/clients` service client with auto-generated `use<Name>` hooks,
  a `QueryKeys` builder map, and a `withCache(queryClient)` wrapper for
  using the same cache from route loaders.
- Forwarded `DefaultError`, `QueryClient`, `QueryKey` from Tanstack.

See [`packages/web/hooks/README.md`](../packages/web/hooks/README.md).

---

## `@avandar/ui` — `packages/web/ui`

Shared React UI components built on Mantine with Avandar design defaults.

Components: `ActionIcon`, `Tooltip`, `EditIconButton`,
`EditableDisplayText`, `ObjectDescriptionList`, `Select` (with the
`makeSelectOptions` helper and `SelectData`/`SelectOption` types).

Notifications: `notifySuccess`, `notifyError`, `notifyWarning`,
`notifyExpiredSession`, plus the dev-only `notifyNotImplemented` and
`notifyDevAlert`.

Has a secondary `@avandar/ui/hooks` entry point that currently exposes
`useCheckTruncatedText`.

See [`packages/web/ui/README.md`](../packages/web/ui/README.md).

---

## `@avandar/plugin-manifest` - `packages/shared/plugin-manifest`

The plugin manifest toolkit. Provides the strict Zod schema for a plugin's
`ava.yaml`, `compileManifest` (strict YAML 1.2 parsing plus the locale string
checks), the `when` condition evaluator, the slot fact registry, the approved
npm dependency list, and a Node-only reader for plugin folders. It has three
entry points: `@avandar/plugin-manifest` for build tools and the CLI,
`@avandar/plugin-manifest/runtime` for browser code (no Zod or YAML at
runtime), and `@avandar/plugin-manifest/node` for the folder readers.

Private (`"private": true`): not published to npm. Runtime
dependencies are `yaml` and a `zod` peer.

See [`packages/shared/plugin-manifest/README.md`](../packages/shared/plugin-manifest/README.md).
To write a plugin with it, see [`docs/plugin-authoring.md`](plugin-authoring.md).

---

## `@avandar/plugin-sdk` - `packages/web/plugin-sdk`

The API Avandar plugins are written against. Exports `definePlugin` and
`isPluginDefinition`, the `avandar` API types (`AvandarApi`, the invocation
context, `QueryHandle`, `fetchRows` options and result), the chart type types
(`PluginVizDefinition`, `PluginChartSpec`, and the input and props a chart
receives), `PluginError`, `makePluginTranslator` (ICU messages with locale
fallback), and the React `AvandarProvider`, `PluginVizProvider`, `useAvandar`,
and `useT` for plugin UI and plugin charts. Every call is async or
fire-and-forget and passes serializable data.

Private (`"private": true`): not published to npm. It depends
on Lingui's core and message compiler, with `react` as a peer.

See [`packages/web/plugin-sdk/README.md`](../packages/web/plugin-sdk/README.md).

---

## `@avandar/plugin-ui` - `packages/web/plugin-ui`

The components plugin UI may render. Re-exports a small set of Mantine
components (`Alert`, `Badge`, `Button`, `Divider`, `Group`, `Loader`,
`NumberInput`, `SegmentedControl`, `Select`, `SimpleGrid`, `Stack`, `Table`,
`Text`, `TextInput`, `Title`). Its `@avandar/plugin-ui/charts` entry
re-exports a curated set of Recharts components plus `useChartTheme`, for
plugin chart components.
Plugins import UI only from this package, which keeps their code independent
of the host's component library.

Private (`"private": true`): not published to npm. It has
`@mantine/core`, `react`, and `recharts` as peers.

See [`packages/web/plugin-ui/README.md`](../packages/web/plugin-ui/README.md).

---

## `@avandar/etl` — `packages/node/etl`

Node.js ETL toolkit. Two units:

- `EtlEngine` — module factory for 3-step Extract → Transform → Load
  pipelines whose intermediate output is CSV on disk under
  `etl-output/<pipeline>/<runId>/{extract,transform,load}/`. The engine
  handles CSV-to-ZSTD-Parquet conversion between transform and load.
  Static helpers (`storeExtractedData`, `getLoadParquetPathForTable`,
  `uploadParquetToStorage`) cover common pipeline operations including
  upload to Supabase Storage.
- `NodeDuckDb` — thin wrapper around the `duckdb` native bindings for raw
  SQL, CSV sniffing, view creation, Parquet export, and Parquet
  summarisation. The ETL engine uses it internally; you can use it
  directly outside the pipeline.

Also exports the supported `DuckDbSniffableDataType` union and the
`ETL_PATHS_ROOT_ENV` / path-helper utilities used to control where pipeline
data is materialised.

See [`packages/node/etl/README.md`](../packages/node/etl/README.md).
