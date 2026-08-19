# PDF Import Phase A: Source Type and Original-File Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pdf_file` as a dataset source type and build the original-file retention mechanism it depends on, so an uploaded PDF is never discarded (Linear AVA-317).

**Architecture:** Two coupled pieces. First, `pdf_file` joins the `datasets__source_type` enum with a `datasets__pdf_file` metadata table storing table geometry rather than an ordinal index. Second, a new type-level classification marks source types whose original file cannot be reconstructed from the parquet blob plus metadata; those files are pinned in local storage (exempt from LRU eviction and from the post-transcode cleanup) and, when cloud sync is on, uploaded alongside the parquet.

**Tech Stack:** TypeScript, Supabase (Postgres + Storage), Dexie/IndexedDB, Zod, Vitest, pgTAP.

---

## Scope note

This plan deliberately excludes all detection and UI work. It ends with a
`pdf_file` dataset that can be created programmatically and whose original file
is retained correctly. Phase B (`2026-08-17-pdf-import-phase-b-table-extraction.md`)
builds the detector and the import UI on top of it.

Read `docs/superpowers/specs/2026-08-17-pdf-import-design.md` first.

## Background an engineer new to this codebase needs

**How dataset source types work.** Every dataset has a row in `public.datasets`
with a `source_type` enum, plus a row in a per-source metadata table
(`datasets__csv_file`, `datasets__xlsx_file`, ...). Each source type has a
model under `shared/models/datasets/`, a parser registry that maps snake_case
DB rows to camelCase models, and a client registered in
`src/clients/datasets/SourceDatasetClient.ts`. Creation goes through an RPC
(`rpc_datasets__add_<type>_dataset`) that inserts both rows in one transaction.

**How local storage works.** Imported data lives in IndexedDB via Dexie as a
`LocalDataset` row keyed by `datasetId`, holding a `parquetData` blob. The row
also has a `sourceBytes` blob, which today is a **short-lived cache** of the
original upload used only to resume a parse after a page refresh. Two things
delete it: an LRU evictor (`_evictSourceCache`, 1GB cumulative cap) and the
transcode completion path, which clears it unconditionally once the parquet
lands. Both behaviours are correct for CSV and XLSX and fatal for PDF.

**How cloud sync works.** If the user allows online storage, the parquet is
uploaded to the private `workspaces` Supabase Storage bucket at
`<workspaceId>/datasets/<datasetId>.parquet`. Storage RLS parses the dataset id
out of the object name to check dataset-level permissions.

**The trap in the RLS.** `public.util__storage_object_dataset_id` extracts that
id with a regex hardcoded to `\.parquet$`. Any other object name returns NULL,
and every `workspaces` bucket policy requires it to be non-NULL. So uploading
`<datasetId>.original.pdf` fails with a permission error until that function is
widened. Task 3 does this, and it is the highest-risk change in the plan
because it touches a security boundary.

## Migration generation caveats

Two things were discovered during execution that the original plan got wrong.
Read both before generating any migration.

**1. Enum value additions must be hand-written.** The repo uses declarative
schema, and the general rule is that migrations are generated, never
hand-written. Adding a value to an existing enum is an exception. `db diff`
handles it by renaming the old type, creating a new one, repointing columns,
and dropping the old type. That fails here, because
`supabase/schemas/60.rpc_datasets__add_dataset.sql` declares a parameter of
type `public.datasets__source_type`, and the rename leaves that function
signature depending on the renamed type:

```
ERROR: cannot drop type datasets__source_type__old_version_to_be_dropped
because other objects depend on it (SQLSTATE 2BP01)
```

The repo already handles this by hand for the same enum; see
`supabase/migrations/20260504000010_add_xlsx_file_source_type_enum_value.sql`,
which is a bare `alter type ... add value if not exists`. Follow that
precedent. Still update the declarative schema too, so future diffs see the
intended final state.

**2. Check branch currency before reading any diff.** A `supabase db diff` run
from a branch that trails `develop` reports the missing commits as differences,
and the output is indistinguishable at a glance from real drift. This bit us
once here: the branch was 4 commits behind, and the diff emitted ~335 `revoke`
statements. Generating a migration in that state would have committed
statements undoing grants that `develop` had just added.

Before generating anything:

```bash
git rev-list --count HEAD..develop     # must be 0
git log --oneline HEAD..develop -- supabase/
```

This branch was merged up to `develop` during execution, and the revokes
disappeared, confirming the cause.

**3. Expect seven benign `analytics` view recreations.** Even on a current
branch, `db diff` emits a `drop view` plus a matching `create or replace view`
for each of the seven `analytics.*` views. migra cannot tell that the stored
definition is semantically identical to the declared one, which is the "some
view recreation cases" caveat the `supabase-declarative-schema` skill lists.

This is noise, **not** data loss: every drop has a recreate. It is not the
storage-policy failure mode, where drops appeared with no recreate. Strip the
pairs from generated migrations to keep them readable, but there is no bug to
chase and nothing to escalate. Tracked and closed as AVA-320.

## File structure

**Create:**

| File | Responsibility |
|---|---|
| `supabase/schemas/00.enum.datasets__pdf_detection_mode.sql` | Detection mode enum |
| `supabase/schemas/20.datasets__pdf_file.sql` | `datasets__pdf_file` table + RLS + trigger |
| `supabase/schemas/70.rpc_datasets__add_pdf_file_dataset.sql` | Creation RPC |
| `supabase/tests/database/permissions/storage_original_file_object_names.test.sql` | pgTAP: RLS accepts original-file names, still rejects junk |
| `shared/models/datasets/PdfFileDataset/PdfFileDataset.types.ts` | Model types |
| `shared/models/datasets/PdfFileDataset/PdfFileDatasetParsers.ts` | Zod schema + parsers |
| `shared/models/datasets/PdfFileDataset/PdfFileDataset.ts` | Namespace export |
| `src/clients/datasets/source-datasets/PdfFileDatasetClient.ts` | CRUD client |
| `src/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient.ts` | Upload/download/delete originals |
| `src/clients/storage/DatasetOriginalFileStorageClient/utils.ts` | Path helper |
| `src/clients/storage/DatasetOriginalFileStorageClient/utils.test.ts` | Path helper tests |
| `shared/models/datasets/DatasetSource/requiresOriginalFileRetention.ts` | The classification helper |
| `shared/models/datasets/DatasetSource/requiresOriginalFileRetention.test.ts` | Its tests |

**Modify:**

| File | Change |
|---|---|
| `supabase/schemas/10.datasets.sql:1-7` | Add `'pdf_file'` to the enum |
| `supabase/schemas/16.utils.resource-permissions.sql:791-800` | Widen the object-name regex |
| `shared/models/datasets/DatasetSource/DatasetSource.types.ts` | Add `pdf_file` to registries and the retention type |
| `shared/models/datasets/DatasetSource/DatasetSource.ts` | Re-export the new helper |
| `src/clients/datasets/SourceDatasetClient.ts:12-18` | Register `PdfFileDatasetClient` |
| `src/models/LocalDataset/LocalDataset.types.ts` | Add `isSourcePinned` and `pdf` file type |
| `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.ts:49-87` | Evictor skips pinned rows |
| `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.ts:145-153` | Preserve pinned source bytes |

**No Dexie version bump is needed.** Dexie only declares *indexes* in its
schema, not fields. `isSourcePinned` is not indexed, so adding it to the
TypeScript type is sufficient and existing rows read back `undefined`, which is
correctly falsy. Do not add a v10 to `dexieVersions.ts`; doing so would force
an unnecessary upgrade transaction on every user.

---

## Task 1: The retention classification

**Files:**
- Create: `shared/models/datasets/DatasetSource/requiresOriginalFileRetention.ts`
- Create: `shared/models/datasets/DatasetSource/requiresOriginalFileRetention.test.ts`
- Modify: `shared/models/datasets/DatasetSource/DatasetSource.types.ts`
- Modify: `shared/models/datasets/DatasetSource/DatasetSource.ts`

This task depends on `pdf_file` existing in the generated database types, which
Task 2 produces. **Do Task 2 first if `DatasetSourceType` does not yet include
`"pdf_file"`.**

- [ ] **Step 1: Write the failing test**

