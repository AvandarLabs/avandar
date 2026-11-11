# Plugins Slice 1d: Data Slots, Content, and a Minimal Install Wizard

**Author:** Juan Pablo Sarmiento (pablo@avandarlabs.com)
**Date:** 2026-11-11
**Status:** Design approved
**Parent:** `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`
(Milestone 1, slice 1d)
**Builds on:** `docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`,
`docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`,
`docs/superpowers/specs/2026-11-09-plugins-1c-ai-tools-design.md`

## Context

Slices 1a to 1c let a plugin act on the result already on screen: toolbar
commands, chart types, derived columns, and a data-agent tool. A plugin cannot
yet read data the user did not open, and it cannot bring data of its own.

The parent design solves the first with typed **data slots**: a plugin
declares the shape of the data it needs, such as
`Case { onsetDate: date, district: geo.admin2 }`, and an admin binds that slot
to the workspace's data at install time. Binding the slot is the permission
grant. It solves the second with **content**: datasets a plugin bundles and
imports into the workspace.

Both need an install flow with more than one step, so this slice also replaces
today's one-click confirm modal with a minimal **install wizard**.

What the codebase offers today:

- No semantic types. Attribute and column types are the seven `AvaDataType`
  values (`boolean`, `bigint`, `double`, `time`, `date`, `timestamp`,
  `varchar`).
- Case types are `concepts` with `concept_attributes`. The Data Explorer reads
  a case type through the DuckDB view `concept_<id>`
  (`buildConceptViewSql`), with one column per attribute.
- Map boundaries are ordinary datasets with a WKT, WKB, or GeoJSON text
  column. GIS detects the geometry column on the client.
- A file becomes a dataset through the CSV upload path: `startCsvImport`,
  `rpc_datasets__add_csv_file_dataset`, then a Parquet upload to Storage. There
  is no Parquet source type.
- Install is one button and a confirm modal that inserts a
  `plugin_installations` row. Every manifest needs an `entry`.
- Query handles (`QueryHandleRegistry`) map an opaque id to rows already in
  memory. `fetchRows` accepts only the current invocation's handle.

## Goals

- A plugin declares `dataSlots` in `ava.yaml`. An admin binds each slot to a
  case type or a dataset, attribute by attribute.
- A command reads a bound slot with `avandar.data.querySlot`, through a query
  handle, with the current user's own data access.
- A plugin with no code declares `content`. Installing it imports each chosen
  item as an ordinary workspace dataset.
- The install wizard shows only the steps a manifest needs: Review, Data slots,
  Content, Confirm.
- The epidemiology plugin's `cases` slot drives a new Case epicurve command.
- The Mozambique pack imports province and district boundaries.
- Hardening items from earlier slices: plugin AI tool names that collide with
  built-in tool names are rejected, a corrupted plugin chart config no longer
  crashes the dashboard editor's settings form, and `pnpm check:plugin-bundle`
  passes again.

## Non-goals

- AI slot prefill, ranking candidates by a data profile, and binding to
  another plugin's content.
- Checking `geo.admin1` and `geo.admin2` values against known boundaries.
- `querySlot` for AI tool handlers. A tool that aggregates every bound record
  without anyone looking at it needs its own privacy review.
- The wizard's Dependencies, Settings and services, and Access steps.
- A keep-or-delete choice per content item at uninstall. Imported datasets are
  always kept.
- Registry-hosted content, `.ava` files, and permission enforcement
  (Milestones 2 and 4).
- Content kinds other than `dataset`, and content formats other than CSV.

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | What binding proves | The binding is stored, and a plugin reads it through `avandar.data.querySlot`. One epidemiology command uses it |
| 2 | Bind target | A case type or a dataset. Each slot attribute maps to one case type attribute or one dataset column |
| 3 | Attribute types | `number`, `date`, `text`, `boolean`, `geo.admin1`, `geo.admin2`. Geo types bind to text only. In this slice they change the wizard's labels, not the checks |
| 4 | Pack content | Province (admin1) and district (admin2) boundaries for Mozambique |
| 5 | Data source | geoBoundaries gbHumanitarian MOZ ADM1 and ADM2 (INE and OCHA via HDX, CC BY 3.0 IGO), simplified, bundled as CSV with WKT geometry under `plugins/mozambique/content/`. gbOpen was rejected: its province layer is OpenStreetMap under ODbL (share-alike), it has 10 provinces with no Maputo City, and it leaves Ibo district in no province |
| 6 | Wizard UI | A Mantine `Stepper` in a large modal, replacing the confirm modal. No new route |
| 7 | Slot consumer | A "Case epicurve" command that opens a modal with an epicurve of every bound case |
| 8 | Storage | Two tables, `plugin_data_slot_bindings` and `plugin_content_imports`, plus an install RPC that writes the install and its bindings atomically |
| 9 | Naming | Code always says "data slot" (`DataSlot`, `dataSlots`). "Slot" alone already means a UI menu slot (`SlotFactRegistry`, `dataExplorer.toolbar`) |

