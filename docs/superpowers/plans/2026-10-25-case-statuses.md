# Configurable Case Statuses: Plan Overview

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each plan below task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every case type its own editable status set (name, description, color, order, default), let the right roles change it and change a record's status, and make status filterable in the records list, queryable in the Data Explorer, and visible to chat.

**Architecture:** Two new app roles (`case_types`, `case_records`) gate who may edit case types and records. A `concept_statuses` table holds each case type's statuses. `individuals.status_id` and `concepts.default_status_id` point into it through composite foreign keys, so a record can only hold a status of its own case type. Case-type creation and status-set saves are single RPCs. The screens move to the standard `AppView` and `AppListPane` layouts, the Data Explorer gets a built-in `status` column, and chat sees and proposes statuses.

**Tech Stack:** Postgres (Supabase declarative schema, pgTAP, migration upgrade tests), TypeScript, React, Mantine, TanStack Router and Query, Lingui, DuckDB (QETL), Deno edge functions, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-case-statuses-design.md`. Section numbers below (§) refer to it.

---

## The four plans, in order

Each plan leaves `develop`-quality working software behind it. Run them in this order. A later plan assumes every earlier plan has landed on `feat/statuses`.

| Order | Plan | Spec sections | Depends on |
| --- | --- | --- | --- |
| 1 | `2026-10-25-case-statuses-1-app-roles.md` | §4 except §4.5 | nothing |
| 2 | `2026-10-25-case-statuses-2-data-model.md` | §4.5, §5, §6, §7, §11 (creation), §14 (ontology doc) | plan 1 |
| 3 | `2026-10-25-case-statuses-3-screens.md` | §8.1, §8.2, §8.4, §8.5, §8.6, §11 | plans 1 and 2 |
| 4 | `2026-10-25-case-statuses-4-explorer-and-chat.md` | §8.3, §9, §10, §13, §14 (roadmap) | plans 1, 2, and 3 |

Between plans 1 and 2 there is one known gap: an editor who is not a `case_types` admin cannot delete a concept, so `rollbackConceptFormInsert` fails for them after a failed creation. Plan 2 deletes the rollback and makes creation atomic.

## Ground rules for every plan

These come from `CLAUDE.md` and `docs/rules/`. Every task in every plan obeys them.

1. **Check the Supabase switch before any database command.** Run `ava supabase status` and confirm the first line is green and names the `feat-statuses` project. Only then run `pnpm db:reset`, `pnpm db:new-migration`, `pnpm test:db`, `supabase start`, `supabase stop`, or `supabase db diff`. If `ava` is missing, run `pnpm build:ava-cli`.
2. **Never touch production.** No migration, query, or write against the production Supabase project. Read-only inspection only, and none is needed by these plans.
3. **Schema changes follow `supabase-declarative-schema`.** Load that skill (it lives at `agent-skills/public-skills/skills/supabase-declarative-schema/SKILL.md`) before editing SQL. Edit `supabase/schemas/`, then `pnpm db:reset` immediately followed by `pnpm db:new-migration <name>`. Never hand-edit a generated migration. DML (backfills) and `alter type ... add value` are the only hand-written migrations, created with `supabase migration new <name>`.
4. **Commit by path, never `git add -A`.** `supabase/config.toml` is switched to the branch project and must never be staged. Commit after every task with a Conventional Commits message (`feat(case-statuses): ...`, `test(case-statuses): ...`) ending with the `Co-Authored-By` trailer the session asks for. Do not push.
5. **Red/green TDD.** Write the failing test, watch it fail for the stated reason, implement, watch it pass. Tests follow `docs/rules/testing.md`: named after what they assert, no tautologies.
6. **All user-facing copy goes through Lingui** (`<Trans>`, `useLingui().t`, or `msg` + `i18n._`). Never pass `t` into a helper (`docs/rules/i18n.md`). After adding strings run `pnpm i18n:extract` and `pnpm i18n:compile`, and commit the catalogs.
7. **Comments:** no em dashes, no references to these plans, phases, or the spec. Describe the code as it is. SQL docstrings use `/** */`, everything else `--` (`docs/rules/sql.md`).
8. **E2E tests run one spec at a time** (`pnpm test:e2e <spec>.spec.ts`), drive the UI only, restore state in `finally`, and keep local timeouts at 45 seconds or less (`docs/rules/e2e-testing.md`).
9. **UI follows `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md`.** Plans 3 and 4 replace existing surfaces, so the executor loads the `impeccable` skill before those tasks.
10. **Copy names what the user does,** not the table: "case type", "record", "status". Never "concept" or "individual" in the UI.

## Commands

| Purpose | Command |
| --- | --- |
| Switch check | `ava supabase status` |
| Reset local DB from migrations | `pnpm db:reset` |
| Generate a migration from `supabase/schemas/` | `pnpm db:new-migration <name>` |
| Hand-written migration (DML or enum label only) | `supabase migration new <name>` |
| Regenerate DB types | `pnpm db:gen-types` |
| pgTAP, privilege reconcile, and migration upgrade tests | `pnpm test:db` |
| Unit tests (one file or pattern) | `pnpm test:frontend <pattern>` |
| Executed DuckDB tests | `pnpm test:executed <pattern>` |
| Type check (web, video producer, Deno) | `pnpm type-check` |
| Lint | `pnpm lint` |
| Desktop SQLite migrations | `pnpm desktop:sqlite:gen-migrations` then `pnpm desktop:sqlite:check-migrations` |
| One E2E spec | `pnpm test:e2e <spec>.spec.ts` |
| Lingui catalogs | `pnpm i18n:extract && pnpm i18n:compile` |

## Shared names

Later plans use these names exactly. Plan 2 creates everything in this section except where noted.

### Database (plan 2)

| Object | Name |
| --- | --- |
| Table | `public.concept_statuses (id, workspace_id, concept_id, name, description, color, position, created_at, updated_at)` |
| Record column | `public.individuals.status_id uuid not null`, FK `(status_id, concept_id)` to `concept_statuses (id, concept_id)` |
| Case type column | `public.concepts.default_status_id uuid not null`, FK `(default_status_id, id)` to `concept_statuses (id, concept_id)`, deferrable initially deferred |
| Removed column | `public.individuals.status` (dropped) |
| Triggers on `individuals` | `tr_individuals__check_status_change`, `tr_individuals__set_default_status` |
| Attribute check | `concept_attributes__name_not_reserved`: `check (lower(btrim(name)) <> 'status')` |
| Creation RPC | `public.rpc_concepts__create(p_concept jsonb, p_attributes jsonb, p_dataset_column_mappings jsonb, p_manual_entry_mappings jsonb, p_statuses jsonb) returns uuid` |
| Save RPC | `public.rpc_concept_statuses__save(p_concept_id uuid, p_statuses jsonb, p_default_status_id uuid, p_replacements jsonb) returns void` |

`tr_individuals__check_status_change` raises errcode `42501` with hint `case_records_editor_required` when a signed-in user who is not a Case Records editor changes a record's status.

The save RPC raises with these stable `hint` values, which the client maps to copy:

| Hint | Raised when |
| --- | --- |
| `case_types_editor_required` | caller is not a `case_types` editor in the case type's workspace (errcode `42501`) |
| `status_set_empty` | `p_statuses` is empty |
| `status_name_required` | a name is blank after trimming |
| `status_names_not_unique` | two names match case-insensitively after trimming |
| `status_color_invalid` | a color does not match `^#[0-9a-f]{6}$` |
| `status_not_in_case_type` | an id in `p_statuses` belongs to another case type |
| `status_default_not_in_set` | `p_default_status_id` is not in `p_statuses` |
| `status_replacement_required` | a removed status still has records and no replacement |
| `status_replacement_not_in_set` | a replacement id is not in `p_statuses` |