Create `shared/models/datasets/DatasetSource/requiresOriginalFileRetention.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { requiresOriginalFileRetention } from "./requiresOriginalFileRetention.ts";

describe("requiresOriginalFileRetention", () => {
  it("returns false for source types reconstructable from the parquet blob", () => {
    // A CSV's every byte of meaning is in the parquet plus the parse
    // options, so retaining the original would be dead weight.
    expect(requiresOriginalFileRetention("csv_file")).toBe(false);
    expect(requiresOriginalFileRetention("xlsx_file")).toBe(false);
  });

  it("returns true for pdf_file, whose extraction is lossy", () => {
    // Only the extracted table reaches the parquet. Everything else in the
    // document is gone, so the original has to survive.
    expect(requiresOriginalFileRetention("pdf_file")).toBe(true);
  });

  it("returns false for source types with no uploaded file at all", () => {
    expect(requiresOriginalFileRetention("google_sheets")).toBe(false);
    expect(requiresOriginalFileRetention("open_data")).toBe(false);
    expect(requiresOriginalFileRetention("virtual")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run shared/models/datasets/DatasetSource/requiresOriginalFileRetention.test.ts`
Expected: FAIL, "Failed to resolve import ... requiresOriginalFileRetention.ts"

- [ ] **Step 3: Add the type to `DatasetSource.types.ts`**

Add after the existing `CanBeOfflineOnlyDatasetSourceType` block (around line 17):

```ts
/**
 * Source types whose original uploaded file CANNOT be reconstructed from the
 * stored parquet blob plus the stored parse metadata, and which therefore
 * must retain the original file.
 *
 * The deciding question is only ever: given the parquet and the metadata we
 * persist, could we rebuild the file the user handed us?
 *
 * - `csv_file` / `xlsx_file`: yes. The parquet holds every value and the
 *   parse options hold every setting, so we deliberately do not keep the
 *   original.
 * - `pdf_file`: no. We extract one table out of a document that may hold
 *   dozens of other things. Discarding the original would permanently
 *   foreclose extracting anything else from an already-imported file.
 *
 * Consequences live in `requiresOriginalFileRetention`, the local eviction
 * policy, and the cloud upload path. See Linear AVA-317.
 */
export type NonReconstructableDatasetSourceType = Extract<
  DatasetSourceType,
  "pdf_file"
>;
```

In the same file, add `pdf_file` to `ManuallyUploadableDatasetSourceType`,
`CanBeOfflineOnlyDatasetSourceType`, and `DatasetSourceRegistry`. The three
edits are:

```ts
export type CanBeOfflineOnlyDatasetSourceType = Extract<
  DatasetSourceType,
  "csv_file" | "xlsx_file" | "pdf_file"
>;

export type ManuallyUploadableDatasetSourceType = Extract<
  DatasetSourceType,
  "csv_file" | "xlsx_file" | "pdf_file"
>;
```

and inside `DatasetSourceRegistry`, add the line `pdf_file: PdfFileDatasetModel[K];`
plus the matching import at the top of the file:

```ts
import type { PdfFileDatasetModel } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types.ts";
```

That import resolves only after Task 4. If you are working strictly in order,
add the import last and expect a type error until Task 4 lands.

- [ ] **Step 4: Write the implementation**

Create `shared/models/datasets/DatasetSource/requiresOriginalFileRetention.ts`:

```ts
import type {
  DatasetSourceType,
  NonReconstructableDatasetSourceType,
} from "$/models/datasets/DatasetSource/DatasetSource.types.ts";

/**
 * The single source of truth for which source types retain their original
 * file. Declared as a `Record` over the full union rather than a `Set` of
 * strings so that adding a member to `DatasetSourceType` without deciding
 * its retention behaviour is a compile error, not a silent `false`.
 */
const RETENTION_BY_SOURCE_TYPE: Record<DatasetSourceType, boolean> = {
  csv_file: false,
  google_sheets: false,
  open_data: false,
  pdf_file: true,
  virtual: false,
  xlsx_file: false,
};

/**
 * True when the original uploaded file must be retained because it cannot be
 * reconstructed from the parquet blob plus stored metadata.
 *
 * See `NonReconstructableDatasetSourceType` for the reasoning.
 */
export function requiresOriginalFileRetention(
  sourceType: DatasetSourceType,
): sourceType is NonReconstructableDatasetSourceType {
  return RETENTION_BY_SOURCE_TYPE[sourceType];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run shared/models/datasets/DatasetSource/requiresOriginalFileRetention.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 6: Re-export from the namespace**

In `shared/models/datasets/DatasetSource/DatasetSource.ts`, add to the exports
alongside the existing members:

```ts
export { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/requiresOriginalFileRetention.ts";
```

and inside the `DatasetSource` namespace add:

```ts
  export type NonReconstructableSourceType =
    NonReconstructableDatasetSourceType;
```

importing `NonReconstructableDatasetSourceType` from the types file next to
the existing type imports.

- [ ] **Step 7: Commit**

```bash
git add shared/models/datasets/DatasetSource/
git commit -m "feat: classify dataset source types by original-file retention"
```

---

## Task 2: Add the `pdf_file` enum member and detection mode enum

**Files:**
- Modify: `supabase/schemas/10.datasets.sql:1-7`
- Create: `supabase/schemas/00.enum.datasets__pdf_detection_mode.sql`

This repo uses **declarative schema**: you edit files in `supabase/schemas/`
and generate a migration by diffing. Never hand-write a migration file.

- [ ] **Step 1: Add the source type enum member**

Edit `supabase/schemas/10.datasets.sql`, replacing lines 1-7 with:

```sql
create type public.datasets__source_type as enum(
  'csv_file',
  'google_sheets',
  'virtual',
  'open_data',
  'xlsx_file',
  'pdf_file'
);
```

- [ ] **Step 2: Create the detection mode enum**

Create `supabase/schemas/00.enum.datasets__pdf_detection_mode.sql`:

```sql
/**
 * How a PDF table's structure was determined.
 *
 * - `tagged`:  read from the PDF's own logical structure tree. Ground truth.
 * - `lattice`: derived from ruling lines in the page content stream.
 * - `stream`:  guessed from whitespace and text alignment. Least reliable.
 * - `manual`:  a region the user drew themselves.
 *
 * `manual` is defined now although nothing produces it until the manual
 * region-selection feature ships, so that adding that feature needs no
 * enum migration.
 */
create type public.datasets__pdf_detection_mode as enum(
  'tagged',
  'lattice',
  'stream',
  'manual'
);
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm db:new-migration add_pdf_file_source_type`
Expected: a new file appears under `supabase/migrations/` containing both
`alter type ... add value 'pdf_file'` and the new enum's `create type`.

- [ ] **Step 4: Apply and regenerate types**

```bash
pnpm db:reset
pnpm db:gen-types
```

Expected: `shared/types/database.types.ts` now lists `"pdf_file"` in the
`datasets__source_type` enum union.

- [ ] **Step 5: Verify the type flows through**

Run: `pnpm vitest run shared/models/datasets/DatasetSource/requiresOriginalFileRetention.test.ts`
Expected: PASS. If Task 1 was done first, the `pdf_file: true` entry now
type-checks against a real union member.

- [ ] **Step 6: Commit**

```bash
git add supabase/schemas/ supabase/migrations/ shared/types/database.types.ts
git commit -m "feat: add pdf_file source type and pdf detection mode enums"
```

---

## Task 3: Widen the storage object-name parser

**Files:**
- Modify: `supabase/schemas/16.utils.resource-permissions.sql:791-800`
- Create: `supabase/tests/database/permissions/storage_original_file_object_names.test.sql`

This is a security boundary. The function decides which dataset a storage
object belongs to, and every `workspaces` bucket policy denies access when it
returns NULL. Widening it wrongly would let an object claim a dataset it does
not belong to.

- [ ] **Step 1: Write the failing test**

Create `supabase/tests/database/permissions/storage_original_file_object_names.test.sql`:

```sql
\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- `util__storage_object_dataset_id` gates every policy on the `workspaces`
-- bucket: when it returns NULL the object is unreachable. It originally
-- matched only `<uuid>.parquet`, which meant retained original files could
-- never be uploaded or read. Widening it is a permission change, so the
-- rejection cases matter as much as the acceptance cases.

select plan(10);

-- Accepts the existing parquet form.
select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.parquet'
  ),
  'bbbbbbbb-0000-4000-8000-000000000002'::uuid,
  'parquet object names still resolve'
);

-- Accepts retained originals, whatever the extension.
select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.original.pdf'
  ),
  'bbbbbbbb-0000-4000-8000-000000000002'::uuid,
  'original.pdf object names resolve'
);

select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.original.xlsx'
  ),
  'bbbbbbbb-0000-4000-8000-000000000002'::uuid,
  'original.xlsx object names resolve'
);

-- Rejects a non-UUID stem.
select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/not-a-uuid.original.pdf'
  ),
  null,
  'non-uuid stem is rejected'
);

-- Rejects an unknown suffix, so we do not accidentally authorise arbitrary
-- object names that merely start with a dataset UUID.
select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.exe'
  ),
  null,
  'unknown suffix is rejected'
);