## Manifest

### `dataSlots`

A top-level key, keyed by slot id:

```yaml
permissions:
  - data:context
  - query:addColumns
  - data:slots
dataSlots:
  cases:
    title: "%slot.cases.title%"
    description: "%slot.cases.description%"
    concept: Case
    required: false
    attributes:
      onsetDate:
        type: date
        title: "%slot.cases.onsetDate%"
      district:
        type: geo.admin2
        title: "%slot.cases.district%"
        required: false
```

| Key | Rule |
| --- | --- |
| Slot id | A letter, then letters and digits, like a viz setting key. Unique within the plugin |
| `title` | A `%key%` reference |
| `description` | Optional `%key%` reference |
| `concept` | Optional. A case type name the wizard lists first, compared without case. A hint, not a requirement |
| `required` | Optional, `false` by default. A required slot must be bound before Install. An optional slot may be skipped |
| `attributes` | At least one, keyed by attribute key (a letter, then letters and digits) |
| `attributes.<key>.type` | One of the types below |
| `attributes.<key>.title` | A `%key%` reference |
| `attributes.<key>.required` | Optional, `true` by default. A binding must map every required attribute |

| Type | Binds to `AvaDataType` | Wizard label |
| --- | --- | --- |
| `number` | `bigint`, `double` | Number |
| `date` | `date`, `timestamp` | Date |
| `text` | `varchar` | Text |
| `boolean` | `boolean` | Yes / no |
| `geo.admin1` | `varchar` | Province or region, name or code |
| `geo.admin2` | `varchar` | District, name or code |

A manifest that declares `dataSlots` must list `data:slots` in `permissions`,
and one that lists `data:slots` must declare at least one slot.

### `contributes.content`

```yaml
contributes:
  content:
    - id: provinces
      kind: dataset
      title: "%content.provinces.title%"
      description: "%content.provinces.description%"
      file: content/mz-adm1.csv
    - id: districts
      kind: dataset
      title: "%content.districts.title%"
      description: "%content.districts.description%"
      file: content/mz-adm2.csv
```

| Key | Rule |
| --- | --- |
| `id` | Lowercase letters, digits, and hyphens in dot-separated words, like a command id. Unique within the plugin. Stable: it is how a workspace remembers what it imported |
| `kind` | `dataset`, the only kind in this slice |
| `title`, `description` | `%key%` references. They become the dataset's name and description. The description carries the data's license credit |
| `file` | A relative `.csv` path inside the plugin folder. The file must exist and be at most 1 MB |

### Other manifest changes

- `PLUGIN_PERMISSIONS` gains `data:slots`. Settings → Plugins shows it as
  "Read the records you choose for it" in the data access section.
- `entry` becomes optional, but only for a manifest with no `commands`,
  `vizTypes`, or `aiTools`. A manifest with any of those and no `entry` fails.
- `RESERVED_AI_TOOL_NAMES` is exported from `@avandar/plugin-manifest`, listing
  `run_query`, `lookup_values`, and `ask_user`. A tool name fails validation
  when, lowercased with underscores removed, it equals a reserved name
  lowercased with underscores removed. So `runQuery` and `askUser` fail. A test
  in `shared/agent/dataAgent/` fails when a `DATA_AGENT_TOOLS` name is missing
  from the list.

## Storage

All new database objects are in a new migration. The branch runs
`ava supabase switch` before touching `supabase/schemas/` or migrations.

### `plugin_data_slot_bindings`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `workspace_id` | `uuid` | FK to `workspaces`, on delete cascade. Must match the install's workspace (trigger) |
| `installation_id` | `uuid` | FK to `plugin_installations`, on delete cascade |
| `slot_id` | `text` | The manifest slot id |
| `source_type` | enum `plugin_data_slot_bindings__source_type` (`concept`, `dataset`) | |
| `concept_id` | `uuid` | FK to `concepts`, on delete set null. Null unless `source_type` is `concept` |
| `dataset_id` | `uuid` | FK to `datasets`, on delete set null. Null unless `source_type` is `dataset` |
| `attribute_map` | `jsonb` | Slot attribute key to a concept attribute id or a dataset column id |
| `bound_by` | `uuid` | Defaults to `auth.uid()` |
| `created_at`, `updated_at` | `timestamptz` | |