### Model: `shared/models/ontology/ConceptStatus/` (plan 2)

Import from `$/models/ontology/ConceptStatus/ConceptStatus` (`.ts` suffix inside `shared/`).

Types on the `ConceptStatus` namespace:

```ts
ConceptStatus.T           // Read: Model.Base<"ConceptStatus", { id, workspaceId, conceptId, name, description: string | undefined, color, position, createdAt, updatedAt }>
ConceptStatus.T<"Insert"> // id, description, createdAt, updatedAt optional
ConceptStatus.Id          // UUID<"ConceptStatus">
ConceptStatus.ColorKey    // "neutral" | "green" | "blue" | "teal" | "yellow" | "orange" | "red" | "grape"
ConceptStatus.Draft       // { id: ConceptStatus.Id; name: string; description: string; color: string }
ConceptStatus.SetValue    // { statuses: readonly ConceptStatus.Draft[]; defaultStatusId: ConceptStatus.Id | undefined }
ConceptStatus.SetIssue    // { type: "empty_set" } | { type: "name_required"; statusId } | { type: "name_not_unique"; statusId } | { type: "default_required" } | { type: "replacement_required"; statusId }
ConceptStatus.SavePayload // { conceptId: Concept.Id; statuses: Array<{ id; name; description: string | undefined; color; position: number }>; defaultStatusId: ConceptStatus.Id; replacements: Partial<Record<ConceptStatus.Id, ConceptStatus.Id>> }
ConceptStatus.SaveErrorHint // the nine hints in the table above
```