select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002'
  ),
  null,
  'bare uuid with no suffix is rejected'
);

-- Rejects a traversal-flavoured name that embeds a second path segment.
select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.original.pdf/extra'
  ),
  null,
  'object names with a fourth path segment are rejected'
);

-- Rejects the wrong folder depth.
select is(
  public.util__storage_object_dataset_id(
    'datasets/bbbbbbbb-0000-4000-8000-000000000002.parquet'
  ),
  null,
  'objects not nested under <workspace>/datasets are rejected'
);

-- Rejects an extension long enough to look like smuggled content.
select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.original.thisisaverylongextension'
  ),
  null,
  'over-long extensions are rejected'
);

-- Rejects an empty extension.
select is(
  public.util__storage_object_dataset_id(
    'aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.original.'
  ),
  null,
  'empty extension is rejected'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `supabase test db`
Expected: FAIL. The `original.pdf` and `original.xlsx` cases return NULL
because the current regex requires `\.parquet$`.

- [ ] **Step 3: Widen the function**

In `supabase/schemas/16.utils.resource-permissions.sql`, replace the body of
`util__storage_object_dataset_id` (lines 791-800) with:

```sql
create or replace function public.util__storage_object_dataset_id (p_object_name text) returns uuid language sql immutable
set
  search_path = public as $$
  -- Accepts exactly two object shapes, both directly under
  -- `<workspaceId>/datasets/`:
  --   <datasetId>.parquet         the transcoded data
  --   <datasetId>.original.<ext>  the retained source file (AVA-317)
  --
  -- The suffix allow-list is deliberate. Matching a bare leading UUID would
  -- let any object name claim a dataset's permissions, so anything outside
  -- these two shapes resolves to NULL and is therefore unreachable.
  select case
    when split_part(p_object_name, '/', 3) ~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\.parquet|\.original\.[A-Za-z0-9]{1,10})$'
      and split_part(p_object_name, '/', 4) = ''
    then split_part(split_part(p_object_name, '/', 3), '.', 1)::uuid
    else null
  end;
$$;
```

The `split_part(..., '/', 4) = ''` guard rejects deeper paths. Splitting the
stem on `.` is safe because a UUID contains no dots.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm db:new-migration widen_storage_object_dataset_id
pnpm db:reset
supabase test db
```

Expected: PASS, 10/10 in the new file, and every pre-existing test in
`supabase/tests/database/permissions/` still passing. Pay particular attention
to `storage_private_dataset_guard.test.sql`, which asserts the security
property this function underpins.

- [ ] **Step 5: Commit**

```bash
git add supabase/schemas/ supabase/migrations/ supabase/tests/
git commit -m "feat: allow retained original files in storage object names"
```

---

## Task 4: The `datasets__pdf_file` table and model

**Files:**
- Create: `supabase/schemas/20.datasets__pdf_file.sql`
- Create: `shared/models/datasets/PdfFileDataset/PdfFileDataset.types.ts`
- Create: `shared/models/datasets/PdfFileDataset/PdfFileDatasetParsers.ts`
- Create: `shared/models/datasets/PdfFileDataset/PdfFileDataset.ts`

- [ ] **Step 1: Create the table**

Create `supabase/schemas/20.datasets__pdf_file.sql`:

```sql
create table public.datasets__pdf_file (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Dataset this metadata belongs to
  dataset_id uuid not null unique references public.datasets (id) on update cascade on delete cascade,
  -- Workspace this dataset belongs to
  workspace_id uuid not null references public.workspaces (id) on update cascade on delete cascade,
  -- Timestamp of when the dataset was created.
  created_at timestamptz not null default now(),
  -- Timestamp of when this row was last updated.
  updated_at timestamptz not null default now(),
  -- Whether the parquet is available in cloud storage.
  is_in_cloud_storage boolean not null default false,
  -- Size of the source PDF in bytes
  size_in_bytes bigint not null,
  -- Whether the original PDF was retained. Always true for cloud-synced
  -- datasets; see AVA-317. Recorded here so a client can tell whether
  -- re-extraction is possible without probing storage.
  has_original_file boolean not null default false,
  -- WHERE the extracted table physically sits, as one entry per page
  -- fragment. A table spanning pages 4-7 has four entries. Shape:
  --   [{ "page": 4, "bbox": [x0, y0, x1, y1] }, ...]
  --
  -- Deliberately NOT an ordinal index like "table 3". A sheet name is an
  -- identity Excel guarantees; a table ordinal is an output of our own
  -- detector, so improving detection could silently repoint a saved
  -- dataset at different data. Geometry is stable across detector
  -- versions.
  regions jsonb not null,
  -- Which signal produced this table.
  detection_mode public.datasets__pdf_detection_mode not null,
  -- Snapped grid line coordinates, so a re-parse reproduces the exact same
  -- cell boundaries. Null for `tagged`, where the structure tree supplies
  -- the grid directly.
  grid_x jsonb,
  grid_y jsonb,
  -- The page range the user limited detection to, if any. Inclusive, and
  -- zero-based to match `regions[].page`.
  --
  -- Two plain integers rather than an `int4range`, deliberately. We never
  -- range-query this column, and PostgREST hands a range back as its text
  -- form ("[4,9)"), so a range type would mean writing and maintaining an
  -- encode/decode codec for no benefit. The first cut of this table did use
  -- `int4range` and it was a live bug: the value arrived as a string while
  -- the type claimed a `[number, number]` tuple, so `pageRange[0]` was "[".
  page_range_start integer,
  page_range_end integer,
  -- Number of leading rows treated as header.
  header_rows integer not null default 1,
  -- Whether a value spanning several rows is repeated into each of them.
  fill_merged_cells boolean not null default true,
  -- Snapshot of what was extracted at import time, compared on re-parse to
  -- detect drift. Shape:
  --   { "headers": [...], "shape": [rowCount, colCount], "hash": "..." }
  fingerprint jsonb not null
);

-- Enable row level security
alter table public.datasets__pdf_file enable row level security;

-- Data API privileges.
--
-- REQUIRED, not optional. Supabase CLI 2.114.0 stopped auto-exposing new
-- tables in `public`, so a table without this grant is unreachable through
-- PostgREST no matter how correct its RLS is, and the failure is silent.
-- See the explanation in `supabase/schemas/99.grants.service_role.sql`.
grant
select
,
  insert,
update,
delete on table public.datasets__pdf_file to authenticated;

-- Policies
create policy "User can select datasets__pdf_file in their workspace" on public.datasets__pdf_file for
select
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'viewer'
    )
  );

create policy "User can insert datasets__pdf_file in their workspace" on public.datasets__pdf_file for insert to authenticated
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'editor'
    )
  );

create policy "User can update datasets__pdf_file in their workspace" on public.datasets__pdf_file
for update
  to authenticated using (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'editor'
    )
  )
with
  check (
    public.util__auth_user_can_access_resource (
      'dataset',
      public.datasets__pdf_file.dataset_id,
      'editor'
    )
  );

create policy "User can delete datasets__pdf_file in their workspace" on public.datasets__pdf_file for delete to authenticated using (
  public.util__auth_user_can_access_resource (
    'dataset',
    public.datasets__pdf_file.dataset_id,
    'admin'
  )
);

/**
 * Trigger the `updated_at` update
 */
create trigger tr_datasets__pdf_file__set_updated_at before
update on public.datasets__pdf_file for each row
execute function public.util__set_updated_at ();
```

- [ ] **Step 2: Generate and apply the migration**

```bash
pnpm db:new-migration add_datasets_pdf_file_table
pnpm db:reset
pnpm db:gen-types
```

Expected: `shared/types/database.types.ts` gains a `datasets__pdf_file` table
entry.

- [ ] **Step 3: Create the model types**

Create `shared/models/datasets/PdfFileDataset/PdfFileDataset.types.ts`:

```ts
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

type ModelType = "PdfFileDataset";
export type PdfFileDatasetId = UUID<ModelType>;

/** How a PDF table's structure was determined. */
export type PdfDetectionMode = "tagged" | "lattice" | "stream" | "manual";

/**
 * A rectangle on one page, in PDF user-space points with the origin at the
 * bottom-left, matching pdf.js's coordinate system.
 */
export type PdfTableRegion = {
  /** Zero-based page index. */
  page: number;
  /** `[x0, y0, x1, y1]`, bottom-left and top-right corners. */
  bbox: readonly [number, number, number, number];
};

/**
 * Snapshot of the extracted table taken at import time. Compared against a
 * fresh extraction on re-parse so drift is reported rather than silently
 * applied.
 */
export type PdfTableFingerprint = {
  headers: readonly string[];
  shape: readonly [rowCount: number, columnCount: number];
  hash: string;
};

