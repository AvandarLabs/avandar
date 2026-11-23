# Configurable case statuses - design

**Status:** Draft, approved in brainstorming
**Date:** 2026-10-25
**Branch:** `feat/statuses`
**Roadmap:** P5b.1 (status sets) and P5c.4 (status workflow, without
history) and P5c.6 (list filtering by status) in
`docs/production-plan-world-humanitarian-day.md`
**Parents:** `docs/ontology-architecture.md` (sections 6, 13, 16),
`docs/permissions-architecture.md`, `docs/design/app-view-layout.md`

> Code blocks and payload shapes in this document are illustrative. The
> repository is the authority on every signature.

---

## 1. Problem

A record (an `individuals` row) has a `status text not null default
'active'` column that nothing in the app reads or writes. The status pill
that once sat on the record page offered a hard-coded Active and Inactive
pair and never saved anything. It has since been deleted.

Case types (concepts) need their own status sets. A cholera investigation
moves through Suspected, Confirmed, and Ruled out. A beneficiary registry
moves through Enrolled and Exited. Whoever designs a case type should
decide its statuses, which one a new record starts in, and what each one
means. The people working the records should see those meanings while
they change a record's status. Status should also be something a user
can query in the Data Explorer, ask about in chat, and filter the records
list by.

None of this can be scoped to the right people today. Concepts,
attributes, mappings, and records check workspace membership only, so any
member can change any case type. Neither the Case Manager nor the Records
pages are gated by an app role.

## 2. Decisions

Settled during brainstorming on 2026-10-25.

| Topic | Decision |
| --- | --- |
| Roles | Two new apps: `case_types` (Case Manager: case-type definitions, including statuses) and `case_records` (Records: individuals). |
| `case_types` levels | Viewer reads. Editor creates case types and edits them, including their statuses. Admin also deletes case types. |
| `case_records` levels | Viewer reads. Editor changes a record's status. Admin also deletes records. |
| Custom role groups | Mirror each group's `data_sources` role into both new apps. A group with no `data_sources` row gets no case-app rows. |
| Status fields | Name, description (tooltip text), color, position, and one default per case type. |
| Color | Picked from a fixed 8-color palette in the UI, stored as a precise `#rrggbb` string so custom colors can be added later without a schema change. |
| Removing a status in use | The editor picks a replacement. Records move to it and the status is deleted in one transaction. The default cannot be removed until another status is the default. |
| Storage | A `concept_statuses` table. `individuals.status_id` and `concepts.default_status_id` are composite foreign keys into it. |
| Writes | Case-type creation becomes one RPC. Saving a status set after creation is one RPC. |
| Layout | The records list moves to `AppListPane`. The case type page and the record page move to `AppView`. |
| In scope | `status` in chat SQL schema context, reordering statuses, chat proposing statuses for new case types. |
| Out of scope | Status change history, which belongs to a broader history feature (section 13). |

## 3. Scope

**In**

1. Two new app roles, `case_types` and `case_records`, with seeding,
   backfill, RLS enforcement, route guards, navigation gating, and a row
   each in the Settings role matrix.
2. Per-case-type statuses with name, description, color, order, and a
   default, stored in `concept_statuses`.
3. `individuals.status_id`, replacing the unused `individuals.status`
   text column, with a database-filled default for new records.
4. A status set editor used in three places: the create form, the chat
   draft card, and the case type page.
5. Changing a record's status from the record page, with each status's
   description shown on hover.
6. A status filter on the records list.
7. A built-in `status` column on every case type in the Data Explorer.
8. `status` and its allowed values in chat's SQL schema context, online
   and offline.
9. Chat proposing a status set when it drafts a case type.
10. Moving the case type page and the record page to `AppView`, and the
    records list to `AppListPane`.

**Out**

1. Status change history, audit log, and activity feed (section 13).
2. Allowed transitions between statuses (any status may follow any other).
3. Status categories such as open and closed.
4. Custom colors outside the palette. The column already holds any hex.
5. Coloring Data Explorer charts by status color.
6. Moving the create-case-type form to `AppView`.
7. Ordering and duplicate rows in `createSupabaseCrudClient.getPage`
   (`docs/ontology-architecture.md` section 16).
8. Editing a case type's name, description, or attributes after creation.
   Only its statuses become editable.

## 4. Permissions

### 4.1 App types