Values on `ConceptStatus` (from `ConceptStatusModule.ts`, merged with the namespace the way `Concept` merges `ConceptModule`):

| Member | Signature | Behavior |
| --- | --- | --- |
| `PALETTE` | `ReadonlyArray<{ key: ConceptStatus.ColorKey; hex: string }>` | The eight swatches of §5.5, in that order: neutral `#637c95`, green `#40c057`, blue `#228be6`, teal `#12b886`, yellow `#fab005`, orange `#fd7e14`, red `#fa5252`, grape `#be4bdb` |
| `getNextFreeColor` | `(usedColors: readonly string[]) => string` | First palette hex not in `usedColors` (case-insensitive), wrapping to `PALETTE[usedColors.length % 8]` when all are used |
| `getColorKey` | `(hex: string) => ConceptStatus.ColorKey \| undefined` | Palette key for a hex, for accessible color names |
| `sortByPosition` | `<S extends { position: number; name: string }>(statuses: readonly S[]) => S[]` | Ascending position, ties by name |
| `toDrafts` | `(statuses: readonly ConceptStatus.T[]) => ConceptStatus.Draft[]` | Sorted drafts, `undefined` description becomes `""` |
| `getRemovedStatusIds` | `(options: { savedStatusIds: readonly ConceptStatus.Id[]; statuses: readonly ConceptStatus.Draft[] }) => ConceptStatus.Id[]` | Saved ids no longer in the set |
| `findSetIssues` | `(options: { value: ConceptStatus.SetValue; recordCounts?: Partial<Record<ConceptStatus.Id, number>>; savedStatusIds?: readonly ConceptStatus.Id[]; replacements?: Partial<Record<ConceptStatus.Id, ConceptStatus.Id>> }) => ConceptStatus.SetIssue[]` | Every problem with the set, empty when it can be saved |
| `buildSavePayload` | `(options: { conceptId: Concept.Id; value: ConceptStatus.SetValue; savedStatusIds: readonly ConceptStatus.Id[]; replacements: Partial<Record<ConceptStatus.Id, ConceptStatus.Id>> }) => ConceptStatus.SavePayload` | Positions from array order, trimmed names, blank description to `undefined`, replacements kept only for removed ids. Throws when `defaultStatusId` is undefined |
| `toSaveErrorHint` | `(error: unknown) => ConceptStatus.SaveErrorHint \| undefined` | Reads `hint` from a thrown Postgrest error |
| `isReservedAttributeName` | `(name: string) => boolean` | True when an attribute name would collide with the built-in `status` column (`"status"` after trimming, any case) |
| `toNonReservedAttributeName` | `(name: string) => string` | `"<trimmed name> (attribute)"` for a reserved name, otherwise `name` unchanged. The same rename the backfill migration applies |