export type PdfFileDatasetRead = Model.Base<
  ModelType,
  {
    /** Timestamp of when the dataset was created. */
    createdAt: string;

    /** Unique identifier of the dataset. */
    datasetId: DatasetId;

    /** Unique identifier of the PDF file dataset in our system. */
    id: PdfFileDatasetId;

    /** Timestamp of when the dataset was last updated. */
    updatedAt: string;

    /** Unique identifier of the workspace the dataset belongs to. */
    workspaceId: Workspace.Id;

    /** If true, the parquet is persisted in cloud storage. */
    isInCloudStorage: boolean;

    /** Size of the source PDF in bytes. */
    sizeInBytes: number;

    /** Whether the original PDF was retained. See AVA-317. */
    hasOriginalFile: boolean;

    /** Page fragments the table occupies, in reading order. */
    regions: readonly PdfTableRegion[];

    /** Which detection signal produced this table. */
    detectionMode: PdfDetectionMode;

    /** Snapped column boundaries; undefined for `tagged`. */
    gridX: readonly number[] | undefined;

    /** Snapped row boundaries; undefined for `tagged`. */
    gridY: readonly number[] | undefined;

    /** Page range detection was limited to, as `[start, end]` inclusive. */
    pageRange: readonly [number, number] | undefined;

    /** Number of leading rows treated as header. */
    headerRows: number;

    /** Whether merged cells are filled down into every row they span. */
    fillMergedCells: boolean;

    /** Drift-detection snapshot taken at import time. */
    fingerprint: PdfTableFingerprint;
  }
>;

/**
 * CRUD type definitions for the PdfFileDataset model.
 */
