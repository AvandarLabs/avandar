---
name: avandar-ava-model-creation
description: "Create new Avandar models using the Ava CLI and current repo conventions. Use for `shared/models/*` and `src/models/*` model creation, Supabase-backed CRUD models, Dexie-backed browser models, parser creation, schema/migration work, and client wiring."
metadata:
  author: jpsyx
  version: "1.0.0"
  tags: avandar, ava-cli, models, supabase, dexie, parsers, clients
---

# Avandar Model Creation

Use this skill when the task is to add or update an Avandar model, especially when the prompt mentions:

- `shared/models`
- `src/models`
- `src/clients`
- Supabase-backed models
- Dexie / IndexedDB models
- parser creation
- `ava new model`

## Non-Negotiables

1. Always start from the Ava CLI scaffold, then evaluate the generated files against current repo conventions and edit whatever is outdated or incomplete.
2. If the model is backed by Supabase, start with the declarative schema workflow first. Use the `supabase-declarative-schema` skill before writing model code.
3. If the model crosses a serialization boundary, add parsers. This includes Supabase-backed models and Dexie-backed models.
4. If the model is persisted anywhere, add a client under `src/clients/` that matches existing conventions.
5. If the model is backed by Dexie, add a Dexie schema version entry and migration in `src/db/dexie/dexieVersions.ts`.
6. Do not trust the generator output blindly. The current CLI scaffold is older than the hand-maintained patterns in the repo.

## `@avandar/models` vs `shared/models`

- **`packages/shared/models`** publishes **`@avandar/models`**. Keep it for **core cross-cutting primitives** (for example `Model`, shared typing helpers) that every consumer imports as infrastructure.
- Put **business or domain logic**—permission catalogs, workspace policy mirrors, product-specific registries, RBAC-related constants—in **`shared/models/<Domain>/`**, **not** in `packages/shared/models`.
- For domain models that expose both types and runtime tables/registries, follow the **`{ModelName}Module.ts`** contract:
  - **`PermissionsModule.ts`** (or **`DatasetSourceModule.ts`**, etc.) holds **`export const PermissionsModule = { ... }`** with frozen catalogs, factories, or lookup maps.
  - **`Permissions.ts`** merges **`export { PermissionsModule as Permissions }`** with **`export namespace Permissions { ... }`** for types aliased from **`Permissions.types.ts`**, mirroring **`shared/models/datasets/AvaDataType/AvaDataType.ts`**.
  - Consumers import **`Permissions`** from **`$/models/Permissions/Permissions.ts`** and refer to **`Permissions.PermissionCatalog`** (value) and **`Permissions.PermissionKey`** (type) on the merged symbol.

## Decide The Model Kind First

Choose the storage/runtime shape before generating files.

### 1. Shared standalone model

Use `shared/models/...` when the model is a shared TypeScript concept and does not need its own persisted backing table.

Examples:

- `shared/models/datasets/AvaDataType`
- `shared/models/datasets/DatasetSource`
- `shared/models/queries/StructuredQuery`

Typical files:

- `<ModelName>.ts` (merged **`export { …Module as … }`** + **`export namespace`**)
- `<ModelName>.types.ts`
- optional `<ModelName>Module.ts` (exact name; constants, registries, catalogs)
- no parsers unless the model has a serialized form

### 2. Shared Supabase-backed model

Use `shared/models/...` when the model represents a Supabase table or RPC-oriented persisted shape shared across the app.

Examples:

- `shared/models/datasets/Dataset`
- `shared/models/datasets/CsvFileDataset`
- `shared/models/datasets/OpenDataDataset`
- `shared/models/Dashboard`
- `shared/models/Workspace`

Typical files:

- `<ModelName>.ts`
- `<ModelName>.types.ts`
- `<ModelName>Parsers.ts`
- optional `<ModelName>Module.ts`
- matching client in `src/clients/.../<ModelName>Client.ts`

### 3. App-local Dexie-backed model

Use `src/models/...` when the model is browser-local and persisted in IndexedDB only.

Examples:

- `src/models/LocalDataset`
- `src/models/LocalPublicDataset`

Typical files:

- `<ModelName>.types.ts`
- `<ModelName>Parsers.ts`
- optional utility files
- matching client in `src/clients/...`
- Dexie version registration in `src/db/dexie/dexieVersions.ts`

## Start With The Ava CLI

Always begin with the generator and then refine the output.

For a shared standalone model:

```bash
ava new model AvaDataType --models-dir datasets --add-module
```

For a shared Supabase-backed model:

```bash
ava new model OpenDataDataset \
  --models-dir datasets \
  --supabase-table datasets__open_data \
  --clients-dir datasets
```

If the model also needs a helper module:

```bash
ava new model StructuredThing --models-dir queries --add-module
```

Important:

- The current generator writes models under `shared/models`.
- The current generator only auto-generates a client in Supabase mode.
- The current generator does not fully match the latest hand-written client conventions.
- In the current repo snapshot, running bare `ava new model` errors because `modelName` is required. Use the explicit forms above and inspect `apps/ava-cli/src/DevCLI/NewBoilerplateCLI/NewTSModelCLI` if you need option details.