Add two values to `public.app_type`, at the end of the enum per its
docstring: `case_types` and `case_records`. As with `gis`, the enum values
ship in their own migration so later migrations can use them.

User-facing labels (`shared/copy/appLabel.ts`): **Case Types** and
**Case Records**. Per the copy rule in `CLAUDE.md`, these name what the
user is doing, not the `concepts` and `individuals` tables.

### 4.2 What each level may do

| Action | Requires |
| --- | --- |
| Open the Case Manager and a case type page | `case_types` viewer+ |
| Open the create-case-type form, create a case type (form or chat), save a case type's statuses | `case_types` editor+ |
| Delete a case type | `case_types` admin |
| Open a Records page and a record | `case_records` viewer+ |
| Change a record's status | `case_records` editor+ |
| Sync records (insert records, update their name and missing flag) | `case_types` editor+ **or** `case_records` editor+ |
| Delete a record (no UI today) | `case_records` admin |
| Read concepts, attributes, mappings, statuses, and records | Workspace membership (unchanged) |

Reads stay membership-based on purpose: the Data Explorer and chat query
case types, and a user who can query workspace data should not lose that
because they hold no case role. The route guards and navigation decide
who sees the case-management screens.

Workspace owners pass every check, through the existing shortcut in
`util__auth_user_meets_min_app_role`.

### 4.3 Seeding and backfill

- `util__seed_builtin_role_groups_for_workspace` adds both apps: Global
  Admin gets `admin`, Global Editor gets `editor`, Global Viewer gets
  `viewer`.
- A backfill migration re-runs the seeding helper for every workspace,
  then inserts a `case_types` row and a `case_records` row for each custom
  group, copying that group's `data_sources` role. This mirrors
  `20260814010032_backfill_gis_role_group_app_roles.sql`. Production has
  one custom group as of 2026-10-25.

### 4.4 RLS

Every write policy below uses `util__auth_user_meets_min_app_role` with
the row's `workspace_id`. Every `UPDATE` policy gets both `using` and
`with check`, which closes the "UPDATE policies without `using`" gap from
`docs/ontology-architecture.md` section 16 for the tables touched here.

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `concepts` | member | `case_types` editor | `case_types` editor | `case_types` admin |
| `concept_attributes` | member | `case_types` editor | `case_types` editor | `case_types` editor |
| `attribute_mappings__dataset_column`, `attribute_mappings__manual_entry` | member | `case_types` editor | `case_types` editor | `case_types` editor |
| `concept_statuses` | member | `case_types` editor | `case_types` editor | `case_types` editor |
| `individuals` | member | `case_types` editor or `case_records` editor | same as INSERT | `case_records` admin |

Deleting a case type still removes its attributes, mappings, statuses,
and records through `on delete cascade`, which RLS does not re-check.

### 4.5 Who may change a status

A sync writer (a `case_types` editor) must be able to insert and update
records, but must not be able to change a record's status unless they
also hold `case_records` editor. RLS cannot restrict one column per role,
so a trigger does it:

- `tr_individuals__check_status_change` runs `before insert or update of
  status_id` on `individuals`.
- On UPDATE, when `status_id` changes, it raises `insufficient_privilege`
  unless the caller meets `case_records` editor.
- On INSERT, an explicit `status_id` that is not the case type's default
  requires the same role. Sync never sends `status_id`, so sync inserts
  always pass.
- The check applies only when `current_user = 'authenticated'`, that is,
  a Data API request. `SECURITY DEFINER` RPCs run as their owner and do
  their own checks (section 6.2), and `service_role` is trusted.

### 4.6 Frontend

- `AppType` (`shared/models/Permissions/Permissions.types.ts`) gains both
  values. `UserAppRolesMatrix` docstrings and
  `RolesMatrixModule/preset-role-matrices.ts` gain both apps.
- `PermissionRegistry` keys:

| App | viewer | editor adds | admin adds |
| --- | --- | --- | --- |
| `case_types` | `case_types__can_view_case_type` | `case_types__can_create_case_type`, `case_types__can_edit_case_type`, `case_types__can_sync_records` | `case_types__can_delete_case_type` |
| `case_records` | `case_records__can_view_record` | `case_records__can_edit_record`, `case_records__can_sync_records` | `case_records__can_delete_record` |

- Route guards with `RouteMiddleware.BeforeLoad.checkUserPermissions`:
  `ontology-designer` requires `case_types__can_view_case_type`, its
  create route requires `case_types__can_create_case_type`, and
  `individual-manager` requires `case_records__can_view_record`.