export type PdfFileDatasetModel = SupabaseCrudModelSpec<
  {
    tableName: "datasets__pdf_file";
    modelName: "PdfFileDataset";
    modelPrimaryKeyType: PdfFileDatasetId;
    modelTypes: {
      Read: PdfFileDatasetRead;
      Insert: SetOptional<PdfFileDatasetRead, "createdAt" | "id" | "updatedAt">;
      Update: Partial<PdfFileDatasetRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
```

- [ ] **Step 4: Create the parsers**

Create `shared/models/datasets/PdfFileDataset/PdfFileDatasetParsers.ts`:

```ts
import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  PdfFileDatasetId,
  PdfFileDatasetModel,
} from "$/models/datasets/PdfFileDataset/PdfFileDataset.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid(),
  detection_mode: z.enum(["tagged", "lattice", "stream", "manual"]),
  fill_merged_cells: z.boolean(),
  fingerprint: z.unknown(),
  grid_x: z.unknown(),
  grid_y: z.unknown(),
  has_original_file: z.boolean(),
  header_rows: z.number(),
  id: z.uuid(),
  is_in_cloud_storage: z.boolean(),
  page_range_end: z.number().nullable(),
  page_range_start: z.number().nullable(),
  regions: z.unknown(),
  size_in_bytes: z.number(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const PdfFileDatasetParsers =
  makeParserRegistry<PdfFileDatasetModel>().build({
    modelName: "PdfFileDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj) => {
        return Model.make("PdfFileDataset", {
          ...obj,
          datasetId: obj.datasetId as DatasetId,
          id: obj.id as PdfFileDatasetId,
          workspaceId: obj.workspaceId as Workspace.Id,
        });
      },
    ),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = PdfFileDatasetModel;
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

If the `ZodConsistencyTests` assertion fails to compile, the `z.unknown()`
entries are the likely cause: match them to whatever `database.types.ts`
generated for the `jsonb` columns (commonly `Json`). Adjust the Zod schema to
match the generated type rather than changing the generated type.

- [ ] **Step 5: Create the namespace export**

Create `shared/models/datasets/PdfFileDataset/PdfFileDataset.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace */
import type {
  PdfFileDatasetId,
  PdfFileDatasetModel,
} from "$/models/datasets/PdfFileDataset/PdfFileDataset.types.ts";

export { PdfFileDatasetParsers } from "$/models/datasets/PdfFileDataset/PdfFileDatasetParsers.ts";

export namespace PdfFileDataset {
  export type T<K extends keyof PdfFileDatasetModel = "Read"> =
    PdfFileDatasetModel[K];
  export type Id = PdfFileDatasetId;
}
```

- [ ] **Step 6: Verify it type-checks**

Run: `pnpm type-check`
Expected: no errors. The `DatasetSourceRegistry` import added in Task 1
Step 3 now resolves.

- [ ] **Step 7: Commit**

```bash
git add supabase/ shared/models/datasets/PdfFileDataset/ shared/types/database.types.ts
git commit -m "feat: add datasets__pdf_file table and PdfFileDataset model"
```

---

## Task 5: The creation RPC and source client

**Files:**
- Create: `supabase/schemas/70.rpc_datasets__add_pdf_file_dataset.sql`
- Create: `src/clients/datasets/source-datasets/PdfFileDatasetClient.ts`
- Modify: `src/clients/datasets/SourceDatasetClient.ts:6-18`

- [ ] **Step 1: Create the RPC**

Create `supabase/schemas/70.rpc_datasets__add_pdf_file_dataset.sql`:

```sql
/**
 * Add a PDF file dataset to a workspace.
 * Calls rpc_datasets__add_dataset and inserts metadata into
 * datasets__pdf_file.
 *
 * @param p_dataset_id: The id of the dataset to add
 * @param p_workspace_id: The workspace id to add the dataset to
 * @param p_dataset_name: The name of the dataset
 * @param p_dataset_description: The description of the dataset
 * @param p_columns: The columns of the dataset
 * @param p_is_in_cloud_storage: Whether the parquet is in cloud storage
 * @param p_size_in_bytes: The size of the source PDF in bytes
 * @param p_has_original_file: Whether the original PDF was retained
 * @param p_regions: Page fragments the extracted table occupies
 * @param p_detection_mode: Which detection signal produced the table
 * @param p_grid_x: Snapped column boundaries (null for tagged)
 * @param p_grid_y: Snapped row boundaries (null for tagged)
 * @param p_page_range_start: First page detection was limited to (nullable)
 * @param p_page_range_end: Last page detection was limited to (nullable)
 * @param p_header_rows: Number of leading rows treated as header
 * @param p_fill_merged_cells: Whether merged cells are filled down
 * @param p_fingerprint: Drift-detection snapshot taken at import time
 *
 * @returns: The created dataset
 */
create or replace function public.rpc_datasets__add_pdf_file_dataset (
  p_dataset_id uuid,
  p_workspace_id uuid,
  p_dataset_name text,
  p_dataset_description text,
  p_columns public.dataset_column_input[],
  p_is_in_cloud_storage boolean,
  p_size_in_bytes bigint,
  p_has_original_file boolean,
  p_regions jsonb,
  p_detection_mode public.datasets__pdf_detection_mode,
  p_grid_x jsonb,
  p_grid_y jsonb,
  p_page_range_start integer,
  p_page_range_end integer,
  p_header_rows integer,
  p_fill_merged_cells boolean,
  p_fingerprint jsonb
) returns public.datasets as $$
declare
  v_dataset public.datasets;
begin
  v_dataset := public.rpc_datasets__add_dataset(
    p_dataset_id,
    p_workspace_id,
    p_dataset_name,
    p_dataset_description,
    'pdf_file',
    p_columns
  );

  insert into public.datasets__pdf_file (
    dataset_id,
    workspace_id,
    is_in_cloud_storage,
    size_in_bytes,
    has_original_file,
    regions,
    detection_mode,
    grid_x,
    grid_y,
    page_range_start,
    page_range_end,
    header_rows,
    fill_merged_cells,
    fingerprint
  ) values (
    v_dataset.id,
    p_workspace_id,
    p_is_in_cloud_storage,
    p_size_in_bytes,
    p_has_original_file,
    p_regions,
    p_detection_mode,
    p_grid_x,
    p_grid_y,
    p_page_range_start,
    p_page_range_end,
    p_header_rows,
    p_fill_merged_cells,
    p_fingerprint
  );

  return v_dataset;
end;
$$ language plpgsql security invoker;
```

- [ ] **Step 2: Generate and apply**

```bash
pnpm db:new-migration add_rpc_add_pdf_file_dataset
pnpm db:reset
pnpm db:gen-types
```

- [ ] **Step 3: Create the source client**

Create `src/clients/datasets/source-datasets/PdfFileDatasetClient.ts`:

```ts
import { PdfFileDatasetParsers } from "$/models/datasets/PdfFileDataset/PdfFileDatasetParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const PdfFileDatasetClient = createUsableServiceClient(
  createRdbCrudClient({
    dbTablePrimaryKey: "id",
    modelName: "PdfFileDataset",
    parsers: PdfFileDatasetParsers,
    tableName: "datasets__pdf_file",
  }),
);
```

- [ ] **Step 4: Register it**

In `src/clients/datasets/SourceDatasetClient.ts`, add the import next to the
other source clients:

```ts
import { PdfFileDatasetClient } from "./source-datasets/PdfFileDatasetClient";
```

and add the registry entry:

```ts
const SourceDatasetClientRegistry = {
  csv_file: CsvFileDatasetClient,
  google_sheets: GoogleSheetsDatasetClient,
  open_data: OpenDataDatasetClient,
  pdf_file: PdfFileDatasetClient,
  virtual: VirtualDatasetClient,
  xlsx_file: XlsxFileDatasetClient,
} satisfies Registry<DatasetSource.SourceType>;
```

The `satisfies Registry<DatasetSource.SourceType>` constraint is what makes a
missing entry a compile error, so this step is also the check that nothing
else was forgotten.

- [ ] **Step 5: Verify**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/ src/clients/datasets/
git commit -m "feat: add pdf_file dataset creation RPC and source client"
```

---

## Task 6: Pin retained source bytes against LRU eviction

**Files:**
- Modify: `src/models/LocalDataset/LocalDataset.types.ts:24,90-113`
- Modify: `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.ts:43-87`
- Create: `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.eviction.test.ts`

The evictor currently frees space by dropping the oldest `sourceBytes` rows.
For a PDF that is data loss, because those bytes are the only copy of the
original on an offline-only dataset.

- [ ] **Step 1: Write the failing test**

Create `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.eviction.test.ts`:

```ts
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { evictSourceCache } from "./LocalDatasetClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { UserId } from "$/models/User/User.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111" as Workspace.Id;
const USER_ID = "22222222-2222-4222-8222-222222222222" as UserId;

/** One gibibyte, matching SOURCE_CACHE_TOTAL_MAX_BYTES. */
const ONE_GIB = 1024 * 1024 * 1024;

function makeBlobOfSize(sizeInBytes: number): Blob {
  return new Blob([new Uint8Array(sizeInBytes)]);
}

async function putRow(options: {
  datasetId: string;
  sizeInBytes: number;
  lastSourceAccessedAt: number;
  isSourcePinned: boolean;
}): Promise<void> {
  await AvaDexie.DB.LocalDataset.put({
    datasetId: options.datasetId as DatasetId,
    workspaceId: WORKSPACE_ID,
    userId: USER_ID,
    parquetData: undefined,
    parseStatus: "ready",
    parseStartedAt: undefined,
    parseFailedReason: undefined,
    sourceBytes: makeBlobOfSize(options.sizeInBytes),
    sourceFileName: `${options.datasetId}.bin`,
    sourceFileType: options.isSourcePinned ? "pdf" : "csv",
    sourceFileSize: options.sizeInBytes,
    lastSourceAccessedAt: options.lastSourceAccessedAt,
    isSourcePinned: options.isSourcePinned,
    parseOptions: undefined,
  });
}

describe("evictSourceCache", () => {
  beforeEach(async () => {
    await AvaDexie.DB.LocalDataset.clear();
  });

  it("evicts the oldest unpinned rows first", async () => {
    // Two unpinned rows at 400MiB each. Reserving 400MiB more pushes the
    // total to 1.2GiB, over the 1GiB budget, so the older one must go.
    const fourHundredMib = 400 * 1024 * 1024;
    await putRow({
      datasetId: "aaaaaaaa-0000-4000-8000-000000000001",
      sizeInBytes: fourHundredMib,
      lastSourceAccessedAt: 1_000,
      isSourcePinned: false,
    });
    await putRow({
      datasetId: "aaaaaaaa-0000-4000-8000-000000000002",
      sizeInBytes: fourHundredMib,
      lastSourceAccessedAt: 2_000,
      isSourcePinned: false,
    });

    await evictSourceCache(fourHundredMib);

    const older = await AvaDexie.DB.LocalDataset.get(
      "aaaaaaaa-0000-4000-8000-000000000001" as DatasetId,
    );
    const newer = await AvaDexie.DB.LocalDataset.get(
      "aaaaaaaa-0000-4000-8000-000000000002" as DatasetId,
    );
    expect(older?.sourceBytes).toBeUndefined();
    expect(newer?.sourceBytes).toBeDefined();
  });

  it("never evicts a pinned row, even when it is the oldest", async () => {
    // The pinned row is both the oldest and large enough that evicting it
    // would be the evictor's first choice. For a PDF these bytes are the
    // only copy of the original, so losing them is unrecoverable.
    const eightHundredMib = 800 * 1024 * 1024;
    await putRow({
      datasetId: "bbbbbbbb-0000-4000-8000-000000000001",
      sizeInBytes: eightHundredMib,
      lastSourceAccessedAt: 1,
      isSourcePinned: true,
    });

    await evictSourceCache(ONE_GIB);

    const pinned = await AvaDexie.DB.LocalDataset.get(
      "bbbbbbbb-0000-4000-8000-000000000001" as DatasetId,
    );
    expect(pinned?.sourceBytes).toBeDefined();
    expect(pinned?.sourceFileName).toBe(
      "bbbbbbbb-0000-4000-8000-000000000001.bin",
    );
  });

  it("evicts unpinned rows even when a pinned row alone exceeds the budget", async () => {
    // A pinned row can push us over budget on its own. The evictor must
    // still reclaim what it legitimately can rather than giving up or
    // looping forever.
    await putRow({
      datasetId: "cccccccc-0000-4000-8000-000000000001",
      sizeInBytes: 900 * 1024 * 1024,
      lastSourceAccessedAt: 1,
      isSourcePinned: true,
    });
    await putRow({
      datasetId: "cccccccc-0000-4000-8000-000000000002",
      sizeInBytes: 200 * 1024 * 1024,
      lastSourceAccessedAt: 2,
      isSourcePinned: false,
    });

    await evictSourceCache(0);

    const pinned = await AvaDexie.DB.LocalDataset.get(
      "cccccccc-0000-4000-8000-000000000001" as DatasetId,
    );
    const unpinned = await AvaDexie.DB.LocalDataset.get(
      "cccccccc-0000-4000-8000-000000000002" as DatasetId,
    );
    expect(pinned?.sourceBytes).toBeDefined();
    expect(unpinned?.sourceBytes).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/clients/datasets/LocalDatasetClient/LocalDatasetClient.eviction.test.ts`
Expected: FAIL, `evictSourceCache` is not exported.

- [ ] **Step 3: Add the field to the LocalDataset type**

In `src/models/LocalDataset/LocalDataset.types.ts`, widen the source file type
union (line 24):

```ts
export type LocalDatasetSourceFileType = "csv" | "xlsx" | "pdf";
```

and add this field to `LocalDatasetDBRead`, after `lastSourceAccessedAt`:

```ts
  /**
   * When true, `sourceBytes` is the retained original file rather than a
   * resume cache, and must survive both LRU eviction and the post-transcode
   * cleanup.
   *
   * Set for source types where the original cannot be reconstructed from the
   * parquet plus metadata; see `requiresOriginalFileRetention`. For an
   * offline-only PDF these bytes are the only copy in existence, so dropping
   * them is unrecoverable data loss rather than a cache miss.
   */
  isSourcePinned: boolean | undefined;
```

Also update the `sourceBytes` doc comment, which currently claims the bytes are
"Always cleared once `parseStatus` transitions to `ready`". Replace that
sentence with:

```
   * Cleared once `parseStatus` transitions to `"ready"`, unless
   * `isSourcePinned` is set, in which case the bytes are the retained
   * original and are kept indefinitely.
```

No Dexie version bump is required: the field is not indexed, and existing rows
read back `undefined`, which is correctly falsy.

- [ ] **Step 4: Make the evictor pin-aware and export it**

In `src/clients/datasets/LocalDatasetClient/LocalDatasetClient.ts`, replace
`_evictSourceCache` (lines 49-75) with an exported, pin-aware version:

```ts
/**
 * Drop source-bytes entries (oldest first by `lastSourceAccessedAt`) until
 * the running total + `reservedBytes` is under
 * `SOURCE_CACHE_TOTAL_MAX_BYTES`. Idempotent and safe to call before any
 * cache write.
 *
 * Pinned rows are never evicted and never counted as reclaimable. They still
 * count toward the running total, because they genuinely occupy the budget;
 * this means a large enough pinned set can leave us over budget with nothing
 * left to reclaim, at which point the loop simply ends.
 *
 * Exported for tests.
 */
export async function evictSourceCache(reservedBytes: number): Promise<void> {
  const allRowsWithBytes = (await AvaDexie.DB.LocalDataset.toArray()).filter(
    (r) => {
      return r.sourceBytes !== undefined;
    },
  );

  let total = allRowsWithBytes.reduce((sum, r) => {
    return sum + (r.sourceBytes?.size ?? 0);
  }, 0);

  const evictableRows = allRowsWithBytes.filter((r) => {
    return !r.isSourcePinned;
  });

  evictableRows.sort((a, b) => {
    return (a.lastSourceAccessedAt ?? 0) - (b.lastSourceAccessedAt ?? 0);
  });

  while (
    total + reservedBytes > SOURCE_CACHE_TOTAL_MAX_BYTES &&
    evictableRows.length
  ) {
    const victim = evictableRows.shift();
    if (!victim || !victim.sourceBytes) {
      break;
    }
    const freed = victim.sourceBytes.size;
    await AvaDexie.DB.LocalDataset.update(victim.datasetId, {
      sourceBytes: undefined,
      sourceFileName: undefined,
      sourceFileType: undefined,
      lastSourceAccessedAt: undefined,
    });
    total -= freed;
  }
}
```

Update the one call site inside `_maybeCacheSourceBytes` to call
`evictSourceCache` instead of `_evictSourceCache`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/clients/datasets/LocalDatasetClient/LocalDatasetClient.eviction.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/models/LocalDataset/ src/clients/datasets/LocalDatasetClient/
git commit -m "feat: exempt pinned source bytes from LRU eviction"
```

---

## Task 7: Preserve pinned source bytes after transcoding

**Files:**
- Modify: `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.ts:145-153`
- Create: `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.retention.test.ts`

The transcode success path clears `sourceBytes` unconditionally. That is the
second place a retained original would be destroyed, and unlike eviction it
fires on every single import.

- [ ] **Step 1: Write the failing test**

Create `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.retention.test.ts`:

```ts
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { buildTranscodeCompletionUpdate } from "./runBackgroundParquetTranscoding";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const PARQUET = new Blob([new Uint8Array(16)]);

describe("buildTranscodeCompletionUpdate", () => {
  it("drops source bytes for an unpinned row", () => {
    // A CSV's source bytes are only a resume cache. Once the parquet has
    // landed there is nothing left to resume, so holding them wastes quota.
    const update = buildTranscodeCompletionUpdate({
      parquetData: PARQUET,
      isSourcePinned: false,
    });

    expect(update.parquetData).toBe(PARQUET);
    expect(update.parseStatus).toBe("ready");
    expect(update).toHaveProperty("sourceBytes", undefined);
    expect(update).toHaveProperty("lastSourceAccessedAt", undefined);
  });

  it("leaves source bytes untouched for a pinned row", () => {
    // For a PDF the bytes are the retained original, not a cache. The
    // update must not mention sourceBytes at all: passing `undefined` to
    // Dexie's update() would delete the field.
    const update = buildTranscodeCompletionUpdate({
      parquetData: PARQUET,
      isSourcePinned: true,
    });

    expect(update.parquetData).toBe(PARQUET);
    expect(update.parseStatus).toBe("ready");
    expect(update).not.toHaveProperty("sourceBytes");
    expect(update).not.toHaveProperty("lastSourceAccessedAt");
  });
});

describe("transcode completion against Dexie", () => {
  beforeEach(async () => {
    await AvaDexie.DB.LocalDataset.clear();
  });

  it("keeps the original readable after the parquet lands", async () => {
    const datasetId = "dddddddd-0000-4000-8000-000000000001" as DatasetId;
    const originalBytes = new Blob([new Uint8Array(64)]);

    await AvaDexie.DB.LocalDataset.put({
      datasetId,
      workspaceId: "11111111-1111-4111-8111-111111111111" as never,
      userId: "22222222-2222-4222-8222-222222222222" as never,
      parquetData: undefined,
      parseStatus: "parsing",
      parseStartedAt: 1,
      parseFailedReason: undefined,
      sourceBytes: originalBytes,
      sourceFileName: "report.pdf",
      sourceFileType: "pdf",
      sourceFileSize: 64,
      lastSourceAccessedAt: 1,
      isSourcePinned: true,
      parseOptions: undefined,
    });

    await AvaDexie.DB.LocalDataset.update(
      datasetId,
      buildTranscodeCompletionUpdate({
        parquetData: PARQUET,
        isSourcePinned: true,
      }),
    );

    const row = await AvaDexie.DB.LocalDataset.get(datasetId);
    expect(row?.parseStatus).toBe("ready");
    expect(row?.parquetData).toBeDefined();
    expect(row?.sourceBytes?.size).toBe(64);
    expect(row?.sourceFileName).toBe("report.pdf");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.retention.test.ts`
Expected: FAIL, `buildTranscodeCompletionUpdate` is not exported.

- [ ] **Step 3: Extract and export the update builder**

In `src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.ts`,
add this function above `runBackgroundParquetTranscoding`:

```ts
/**
 * Builds the Dexie update applied when a transcode succeeds.
 *
 * Split out from the call site so the retention rule is directly testable.
 * The important subtlety is that a pinned row's update must **omit**
 * `sourceBytes` entirely rather than pass `undefined`: Dexie's `update()`
 * treats an explicit `undefined` as a delete, so including the key with an
 * undefined value would destroy the very bytes we are trying to keep.
 *
 * Exported for tests.
 */
export function buildTranscodeCompletionUpdate(options: {
  parquetData: Blob;
  isSourcePinned: boolean | undefined;
}): Partial<LocalDataset> {
  const base = {
    parquetData: options.parquetData,
    parseStatus: "ready" as const,
    parseFailedReason: undefined,
  };

  if (options.isSourcePinned) {
    return base;
  }

  return {
    ...base,
    // Drop the cached source bytes now that the parquet has landed;
    // we no longer need them for resume.
    sourceBytes: undefined,
    lastSourceAccessedAt: undefined,
  };
}
```

Add `import type { LocalDataset } from "@/models/LocalDataset/LocalDataset.types";`
if it is not already imported.

- [ ] **Step 4: Use it at the call site**

Replace the `AvaDexie.DB.LocalDataset.update` call at lines 145-153 with:

```ts
    const existingRow = await AvaDexie.DB.LocalDataset.get(datasetId);
    await AvaDexie.DB.LocalDataset.update(
      datasetId,
      buildTranscodeCompletionUpdate({
        parquetData: result.parquetData,
        isSourcePinned: existingRow?.isSourcePinned,
      }),
    );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/clients/datasets/LocalDatasetClient/runBackgroundParquetTranscoding.retention.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Run the wider local-dataset suite for regressions**

Run: `pnpm vitest run src/clients/datasets/`
Expected: PASS. The CSV and XLSX paths must be unchanged, since
`isSourcePinned` is undefined for them and the builder takes the clearing
branch.

- [ ] **Step 7: Commit**

```bash
git add src/clients/datasets/LocalDatasetClient/
git commit -m "feat: keep retained originals after parquet transcoding"
```

---

## Task 8: The original-file storage path helper

**Files:**
- Create: `src/clients/storage/DatasetOriginalFileStorageClient/utils.ts`
- Create: `src/clients/storage/DatasetOriginalFileStorageClient/utils.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/clients/storage/DatasetOriginalFileStorageClient/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDatasetOriginalFileStoragePath } from "./utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "aaaaaaaa-0000-4000-8000-000000000001" as Workspace.Id;
const DATASET_ID = "bbbbbbbb-0000-4000-8000-000000000002" as DatasetId;

describe("getDatasetOriginalFileStoragePath", () => {
  it("builds a path the storage RLS can parse", () => {
    // The path shape is load-bearing: util__storage_object_dataset_id
    // accepts exactly `<ws>/datasets/<id>.parquet` and
    // `<ws>/datasets/<id>.original.<ext>`, and every workspaces-bucket
    // policy denies access when it cannot parse the name.
    expect(
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "pdf",
      }),
    ).toBe(
      "aaaaaaaa-0000-4000-8000-000000000001/datasets/bbbbbbbb-0000-4000-8000-000000000002.original.pdf",
    );
  });

  it("lowercases the extension so paths are stable", () => {
    expect(
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "PDF",
      }),
    ).toMatch(/\.original\.pdf$/);
  });

  it("strips a leading dot from the extension", () => {
    expect(
      getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: ".pdf",
      }),
    ).toMatch(/\.original\.pdf$/);
  });

  it("rejects an extension the storage RLS would refuse", () => {
    // Better to fail here with a clear message than to upload an object
    // that RLS silently makes unreachable.
    expect(() => {
      return getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "not-a-real-extension",
      });
    }).toThrow(/extension/i);

    expect(() => {
      return getDatasetOriginalFileStoragePath({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        fileExtension: "",
      });
    }).toThrow(/extension/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/clients/storage/DatasetOriginalFileStorageClient/utils.test.ts`
Expected: FAIL, cannot resolve `./utils`.

- [ ] **Step 3: Write the implementation**

Create `src/clients/storage/DatasetOriginalFileStorageClient/utils.ts`:

```ts
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Mirrors the extension pattern in `util__storage_object_dataset_id`. An
 * object whose name that function cannot parse is unreachable through every
 * `workspaces` bucket policy, so we validate here rather than discovering it
 * as an opaque permission error at upload time.
 */
const VALID_EXTENSION_PATTERN = /^[A-Za-z0-9]{1,10}$/;

/**
 * Storage path for a dataset's retained original file.
 *
 * Sits directly alongside the parquet in `<workspaceId>/datasets/` so the
 * existing bucket policies apply unchanged.
 */
export function getDatasetOriginalFileStoragePath(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  fileExtension: string;
}): string {
  const { workspaceId, datasetId } = options;
  const normalizedExtension = options.fileExtension
    .replace(/^\./, "")
    .toLowerCase();

  if (!VALID_EXTENSION_PATTERN.test(normalizedExtension)) {
    throw new Error(
      `Cannot store an original file with extension "${options.fileExtension}": ` +
        "storage object names allow 1-10 alphanumeric characters.",
    );
  }

  return `${workspaceId}/datasets/${datasetId}.original.${normalizedExtension}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/clients/storage/DatasetOriginalFileStorageClient/utils.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/clients/storage/DatasetOriginalFileStorageClient/
git commit -m "feat: add original-file storage path helper"
```

---

## Task 9: The original-file storage client

**Files:**
- Create: `src/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient.ts`

Mirrors `DatasetParquetStorageClient`. Uploads go through the same
size-threshold branch: one-shot below `DIRECT_UPLOAD_MAX_BYTES`, resumable Tus
above it, because a scanned PDF can easily exceed the 6MB direct limit.

- [ ] **Step 1: Write the implementation**

Create `src/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient.ts`:

```ts
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { getDatasetOriginalFileStoragePath } from "@/clients/storage/DatasetOriginalFileStorageClient/utils";
import {
  DIRECT_UPLOAD_MAX_BYTES,
  WORKSPACES_BUCKET_NAME,
} from "@/clients/storage/DatasetParquetStorageClient/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type OriginalFileLocator = {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  fileExtension: string;
};

async function _getTusHeaders(): Promise<Record<string, string>> {
  const session = await AuthClient.getCurrentSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to sync datasets online.");
  }

  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY is not set.");
  }

  return {
    apikey: apiKey,
    authorization: `Bearer ${accessToken}`,
    "x-upsert": "true",
  };
}

async function _resumableUpload(options: {
  objectPath: string;
  file: File;
}): Promise<void> {
  const endpoint = `${AvaSupabase.getAPIURL()}/storage/v1/upload/resumable`;
  const tusHeaders = await _getTusHeaders();

  const uppy = new Uppy({ autoProceed: true, allowMultipleUploads: false });
  uppy.use(Tus, {
    endpoint,
    chunkSize: 6 * 1024 * 1024,
    retryDelays: [0, 1000, 3000, 5000, 10000],
    headers: tusHeaders,
    removeFingerprintOnSuccess: true,
  });

  uppy.addFile({
    name: options.file.name,
    type: options.file.type,
    data: options.file,
    meta: {
      bucketName: WORKSPACES_BUCKET_NAME,
      objectName: options.objectPath,
      contentType: options.file.type,
    },
  });

  try {
    const result = await uppy.upload();
    const failedUploads = result?.failed ?? [];
    if (failedUploads.length > 0) {
      const firstFailure = failedUploads[0];
      throw firstFailure?.error ?? new Error("Original file upload failed.");
    }
  } finally {
    uppy.destroy();
  }
}

async function _oneShotUpload(options: {
  objectPath: string;
  file: File;
}): Promise<void> {
  const { error } = await AvaSupabase.db()
    .storage.from(WORKSPACES_BUCKET_NAME)
    .upload(options.objectPath, options.file, {
      contentType: options.file.type,
      upsert: true,
    });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Uploads a dataset's retained original file to Supabase storage.
 *
 * Only called for source types where the original cannot be reconstructed
 * from the parquet plus metadata, and only when the user has allowed cloud
 * sync. An offline-only dataset keeps its original in IndexedDB and nowhere
 * else.
 */
async function uploadOriginalFile(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  file: File;
}): Promise<void> {
  const fileExtension = options.file.name.split(".").pop() ?? "";
  const objectPath = getDatasetOriginalFileStoragePath({
    workspaceId: options.workspaceId,
    datasetId: options.datasetId,
    fileExtension,
  });

  if (options.file.size > DIRECT_UPLOAD_MAX_BYTES) {
    await _resumableUpload({ objectPath, file: options.file });
    return;
  }
  await _oneShotUpload({ objectPath, file: options.file });
}

/**
 * Downloads a dataset's retained original file. Returns undefined when no
 * original was retained, which is the normal case for CSV and XLSX.
 */
async function downloadOriginalFile(
  options: OriginalFileLocator,
): Promise<Blob | undefined> {
  const objectPath = getDatasetOriginalFileStoragePath(options);
  const { data, error } = await AvaSupabase.db()
    .storage.from(WORKSPACES_BUCKET_NAME)
    .download(objectPath);

  if (error || !data) {
    return undefined;
  }
  return data;
}

/** Removes a dataset's retained original file from storage. */
async function deleteOriginalFile(
  options: OriginalFileLocator,
): Promise<void> {
  const objectPath = getDatasetOriginalFileStoragePath(options);
  const { error } = await AvaSupabase.db()
    .storage.from(WORKSPACES_BUCKET_NAME)
    .remove([objectPath]);

  if (error) {
    throw new Error(error.message);
  }
}

export const DatasetOriginalFileStorageClient = {
  uploadOriginalFile,
  downloadOriginalFile,
  deleteOriginalFile,
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/clients/storage/DatasetOriginalFileStorageClient/
git commit -m "feat: add original-file storage client"
```

---

## Task 10: Upload the original alongside the parquet

**Files:**
- Modify: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/useSaveDataset.ts:235-253`
- Create: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/startOriginalFileUploadIfNeeded.ts`
- Create: `src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/startOriginalFileUploadIfNeeded.test.ts`

- [ ] **Step 1: Write the failing test**

Create `startOriginalFileUploadIfNeeded.test.ts`:

```ts
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { startOriginalFileUploadIfNeeded } from "./startOriginalFileUploadIfNeeded";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "aaaaaaaa-0000-4000-8000-000000000001" as Workspace.Id;
const DATASET_ID = "bbbbbbbb-0000-4000-8000-000000000002" as DatasetId;

const uploadOriginalFile = vi.fn();

vi.mock(
  "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient",
  () => {
    return {
      DatasetOriginalFileStorageClient: {
        uploadOriginalFile: (...args: unknown[]) => {
          return uploadOriginalFile(...args);
        },
      },
    };
  },
);

async function putLocalRow(sourceBytes: Blob | undefined): Promise<void> {
  await AvaDexie.DB.LocalDataset.put({
    datasetId: DATASET_ID,
    workspaceId: WORKSPACE_ID,
    userId: "cccccccc-0000-4000-8000-000000000003" as never,
    parquetData: new Blob([new Uint8Array(8)]),
    parseStatus: "ready",
    parseStartedAt: undefined,
    parseFailedReason: undefined,
    sourceBytes,
    sourceFileName: "report.pdf",
    sourceFileType: "pdf",
    sourceFileSize: sourceBytes?.size,
    lastSourceAccessedAt: undefined,
    isSourcePinned: true,
    parseOptions: undefined,
  });
}

describe("startOriginalFileUploadIfNeeded", () => {
  beforeEach(async () => {
    uploadOriginalFile.mockReset();
    await AvaDexie.DB.LocalDataset.clear();
  });

  it("uploads the original for a cloud-synced pdf dataset", async () => {
    await putLocalRow(new Blob([new Uint8Array(32)]));

    await startOriginalFileUploadIfNeeded({
      workspaceId: WORKSPACE_ID,
      datasetId: DATASET_ID,
      sourceType: "pdf_file",
      onlineStorageAllowed: true,
    });

    expect(uploadOriginalFile).toHaveBeenCalledTimes(1);
    const [call] = uploadOriginalFile.mock.calls;
    expect(call?.[0]).toMatchObject({
      workspaceId: WORKSPACE_ID,
      datasetId: DATASET_ID,
    });
  });

  it("uploads nothing for an offline-only pdf dataset", async () => {
    // This is the whole point of the offline-only guarantee: a sensitive
    // document must never leave the device.
    await putLocalRow(new Blob([new Uint8Array(32)]));

    await startOriginalFileUploadIfNeeded({
      workspaceId: WORKSPACE_ID,
      datasetId: DATASET_ID,
      sourceType: "pdf_file",
      onlineStorageAllowed: false,
    });

    expect(uploadOriginalFile).not.toHaveBeenCalled();
  });

  it("uploads nothing for a reconstructable source type", async () => {
    await putLocalRow(new Blob([new Uint8Array(32)]));

    await startOriginalFileUploadIfNeeded({
      workspaceId: WORKSPACE_ID,
      datasetId: DATASET_ID,
      sourceType: "csv_file",
      onlineStorageAllowed: true,
    });

    expect(uploadOriginalFile).not.toHaveBeenCalled();
  });

  it("throws when the original is missing locally", async () => {
    // Silently skipping would leave a cloud-synced dataset with no original
    // and no indication anything went wrong, which defeats the retention
    // guarantee precisely when it matters.
    await putLocalRow(undefined);

    await expect(
      startOriginalFileUploadIfNeeded({
        workspaceId: WORKSPACE_ID,
        datasetId: DATASET_ID,
        sourceType: "pdf_file",
        onlineStorageAllowed: true,
      }),
    ).rejects.toThrow(/original file/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/startOriginalFileUploadIfNeeded.test.ts`
Expected: FAIL, cannot resolve `./startOriginalFileUploadIfNeeded`.

- [ ] **Step 3: Write the implementation**

Create `startOriginalFileUploadIfNeeded.ts`:

```ts
import { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/requiresOriginalFileRetention";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { DatasetOriginalFileStorageClient } from "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Uploads the retained original file when, and only when, both conditions
 * hold: the source type cannot be reconstructed from its parquet, and the
 * user has allowed cloud sync.
 *
 * An offline-only dataset keeps its original in IndexedDB and nowhere else.
 * That is not a limitation to work around; it is the guarantee the checkbox
 * makes, and it matters more for PDFs than for spreadsheets because a PDF is
 * far more likely to be a contract or a patient record.
 */
export async function startOriginalFileUploadIfNeeded(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  sourceType: DatasetSource.SourceType;
  onlineStorageAllowed: boolean;
}): Promise<void> {
  if (!requiresOriginalFileRetention(options.sourceType)) {
    return;
  }
  if (!options.onlineStorageAllowed) {
    return;
  }

  const localDataset = await AvaDexie.DB.LocalDataset.get(options.datasetId);
  const sourceBytes = localDataset?.sourceBytes;

  if (!sourceBytes) {
    throw new Error(
      `Cannot sync dataset ${options.datasetId} online: its original file is ` +
        "not available on this device. The dataset was saved, but the " +
        "original was not uploaded.",
    );
  }

  const fileName = localDataset?.sourceFileName ?? `${options.datasetId}.pdf`;
  const originalFile = new File([sourceBytes], fileName, {
    type: sourceBytes.type,
  });

  await DatasetOriginalFileStorageClient.uploadOriginalFile({
    workspaceId: options.workspaceId,
    datasetId: options.datasetId,
    file: originalFile,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/startOriginalFileUploadIfNeeded.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the save path**

In `useSaveDataset.ts`, replace `_startDatasetUploadIfAllowed` (lines 235-253)
with a version that also kicks off the original upload:

```ts
function _startDatasetUploadIfAllowed(
  options: Readonly<{
    params: SaveDatasetValues;
    savedDataset: Dataset.T;
    workspaceId: Dataset.T["workspaceId"];
  }>,
): void {
  if (
    options.params.sourceType === "google_sheets" ||
    !options.params.onlineStorageAllowed
  ) {
    return;
  }
  void DatasetParquetStorageClient.startDatasetUpload({
    workspaceId: options.workspaceId,
    datasetId: options.savedDataset.id,
    sourceType: options.params.sourceType,
  });
  // Retained originals upload independently of the parquet: the parquet
  // upload waits on the background transcode, while the original is already
  // on disk and has no such dependency.
  void startOriginalFileUploadIfNeeded({
    workspaceId: options.workspaceId,
    datasetId: options.savedDataset.id,
    sourceType: options.params.sourceType,
    onlineStorageAllowed: options.params.onlineStorageAllowed,
  }).catch((error: unknown) => {
    notifyError({
      title: t`Original file not synced`,
      message:
        error instanceof Error ? error.message : (
          "The dataset was saved, but its original file could not be uploaded."
        ),
    });
  });
}
```

Add the imports:

```ts
import { t } from "@lingui/core/macro";
import { startOriginalFileUploadIfNeeded } from "./startOriginalFileUploadIfNeeded";
```

- [ ] **Step 6: Run the save-path tests**

Run: `pnpm vitest run src/views/DataManagerApp/DataImportView/`
Expected: PASS. The CSV and XLSX save tests must be unaffected, since
`requiresOriginalFileRetention` short-circuits for them.

- [ ] **Step 7: Commit**

```bash
git add src/views/DataManagerApp/DataImportView/DatasetImportForm/useSaveDataset/
git commit -m "feat: upload retained original file on cloud-synced save"
```

---

## Task 11: Delete the original when the dataset is deleted

**Files:**
- Modify: `src/clients/datasets/DatasetClient/createDatasetMutations.ts` (the `_makeFullDelete` function)

Leaving orphaned originals in the bucket would mean a user who deletes a
sensitive document still has it stored, which is both a storage leak and a
privacy problem.

- [ ] **Step 1: Read the current delete path**

Run: `grep -n "_makeFullDelete" -A 40 src/clients/datasets/DatasetClient/createDatasetMutations.ts`

Identify where `DatasetParquetStorageClient.deleteDataset` is called.

- [ ] **Step 2: Add the original-file deletion**

Immediately after the existing parquet deletion call, add:

```ts
    // Retained originals live beside the parquet and are not covered by the
    // database cascade, so they have to be removed explicitly. A missing
    // object is not an error: most source types never retain one.
    if (requiresOriginalFileRetention(params.sourceType)) {
      await DatasetOriginalFileStorageClient.deleteOriginalFile({
        workspaceId: params.workspaceId,
        datasetId: params.datasetId,
        fileExtension: "pdf",
      }).catch(() => {
        // Deletion of the metadata row already succeeded; a failure to
        // remove the blob should not strand the user with an undeletable
        // dataset. Storage lifecycle cleanup will reap it.
      });
    }
```

with the imports:

```ts
import { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/requiresOriginalFileRetention";
import { DatasetOriginalFileStorageClient } from "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient";
```

If `_makeFullDelete`'s params do not already carry `sourceType` and
`workspaceId`, thread them through from the call site rather than re-querying;
the dataset row is already loaded there.

- [ ] **Step 3: Verify**

Run: `pnpm type-check && pnpm vitest run src/clients/datasets/`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/clients/datasets/DatasetClient/
git commit -m "feat: remove retained original file on dataset delete"
```

---

## Task 12: Full verification

- [ ] **Step 1: Run the full suite**

```bash
pnpm type-check
pnpm lint
pnpm test --quick
supabase test db
```

Expected: all pass. `--quick` skips e2e, which Phase A does not touch.

- [ ] **Step 2: Validate migrations**

Run: `pnpm db:validate-migrations`
Expected: pass.

- [ ] **Step 3: Regenerate the desktop SQLite mirror**

```bash
pnpm desktop:sqlite:gen-migrations
pnpm desktop:sqlite:check-migrations
```

Expected: new `.gen.sql` files for the three migrations, and the check passes.

- [ ] **Step 4: Commit any generated output**

```bash
git add apps/desktop/migrations/
git commit -m "chore: regenerate desktop sqlite migrations for pdf_file"
```

---

## Self-review notes

Checked against the spec's "Data model" and "Storage and retention" sections:

- Enum, table, geometry columns, fingerprint, RPC, model, client: Tasks 2, 4, 5.
- Type-level retention classification: Task 1.
- Local pinning against both destruction paths: Tasks 6 and 7.
- Cloud upload gated on the offline-only choice: Tasks 9 and 10.
- Storage RLS: Task 3, which turned out to be required rather than optional.
- Cascade delete: Task 11.

**Deliberately deferred to Phase B**, because nothing produces the values yet:
populating `regions`, `detection_mode`, `grid_x`/`grid_y`, `page_range`,
`header_rows`, `fill_merged_cells`, and `fingerprint` at import time, and
setting `isSourcePinned` when a PDF import starts. Phase B Task 1 sets the pin;
until then no code path creates a `pdf_file` dataset, so the columns are
exercised only by tests.

**Known open item from the spec:** whether retained originals count against
the workspace storage quota. Not resolved here; it is a product decision and
does not block any task above.