The model lives in `shared/models/ontology/ConceptStatus/`: `ConceptStatus.ts`, `ConceptStatus.types.ts`, `ConceptStatusParsers.ts`, and `ConceptStatusModule/ConceptStatusModule.ts` with its test.

### Other model changes (plan 2)

- `Individual.T` loses `status` and gains `statusId: ConceptStatus.Id`. `Individual.T<"Insert">` makes `statusId` optional.
- `Concept.T` gains `defaultStatusId: ConceptStatus.Id`.
- `ConceptFormValues` (`src/views/OntologyDesignerApp/ConceptCreatorView/conceptFormTypes.ts`) gains `statuses: readonly ConceptStatus.Draft[]` and, through `Concept.T<"Insert">`, `defaultStatusId: ConceptStatus.Id`.

### Clients (plan 2)

| Member | Signature |
| --- | --- |
| `ConceptStatusClient` (`src/clients/ontology/ConceptStatusClient.ts`) | standard CRUD and hooks (`getAll`, `useGetAll`, ...) for `concept_statuses` |
| `ConceptStatusClient.getRecordCounts` / `useGetRecordCounts` | `(params: { conceptId: Concept.Id }) => Promise<Partial<Record<ConceptStatus.Id, number>>>` |
| `ConceptStatusClient.saveStatusSet` / `useSaveStatusSet` | `(payload: ConceptStatus.SavePayload) => Promise<void>`, calls `rpc_concept_statuses__save` |
| `ConceptClient.create` / `useCreate` | `(params: { concept: Concept.T<"Insert">; statuses: ReadonlyArray<ConceptStatus.T<"Insert">>; attributes: ReadonlyArray<ConceptAttribute.T<"Insert">>; mappings: ReadonlyArray<AttributeMapping<"Insert">> }) => Promise<Concept.Id>`, calls `rpc_concepts__create` |

### Frontend helpers (plan 2)

- `makeDefaultStatusDrafts()` in `src/views/OntologyDesignerApp/makeDefaultStatusDrafts/makeDefaultStatusDrafts.ts` returns `{ statuses: ConceptStatus.Draft[]; defaultStatusId: ConceptStatus.Id }` (assignable to `ConceptStatus.SetValue`): Active (green, default, "Open and being worked on.") then Inactive (neutral, "No longer being worked on."), with fresh ids. It translates with `t` from `@lingui/core/macro`, the pattern `src/config/AppLinks/AppLinks.tsx` uses outside components.
- `getDefaultConceptFormValues()` and `createdCaseTypeToFormValues()` fill `statuses` and `defaultStatusId` from it.
- `insertConceptFromFormValues()` keeps its signature and calls `ConceptClient.create`. `rollbackConceptFormInsert` is deleted.

### Components (plan 3)

Plan 4 uses these.

| Component | Path | Props |
| --- | --- | --- |
| `StatusSetEditor` | `src/components/caseStatuses/StatusSetEditor/StatusSetEditor.tsx` | `value: ConceptStatus.SetValue`, `onChange`. Edit mode adds `savedStatuses`, `recordCounts`, `replacements`, `onReplacementsChange`. Its default radio group is named "Default status" |
| `StatusBadge` | `src/components/caseStatuses/StatusBadge/StatusBadge.tsx` | `name`, `color`, `description?` (tooltip on hover and focus), `withTooltip?` (default `true`) |
| `StatusDot` | `src/components/caseStatuses/StatusDot/StatusDot.tsx` | `color`, `label?`, `size?` |