- `makeMainNavbarLinksFromPermissions` and the Spotlight actions show the
  Case Manager link only with `case_types` access, and the per-case-type
  Records links only with `case_records` access. The
  `DisableProfileManager` flag still applies on top.
- Controls a user cannot use are hidden, not disabled: Create case type,
  Edit statuses, Delete case type, and the status select. Refresh
  records shows with either sync key.
- The Settings role matrix shows both apps through the existing
  `appLabel` and `AppType` plumbing.

## 5. Data model

### 5.1 `concept_statuses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` pk | Client-generated on create, like attribute ids today. |
| `workspace_id` | `uuid` not null | FK to `workspaces`, cascade. |
| `concept_id` | `uuid` not null | FK to `concepts`, cascade. |
| `name` | `text` not null | Trimmed, non-empty. |
| `description` | `text` | Nullable. The tooltip text. |
| `color` | `text` not null | `check (color ~ '^#[0-9a-f]{6}$')`, lowercase. |
| `position` | `integer` not null | Display order, ascending. Not unique, so a reorder never trips a constraint mid-statement. Ties sort by name. |
| `created_at`, `updated_at` | `timestamptz` | `util__set_updated_at` trigger. |

Constraints and indexes:

- `unique (id, concept_id)`, the target of both composite FKs below.
- A unique index on `(concept_id, lower(name))`. Names must be unique per
  case type, case-insensitively, because Data Explorer filters and chat
  match on the name.
- An index on `(concept_id, position)`.

### 5.2 `individuals.status_id`

- Add `status_id uuid not null`, with `foreign key (status_id, concept_id)
  references concept_statuses (id, concept_id)` and the default `on delete
  no action`. A record can only hold a status of its own case type, and a
  status that records use cannot be deleted without moving them first.
- Not `restrict`: deleting a case type cascades to both its statuses and
  its records in one statement. `restrict` is checked immediately and
  would fail whenever the cascade reached the statuses first. `no action`
  is checked at the end of the statement, when the records are gone too.
- A `before insert` trigger, `tr_individuals__set_default_status`, fills
  `status_id` from `concepts.default_status_id` when it is null. Sync
  keeps omitting status, as `generateIndividuals.test.ts` and
  `individuals__sync_upsert_contract.test.sql` lock in today.
- An index on `(concept_id, status_id)` serves the records filter.
- Drop `individuals.status`.

### 5.3 `concepts.default_status_id`

- Add `default_status_id uuid not null`, with `foreign key
  (default_status_id, id) references concept_statuses (id, concept_id)
  deferrable initially deferred`.
- The default must belong to the same case type, every case type has
  exactly one default, and the default status cannot be deleted. All
  three are structural.
- Deferral lets the creation RPC insert the concept and its statuses in
  one transaction.
- Deleting a case type deletes its row, so nothing references its
  statuses by the time the cascade reaches them.

### 5.4 Reserved attribute name

The Data Explorer view gains a `status` column (section 9). DuckDB
identifiers are case-insensitive, so `concept_attributes` gets `check
(lower(btrim(name)) <> 'status')`, and the create form and chat parser
reject the name before it reaches the database. Production has no such
attribute as of 2026-10-25. The migration renames any it finds on other
databases to `status (attribute)` before adding the check.

### 5.5 Palette

`ConceptStatusModule.PALETTE`, built from tokens already in the codebase.
DESIGN.md bans stock Mantine `gray`, so the neutral entry comes from the
`neutral` ramp. The other seven are the categorical swatches charts
already use (`CHART_COLOR_SWATCHES`).

| Swatch | Hex | Default use |
| --- | --- | --- |
| neutral.5 | `#637c95` | Inactive |
| green.6 | `#40c057` | Active |
| blue.6 | `#228be6` | |
| teal.6 | `#12b886` | |
| yellow.6 | `#fab005` | |
| orange.6 | `#fd7e14` | |
| red.6 | `#fa5252` | |
| grape.6 | `#be4bdb` | |

New statuses get the first palette color not already used in the set,
wrapping around when all are taken.

### 5.6 Default status set

Every new case type starts with:

1. **Active**: green, the default, "Open and being worked on."
2. **Inactive**: neutral, "No longer being worked on."

The names and descriptions are translated where the form builds them
(`useLingui().t`), then stored as data in the creator's language. The
migration uses the English strings.

