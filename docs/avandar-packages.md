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
│   └── utils/        # General-purpose TypeScript utilities
└── web/
    ├── hooks/        # React hooks (state + react-query wrappers)
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