- Unique `(installation_id, slot_id)`.
- A check allows at most one of `concept_id` and `dataset_id`, and only the one
  that matches `source_type`. Both null means the source was deleted, which
  reads as broken.
- RLS: workspace members can select. Settings admins
  (`util__can_manage_workspace_settings`) can insert, update, and delete.
- Uninstalling deletes the install row, which deletes its bindings.

### `plugin_content_imports`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `workspace_id` | `uuid` | FK to `workspaces`, on delete cascade |
| `plugin_id` | `text` | Same format check as `plugin_installations.plugin_id` |
| `content_id` | `text` | The manifest content id |
| `dataset_id` | `uuid` | FK to `datasets`, on delete cascade |
| `imported_by` | `uuid` | Defaults to `auth.uid()` |
| `created_at` | `timestamptz` | |

- Unique `(workspace_id, plugin_id, content_id)`.
- Not tied to an install row, so it survives uninstall. A reinstall sees what
  the workspace already has and does not import it twice.
- Deleting the dataset deletes the row, so the item can be imported again.
- RLS: members can select. Settings admins can insert and delete.

### RPCs

- `rpc_plugin_installations__install(p_workspace_id, p_plugin_id, p_installed_version, p_granted_permissions, p_bindings jsonb)`
  inserts the install row and one binding per element of `p_bindings` in one
  transaction, and returns the install row. Security invoker, so the existing
  RLS decides who may call it. A failing binding rolls back the install.
- `rpc_plugin_data_slot_bindings__save(p_installation_id, p_slot_id, p_source_type, p_concept_id, p_dataset_id, p_attribute_map)`
  inserts or replaces one slot's binding. Security invoker.
- Unbinding a slot is a delete on `plugin_data_slot_bindings`.

Both RPCs are granted to `authenticated` only, with the usual `revoke` from
`public`, `anon`, and `service_role`.

### Binding status

A binding's status is computed on the client when it is read, by one pure
function, `getDataSlotBindingStatus`:

| Status | When |
| --- | --- |
| `unbound` | No binding row |
| `broken` | The source id is null (the case type or dataset was deleted), a mapped attribute or column no longer exists, a mapped field's type no longer fits the slot attribute's type, or a required attribute is unmapped. The status carries the attribute key and the reason |
| `bound` | Otherwise |

Settings → Plugins and `querySlot` both use it. There is no background check.

## Runtime

### `avandar.data.querySlot(slotId)`

```ts
querySlot(slotId: string): Promise<{
  queryHandle: QueryHandle;
  columns: ReadonlyArray<{ name: string; dataType: AvaDataType }>;
  rowCount: number;
  isTruncated: boolean;
}>;
```

1. The host reads the plugin's binding for `slotId` and its status.
2. It builds
   `SELECT <field> AS "<attribute key>", ... FROM <relation> LIMIT 200001`.
   The relation is the case type's `concept_<id>` view or the dataset's
   relation, loaded the way the Data Explorer loads them. Unmapped optional
   attributes are selected as typed `NULL`s, so the column list is the same
   for every binding.
3. It runs the SQL in the browser's DuckDB, with the current user's access.
   No row leaves the device.
4. It registers the rows (at most 200,000) in `QueryHandleRegistry` and
   returns the handle. `isTruncated` is true when the query returned the
   200,001st row.

The plugin sees only its own attribute keys, never the workspace's field
names. `columns[].dataType` is the bound field's type.

`fetchRows` accepts the invocation's handle or any handle `querySlot` issued
during the same invocation. Every other handle rejects with
`PermissionDenied`, as today.

New `PluginError` codes:

| Code | When |
| --- | --- |
| `SlotNotBound` | The slot is declared and has no binding |
| `SlotBroken` | The binding's status is `broken`. The message names the attribute and the reason, never a value |
| `InvalidSlot` | The manifest declares no data slot with that id |

A dataset the user cannot read rejects with `PermissionDenied`.

`querySlot` is on the `avandar` object a **command** receives. An AI tool
handler's `avandar.data` has no `querySlot` in this slice.

### `avandar.ui.openDataSlotBinding(slotId)`

For a settings admin, opens the Data slots step for that slot on its own
(see "After install"). For anyone else, shows a notification: "Ask a
workspace admin to choose which records this plugin reads." Resolves once
the modal closes or the notification shows. An unknown slot id rejects with
`InvalidSlot`.