### 5.7 Data migration

For every existing concept, inside the schema migration:

1. Insert Active (position 0, default) and Inactive (position 1).
2. Insert one more status, at the next position with a neutral color,
   for each other distinct `individuals.status` value in that concept.
   The name is the value with its first letter capitalized.
3. Set `concepts.default_status_id` to Active.
4. Set every record's `status_id` by case-insensitive name match.
5. Apply the `not null` constraints, then drop `individuals.status`.

Production has 4 concepts and 16 records, all `active`, as of 2026-10-25.

### 5.8 Desktop

Add `concept_statuses` to `ACTIVE_TABLES` in
`apps/desktop/sync/syncable-tables.ts`, next to `concepts`, and
regenerate the desktop SQLite migrations. The SQLite migration generator
fails on unlisted tables. The desktop app is pre-release, so the
destructive column drop is acceptable there.

## 6. RPCs

### 6.1 `rpc_concepts__create`

Creates a case type in one transaction. It replaces the client-side chain
in `insertConceptFromFormValues.ts` and deletes
`rollbackConceptFormInsert`, which an editor could no longer run because
deleting a concept requires admin. It also removes the partial-write
window the chain had.

```sql
rpc_concepts__create(
  p_concept jsonb,            -- concepts insert row, including id and default_status_id
  p_attributes jsonb,         -- concept_attributes insert rows
  p_dataset_column_mappings jsonb,
  p_manual_entry_mappings jsonb,
  p_statuses jsonb            -- concept_statuses insert rows
) returns uuid                -- the concept id
```

- `SECURITY INVOKER`, so the RLS in section 4.4 applies to every insert.
  A caller without `case_types` editor fails on the first insert, and
  nothing is written.
- The client builds each payload with the existing model parsers
  (`fromModelInsertToDBInsert`), so the RPC takes database row shapes and
  needs no field mapping of its own.
- Inserts in this order: concept, statuses, attributes, then mappings. The
  deferred FK on `default_status_id` is checked at commit. The existing
  label and identifier trigger still runs at statement end on
  `concept_attributes`.
- The background first sync (`_syncNewConceptInBackground`) runs after
  the RPC resolves, as it does today.
- Callers: `useSubmitConceptCreatorForm` and `applyCreatedCaseTypes` (the
  chat path), both through `insertConceptFromFormValues`.

### 6.2 `rpc_concept_statuses__save`

Replaces a case type's status set in one transaction.

```sql
rpc_concept_statuses__save(
  p_concept_id uuid,
  p_statuses jsonb,           -- the full desired set: [{ id, name, description, color, position }]
  p_default_status_id uuid,
  p_replacements jsonb        -- { "<removed status id>": "<replacement status id>" }
) returns void
```

- `SECURITY DEFINER` with `search_path = ''`. It has to move records
  between statuses for a `case_types` editor who may not hold
  `case_records` editor (section 4.5), so it checks `case_types` editor
  itself, against the concept's workspace, before doing anything.
- Locks the concept row `for update`, so two saves of the same set
  serialize.
- Validates before writing:
  - at least one status
  - names are non-empty and unique case-insensitively
  - colors match the hex check
  - the default is in the set
  - every removed status that records use has a replacement, and the
    replacement is in the set
- Then:
  1. Upserts the set. Renames that swap two names are staged through
     temporary names, so the unique name index never sees a transient
     duplicate.
  2. Sets `concepts.default_status_id`.
  3. Moves records from each removed status to its replacement.
  4. Deletes the removed statuses.
- Errors raise with a stable `hint` per failure (for example
  `status_names_not_unique`, `replacement_required`). The client maps the
  hint to translated copy. It never shows the raw message.
- `revoke execute ... from public, anon` and `grant execute ... to
  authenticated`, following `supabase-privileges-are-grant-only-except-functions`.

A record's own status change does not need an RPC. It is a plain
`IndividualClient.update({ statusId })`, checked by RLS and the trigger
in section 4.5.

## 7. Models and clients

- **New model** `shared/models/ontology/ConceptStatus/` with
  `ConceptStatus.ts`, `ConceptStatus.types.ts`, and
  `ConceptStatusParsers.ts`, scaffolded with `ava new model` (see the
  `ava-model-creation` skill) and modeled on
  `shared/models/ontology/Individual/`. `ConceptStatusModule` holds
  `PALETTE` and the pure helpers: next free color, validating a set, and
  diffing an edited set against the saved one into the save RPC's
  payload.
