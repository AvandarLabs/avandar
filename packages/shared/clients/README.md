# @avandar/clients

Typed CRUD client primitives. Provides:

- A base `ServiceClient` module — the lowest-level client primitive (just a
  named module). All other client builders extend it.
- A generic `ModelCRUDClient` — a database-agnostic CRUD client for any
  data model. Defines the standard interface (`getById`, `getAll`,
  `getPage`, `insert`, `update`, `delete`, etc.) that `@avandar/hooks`'
  `withQueryHooks` knows how to wrap.
- A `SupabaseCRUDClient` — a concrete Supabase implementation of the
  generic CRUD client, with table-name-aware types pulled from a registered
  database type.
- A `makeParserRegistry` builder for translating between database row
  variants and frontend model variants.
- A `Register` interface that downstream consumers augment to register
  their Supabase `Database` type.

This package separates *what a model client does* (CRUD operations) from
*where the data lives* (Supabase, an HTTP API, an in-memory store, etc.).

## Usage

```ts
import {
  createServiceClient,
  createSupabaseCRUDClient,
  makeParserRegistry,
} from "@avandar/clients";

// Register your Supabase Database type once, anywhere in the codebase
declare module "@avandar/clients" {
  interface Register {
    supabaseDatabase: Database;
  }
}

const userParsers = makeParserRegistry<UserCRUDSpec>().build({
  modelName: "User",
  DBReadSchema: UserDBReadSchema,
  fromDBReadToModelRead: (db) => ({ id: db.id, name: db.full_name }),
  fromModelInsertToDBInsert: (m) => ({ full_name: m.name }),
  fromModelUpdateToDBUpdate: (m) => ({ full_name: m.name }),
});

const UserClient = createSupabaseCRUDClient({
  modelName: "User",
  tableName: "users",
  dbTablePrimaryKey: "id",
  parsers: userParsers,
  dbClient: supabase,
});

const users = await UserClient.getAll();
const user = await UserClient.getById({ id: "..." });
```

---

## Service client

The base building block. Every client in this package is composed on top of
a `ServiceClient`.

### `createServiceClient(clientName)`

Creates a named `@avandar/modules` module with a single member,
`getClientName()`. By convention `clientName` ends in `"Client"`.

| Type            | Description                                              |
| --------------- | -------------------------------------------------------- |
| `ServiceClient` | The module type returned by `createServiceClient`        |

---

## Model CRUD client

A database-agnostic CRUD client for any model. Implementers provide the
low-level `crudFunctions` (one function per CRUD operation, working in
"DB" types) and parsers (converting between DB and frontend model types).
The client exposes a high-level surface in frontend model types.

### `createModelCRUDClient(options)`

Builds a `ModelCRUDClient<M>`.

| Option                  | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| `modelName`             | Model name (used to brand the client and log lines)                               |
| `parsers`               | A parser registry from `makeParserRegistry`                                       |
| `crudFunctions`         | The implementation of each CRUD operation against the data store                  |
| `defaultGetAllBatchSize`| Page size used by `getAll` to paginate (default `500`)                            |
| `additionalQueries`     | Extra query functions merged into the client; eligible for auto-generated hooks   |
| `additionalMutations`   | Extra mutation functions merged into the client; eligible for auto-generated hooks |

The returned client exposes the following methods (all return promises):

| Method                   | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `getById({ id })`        | Single read by primary key. `id` may be nullish (returns `undefined`) |
| `getCount({ where? })`   | Total row count matching the filter                               |
| `getPage({ where?, pageSize, pageNum })` | One page of rows plus pagination metadata         |
| `getAll({ where?, batchSize? })`         | All rows, internally paginated                    |
| `getOne({ where? })`     | First row matching the filter                                     |
| `insert({ data, upsert?, onConflict? })` | Insert (or upsert) a single row                   |
| `bulkInsert({ data[], ... })`            | Insert (or upsert) many rows                      |
| `update({ id, data })`   | Update a single row                                               |
| `delete({ id })`         | Delete a single row                                               |
| `bulkDelete({ ids[] })`  | Delete many rows                                                  |
| `parsers`                | The parser registry                                               |
| `crudFunctions`          | The raw CRUD functions, in case direct DB-type access is needed   |

### Types

| Type                          | Description                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| `CRUDModelSpec`               | Generic spec: `modelName`, `modelPrimaryKeyType`, plus `DBRead`/`DBInsert`/`DBUpdate` and `Read`/`Insert`/`Update` shapes |
| `ModelCRUDClient<M>`          | The full client surface for a given `CRUDModelSpec`                        |
| `ClientReturningOnlyPromises` | Record shape required for `additionalQueries` and `additionalMutations`    |
| `UpsertOptions`               | `{ upsert?, onConflict? }` shared by `insert` / `bulkInsert`               |

---

## Supabase CRUD client

A concrete CRUD client backed by Supabase. Reads `DBRead`/`DBInsert`/
`DBUpdate` from the database type registered through the `Register`
interface, so callers only need to declare frontend model types.

### `createSupabaseCRUDClient(options)`

| Option              | Description                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `modelName`         | Model name                                                                                 |
| `tableName`         | Supabase table name (typed against the registered database)                                |
| `dbTablePrimaryKey` | Primary key column name (typed against the table row)                                      |
| `parsers`           | Parser registry from `makeParserRegistry`                                                  |
| `dbClient`          | A `SupabaseClient<RegisteredSupabaseDatabase>` instance                                    |
| `queries?`          | Builder that returns extra promise-returning query functions; receives `dbClient`, parsers, logger |
| `mutations?`        | Builder that returns extra promise-returning mutation functions; same arguments            |

The returned client extends `ModelCRUDClient` with `setDBClient(newClient)`
for swapping out the underlying Supabase client (used to seed data with an
admin client during tests).

### `withSupabaseClient(client, initializer)`

Lower-level helper used internally to attach a `setDBClient` method to any
`ServiceClient`. Exposed in case you need to build a Supabase-aware client
without using the full CRUD machinery.

### Types

| Type                  | Description                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| `SupabaseCRUDModelSpec` | Wrapper that derives DB types from the registered Supabase `Database`  |
| `WithSupabaseClient`  | A `ServiceClient` augmented with `setDBClient`                           |

---

## Parser registry

### `makeParserRegistry<M>().build(config)`

Builds a `ModelCRUDParserRegistry<M>` from:

- a Zod schema for `DBRead` rows (validated on every read),
- a `fromDBReadToModelRead` parser,
- a `fromModelInsertToDBInsert` parser,
- a `fromModelUpdateToDBUpdate` parser.

The builder hardens each parser:

- `fromDBReadToModelRead` first runs the Zod schema with a per-model error
  map.
- `fromModelInsert` / `fromModelUpdate` strip any keys not present in the
  DB schema (Supabase rejects unknown keys) and remove `undefined` values
  that may have been re-introduced by the `pick`.

| Type                     | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `ModelCRUDParserRegistry`| The shape returned from `.build(...)`                    |

---

## Register interface

`Register` is an empty interface intended for declaration-merging by the
consumer.

```ts
import type { Database } from "./database.types";

declare module "@avandar/clients" {
  interface Register {
    supabaseDatabase: Database;
  }
}
```

Once registered, `tableName`, `DBRead`, `DBInsert`, and `DBUpdate` types
flow through `createSupabaseCRUDClient` automatically.

| Type       | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `Register` | Augmentation target for registering a Supabase `Database`    |

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm test`       | Run all tests once           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm type-check` | Run TypeScript type checking |