## Supabase-Backed Workflow

If the model is backed by Supabase, do this in order.

### 1. Start with the declarative schema

Follow the `supabase-declarative-schema` skill.

- Add or update the right file in `supabase/schemas/`
- Keep the numbered declarative schema ordering conventions
- Create the table, constraints, indexes, triggers, policies, and related objects there

Examples from the repo:

- `supabase/schemas/10.datasets.sql`
- `supabase/schemas/20.datasets__csv_file.sql`
- `supabase/schemas/20.datasets__open_data.sql`
- `supabase/schemas/10.dashboards.sql`

### 2. Generate and apply migrations

Use the repo’s current commands:

```bash
pnpm db:new-migration your_migration_name
pnpm db:apply-migrations
pnpm db:gen-types
```

Review the generated migration before moving on.

### 3. Scaffold the model

Use `ava new model` with:

- `--models-dir` for the domain folder under `shared/models`
- `--supabase-table` for the exact snake_case table name
- `--clients-dir` for the matching subfolder under `src/clients`
- `--add-module` only if the model genuinely needs runtime helpers

### 4. Normalize the generated model files

The scaffold is only a starting point. Compare it against the real patterns in:

- `shared/models/datasets/Dataset`
- `shared/models/datasets/CsvFileDataset`
- `shared/models/datasets/OpenDataDataset`
- `shared/models/Dashboard`
- `shared/models/EntityConfig/EntityFieldConfig`

Bring the generated files up to current conventions:

- flesh out the `Read`, `Insert`, and `Update` variants in `<ModelName>.types.ts`
- use `SupabaseCRUDModelSpec`
- define a branded ID type when appropriate
- use `Model.Base<...>` when the repo pattern for that family uses it
- keep comments concise and domain-specific
- use `SetOptional<...>` for Supabase insert variants

### 5. Add parsers

Supabase-backed models should have `<ModelName>Parsers.ts`.

Follow existing parser conventions:

- define `DBReadSchema` with `z.object(...)`
- use `camelCaseKeysDeep` for DB-to-model conversion
- use `snakeCaseKeysDeep` for model-to-DB conversion
- use `nullsToUndefinedDeep` when nullable DB columns map to optional model fields
- use `undefinedsToNullsDeep` when optional model fields must serialize to nullable DB columns
- use `excludeNullsExceptInProps(...)` for nullable columns that should remain `null`
- use `Model.make(...)` when the surrounding model family uses branded model constructors
- keep the type-level `ZodConsistencyTests`

Look at these references:

- `shared/models/datasets/Dataset/DatasetParsers.ts`
- `shared/models/Dashboard/DashboardParsers.ts`
- `shared/models/catalog-entries/OpenDataCatalogEntry/OpenDataCatalogEntryParsers.ts`
- `shared/models/EntityConfig/EntityFieldConfig/EntityFieldConfigParsers.ts`

### 6. Add the client

If the model is persisted in Supabase, add a client in the matching `src/clients` domain directory.

Examples:

- `src/clients/datasets/CsvFileDatasetClient.ts`
- `src/clients/datasets/DatasetClient.ts`
- `src/clients/catalog-entries/OpenDataCatalogEntryClient.ts`
- `src/clients/entities/EntityFieldConfigClient.ts`
- `src/clients/WorkspaceClient.ts`

Base convention:

```ts
export const ExampleClient = createUsableServiceClient(
  createSupabaseCRUDClient({
    dbClient: AvaSupabase.DB,
    modelName: "Example",
    tableName: "examples",
    dbTablePrimaryKey: "id",
    parsers: ExampleParsers,
  }),
);
```

Notes:

- Add `dbClient: AvaSupabase.DB`. The scaffold does not currently include it.
- Wrap with `createUsableServiceClient(...)` to match current repo usage.
- Add custom `queries` and `mutations` only when the model needs them.
- Put the client in the domain folder that matches nearby conventions, such as `datasets`, `entities`, `entity-configs`, `catalog-entries`, or `dashboards`.

## Standalone Shared Model Workflow

If the model is not persisted in Supabase or Dexie, keep it lightweight.

Good references:

- `shared/models/datasets/AvaDataType`
- `shared/models/datasets/DatasetSource`
- `shared/models/queries/StructuredQuery`

Typical guidance:

- create the model in the correct shared domain folder
- keep `<ModelName>.types.ts` focused on types
- add `<ModelName>Module.ts` only when you need factories, registries, or helper functions
- do not add parsers unless the model has a real serialized representation
- do not add a client if nothing is persisted

Examples:

- `AvaDataType` is shared and standalone, with a module but no parsers or client
- `DatasetSource` is a shared type registry with a module but no direct persisted table

## Dexie-Backed Workflow

Dexie models are browser-local. Use the shared examples for overall model style, but follow the actual Dexie conventions in `src/models` and `src/clients/dexie`.

### 1. Scaffold first, then move/adapt