### Case epicurve

A new epidemiology command, `cases.epicurve`, in `dataExplorer.toolbar` with
no `when`.

- It opens a modal with an interval control (day, epi week, month; epi week by
  default), a "Stack by district" switch, and the chart.
- It calls `querySlot("cases")`, then `fetchRows` for `onsetDate` and
  `district`, and buckets the rows with the existing `makeEpicurveFromRows`.
- It draws with `ComposedChart` and a new `Bar` export from
  `@avandar/plugin-ui/charts`. Recharts already ships in the app, so the
  export adds no app bytes.
- "Stack by district" is disabled, with a hint, while `district` is unmapped.
- A truncated result shows the existing truncation note.
- `SlotNotBound` and `SlotBroken` show an Alert that says why, with a
  "Choose records" button that calls `openDataSlotBinding("cases")`. When the
  modal closes after a binding, the command can be run again.

Epidemiology then has four commands, and this one always shows. With more than
two matching commands, the toolbar collapses a plugin's commands into one
"Plugins" menu, so the existing epidemiology E2Es must open that menu.

## Content import

Content import runs in the browser after the install RPC commits. It is not
part of the install transaction.

1. The bundled-plugin Vite plugin exposes each content file as a lazily
   imported asset URL per plugin. No content bytes download until an import
   asks for them.
2. For each chosen item with no `plugin_content_imports` row, the host fetches
   the file, wraps it as a `File`, and runs the CSV upload path:
   `LocalDatasetClient.startCsvImport`, then
   `DatasetClient.insertCsvFileDataset` (named with the item's title and
   description in the installing user's locale), then the Parquet upload.
3. It inserts the `plugin_content_imports` row.
4. Items run one at a time. A failure stops that item only, and its reason is
   shown with Retry.

The importing user also needs the right to create datasets. Without it, the
item fails with that reason and the install stands.

The imported datasets are ordinary CSV datasets. Their geometry column is WKT
text, so GIS offers them as boundaries without any change.

### Mozambique data

`scripts/plugins/buildMozambiqueBoundaries.ts` rebuilds the two files with
Node DuckDB and its `spatial` extension:

1. Download geoBoundaries gbHumanitarian `MOZ` `ADM1` and `ADM2` GeoJSON,
   found through the geoBoundaries API, which also names the license.
2. Simplify with `ST_SimplifyPreserveTopology`, raising the tolerance until
   each file is under 1 MB.
3. Give each district the province that contains its point on surface.
4. Write `plugins/mozambique/content/mz-adm1.csv` (`province_code`,
   `province_name`, `geometry`) and `mz-adm2.csv` (`district_code`,
   `district_name`, `province_code`, `province_name`, `geometry`), geometry as
   WKT in EPSG:4326, sorted by code. gbHumanitarian has no ISO codes, so both
   codes are geoBoundaries `shapeID`s.

The CSVs and the script are committed. The script prints the feature counts and
file sizes, and fails if a district has no province or a code repeats. The
first run produced 11 provinces (336 KB, unsimplified) and 159 districts
(908 KB, tolerance 0.00125°). The datasets' descriptions credit INE and OCHA
under CC BY 3.0 IGO.

The pack:

```text
plugins/mozambique/
  ava.yaml            id avandar.mozambique, no entry, no permissions, contributes.content
  package.json
  locales/en.json
  content/mz-adm1.csv
  content/mz-adm2.csv
```

## Install wizard

The Install button opens a large modal with a Mantine `Stepper`. Steps that do
not apply are skipped.

| Step | Shown when | Contents |
| --- | --- | --- |
| Review | Always | Name, description, version, license, the permissions section that exists today, and what the plugin adds: commands, chart types, AI tools, data slots, and the number of content items |
| Data slots | The manifest declares `dataSlots` | One panel per slot (see below) |
| Content | The manifest declares `content` | A checklist, every item checked by default. An item the workspace already imported shows "Already in this workspace" and is disabled |
| Confirm | Always | A summary of the bindings and the chosen content. Install calls `rpc_plugin_installations__install`, then imports content with each item's progress. Done closes the modal |

A data slot panel:

1. A source Select, grouped into "Case types" and "Datasets". Case types whose
   name matches the slot's `concept` hint come first.
2. One row per slot attribute: its title, its type label, whether it is
   required, and a Select listing only the source's fields of a compatible
   type.
3. Once every required attribute is mapped, a check runs the slot query on the
   current mapping and shows the row count, how many rows have a value for
   each attribute, and the first 5 rows. It runs again when the mapping
   changes.
4. An optional slot has "Skip for now". A required slot blocks Next until it is
   bound.

Only settings admins see Install, as today. The "Review new permissions" flow
stays as it is. An admin who approves `data:slots` there binds the slot from
the plugin card afterwards.

### After install

The plugin card in Settings → Plugins gains two sections:

- **Data**: one line per slot with its source ("Case type: Measles cases",
  "Dataset: line_list.csv") and its status: Bound, Not bound, or Broken with
  the reason. Settings admins get "Change", which opens the Data slots step for
  that slot alone and saves with `rpc_plugin_data_slot_bindings__save`, and
  "Remove" for an optional slot.
- **Content**: each item, linked to its dataset when imported, with Import for
  a missing item and Retry for a failed one.

Every host string goes through Lingui. Every plugin string comes from the
plugin's `locales/en.json`.

## Hardening

### Plugin AI tool names

See "Other manifest changes". The check runs in the manifest schema, so
`ava plugin validate`, `vite build`, and `pnpm dev` all reject the manifest.

### Corrupted plugin chart config

`PluginVizSettingsForm` parses the config with `AvaPluginVizConfigSchema`, and
checks each stored setting against its control kind (a column setting is a
known column id, a `select` or `segmented` value is one of its options, a
`switch` is a boolean, a `number` is a finite number), before drawing any
control. An invalid config shows "These chart settings can't be read" and a
"Reset chart settings" button that replaces them with the defaults a new pick
of that chart type gets. `PluginVizSettingControls` receives only parsed
values.

### Plugin bundle check

`pnpm check:plugin-bundle` already fails before this slice: it counts 58,991
host bytes against a 39,600 byte budget. Slice 1c's chat imports
`makePluginApi` and the plugin tool runner dynamically, but the check does not
know those imports are lazy runtimes, so their chunks count as host code.

This slice makes the check pass again:

1. Register the chat's plugin tool runtime as a lazy runtime in the check.
2. Measure what remains, and move or lazily load any startup host code that
   is cheap to move.
3. Keep the generated `loadContentUrls` small.
4. Re-baseline `HOST_BUDGET_BYTES` by 1b's rule (the measured bytes rounded up
   to the next 1,000, plus 2,000), with the reason in its comment.