- **`Individual`**: `status: string` becomes `statusId: ConceptStatus.Id`.
- **`Concept`**: gains `defaultStatusId: ConceptStatus.Id`.
- **`ConceptStatusClient`**: `createRdbCrudClient` for `concept_statuses`,
  plus `saveStatusSet`, which calls `rpc_concept_statuses__save`.
- **`ConceptClient`**: gains `create`, which calls `rpc_concepts__create`.
- **Form types**: `ConceptFormValues` gains `statuses:
  StatusFormValues[]` and `defaultStatusId`.

## 8. Screens

All copy goes through Lingui. All layout follows
`docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md`.
These views replace existing surfaces, so implementation loads the
`impeccable` skill and runs its detector on every touched view.

### 8.1 `StatusSetEditor`

One controlled component, used by the create form, the chat draft card,
and the Edit statuses modal.

- One row per status, in order: a drag handle (`@dnd-kit`, already used
  by the GIS layer list) with keyboard reordering, a color swatch button
  that opens the palette, a name input, a description input, a "Default"
  radio, and a remove button.
- Add status appends a row with the next free color.
- Inline validation: names required and unique case-insensitively,
  exactly one default, at least one status. A status may be named
  anything, including "Status". The reserved name in section 5.4 applies to
  attributes. Removing the default row moves the
  default to the first remaining row.
- In edit mode, the editor receives each saved status's record count.
  Removing a status with records turns its row into a "Move N records to"
  select over the remaining statuses, required before Save.
- Accessible names on every control: the swatch button announces its
  color name, the drag handle announces "Reorder <name>", and the radio
  group is labeled "Default status".

### 8.2 Create case type form

A "Statuses" section, prefilled with the default set (section 5.6). No
record counts or replacements apply, because there are no records yet.
Submission goes through `rpc_concepts__create`. The form keeps its
current layout (section 3, Out 6).

### 8.3 Chat draft card

`CaseTypeDraftBlock` shows the proposed statuses in a read-only list
while the card is a draft, and in the editor while it is editable, the
same way it treats attributes. A proposal without statuses gets the
default set. `createdCaseTypeToFormValues` carries them into the form
values. The legacy `createCaseTypes` tool path also gets the default set.

### 8.4 Case type page (Case Manager)

Moves from `Container` and `Paper` to `AppView`:

- **Header band**: the case type name. Facts: records count, attributes
  count, and creation date. Actions: View records (primary), Refresh
  records (shown with either sync key), and an overflow menu with Delete
  case type (`case_types` admin only, `danger`, behind a confirm).
- **Body sections**: Description (only when set), Attributes (the
  existing `CaseTypeAttributesList`), and Statuses. Each status row shows
  its badge, its description, its record count as `meta`, and a "Default"
  marker on the default. The Statuses section action is **Edit
  statuses** (`case_types` editor+), which opens the editor in a modal.
  Save calls `ConceptStatusClient.saveStatusSet`, then invalidates the
  queries in section 11.
- **Rail**: source datasets, manual creation allowed, owner, created at.

### 8.5 Record page

Moves from `Container` and `Paper` to `AppView`:

- **Header band**: the record name, and beside it the status control.
  - `case_records` editor+: a select whose options are colored badges.
    Hovering or focusing an option shows that status's description in a
    tooltip, and so does the current value.
  - Everyone else: the badge, with the same tooltip.
  - A change saves immediately, with an optimistic update, a rollback on
    failure, and an error toast.
- **Body sections**: Details (the existing `RecordAttributesList`) and
  Activity (the existing `ActivityBlock`, still unwired).
- **Rail**: case type, external ID, created at, updated at, missing from
  source since (only when set, per "a fact with no value is omitted").
- The route loader keeps fetching the record. After a status change,
  `router.invalidate()` refreshes it.

### 8.6 Records list

`IndividualNavbar` moves into `AppListPane`:

- **Header**: the case type name, plus a count of records matching the
  filter (`getCount` with the same `where`).
- **Filter slot**: a status multi-select. Each option shows its color dot
  and name, and its description in a tooltip. Selected statuses become
  `where("status_id", "in", ids)` on both the page query and the count.
  The filter always shows: unlike the eight-row threshold in Data
  Sources, filtering by status is the purpose of this list. Filter state
  lives in the list pane, which stays mounted while the user clicks
  between records.