Start with `ava new model` for the closest shape, then move/adapt the scaffold into `src/models/<ModelName>/` because the current generator only writes under `shared/models`.

### 2. Convert the types to Dexie conventions

Use `DexieCRUDModelSpec`, not `SupabaseCRUDModelSpec`.

References:

- `src/models/LocalDataset/LocalDataset.types.ts`
- `src/models/LocalPublicDataset/LocalPublicDataset.types.ts`

Key conventions:

- the model name is also the Dexie table name
- `Insert` is intentionally the same as `Read`
- the client must supply all required values at insert time
- the primary key field name and type must be explicit

### 3. Add parsers

Dexie models should also have parsers.

References:

- `src/models/LocalDataset/LocalDatasetParsers.ts`
- `src/models/LocalPublicDataset/LocalPublicDatasetParsers.ts`

If the model shape already matches the stored IndexedDB shape, `identity` parsers are fine. Otherwise add real transformations.

### 4. Register the Dexie schema version

Update `src/db/dexie/dexieVersions.ts`.

You must:

- add the new version to the `Schemas` type
- add a new `AvaDexieVersionManager.defineVersion(...)` entry
- register the model name, primary key, and any indexed columns
- write an `upgrader` if data migration is needed
- update `CURRENT_AVA_DEXIE_VERSION`

Also remember:

- any columns used in Dexie filters or conflict matching should be indexed
- `createDexieCRUDClient` expects the model table to exist in the registered Dexie schema

### 5. Add the Dexie client

Put the client under `src/clients/...` following the existing organization.

References:

- `src/clients/datasets/LocalDatasetClient.ts`
- `src/clients/datasets/LocalPublicDatasetClient.ts`

Base pattern:

```ts
export const ExampleClient = createDexieCRUDClient({
  db: AvaDexie.DB,
  modelName: "Example",
  parsers: ExampleParsers,
});
```

Wrap with `createUsableServiceClient(...)` when the client exposes custom query or mutation helpers in the same style as the existing repo.

## Directory Placement Rules

Match nearby conventions instead of inventing a new folder shape.

Common shared model locations:

- `shared/models/datasets/<ModelName>/`
- `shared/models/catalog-entries/<ModelName>/`
- `shared/models/entities/<ModelName>/`
- `shared/models/queries/<ModelName>/`
- `shared/models/EntityConfig/<ModelName>/`

Common client locations:

- `src/clients/datasets/<ModelName>Client.ts`
- `src/clients/catalog-entries/<ModelName>Client.ts`
- `src/clients/entities/<ModelName>Client.ts`
- `src/clients/entity-configs/<ModelName>Client.ts`
- `src/clients/dashboards/<ModelName>Client.ts`

Use a root-level `src/clients/<ModelName>Client.ts` only when that matches the current top-level pattern, such as `WorkspaceClient.ts` or `UserClient.ts`.

## Final Evaluation Checklist

After running the generator, review and fix the output.

1. Confirm the model lives in the correct root: `shared/models` vs `src/models`.
2. Confirm the domain subdirectory matches nearby patterns.
3. Confirm the types use the correct spec: `SupabaseCRUDModelSpec` vs `DexieCRUDModelSpec` vs standalone types only.
4. Confirm parsers exist when serialization is involved.
5. Confirm nullable DB columns are handled correctly in parser transforms.
6. Confirm the client exists for persisted models.
7. Confirm Supabase clients use `AvaSupabase.DB` and current `createUsableServiceClient(...)` conventions.
8. Confirm Dexie models are registered in `src/db/dexie/dexieVersions.ts`.
9. Confirm generated database types are up to date after Supabase schema changes.
10. Confirm the generated scaffold has been edited to match the surrounding hand-written examples.

## Integrated Examples

### Example: new Supabase dataset subtype

If you add a new dataset subtype backed by Supabase:

1. Add the declarative schema in `supabase/schemas/` following the numbering convention.
2. Generate and apply the migration.
3. Regenerate `shared/types/database.types.ts`.
4. Scaffold the model:

```bash
ava new model ExampleDataset \
  --models-dir datasets \
  --supabase-table datasets__example \
  --clients-dir datasets
```

5. Edit the scaffold to match patterns from `CsvFileDataset`, `OpenDataDataset`, and `Dataset`.
6. Add or refine parsers.
7. Fix the generated client to use `AvaSupabase.DB` and `createUsableServiceClient(...)`.

### Example: new standalone shared model

If you add a shared model like `AvaDataType` or another registry/helper model:

```bash
ava new model ExampleType --models-dir datasets --add-module
```

Then:

- keep it in `shared/models/datasets/ExampleType/`
- add module helpers if needed
- skip parsers and clients unless a real serialized representation exists

### Example: new Dexie-local cached model

If you add a new browser-local cached model:

1. Start with the scaffold.
2. Move/adapt it into `src/models/<ModelName>/`.
3. Convert the types to `DexieCRUDModelSpec`.
4. Add parsers.
5. Register the table and migration in `src/db/dexie/dexieVersions.ts`.
6. Add the Dexie client in `src/clients/...`.
