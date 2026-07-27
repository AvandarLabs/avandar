# Local Persistence AvaModel Audit

## Goal

Review the complete `develop...HEAD` branch diff and repository persistence
boundaries for record-oriented browser databases that bypass Avandar's
AvaModel, parser, AvaDexie, and client conventions. Convert every confirmed
candidate without changing its observable lifecycle.

## Audit result

The only additional standalone record databases are:

1. `PlanAnnotationStorage`, backed by `AvandarPlanAnnotationDB`.
2. `PlanStepStorage`, backed by `AvandarPlanStepDB`.

Together with the already-converted consent and clarification audit databases,
these account for every standalone Dexie database in product code. `AvandarDB`
remains the single shared Dexie database.

The following persistence mechanisms are intentionally not AvaModels:

- React Query's opaque `idb-keyval` cache.
- Scalar UI preferences in `localStorage`.
- Tab-scoped UI state in `sessionStorage`.
- In-memory pending acknowledgements, session secrets, row-count caches,
  upload progress, and import jobs.
- DuckDB, OPFS, and Supabase Storage bulk-data clients.
- Direct `LocalDataset` table operations that already live inside its standard
  AvaModel client boundary.

These exclusions are not record repositories, have deliberately shorter or
specialized lifecycles, or already follow the model/client convention.

## Models

Add two browser-local models under `src/models/chat/`:

- `PlanAnnotation`
- `PlanStepBlob`

Both use `DexieCrudModelSpec`, namespace entry points, Zod schemas, identity
parser registries, and parser tests.

`PlanAnnotation` owns the persisted annotation discriminated union currently
declared by the React state manager. Its `id` is a branded UUID. The four
variants remain `text`, `sticky`, `arrow`, and `stroke`, with the same geometry,
text, color, and timestamp fields.

`PlanStepBlob` owns the parquet materialization row currently declared by
`PlanStepStorage`. Its branded string id is deterministically built from
`planId` and `stepId`; the row retains the parquet `Blob`, schema fields,
`rowCount`, and `savedAt`.

## AvaDexie schema

Register both models together in AvaDexie v6:

- `PlanAnnotation`: primary key `id`; indexes `planId`, `createdAt`.
- `PlanStepBlob`: primary key `id`; indexes `planId`, `stepId`, `savedAt`.

The v6 schema retains every v5 model and index. Its upgrader is empty because
both standalone databases are new in this branch and contain no released data
that needs migration.

## Clients

Add hook-enabled clients under `src/clients/chat/` using
`createDexieCrudClient`, `AvaDexie.DB`, the model parser registry, and
`createUsableServiceClient`.

`PlanAnnotationClient` preserves:

- single and bulk upsert;
- list by plan;
- delete by id;
- clear by plan and clear all.

`PlanStepBlobClient` preserves:

- deterministic id construction and `savedAt` assignment;
- put and get by `(planId, stepId)`;
- list by plan;
- clear by plan and clear all.

Imperative orchestration continues to call promise methods. React consumers may
use generated query hooks where doing so preserves their current load/save
timing and state-manager behavior.

## Consumer migration

Move persisted annotation types out of
`PlanAnnotationStateManager.tsx`. The state manager and rendering code import
the `PlanAnnotation` namespace from its main model entry.

Replace every `PlanAnnotationStorage` and `PlanStepStorage` call with its
client equivalent. Delete both standalone storage modules after searches prove
no consumers remain.

## Behavior and tests

Preserve explicit cleanup semantics: neither model gains a TTL. Closing or
replacing a plan still clears its annotation and parquet rows, while global
cleanup methods remain available.

Tests cover:

- parser acceptance and identity conversion for both models;
- AvaDexie v6 membership, primary keys, indexes, and v5 preservation;
- client put/get/list/clear behavior and deterministic step ids;
- updated consumer calls and existing plan annotation state behavior;
- absence of standalone database names and legacy storage imports.