- **Rows**: the record name, with a status color dot. The status name is
  the dot's accessible label.
- The list's query key includes the selected status ids.

## 9. Data Explorer

### 9.1 A built-in `status` column

`useQueryColumnsForDataSource` appends one column per case type after its
attributes. That column is a new `baseColumn` variant, so no fake
`ConceptAttribute` gets persisted into saved queries or reaches the
legacy `_runConceptQuery` path:

```ts
type ConceptStatusColumn = Model.Base<
  "ConceptStatusColumn",
  {
    id: ConceptStatusColumn.Id; // deterministic: derived from conceptId
    conceptId: Concept.Id;
    name: "status";
    dataType: "varchar";
  }
>;
```

- `QueryColumn.baseColumn` widens to include it, and `QueryColumnModule`
  gains `makeFromConceptStatusColumn`. Identity across reloads uses
  `Model.getTypedId`, as the query-column-id refactor set up, so the
  deterministic id keeps a saved query's status column stable.
- Filters, grouping, and aggregation read only `name` and `dataType`, so
  they work unchanged. Every exhaustive match over `baseColumn.__type`
  gains the new arm. The TypeScript compiler finds them.
- The legacy `_runConceptQuery` fallback, which runs only when no SQL is
  produced, skips the status column rather than passing it to
  `getConceptExtension` as if it were an attribute.

### 9.2 QETL

| File | Change |
| --- | --- |
| `conceptRelation.types.ts` | `externalIds: string[]` becomes `spineRows: Array<{ externalId: string; statusName: string }>`. |
| `getConceptRelationPlansFromSql.ts` | Reads the case type's statuses once with `ConceptStatusClient.getAll`, then maps each record's `statusId` to its name. |
| `loadConceptSpine.ts` | Loads two `VARCHAR` columns, `external_id` and `status`, including in the empty-spine `CREATE TABLE`. `_assertExternalIdsLoadable` adapts to rows. |
| `toCsvColumn.ts` | Gains a multi-column sibling, `toCsvRows`, with the same quoting rules. |
| `buildConceptViewSql.ts` | Selects `individuals."status" AS "status"` after `external_id`. |
| `makeConceptAttributeColumnsFromMetadata.ts` | Seeds `takenNames` with `status`, as a guard behind the check in section 5.4. |

The spine and view are rebuilt on every query and are not in the relation
cache, so they need no invalidation. React Query results do (section 11).

### 9.3 Known limitation

Filters match the status name. Renaming a status changes the value a
saved filter or dashboard matches on, so a saved `status = 'Active'`
filter returns nothing after Active is renamed. The Edit statuses modal
warns about this when a name changes.

## 10. Chat

### 10.1 Schema context

Each case type's line gains `status` with its allowed values, in position
order:

```text
- c0: Cholera case (age, district, status: Suspected | Confirmed | Ruled out)
```

- Online: `fetchWorkspaceSchema.ts` also selects `concept_statuses (name,
  position)`. `SqlTableAliasModule` prints the extra field.
  `buildSqlSystemPrompt` is otherwise unchanged.
- Offline: `fetchOfflineChatSchema._mapConcepts` and `OfflineChatSchema`
  (`shared/types/offlineChat.types.ts`) carry the status names.
  `truncateSchemaForOffline` keeps the status field when it trims
  attributes.

### 10.2 Proposing statuses

- `proposeCaseType` (`makeChatToolConfigFromOptions.ts`) gains optional
  `statuses: Array<{ name; description; color? }>` and
  `defaultStatusName`. `color` is constrained to the palette hexes.
- `parseProposeCaseType` validates status names (non-empty, unique), at
  most 12 statuses, and that the default is in the list. It also rejects a
  proposed attribute named "status" (section 5.4). It
  fills missing colors from the palette, and falls back to the default
  set when `statuses` is absent or invalid.
- `ChatProposedCaseType` and `ChatCreatedCaseType` gain `statuses` and
  `defaultStatusName`.
- `buildCaseManagerSystemPrompt` asks for a status set when the domain
  implies a workflow, with one-sentence descriptions written for the
  people working the records. It stops suggesting a manual-entry "triage
  status" attribute.

## 11. Cache invalidation