The record page's status control is a menu button named `Status: <current status>`, with one menu item per status. E2E specs in plans 3 and 4 locate it that way.

### E2E seeding helpers

A case type and its default status reference each other, so every helper seeds through `rpc_concepts__create` with the service-role client, which takes `owner_id` from the payload.

| Helper | Plan | Seeds |
| --- | --- | --- |
| `insertE2ECaseType`, `deleteE2ECaseTypes` (`tests/e2e/helpers/insertE2ECaseType.ts`) | 1, moved onto the RPC in plan 2 Task 5 | A case type with Active and Inactive and no attributes |
| `insertE2ECaseTypeWithRecords` | 3 | A case type with given statuses and records, no attributes |
| `CaseTypeSeedHelpers` (`tests/e2e/helpers/CaseTypeSeedHelpers.ts`) | 4 | A dataset-backed case type with records, for the Data Explorer |

### Permission keys (plan 1)

| App | viewer | editor adds | admin adds |
| --- | --- | --- | --- |
| `case_types` | `case_types__can_view_case_type` | `case_types__can_create_case_type`, `case_types__can_edit_case_type`, `case_types__can_sync_records` | `case_types__can_delete_case_type` |
| `case_records` | `case_records__can_view_record` | `case_records__can_edit_record`, `case_records__can_sync_records` | `case_records__can_delete_record` |

Labels: `appLabel("case_types")` is "Case Types", `appLabel("case_records")` is "Case Records".

## Deliberate refinements of the spec

| Spec text | Plan | Why |
| --- | --- | --- |
| §7 "`StatusFormValues`" | `ConceptStatus.Draft` in the shared model | The pure helpers in `shared/` operate on it, and `shared/` cannot import from `src/`. |
| §10.2 "`parseProposeCaseType` ... falls back to the default set" | The edge-function parser drops missing or invalid statuses and returns none. `createdCaseTypeToFormValues` fills the translated default set. | The parser runs in a Deno edge function with no Lingui catalog, and §5.6 requires the default names in the creator's language. |
| §5.4 "the create form and chat parser reject the name" | A field the user names "status" by hand (manual-entry fields, the draft card's name input) is rejected with a validation message. A field named after a dataset column called "status" is renamed with `toNonReservedAttributeName` when it is built (the form's dataset-column fields, `createdCaseTypeToFormValues`, and `parseProposeCaseType`). | Dataset-column fields take the column's name and the form has no input to rename them, so rejecting would make any dataset with a `status` column unusable as a source. |
| §6.1 creation RPC takes row shapes | `owner_id` is always the signed-in caller. Only a service-role call, which has no signed-in user, reads `owner_id` from the payload, and the RPC is granted to `service_role` | E2E seeding cannot create a case type and its default status in two REST requests, and a signed-in user must not be able to create a case type owned by someone else. |
| §8.5 "a select whose options are colored badges" | A menu button with one item per status | Only menu items take real focus, which the description tooltip on focus needs. |
| §9 (not mentioned) | Plan 4 restores the `status` column from a Data Explorer URL | Without it, reopening a saved explorer URL drops the column. |
| §5 one schema migration | Three migrations: structure with nullable columns, a hand-written backfill, then `not null`, the column drop, and the reserved-name check | `db diff` never emits DML, and the backfill has to run between adding the columns and constraining them. |

## Verification once all four plans land

- [ ] `pnpm test:db` passes, including the migration upgrade scenario for the status backfill.
- [ ] `pnpm test:frontend`, `pnpm test:executed`, `pnpm type-check`, and `pnpm lint` pass.
- [ ] The seven new or updated E2E specs pass, each run on its own.
- [ ] `pnpm i18n:check` is clean.
- [ ] `git status` shows only `supabase/config.toml` modified.
- [ ] Nothing was run against production.