## Testing

| Layer | Tests |
| --- | --- |
| Manifest | `dataSlots` rules, the `data:slots` pairing, `content` rules (missing file, file over 1 MB, non-CSV), optional `entry`, reserved tool names, and the `DATA_AGENT_TOOLS` drift test |
| Binding status | `getDataSlotBindingStatus` for every row of its table |
| Slot SQL | The SQL builder for a case type and a dataset, unmapped optional attributes, and quoting. An executed DuckDB test runs the built SQL against a small dataset relation |
| Runtime | `querySlot` errors and truncation, `fetchRows` accepting slot handles from the same invocation only, `openDataSlotBinding` for admins and non-admins |
| Case epicurve | Modal states: unbound, broken, no district, truncated, drawn |
| Wizard | Which steps a manifest gets, the slot panel's type filtering and required logic, and the import orchestration with mocked clients (success, one failure, already imported) |
| Chart config | A corrupted config renders the message and Reset instead of crashing |
| pgTAP | RLS on both tables. A failing binding rolls back the install. An import row survives uninstall and goes when its dataset is deleted. The workspace trigger |
| E2E, one at a time | `plugins-mozambique-install.spec.ts`: install through the wizard, both datasets appear in Data Manager. `plugins-epidemiology-case-slot.spec.ts`: an E2E-helper case type with an onset date and a district, install with the `cases` slot bound, run Case epicurve, bars render. The existing epidemiology E2Es are updated for the Plugins menu. Each spec deletes the installs and datasets it created |
| Live AI eval | Adding `data:slots` sends existing epidemiology installs to `needs_review`, which withdraws `fitRegression` until an admin approves. Re-run `--questions R` and the default 45 with `--harness pi --model anthropic/claude-haiku-5.5` against the 42/45 baseline |

## Docs

- `docs/plugin-authoring.md`: new sections for data slots and for content, and
  the new permission, API members, and error codes in the existing tables.
- A handoff for the next slice.

## Done when

In one workspace:

1. The Mozambique pack installs through the wizard and imports both boundary
   datasets. They appear in Data Manager, and GIS offers them as boundaries.
2. The epidemiology plugin installs with its `cases` slot bound to a case type,
   and the Case epicurve draws from that case type.