| After | Invalidate |
| --- | --- |
| A record's status change | The record's route loader (`router.invalidate()`), the records list and count queries for that case type, and every Data Explorer query (`isDataQueryKey`, following `invalidateDatasetRowQueries.ts`). |
| A status set save | `ConceptStatusClient` queries for the case type, the case type, the records list and count, the router (an open record's badge), and every Data Explorer query. |
| Creating a case type | Unchanged: `ConceptClient` lists, plus the new case type's status queries. |

## 12. Testing

Red/green TDD per `docs/rules/testing.md`. Every database command runs on
this branch's switched Supabase project, after `ava supabase status`
reads green.

**pgTAP** (`supabase/tests/database/`)

- `permissions/rls_concept_statuses.test.sql`: viewer, editor, admin,
  and non-member against every policy in section 4.4.
- Update `rls_concepts`, `rls_concept_attributes`, the two mapping RLS
  tests, and `rls_individuals` to the new policies. Each gets an UPDATE
  case for a permitted role (section 16 notes none exists today).
- The status-change trigger: a `case_types`-only editor can sync-insert
  and update a name but cannot change a status. A `case_records` editor
  can change a status. `service_role` and definer RPCs are exempt.
- The default-status insert trigger, and the composite FK rejecting
  another case type's status.
- `rpc_concepts__create`: success, all-or-nothing on a failing mapping or
  attribute, and refusal for a viewer.
- `rpc_concept_statuses__save`: reorder, rename swap, default change,
  removal with replacement, refusal without a replacement, refusal to
  remove the default without a new one, and refusal for a viewer.
- Role seeding and backfill, including a custom group with and without a
  `data_sources` row.
- Update `exact_data_api_grants.test.sql` and
  `individuals__sync_upsert_contract.test.sql` (its seeded `'confirmed'`
  status becomes a `status_id`).

**Unit** (vitest)

- `ConceptStatusModule`: palette next color, set validation, and diffing
  an edited set into the save payload.
- `ConceptStatusParsers`, plus the `Individual` and `Concept` parser
  changes.
- `PermissionRegistry` and preset matrices for both apps.
- `StatusSetEditor`: validation messages, default handling, the
  replacement select, and keyboard reordering.
- Route guard and navbar gating per role.
- QETL: `getConceptRelationPlansFromSql`, `loadConceptSpine` (two
  columns, empty spine), `toCsvRows`.
- Chat: `SqlTableAlias` schema lines, `parseProposeCaseType` with and
  without statuses, `buildCaseManagerSystemPrompt`.

**Executed DuckDB** (`pnpm test:executed`)

- `buildConceptViewSql.executed.test.ts`: the view exposes `status`.
- `tests/integration/queries/structuredQueryConcepts.executed.test.ts`:
  filter by and group by `status`.

**E2E** (Playwright, one spec at a time, through the UI only, with
cleanup in `finally`)

1. `case-statuses-record.spec.ts`: a `case_records` editor changes a
   record's status and sees the description tooltip. A viewer sees the
   badge and no select.
2. `case-statuses-edit.spec.ts`: a `case_types` editor adds, reorders,
   and renames statuses, changes the default, and removes a status in use
   by choosing a replacement.
3. `case-statuses-list-filter.spec.ts`: the records list filter narrows
   the list and its count.
4. `case-statuses-data-explorer.spec.ts`: grouping a case type by
   `status` in the Data Explorer, before and after a status change.

Role assignment and the initial case type count as pre-test setup and may
be seeded directly.

## 13. Follow-ups

1. **Status change history.** Belongs in a broader history feature that
   records who changed what and when, across status, assignment, and edits
   (roadmap P5c.4's history half and P5c.5). Add it to
   `docs/production-plan-world-humanitarian-day.md` and to Linear.
2. Move the create-case-type form to `AppView`.
3. Give `getPage` a stable order, so a filtered, paged records list
   cannot repeat or skip rows.
4. Custom status colors outside the palette.
5. Color Data Explorer charts by status color when grouping by `status`.
6. Allowed transitions and open or closed status categories.

## 14. Documentation to update in the implementation

- `docs/ontology-architecture.md`: the `individuals` row in the table
  list, section 13's "status today" placement, section 16's "Not built:
  status sets", and the new reserved attribute name.
- `docs/permissions-architecture.md`: the app list in Vocabulary, and the
  case-type and record rules in Common scenarios.
- `docs/production-plan-world-humanitarian-day.md`: mark P5b.1 and P5c.6
  done, P5c.4 done except history, and add the history follow-up.
