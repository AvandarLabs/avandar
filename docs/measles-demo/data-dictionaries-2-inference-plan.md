# Data Dictionaries 2: Learn From Datasets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Data Sources editor create a dictionary by learning it from one or more datasets: Avandar profiles every column on the device, guesses which columns are coded or ordered, merges columns that mean the same thing across datasets, lets the user rename entries, and suggests labels online (after the chat's consent prompt) or with the offline model. Values can be saved without a label and finished later.

**Architecture:** Pure inference lives in two new non-persisted models under `shared/models/dataDictionaries/`: `ColumnProfile` (name tokens, kind classification, the match scorer) and `DictionaryProposal` (clustering columns into entries, deriving code lists, labels, and the save draft). The browser profiles datasets through the existing QETL query layer (`WorkspaceQuerySession.runQuery`, two queries per dataset) and asks for AI suggestions through one shared prompt module that runs on a new `chat` edge route online and on `OfflineChatEngineStore` offline. A four-step task view (`dictionaries/new`) holds the whole flow in a reducer and saves with `DataDictionaryClient.insert` plus `saveContents`. One schema change comes first: the save RPC accepts a blank label, and slice 1's model and editor treat it as a non-blocking "needs a label" warning. Online suggestions go through the chat's consent gate (`decideIfDataCanCrossBoundary`), and the edge route verifies the consent's ack token.

**Tech Stack:** Supabase Postgres (declarative schemas, pgTAP), TypeScript, React 19, Mantine 9 (`Stepper`, `Table`, `NavLink`), TanStack Query and Router, zod 4, Lingui, DuckDB-WASM through QETL, `@duckdb/node-api` for executed tests, WebLLM through `OfflineChatEngineStore`, OpenRouter through the `chat` Supabase edge function, Vitest, Playwright.

**Spec:** [data-dictionaries-design.md](data-dictionaries-design.md), slice 2 of section 16. Read sections 3, 7.1, 7.3, 7.4, 8, 12, 13, and 17 first. Refinements made while planning are listed at the end of this file and override the spec where they differ.

**Scope:** Slice 2 only: blank labels, profiling, scoring, the create flow from the toolbar and from a dataset's menu, and AI label and match suggestions online and offline. Applying dictionaries and Ask Avandar context (slice 3), the small "Add from datasets into an existing dictionary" piece that follows slice 3, conversions (slice 4), and crosswalks (slice 5) stay out. So do "Apply a dictionary" on the dataset menu and the "Apply it to <dataset> next" checkbox on the Save step.

**Builds on:** slice 1 ([data-dictionaries-1-dictionaries-plan.md](data-dictionaries-1-dictionaries-plan.md), feature log F129): the four dictionary tables, `rpc_data_dictionaries__save`, `DataDictionaryModule` (draft helpers), `DataDictionaryClient.saveContents`, the Dictionary view, and `NewDataDictionaryModal`.

**Prototype:** `.impeccable/mocks/prototype/data-dictionaries.html` in this worktree (gitignored). Its `renderCreate()` is the create flow: open the file in a browser and pick "Create a dictionary" in its guide, or open a dataset's ⋯ menu there.

---

## Before you start

Read once:

- `AGENTS.md` (root; `CLAUDE.md` is a symlink to it): scope, naming, comments, i18n, the Supabase switch stop condition, e2e rules.
- `docs/rules/typescript.md`, `docs/rules/sql.md` (Task 1), `docs/rules/testing.md`, `docs/rules/e2e-testing.md`, `docs/rules/i18n.md`.
- `docs/design/app-view-layout.md` and the Named Rules in `DESIGN.md` (before Tasks 13 to 20). Load the `impeccable` skill before Task 13: the create flow is a new surface.
- The code this plan reuses:
  - `src/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets.ts` (one summary query per dataset, then the values of short columns) and `src/clients/datasets/DatasetQueryClient.ts` (per-column summaries). Profiling here follows the first one's two-query shape.
  - `shared/agent/chatTitle/chatTitlePrompt.ts`, `supabase/functions/chat/PostChatTitle/PostChatTitle.ts`, and `src/components/ChatPanel/ChatSessionTitle/requestChatSessionTitle.ts`: one shared prompt module, a small edge route, and a browser function that runs the same prompt online or on `OfflineChatEngineStore.complete`. Suggestions copy this shape.
  - `src/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage.ts`: JSON-schema constrained decoding on the offline model.
  - `src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.ts`: where a model call runs (cloud or local).
  - `src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx` (opens `ConsentModal`, writes the browser-local consent log through `ConsentAuditEntryClient`, mints an ack token into `PendingAcks`), its use with `explicitConsentRequired` in `src/views/DataManagerApp/DataImportView/ManualUploadView/PdfTablePicker/runRegionModelAssist/runRegionModelAssist.ts`, and the matching server check in `supabase/functions/chat/PostExtractMeasurements/PostExtractMeasurements.ts`. Suggestions reuse all three. Offline, the chat asks no consent (`runOfflineDataAgentTurn`), and neither do suggestions.
  - `shared/models/dataDictionaries/DataDictionary/DataDictionaryModule/DataDictionaryModule.ts`: `isCodedKind`, `findDraftIssues`, `buildSavePayload`.
  - `src/views/DataManagerApp/DataDictionaryView/useDictionaryCopy.ts`: kind labels and save error copy.
  - `src/views/DataManagerApp/NewDataDictionaryModal/NewDataDictionaryModal.tsx`: creating a dictionary row.

House conventions:

- `shared/` imports siblings with `.ts` and never imports `src/`. `src/` imports shared through `$/` without the extension.
- Import a model's entry file and use its namespace (`ColumnProfile.T`, `DictionaryProposal.Entry`). Files inside a model folder may import sibling `*.types.ts` files.
- Every user-facing string goes through Lingui (`<Trans>`, `<Plural>`, or `t` from `useLingui()`). Never pass `t` into a helper. No em dashes anywhere, including comments.
- Functions stay at 45 lines or fewer. Docstrings on every exported function, type, constant, and module key, saying what it is for.
- Component tests use `render`, `screen`, `fireEvent`, `waitFor`, `within` from `@/test-utils`.
- Run one Vitest file: `pnpm vitest run <path>`. Executed tests (real DuckDB): `pnpm vitest run --config vitest.executed.config.ts <path>`.
- `pnpm test:frontend` excludes `shared/lib/**`, so nothing in this plan goes under `shared/lib/`.
- Before each commit format what you touched: `pnpm exec oxfmt --ignore-path .oxfmtignore <ts/tsx files>`, `pnpm exec eslint --fix <files>`, `pnpm exec stylelint <css files>`.
- Verify types with `pnpm exec tsc -b --force --noEmit` (plain `tsc -b` can report clean from a stale cache) and the edge function with `pnpm type-check:deno`.
- Commit by explicit path, never `git add -A`. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File structure

| File | Responsibility |
| --- | --- |
| `supabase/schemas/50.rpc_data_dictionaries__save.sql` | Modify: `data_dictionaries__check_pairs` accepts a blank label |
| `supabase/tests/database/data_dictionaries/rpc_data_dictionaries__save.test.sql` | Modify: blank code refused, blank labels saved, non-blank labels still unique |
| `supabase/migrations/*_data_dictionaries_blank_labels.sql`, `apps/desktop/migrations/*_data_dictionaries_blank_labels.gen.sql` | Generated migration and its desktop twin |
| `shared/models/dataDictionaries/DataDictionary/*` | Modify: `DraftWarning`, `findDraftWarnings`; a blank label is no longer an issue |
| `src/views/DataManagerApp/DataDictionaryView/{useDictionaryCopy.ts,CodeListEditor/*,DictionaryEntriesTab/*}` | Modify: "Needs a label" on rows, "n values need a label" on the entries table |
| `shared/models/dataDictionaries/ColumnProfile/ColumnProfile.ts` | Namespace for profiles and match scores |
| `shared/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts` | `ColumnProfileT`, `ColumnProfileValue`, `ColumnMatchScore` |
| `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/columnNameHelpers.ts` | Words, tokens (abbreviations, synonyms), entry names, name score |
| `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts` (+ test) | Kind classification, the scorer, scale order |
| `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposal.ts` | Namespace for the proposal, code lists, labels |
| `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts` | Proposal, entry, code list, labels, suggestion, name issue types |
| `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/DictionaryProposalModule.ts` (+ test) | Edits: rename, kind, include, keep apart, meaning matches, descriptions; name issues |
| `.../DictionaryProposalModule/makeProposalFromColumnProfiles/` (+ test) | Clusters profiled columns into uniquely named entries |
| `.../DictionaryProposalModule/getCodingsFromProposal/` (+ test) | Code lists (shared by identical word codes, or numeric codes and a first word) and codings |
| `.../DictionaryProposalModule/proposalLabelHelpers/` (+ test) | Default labels, edits, suggestions, status |
| `.../DictionaryProposalModule/makeDraftFromProposal/` (+ test) | The `DataDictionary.Draft` the save RPC takes, blank labels kept blank |
| `shared/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts` (+ test) | Request schema, the text a consent covers, messages, JSON schemas, reply parsers |
| `supabase/functions/chat/PostDictionarySuggestions/PostDictionarySuggestions.ts` (+ test) | Online suggestions route; verifies the consent ack |
| `supabase/functions/chat/ChatRoutes.ts`, `ChatRoutes.types.ts` | Modify: register the route |
| `src/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql.ts` (+ `__tests__/` unit and executed tests) | Profiling SQL and turning its rows into profiles |
| `src/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns.ts` (+ test) | Profiles one dataset through QETL |
| `src/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions.ts` (+ test) | Which model runs suggestions, consent, the request, the call |
| `src/models/privacy/ConsentAuditEntry/ConsentAuditEntry.constants.ts`, `src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx`, `src/views/WorkspaceSettingsPage/PrivacyLogTab/ConsentLogPanel.tsx` | Modify: a `dictionary_suggestions` consent context and its privacy log label |
| `src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.ts` | Modify: docstring names the new caller |
| `src/views/DataManagerApp/NewDictionaryFromDatasetsView/` | The create flow: reducer, hooks, steps, view |
| `src/routes/_auth/$workspaceSlug/data-manager/dictionaries/new.tsx` | Route with `fromDatasetId` |
| `src/config/AppLinks/AppLinks.tsx` | Modify: `dataManagerNewDictionary` |
| `src/views/DataManagerApp/DataManagerApp.tsx` | Modify: hide the list on the create route |
| `src/views/DataManagerApp/useListPaneToggle/` (+ test) | Whether the list shows, and Show list / Hide list |
| `src/views/DataManagerApp/DataManagerToolbarActions/` (moved, + test) | New dictionary menu, Show list / Hide list |
| `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.tsx` (+ test) | Modify: Create a dictionary from this dataset |
| `tests/data/measles-line-list-small/measles-line-list-small.csv` | 24-row coded line list for e2e |
| `tests/e2e/helpers/constants.ts` | Modify: the fixture's path and row count |
| `tests/e2e/dictionary-create-from-dataset.spec.ts` | E2E: consent, online and offline suggestions, blank labels on the dictionary |
| `tests/e2e/data-dictionary-edit.spec.ts` | Modify: New dictionary is now a menu |
| `docs/measles-demo/data-dictionaries-design.md` | Modify: blank labels allowed; the follow-up piece after slice 3 |
| `docs/measles-demo/pr-feature-log.md` | Modify: F130 |

---

### Task 0: Preflight

**Files:** none

- [ ] **Step 1:** `git rev-parse --abbrev-ref HEAD`. Expected: `feat/dictionary-inference`.
- [ ] **Step 2: Switch to this branch's own local Supabase.** The shared `avandar` stack does not have slice 1's dictionary tables, so this branch needs its own. Run `ava supabase status`. If its first line does not name this branch's own project, run `ava supabase switch` (it seeds the new stack) and run `ava supabase status` again. Do not continue until its first line names `feat-dictionary-inference`. If `ava` is missing, run `pnpm build:ava-cli`. Do not edit `supabase/config.toml` or the switch block in `.env.development`.
- [ ] **Step 3: Point the edge runtime at the switched stack.** A switch rewrites `.env.development.edge` but not the gitignored `supabase/functions/.env`, so the `chat` edge function would refuse every user token with `unexpected "iss"`. Run `diff .env.development.edge supabase/functions/.env`. If they differ, `cp .env.development.edge supabase/functions/.env`, then `supabase stop` and `ava supabase switch feat-dictionary-inference`, and confirm with `ava supabase status`. Keep `OPEN_ROUTER_API_KEY` in `supabase/functions/.env` if it was there.
- [ ] **Step 4:** `pnpm vitest run src/views/DataManagerApp shared/models/dataDictionaries src/clients/dataDictionaries shared/agent`. Expected: PASS. This is the baseline the later tasks keep green.

This slice changes one function in `supabase/schemas/` (Task 1), which is a second reason it needs its own stack. Before any `pnpm db:reset`, `pnpm db:new-migration`, `supabase db diff`, `supabase start`, or `supabase stop`, run `ava supabase status` and confirm its first line names `feat-dictionary-inference`. Never run them while it points at the shared `avandar` stack.

---

### Task 1: Blank labels in the save RPC (schema)

A value can now be saved without a label: it waits for one, and the editor marks it (Task 2). Today `data_dictionaries__check_pairs` refuses a blank label with `code_pair_incomplete`. After this task it refuses only a blank code, and a label that is not text at all. Label uniqueness already ignores blank spellings (`where btrim(spellings.spelling) <> ''`), so two blank labels in one list never clash. Nothing else in the schema changes, and the RPC's signature does not change.

Load the `supabase-declarative-schema` and `supabase-postgres-best-practices` skills. Read `docs/rules/sql.md`.

**Files:**
- Modify: `supabase/schemas/50.rpc_data_dictionaries__save.sql` (`data_dictionaries__check_pairs` only)
- Modify: `supabase/tests/database/data_dictionaries/rpc_data_dictionaries__save.test.sql`
- Create (generated): `supabase/migrations/<timestamp>_data_dictionaries_blank_labels.sql`
- Create (generated): `apps/desktop/migrations/<timestamp>_data_dictionaries_blank_labels.gen.sql`
- Regenerate, commit only if it changed: `shared/types/database.types.ts`

- [ ] **Step 1: Stop condition.** `ava supabase status`. Its first line must name `feat-dictionary-inference` (Task 0 switched). If it says `This is the develop local Supabase`, stop: do not run any database command below until the switch is in place.

- [ ] **Step 2: Write the failing pgTAP tests.** In `rpc_data_dictionaries__save.test.sql`:

Change `select plan (19);` to `select plan (23);`.

Replace test 4 (a blank label used to be refused) with a blank code:

```sql
-- 4.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500001-0000-4000-8000-000000000001","name":"Sex","is_ordered":false,"pairs":[{"code":" ","label":"Male","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'code_pair_incomplete',
  'every pair needs a code'
);
reset role;
```

Add these four tests after test 17, before `select * from finish ();`. They come last because a successful save bumps the version that tests 13 to 17 count.

```sql
-- Blank labels. A value can wait for its label.

-- 18.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500002-0000-4000-8000-000000000002","name":"Hospitalized","is_ordered":false,"pairs":[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"","accepted_spellings":[],"is_missing":false},{"code":"U","label":" ","accepted_spellings":[],"is_missing":true}]}]'::jsonb,
    '[]'::jsonb
  ),
  'no error',
  'values with blank labels save, two of them in one list'
);
reset role;

-- 19.
select is (
  (
    select count(*)::int
    from public.data_dictionaries__code_lists cl
    cross join lateral jsonb_array_elements(cl.pairs) as p (pair)
    where
      cl.id = 'de500002-0000-4000-8000-000000000002'::uuid and
      btrim(p.pair ->> 'label') = ''
  ),
  2,
  'the blank labels are stored blank'
);

-- 20.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500002-0000-4000-8000-000000000002","name":"Hospitalized","is_ordered":false,"pairs":[{"code":"Y","label":"Yes","accepted_spellings":[],"is_missing":false},{"code":"1","label":"yes","accepted_spellings":[],"is_missing":false},{"code":"N","label":"","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'labels_not_unique',
  'two values still cannot share a label that is not blank'
);
reset role;

-- 21.
select is (
  pg_temp.save_as (
    'de000001-0000-4000-8000-000000000001'::uuid,
    'de400001-0000-4000-8000-000000000001'::uuid,
    '[{"id":"de500002-0000-4000-8000-000000000002","name":"Hospitalized","is_ordered":false,"pairs":[{"code":"Y","accepted_spellings":[],"is_missing":false}]}]'::jsonb,
    '[]'::jsonb
  ),
  'dictionary_payload_invalid',
  'a value without a label field at all is refused'
);
reset role;
```

That is 21 numbered assertions plus 12b and 12c, so 23.

- [ ] **Step 3:** `pnpm test:db`. Expected: FAIL on 18 (`code_pair_incomplete` instead of `no error`) and 21. Everything else passes.

- [ ] **Step 4: Change the check.** In `supabase/schemas/50.rpc_data_dictionaries__save.sql`, replace the docstring and the first `if exists` block of `data_dictionaries__check_pairs` with:

```sql
/**
 * Raises with a stable hint when any code list's pairs are incomplete or
 * ambiguous: a blank code, a label that is not text, two codes that differ
 * only in case, or a label or accepted spelling shared by two pairs. A
 * blank label is allowed: the value is saved and waits for its label, and
 * blank labels never clash with each other.
 */
create or replace function public.data_dictionaries__check_pairs (p_code_lists jsonb) returns void language plpgsql
set
  search_path = '' as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where jsonb_typeof(p.pair -> 'label') is distinct from 'string'
  ) then
    raise exception 'Every value needs a label, even an empty one'
      using errcode = '22023', hint = 'dictionary_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_code_lists) as l (list)
    cross join lateral jsonb_array_elements(l.list -> 'pairs') as p (pair)
    where coalesce(btrim(p.pair ->> 'code'), '') = ''
  ) then
    raise exception 'Every value needs a code'
      using errcode = '23514', hint = 'code_pair_incomplete';
  end if;
```

The rest of the function (the codes and labels uniqueness checks) stays as it is. Run `pnpm exec prettier --write supabase/schemas/50.rpc_data_dictionaries__save.sql`.

- [ ] **Step 5: Generate the migration.** Run `pnpm db:reset`, and immediately after it `pnpm db:new-migration data_dictionaries_blank_labels`. (`db:new-migration` stops, diffs, and resets this branch's own stack; that is why the switch must be confirmed first.)

- [ ] **Step 6: Read the migration before trusting it.** `supabase/migrations/<timestamp>_data_dictionaries_blank_labels.sql` must contain one `CREATE OR REPLACE FUNCTION public.data_dictionaries__check_pairs` with the full new body (an absolute definition, not a delta), plus the `revoke` lines the privileges reconciler appends for it. If it drops, alters, or recreates anything else, the diff ran against a database holding objects this branch does not define: run `pnpm db:reset`, regenerate, and compare. Never commit a migration that drops something this task did not touch.

- [ ] **Step 7: Desktop twin.** `pnpm desktop:sqlite:gen-migrations`. Expected: a new `apps/desktop/migrations/<timestamp>_data_dictionaries_blank_labels.gen.sql` whose header reports `Schema-shape statements emitted: 0` (a function change has no SQLite equivalent).

- [ ] **Step 8: Types.** `pnpm db:gen-types`, then `git diff --stat shared/types/database.types.ts`. Expected: no change, since the RPC's signature is the same. Commit it only if it changed.

- [ ] **Step 9:** `pnpm test:db`. Expected: PASS. Then `ava supabase migrations validate`. Expected: no ordering conflicts.

- [ ] **Step 10: Commit**

```bash
git add supabase/schemas/50.rpc_data_dictionaries__save.sql supabase/tests/database/data_dictionaries/rpc_data_dictionaries__save.test.sql supabase/migrations/*_data_dictionaries_blank_labels.sql apps/desktop/migrations/*_data_dictionaries_blank_labels.gen.sql
git commit -m "feat(data-dictionaries): let a dictionary value be saved without a label

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Never stage `supabase/config.toml`.

---

### Task 2: Blank labels in the dictionary model and editor

The model and the Dictionary view follow the schema: a blank label is a warning, not an issue. `findDraftIssues` no longer reports it, so the save bar still saves. A new `findDraftWarnings` lists every value with a code and no label; the code list editor marks those rows "Needs a label" in a dimmed line, and the entries table says how many of an entry's values still need one. The stored-pairs Zod schema already accepts an empty label (`label: z.string()`), so the parser only gains a test.

**Files:**
- Modify: `shared/models/dataDictionaries/DataDictionary/DataDictionary.types.ts`
- Modify: `shared/models/dataDictionaries/DataDictionary/DataDictionary.ts`
- Modify: `shared/models/dataDictionaries/DataDictionary/DataDictionaryModule/DataDictionaryModule.ts`
- Test: `shared/models/dataDictionaries/DataDictionary/DataDictionaryModule/DataDictionaryModule.test.ts`
- Test: `shared/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeListParsers.test.ts`
- Modify: `src/views/DataManagerApp/DataDictionaryView/useDictionaryCopy.ts`
- Modify: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairRow.tsx`
- Modify: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.tsx`
- Test: `src/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.test.tsx`
- Modify: `src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab.tsx`
- Modify: `src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTable.tsx`
- Test: `src/views/DataManagerApp/DataDictionaryView/DictionaryEntriesTab/DictionaryEntriesTab.test.tsx`

- [ ] **Step 1: Write the failing model tests.** Add to `DataDictionaryModule.test.ts`, after the `findDraftIssues` describe block:

```ts
describe("DataDictionary.findDraftWarnings", () => {
  it("lets a value with a code and no label save, and marks it as needing one", () => {
    const list = _listDraft({
      pairs: [_pair("1", "Male"), _pair("2", " "), _pair("9", "")],
    });
    const draft = { codeLists: [list], entries: [] };
    expect(DataDictionary.findDraftIssues(draft)).toEqual([]);
    expect(DataDictionary.findDraftWarnings(draft)).toEqual([
      { type: "label_missing", codeListId: list.id, pairIndex: 1 },
      { type: "label_missing", codeListId: list.id, pairIndex: 2 },
    ]);
  });

  it("still refuses a value with no code, and does not also warn about it", () => {
    const list = _listDraft({ pairs: [_pair("", "")] });
    const draft = { codeLists: [list], entries: [] };
    expect(DataDictionary.findDraftIssues(draft)).toEqual([
      { type: "code_pair_incomplete", codeListId: list.id, pairIndex: 0 },
    ]);
    expect(DataDictionary.findDraftWarnings(draft)).toEqual([]);
  });
});
```

Add to `DataDictionaryCodeListParsers.test.ts`, inside its describe block:

```ts
  it("reads a value whose label is still blank", () => {
    const codeList = DataDictionaryCodeListParsers.fromDBReadToModelRead({
      ...DB_ROW,
      pairs: [{ code: "9", label: "", accepted_spellings: [], is_missing: false }],
    });
    expect(codeList.pairs).toEqual([
      { code: "9", label: "", acceptedSpellings: [], isMissing: false },
    ]);
  });
```

- [ ] **Step 2:** `pnpm vitest run shared/models/dataDictionaries`. Expected: FAIL (`findDraftWarnings` is not a function; the blank label is still an issue). The parser test already passes.

- [ ] **Step 3: Change the model.** In `DataDictionary.types.ts`, after `DataDictionaryDraftIssue`, add:

```ts
/**
 * Something in a draft worth finishing that does not stop it from saving.
 * The Dictionary view marks it beside the value, and the create flow counts
 * them on its Save step.
 * - `label_missing`: a value with a code and no label yet.
 */
export type DataDictionaryDraftWarning = {
  type: "label_missing";
  codeListId: DataDictionaryCodeList.Id;
  pairIndex: number;
};
```

In `DataDictionary.ts`, import `DataDictionaryDraftWarning` with the other types and add `export type DraftWarning = DataDictionaryDraftWarning;` to the namespace, after `DraftIssue`.

In `DataDictionaryModule.ts`, import `DataDictionaryDraftWarning` with the other draft types. In `_findPairIssues`, replace

```ts
      if (normalizeKey(pair.code) === "" || normalizeKey(pair.label) === "") {
        return [{ type: "code_pair_incomplete", ...at }];
      }
```

with

```ts
      // A blank label is not an issue: `findDraftWarnings` marks it instead.
      if (normalizeKey(pair.code) === "") {
        return [{ type: "code_pair_incomplete", ...at }];
      }
```

Add after `findDraftIssues`:

```ts
/**
 * Every value that has a code but no label yet, in display order. A draft
 * with these still saves; the editor marks each one as needing a label.
 */
function findDraftWarnings(
  draft: DataDictionaryDraft,
): DataDictionaryDraftWarning[] {
  return draft.codeLists.flatMap((codeList) => {
    return codeList.pairs.flatMap(
      (pair, pairIndex): DataDictionaryDraftWarning[] => {
        const isUnlabeled =
          normalizeKey(pair.code) !== "" && normalizeKey(pair.label) === "";
        return isUnlabeled
          ? [{ type: "label_missing", codeListId: codeList.id, pairIndex }]
          : [];
      },
    );
  });
}
```

and add `findDraftWarnings,` to `DataDictionaryModule` after `findDraftIssues,`.

- [ ] **Step 4:** Run the model tests again. Expected: PASS, including slice 1's existing `findDraftIssues` tests (their incomplete pair has a blank code).

- [ ] **Step 5: Write the failing editor tests.** Add to `CodeListEditor.test.tsx`:

```tsx
  it("marks a value without a label as needing one, without blocking it", () => {
    const draft = _draft([
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "9", label: "", acceptedSpellings: [], isMissing: false },
    ]);
    render(
      <CodeListEditor
        draft={draft}
        codeListId={LIST_ID}
        issues={[]}
        canEdit
        onDraftChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Needs a label/)).toBeInTheDocument();
    expect(screen.getByLabelText("Label 2")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
```

Add to `DictionaryEntriesTab.test.tsx`, after `DRAFT`:

```tsx
const UNLABELED_DRAFT: DataDictionary.Draft = {
  ...DRAFT,
  codeLists: DRAFT.codeLists.map((list) => {
    return {
      ...list,
      pairs: [
        ...list.pairs,
        { code: "9", label: "", acceptedSpellings: [], isMissing: true },
      ],
    };
  }),
};
```

and inside the describe block:

```tsx
  it("says how many of an entry's values still need a label", () => {
    _renderTab({ draft: UNLABELED_DRAFT });
    expect(screen.getByText("1 value needs a label")).toBeInTheDocument();
  });
```

- [ ] **Step 6:** `pnpm vitest run src/views/DataManagerApp/DataDictionaryView`. Expected: the two new tests FAIL.

- [ ] **Step 7: Change the copy.** In `useDictionaryCopy.ts`, change the `code_pair_incomplete` line to `code_pair_incomplete: t\`Every value needs a code.\`,`, add to `DictionaryCopy`:

```ts
  /** What one draft warning means, as shown beside the value it is about. */
  describeWarning: (warning: DataDictionary.DraftWarning) => string;
```

and to the returned object, after `describeIssue`:

```ts
      describeWarning: () => {
        return t`Needs a label. You can save without one and add it later.`;
      },
```

- [ ] **Step 8: Show warnings on code list rows.** In `CodePairRow.tsx`, replace the `CodePairIssue` type with:

```ts
/** A pair's validation problem or warning, with the copy that explains it. */
export type CodePairIssue = {
  type: DataDictionary.DraftIssue["type"] | DataDictionary.DraftWarning["type"];
  message: string;
  /** An error blocks saving. A warning, such as a missing label, does not. */
  severity: "error" | "warning";
};
```

Remove `pair` from `_isIssueOnInput`'s options type (it no longer reads the pair) and replace its body with:

```ts
  const { issue, input } = options;
  if (issue?.severity !== "error") {
    return false;
  }
  if (input === "code") {
    return issue.type === "code_not_unique" || issue.type === "code_pair_incomplete";
  }
  return issue.type === "label_not_unique";
```

and replace the issue line at the end of `CodePairRowBody` with:

```tsx
      {issue ? (
        // An error is also its input's accessible description, so its line
        // is hidden from assistive tech. A warning is only said here.
        <Text
          size="xs"
          aria-hidden={issue.severity === "error"}
          c={issue.severity === "error" ? "danger" : "dimmed"}
          className={css.codeListEditorRowIssue}
        >
          {issue.message}
        </Text>
      ) : null}
```

In `CodeListEditor.tsx`, replace `_makePairIssueGetter` with:

```ts
/** Makes a lookup of the issue, or else the warning, on one pair of a list. */
function _makePairIssueGetter(
  options: Readonly<{
    issues: readonly DataDictionary.DraftIssue[];
    warnings: readonly DataDictionary.DraftWarning[];
    listId: DataDictionaryCodeList.Id;
    describeIssue: (issue: DataDictionary.DraftIssue) => string;
    describeWarning: (warning: DataDictionary.DraftWarning) => string;
  }>,
): (pairIndex: number) => CodePairIssue | undefined {
  const { issues, warnings, listId } = options;
  return (pairIndex) => {
    const issue = issues.find((current) => {
      return (
        "pairIndex" in current &&
        current.codeListId === listId &&
        current.pairIndex === pairIndex
      );
    });
    if (issue) {
      return { type: issue.type, message: options.describeIssue(issue), severity: "error" };
    }
    const warning = warnings.find((current) => {
      return current.codeListId === listId && current.pairIndex === pairIndex;
    });
    return warning
      ? { type: warning.type, message: options.describeWarning(warning), severity: "warning" }
      : undefined;
  };
}
```

and its call in `CodeListEditor` with:

```tsx
        pairIssue={_makePairIssueGetter({
          issues,
          warnings: DataDictionary.findDraftWarnings(draft),
          listId: list.id,
          describeIssue: copy.describeIssue,
          describeWarning: copy.describeWarning,
        })}
```

- [ ] **Step 9: Count unlabeled values on the entries table.** In `DictionaryEntriesTab.tsx`, add above `_makeListNames`:

```ts
/** How many values of each code list still need a label. */
function _countUnlabeledValues(
  draft: DataDictionary.Draft,
): Map<DataDictionaryCodeList.Id, number> {
  const counts = new Map<DataDictionaryCodeList.Id, number>();
  DataDictionary.findDraftWarnings(draft).forEach((warning) => {
    counts.set(warning.codeListId, (counts.get(warning.codeListId) ?? 0) + 1);
  });
  return counts;
}
```

add `unlabeledCounts: Map<DataDictionaryCodeList.Id, number>;` to `EntriesTabState`, `unlabeledCounts: _countUnlabeledValues(draft),` to what `useEntriesTabState` returns, `unlabeledCounts,` to the destructuring in `DictionaryEntriesTab`, and `unlabeledCounts={unlabeledCounts}` to `<DictionaryEntriesTable>`.

In `DictionaryEntriesTable.tsx`: import `Plural` beside `Trans`; add to both `Props` and `RowProps`:

```ts
  /** Values that still need a label, by code list. */
  unlabeledCounts: ReadonlyMap<DataDictionaryCodeList.Id, number>;
```

destructure `unlabeledCounts` in both `DictionaryEntriesTable` and `DictionaryEntryRow`, pass `unlabeledCounts={unlabeledCounts}` from the table to each `DictionaryEntryRow`; in `DictionaryEntryRow`, after `const primaryId = ...`, add

```ts
  const unlabeledCount = entry.codings.reduce((sum, coding) => {
    return sum + (unlabeledCounts.get(coding.codeListId) ?? 0);
  }, 0);
```

and in the "Kind and values" cell, after the list name's `<Text>`:

```tsx
        {unlabeledCount > 0 ? (
          <Text size="xs" c="dimmed">
            <Plural
              value={unlabeledCount}
              one="# value needs a label"
              other="# values need a label"
            />
          </Text>
        ) : null}
```

- [ ] **Step 10:** `pnpm vitest run src/views/DataManagerApp/DataDictionaryView shared/models/dataDictionaries`. Expected: PASS. `pnpm exec tsc -b --force --noEmit`. Expected: no errors.

- [ ] **Step 11: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore shared/models/dataDictionaries/DataDictionary shared/models/dataDictionaries/DataDictionaryCodeList src/views/DataManagerApp/DataDictionaryView
pnpm exec eslint --fix shared/models/dataDictionaries/DataDictionary shared/models/dataDictionaries/DataDictionaryCodeList src/views/DataManagerApp/DataDictionaryView
git add shared/models/dataDictionaries/DataDictionary shared/models/dataDictionaries/DataDictionaryCodeList src/views/DataManagerApp/DataDictionaryView
git commit -m "feat(data-dictionaries): mark values that still need a label instead of refusing them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Column profiles: tokens, kinds, and the match scorer

Everything here is pure and runs in the browser, the edge function, and Node. It is spec section 8.1 (classification) and 8.2 (scoring), with the refinements listed at the end of this file.

**Files:**
- Create: `shared/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts`
- Create: `shared/models/dataDictionaries/ColumnProfile/ColumnProfile.ts`
- Create: `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/columnNameHelpers.ts`
- Create: `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts`
- Test: `shared/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.test.ts`

- [ ] **Step 1: Write the types**

`ColumnProfile.types.ts`:

```ts
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

/** One distinct value a column holds, and how many rows hold it. */
export type ColumnProfileValue = {
  value: string;
  rowCount: number;
};

/**
 * What profiling learned about one dataset column, on the user's device.
 * Learning a dictionary from datasets reads profiles to guess each column's
 * kind and to find columns in other datasets that mean the same thing.
 */
export type ColumnProfileT = {
  datasetId: Dataset.Id;
  datasetName: string;
  columnName: string;
  dataType: AvaDataType.T;
  /** Rows in the dataset. */
  rowCount: number;
  /** Rows where this column has a value. */
  nonNullCount: number;
  /** Different values: exact when `values` is set, approximate otherwise. */
  distinctCount: number;
  /**
   * Every distinct value with its row count, most common first, when the
   * column has 50 or fewer. Undefined for longer columns and for dates.
   */
  values: ColumnProfileValue[] | undefined;
  /** Share of a text column's values that read as dates. */
  dateShare: number | undefined;
  /** Lowest and highest value of a number column. */
  numberRange: { min: number; max: number } | undefined;
};

/** Which band a match score falls in: certain, worth asking, or neither. */
export type ColumnMatchBand = "match" | "suggestion" | "none";

/**
 * How well two columns match, from 0 to 1, and the parts it is built from.
 * Learning a dictionary reads it to decide which columns become one entry.
 */
export type ColumnMatchScore = {
  score: number;
  nameScore: number;
  /** Undefined when neither listed values nor number ranges compare. */
  valueScore: number | undefined;
  typeScore: number;
  band: ColumnMatchBand;
};
```

`ColumnProfile.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ColumnMatchBand,
  ColumnMatchScore,
  ColumnProfileT,
  ColumnProfileValue,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts";

export { ColumnProfileModule as ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfileModule/ColumnProfileModule.ts";

/** Public namespace for column profiles and the scores between them. */
export namespace ColumnProfile {
  export type T = ColumnProfileT;
  export type Value = ColumnProfileValue;
  export type MatchScore = ColumnMatchScore;
  export type MatchBand = ColumnMatchBand;
}
```

- [ ] **Step 2: Write the failing tests**

`ColumnProfileModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _profile(overrides: Partial<ColumnProfile.T> = {}): ColumnProfile.T {
  return {
    datasetId: BRONX_ID,
    datasetName: "Bronx line list",
    columnName: "GENDER",
    dataType: "bigint",
    rowCount: 500,
    nonNullCount: 500,
    distinctCount: 3,
    values: [
      { value: "1", rowCount: 260 },
      { value: "2", rowCount: 230 },
      { value: "9", rowCount: 10 },
    ],
    dateShare: undefined,
    numberRange: { min: 1, max: 9 },
    ...overrides,
  };
}

describe("ColumnProfile.getTokensFromColumnName", () => {
  it.each([
    ["onset_dt", ["onset", "date"]],
    ["hosp_yn", ["hospitalized", "yes", "no"]],
    ["CaseNo", ["case", "no"]],
    ["ZIPCode", ["zip"]],
    ["postal_code", ["zip"]],
    ["GENDER", ["sex"]],
    ["dob", ["birth", "date"]],
  ])("reads %s as %j", (columnName, tokens) => {
    expect(ColumnProfile.getTokensFromColumnName(columnName)).toEqual(tokens);
  });
});

describe("ColumnProfile.getEntryNameFromColumnName", () => {
  it.each([
    ["GENDER", "gender"],
    ["CaseNo", "case_no"],
    ["Onset Date", "onset_date"],
    ["ZIPCode", "zip_code"],
    ["hosp_yn", "hosp_yn"],
  ])("names an entry for %s %s", (columnName, entryName) => {
    expect(ColumnProfile.getEntryNameFromColumnName(columnName)).toBe(entryName);
  });
});

describe("ColumnProfile.getEntryKind", () => {
  it("calls a column whose values are nearly all different an identifier", () => {
    const profile = _profile({
      columnName: "case_id",
      dataType: "varchar",
      distinctCount: 500,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("identifier");
  });

  it("calls a unique-per-row timestamp a date, not an identifier", () => {
    const profile = _profile({
      columnName: "reported_at",
      dataType: "timestamp",
      distinctCount: 500,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("date");
  });

  it("calls a mostly unique column named like a number an identifier", () => {
    const profile = _profile({
      columnName: "CaseNo",
      distinctCount: 450,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("identifier");
  });

  it("keeps a coded column categorical in a dataset of three rows", () => {
    const profile = _profile({ rowCount: 3, nonNullCount: 3 });
    expect(ColumnProfile.getEntryKind(profile)).toBe("categorical");
  });

  it("calls a text column whose values parse as dates a date", () => {
    const profile = _profile({
      columnName: "onset",
      dataType: "varchar",
      distinctCount: 120,
      values: undefined,
      dateShare: 0.96,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("date");
  });

  it("calls consecutive integer codes in a scale-named column ordered", () => {
    const profile = _profile({
      columnName: "ses_cat",
      distinctCount: 4,
      values: ["1", "2", "3", "4"].map((value) => {
        return { value, rowCount: 100 };
      }),
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("ordered");
  });

  it("calls words from a known scale ordered, ignoring a missing value", () => {
    const profile = _profile({
      columnName: "severity",
      dataType: "varchar",
      distinctCount: 4,
      values: ["Mild", "Moderate", "Severe", "Unknown"].map((value) => {
        return { value, rowCount: 100 };
      }),
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("ordered");
  });

  it("calls a short coded column categorical", () => {
    expect(ColumnProfile.getEntryKind(_profile())).toBe("categorical");
  });

  it("calls a many-valued number column a number", () => {
    const profile = _profile({
      columnName: "age_mo",
      distinctCount: 90,
      values: undefined,
      numberRange: { min: 0, max: 94 },
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("number");
  });

  it("calls a many-valued text column text", () => {
    const profile = _profile({
      columnName: "notes",
      dataType: "varchar",
      distinctCount: 300,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("text");
  });
});

describe("ColumnProfile.getMatchScore", () => {
  it("scores the same column in two datasets as a match", () => {
    const match = ColumnProfile.getMatchScore(
      _profile(),
      _profile({ datasetId: ERIE_ID }),
    );
    expect(match.score).toBe(1);
    expect(match.band).toBe("match");
  });

  it("matches zip_code and ZIP by name when neither lists its values", () => {
    const zipCode = _profile({
      columnName: "zip_code",
      dataType: "varchar",
      values: undefined,
      numberRange: undefined,
    });
    const zip = { ...zipCode, datasetId: ERIE_ID, columnName: "ZIP" };
    expect(ColumnProfile.getMatchScore(zipCode, zip).band).toBe("match");
  });

  it("gives GENDER and sex a full name score but no value score", () => {
    const sex = _profile({
      datasetId: ERIE_ID,
      columnName: "sex",
      dataType: "varchar",
      values: ["M", "F", "U"].map((value) => {
        return { value, rowCount: 120 };
      }),
      numberRange: undefined,
    });
    const match = ColumnProfile.getMatchScore(_profile(), sex);
    expect(match.nameScore).toBe(1);
    expect(match.valueScore).toBe(0);
    expect(match.band).toBe("none");
  });

  it("only suggests two columns that share values and half their name", () => {
    const match = ColumnProfile.getMatchScore(
      _profile({ columnName: "symptom_fever" }),
      _profile({ datasetId: ERIE_ID, columnName: "symptom_rash" }),
    );
    expect(match.nameScore).toBe(0.5);
    expect(match.band).toBe("suggestion");
  });

  it("treats two long words a letter apart as the same word", () => {
    const match = ColumnProfile.getMatchScore(
      _profile({ columnName: "hospitalised" }),
      _profile({ datasetId: ERIE_ID, columnName: "hospitalized" }),
    );
    expect(match.nameScore).toBe(1);
  });

  it("never treats short words a letter apart as the same word", () => {
    const match = ColumnProfile.getMatchScore(
      _profile({ columnName: "ses" }),
      _profile({ datasetId: ERIE_ID, columnName: "sex" }),
    );
    expect(match.nameScore).toBe(0);
  });
});

describe("ColumnProfile.sortValuesInScaleOrder", () => {
  it("puts known scale words in scale order and missing values last", () => {
    const sorted = ColumnProfile.sortValuesInScaleOrder(
      ["High", "Unknown", "Low", "Medium"].map((value) => {
        return { value, rowCount: 10 };
      }),
    );
    expect(
      sorted.map((item) => {
        return item.value;
      }),
    ).toEqual(["Low", "Medium", "High", "Unknown"]);
  });

  it("puts integer codes in numeric order", () => {
    const sorted = ColumnProfile.sortValuesInScaleOrder(
      ["10", "2", "1"].map((value) => {
        return { value, rowCount: 10 };
      }),
    );
    expect(
      sorted.map((item) => {
        return item.value;
      }),
    ).toEqual(["1", "2", "10"]);
  });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `pnpm vitest run shared/models/dataDictionaries/ColumnProfile`
Expected: FAIL, `Cannot find module .../ColumnProfileModule.ts`.

- [ ] **Step 4: Write the name helpers**

`columnNameHelpers.ts`:

```ts
/**
 * Abbreviations column names use, expanded before two names are compared,
 * so `onset_dt` and `onset_date` read the same.
 */
const ABBREVIATIONS: Readonly<Record<string, string>> = {
  dt: "date",
  cd: "code",
  yn: "yes no",
  num: "number",
  hosp: "hospitalized",
  vax: "vaccination",
  dob: "date of birth",
};

/**
 * Phrases that name the same thing, each rewritten to one spelling, so
 * `zip_code` matches `ZIP` and `GENDER` matches `sex`. Longer phrases come
 * first, so a phrase is rewritten before any shorter phrase inside it.
 */
const SYNONYM_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ["date of birth", "birth date"],
  ["postal code", "zip"],
  ["post code", "zip"],
  ["zip code", "zip"],
  ["birthdate", "birth date"],
  ["postcode", "zip"],
  ["zipcode", "zip"],
  ["gender", "sex"],
];

/**
 * Words shorter than this are the same word only when identical.
 * Jaro-Winkler rates short words such as `sex` and `ses` as near-identical,
 * which would merge unrelated columns.
 */
const MIN_FUZZY_WORD_LENGTH = 4;

/** Two longer words at least this similar count as one word. */
const FUZZY_WORD_SIMILARITY = 0.9;

/**
 * Splits a column name into lowercase words at camelCase humps, spaces, and
 * punctuation: `CaseNo` gives `case`, `no`, and `hosp_yn` gives `hosp`,
 * `yn`. Digits stay attached to their word.
 */
export function getWordsFromColumnName(columnName: string): string[] {
  return columnName
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => {
      return word !== "";
    });
}

/**
 * The words two column names are compared by: abbreviations expanded and
 * synonyms rewritten to one spelling. `onset_dt` gives `onset`, `date`;
 * both `GENDER` and `sex` give `sex`.
 */
export function getTokensFromColumnName(columnName: string): string[] {
  const expanded = getWordsFromColumnName(columnName).flatMap((word) => {
    return (ABBREVIATIONS[word] ?? word).split(" ");
  });
  const phrase = SYNONYM_PHRASES.reduce(
    (text, [fromPhrase, toPhrase]) => {
      return text.split(` ${fromPhrase} `).join(` ${toPhrase} `);
    },
    ` ${expanded.join(" ")} `,
  );
  return phrase.split(" ").filter((token) => {
    return token !== "";
  });
}

/**
 * A column name as a dictionary entry name: its words in lowercase, joined
 * by underscores, so `GENDER` gives `gender` and `CaseNo` gives `case_no`.
 * A name with no letters or digits is only trimmed.
 */
export function getEntryNameFromColumnName(columnName: string): string {
  const words = getWordsFromColumnName(columnName);
  return words.length > 0 ? words.join("_") : columnName.trim();
}

/** Jaro-Winkler similarity of two words, from 0 to 1. */
function _getJaroWinkler(wordA: string, wordB: string): number {
  if (wordA === wordB) {
    return 1;
  }
  const window = Math.max(
    0,
    Math.floor(Math.max(wordA.length, wordB.length) / 2) - 1,
  );
  const isMatchedB = wordB.split("").map(() => {
    return false;
  });
  const matchedA = wordA.split("").flatMap((char, indexA) => {
    const start = Math.max(0, indexA - window);
    const end = Math.min(wordB.length, indexA + window + 1);
    const offset = wordB
      .slice(start, end)
      .split("")
      .findIndex((charB, index) => {
        return charB === char && !isMatchedB[start + index];
      });
    if (offset < 0) {
      return [];
    }
    isMatchedB[start + offset] = true;
    return [char];
  });
  if (matchedA.length === 0) {
    return 0;
  }
  const matchedB = wordB.split("").filter((_char, index) => {
    return isMatchedB[index];
  });
  const halfTranspositions = matchedA.filter((char, index) => {
    return char !== matchedB[index];
  }).length;
  const count = matchedA.length;
  const jaro =
    (count / wordA.length +
      count / wordB.length +
      (count - halfTranspositions / 2) / count) /
    3;
  const prefixEnd = wordA
    .slice(0, 4)
    .split("")
    .findIndex((char, index) => {
      return char !== wordB[index];
    });
  const prefix =
    prefixEnd < 0 ? Math.min(4, wordA.length, wordB.length) : prefixEnd;
  return jaro + prefix * 0.1 * (1 - jaro);
}

function _isSameWord(wordA: string, wordB: string): boolean {
  if (wordA === wordB) {
    return true;
  }
  return (
    Math.min(wordA.length, wordB.length) >= MIN_FUZZY_WORD_LENGTH &&
    _getJaroWinkler(wordA, wordB) >= FUZZY_WORD_SIMILARITY
  );
}

/**
 * How alike two column names are, from 0 to 1: the share of each name's
 * tokens the other name also has, where two long words a letter or two
 * apart count as one. `zip_code` and `ZIP` score 1; `case_id` and `CaseNo`
 * score 0.5.
 */
export function getNameScore(nameA: string, nameB: string): number {
  const tokensA = [...new Set(getTokensFromColumnName(nameA))];
  const tokensB = [...new Set(getTokensFromColumnName(nameB))];
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }
  const matchedA = tokensA.filter((tokenA) => {
    return tokensB.some((tokenB) => {
      return _isSameWord(tokenA, tokenB);
    });
  }).length;
  const matchedB = tokensB.filter((tokenB) => {
    return tokensA.some((tokenA) => {
      return _isSameWord(tokenA, tokenB);
    });
  }).length;
  return (matchedA + matchedB) / (tokensA.length + tokensB.length);
}
```

`_getJaroWinkler` is 44 lines. If a formatter pushes it over 45, move the prefix computation into `_getCommonPrefixLength(wordA, wordB)`.

- [ ] **Step 5: Write the module**

`ColumnProfileModule.ts`:

```ts
import {
  getEntryNameFromColumnName,
  getNameScore,
  getTokensFromColumnName,
  getWordsFromColumnName,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfileModule/columnNameHelpers.ts";
import type {
  ColumnMatchScore,
  ColumnProfileT,
  ColumnProfileValue,
} from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.types.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

const MAX_LISTED_VALUES = 50;
const MAX_CATEGORICAL_VALUES = 20;
const MAX_SCALE_LENGTH = 10;
const MATCH_SCORE = 0.9;
const SUGGESTION_SCORE = 0.6;

/** A column whose last word is one of these and is mostly unique is an id. */
const IDENTIFIER_WORDS = new Set(["id", "no", "num", "number", "nbr", "key"]);

/** Words that make a short run of integer codes read as a scale. */
const SCALE_TOKENS = new Set([
  "level",
  "grade",
  "ses",
  "score",
  "quartile",
  "stage",
  "cat",
]);

/** Values that stand for a missing answer rather than a level or group. */
const MISSING_WORDS = new Set([
  "unknown",
  "unk",
  "missing",
  "na",
  "n/a",
  "not stated",
  "not known",
  "refused",
  "declined",
  "don't know",
  "dont know",
]);

/** Ordered vocabularies, lowest level first. */
const ORDERED_VOCABULARIES: ReadonlyArray<readonly string[]> = [
  ["none", "low", "medium", "high"],
  ["low", "moderate", "high"],
  ["none", "partial", "full"],
  ["never", "rarely", "sometimes", "often", "always"],
  ["mild", "moderate", "severe"],
  ["poor", "fair", "good", "very good", "excellent"],
  ["strongly disagree", "disagree", "neutral", "agree", "strongly agree"],
];

/** Types in one family compare as compatible. */
const TYPE_FAMILIES: Record<AvaDataType.T, string> = {
  bigint: "number",
  double: "number",
  date: "date",
  timestamp: "date",
  time: "time",
  boolean: "boolean",
  varchar: "text",
};

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function isMissingValue(value: string): boolean {
  return MISSING_WORDS.has(normalizeValue(value));
}

function _getDistinctShare(profile: Readonly<ColumnProfileT>): number {
  return profile.nonNullCount === 0
    ? 0
    : profile.distinctCount / profile.nonNullCount;
}

function _isIdentifier(profile: Readonly<ColumnProfileT>): boolean {
  const share = _getDistinctShare(profile);
  const lastWord = getWordsFromColumnName(profile.columnName).at(-1) ?? "";
  return (
    (share > 0.95 && profile.distinctCount > MAX_CATEGORICAL_VALUES) ||
    (IDENTIFIER_WORDS.has(lastWord) && share > 0.8 && profile.distinctCount > 2)
  );
}

function _isDate(profile: Readonly<ColumnProfileT>): boolean {
  return (
    profile.dataType === "date" ||
    profile.dataType === "timestamp" ||
    (profile.dateShare ?? 0) >= 0.9
  );
}

function _isCategorical(profile: Readonly<ColumnProfileT>): boolean {
  return (
    profile.values !== undefined &&
    profile.distinctCount > 0 &&
    profile.distinctCount <= MAX_CATEGORICAL_VALUES &&
    (_getDistinctShare(profile) <= 0.2 || profile.rowCount < 100)
  );
}

function _isIntegerScale(profile: Readonly<ColumnProfileT>): boolean {
  const codes = (profile.values ?? []).map((item) => {
    return item.value.trim();
  });
  const isEveryCodeAnInteger = codes.every((code) => {
    return /^\d+$/.test(code);
  });
  if (codes.length < 2 || codes.length > MAX_SCALE_LENGTH) {
    return false;
  }
  const sorted = codes.map(Number).sort((codeA, codeB) => {
    return codeA - codeB;
  });
  const isOneToK = sorted.every((code, index) => {
    return code === index + 1;
  });
  return (
    isEveryCodeAnInteger &&
    isOneToK &&
    getTokensFromColumnName(profile.columnName).some((token) => {
      return SCALE_TOKENS.has(token);
    })
  );
}

function _findVocabulary(
  values: readonly ColumnProfileValue[],
): readonly string[] | undefined {
  const words = values
    .map((item) => {
      return normalizeValue(item.value);
    })
    .filter((word) => {
      return !MISSING_WORDS.has(word);
    });
  if (words.length < 2) {
    return undefined;
  }
  return ORDERED_VOCABULARIES.find((vocabulary) => {
    return words.every((word) => {
      return vocabulary.includes(word);
    });
  });
}

function getEntryKind(
  profile: Readonly<ColumnProfileT>,
): DataDictionaryEntry.Kind {
  // Dates come first: a timestamp is unique per row, but it is a date.
  if (_isDate(profile)) {
    return "date";
  }
  if (_isIdentifier(profile)) {
    return "identifier";
  }
  if (_isCategorical(profile)) {
    const isScale =
      _isIntegerScale(profile) ||
      _findVocabulary(profile.values ?? []) !== undefined;
    return isScale ? "ordered" : "categorical";
  }
  if (profile.dataType === "bigint" || profile.dataType === "double") {
    return "number";
  }
  return "text";
}

function _getListedShare(
  values: readonly ColumnProfileValue[],
  otherKeys: ReadonlySet<string>,
): number {
  const total = values.reduce((sum, item) => {
    return sum + item.rowCount;
  }, 0);
  const shared = values.reduce((sum, item) => {
    return otherKeys.has(normalizeValue(item.value))
      ? sum + item.rowCount
      : sum;
  }, 0);
  return total === 0 ? 0 : shared / total;
}

function _getRangeOverlap(
  rangeA: Readonly<{ min: number; max: number }>,
  rangeB: Readonly<{ min: number; max: number }>,
): number {
  const overlap =
    Math.min(rangeA.max, rangeB.max) - Math.max(rangeA.min, rangeB.min);
  const span =
    Math.max(rangeA.max, rangeB.max) - Math.min(rangeA.min, rangeB.min);
  if (overlap < 0) {
    return 0;
  }
  return span === 0 ? 1 : overlap / span;
}

function _getValueScore(
  profileA: Readonly<ColumnProfileT>,
  profileB: Readonly<ColumnProfileT>,
): number | undefined {
  if (profileA.values && profileB.values) {
    const keysOf = (values: readonly ColumnProfileValue[]): Set<string> => {
      return new Set(
        values.map((item) => {
          return normalizeValue(item.value);
        }),
      );
    };
    return (
      (_getListedShare(profileA.values, keysOf(profileB.values)) +
        _getListedShare(profileB.values, keysOf(profileA.values))) /
      2
    );
  }
  if (profileA.numberRange && profileB.numberRange) {
    return _getRangeOverlap(profileA.numberRange, profileB.numberRange);
  }
  return undefined;
}

function _getTypeScore(typeA: AvaDataType.T, typeB: AvaDataType.T): number {
  if (TYPE_FAMILIES[typeA] === TYPE_FAMILIES[typeB]) {
    return 1;
  }
  return typeA === "varchar" || typeB === "varchar" ? 0.5 : 0;
}

function getMatchScore(
  profileA: Readonly<ColumnProfileT>,
  profileB: Readonly<ColumnProfileT>,
): ColumnMatchScore {
  const nameScore = getNameScore(profileA.columnName, profileB.columnName);
  const valueScore = _getValueScore(profileA, profileB);
  const typeScore = _getTypeScore(profileA.dataType, profileB.dataType);
  // When values cannot be compared, name and type carry the whole score.
  const parts = [
    { weight: 0.45, score: nameScore },
    { weight: 0.2, score: typeScore },
    ...(valueScore === undefined ? [] : [{ weight: 0.35, score: valueScore }]),
  ];
  const totalWeight = parts.reduce((sum, part) => {
    return sum + part.weight;
  }, 0);
  const score =
    parts.reduce((sum, part) => {
      return sum + part.weight * part.score;
    }, 0) / totalWeight;
  const band =
    score >= MATCH_SCORE
      ? "match"
      : score >= SUGGESTION_SCORE
        ? "suggestion"
        : "none";
  return { score, nameScore, valueScore, typeScore, band };
}

function _getScaleRank(
  value: string,
  vocabulary: readonly string[] | undefined,
): number {
  const key = normalizeValue(value);
  if (MISSING_WORDS.has(key)) {
    return Number.MAX_SAFE_INTEGER;
  }
  if (vocabulary) {
    return vocabulary.indexOf(key);
  }
  const asNumber = Number(key);
  return key !== "" && Number.isFinite(asNumber)
    ? asNumber
    : Number.MAX_SAFE_INTEGER - 1;
}

function sortValuesInScaleOrder(
  values: readonly ColumnProfileValue[],
): ColumnProfileValue[] {
  const vocabulary = _findVocabulary(values);
  return [...values].sort((itemA, itemB) => {
    return (
      _getScaleRank(itemA.value, vocabulary) -
        _getScaleRank(itemB.value, vocabulary) ||
      itemA.value.localeCompare(itemB.value)
    );
  });
}

/**
 * Pure helpers for learning a dictionary from profiled columns: what kind
 * of entry a column looks like, how alike two columns are, and the order a
 * scale's values belong in. Used in the browser while a dictionary is
 * created from datasets, and reusable wherever columns are matched.
 */
export const ColumnProfileModule = {
  /** The most distinct values profiling lists for one column. */
  MAX_LISTED_VALUES,

  /** Scores at or above this are certainly the same column. */
  MATCH_SCORE,

  /** Scores at or above this, below `MATCH_SCORE`, are worth suggesting. */
  SUGGESTION_SCORE,

  /** Trims and lowercases a value, the way codes are compared. */
  normalizeValue,

  /** Whether a value is a word for a missing answer, such as `Unknown`. */
  isMissingValue,

  /** The words a column name is compared by. */
  getTokensFromColumnName,

  /** A column name as an entry name: lowercase words joined by `_`. */
  getEntryNameFromColumnName,

  /**
   * The entry kind a profiled column looks like, with dates checked
   * before identifiers.
   */
  getEntryKind,

  /**
   * How alike two columns are: name 0.45, values 0.35, type 0.2, with the
   * weights rescaled when values cannot be compared.
   */
  getMatchScore,

  /** Values in the order a scale reads, lowest first, missing values last. */
  sortValuesInScaleOrder,
};
```


- [ ] **Step 6: Run the tests to make sure they pass**

Run: `pnpm vitest run shared/models/dataDictionaries/ColumnProfile`
Expected: PASS (30 tests). If `hospitalised`/`hospitalized` fails, print `_getJaroWinkler` for the pair: it must be at least 0.9 (it is about 0.97).

- [ ] **Step 7: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore shared/models/dataDictionaries/ColumnProfile
pnpm exec eslint --fix shared/models/dataDictionaries/ColumnProfile
git add shared/models/dataDictionaries/ColumnProfile
git commit -m "feat(data-dictionaries): classify profiled columns and score matches

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Proposal types and clustering columns into entries

Groups every profiled column, across the picked datasets, into proposed entries (spec section 8.2, "The same scorer clusters columns across datasets in Create").

**Files:**
- Create: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts`
- Create: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeProposalFromColumnProfiles/makeProposalFromColumnProfiles.ts`
- Test: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeProposalFromColumnProfiles/makeProposalFromColumnProfiles.test.ts`

- [ ] **Step 1: Write the types**

`DictionaryProposal.types.ts`:

```ts
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";

/**
 * Why columns were put in one entry by a guess the user can undo with Keep
 * apart:
 * - `similar_name`: the scorer rated the pair a suggestion (0.6 to 0.9).
 * - `other_codes`: the same name with values that do not overlap, such as
 *   GENDER holding 1, 2, 9 and sex holding M, F, U. They become two code
 *   lists on one entry.
 * - `meaning`: the suggestion model said they record the same thing.
 */
export type DictionaryProposalSuggestionReason =
  | "similar_name"
  | "other_codes"
  | "meaning";

/**
 * One entry the new dictionary would have, learned from one or more dataset
 * columns. The create flow's Review step shows and edits these.
 */
export type DictionaryProposalEntry = {
  /** Stable while the flow runs: the first column's dataset id and name. */
  key: string;
  name: string;
  /** Columns that certainly belong to this entry. */
  columns: ColumnProfile.T[];
  /** Columns joined by a guess, split off again by Keep apart. */
  suggestedColumns: ColumnProfile.T[];
  suggestionReason: DictionaryProposalSuggestionReason | undefined;
  kind: DataDictionaryEntry.Kind;
  /** Unchecked entries are left out of the saved dictionary. */
  isIncluded: boolean;
  description: string;
  /** True while `description` is the suggestion model's and unedited. */
  isDescriptionSuggested: boolean;
};

/** A dictionary learned from datasets, before it is saved. */
export type DictionaryProposalT = {
  entries: DictionaryProposalEntry[];
};

/**
 * A code list the new dictionary would have: one set of values, used by one
 * entry or shared by entries with the same values and the same first word.
 */
export type DictionaryProposalCodeList = {
  /** The entry name's first token and the sorted, normalized codes. */
  key: string;
  name: string;
  isOrdered: boolean;
  /** The entries that use it. */
  entryKeys: string[];
  /** The codes in list order, with how many rows hold each. */
  values: ColumnProfile.Value[];
};

/** Every code list, and each coded entry's code lists, primary first. */
export type DictionaryProposalCodings = {
  codeLists: DictionaryProposalCodeList[];
  codeListKeysByEntryKey: Record<string, string[]>;
};

/**
 * The label a value will be saved with, and where it came from:
 * - `data`: the value already reads as a label, such as `Recovered`.
 * - `suggested`: the suggestion model's, not edited since.
 * - `typed`: the user's. A suggestion never replaces it.
 */
export type DictionaryProposalValueLabel = {
  label: string;
  isMissing: boolean;
  source: "data" | "suggested" | "typed";
};

/** One code list's labels, keyed by normalized code, and its accept state. */
export type DictionaryProposalCodeListLabels = {
  values: Record<string, DictionaryProposalValueLabel>;
  /** Set by Accept and next list. */
  isAccepted: boolean;
};

/** Every code list's labels, keyed by code list key. */
export type DictionaryProposalLabels = Record<
  string,
  DictionaryProposalCodeListLabels
>;

/** How far along a code list is: shown as Labeled, Suggested, or To do. */
export type DictionaryProposalCodeListStatus = "labeled" | "suggested" | "to_do";

/**
 * Why an entry's name cannot be saved, matching what the save RPC refuses:
 * - `name_required`: blank once trimmed.
 * - `name_not_unique`: the same as another included entry's name, ignoring
 *   case and surrounding spaces.
 */
export type DictionaryProposalEntryNameIssue = "name_required" | "name_not_unique";

/** One meaning-based match: entry `name` records the same as `sameAs`. */
export type DictionaryProposalMeaningMatch = {
  name: string;
  sameAs: string;
};

/** The suggestion model's labels for one code list, and a description. */
export type DictionaryProposalLabelSuggestions = {
  labels: Array<{ value: string; label: string; isMissing: boolean }>;
  description: string;
};
```

- [ ] **Step 2: Write the failing test**

`makeProposalFromColumnProfiles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { makeProposalFromColumnProfiles } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeProposalFromColumnProfiles/makeProposalFromColumnProfiles.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

type DatasetRef = { datasetId: Dataset.Id; datasetName: string };

const BRONX: DatasetRef = { datasetId: uuid<Dataset.Id>(), datasetName: "Bronx" };
const KINGS: DatasetRef = { datasetId: uuid<Dataset.Id>(), datasetName: "Kings" };
const ERIE: DatasetRef = { datasetId: uuid<Dataset.Id>(), datasetName: "Erie" };

function _coded(
  dataset: DatasetRef,
  columnName: string,
  codes: readonly string[],
  overrides: Partial<ColumnProfile.T> = {},
): ColumnProfile.T {
  return {
    ...dataset,
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value, index) => {
      return { value, rowCount: 100 - index };
    }),
    dateShare: undefined,
    numberRange: undefined,
    ...overrides,
  };
}

const SEX_CODES = ["1", "2", "9"];

describe("makeProposalFromColumnProfiles", () => {
  it("gives each column of one dataset its own entry", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "GENDER", SEX_CODES),
      _coded(BRONX, "hosp_yn", ["Y", "N"]),
    ]);
    expect(
      proposal.entries.map((entry) => {
        return [entry.key, entry.name];
      }),
    ).toEqual([
      [`${BRONX.datasetId}:GENDER`, "gender"],
      [`${BRONX.datasetId}:hosp_yn`, "hosp_yn"],
    ]);
  });

  it("puts a column with the same name in two datasets in one entry", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "GENDER", SEX_CODES),
      _coded(KINGS, "GENDER", SEX_CODES),
    ]);
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.columns).toHaveLength(2);
    expect(proposal.entries[0]?.suggestedColumns).toEqual([]);
  });

  it("joins GENDER and sex with other codes as a guess to review", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "GENDER", SEX_CODES),
      _coded(ERIE, "sex", ["M", "F", "U"]),
    ]);
    const [entry] = proposal.entries;
    expect(proposal.entries).toHaveLength(1);
    expect(entry?.suggestionReason).toBe("other_codes");
    expect(
      entry?.suggestedColumns.map((column) => {
        return column.columnName;
      }),
    ).toEqual(["sex"]);
  });

  it("joins zip_code and ZIP, whose values are not listed", () => {
    const longColumn = { values: undefined, distinctCount: 180 };
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "zip_code", [], longColumn),
      _coded(ERIE, "ZIP", [], longColumn),
    ]);
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.columns).toHaveLength(2);
  });

  it("joins columns with similar names and the same values as a guess", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "symptom_fever", SEX_CODES),
      _coded(ERIE, "symptom_rash", SEX_CODES),
    ]);
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.suggestionReason).toBe("similar_name");
  });

  it("never joins two columns of one dataset", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "symptom_fever", SEX_CODES),
      _coded(BRONX, "symptom_rash", SEX_CODES),
    ]);
    expect(proposal.entries).toHaveLength(2);
  });

  it("names an entry after its most common column name, in lowercase words", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(ERIE, "GENDER", SEX_CODES),
      _coded(BRONX, "sex", SEX_CODES),
      _coded(KINGS, "Sex", SEX_CODES),
    ]);
    expect(proposal.entries[0]?.name).toBe("sex");
  });

  it("splits camelCase into words joined by underscores", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "CaseNo", [], { values: undefined, distinctCount: 300 }),
    ]);
    expect(proposal.entries[0]?.name).toBe("case_no");
  });

  it("gives two entries that would share a name different names", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "Gender", SEX_CODES),
      _coded(BRONX, "gender", ["M", "F"]),
    ]);
    expect(
      proposal.entries.map((entry) => {
        return entry.name;
      }),
    ).toEqual(["gender", "gender_2"]);
  });

  it("avoids names that are already taken", () => {
    const proposal = makeProposalFromColumnProfiles(
      [_coded(ERIE, "sex", ["M", "F", "U"])],
      { takenNames: ["Sex"] },
    );
    expect(proposal.entries[0]?.name).toBe("sex_2");
  });

  it("gives an entry the kind its columns look like", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "ses_cat", ["1", "2", "3", "4"]),
    ]);
    expect(proposal.entries[0]?.kind).toBe("ordered");
  });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `pnpm vitest run shared/models/dataDictionaries/DictionaryProposal`
Expected: FAIL, `Cannot find module .../makeProposalFromColumnProfiles.ts`.

- [ ] **Step 4: Write the clustering**

`makeProposalFromColumnProfiles.ts`:

```ts
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalEntry,
  DictionaryProposalSuggestionReason,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

type ProfileList = [ColumnProfile.T, ...ColumnProfile.T[]];

type Cluster = {
  columns: ProfileList;
  suggestedColumns: ColumnProfile.T[];
  suggestionReason: DictionaryProposalSuggestionReason | undefined;
};

/** How a column relates to a cluster: certainly the same, or a guess. */
type Outcome = "same" | DictionaryProposalSuggestionReason;

type Placement = { cluster: Cluster; outcome: Outcome; score: number };

const OUTCOME_RANK: Record<Outcome, number> = {
  same: 3,
  other_codes: 2,
  similar_name: 1,
  meaning: 1,
};

/** Breaks a tie between kinds: coded kinds first, plain text last. */
const KIND_PRIORITY: readonly DataDictionaryEntry.Kind[] = [
  "ordered",
  "categorical",
  "identifier",
  "date",
  "number",
  "text",
];

function _getOutcome(match: ColumnProfile.MatchScore): Outcome | undefined {
  // The same name joins whatever the score: different codes become a
  // second code list on one entry, which the user can still keep apart.
  if (match.nameScore === 1) {
    return match.valueScore !== undefined && match.valueScore < 0.5
      ? "other_codes"
      : "same";
  }
  if (match.band === "match") {
    return "same";
  }
  return match.band === "suggestion" ? "similar_name" : undefined;
}

function _isBetter(
  candidate: Readonly<Placement>,
  current: Readonly<Placement> | undefined,
): boolean {
  if (!current) {
    return true;
  }
  const rankDifference =
    OUTCOME_RANK[candidate.outcome] - OUTCOME_RANK[current.outcome];
  return (
    rankDifference > 0 ||
    (rankDifference === 0 && candidate.score > current.score)
  );
}

function _getPlacementInCluster(
  cluster: Cluster,
  profile: ColumnProfile.T,
): Placement | undefined {
  const members = [...cluster.columns, ...cluster.suggestedColumns];
  // Two columns of one dataset are two different things, whatever they share.
  const hasDataset = members.some((member) => {
    return member.datasetId === profile.datasetId;
  });
  if (hasDataset) {
    return undefined;
  }
  return cluster.columns.reduce<Placement | undefined>((best, member) => {
    const match = ColumnProfile.getMatchScore(member, profile);
    const outcome = _getOutcome(match);
    const candidate = outcome
      ? { cluster, outcome, score: match.score }
      : undefined;
    return candidate && _isBetter(candidate, best) ? candidate : best;
  }, undefined);
}

function _findPlacement(
  clusters: readonly Cluster[],
  profile: ColumnProfile.T,
): Placement | undefined {
  return clusters.reduce<Placement | undefined>((best, cluster) => {
    const candidate = _getPlacementInCluster(cluster, profile);
    return candidate && _isBetter(candidate, best) ? candidate : best;
  }, undefined);
}

/** The entry name most of the columns would get, the first read on a tie. */
function _getMostCommonName(columns: Readonly<ProfileList>): string {
  const counts = new Map<string, number>();
  columns.forEach((column) => {
    const name = ColumnProfile.getEntryNameFromColumnName(column.columnName);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts.entries()].reduce(
    (bestName, [name, count]) => {
      return count > (counts.get(bestName) ?? 0) ? name : bestName;
    },
    ColumnProfile.getEntryNameFromColumnName(columns[0].columnName),
  );
}

/**
 * `name`, or `name_2`, `name_3`, and so on: the first one no taken name
 * uses, ignoring case. Records the one it returns as taken.
 */
function _takeUniqueName(name: string, takenNames: Set<string>): string {
  let candidate = name;
  let suffix = 2;
  while (takenNames.has(candidate.toLowerCase())) {
    candidate = `${name}_${suffix}`;
    suffix += 1;
  }
  takenNames.add(candidate.toLowerCase());
  return candidate;
}

function _getMostCommonKind(
  columns: readonly ColumnProfile.T[],
): DataDictionaryEntry.Kind {
  const counts = new Map<DataDictionaryEntry.Kind, number>();
  columns.forEach((column) => {
    const kind = ColumnProfile.getEntryKind(column);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  });
  // `sort` is stable, so a tie keeps the order of KIND_PRIORITY.
  const [mostCommon] = [...KIND_PRIORITY].sort((kindA, kindB) => {
    return (counts.get(kindB) ?? 0) - (counts.get(kindA) ?? 0);
  });
  return mostCommon ?? "text";
}

function _makeEntryFromCluster(
  cluster: Readonly<Cluster>,
): DictionaryProposalEntry {
  const [first] = cluster.columns;
  return {
    key: `${first.datasetId}:${first.columnName}`,
    name: _getMostCommonName(cluster.columns),
    columns: [...cluster.columns],
    suggestedColumns: [...cluster.suggestedColumns],
    suggestionReason: cluster.suggestionReason,
    kind: _getMostCommonKind([...cluster.columns, ...cluster.suggestedColumns]),
    isIncluded: true,
    description: "",
    isDescriptionSuggested: false,
  };
}

/**
 * Groups profiled columns from one or more datasets into the entries a new
 * dictionary would have. A column joins the entry it matches best: by the
 * same name, or by a match score of 0.9 or more. A weaker match (0.6 to
 * 0.9) or the same name with other codes joins as a guess the user can
 * undo. Two columns of one dataset never share an entry. Each entry is named
 * after its most common column name in lowercase words (`GENDER` gives
 * `gender`), with `_2` added when another entry, or one of `takenNames`,
 * already has that name.
 *
 * Used when a dictionary is created from datasets, and again by Keep apart
 * to regroup the columns a guess had joined.
 */
export function makeProposalFromColumnProfiles(
  profiles: readonly ColumnProfile.T[],
  options: Readonly<{ takenNames?: readonly string[] }> = {},
): DictionaryProposalT {
  const clusters: Cluster[] = [];
  profiles.forEach((profile) => {
    const placement = _findPlacement(clusters, profile);
    if (!placement) {
      clusters.push({
        columns: [profile],
        suggestedColumns: [],
        suggestionReason: undefined,
      });
    } else if (placement.outcome === "same") {
      placement.cluster.columns.push(profile);
    } else {
      placement.cluster.suggestedColumns.push(profile);
      placement.cluster.suggestionReason = placement.outcome;
    }
  });
  const takenNames = new Set(
    (options.takenNames ?? []).map((name) => {
      return name.trim().toLowerCase();
    }),
  );
  return {
    entries: clusters.map((cluster) => {
      const entry = _makeEntryFromCluster(cluster);
      return { ...entry, name: _takeUniqueName(entry.name, takenNames) };
    }),
  };
}
```

- [ ] **Step 5: Run the test to make sure it passes**

Run: `pnpm vitest run shared/models/dataDictionaries/DictionaryProposal`
Expected: PASS (11 tests).

- [ ] **Step 6: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore shared/models/dataDictionaries/DictionaryProposal
pnpm exec eslint --fix shared/models/dataDictionaries/DictionaryProposal
git add shared/models/dataDictionaries/DictionaryProposal
git commit -m "feat(data-dictionaries): group profiled columns into proposed entries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Code lists, labels, and the save draft

Derives the code lists a proposal would save, tracks the labels being typed or suggested, and turns it all into the `DataDictionary.Draft` that `buildSavePayload` already accepts. Entries share one code list when their codes are identical and are words (`Y/N/U` across `fever`, `rash`, `cough`), or are identical numbers and the columns' names start with the same word (`symptom_fever`, `symptom_rash` with `1/2/9`); identical numbers alone (`GENDER` and `fever`, both `1/2/9`) share nothing. A code list's key never depends on the entry's name, so renaming an entry on Review keeps its labels. A value with no label is saved with a blank label (Task 1 allows it).

**Files:**
- Create: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts`
- Test: `.../getCodingsFromProposal/getCodingsFromProposal.test.ts`
- Create: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts`
- Test: `.../proposalLabelHelpers/proposalLabelHelpers.test.ts`
- Create: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeDraftFromProposal/makeDraftFromProposal.ts`
- Test: `.../makeDraftFromProposal/makeDraftFromProposal.test.ts`

(`...` is `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule`.)

- [ ] **Step 1: Write the failing codings test**

`getCodingsFromProposal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DictionaryProposalEntry } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  counts: Readonly<Record<string, number>>,
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  const values = Object.entries(counts).map(([value, rowCount]) => {
    return { value, rowCount };
  });
  return {
    datasetId,
    datasetName: "Bronx",
    columnName,
    dataType: "varchar",
    rowCount: 500,
    nonNullCount: 500,
    distinctCount: values.length,
    values,
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _entry(
  name: string,
  kind: DataDictionaryEntry.Kind,
  columns: ColumnProfile.T[],
  overrides: Partial<DictionaryProposalEntry> = {},
): DictionaryProposalEntry {
  return {
    key: `k:${name}`,
    name,
    columns,
    suggestedColumns: [],
    suggestionReason: undefined,
    kind,
    isIncluded: true,
    description: "",
    isDescriptionSuggested: false,
    ...overrides,
  };
}

const SEX_COUNTS = { "1": 260, "2": 230, "9": 10 };
const YES_NO_UNKNOWN = { "1": 50, "2": 40, "9": 5 };

describe("getCodingsFromProposal", () => {
  it("names a single entry's list after the entry and its codes", () => {
    const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal({
      entries: [_entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)])],
    });
    expect(codeLists).toHaveLength(1);
    expect(codeLists[0]?.name).toBe("GENDER (1/2/9)");
    expect(codeLists[0]?.entryKeys).toEqual(["k:GENDER"]);
    expect(codeListKeysByEntryKey["k:GENDER"]).toEqual([codeLists[0]?.key]);
  });

  it("gives an entry with other codes a second list, the larger first", () => {
    const entry = _entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)], {
      suggestedColumns: [_column("sex", { M: 120, F: 110, U: 5 }, ERIE_ID)],
      suggestionReason: "other_codes",
    });
    const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal({
      entries: [entry],
    });
    const names = (codeListKeysByEntryKey["k:GENDER"] ?? []).map((key) => {
      return codeLists.find((list) => {
        return list.key === key;
      })?.name;
    });
    expect(names).toEqual(["GENDER (1/2/9)", "GENDER (M/F/U)"]);
  });

  it("merges spellings that differ only in case into one code", () => {
    const entry = _entry("sex", "categorical", [
      _column("sex", { M: 100 }),
      _column("sex", { m: 20, F: 90 }, ERIE_ID),
    ]);
    const { codeLists } = getCodingsFromProposal({ entries: [entry] });
    expect(codeLists[0]?.values).toEqual([
      { value: "M", rowCount: 120 },
      { value: "F", rowCount: 90 },
    ]);
  });

  it("shares one list between entries with the same codes and first word", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("symptom_fever", "categorical", [
          _column("symptom_fever", YES_NO_UNKNOWN),
        ]),
        _entry("symptom_rash", "categorical", [
          _column("symptom_rash", YES_NO_UNKNOWN),
        ]),
      ],
    });
    expect(codeLists).toHaveLength(1);
    expect(codeLists[0]?.name).toBe("symptom (1/2/9)");
    expect(codeLists[0]?.entryKeys).toEqual(["k:symptom_fever", "k:symptom_rash"]);
  });

  it("shares one list between entries whose codes are the same words, whatever their names", () => {
    const yesNoUnknown = { Y: 50, N: 40, U: 5 };
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("fever", "categorical", [_column("fever", yesNoUnknown)]),
        _entry("rash", "categorical", [_column("rash", yesNoUnknown)]),
        _entry("cough", "categorical", [_column("cough", yesNoUnknown)]),
      ],
    });
    expect(codeLists).toHaveLength(1);
    expect(codeLists[0]?.name).toBe("fever, rash, cough (Y/N/U)");
  });

  it("keeps word codes apart when they are not the same", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("fever", "categorical", [_column("fever", { Y: 50, N: 40, U: 5 })]),
        _entry("hosp_yn", "categorical", [_column("hosp_yn", { Y: 50, N: 40 })]),
      ],
    });
    expect(codeLists).toHaveLength(2);
  });

  it("keeps a list's key when its entry is renamed", () => {
    const entry = _entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)]);
    const before = getCodingsFromProposal({ entries: [entry] }).codeLists[0];
    const after = getCodingsFromProposal({
      entries: [{ ...entry, name: "sex_at_intake" }],
    }).codeLists[0];
    expect(after?.key).toBe(before?.key);
    expect(after?.name).toBe("sex_at_intake (1/2/9)");
  });

  it("keeps entries with the same numeric codes but another first word apart", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)]),
        _entry("fever", "categorical", [_column("fever", SEX_COUNTS)]),
      ],
    });
    expect(codeLists).toHaveLength(2);
  });

  it("keeps an ordered list in scale order", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("ses_cat", "ordered", [
          _column("ses_cat", { "4": 50, "1": 100, "3": 70, "2": 90 }),
        ]),
      ],
    });
    expect(codeLists[0]?.isOrdered).toBe(true);
    expect(
      codeLists[0]?.values.map((item) => {
        return item.value;
      }),
    ).toEqual(["1", "2", "3", "4"]);
  });

  it("gives excluded and description-only entries no list", () => {
    const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal({
      entries: [
        _entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)], {
          isIncluded: false,
        }),
        _entry("case_id", "identifier", [_column("case_id", { A1: 1 })]),
      ],
    });
    expect(codeLists).toEqual([]);
    expect(codeListKeysByEntryKey).toEqual({});
  });
});
```

- [ ] **Step 2:** `pnpm vitest run shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the codings**

`getCodingsFromProposal.ts`:

```ts
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type {
  DictionaryProposalCodeList,
  DictionaryProposalCodings,
  DictionaryProposalEntry,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

/** Two sets of codes are one coding when this share of the smaller is shared. */
const MIN_CODING_OVERLAP = 0.5;

/** How many codes a code list's name shows, as in `GENDER (1/2/9)`. */
const CODES_IN_NAME = 4;

/** How many entry names a shared list's name shows before `...`. */
const NAMES_IN_NAME = 3;

/** A code made only of digits, with an optional sign or decimals. */
const NUMERIC_CODE = /^-?\d+(\.\d+)?$/;

/** Values by normalized code. The first spelling seen is the code kept. */
type Coding = Map<string, ColumnProfile.Value>;

type ListBuilder = {
  /** The shared first word of numeric lists' columns; empty for words. */
  groupWord: string;
  entryKeys: string[];
  isOrdered: boolean;
  values: Coding;
};

function _addValues(
  target: Coding,
  values: Iterable<ColumnProfile.Value>,
): void {
  [...values].forEach((item) => {
    const key = ColumnProfile.normalizeValue(item.value);
    const current = target.get(key);
    target.set(key, {
      value: current?.value ?? item.value.trim(),
      rowCount: (current?.rowCount ?? 0) + item.rowCount,
    });
  });
}

function _getOverlap(codingA: Coding, codingB: Coding): number {
  const shared = [...codingA.keys()].filter((key) => {
    return codingB.has(key);
  }).length;
  return shared / Math.max(1, Math.min(codingA.size, codingB.size));
}

function _getTotalRows(coding: Coding): number {
  return [...coding.values()].reduce((sum, item) => {
    return sum + item.rowCount;
  }, 0);
}

/** One coding per set of codes the entry's columns hold, most rows first. */
function _makeCodings(entry: Readonly<DictionaryProposalEntry>): Coding[] {
  const codings: Coding[] = [];
  [...entry.columns, ...entry.suggestedColumns].forEach((column) => {
    if (!column.values || column.values.length === 0) {
      return;
    }
    const columnCoding: Coding = new Map();
    _addValues(columnCoding, column.values);
    const target = codings.find((coding) => {
      return _getOverlap(coding, columnCoding) >= MIN_CODING_OVERLAP;
    });
    if (target) {
      _addValues(target, columnCoding.values());
    } else {
      codings.push(columnCoding);
    }
  });
  return codings.sort((codingA, codingB) => {
    return _getTotalRows(codingB) - _getTotalRows(codingA);
  });
}

/**
 * The word that lets numeric codings share a list: the first word of the
 * entry's first column name. Word codings need none, so it is empty. It is
 * read from the column, never the entry's name, so a rename keeps the key.
 */
function _getGroupWord(
  entry: Readonly<DictionaryProposalEntry>,
  coding: Coding,
): string {
  const isNumeric = [...coding.keys()].every((key) => {
    return NUMERIC_CODE.test(key);
  });
  if (!isNumeric) {
    return "";
  }
  const [firstColumn] = [...entry.columns, ...entry.suggestedColumns];
  const columnName = firstColumn?.columnName ?? entry.name;
  return ColumnProfile.getTokensFromColumnName(columnName)[0] ?? "";
}

/** The part of a list's name before its codes. */
function _getBaseName(
  builder: Readonly<ListBuilder>,
  entryNames: ReadonlyMap<string, string>,
): string {
  const names = builder.entryKeys.map((entryKey) => {
    return entryNames.get(entryKey) ?? "";
  });
  if (names.length === 1) {
    return names[0] ?? builder.groupWord;
  }
  if (builder.groupWord !== "") {
    return builder.groupWord;
  }
  const shown = names.slice(0, NAMES_IN_NAME).join(", ");
  return names.length > NAMES_IN_NAME ? `${shown}, ...` : shown;
}

function _makeCodeList(
  options: Readonly<{
    key: string;
    builder: ListBuilder;
    entryNames: ReadonlyMap<string, string>;
  }>,
): DictionaryProposalCodeList {
  const { key, builder, entryNames } = options;
  const values = [...builder.values.values()];
  const sortedValues = builder.isOrdered
    ? ColumnProfile.sortValuesInScaleOrder(values)
    : values.sort((itemA, itemB) => {
        return itemB.rowCount - itemA.rowCount;
      });
  const base = _getBaseName(builder, entryNames);
  const codes = sortedValues
    .slice(0, CODES_IN_NAME)
    .map((item) => {
      return item.value;
    })
    .join("/");
  const more = sortedValues.length > CODES_IN_NAME ? "/..." : "";
  return {
    key,
    name: `${base} (${codes}${more})`,
    isOrdered: builder.isOrdered,
    entryKeys: [...builder.entryKeys],
    values: sortedValues,
  };
}

/**
 * The code lists a proposal would save, and which ones each coded entry
 * uses, primary first. An entry gets one code list per set of codes its
 * columns hold. Entries share one list when their codes are the same words
 * (`Y/N/U`), or the same numbers and their columns' names start with the
 * same word (`symptom_fever`, `symptom_rash`). Excluded and
 * description-only entries get none.
 *
 * Read by the Label values step to list what needs labels, and by
 * `makeDraftFromProposal` to build the draft that is saved.
 */
export function getCodingsFromProposal(
  proposal: Readonly<DictionaryProposalT>,
): DictionaryProposalCodings {
  const builders = new Map<string, ListBuilder>();
  const codeListKeysByEntryKey: Record<string, string[]> = {};
  const codedEntries = proposal.entries.filter((entry) => {
    return entry.isIncluded && DataDictionary.isCodedKind(entry.kind);
  });
  codedEntries.forEach((entry) => {
    codeListKeysByEntryKey[entry.key] = _makeCodings(entry).map((coding) => {
      const groupWord = _getGroupWord(entry, coding);
      const key = `${groupWord}|${[...coding.keys()].sort().join("\u001f")}`;
      const builder = builders.get(key);
      if (builder) {
        builder.entryKeys.push(entry.key);
        builder.isOrdered ||= entry.kind === "ordered";
        _addValues(builder.values, coding.values());
      } else {
        const isOrdered = entry.kind === "ordered";
        builders.set(key, { groupWord, entryKeys: [entry.key], isOrdered, values: coding });
      }
      return key;
    });
  });
  const entryNames = new Map(
    codedEntries.map((entry) => {
      return [entry.key, entry.name];
    }),
  );
  const codeLists = [...builders.entries()].map(([key, builder]) => {
    return _makeCodeList({ key, builder, entryNames });
  });
  return { codeLists, codeListKeysByEntryKey };
}
```

- [ ] **Step 4:** Run the codings test again. Expected: PASS (10 tests).

- [ ] **Step 5: Write the failing labels test**

`proposalLabelHelpers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  acceptCodeList,
  applyLabelSuggestions,
  getCodeListStatus,
  getUnlabeledValues,
  getValueLabel,
  setValueLabel,
  withDefaultLabels,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { DictionaryProposalCodeList } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

function _list(key: string, codes: readonly string[]): DictionaryProposalCodeList {
  return {
    key,
    name: `${key} (${codes.join("/")})`,
    isOrdered: false,
    entryKeys: [`entry:${key}`],
    values: codes.map((value) => {
      return { value, rowCount: 10 };
    }),
  };
}

const OUTCOME = _list("outcome", ["1", "Recovered", "Unknown"]);
const SEX = _list("sex", ["1", "2"]);

describe("proposalLabelHelpers", () => {
  it("labels values that already read as labels, and marks missing words", () => {
    const labels = withDefaultLabels({}, [OUTCOME]);
    expect(getValueLabel(labels, { codeListKey: "outcome", code: "1" })?.label).toBe("");
    expect(
      getValueLabel(labels, { codeListKey: "outcome", code: "Recovered" }),
    ).toEqual({ label: "Recovered", isMissing: false, source: "data" });
    expect(
      getValueLabel(labels, { codeListKey: "outcome", code: "Unknown" })
        ?.isMissing,
    ).toBe(true);
  });

  it("keeps typed labels when the code lists are worked out again", () => {
    const typed = setValueLabel(withDefaultLabels({}, [SEX]), {
      codeListKey: "sex",
      code: "1",
      label: "Male",
    });
    const again = withDefaultLabels(typed, [SEX]);
    expect(getValueLabel(again, { codeListKey: "sex", code: "1" })).toEqual({
      label: "Male",
      isMissing: false,
      source: "typed",
    });
  });

  it("fills suggestions in, but never over a typed label or for an unknown value", () => {
    const typed = setValueLabel(withDefaultLabels({}, [SEX]), {
      codeListKey: "sex",
      code: "1",
      label: "Man",
    });
    const suggested = applyLabelSuggestions(typed, {
      codeListKey: "sex",
      suggestions: {
        labels: [
          { value: "1", label: "Male", isMissing: false },
          { value: "2", label: "Female", isMissing: false },
          { value: "7", label: "Other", isMissing: false },
        ],
        description: "",
      },
    });
    expect(getValueLabel(suggested, { codeListKey: "sex", code: "1" })?.label).toBe("Man");
    expect(getValueLabel(suggested, { codeListKey: "sex", code: "2" })).toEqual({
      label: "Female",
      isMissing: false,
      source: "suggested",
    });
    expect(suggested.sex?.values["7"]).toBeUndefined();
  });

  it("moves a list from To do to Suggested to Labeled", () => {
    const empty = withDefaultLabels({}, [SEX]);
    const suggested = applyLabelSuggestions(empty, {
      codeListKey: "sex",
      suggestions: {
        labels: [
          { value: "1", label: "Male", isMissing: false },
          { value: "2", label: "Female", isMissing: false },
        ],
        description: "",
      },
    });
    expect(getCodeListStatus(empty, SEX)).toBe("to_do");
    expect(getCodeListStatus(suggested, SEX)).toBe("suggested");
    expect(getCodeListStatus(acceptCodeList(suggested, "sex"), SEX)).toBe("labeled");
  });

  it("calls a list whose values all came with labels Labeled", () => {
    const list = _list("county", ["Bronx", "Kings"]);
    expect(getCodeListStatus(withDefaultLabels({}, [list]), list)).toBe("labeled");
  });

  it("counts unlabeled values and names the lists they are in", () => {
    const labels = withDefaultLabels({}, [OUTCOME, SEX]);
    expect(getUnlabeledValues(labels, [OUTCOME, SEX])).toEqual({
      valueCount: 3,
      codeListNames: ["outcome (1/Recovered/Unknown)", "sex (1/2)"],
    });
  });
});
```

- [ ] **Step 6:** `pnpm vitest run shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers`. Expected: FAIL, module not found.

- [ ] **Step 7: Write the label helpers**

`proposalLabelHelpers.ts`:

```ts
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type {
  DictionaryProposalCodeList,
  DictionaryProposalCodeListStatus,
  DictionaryProposalLabels,
  DictionaryProposalLabelSuggestions,
  DictionaryProposalValueLabel,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

/** A value this long or longer, with a letter in it, reads as a label. */
const MIN_LABEL_LENGTH = 4;

type ValueRef = { codeListKey: string; code: string };

function _readsAsLabel(value: string): boolean {
  const trimmed = value.trim();
  return (
    /\p{L}/u.test(trimmed) &&
    (trimmed.length >= MIN_LABEL_LENGTH || /\s/.test(trimmed))
  );
}

function _makeDefaultLabel(value: string): DictionaryProposalValueLabel {
  return {
    label: _readsAsLabel(value) ? value.trim() : "",
    isMissing: ColumnProfile.isMissingValue(value),
    source: "data",
  };
}

/**
 * The labels with an entry for every value of every code list, keeping
 * whatever was already there. A value that reads as a label (`Recovered`)
 * starts labeled with itself; a word for a missing answer starts marked
 * missing.
 */
export function withDefaultLabels(
  labels: Readonly<DictionaryProposalLabels>,
  codeLists: readonly DictionaryProposalCodeList[],
): DictionaryProposalLabels {
  const defaults = codeLists.map((list) => {
    const current = labels[list.key];
    const values = Object.fromEntries(
      list.values.map((item) => {
        const key = ColumnProfile.normalizeValue(item.value);
        return [key, current?.values[key] ?? _makeDefaultLabel(item.value)];
      }),
    );
    return [list.key, { values, isAccepted: current?.isAccepted ?? false }];
  });
  return { ...labels, ...Object.fromEntries(defaults) };
}

/** The label of one value of one code list, if it has one. */
export function getValueLabel(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<ValueRef>,
): DictionaryProposalValueLabel | undefined {
  return labels[options.codeListKey]?.values[
    ColumnProfile.normalizeValue(options.code)
  ];
}

function _updateValue(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<
    ValueRef & {
      change: (
        current: DictionaryProposalValueLabel,
      ) => DictionaryProposalValueLabel;
    }
  >,
): DictionaryProposalLabels {
  const list = labels[options.codeListKey];
  const key = ColumnProfile.normalizeValue(options.code);
  const current = list?.values[key];
  if (!list || !current) {
    return { ...labels };
  }
  const values = { ...list.values, [key]: options.change(current) };
  return { ...labels, [options.codeListKey]: { ...list, values } };
}

/** The labels with one value's label typed by the user. */
export function setValueLabel(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<ValueRef & { label: string }>,
): DictionaryProposalLabels {
  return _updateValue(labels, {
    ...options,
    change: (current) => {
      return { ...current, label: options.label, source: "typed" };
    },
  });
}

/** The labels with one value marked, or unmarked, as a missing answer. */
export function setValueMissing(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<ValueRef & { isMissing: boolean }>,
): DictionaryProposalLabels {
  return _updateValue(labels, {
    ...options,
    change: (current) => {
      return { ...current, isMissing: options.isMissing };
    },
  });
}

/**
 * The labels with the suggestion model's labels filled in. A label the
 * user typed is never replaced, and a value the list does not hold is
 * ignored.
 */
export function applyLabelSuggestions(
  labels: Readonly<DictionaryProposalLabels>,
  options: Readonly<{
    codeListKey: string;
    suggestions: DictionaryProposalLabelSuggestions;
  }>,
): DictionaryProposalLabels {
  return options.suggestions.labels.reduce(
    (current, suggestion) => {
      return _updateValue(current, {
        codeListKey: options.codeListKey,
        code: suggestion.value,
        change: (value) => {
          return value.source === "typed"
            ? value
            : {
                label: suggestion.label,
                isMissing: suggestion.isMissing,
                source: "suggested",
              };
        },
      });
    },
    { ...labels },
  );
}

/** The labels with one code list marked as checked by the user. */
export function acceptCodeList(
  labels: Readonly<DictionaryProposalLabels>,
  codeListKey: string,
): DictionaryProposalLabels {
  const list = labels[codeListKey];
  return list
    ? { ...labels, [codeListKey]: { ...list, isAccepted: true } }
    : { ...labels };
}

/**
 * How far a code list is. Labeled once the user accepted it, or when every
 * value came with a label from the data. Suggested while every value has a
 * label and some are unchecked suggestions. To do otherwise.
 */
export function getCodeListStatus(
  labels: Readonly<DictionaryProposalLabels>,
  codeList: Readonly<DictionaryProposalCodeList>,
): DictionaryProposalCodeListStatus {
  const list = labels[codeList.key];
  const values = codeList.values.map((item) => {
    return list?.values[ColumnProfile.normalizeValue(item.value)];
  });
  const isAllLabeled = values.every((value) => {
    return (value?.label.trim() ?? "") !== "";
  });
  const hasSuggestion = values.some((value) => {
    return value?.source === "suggested";
  });
  if (list?.isAccepted || (isAllLabeled && !hasSuggestion)) {
    return "labeled";
  }
  return isAllLabeled ? "suggested" : "to_do";
}

/** How many values have no label, and the names of the lists they are in. */
export function getUnlabeledValues(
  labels: Readonly<DictionaryProposalLabels>,
  codeLists: readonly DictionaryProposalCodeList[],
): { valueCount: number; codeListNames: string[] } {
  const counts = codeLists.map((list) => {
    const count = list.values.filter((item) => {
      const label = getValueLabel(labels, {
        codeListKey: list.key,
        code: item.value,
      });
      return (label?.label.trim() ?? "") === "";
    }).length;
    return { name: list.name, count };
  });
  const withUnlabeled = counts.filter((item) => {
    return item.count > 0;
  });
  return {
    valueCount: withUnlabeled.reduce((sum, item) => {
      return sum + item.count;
    }, 0),
    codeListNames: withUnlabeled.map((item) => {
      return item.name;
    }),
  };
}
```

- [ ] **Step 8:** Run the labels test again. Expected: PASS (6 tests).

- [ ] **Step 9: Write the failing draft test**

`makeDraftFromProposal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import { makeDraftFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeDraftFromProposal/makeDraftFromProposal.ts";
import {
  setValueLabel,
  withDefaultLabels,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalEntry,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  codes: readonly string[],
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  return {
    datasetId,
    datasetName: "Bronx",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value, index) => {
      return { value, rowCount: 100 - index };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _entry(
  name: string,
  kind: DataDictionaryEntry.Kind,
  overrides: Partial<DictionaryProposalEntry> = {},
): DictionaryProposalEntry {
  return {
    key: `k:${name}`,
    name,
    columns: [_column(name, ["1", "2", "9"])],
    suggestedColumns: [],
    suggestionReason: undefined,
    kind,
    isIncluded: true,
    description: "",
    isDescriptionSuggested: false,
    ...overrides,
  };
}

function _labelsFor(proposal: DictionaryProposalT) {
  return withDefaultLabels({}, getCodingsFromProposal(proposal).codeLists);
}

describe("makeDraftFromProposal", () => {
  it("keeps included entries, coded first, with their other column names", () => {
    const proposal: DictionaryProposalT = {
      entries: [
        _entry("case_id", "identifier"),
        _entry("GENDER", "categorical", {
          suggestedColumns: [_column("sex", ["M", "F", "U"], ERIE_ID)],
          suggestionReason: "other_codes",
        }),
        _entry("hosp_yn", "categorical", { isIncluded: false }),
      ],
    };
    const draft = makeDraftFromProposal({ proposal, labels: _labelsFor(proposal) });
    expect(
      draft.entries.map((entry) => {
        return entry.name;
      }),
    ).toEqual(["GENDER", "case_id"]);
    const gender = draft.entries[0];
    expect(gender?.columnNames).toEqual(["sex"]);
    expect(
      gender?.codings.map((coding) => {
        return coding.isPrimary;
      }),
    ).toEqual([true, false]);
  });

  it("saves each value's label, and a blank label for a value without one", () => {
    const proposal: DictionaryProposalT = {
      entries: [_entry("GENDER", "categorical")],
    };
    const codeListKey = getCodingsFromProposal(proposal).codeLists[0]?.key ?? "";
    const labels = setValueLabel(_labelsFor(proposal), {
      codeListKey,
      code: "1",
      label: "Male",
    });
    const draft = makeDraftFromProposal({ proposal, labels });
    expect(
      draft.codeLists[0]?.pairs.map((pair) => {
        return [pair.code, pair.label];
      }),
    ).toEqual([
      ["1", "Male"],
      ["2", ""],
      ["9", ""],
    ]);
    expect(DataDictionary.findDraftWarnings(draft)).toHaveLength(2);
  });

  it("saves a shared list once, used by both entries", () => {
    const proposal: DictionaryProposalT = {
      entries: [
        _entry("symptom_fever", "categorical"),
        _entry("symptom_rash", "categorical"),
      ],
    };
    const draft = makeDraftFromProposal({ proposal, labels: _labelsFor(proposal) });
    expect(draft.codeLists).toHaveLength(1);
    expect(draft.entries[0]?.codings[0]?.codeListId).toBe(
      draft.entries[1]?.codings[0]?.codeListId,
    );
  });

  it("builds a draft the dictionary saves as it is, unlabeled values included", () => {
    const proposal: DictionaryProposalT = {
      entries: [
        _entry("GENDER", "categorical"),
        _entry("ses_cat", "ordered", { columns: [_column("ses_cat", ["1", "2", "3"])] }),
        _entry("case_id", "identifier"),
      ],
    };
    const draft = makeDraftFromProposal({ proposal, labels: _labelsFor(proposal) });
    expect(DataDictionary.findDraftIssues(draft)).toEqual([]);
  });
});
```

- [ ] **Step 10:** `pnpm vitest run shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeDraftFromProposal`. Expected: FAIL, module not found.

- [ ] **Step 11: Write the draft builder**

`makeDraftFromProposal.ts`:

```ts
import { prop } from "@avandar/utils";
import { uuid } from "$/lib/uuid.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import { getValueLabel } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalCodeList,
  DictionaryProposalEntry,
  DictionaryProposalLabels,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

/** Coded entries, then scales, then description-only, as Review shows them. */
const SECTION_ORDER: Record<DataDictionaryEntry.Kind, number> = {
  categorical: 0,
  ordered: 1,
  identifier: 2,
  date: 2,
  number: 2,
  text: 2,
};

function _makeCodeListDraft(
  options: Readonly<{
    codeList: DictionaryProposalCodeList;
    id: DataDictionaryCodeList.Id;
    labels: DictionaryProposalLabels;
  }>,
): DataDictionary.CodeListDraft {
  const { codeList, id, labels } = options;
  const pairs = codeList.values.map((item) => {
    const label = getValueLabel(labels, {
      codeListKey: codeList.key,
      code: item.value,
    });
    // A value with no label is saved with a blank one, and the dictionary
    // marks it as needing a label.
    return {
      code: item.value,
      label: label?.label.trim() ?? "",
      acceptedSpellings: [],
      isMissing: label?.isMissing ?? false,
    };
  });
  return { id, name: codeList.name, isOrdered: codeList.isOrdered, pairs };
}

function _getOtherColumnNames(entry: Readonly<DictionaryProposalEntry>): string[] {
  const seen = new Set([entry.name.trim().toLowerCase()]);
  return [...entry.columns, ...entry.suggestedColumns]
    .map(prop("columnName"))
    .filter((name) => {
      const key = name.trim().toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function _makeEntryDraft(
  options: Readonly<{
    entry: DictionaryProposalEntry;
    codeListIds: readonly DataDictionaryCodeList.Id[];
  }>,
): DataDictionary.EntryDraft {
  const { entry, codeListIds } = options;
  return {
    id: uuid<DataDictionaryEntry.Id>(),
    name: entry.name,
    columnNames: _getOtherColumnNames(entry),
    kind: entry.kind,
    unit: "",
    validMin: undefined,
    validMax: undefined,
    description: entry.description,
    codings: codeListIds.map((codeListId, index) => {
      return { codeListId, isPrimary: index === 0 };
    }),
  };
}

/**
 * The dictionary contents a proposal saves: its included entries (coded
 * first, then scales, then description-only), each entry's other column
 * names, its code lists with the labels given, and fresh ids for all of
 * them. `DataDictionary.buildSavePayload` turns it into the save RPC's
 * arguments, exactly like a draft edited on the Dictionary view.
 */
export function makeDraftFromProposal(
  options: Readonly<{
    proposal: DictionaryProposalT;
    labels: DictionaryProposalLabels;
  }>,
): DataDictionary.Draft {
  const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal(
    options.proposal,
  );
  const idsByKey = new Map(
    codeLists.map((codeList) => {
      return [codeList.key, uuid<DataDictionaryCodeList.Id>()];
    }),
  );
  const idsFor = (keys: readonly string[]): DataDictionaryCodeList.Id[] => {
    return keys.flatMap((key) => {
      const id = idsByKey.get(key);
      return id ? [id] : [];
    });
  };
  const entries = options.proposal.entries
    .filter(prop("isIncluded"))
    .sort((entryA, entryB) => {
      return SECTION_ORDER[entryA.kind] - SECTION_ORDER[entryB.kind];
    });
  return {
    codeLists: codeLists.flatMap((codeList) => {
      const id = idsByKey.get(codeList.key);
      return id ? [_makeCodeListDraft({ codeList, id, labels: options.labels })] : [];
    }),
    entries: entries.map((entry) => {
      const codeListIds = idsFor(codeListKeysByEntryKey[entry.key] ?? []);
      return _makeEntryDraft({ entry, codeListIds });
    }),
  };
}
```

- [ ] **Step 12:** Run the draft test again. Expected: PASS (4 tests). Then `pnpm vitest run shared/models/dataDictionaries`. Expected: PASS.

- [ ] **Step 13: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore shared/models/dataDictionaries/DictionaryProposal
pnpm exec eslint --fix shared/models/dataDictionaries/DictionaryProposal
git add shared/models/dataDictionaries/DictionaryProposal
git commit -m "feat(data-dictionaries): derive code lists, labels, and the draft from a proposal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The proposal module and its edits

Puts the proposal behind one namespace, `DictionaryProposal`, and adds the edits the Review step makes: rename an entry, change a kind, include or leave out an entry, keep a guessed merge apart, apply the model's meaning matches, and set a description. `getEntryNameIssues` checks names the way the save RPC does: trimmed, not blank, and unique ignoring case among the entries that will be saved.

**Files:**
- Create: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/DictionaryProposalModule.ts`
- Create: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposal.ts`
- Test: `shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/DictionaryProposalModule.test.ts`

- [ ] **Step 1: Write the failing test**

`DictionaryProposalModule.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

type DatasetRef = { datasetId: Dataset.Id; datasetName: string };

const BRONX: DatasetRef = { datasetId: uuid<Dataset.Id>(), datasetName: "Bronx" };
const KINGS: DatasetRef = { datasetId: uuid<Dataset.Id>(), datasetName: "Kings" };
const ERIE: DatasetRef = { datasetId: uuid<Dataset.Id>(), datasetName: "Erie" };

function _coded(
  dataset: DatasetRef,
  columnName: string,
  codes: readonly string[],
): ColumnProfile.T {
  return {
    ...dataset,
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _firstEntry(proposal: DictionaryProposal.T): DictionaryProposal.Entry {
  const [entry] = proposal.entries;
  if (!entry) {
    throw new Error("The proposal has no entries.");
  }
  return entry;
}

function _names(proposal: DictionaryProposal.T): string[] {
  return proposal.entries.map((entry) => {
    return entry.name;
  });
}

const GENDER_AND_SEX = DictionaryProposal.fromColumnProfiles([
  _coded(BRONX, "GENDER", ["1", "2", "9"]),
  _coded(ERIE, "sex", ["M", "F", "U"]),
]);

const VACCINATION = DictionaryProposal.fromColumnProfiles([
  _coded(BRONX, "vax_status", ["Unvaccinated", "Partial", "Full"]),
  _coded(ERIE, "mmr_status", ["0", "1", "2"]),
]);

describe("DictionaryProposal edits", () => {
  it("splits the guessed columns back into their own entry on Keep apart", () => {
    const apart = DictionaryProposal.keepApart(
      GENDER_AND_SEX,
      _firstEntry(GENDER_AND_SEX).key,
    );
    expect(_names(apart)).toEqual(["gender", "sex"]);
    expect(apart.entries[0]?.suggestedColumns).toEqual([]);
    expect(apart.entries[0]?.suggestionReason).toBeUndefined();
  });

  it("joins one entry into another as a guess on a meaning match", () => {
    expect(_names(VACCINATION)).toEqual(["vax_status", "mmr_status"]);
    const matched = DictionaryProposal.applyMeaningMatches(VACCINATION, [
      { name: "mmr_status", sameAs: "vax_status" },
    ]);
    expect(_names(matched)).toEqual(["vax_status"]);
    expect(matched.entries[0]?.suggestionReason).toBe("meaning");
    expect(DictionaryProposal.getColumnNames(_firstEntry(matched))).toEqual([
      "vax_status",
      "mmr_status",
    ]);
  });

  it("ignores a meaning match between columns of one dataset", () => {
    const sameDataset = DictionaryProposal.fromColumnProfiles([
      _coded(BRONX, "vax_status", ["Unvaccinated", "Full"]),
      _coded(BRONX, "mmr_status", ["0", "1"]),
    ]);
    const matched = DictionaryProposal.applyMeaningMatches(sameDataset, [
      { name: "mmr_status", sameAs: "vax_status" },
    ]);
    expect(_names(matched)).toEqual(["vax_status", "mmr_status"]);
  });

  it("ignores a meaning match that names an entry the proposal lacks", () => {
    const matched = DictionaryProposal.applyMeaningMatches(VACCINATION, [
      { name: "dob", sameAs: "vax_status" },
    ]);
    expect(_names(matched)).toEqual(["vax_status", "mmr_status"]);
  });

  it("gives the columns kept apart a name no other entry has", () => {
    const renamed = DictionaryProposal.renameEntry(GENDER_AND_SEX, {
      entryKey: _firstEntry(GENDER_AND_SEX).key,
      name: "sex",
    });
    const apart = DictionaryProposal.keepApart(renamed, _firstEntry(renamed).key);
    expect(_names(apart)).toEqual(["sex", "sex_2"]);
  });

  it("renames an entry as typed", () => {
    const renamed = DictionaryProposal.renameEntry(VACCINATION, {
      entryKey: _firstEntry(VACCINATION).key,
      name: "vaccination_status",
    });
    expect(_names(renamed)).toEqual(["vaccination_status", "mmr_status"]);
  });

  it("flags a blank name and names shared by included entries, ignoring case", () => {
    const [vax, mmr] = VACCINATION.entries;
    const blank = DictionaryProposal.renameEntry(VACCINATION, {
      entryKey: vax?.key ?? "",
      name: "  ",
    });
    expect([...DictionaryProposal.getEntryNameIssues(blank)]).toEqual([
      [vax?.key, "name_required"],
    ]);
    const shared = DictionaryProposal.renameEntry(VACCINATION, {
      entryKey: mmr?.key ?? "",
      name: " VAX_status ",
    });
    expect([...DictionaryProposal.getEntryNameIssues(shared)]).toEqual([
      [vax?.key, "name_not_unique"],
      [mmr?.key, "name_not_unique"],
    ]);
    const excluded = DictionaryProposal.setEntryIncluded(shared, {
      entryKey: mmr?.key ?? "",
      isIncluded: false,
    });
    expect(DictionaryProposal.getEntryNameIssues(excluded).size).toBe(0);
  });

  it("never lets a suggested description replace a typed one", () => {
    const entryKey = VACCINATION.entries[0]?.key ?? "";
    const typed = DictionaryProposal.setEntryDescription(VACCINATION, {
      entryKey,
      description: "MMR doses received",
    });
    const suggested = DictionaryProposal.suggestEntryDescription(typed, {
      entryKey,
      description: "Vaccination status",
    });
    expect(suggested.entries[0]?.description).toBe("MMR doses received");
    expect(suggested.entries[0]?.isDescriptionSuggested).toBe(false);
  });

  it("lists each column name once with the datasets it comes from", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _coded(BRONX, "GENDER", ["1", "2", "9"]),
      _coded(KINGS, "GENDER", ["1", "2", "9"]),
      _coded(ERIE, "sex", ["M", "F", "U"]),
    ]);
    expect(DictionaryProposal.getColumnSources(_firstEntry(proposal))).toEqual([
      { columnName: "GENDER", datasetNames: ["Bronx", "Kings"] },
      { columnName: "sex", datasetNames: ["Erie"] },
    ]);
    expect(DictionaryProposal.getDatasetIds(proposal)).toEqual([
      BRONX.datasetId,
      KINGS.datasetId,
      ERIE.datasetId,
    ]);
  });
});
```

- [ ] **Step 2:** `pnpm vitest run shared/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/DictionaryProposalModule.test.ts`. Expected: FAIL, `Cannot find module .../DictionaryProposal.ts`.

- [ ] **Step 3: Write the module**

`DictionaryProposalModule.ts`:

```ts
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import { makeDraftFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeDraftFromProposal/makeDraftFromProposal.ts";
import { makeProposalFromColumnProfiles } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeProposalFromColumnProfiles/makeProposalFromColumnProfiles.ts";
import {
  acceptCodeList,
  applyLabelSuggestions,
  getCodeListStatus,
  getUnlabeledValues,
  getValueLabel,
  setValueLabel,
  setValueMissing,
  withDefaultLabels,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalEntry,
  DictionaryProposalEntryNameIssue,
  DictionaryProposalMeaningMatch,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

type EntryRef = { entryKey: string };

function _changeEntry(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<
    EntryRef & { change: (entry: DictionaryProposalEntry) => DictionaryProposalEntry }
  >,
): DictionaryProposalT {
  return {
    entries: proposal.entries.map((entry) => {
      return entry.key === options.entryKey ? options.change(entry) : entry;
    }),
  };
}

function getColumns(entry: Readonly<DictionaryProposalEntry>): ColumnProfile.T[] {
  return [...entry.columns, ...entry.suggestedColumns];
}

function getColumnNames(entry: Readonly<DictionaryProposalEntry>): string[] {
  return [
    ...new Set(
      getColumns(entry).map((column) => {
        return column.columnName;
      }),
    ),
  ];
}

function getColumnSources(
  entry: Readonly<DictionaryProposalEntry>,
): Array<{ columnName: string; datasetNames: string[] }> {
  const sources = new Map<string, string[]>();
  getColumns(entry).forEach((column) => {
    const datasetNames = sources.get(column.columnName) ?? [];
    sources.set(column.columnName, [...datasetNames, column.datasetName]);
  });
  return [...sources.entries()].map(([columnName, datasetNames]) => {
    return { columnName, datasetNames };
  });
}

function getDatasetIds(proposal: Readonly<DictionaryProposalT>): Dataset.Id[] {
  const datasetIds = proposal.entries.flatMap((entry) => {
    return getColumns(entry).map((column) => {
      return column.datasetId;
    });
  });
  return [...new Set(datasetIds)];
}

function getValuesSeen(
  entry: Readonly<DictionaryProposalEntry>,
): ColumnProfile.Value[] {
  const values = new Map<string, ColumnProfile.Value>();
  getColumns(entry).forEach((column) => {
    (column.values ?? []).forEach((item) => {
      const key = ColumnProfile.normalizeValue(item.value);
      const current = values.get(key);
      values.set(key, {
        value: current?.value ?? item.value,
        rowCount: (current?.rowCount ?? 0) + item.rowCount,
      });
    });
  });
  return [...values.values()].sort((itemA, itemB) => {
    return itemB.rowCount - itemA.rowCount;
  });
}

function getNumberRange(
  entry: Readonly<DictionaryProposalEntry>,
): { min: number; max: number } | undefined {
  const ranges = getColumns(entry).flatMap((column) => {
    return column.numberRange ? [column.numberRange] : [];
  });
  if (ranges.length === 0) {
    return undefined;
  }
  return {
    min: Math.min(...ranges.map((range) => range.min)),
    max: Math.max(...ranges.map((range) => range.max)),
  };
}

function renameEntry(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { name: string }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return { ...entry, name: options.name };
    },
  });
}

function getEntryNameIssues(
  proposal: Readonly<DictionaryProposalT>,
): Map<string, DictionaryProposalEntryNameIssue> {
  const included = proposal.entries.filter((entry) => {
    return entry.isIncluded;
  });
  const counts = new Map<string, number>();
  included.forEach((entry) => {
    const key = ColumnProfile.normalizeValue(entry.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const issues = included.flatMap(
    (entry): Array<[string, DictionaryProposalEntryNameIssue]> => {
      const key = ColumnProfile.normalizeValue(entry.name);
      if (key === "") {
        return [[entry.key, "name_required"]];
      }
      return (counts.get(key) ?? 0) > 1 ? [[entry.key, "name_not_unique"]] : [];
    },
  );
  return new Map(issues);
}

function setEntryKind(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { kind: DataDictionaryEntry.Kind }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return { ...entry, kind: options.kind };
    },
  });
}

function setEntryIncluded(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { isIncluded: boolean }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return { ...entry, isIncluded: options.isIncluded };
    },
  });
}

function setEntryDescription(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { description: string }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      return { ...entry, description: options.description, isDescriptionSuggested: false };
    },
  });
}

function suggestEntryDescription(
  proposal: Readonly<DictionaryProposalT>,
  options: Readonly<EntryRef & { description: string }>,
): DictionaryProposalT {
  return _changeEntry(proposal, {
    entryKey: options.entryKey,
    change: (entry) => {
      const isReplaceable =
        entry.description.trim() === "" || entry.isDescriptionSuggested;
      return isReplaceable
        ? { ...entry, description: options.description, isDescriptionSuggested: true }
        : entry;
    },
  });
}

function keepApart(
  proposal: Readonly<DictionaryProposalT>,
  entryKey: string,
): DictionaryProposalT {
  const entry = proposal.entries.find((current) => {
    return current.key === entryKey;
  });
  if (!entry || entry.suggestedColumns.length === 0) {
    return { entries: [...proposal.entries] };
  }
  const takenNames = proposal.entries.map((current) => {
    return current.name;
  });
  const split = makeProposalFromColumnProfiles(entry.suggestedColumns, {
    takenNames,
  }).entries;
  const kept = { ...entry, suggestedColumns: [], suggestionReason: undefined };
  return {
    entries: proposal.entries.flatMap((current) => {
      return current.key === entryKey ? [kept, ...split] : [current];
    }),
  };
}

function _findEntryByName(
  proposal: Readonly<DictionaryProposalT>,
  name: string,
): DictionaryProposalEntry | undefined {
  const key = ColumnProfile.normalizeValue(name);
  return proposal.entries.find((entry) => {
    return ColumnProfile.normalizeValue(entry.name) === key;
  });
}

function _sharesDataset(
  entryA: Readonly<DictionaryProposalEntry>,
  entryB: Readonly<DictionaryProposalEntry>,
): boolean {
  const datasetIds = new Set(
    getColumns(entryA).map((column) => {
      return column.datasetId;
    }),
  );
  return getColumns(entryB).some((column) => {
    return datasetIds.has(column.datasetId);
  });
}

function _applyMeaningMatch(
  proposal: DictionaryProposalT,
  match: Readonly<DictionaryProposalMeaningMatch>,
): DictionaryProposalT {
  const source = _findEntryByName(proposal, match.name);
  const target = _findEntryByName(proposal, match.sameAs);
  if (!source || !target || source.key === target.key) {
    return proposal;
  }
  // Two columns of one dataset are two different things, whatever a model says.
  if (_sharesDataset(source, target)) {
    return proposal;
  }
  const merged: DictionaryProposalEntry = {
    ...target,
    suggestedColumns: [...target.suggestedColumns, ...getColumns(source)],
    suggestionReason: "meaning",
  };
  return {
    entries: proposal.entries
      .filter((entry) => {
        return entry.key !== source.key;
      })
      .map((entry) => {
        return entry.key === target.key ? merged : entry;
      }),
  };
}

function applyMeaningMatches(
  proposal: Readonly<DictionaryProposalT>,
  matches: readonly DictionaryProposalMeaningMatch[],
): DictionaryProposalT {
  return matches.reduce(_applyMeaningMatch, { entries: [...proposal.entries] });
}

/**
 * Learning a dictionary from datasets, as pure functions: grouping profiled
 * columns into proposed entries, the edits the create flow makes to them,
 * the code lists and labels they would save, and the draft the save RPC
 * takes. The create flow's reducer calls these. Nothing here reads data or
 * calls a model.
 */
export const DictionaryProposalModule = {
  /** Groups profiled columns from the picked datasets into proposed entries. */
  fromColumnProfiles: makeProposalFromColumnProfiles,

  /** The code lists a proposal would save, and each entry's, primary first. */
  getCodings: getCodingsFromProposal,

  /** The dictionary draft a proposal saves, for `buildSavePayload`. */
  toDraft: makeDraftFromProposal,

  /** An entry's certain columns, then its guessed ones. */
  getColumns,

  /** An entry's column names, each once, in the order they were read. */
  getColumnNames,

  /** Each of an entry's column names with the datasets it comes from. */
  getColumnSources,

  /** Every dataset a proposal was learned from, each once. */
  getDatasetIds,

  /** An entry's listed values across its columns, most rows first. */
  getValuesSeen,

  /** The lowest and highest value across an entry's number columns. */
  getNumberRange,

  /** The proposal with one entry renamed, exactly as typed. */
  renameEntry,

  /**
   * Each included entry whose name the save RPC would refuse: blank, or the
   * same as another included entry's ignoring case and spaces, by key.
   */
  getEntryNameIssues,

  /** The proposal with one entry's kind changed. */
  setEntryKind,

  /** The proposal with one entry included in, or left out of, the save. */
  setEntryIncluded,

  /** The proposal with one entry's description typed by the user. */
  setEntryDescription,

  /** The proposal with a suggested description, unless one was typed. */
  suggestEntryDescription,

  /** The proposal with an entry's guessed columns split into entries. */
  keepApart,

  /**
   * The proposal with the model's meaning matches joined as guesses. A
   * match naming an unknown entry, or joining two columns of one dataset,
   * is ignored.
   */
  applyMeaningMatches,

  /** The labels with an entry for every value of every code list. */
  withDefaultLabels,

  /** The label of one value of one code list. */
  getValueLabel,

  /** The labels with one value's label typed by the user. */
  setValueLabel,

  /** The labels with one value marked as a missing answer, or not. */
  setValueMissing,

  /** The labels with the model's suggestions filled in, never over typing. */
  applyLabelSuggestions,

  /** The labels with one code list accepted by the user. */
  acceptCodeList,

  /** Whether a code list is Labeled, Suggested, or To do. */
  getCodeListStatus,

  /** How many values have no label, and in which lists. */
  getUnlabeledValues,
};
```

`DictionaryProposal.ts`:

```ts
/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  DictionaryProposalCodeList,
  DictionaryProposalCodeListStatus,
  DictionaryProposalCodings,
  DictionaryProposalEntry,
  DictionaryProposalEntryNameIssue,
  DictionaryProposalLabels,
  DictionaryProposalLabelSuggestions,
  DictionaryProposalMeaningMatch,
  DictionaryProposalSuggestionReason,
  DictionaryProposalT,
  DictionaryProposalValueLabel,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

export { DictionaryProposalModule as DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/DictionaryProposalModule.ts";

/** Public namespace for a dictionary learned from datasets, before saving. */
export namespace DictionaryProposal {
  export type T = DictionaryProposalT;
  export type Entry = DictionaryProposalEntry;
  export type EntryNameIssue = DictionaryProposalEntryNameIssue;
  export type SuggestionReason = DictionaryProposalSuggestionReason;
  export type CodeList = DictionaryProposalCodeList;
  export type Codings = DictionaryProposalCodings;
  export type ValueLabel = DictionaryProposalValueLabel;
  export type Labels = DictionaryProposalLabels;
  export type CodeListStatus = DictionaryProposalCodeListStatus;
  export type MeaningMatch = DictionaryProposalMeaningMatch;
  export type LabelSuggestions = DictionaryProposalLabelSuggestions;
}
```

- [ ] **Step 4:** `pnpm vitest run shared/models/dataDictionaries`. Expected: PASS. Then `pnpm type-check:deno`. Expected: no errors (everything under `shared/` must type-check in Deno).

- [ ] **Step 5: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore shared/models/dataDictionaries/DictionaryProposal
pnpm exec eslint --fix shared/models/dataDictionaries/DictionaryProposal
git add shared/models/dataDictionaries/DictionaryProposal
git commit -m "feat(data-dictionaries): add the proposal module and its review edits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The suggestions prompt, shared by the edge route and the offline model

One module holds everything both model paths need, the way `chatTitlePrompt.ts` does for chat titles: the request schema the route validates, the exact text a consent covers (the browser hashes it into the ack token and the route hashes it again), the messages, the JSON schemas the offline model decodes against, and the parsers the browser runs on either reply. This settles spec section 18, open decision 3: suggestions get their own small route, not the Pi agent proxy.

**Files:**
- Create: `shared/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts`
- Test: `shared/agent/dictionarySuggestions/dictionarySuggestionsPrompt.test.ts`

- [ ] **Step 1: Write the failing test**

`dictionarySuggestionsPrompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_PROMPT_ID,
  DictionarySuggestionsRequestSchema,
  isDictionarySuggestionsPromptId,
  parseDictionaryLabelSuggestions,
  parseDictionaryMeaningMatches,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";
import type {
  DictionarySuggestionColumn,
  DictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";

const GENDER: DictionarySuggestionColumn = {
  name: "GENDER",
  otherNames: ["sex"],
  kind: "categorical",
  values: ["1", "2", "9"],
};

describe("dictionarySuggestionsPrompt", () => {
  it("serves dictionary-suggestions-v1 and refuses any other id", () => {
    expect(isDictionarySuggestionsPromptId(DICTIONARY_SUGGESTIONS_PROMPT_ID)).toBe(true);
    expect(isDictionarySuggestionsPromptId("chat-title-v1")).toBe(false);
  });

  it("asks for labels in the locale, with the column's names and codes", () => {
    const [system, user] = buildDictionarySuggestionsMessages({
      task: "labels",
      locale: "es",
      column: GENDER,
    });
    expect(system?.content).toContain("You label the coded values");
    expect(user?.content).toContain("Locale: es");
    expect(user?.content).toContain('"values":["1","2","9"]');
  });

  it("asks which columns record the same thing", () => {
    const [system] = buildDictionarySuggestionsMessages({
      task: "matches",
      locale: "en",
      columns: [GENDER, { ...GENDER, name: "sex_at_birth" }],
    });
    expect(system?.content).toContain("record the same thing");
  });

  it("reads labels from a reply wrapped in prose, keeping only the list's values", () => {
    const reply = `Here you go:
{"labels":[{"value":1,"label":" Male ","isMissing":false},{"value":"7","label":"Other","isMissing":false},{"value":"2","label":"","isMissing":false}],"description":"Sex recorded at intake."}`;
    expect(parseDictionaryLabelSuggestions(reply, ["1", "2", "9"])).toEqual({
      labels: [{ value: "1", label: "Male", isMissing: false }],
      description: "Sex recorded at intake.",
    });
  });

  it("returns nothing for a reply without JSON", () => {
    expect(parseDictionaryLabelSuggestions("I am not sure.", ["1"])).toBeUndefined();
    expect(parseDictionaryMeaningMatches("No matches.", ["a", "b"])).toBeUndefined();
  });

  it("keeps matches between two different entries it was asked about", () => {
    const reply = JSON.stringify({
      matches: [
        { name: "mmr_status", sameAs: "vax_status" },
        { name: "dob", sameAs: "vax_status" },
        { name: "vax_status", sameAs: "vax_status" },
      ],
    });
    expect(
      parseDictionaryMeaningMatches(reply, ["vax_status", "mmr_status"]),
    ).toEqual([{ name: "mmr_status", sameAs: "vax_status" }]);
  });

  it("writes the text a consent covers in one key order, whatever order it arrived in", () => {
    const shuffled: DictionarySuggestionsRequest = {
      locale: "en",
      column: { values: ["1"], kind: "categorical", otherNames: [], name: "GENDER" },
      task: "labels",
    };
    expect(stringifyDictionarySuggestionsRequest(shuffled)).toBe(
      '{"task":"labels","locale":"en","column":{"name":"GENDER","otherNames":[],"kind":"categorical","values":["1"]}}',
    );
  });

  it("refuses a matches request with fewer than two columns", () => {
    const parsed = DictionarySuggestionsRequestSchema.safeParse({
      task: "matches",
      locale: "en",
      columns: [GENDER],
    });
    expect(parsed.success).toBe(false);
  });
});
```

- [ ] **Step 2:** `pnpm vitest run shared/agent/dictionarySuggestions`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

`dictionarySuggestionsPrompt.ts`:

```ts
import { z } from "zod";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.ts";

/** Prompt versions the `chat` edge function serves. A shipped one is frozen. */
export const DICTIONARY_SUGGESTIONS_PROMPT_IDS = [
  "dictionary-suggestions-v1",
] as const;

/** The prompt version the browser asks for. */
export const DICTIONARY_SUGGESTIONS_PROMPT_ID = "dictionary-suggestions-v1";

/** The most tokens one suggestion reply may use, online or offline. */
export const DICTIONARY_SUGGESTIONS_MAX_TOKENS = 800;

const MAX_LABEL_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 300;

const NameSchema = z.string().min(1).max(200);
const LocaleSchema = z.string().min(1).max(35);

const SuggestionColumnSchema = z.object({
  name: NameSchema,
  otherNames: z.array(NameSchema).max(50),
  kind: z.enum(["categorical", "ordered", "number", "date", "text", "identifier"]),
  values: z.array(z.string().max(200)).max(50),
});

/**
 * What the browser asks the suggestion model for: labels for one coded
 * column, or which columns record the same thing. The `chat` edge route
 * validates request bodies with it.
 */
export const DictionarySuggestionsRequestSchema = z.discriminatedUnion(
  "task",
  [
    z.object({
      task: z.literal("labels"),
      locale: LocaleSchema,
      column: SuggestionColumnSchema,
    }),
    z.object({
      task: z.literal("matches"),
      locale: LocaleSchema,
      columns: z.array(SuggestionColumnSchema).min(2).max(300),
    }),
  ],
);

/**
 * One column as the suggestion model sees it: its name, the other names it
 * goes by, its kind, and its codes when it is coded. Never its rows.
 */
export type DictionarySuggestionColumn = z.infer<typeof SuggestionColumnSchema>;

/** A suggestion request, for either model. */
export type DictionarySuggestionsRequest = z.infer<
  typeof DictionarySuggestionsRequestSchema
>;

/** One message sent to either model. */
export type DictionarySuggestionsMessage = {
  role: "system" | "user";
  content: string;
};

const LABELS_SYSTEM_PROMPT = [
  "You label the coded values of one column in a dataset, for a data dictionary.",
  "Each value is a code exactly as stored in the data. Give each one the label a reader should see, in the requested locale.",
  "Mark a value as missing when it stands for an unknown, missing, or refused answer.",
  "Also write one sentence describing what the column records.",
  "Use only the names and values given. When you cannot tell what a code means, leave its label empty.",
  'Reply with JSON only: {"labels":[{"value":"1","label":"Male","isMissing":false}],"description":"..."}',
].join(" ");

const MATCHES_SYSTEM_PROMPT = [
  "You find columns that record the same thing under different names, for a data dictionary.",
  "Each column comes from a dataset, and coded columns list some of their values.",
  "Report a pair only when both columns clearly record the same fact, such as dob and birth_date, or vax_status and mmr_status.",
  "Never pair columns that only share a word, or that record different facts with the same codes.",
  'Reply with JSON only: {"matches":[{"name":"mmr_status","sameAs":"vax_status"}]}, or {"matches":[]} when there are none.',
].join(" ");

const LABELS_JSON_SCHEMA = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          label: { type: "string" },
          isMissing: { type: "boolean" },
        },
        required: ["value", "label", "isMissing"],
        additionalProperties: false,
      },
    },
    description: { type: "string" },
  },
  required: ["labels", "description"],
  additionalProperties: false,
};

const MATCHES_JSON_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, sameAs: { type: "string" } },
        required: ["name", "sameAs"],
        additionalProperties: false,
      },
    },
  },
  required: ["matches"],
  additionalProperties: false,
};

const LabelsReplySchema = z.object({
  labels: z
    .array(
      z.object({
        value: z.coerce.string(),
        label: z.string(),
        isMissing: z.boolean().catch(false),
      }),
    )
    .catch([]),
  description: z.string().catch(""),
});

const MatchesReplySchema = z.object({
  matches: z
    .array(z.object({ name: z.string(), sameAs: z.string() }))
    .catch([]),
});

function _toColumnText(
  column: Readonly<DictionarySuggestionColumn>,
): DictionarySuggestionColumn {
  return {
    name: column.name,
    otherNames: [...column.otherNames],
    kind: column.kind,
    values: [...column.values],
  };
}

/**
 * The exact text a consent to send one request covers. The browser hashes
 * it into the consent's ack token and the `chat` route hashes it again to
 * check that token, so its keys are written in one fixed order.
 */
export function stringifyDictionarySuggestionsRequest(
  request: Readonly<DictionarySuggestionsRequest>,
): string {
  return request.task === "labels"
    ? JSON.stringify({
        task: "labels",
        locale: request.locale,
        column: _toColumnText(request.column),
      })
    : JSON.stringify({
        task: "matches",
        locale: request.locale,
        columns: request.columns.map(_toColumnText),
      });
}

/** Whether the `chat` edge function serves this suggestion prompt version. */
export function isDictionarySuggestionsPromptId(value: string): boolean {
  return (DICTIONARY_SUGGESTIONS_PROMPT_IDS as readonly string[]).includes(
    value,
  );
}

/** The messages that ask either model for one request's suggestions. */
export function buildDictionarySuggestionsMessages(
  request: Readonly<DictionarySuggestionsRequest>,
): DictionarySuggestionsMessage[] {
  const isLabels = request.task === "labels";
  const input = isLabels
    ? { column: request.column }
    : { columns: request.columns };
  return [
    {
      role: "system",
      content: isLabels ? LABELS_SYSTEM_PROMPT : MATCHES_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Locale: ${request.locale}\n${JSON.stringify(input)}`,
    },
  ];
}

/**
 * The JSON Schema an offline model's reply is constrained to, so a small
 * model cannot return malformed JSON.
 */
export function getDictionarySuggestionsJsonSchema(
  task: DictionarySuggestionsRequest["task"],
): object {
  return task === "labels" ? LABELS_JSON_SCHEMA : MATCHES_JSON_SCHEMA;
}

function _readJsonObject(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return undefined;
  }
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/**
 * The labels in a model's reply, for the values that list holds only, with
 * empty labels dropped and long ones cut. Undefined when the reply holds no
 * readable JSON.
 */
export function parseDictionaryLabelSuggestions(
  reply: string,
  values: readonly string[],
): DictionaryProposal.LabelSuggestions | undefined {
  const parsed = LabelsReplySchema.safeParse(_readJsonObject(reply));
  if (!parsed.success) {
    return undefined;
  }
  const knownValues = new Set(values.map(ColumnProfile.normalizeValue));
  const labels = parsed.data.labels
    .filter((item) => {
      const isKnown = knownValues.has(ColumnProfile.normalizeValue(item.value));
      return isKnown && item.label.trim() !== "";
    })
    .map((item) => {
      const label = item.label.trim().slice(0, MAX_LABEL_LENGTH);
      return { value: item.value, label, isMissing: item.isMissing };
    });
  const description = parsed.data.description
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH);
  return { labels, description };
}

/**
 * The meaning matches in a model's reply between two different entries it
 * was asked about. Undefined when the reply holds no readable JSON.
 */
export function parseDictionaryMeaningMatches(
  reply: string,
  names: readonly string[],
): DictionaryProposal.MeaningMatch[] | undefined {
  const parsed = MatchesReplySchema.safeParse(_readJsonObject(reply));
  if (!parsed.success) {
    return undefined;
  }
  const knownNames = new Set(names);
  return parsed.data.matches
    .filter((match) => {
      return (
        knownNames.has(match.name) &&
        knownNames.has(match.sameAs) &&
        match.name !== match.sameAs
      );
    })
    .map((match) => {
      return { name: match.name, sameAs: match.sameAs };
    });
}
```

- [ ] **Step 4:** Run the test again. Expected: PASS (8 tests). Then `pnpm type-check:deno`. Expected: no errors.

- [ ] **Step 5: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore shared/agent/dictionarySuggestions
pnpm exec eslint --fix shared/agent/dictionarySuggestions
git add shared/agent/dictionarySuggestions
git commit -m "feat(data-dictionaries): add the dictionary suggestions prompt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The online suggestions route

A small route on the existing `chat` edge function, like `PostChatTitle`. Adding a route to an existing function changes no `config.toml`, so it needs no new `[functions.*]` block. Like `PostExtractMeasurements`, it refuses a request unless its ack token proves the user consented to send exactly that request (Task 10 asks for the consent).

**Files:**
- Create: `supabase/functions/chat/PostDictionarySuggestions/PostDictionarySuggestions.ts`
- Test: `supabase/functions/chat/PostDictionarySuggestions/PostDictionarySuggestions.test.ts`
- Modify: `supabase/functions/chat/ChatRoutes.ts`
- Modify: `supabase/functions/chat/ChatRoutes.types.ts`

- [ ] **Step 1: Write the failing test**

`PostDictionarySuggestions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";

const { sendOpenRouterRequestMock, assertMeetsMinAppRoleMock, verifyAckTokenMock } =
  vi.hoisted(() => {
    return {
      sendOpenRouterRequestMock: vi.fn(),
      assertMeetsMinAppRoleMock: vi.fn(),
      verifyAckTokenMock: vi.fn(),
    };
  });

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  return {
    POST: () => {
      const handler = {
        action: (action: unknown) => {
          return { state: { action } };
        },
        bodySchema: () => {
          return handler;
        },
      };
      return handler;
    },
  };
});

vi.mock(
  "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts",
  () => {
    return { sendOpenRouterRequest: sendOpenRouterRequestMock };
  },
);

vi.mock("@sbfn/_shared/assertMeetsMinAppRole.ts", () => {
  return { assertMeetsMinAppRole: assertMeetsMinAppRoleMock };
});

vi.mock("@sbfn/_shared/privacy/verifyAckToken.ts", () => {
  return { verifyAckToken: verifyAckTokenMock };
});

vi.stubGlobal("Deno", {
  env: {
    get: () => {
      return "test-openrouter-key";
    },
  },
});

const { PostDictionarySuggestions } = await import(
  "@sbfn/chat/PostDictionarySuggestions/PostDictionarySuggestions.ts"
);
const { stringifyDictionarySuggestionsRequest } = await import(
  "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts"
);
const { hashTextPayload } = await import("$/utils/privacy/sessionSecretUtils.ts");

const REQUEST: DictionarySuggestionsRequest = {
  task: "labels",
  locale: "en",
  column: {
    name: "GENDER",
    otherNames: [],
    kind: "categorical",
    values: ["1", "2"],
  },
};

async function _callRoute(promptId: string): Promise<unknown> {
  return await PostDictionarySuggestions.state.action({
    body: { request: REQUEST, ackToken: "ack-token" },
    pathParams: { workspaceId: "workspace-id", promptId },
    supabaseClient: {},
    user: { id: "user-id" },
  } as never);
}

describe("PostDictionarySuggestions", () => {
  beforeEach(() => {
    sendOpenRouterRequestMock.mockReset();
    assertMeetsMinAppRoleMock.mockReset();
    sendOpenRouterRequestMock.mockResolvedValue({ text: '{"labels":[]}' });
    assertMeetsMinAppRoleMock.mockResolvedValue(undefined);
    verifyAckTokenMock.mockReset();
    verifyAckTokenMock.mockResolvedValue({ valid: true });
  });

  it("returns the model's reply to a Data Sources editor", async () => {
    await expect(_callRoute("dictionary-suggestions-v1")).resolves.toEqual({
      reply: '{"labels":[]}',
    });
    expect(assertMeetsMinAppRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({ app: "data_sources", minRole: "editor" }),
    );
  });

  it("checks the consent covers exactly the request it got", async () => {
    await _callRoute("dictionary-suggestions-v1");
    expect(verifyAckTokenMock).toHaveBeenCalledWith({
      token: "ack-token",
      expectedWorkspaceId: "workspace-id",
      expectedUserId: "user-id",
      expectedPayloadHash: await hashTextPayload(
        stringifyDictionarySuggestionsRequest(REQUEST),
      ),
    });
  });

  it("refuses a request the user did not consent to, before calling the model", async () => {
    verifyAckTokenMock.mockResolvedValue({ valid: false, reason: "hash_mismatch" });
    await expect(_callRoute("dictionary-suggestions-v1")).rejects.toMatchObject({
      httpCode: 400,
    });
    expect(sendOpenRouterRequestMock).not.toHaveBeenCalled();
  });

  it("refuses an unknown prompt version before calling the model", async () => {
    await expect(_callRoute("dictionary-suggestions-v0")).rejects.toMatchObject({
      httpCode: 400,
    });
    expect(sendOpenRouterRequestMock).not.toHaveBeenCalled();
  });

  it("refuses someone who cannot edit Data Sources before calling the model", async () => {
    assertMeetsMinAppRoleMock.mockRejectedValue(
      Object.assign(new Error("Forbidden"), { httpCode: 403 }),
    );
    await expect(_callRoute("dictionary-suggestions-v1")).rejects.toMatchObject({
      httpCode: 403,
    });
    expect(sendOpenRouterRequestMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** `pnpm vitest run supabase/functions/chat/PostDictionarySuggestions`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the route**

`PostDictionarySuggestions.ts`:

```ts
import { assertMeetsMinAppRole } from "@sbfn/_shared/assertMeetsMinAppRole.ts";
import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { verifyAckToken } from "@sbfn/_shared/privacy/verifyAckToken.ts";
import { sendOpenRouterRequest } from "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts";
import { z } from "zod";
import { DATA_AGENT_MODEL_ROSTER } from "$/agent/DataAgentModelRoster.ts";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_MAX_TOKENS,
  DictionarySuggestionsRequestSchema,
  isDictionarySuggestionsPromptId,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";
import { getAppURL } from "$/env/getAppURL.ts";
import { hashTextPayload } from "$/utils/privacy/sessionSecretUtils.ts";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";

const openRouterApiKey = Deno.env.get("OPEN_ROUTER_API_KEY");

/**
 * Refuses the request unless the user consented to sending exactly this
 * request. The browser always asks first, so a missing or mismatched
 * acknowledgment is never a normal request.
 */
async function _assertConsented(
  options: Readonly<{
    ackToken: string;
    request: DictionarySuggestionsRequest;
    workspaceId: string;
    userId: string;
  }>,
): Promise<void> {
  const result = await verifyAckToken({
    token: options.ackToken,
    expectedWorkspaceId: options.workspaceId,
    expectedUserId: options.userId,
    expectedPayloadHash: await hashTextPayload(
      stringifyDictionarySuggestionsRequest(options.request),
    ),
  });
  if (!result.valid) {
    throw new AvaHTTPError(
      `UNAPPROVED_DATA_TRANSFER: consent failed verification: ${result.reason}`,
      BAD_REQUEST,
    );
  }
}

/**
 * Suggests labels for one coded column, or the columns that record the same
 * thing, for a Data Sources editor learning a dictionary from datasets. The
 * browser sends column names, kinds, and the codes of short coded columns,
 * with proof the user agreed to send them; rows never reach this route. It
 * answers with the data agent's primary model and returns the raw reply,
 * which the browser reads with the same parser it uses for the offline
 * model.
 */
export const PostDictionarySuggestions = POST({
  path: "/:workspaceId/dictionary-suggestions/:promptId",
  schema: { workspaceId: z.uuid(), promptId: z.string() },
})
  .bodySchema({
    request: DictionarySuggestionsRequestSchema,
    ackToken: z.string().min(1),
  })
  .action(async ({ pathParams, body, supabaseClient, user }) => {
    if (!isDictionarySuggestionsPromptId(pathParams.promptId)) {
      throw new AvaHTTPError(
        `Unknown dictionary suggestions prompt "${pathParams.promptId}". Reload the page.`,
        BAD_REQUEST,
      );
    }
    if (!openRouterApiKey) {
      throw new Error("OPEN_ROUTER_API_KEY environment variable is not set");
    }
    await assertMeetsMinAppRole({
      supabaseClient,
      workspaceId: pathParams.workspaceId,
      app: "data_sources",
      minRole: "editor",
    });
    await _assertConsented({
      ackToken: body.ackToken,
      request: body.request,
      workspaceId: pathParams.workspaceId,
      userId: user.id,
    });
    const { text } = await sendOpenRouterRequest({
      requestBody: {
        model: DATA_AGENT_MODEL_ROSTER.primary.openRouterId,
        messages: buildDictionarySuggestionsMessages(body.request),
        max_tokens: DICTIONARY_SUGGESTIONS_MAX_TOKENS,
        temperature: 0,
      },
      apiKey: openRouterApiKey,
      referer: getAppURL(),
    });
    return { reply: text };
  });
```

- [ ] **Step 4: Register the route.** In `ChatRoutes.ts` add the import and the route:

```ts
import { PostDictionarySuggestions } from "@sbfn/chat/PostDictionarySuggestions/PostDictionarySuggestions.ts";
```

```ts
  "/:workspaceId/dictionary-suggestions/:promptId": {
    POST: PostDictionarySuggestions,
  },
```

In `ChatRoutes.types.ts` add the import, the path to the tuple after `"/:workspaceId/extract-measurements"`, and its shape to the map:

```ts
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";
```

```ts
    "/:workspaceId/dictionary-suggestions/:promptId",
```

```ts
    "/:workspaceId/dictionary-suggestions/:promptId": {
      POST: {
        pathParams: { workspaceId: string; promptId: string };
        body: {
          request: DictionarySuggestionsRequest;
          /** Proof the user agreed to send exactly `request`. */
          ackToken: string;
        };
        returnType: { reply: string };
      };
    };
```

- [ ] **Step 5:** `pnpm vitest run supabase/functions/chat`. Expected: PASS, including the 5 new tests. Then `pnpm type-check:deno` and `pnpm exec tsc -b --force --noEmit`. Expected: no errors. (`src/types/http-api.types.ts` picks the new route up from `ChatAPI`; nothing to add there.)

- [ ] **Step 6: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore supabase/functions/chat/PostDictionarySuggestions supabase/functions/chat/ChatRoutes.ts supabase/functions/chat/ChatRoutes.types.ts
pnpm exec eslint --fix supabase/functions/chat/PostDictionarySuggestions supabase/functions/chat/ChatRoutes.ts supabase/functions/chat/ChatRoutes.types.ts
git add supabase/functions/chat/PostDictionarySuggestions supabase/functions/chat/ChatRoutes.ts supabase/functions/chat/ChatRoutes.types.ts
git commit -m "feat(data-dictionaries): add the online dictionary suggestions route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Profiling datasets through the QETL query layer

Profiling runs in the browser on DuckDB-WASM through `WorkspaceQuerySession.runQuery`, the same entry point the Data Summary tab (`DatasetQueryClient`) and the offline agent's lookups use, so it works for uploads, live connections, virtual datasets, and offline-only datasets alike. It follows `profileOfflineDatasets`'s shape: one summary query per dataset, then one query for the values of short columns.

**Files:**
- Create: `src/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql.ts`
- Test: `src/lib/dataDictionaries/ColumnProfileSql/__tests__/ColumnProfileSql.test.ts`
- Test: `src/lib/dataDictionaries/ColumnProfileSql/__tests__/ColumnProfileSql.executed.test.ts`
- Create: `src/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns.ts`
- Test: `src/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns.test.ts`

`ColumnProfileSql` has two test files (a unit test and an executed one), so both live in its `__tests__/` directory, per `docs/rules/testing.md`.

- [ ] **Step 1: Write the failing unit test**

`__tests__/ColumnProfileSql.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET = { id: uuid<Dataset.Id>(), name: "Bronx line list" };

describe("ColumnProfileSql", () => {
  it("quotes hostile dataset and column names", () => {
    const sql = ColumnProfileSql.buildSummarySql({
      datasetId: DATASET.id,
      columns: [{ name: 'a"b', dataType: "bigint" }],
    });
    expect(sql).toContain('count("a""b") AS "non_null_0"');
    expect(sql).toContain(`FROM "${DATASET.id}"`);
  });

  it("tries text columns as dates and takes number columns' ranges", () => {
    const sql = ColumnProfileSql.buildSummarySql({
      datasetId: DATASET.id,
      columns: [
        { name: "onset", dataType: "varchar" },
        { name: "age", dataType: "bigint" },
        { name: "reported", dataType: "date" },
      ],
    });
    expect(sql).toContain('try_strptime("onset"');
    expect(sql).toContain('CAST(min("age") AS DOUBLE) AS "min_1"');
    expect(sql).not.toContain('"dates_2"');
    expect(sql).not.toContain('"min_2"');
  });

  it("lists only short columns of a type that can hold codes", () => {
    const indexes = ColumnProfileSql.getListedColumnIndexes({
      columns: [
        { name: "GENDER", dataType: "bigint" },
        { name: "notes", dataType: "varchar" },
        { name: "reported", dataType: "date" },
      ],
      summaryRow: { distinct_0: 3n, distinct_1: 500n, distinct_2: 2n },
    });
    expect([...indexes]).toEqual([0]);
  });

  it("drops a column's values when it turns out to have more than 50", () => {
    const valueRows = Array.from({ length: 51 }, (_unused, index) => {
      return { column_index: 0, value: `v${index}`, row_count: 1n };
    });
    const [profile] = ColumnProfileSql.makeColumnProfilesFromRows({
      dataset: DATASET,
      columns: [{ name: "county", dataType: "varchar" }],
      summaryRow: { row_count: 60n, non_null_0: 60n, distinct_0: 55n },
      valueRows,
      listedColumnIndexes: new Set([0]),
    });
    expect(profile?.values).toBeUndefined();
    expect(profile?.distinctCount).toBe(55);
  });

  it("reads counts that come back as bigints and turns dates into a share", () => {
    const [profile] = ColumnProfileSql.makeColumnProfilesFromRows({
      dataset: DATASET,
      columns: [{ name: "onset", dataType: "varchar" }],
      summaryRow: { row_count: 10n, non_null_0: 8n, distinct_0: 8n, dates_0: 6n },
      valueRows: [],
      listedColumnIndexes: new Set(),
    });
    expect(profile).toMatchObject({
      datasetId: DATASET.id,
      datasetName: "Bronx line list",
      rowCount: 10,
      nonNullCount: 8,
      dateShare: 0.75,
      values: undefined,
    });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/lib/dataDictionaries/ColumnProfileSql`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the SQL module**

`ColumnProfileSql.ts`:

```ts
import { makeBucketMap } from "@avandar/utils";
import { quoteSqlIdentifier } from "@avandar/utils/sql";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** A dataset column to profile: its queryable name and its type. */
export type ProfiledColumn = { name: string; dataType: AvaDataType.T };

/** The summary query's one row: counts and ranges keyed by column index. */
export type ColumnSummaryRow = Record<string, unknown>;

/** One row of the values query: one value of one column, and its rows. */
export type ColumnValueRow = {
  column_index: unknown;
  value: unknown;
  row_count: unknown;
};

/** Types whose values are listed. Dates and times are never coded. */
const LISTABLE_TYPES: ReadonlySet<AvaDataType.T> = new Set([
  "bigint",
  "double",
  "varchar",
  "boolean",
]);

/** Approximate distinct counts can be a few off, so list a little past 50. */
const APPROXIMATE_COUNT_MARGIN = 10;

/** The date formats a text column's values are tried against. */
const DATE_FORMATS_SQL =
  "['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d', '%m-%d-%Y', '%d-%m-%Y']";

function _buildSummaryParts(column: ProfiledColumn, index: number): string[] {
  const name = quoteSqlIdentifier(column.name);
  const parts = [
    `count(${name}) AS "non_null_${index}"`,
    `approx_count_distinct(${name}) AS "distinct_${index}"`,
  ];
  if (column.dataType === "varchar") {
    parts.push(
      `count(try_strptime(${name}, ${DATE_FORMATS_SQL})) AS "dates_${index}"`,
    );
  }
  if (column.dataType === "bigint" || column.dataType === "double") {
    parts.push(
      `CAST(min(${name}) AS DOUBLE) AS "min_${index}"`,
      `CAST(max(${name}) AS DOUBLE) AS "max_${index}"`,
    );
  }
  return parts;
}

function buildSummarySql(
  options: Readonly<{
    datasetId: Dataset.Id;
    columns: readonly ProfiledColumn[];
  }>,
): string {
  const parts = [
    'count(*) AS "row_count"',
    ...options.columns.flatMap(_buildSummaryParts),
  ];
  return `SELECT ${parts.join(", ")} FROM ${quoteSqlIdentifier(options.datasetId)}`;
}

function buildValuesSql(
  options: Readonly<{
    datasetId: Dataset.Id;
    columns: ReadonlyArray<{ index: number; name: string }>;
  }>,
): string {
  const table = quoteSqlIdentifier(options.datasetId);
  const selects = options.columns.map(({ index, name }) => {
    const column = quoteSqlIdentifier(name);
    const text = `trim(CAST(${column} AS VARCHAR))`;
    return `SELECT ${index} AS "column_index", ${text} AS "value", count(*) AS "row_count" FROM ${table} WHERE ${column} IS NOT NULL AND ${text} <> '' GROUP BY 2`;
  });
  const limit = ColumnProfile.MAX_LISTED_VALUES + 1;
  return [
    `SELECT "column_index", "value", "row_count" FROM (${selects.join(" UNION ALL ")})`,
    `QUALIFY row_number() OVER (PARTITION BY "column_index" ORDER BY "row_count" DESC, "value") <= ${limit}`,
    `ORDER BY "column_index", "row_count" DESC, "value"`,
  ].join(" ");
}

function _toNumber(value: unknown): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return typeof value === "number" ? value : Number(value ?? 0);
}

function _toOptionalNumber(value: unknown): number | undefined {
  return value === null || value === undefined ? undefined : _toNumber(value);
}

function getListedColumnIndexes(
  options: Readonly<{
    columns: readonly ProfiledColumn[];
    summaryRow: ColumnSummaryRow;
  }>,
): Set<number> {
  const limit = ColumnProfile.MAX_LISTED_VALUES + APPROXIMATE_COUNT_MARGIN;
  const indexes = options.columns.flatMap((column, index) => {
    const distinct = _toNumber(options.summaryRow[`distinct_${index}`]);
    const isShort = distinct > 0 && distinct <= limit;
    return LISTABLE_TYPES.has(column.dataType) && isShort ? [index] : [];
  });
  return new Set(indexes);
}

function makeColumnProfilesFromRows(
  options: Readonly<{
    dataset: Readonly<{ id: Dataset.Id; name: string }>;
    columns: readonly ProfiledColumn[];
    summaryRow: ColumnSummaryRow;
    valueRows: readonly ColumnValueRow[];
    listedColumnIndexes: ReadonlySet<number>;
  }>,
): ColumnProfile.T[] {
  const { dataset, summaryRow } = options;
  const rowsByIndex = makeBucketMap(options.valueRows, {
    keyFn: (row) => {
      return _toNumber(row.column_index);
    },
  });
  return options.columns.map((column, index): ColumnProfile.T => {
    const listed = (rowsByIndex.get(index) ?? []).map((row) => {
      return { value: String(row.value), rowCount: _toNumber(row.row_count) };
    });
    const values =
      options.listedColumnIndexes.has(index) &&
      listed.length <= ColumnProfile.MAX_LISTED_VALUES
        ? listed
        : undefined;
    const nonNullCount = _toNumber(summaryRow[`non_null_${index}`]);
    const dates = _toOptionalNumber(summaryRow[`dates_${index}`]);
    const min = _toOptionalNumber(summaryRow[`min_${index}`]);
    const max = _toOptionalNumber(summaryRow[`max_${index}`]);
    return {
      datasetId: dataset.id,
      datasetName: dataset.name,
      columnName: column.name,
      dataType: column.dataType,
      rowCount: _toNumber(summaryRow.row_count),
      nonNullCount,
      distinctCount: values
        ? values.length
        : _toNumber(summaryRow[`distinct_${index}`]),
      values,
      dateShare:
        dates === undefined || nonNullCount === 0
          ? undefined
          : dates / nonNullCount,
      numberRange:
        min === undefined || max === undefined ? undefined : { min, max },
    };
  });
}

/**
 * The DuckDB SQL that profiles a dataset's columns, and the step that turns
 * its rows into `ColumnProfile`s. Two queries per dataset: a summary (rows,
 * values, approximate distinct counts, number ranges, and how many text
 * values read as dates), then the values and row counts of every column
 * short enough to be coded. Used by `profileDatasetColumns`.
 */
export const ColumnProfileSql = {
  /** One query for every column's counts and ranges. */
  buildSummarySql,

  /** One query for the values of the given columns, at most 51 each. */
  buildValuesSql,

  /** The columns whose values are worth listing, from the summary row. */
  getListedColumnIndexes,

  /** The profiles the two queries' rows describe. */
  makeColumnProfilesFromRows,
};
```

- [ ] **Step 4:** Run the unit test again. Expected: PASS (5 tests).

- [ ] **Step 5: Write the executed test** (it runs the SQL on a real DuckDB and checks the kinds the profiles get, spec section 15)

`__tests__/ColumnProfileSql.executed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import { withDuckDb } from "../../../../../tests/integration/queries/executedDuckDb";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  ColumnValueRow,
  ProfiledColumn,
} from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * This suite lives under `src/` beside the module it tests. It reuses
 * `withDuckDb`, whose DuckDB driver is Node-only, as the other executed
 * tests do.
 */
const DATASET = { id: uuid<Dataset.Id>(), name: "Line list" };

const COLUMNS: readonly ProfiledColumn[] = [
  { name: "case_id", dataType: "varchar" },
  { name: "GENDER", dataType: "bigint" },
  { name: "onset", dataType: "varchar" },
  { name: "ses_cat", dataType: "bigint" },
];

async function _createLineList(connection: DuckDBConnection): Promise<void> {
  await connection.run(`
    CREATE TABLE "${DATASET.id}" AS
    SELECT
      'NY-' || lpad(CAST(i AS VARCHAR), 3, '0') AS case_id,
      CASE WHEN i % 8 = 0 THEN 9 WHEN i % 2 = 0 THEN 2 ELSE 1 END AS "GENDER",
      strftime(DATE '2026-02-01' + CAST(i AS INTEGER), '%m/%d/%Y') AS onset,
      (i % 4) + 1 AS ses_cat
    FROM range(1, 25) AS t(i)
  `);
}

async function _profile(connection: DuckDBConnection): Promise<ColumnProfile.T[]> {
  const summary = await connection.runAndReadAll(
    ColumnProfileSql.buildSummarySql({ datasetId: DATASET.id, columns: COLUMNS }),
  );
  const summaryRow = summary.getRowObjects()[0] ?? {};
  const listedColumnIndexes = ColumnProfileSql.getListedColumnIndexes({
    columns: COLUMNS,
    summaryRow,
  });
  const values = await connection.runAndReadAll(
    ColumnProfileSql.buildValuesSql({
      datasetId: DATASET.id,
      columns: [...listedColumnIndexes].map((index) => {
        return { index, name: COLUMNS[index]?.name ?? "" };
      }),
    }),
  );
  return ColumnProfileSql.makeColumnProfilesFromRows({
    dataset: DATASET,
    columns: COLUMNS,
    summaryRow,
    valueRows: values.getRowObjects() as ColumnValueRow[],
    listedColumnIndexes,
  });
}

describe("ColumnProfileSql on a real DuckDB", () => {
  it("profiles a line list into the kinds a dictionary needs", async () => {
    await withDuckDb(async (connection) => {
      await _createLineList(connection);
      const profiles = await _profile(connection);
      expect(profiles.map(ColumnProfile.getEntryKind)).toEqual([
        "identifier",
        "categorical",
        "date",
        "ordered",
      ]);
    });
  });

  it("lists a coded column's values with their row counts, most rows first", async () => {
    await withDuckDb(async (connection) => {
      await _createLineList(connection);
      const [, gender] = await _profile(connection);
      expect(gender?.values).toEqual([
        { value: "1", rowCount: 12 },
        { value: "2", rowCount: 9 },
        { value: "9", rowCount: 3 },
      ]);
    });
  });
});
```

`getRowObjects()` returns `Record<string, DuckDBValue>[]`; the `as ColumnValueRow[]` widens it to the loose row type the module reads, which the compiler cannot prove from DuckDB's value union.

- [ ] **Step 6:** `pnpm vitest run --config vitest.executed.config.ts src/lib/dataDictionaries/ColumnProfileSql`. Expected: PASS (2 tests). If `try_strptime` with a list of formats is refused, the bundled DuckDB is older than expected: check `@duckdb/duckdb-wasm`'s DuckDB version and fall back to `coalesce(try_strptime(x, f1), try_strptime(x, f2), ...)`.

- [ ] **Step 7: Write the failing profiler test**

`profileDatasetColumns/profileDatasetColumns.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

const { profileDatasetColumns } = await import("./profileDatasetColumns");

const WORKSPACE_ID = uuid<Workspace.Id>();
const DATASET = { id: uuid<Dataset.Id>(), name: "Erie cases" };

describe("profileDatasetColumns", () => {
  beforeEach(() => {
    runQueryMock.mockReset();
  });

  it("reads a short column's values with a second query", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        data: [{ row_count: 3n, non_null_0: 3n, distinct_0: 2n }],
      })
      .mockResolvedValueOnce({
        data: [
          { column_index: 0, value: "M", row_count: 2n },
          { column_index: 0, value: "F", row_count: 1n },
        ],
      });
    const [profile] = await profileDatasetColumns({
      workspaceId: WORKSPACE_ID,
      dataset: DATASET,
      columns: [{ name: "sex", dataType: "varchar" }],
    });
    expect(profile?.values).toEqual([
      { value: "M", rowCount: 2 },
      { value: "F", rowCount: 1 },
    ]);
    expect(runQueryMock).toHaveBeenCalledTimes(2);
    expect(runQueryMock.mock.calls[1]?.[0]).toMatchObject({
      workspaceId: WORKSPACE_ID,
    });
  });

  it("skips the values query when no column is short enough", async () => {
    runQueryMock.mockResolvedValueOnce({
      data: [{ row_count: 900n, non_null_0: 900n, distinct_0: 880n }],
    });
    const [profile] = await profileDatasetColumns({
      workspaceId: WORKSPACE_ID,
      dataset: DATASET,
      columns: [{ name: "notes", dataType: "varchar" }],
    });
    expect(profile?.values).toBeUndefined();
    expect(runQueryMock).toHaveBeenCalledTimes(1);
  });

  it("runs nothing for a dataset without columns", async () => {
    await expect(
      profileDatasetColumns({ workspaceId: WORKSPACE_ID, dataset: DATASET, columns: [] }),
    ).resolves.toEqual([]);
    expect(runQueryMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8:** `pnpm vitest run src/lib/dataDictionaries/profileDatasetColumns`. Expected: FAIL, module not found.

- [ ] **Step 9: Write the profiler**

`profileDatasetColumns.ts`:

```ts
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  ColumnValueRow,
  ProfiledColumn,
} from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";

/**
 * Profiles one dataset's columns on this device through the QETL query
 * layer, so it works for any dataset the workspace can query, offline-only
 * ones included. Rows stay in DuckDB; only counts, ranges, and the values
 * of short columns come back. Used when a dictionary is learned from
 * datasets.
 */
export async function profileDatasetColumns(
  options: Readonly<{
    workspaceId: Workspace.Id;
    dataset: Readonly<{ id: Dataset.Id; name: string }>;
    columns: readonly ProfiledColumn[];
  }>,
): Promise<ColumnProfile.T[]> {
  const { workspaceId, dataset, columns } = options;
  if (columns.length === 0) {
    return [];
  }
  const summary = await WorkspaceQuerySession.runQuery({
    workspaceId,
    rawSql: ColumnProfileSql.buildSummarySql({ datasetId: dataset.id, columns }),
  });
  const summaryRow = summary.data[0] ?? {};
  const listedColumnIndexes = ColumnProfileSql.getListedColumnIndexes({
    columns,
    summaryRow,
  });
  const listedColumns = [...listedColumnIndexes].flatMap((index) => {
    const column = columns[index];
    return column ? [{ index, name: column.name }] : [];
  });
  const valueRows =
    listedColumns.length === 0
      ? []
      : (
          await WorkspaceQuerySession.runQuery<ColumnValueRow>({
            workspaceId,
            rawSql: ColumnProfileSql.buildValuesSql({
              datasetId: dataset.id,
              columns: listedColumns,
            }),
          })
        ).data;
  return ColumnProfileSql.makeColumnProfilesFromRows({
    dataset,
    columns,
    summaryRow,
    valueRows,
    listedColumnIndexes,
  });
}
```

- [ ] **Step 10:** `pnpm vitest run src/lib/dataDictionaries`. Expected: PASS. `pnpm exec tsc -b --force --noEmit`. Expected: no errors.

- [ ] **Step 11: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/lib/dataDictionaries
pnpm exec eslint --fix src/lib/dataDictionaries
git add src/lib/dataDictionaries
git commit -m "feat(data-dictionaries): profile dataset columns on the device

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Where suggestions run, what they send, and consent

One module decides which model answers (the hosted model, the offline model, or none), builds the two requests from a proposal, asks for consent, and makes the call, the way `requestChatSessionTitle` does for chat titles. It reuses `resolveChatRuntimeMode`, so suggestions run wherever chat would: on the offline model when offline mode is on or the browser is offline with the bundle downloaded, online otherwise.

Consent is the chat's own gate, `decideIfDataCanCrossBoundary`: it runs the PII and bias detectors, opens `ConsentModal` when needed, records the decision in the browser-local consent log (`ConsentAuditEntryClient`), and mints an ack token into `PendingAcks`. The chat keeps no "already agreed" flag; it asks per send. `approveRequest` follows the PDF table assistant (`runRegionModelAssist`): the first online send of a create flow sets `explicitConsentRequired`, so the prompt always shows; after the user agrees, later sends in the same flow still pass the detectors (a prompt only when something looks personal) and are still logged. The ack token travels with the request and the route checks it (Task 8). On the offline model nothing leaves the device, so, as in the chat (`runOfflineDataAgentTurn`), nothing is asked. A new consent context, `dictionary_suggestions`, labels these sends in the workspace privacy log.

What may be sent is decided once, in the shared prompt module, and the `chat` route refuses a request that breaks it (Task 7): codes only on a `categorical` or `ordered` column, never on a column whose name or other names hold one of `IDENTIFYING_WORDS` (checked with `isIdentifyingColumnName`), at most `DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES` codes per column in a matches request, and at most `DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH` characters of consent text. This module imports those exports and never keeps a list of its own, so the browser and the route cannot drift apart.

**Files:**
- Create: `src/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions.ts`
- Test: `src/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions.test.ts`
- Modify: `src/models/privacy/ConsentAuditEntry/ConsentAuditEntry.constants.ts`
- Modify: `src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx` (one union member)
- Modify: `src/views/WorkspaceSettingsPage/PrivacyLogTab/ConsentLogPanel.tsx` (one label)
- Modify: `src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.ts` (docstring only)

- [ ] **Step 1: Write the failing test**

`DictionarySuggestions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DictionarySuggestionsRequestSchema,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { uuid } from "$/lib/uuid";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

const { decideMock, consumeAckMock } = vi.hoisted(() => {
  return { decideMock: vi.fn(), consumeAckMock: vi.fn() };
});

vi.mock("@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary", () => {
  return { decideIfDataCanCrossBoundary: decideMock };
});

vi.mock("@/components/privacy/privacy-helpers/PendingAcks", () => {
  return { PendingAcks: { consumeAckForText: consumeAckMock } };
});

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  codes: readonly string[] | undefined,
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  return {
    datasetId,
    datasetName: "Bronx",
    columnName,
    dataType: "varchar",
    rowCount: 400,
    nonNullCount: 400,
    distinctCount: codes?.length ?? 400,
    values: codes?.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _firstCodeList(proposal: DictionaryProposal.T): DictionaryProposal.CodeList {
  const [codeList] = DictionaryProposal.getCodings(proposal).codeLists;
  if (!codeList) {
    throw new Error("The proposal has no code lists.");
  }
  return codeList;
}

const REQUEST = {
  task: "labels" as const,
  locale: "en",
  column: { name: "GENDER", otherNames: [], kind: "categorical" as const, values: ["1"] },
};

describe("DictionarySuggestions.getModelFromRuntimeState", () => {
  it.each([
    [{ navigatorOnLine: true, isOfflineModeOn: true, isBundleDownloaded: true }, "on_device"],
    [{ navigatorOnLine: false, isOfflineModeOn: false, isBundleDownloaded: true }, "on_device"],
    [{ navigatorOnLine: false, isOfflineModeOn: false, isBundleDownloaded: false }, "unavailable"],
    [{ navigatorOnLine: true, isOfflineModeOn: false, isBundleDownloaded: false }, "online"],
  ] as const)("runs suggestions %j on %s", (state, model) => {
    expect(DictionarySuggestions.getModelFromRuntimeState(state)).toBe(model);
  });
});

describe("DictionarySuggestions.requestReply", () => {
  it("asks the offline model, constrained to the labels JSON schema", async () => {
    const completeOnDevice = vi.fn().mockResolvedValue({ text: '{"labels":[]}' });
    const post = vi.fn();
    const reply = await DictionarySuggestions.requestReply({
      model: "on_device",
      workspaceId: "workspace-id",
      request: REQUEST,
      post,
      completeOnDevice,
    });
    expect(reply).toBe('{"labels":[]}');
    expect(post).not.toHaveBeenCalled();
    expect(completeOnDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: LocalChatModel.OFFLINE_BUNDLE.answer,
        jsonSchema: expect.objectContaining({ required: ["labels", "description"] }),
      }),
    );
  });

  it("posts to the suggestions route online", async () => {
    const post = vi.fn().mockResolvedValue({ reply: '{"matches":[]}' });
    const reply = await DictionarySuggestions.requestReply({
      model: "online",
      ackToken: "ack-1",
      workspaceId: "workspace-id",
      request: REQUEST,
      post,
      completeOnDevice: vi.fn(),
    });
    expect(reply).toBe('{"matches":[]}');
    expect(post).toHaveBeenCalledWith({
      route: "chat/:workspaceId/dictionary-suggestions/:promptId",
      pathParams: { workspaceId: "workspace-id", promptId: "dictionary-suggestions-v1" },
      body: { request: REQUEST, ackToken: "ack-1" },
    });
  });
});

describe("DictionarySuggestions.approveRequest", () => {
  const WORKSPACE_ID = uuid<Workspace.Id>();
  const TEXT = stringifyDictionarySuggestionsRequest(REQUEST);

  beforeEach(() => {
    decideMock.mockReset();
    consumeAckMock.mockReset();
  });

  it("always asks on the first send and returns the consent's ack token", async () => {
    decideMock.mockResolvedValue({ approved: true, payload: { text: TEXT } });
    consumeAckMock.mockResolvedValue("ack-1");
    const ackToken = await DictionarySuggestions.approveRequest({
      request: REQUEST,
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      isConsentConfirmed: false,
    });
    expect(ackToken).toBe("ack-1");
    expect(decideMock).toHaveBeenCalledWith({
      text: TEXT,
      values: ["1"],
      sourceColumn: "GENDER",
      context: "dictionary_suggestions",
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      explicitConsentRequired: true,
    });
    expect(consumeAckMock).toHaveBeenCalledWith(TEXT);
  });

  it("only asks again when something looks personal once the user agreed", async () => {
    decideMock.mockResolvedValue({ approved: true, payload: { text: TEXT } });
    consumeAckMock.mockResolvedValue("ack-2");
    await DictionarySuggestions.approveRequest({
      request: REQUEST,
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      isConsentConfirmed: true,
    });
    expect(decideMock).toHaveBeenCalledWith(
      expect.objectContaining({ explicitConsentRequired: false }),
    );
  });

  it("returns nothing when the user declines", async () => {
    decideMock.mockResolvedValue({ approved: false, reason: "cancelled" });
    const ackToken = await DictionarySuggestions.approveRequest({
      request: REQUEST,
      workspaceId: WORKSPACE_ID,
      userId: "user-id",
      isConsentConfirmed: false,
    });
    expect(ackToken).toBeUndefined();
    expect(consumeAckMock).not.toHaveBeenCalled();
  });
});

describe("DictionarySuggestions requests", () => {
  it("asks for one list's labels with the entry's names and codes", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("GENDER", ["1", "2", "9"]),
      _column("sex", ["M", "F", "U"], ERIE_ID),
    ]);
    const request = DictionarySuggestions.makeLabelsRequestFromCodeList({
      proposal,
      codeList: _firstCodeList(proposal),
      locale: "en",
    });
    expect(request).toEqual({
      task: "labels",
      locale: "en",
      column: {
        name: "gender",
        otherNames: ["GENDER", "sex"],
        kind: "categorical",
        values: ["1", "2", "9"],
      },
    });
  });

  it("never sends the values of a column named after a person", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("first_name", ["Ana", "Luis"]),
    ]);
    expect(
      DictionarySuggestions.makeLabelsRequestFromCodeList({
        proposal,
        codeList: _firstCodeList(proposal),
        locale: "en",
      }),
    ).toBeUndefined();
  });

  it("asks for meaning matches only across two or more datasets", () => {
    const single = DictionaryProposal.fromColumnProfiles([
      _column("vax_status", ["U", "P", "F"]),
      _column("case_id", undefined),
    ]);
    expect(
      DictionarySuggestions.makeMatchesRequestFromProposal({ proposal: single, locale: "en" }),
    ).toBeUndefined();
  });

  it("sends codes for coded entries only when asking for matches", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("vax_status", ["U", "P", "F"]),
      _column("case_id", undefined),
      _column("mmr_status", ["0", "1", "2"], ERIE_ID),
    ]);
    const request = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal,
      locale: "en",
    });
    const valuesByName =
      request?.task === "matches"
        ? Object.fromEntries(
            request.columns.map((column) => {
              return [column.name, column.values];
            }),
          )
        : {};
    expect(valuesByName).toEqual({
      vax_status: ["U", "P", "F"],
      case_id: [],
      mmr_status: ["0", "1", "2"],
    });
  });

  it("drops columns from a matches request until the route would take it", () => {
    const profiles = Array.from({ length: 300 }, (_item, index) => {
      const datasetId = index % 2 === 0 ? BRONX_ID : ERIE_ID;
      const codes = Array.from({ length: 12 }, (_code, codeIndex) => {
        return `${"x".repeat(30)}_${index}_${codeIndex}`;
      });
      return _column(`coded_column_number_${index}`, codes, datasetId);
    });
    const request = DictionarySuggestions.makeMatchesRequestFromProposal({
      proposal: DictionaryProposal.fromColumnProfiles(profiles),
      locale: "en",
    });
    expect(request && DictionarySuggestionsRequestSchema.safeParse(request).success).toBe(true);
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/lib/dataDictionaries/DictionarySuggestions`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the module**

`DictionarySuggestions.ts`:

```ts
import { prop } from "@avandar/utils";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES,
  DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH,
  DICTIONARY_SUGGESTIONS_MAX_TOKENS,
  DICTIONARY_SUGGESTIONS_PROMPT_ID,
  getDictionarySuggestionsJsonSchema,
  isIdentifyingColumnName,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { resolveChatRuntimeMode } from "@/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import type {
  DictionarySuggestionColumn,
  DictionarySuggestionsMessage,
  DictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Where dictionary suggestions run: the hosted model, the offline model on
 * this device, or nowhere (offline without the offline models).
 */
export type DictionarySuggestionModel = "online" | "on_device" | "unavailable";

/** Posts one request to the online suggestions route. */
export type PostDictionarySuggestions = (options: {
  route: "chat/:workspaceId/dictionary-suggestions/:promptId";
  pathParams: {
    workspaceId: string;
    promptId: typeof DICTIONARY_SUGGESTIONS_PROMPT_ID;
  };
  body: { request: DictionarySuggestionsRequest; ackToken: string };
}) => Promise<{ reply: string }>;

/** Runs one completion on the offline model. */
export type CompleteDictionarySuggestionsOnDevice = (request: {
  modelId: LocalChatModel.Id;
  messages: DictionarySuggestionsMessage[];
  maxTokens: number;
  temperature: number;
  jsonSchema: object;
}) => Promise<{ text: string }>;

// The words that keep a column's values here, the codes per column of a
// matches request, and the longest request all come from the shared
// prompt module, because the `chat` route refuses a request that breaks
// them. Never define a second list here.
const MAX_OTHER_NAMES = 50;
const MAX_MATCH_COLUMNS = 300;

function getModelFromRuntimeState(
  options: Readonly<{
    navigatorOnLine: boolean;
    isOfflineModeOn: boolean;
    isBundleDownloaded: boolean;
  }>,
): DictionarySuggestionModel {
  if (resolveChatRuntimeMode(options).kind === "local") {
    return "on_device";
  }
  return options.navigatorOnLine ? "online" : "unavailable";
}

async function approveRequest(
  options: Readonly<{
    request: DictionarySuggestionsRequest;
    workspaceId: Workspace.Id;
    userId: string;
    /** True once the user agreed to an earlier send in this flow. */
    isConsentConfirmed: boolean;
  }>,
): Promise<string | undefined> {
  const { request } = options;
  const text = stringifyDictionarySuggestionsRequest(request);
  const columns = request.task === "labels" ? [request.column] : request.columns;
  const consent = await decideIfDataCanCrossBoundary({
    text,
    values: columns.flatMap((column) => {
      return column.values;
    }),
    sourceColumn: request.task === "labels" ? request.column.name : undefined,
    context: "dictionary_suggestions",
    workspaceId: options.workspaceId,
    userId: options.userId,
    // The first send in a flow always asks, even when nothing looks personal.
    explicitConsentRequired: !options.isConsentConfirmed,
  });
  // A rephrasing suggestion would change what was agreed to, so only the
  // request as written counts as approved.
  if (!consent.approved || consent.payload.text !== text) {
    return undefined;
  }
  return await PendingAcks.consumeAckForText(text);
}

async function requestReply(
  options: Readonly<
    {
      workspaceId: string;
      request: DictionarySuggestionsRequest;
      post: PostDictionarySuggestions;
      completeOnDevice: CompleteDictionarySuggestionsOnDevice;
    } & ({ model: "on_device" } | { model: "online"; ackToken: string })
  >,
): Promise<string> {
  if (options.model === "on_device") {
    const completion = await options.completeOnDevice({
      modelId: LocalChatModel.OFFLINE_BUNDLE.answer,
      messages: buildDictionarySuggestionsMessages(options.request),
      maxTokens: DICTIONARY_SUGGESTIONS_MAX_TOKENS,
      temperature: 0,
      jsonSchema: getDictionarySuggestionsJsonSchema(options.request.task),
    });
    return completion.text;
  }
  const response = await options.post({
    route: "chat/:workspaceId/dictionary-suggestions/:promptId",
    pathParams: {
      workspaceId: options.workspaceId,
      promptId: DICTIONARY_SUGGESTIONS_PROMPT_ID,
    },
    body: { request: options.request, ackToken: options.ackToken },
  });
  return response.reply;
}

/** The route's rule: codes only on a coded column not named after a person. */
function _canSendValues(column: Readonly<DictionarySuggestionColumn>): boolean {
  return (
    DataDictionary.isCodedKind(column.kind) &&
    ![column.name, ...column.otherNames].some(isIdentifyingColumnName)
  );
}

function _makeColumn(
  entry: Readonly<DictionaryProposal.Entry>,
  values: string[],
): DictionarySuggestionColumn {
  const otherNames = DictionaryProposal.getColumnNames(entry).filter((name) => {
    return name !== entry.name;
  });
  return {
    name: entry.name,
    otherNames: otherNames.slice(0, MAX_OTHER_NAMES),
    kind: entry.kind,
    values,
  };
}

function makeLabelsRequestFromCodeList(
  options: Readonly<{
    proposal: DictionaryProposal.T;
    codeList: DictionaryProposal.CodeList;
    locale: string;
  }>,
): DictionarySuggestionsRequest | undefined {
  const entries = options.proposal.entries.filter((entry) => {
    return options.codeList.entryKeys.includes(entry.key);
  });
  const [first] = entries;
  const names = [...new Set(entries.flatMap(DictionaryProposal.getColumnNames))];
  if (!first || names.some(isIdentifyingColumnName)) {
    return undefined;
  }
  const values = options.codeList.values
    .map(prop("value"))
    .slice(0, ColumnProfile.MAX_LISTED_VALUES);
  // A shared list is labeled once for every entry that uses it.
  const column =
    entries.length > 1
      ? { ..._makeColumn(first, values), name: options.codeList.name, otherNames: names.slice(0, MAX_OTHER_NAMES) }
      : _makeColumn(first, values);
  // An entry renamed after a person keeps its codes here too.
  return _canSendValues(column)
    ? { task: "labels", locale: options.locale, column }
    : undefined;
}

function makeMatchesRequestFromProposal(
  options: Readonly<{ proposal: DictionaryProposal.T; locale: string }>,
): DictionarySuggestionsRequest | undefined {
  // A meaning match only ever joins columns of two different datasets.
  if (DictionaryProposal.getDatasetIds(options.proposal).length < 2) {
    return undefined;
  }
  const columns = options.proposal.entries
    .filter(prop("isIncluded"))
    .slice(0, MAX_MATCH_COLUMNS)
    .map((entry) => {
      const column = _makeColumn(entry, []);
      const values = _canSendValues(column)
        ? DictionaryProposal.getValuesSeen(entry)
            .slice(0, DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES)
            .map(prop("value"))
        : [];
      return { ...column, values };
    });
  return _fitMatchesRequest({
    task: "matches",
    locale: options.locale,
    columns,
  });
}

/**
 * The request with its last columns dropped until its consent text fits
 * `DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH`, which the route enforces.
 * Undefined when fewer than two columns are left.
 */
function _fitMatchesRequest(
  request: Extract<DictionarySuggestionsRequest, { task: "matches" }>,
): DictionarySuggestionsRequest | undefined {
  if (request.columns.length < 2) {
    return undefined;
  }
  const length = stringifyDictionarySuggestionsRequest(request).length;
  if (length <= DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH) {
    return request;
  }
  return _fitMatchesRequest({
    ...request,
    columns: request.columns.slice(0, -1),
  });
}

/**
 * AI suggestions for a dictionary being learned from datasets, online and
 * offline alike. Only column names, kinds, and the codes of short coded
 * columns are sent, never rows, and never the values of a column named
 * after a person or a contact detail. Online sends go through the chat's
 * consent gate first. Used by the create flow's Review and Label values
 * steps.
 */
export const DictionarySuggestions = {
  /** Which model answers, the same way chat decides where a turn runs. */
  getModelFromRuntimeState,

  /**
   * Asks the user, through the chat's consent gate, to send one request
   * online, and returns the ack token the route checks. Undefined when the
   * user declines.
   */
  approveRequest,

  /**
   * Runs one request on the given model and returns its raw reply. Online
   * it needs the ack token `approveRequest` returned.
   */
  requestReply,

  /**
   * The request for one code list's labels. Undefined when the list's
   * columns look like they identify people, so their values stay here.
   */
  makeLabelsRequestFromCodeList,

  /**
   * The request for meaning matches across a proposal's entries. Undefined
   * when it holds fewer than two datasets, where no match could apply.
   */
  makeMatchesRequestFromProposal,
};
```

- [ ] **Step 4: Add the consent context.** In `ConsentAuditEntry.constants.ts`, add `"dictionary_suggestions",` as the last member of `ConsentAuditContexts`. In `decideIfDataCanCrossBoundary.tsx`, add `| "dictionary_suggestions"` to `CrossBoundaryContext`. In `ConsentLogPanel.tsx`'s `useContextLabels`, add `dictionary_suggestions: t\`Dictionary suggestions\`,`. The audit rows live in IndexedDB as plain values, so a new context needs no Dexie version.

- [ ] **Step 5: Name the new caller.** `resolveChatRuntimeMode`'s docstring lists its callers, so add one sentence to it, after "...when the cloud request fails.":

```ts
 * Data dictionary suggestions also call it, through
 * `DictionarySuggestions.getModelFromRuntimeState`, so they run wherever a
 * chat turn would.
```

- [ ] **Step 6:** `pnpm vitest run src/lib/dataDictionaries src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode src/clients/privacy src/views/WorkspaceSettingsPage`. Expected: PASS. `pnpm exec tsc -b --force --noEmit`. Expected: no errors.

- [ ] **Step 7: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/lib/dataDictionaries/DictionarySuggestions src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.ts src/models/privacy/ConsentAuditEntry/ConsentAuditEntry.constants.ts src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx src/views/WorkspaceSettingsPage/PrivacyLogTab/ConsentLogPanel.tsx
pnpm exec eslint --fix src/lib/dataDictionaries/DictionarySuggestions src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.ts src/models/privacy/ConsentAuditEntry/ConsentAuditEntry.constants.ts src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx src/views/WorkspaceSettingsPage/PrivacyLogTab/ConsentLogPanel.tsx
git add src/lib/dataDictionaries/DictionarySuggestions src/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode.ts src/models/privacy/ConsentAuditEntry/ConsentAuditEntry.constants.ts src/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary.tsx src/views/WorkspaceSettingsPage/PrivacyLogTab/ConsentLogPanel.tsx
git commit -m "feat(data-dictionaries): run dictionary suggestions online with consent, or offline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The create flow's state

The flow keeps everything in one reducer, so each step component only renders state and dispatches actions, and the whole flow's behavior is unit-testable without React. It also remembers the user's answer to the first online suggestion (`suggestionConsent`), because the chat's consent gate keeps no such flag: once the user agrees, later sends in the flow stop forcing the prompt; once the user declines, the flow sends nothing more online. The step is kept in this state rather than in a `step` search param: every step after Pick needs the profile held in memory, so a reloaded or shared step URL would open a step with nothing to show (see Refinements).

**Files:**
- Create: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer.ts`
- Test: `src/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer.test.ts`

- [ ] **Step 1: Write the failing test**

`newDictionaryReducer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import {
  makeInitialNewDictionaryState,
  newDictionaryReducer,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { NewDictionaryState } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

const DATASET_ID = uuid<Dataset.Id>();

function _column(columnName: string, codes: readonly string[]): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings line list",
    columnName,
    dataType: "varchar",
    rowCount: 200,
    nonNullCount: 200,
    distinctCount: codes.length,
    values: codes.map((value) => {
      return { value, rowCount: 50 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  _column("GENDER", ["1", "2", "9"]),
  _column("hosp_yn", ["Y", "N"]),
]);

function _read(state: NewDictionaryState): NewDictionaryState {
  return newDictionaryReducer(state, {
    type: "datasets_read",
    proposal: PROPOSAL,
    defaultName: "Kings line list codes",
  });
}

function _codeListKeys(): string[] {
  return DictionaryProposal.getCodings(PROPOSAL).codeLists.map((codeList) => {
    return codeList.key;
  });
}

describe("newDictionaryReducer", () => {
  it("starts at Pick, or at Review with the dataset picked when opened from it", () => {
    expect(makeInitialNewDictionaryState(undefined).step).toBe("pick");
    expect(makeInitialNewDictionaryState(DATASET_ID)).toMatchObject({
      step: "review",
      originDatasetId: DATASET_ID,
      pickedDatasetIds: [DATASET_ID],
    });
  });

  it("toggles a dataset in and out of the pick", () => {
    const picked = newDictionaryReducer(makeInitialNewDictionaryState(undefined), {
      type: "toggle_dataset",
      datasetId: DATASET_ID,
    });
    expect(picked.pickedDatasetIds).toEqual([DATASET_ID]);
    const unpicked = newDictionaryReducer(picked, {
      type: "toggle_dataset",
      datasetId: DATASET_ID,
    });
    expect(unpicked.pickedDatasetIds).toEqual([]);
  });

  it("opens Review with the first code list selected once datasets are read", () => {
    const state = _read(makeInitialNewDictionaryState(undefined));
    expect(state.step).toBe("review");
    expect(state.selectedCodeListKey).toBe(_codeListKeys()[0]);
    expect(state.name).toBe("Kings line list codes");
    expect(Object.keys(state.labels)).toEqual(_codeListKeys());
  });

  it("keeps a typed name and typed labels when the datasets are read again", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const codeListKey = _codeListKeys()[0] ?? "";
    const typed = [
      { type: "set_name", name: "Borough codes" } as const,
      { type: "set_value_label", codeListKey, code: "1", label: "Male" } as const,
    ].reduce(newDictionaryReducer, read);
    const again = _read(typed);
    expect(again.name).toBe("Borough codes");
    expect(
      DictionaryProposal.getValueLabel(again.labels, { codeListKey, code: "1" })?.label,
    ).toBe("Male");
  });

  it("accepts a list and selects the next, staying on the last one", () => {
    const [firstKey = "", secondKey = ""] = _codeListKeys();
    const read = _read(makeInitialNewDictionaryState(undefined));
    const accepted = newDictionaryReducer(read, {
      type: "accept_code_list",
      codeListKey: firstKey,
    });
    expect(accepted.selectedCodeListKey).toBe(secondKey);
    expect(accepted.labels[firstKey]?.isAccepted).toBe(true);
    const last = newDictionaryReducer(accepted, {
      type: "accept_code_list",
      codeListKey: secondKey,
    });
    expect(last.selectedCodeListKey).toBe(secondKey);
  });

  it("fills a single-entry list's entry with the suggested description", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const entryKey = PROPOSAL.entries[0]?.key;
    const suggested = newDictionaryReducer(read, {
      type: "labels_suggested",
      codeListKey: _codeListKeys()[0] ?? "",
      entryKey,
      suggestions: {
        labels: [{ value: "1", label: "Male", isMissing: false }],
        description: "Sex recorded at intake.",
      },
    });
    expect(suggested.proposal?.entries[0]).toMatchObject({
      description: "Sex recorded at intake.",
      isDescriptionSuggested: true,
    });
  });

  it("renames an entry and keeps the labels typed for its list", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const entryKey = PROPOSAL.entries[0]?.key ?? "";
    const codeListKey =
      DictionaryProposal.getCodings(PROPOSAL).codeLists.find((codeList) => {
        return codeList.entryKeys.includes(entryKey);
      })?.key ?? "";
    const renamed = [
      { type: "set_value_label", codeListKey, code: "1", label: "Male" } as const,
      { type: "rename_entry", entryKey, name: "sex_at_intake" } as const,
    ].reduce(newDictionaryReducer, read);
    expect(renamed.proposal?.entries[0]?.name).toBe("sex_at_intake");
    expect(
      DictionaryProposal.getValueLabel(renamed.labels, { codeListKey, code: "1" })?.label,
    ).toBe("Male");
  });

  it("remembers the answer to the first online suggestion", () => {
    const start = makeInitialNewDictionaryState(undefined);
    expect(start.suggestionConsent).toBe("not_asked");
    const approved = newDictionaryReducer(start, {
      type: "suggestion_consent_decided",
      isApproved: true,
    });
    expect(approved.suggestionConsent).toBe("approved");
    const declined = newDictionaryReducer(start, {
      type: "suggestion_consent_decided",
      isApproved: false,
    });
    expect(declined.suggestionConsent).toBe("declined");
  });

  it("goes back to Pick and forgets the origin on Learn from more datasets", () => {
    const state = newDictionaryReducer(
      _read(makeInitialNewDictionaryState(DATASET_ID)),
      { type: "learn_from_more" },
    );
    expect(state).toMatchObject({
      step: "pick",
      originDatasetId: undefined,
      pickedDatasetIds: [DATASET_ID],
    });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the reducer**

`newDictionaryReducer.ts`:

```ts
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The create flow's steps, in order. */
export type NewDictionaryStep = "pick" | "review" | "label" | "save";

/**
 * The user's answer to sending suggestions online, asked on the first
 * online send of the flow and kept until the flow closes.
 */
export type SuggestionConsent = "not_asked" | "approved" | "declined";

/**
 * Everything the create flow holds while someone learns a dictionary from
 * datasets. Nothing is written anywhere until the Save step.
 */
export type NewDictionaryState = {
  step: NewDictionaryStep;
  /** The dataset whose menu opened the flow. While set, there is no Pick. */
  originDatasetId: Dataset.Id | undefined;
  pickedDatasetIds: Dataset.Id[];
  /** Undefined until the picked datasets are read. */
  proposal: DictionaryProposal.T | undefined;
  labels: DictionaryProposal.Labels;
  selectedCodeListKey: string | undefined;
  name: string;
  description: string;
  suggestionConsent: SuggestionConsent;
};

/** Everything the create flow's steps can change. */
export type NewDictionaryAction =
  | { type: "toggle_dataset"; datasetId: Dataset.Id }
  | {
      type: "datasets_read";
      proposal: DictionaryProposal.T;
      defaultName: string;
    }
  | { type: "go_to_step"; step: NewDictionaryStep }
  | { type: "learn_from_more" }
  | { type: "rename_entry"; entryKey: string; name: string }
  | { type: "set_entry_kind"; entryKey: string; kind: DataDictionaryEntry.Kind }
  | { type: "set_entry_included"; entryKey: string; isIncluded: boolean }
  | { type: "keep_apart"; entryKey: string }
  | { type: "set_entry_description"; entryKey: string; description: string }
  | {
      type: "meaning_matches_found";
      matches: readonly DictionaryProposal.MeaningMatch[];
    }
  | { type: "select_code_list"; codeListKey: string }
  | { type: "set_value_label"; codeListKey: string; code: string; label: string }
  | {
      type: "set_value_missing";
      codeListKey: string;
      code: string;
      isMissing: boolean;
    }
  | {
      type: "labels_suggested";
      codeListKey: string;
      /** The one entry using the list, which gets the description. */
      entryKey: string | undefined;
      suggestions: DictionaryProposal.LabelSuggestions;
    }
  | { type: "accept_code_list"; codeListKey: string }
  | { type: "set_name"; name: string }
  | { type: "set_description"; description: string }
  | { type: "suggestion_consent_decided"; isApproved: boolean };

type Handlers = {
  [Type in NewDictionaryAction["type"]]: (
    state: NewDictionaryState,
    action: Extract<NewDictionaryAction, { type: Type }>,
  ) => NewDictionaryState;
};

/** The state with a new proposal, its labels filled in, a list selected. */
function _withProposal(
  state: NewDictionaryState,
  proposal: DictionaryProposal.T,
): NewDictionaryState {
  const { codeLists } = DictionaryProposal.getCodings(proposal);
  const isSelectionKept = codeLists.some((codeList) => {
    return codeList.key === state.selectedCodeListKey;
  });
  return {
    ...state,
    proposal,
    labels: DictionaryProposal.withDefaultLabels(state.labels, codeLists),
    selectedCodeListKey: isSelectionKept
      ? state.selectedCodeListKey
      : codeLists[0]?.key,
  };
}

function _editProposal(
  state: NewDictionaryState,
  edit: (proposal: DictionaryProposal.T) => DictionaryProposal.T,
): NewDictionaryState {
  return state.proposal ? _withProposal(state, edit(state.proposal)) : state;
}

function _toggleDataset(
  datasetIds: readonly Dataset.Id[],
  datasetId: Dataset.Id,
): Dataset.Id[] {
  return datasetIds.includes(datasetId)
    ? datasetIds.filter((current) => {
        return current !== datasetId;
      })
    : [...datasetIds, datasetId];
}

function _acceptAndSelectNext(
  state: NewDictionaryState,
  codeListKey: string,
): NewDictionaryState {
  const keys = state.proposal
    ? DictionaryProposal.getCodings(state.proposal).codeLists.map((codeList) => {
        return codeList.key;
      })
    : [];
  return {
    ...state,
    labels: DictionaryProposal.acceptCodeList(state.labels, codeListKey),
    selectedCodeListKey: keys[keys.indexOf(codeListKey) + 1] ?? codeListKey,
  };
}

function _applySuggestedLabels(
  state: NewDictionaryState,
  action: Extract<NewDictionaryAction, { type: "labels_suggested" }>,
): NewDictionaryState {
  const { codeListKey, entryKey, suggestions } = action;
  const withLabels = {
    ...state,
    labels: DictionaryProposal.applyLabelSuggestions(state.labels, {
      codeListKey,
      suggestions,
    }),
  };
  if (!entryKey || suggestions.description === "") {
    return withLabels;
  }
  return _editProposal(withLabels, (proposal) => {
    return DictionaryProposal.suggestEntryDescription(proposal, {
      entryKey,
      description: suggestions.description,
    });
  });
}

const HANDLERS: Handlers = {
  toggle_dataset: (state, action) => {
    const pickedDatasetIds = _toggleDataset(state.pickedDatasetIds, action.datasetId);
    return { ...state, pickedDatasetIds };
  },
  datasets_read: (state, action) => {
    const name = state.name || action.defaultName;
    return { ..._withProposal(state, action.proposal), step: "review", name };
  },
  go_to_step: (state, action) => {
    return { ...state, step: action.step };
  },
  learn_from_more: (state) => {
    return { ...state, step: "pick", originDatasetId: undefined };
  },
  rename_entry: (state, action) => {
    // Code list keys do not depend on entry names, so labels stay put.
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.renameEntry(proposal, action);
    });
  },
  set_entry_kind: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.setEntryKind(proposal, action);
    });
  },
  set_entry_included: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.setEntryIncluded(proposal, action);
    });
  },
  keep_apart: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.keepApart(proposal, action.entryKey);
    });
  },
  set_entry_description: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.setEntryDescription(proposal, action);
    });
  },
  meaning_matches_found: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.applyMeaningMatches(proposal, action.matches);
    });
  },
  select_code_list: (state, action) => {
    return { ...state, selectedCodeListKey: action.codeListKey };
  },
  set_value_label: (state, action) => {
    return { ...state, labels: DictionaryProposal.setValueLabel(state.labels, action) };
  },
  set_value_missing: (state, action) => {
    return { ...state, labels: DictionaryProposal.setValueMissing(state.labels, action) };
  },
  labels_suggested: _applySuggestedLabels,
  accept_code_list: (state, action) => {
    return _acceptAndSelectNext(state, action.codeListKey);
  },
  set_name: (state, action) => {
    return { ...state, name: action.name };
  },
  set_description: (state, action) => {
    return { ...state, description: action.description };
  },
  suggestion_consent_decided: (state, action) => {
    const suggestionConsent = action.isApproved ? "approved" : "declined";
    return { ...state, suggestionConsent };
  },
};

/**
 * The create flow's state when it opens: at Pick, or at Review with the
 * dataset already picked when the flow was opened from a dataset's menu.
 * `useReducer`'s initializer in `NewDictionaryFromDatasetsView`.
 */
export function makeInitialNewDictionaryState(
  originDatasetId: Dataset.Id | undefined,
): NewDictionaryState {
  return {
    step: originDatasetId ? "review" : "pick",
    originDatasetId,
    pickedDatasetIds: originDatasetId ? [originDatasetId] : [],
    proposal: undefined,
    labels: {},
    selectedCodeListKey: undefined,
    name: "",
    description: "",
    suggestionConsent: "not_asked",
  };
}

/**
 * The create flow's reducer: every change a step makes, from picking a
 * dataset to typing a label. `NewDictionaryFromDatasetsView` owns it and
 * hands its state and dispatch to each step.
 */
export function newDictionaryReducer(
  state: NewDictionaryState,
  action: NewDictionaryAction,
): NewDictionaryState {
  // Each handler takes the action of its own type. TypeScript cannot tie a
  // lookup by `action.type` to that pairing, so the handler is widened here.
  const handler = HANDLERS[action.type] as (
    current: NewDictionaryState,
    currentAction: NewDictionaryAction,
  ) => NewDictionaryState;
  return handler(state, action);
}
```

- [ ] **Step 4:** Run the test again. Expected: PASS (9 tests). `pnpm exec tsc -b --force --noEmit`. Expected: no errors.

- [ ] **Step 5: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp/NewDictionaryFromDatasetsView
pnpm exec eslint --fix src/views/DataManagerApp/NewDictionaryFromDatasetsView
git add src/views/DataManagerApp/NewDictionaryFromDatasetsView
git commit -m "feat(data-dictionaries): add the state of learning a dictionary

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Reading, suggesting, and saving

**As built (review fixes).** The code in the shipped hooks differs from the blocks below in these ways, and Tasks 13 to 18 follow the shipped code: `datasets_read` and `meaning_matches_found` carry `datasetIds` and the reducer drops a reply for datasets that are no longer current (`isSameDatasetSet`); `origin_dataset_unavailable` returns to an empty Pick; `useReadDatasets` passes `onRead(proposal, datasets)` and `useMeaningMatches` passes `onFound(matches, proposal)`; both hooks and `useSuggestLabels` take a `model`, `useDictionarySuggestions` returns it, and `makeLabelsRequestFromCodeList` and `makeMatchesRequestFromProposal` take it to fit the offline model's context window; `approveRequest` returns `{ type: "approved" | "declined" | "ack_missing" }`; `useSuggestLabels` and the flow expose `canSuggestLabels(codeList)`; `createDictionaryFromDraft` throws `DictionaryLeftBehindError` when it cannot remove an empty dictionary; and the flow ignores work that finishes after it unmounts and a second save press in one frame.

The hooks that connect the reducer to the outside world: the datasets to pick from, reading them on the device, the two kinds of AI suggestions, and saving. `createDictionaryFromDraft` holds the one piece with real failure handling, so it is a plain function with its own test. `useDictionarySuggestions` holds the consent rules, so it gets its own test too:

| Model | `suggestionConsent` | What a send does |
| --- | --- | --- |
| `on_device` | any | Runs on the offline model. Nothing is asked, as in the chat. |
| `online` | `not_asked` | Opens the chat's "Send to AI?" prompt. Agree: sends with the ack token and records `approved`. Decline: sends nothing, records `declined`. |
| `online` | `approved` | Goes through the chat's detectors without forcing the prompt, so it asks again only when something looks personal. |
| `online` | `declined` | Sends nothing. The flow shows suggestions as declined and carries on without AI. |
| `unavailable` | any | Refused. The steps already hide the suggestion buttons. |

Meaning matches run automatically after reading, but only when two or more datasets were read, since `makeMatchesRequestFromProposal` builds no request otherwise. So the prompt appears the moment a second dataset is read, or the first time someone presses Suggest labels, whichever comes first.

**Files** (all under `src/views/DataManagerApp/NewDictionaryFromDatasetsView/`):
- Create: `useNewDictionarySources.ts`
- Create: `useDictionarySuggestions/useDictionarySuggestions.ts`
- Test: `useDictionarySuggestions/useDictionarySuggestions.test.ts`
- Create: `useReadDatasets.ts`
- Create: `useMeaningMatches.ts`
- Create: `useSuggestLabels.ts`
- Create: `createDictionaryFromDraft/createDictionaryFromDraft.ts`
- Test: `createDictionaryFromDraft/createDictionaryFromDraft.test.ts`
- Create: `useCreateDictionary.ts`
- Create: `useNewDictionaryFlow.ts`

- [ ] **Step 1: Write the failing test for saving**

`createDictionaryFromDraft.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const { insertMock, saveContentsMock, deleteMock } = vi.hoisted(() => {
  return { insertMock: vi.fn(), saveContentsMock: vi.fn(), deleteMock: vi.fn() };
});

vi.mock(
  "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient",
  () => {
    return {
      DataDictionaryClient: {
        insert: insertMock,
        saveContents: saveContentsMock,
        delete: deleteMock,
      },
    };
  },
);

const { createDictionaryFromDraft } = await import("./createDictionaryFromDraft");

const DICTIONARY_ID = uuid<DataDictionary.Id>();
const DATASET_ID = uuid<Dataset.Id>();
const OPTIONS = {
  workspaceId: uuid<Workspace.Id>(),
  owner: { userId: uuid<User.Id>(), profileId: uuid<UserProfile.Id>() },
  name: "Kings codes",
  description: "",
  datasetIds: [DATASET_ID],
  draft: { entries: [], codeLists: [] },
};

describe("createDictionaryFromDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ id: DICTIONARY_ID, name: "Kings codes" });
    deleteMock.mockResolvedValue(undefined);
  });

  it("creates the dictionary with its sources, then saves its contents into it", async () => {
    saveContentsMock.mockResolvedValue(2);
    await expect(createDictionaryFromDraft(OPTIONS)).resolves.toMatchObject({
      id: DICTIONARY_ID,
    });
    expect(insertMock.mock.calls[0]?.[0]?.data).toMatchObject({
      name: "Kings codes",
      description: undefined,
      createdFromDatasetIds: [DATASET_ID],
    });
    expect(saveContentsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dictionaryId: DICTIONARY_ID }),
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("removes the new dictionary and fails when its contents do not save", async () => {
    saveContentsMock.mockRejectedValue(new Error("save refused"));
    await expect(createDictionaryFromDraft(OPTIONS)).rejects.toThrow("save refused");
    expect(deleteMock).toHaveBeenCalledWith({ id: DICTIONARY_ID });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft`. Expected: FAIL, module not found.

- [ ] **Step 3: Write `createDictionaryFromDraft.ts`**

```ts
import { Model } from "@avandar/models";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Creates a dictionary learned from datasets: the dictionary row, with the
 * datasets it was learned from, then its entries and code lists through the
 * save RPC. These are two writes, so when the second fails the new, empty
 * dictionary is removed again and the error is thrown on, which leaves the
 * user's work in the create flow to retry.
 */
export async function createDictionaryFromDraft(
  options: Readonly<{
    workspaceId: Workspace.Id;
    owner: Readonly<Pick<UserProfile.T, "userId" | "profileId">>;
    name: string;
    description: string;
    datasetIds: readonly Dataset.Id[];
    draft: DataDictionary.Draft;
  }>,
): Promise<DataDictionary.T> {
  const dictionary = await DataDictionaryClient.insert({
    data: Model.make("DataDictionary", {
      workspaceId: options.workspaceId,
      ownerId: options.owner.userId,
      ownerProfileId: options.owner.profileId,
      name: options.name,
      description: options.description || undefined,
      createdFromDatasetIds: [...options.datasetIds],
    }),
  });
  try {
    await DataDictionaryClient.saveContents(
      DataDictionary.buildSavePayload({
        dictionaryId: dictionary.id,
        draft: options.draft,
      }),
    );
  } catch (error) {
    await DataDictionaryClient.delete({ id: dictionary.id }).catch(() => {
      // The save error below is the one worth showing.
      return undefined;
    });
    throw error;
  }
  return dictionary;
}
```

- [ ] **Step 4:** Run the test again. Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for suggestions and consent**

`useDictionarySuggestions.test.ts`:

```ts
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDictionarySuggestions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { SuggestionConsent } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

const mocks = vi.hoisted(() => {
  return { getModel: vi.fn(), approveRequest: vi.fn(), requestReply: vi.fn() };
});

vi.mock("@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions", () => {
  return {
    DictionarySuggestions: {
      getModelFromRuntimeState: mocks.getModel,
      approveRequest: mocks.approveRequest,
      requestReply: mocks.requestReply,
    },
  };
});
vi.mock("@/lib/hooks/browser/useIsOnline/useIsOnline", () => {
  return { useIsOnline: () => true };
});
vi.mock("@/hooks/localChatModels/useIsOfflineModeOn", () => {
  return { useIsOfflineModeOn: () => false };
});
vi.mock("@/hooks/localChatModels/useIsOfflineBundleDownloaded", () => {
  return { useIsOfflineBundleDownloaded: () => false };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: () => ({ id: "workspace-id" }) };
});
vi.mock("@/hooks/users/useCurrentUserProfile", () => {
  return { useCurrentUserProfile: () => [{ userId: "user-id" }] };
});
vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: vi.fn() } };
});
vi.mock("@/stores/OfflineChatEngineStore/OfflineChatEngineStore", () => {
  return { OfflineChatEngineStore: { complete: vi.fn() } };
});

const REQUEST: DictionarySuggestionsRequest = {
  task: "labels",
  locale: "en",
  column: { name: "gender", otherNames: [], kind: "categorical", values: ["1", "2"] },
};

function _render(consent: SuggestionConsent) {
  const onConsentDecided = vi.fn();
  const { result } = renderHook(() => {
    return useDictionarySuggestions({ consent, onConsentDecided });
  });
  return { suggestions: result.current, onConsentDecided };
}

describe("useDictionarySuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getModel.mockReturnValue("online");
    mocks.requestReply.mockResolvedValue("{}");
  });

  it("shows declined online once the user said no, but not offline", () => {
    expect(_render("declined").suggestions.availability).toBe("declined");
    mocks.getModel.mockReturnValue("on_device");
    expect(_render("declined").suggestions.availability).toBe("on_device");
  });

  it("asks nothing on the offline model", async () => {
    mocks.getModel.mockReturnValue("on_device");
    const { suggestions } = _render("not_asked");
    await expect(suggestions.requestReply(REQUEST)).resolves.toBe("{}");
    expect(mocks.approveRequest).not.toHaveBeenCalled();
    expect(mocks.requestReply).toHaveBeenCalledWith(
      expect.objectContaining({ model: "on_device" }),
    );
  });

  it("asks on the first online send, then sends with the ack token", async () => {
    mocks.approveRequest.mockResolvedValue("ack-1");
    const { suggestions, onConsentDecided } = _render("not_asked");
    await expect(suggestions.requestReply(REQUEST)).resolves.toBe("{}");
    expect(mocks.approveRequest).toHaveBeenCalledWith({
      request: REQUEST,
      workspaceId: "workspace-id",
      userId: "user-id",
      isConsentConfirmed: false,
    });
    expect(onConsentDecided).toHaveBeenCalledWith(true);
    expect(mocks.requestReply).toHaveBeenCalledWith(
      expect.objectContaining({ model: "online", ackToken: "ack-1" }),
    );
  });

  it("sends nothing and records the answer when the user declines", async () => {
    mocks.approveRequest.mockResolvedValue(undefined);
    const { suggestions, onConsentDecided } = _render("not_asked");
    await expect(suggestions.requestReply(REQUEST)).resolves.toBeUndefined();
    expect(onConsentDecided).toHaveBeenCalledWith(false);
    expect(mocks.requestReply).not.toHaveBeenCalled();
  });

  it("stops forcing the prompt once agreed, and sends nothing once declined", async () => {
    mocks.approveRequest.mockResolvedValue("ack-2");
    const agreed = _render("approved");
    await agreed.suggestions.requestReply(REQUEST);
    expect(mocks.approveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ isConsentConfirmed: true }),
    );
    expect(agreed.onConsentDecided).not.toHaveBeenCalled();
    mocks.approveRequest.mockClear();
    const declined = _render("declined");
    await expect(declined.suggestions.requestReply(REQUEST)).resolves.toBeUndefined();
    expect(mocks.approveRequest).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions`. Expected: FAIL, module not found.

- [ ] **Step 7: Write the hooks**

`useNewDictionarySources.ts`:

```ts
import { makeBucketMap, prop, where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The datasets a new dictionary can learn from, and their columns. */
export type NewDictionarySources = {
  datasets: Dataset.T[];
  columnsByDatasetId: ReadonlyMap<Dataset.Id, DatasetColumn.T[]>;
  isLoading: boolean;
};

/**
 * The workspace's datasets and every dataset's columns, for the create
 * flow's Pick step and for profiling. Both refetch on mount, so a dataset
 * imported a moment ago is listed with its columns.
 */
export function useNewDictionarySources(): NewDictionarySources {
  const workspace = useCurrentWorkspace();
  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [columns, isLoadingColumns] = DatasetColumnClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const columnsByDatasetId = useMemo(() => {
    return makeBucketMap(columns ?? [], { keyFn: prop("datasetId") });
  }, [columns]);
  return {
    datasets: datasets ?? [],
    columnsByDatasetId,
    isLoading: isLoadingDatasets || isLoadingColumns,
  };
}
```

`useDictionarySuggestions/useDictionarySuggestions.ts`:

```ts
import { APIClient } from "@/clients/APIClient";
import { useIsOfflineBundleDownloaded } from "@/hooks/localChatModels/useIsOfflineBundleDownloaded";
import { useIsOfflineModeOn } from "@/hooks/localChatModels/useIsOfflineModeOn";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { OfflineChatEngineStore } from "@/stores/OfflineChatEngineStore/OfflineChatEngineStore";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DictionarySuggestionModel } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { SuggestionConsent } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

/**
 * Who answers dictionary suggestions in this flow: one of the models, or
 * nobody because the user said no to sending them online.
 */
export type DictionarySuggestionAvailability = DictionarySuggestionModel | "declined";

/**
 * Asks for one suggestion. Resolves to undefined when the user did not let
 * this request go online.
 */
export type RequestSuggestionReply = (
  request: DictionarySuggestionsRequest,
) => Promise<string | undefined>;

type ConsentOptions = {
  consent: SuggestionConsent;
  onConsentDecided: (isApproved: boolean) => void;
};

async function _requestOnline(
  options: Readonly<
    ConsentOptions & {
      request: DictionarySuggestionsRequest;
      workspaceId: Workspace.Id;
      userId: string;
    }
  >,
): Promise<string | undefined> {
  const { consent, request, workspaceId } = options;
  if (consent === "declined") {
    return undefined;
  }
  const ackToken = await DictionarySuggestions.approveRequest({
    request,
    workspaceId,
    userId: options.userId,
    isConsentConfirmed: consent === "approved",
  });
  if (consent === "not_asked") {
    options.onConsentDecided(ackToken !== undefined);
  }
  if (ackToken === undefined) {
    return undefined;
  }
  return await DictionarySuggestions.requestReply({
    model: "online",
    ackToken,
    workspaceId,
    request,
    post: APIClient.post,
    completeOnDevice: OfflineChatEngineStore.complete,
  });
}

/**
 * Which model answers dictionary suggestions right now, kept current as the
 * connection or offline mode changes, and a function that asks it. Online
 * sends go through the chat's consent gate, and the user's first answer is
 * kept for the flow. Used by the create flow's Review and Label values
 * steps.
 */
export function useDictionarySuggestions(options: Readonly<ConsentOptions>): {
  availability: DictionarySuggestionAvailability;
  requestReply: RequestSuggestionReply;
} {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const isOnline = useIsOnline();
  const isOfflineModeOn = useIsOfflineModeOn();
  const isBundleDownloaded = useIsOfflineBundleDownloaded();
  const model = DictionarySuggestions.getModelFromRuntimeState({
    navigatorOnLine: isOnline,
    isOfflineModeOn,
    isBundleDownloaded,
  });
  const isDeclined = model === "online" && options.consent === "declined";
  return {
    availability: isDeclined ? "declined" : model,
    requestReply: (request) => {
      if (model === "on_device") {
        return DictionarySuggestions.requestReply({
          model,
          workspaceId: workspace.id,
          request,
          post: APIClient.post,
          completeOnDevice: OfflineChatEngineStore.complete,
        });
      }
      if (model === "unavailable" || !userProfile) {
        return Promise.reject(new Error("No model can answer suggestions"));
      }
      return _requestOnline({
        ...options,
        request,
        workspaceId: workspace.id,
        userId: userProfile.userId,
      });
    },
  };
}
```

`useReadDatasets.ts`:

```ts
import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { profileDatasetColumns } from "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns";
import { notifyError } from "@/utils/notifications/notify";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ProfiledColumn } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";

/** One dataset to read, with its columns. */
export type ReadableDataset = {
  dataset: Dataset.T;
  columns: readonly DatasetColumn.T[];
};

function _toProfiledColumns(
  columns: readonly DatasetColumn.T[],
): ProfiledColumn[] {
  return [...columns]
    .sort((columnA, columnB) => {
      return columnA.columnIdx - columnB.columnIdx;
    })
    .map((column) => {
      return { name: column.name, dataType: column.dataType };
    });
}

/**
 * Reads datasets on this device, one after another, and groups their
 * columns into a proposal. The create flow calls it when the user reads the
 * datasets they picked, and right away when the flow opens from a
 * dataset's menu.
 */
export function useReadDatasets(
  options: Readonly<{ onRead: (proposal: DictionaryProposal.T) => void }>,
): [read: (datasets: readonly ReadableDataset[]) => void, isReading: boolean] {
  const workspace = useCurrentWorkspace();
  const { t } = useLingui();
  const [read, isReading] = useMutation({
    mutationFn: async (datasets: readonly ReadableDataset[]) => {
      // One dataset at a time: reading one loads it into DuckDB.
      const profiles = await datasets.reduce(
        async (previous, { dataset, columns }) => {
          const done = await previous;
          const profiled = await profileDatasetColumns({
            workspaceId: workspace.id,
            dataset,
            columns: _toProfiledColumns(columns),
          });
          return [...done, ...profiled];
        },
        Promise.resolve<ColumnProfile.T[]>([]),
      );
      return DictionaryProposal.fromColumnProfiles(profiles);
    },
    onSuccess: (proposal) => {
      options.onRead(proposal);
    },
    onError: () => {
      notifyError(
        t`Avandar could not read these datasets. Try again, or pick fewer datasets.`,
      );
    },
  });
  return [read, isReading];
}
```

`useMeaningMatches.ts`:

```ts
import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { parseDictionaryMeaningMatches } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { RequestSuggestionReply } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";

/** Where the search for columns that mean the same thing stands. */
export type MeaningMatchStatus = "idle" | "finding" | "done" | "failed";

/**
 * Asks the suggestion model, once, which columns of different datasets
 * record the same thing, and hands back the matches. A failure is shown by
 * the Review step's status line, not a toast: the matches by name and
 * values are still there. A request the user declined to send finds none.
 */
export function useMeaningMatches(
  options: Readonly<{
    requestReply: RequestSuggestionReply;
    onFound: (matches: DictionaryProposal.MeaningMatch[]) => void;
  }>,
): {
  findMatches: (proposal: DictionaryProposal.T) => void;
  status: MeaningMatchStatus;
} {
  const { i18n } = useLingui();
  const [findMatches, , result] = useMutation({
    mutationFn: async (proposal: DictionaryProposal.T) => {
      const request = DictionarySuggestions.makeMatchesRequestFromProposal({
        proposal,
        locale: i18n.locale,
      });
      if (request?.task !== "matches") {
        return [];
      }
      const names = request.columns.map((column) => {
        return column.name;
      });
      const reply = await options.requestReply(request);
      if (reply === undefined) {
        return [];
      }
      return parseDictionaryMeaningMatches(reply, names) ?? [];
    },
    onSuccess: (matches) => {
      if (matches.length > 0) {
        options.onFound(matches);
      }
    },
    onError: () => {
      // The Review step's status line says the search did not finish.
    },
  });
  const status: MeaningMatchStatus = result.isPending
    ? "finding"
    : result.isError
      ? "failed"
      : result.isSuccess
        ? "done"
        : "idle";
  return { findMatches, status };
}
```

`useSuggestLabels.ts`:

```ts
import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { parseDictionaryLabelSuggestions } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { RequestSuggestionReply } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch } from "react";

/**
 * Asks the suggestion model for one code list's labels and a description
 * for the entry using it, and fills them in as suggestions. Used by the
 * Label values step's Suggest labels button. When the user declines to
 * send the request, nothing is filled in and nothing is shown: the Label
 * values pane already says suggestions are off.
 */
export function useSuggestLabels(
  options: Readonly<{
    proposal: DictionaryProposal.T | undefined;
    requestReply: RequestSuggestionReply;
    dispatch: Dispatch<NewDictionaryAction>;
  }>,
): {
  suggestLabels: (codeList: DictionaryProposal.CodeList) => void;
  suggestingCodeListKey: string | undefined;
} {
  const { t, i18n } = useLingui();
  const [suggestLabels, , result] = useMutation({
    mutationFn: async (codeList: DictionaryProposal.CodeList) => {
      const request = options.proposal
        ? DictionarySuggestions.makeLabelsRequestFromCodeList({
            proposal: options.proposal,
            codeList,
            locale: i18n.locale,
          })
        : undefined;
      if (request?.task !== "labels") {
        throw new Error("This code list's values cannot be sent");
      }
      const reply = await options.requestReply(request);
      if (reply === undefined) {
        return undefined;
      }
      const suggestions = parseDictionaryLabelSuggestions(reply, request.column.values);
      if (!suggestions) {
        throw new Error("The suggestion reply could not be read");
      }
      return suggestions;
    },
    onSuccess: (suggestions, codeList) => {
      if (!suggestions) {
        return;
      }
      const isSingleEntry = codeList.entryKeys.length === 1;
      options.dispatch({
        type: "labels_suggested",
        codeListKey: codeList.key,
        entryKey: isSingleEntry ? codeList.entryKeys[0] : undefined,
        suggestions,
      });
      notifySuccess(t`Suggested labels filled in. Check them before saving.`);
    },
    onError: () => {
      notifyError(t`Suggestions did not come back. Labeling still works without them.`);
    },
  });
  return {
    suggestLabels,
    suggestingCodeListKey: result.isPending ? result.variables?.key : undefined,
  };
}
```

`useCreateDictionary.ts`:

```ts
import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { DataDictionaryClient } from "@/clients/dataDictionaries/DataDictionaryClient/DataDictionaryClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import { createDictionaryFromDraft } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/createDictionaryFromDraft/createDictionaryFromDraft";

/** What the Save step hands over to create a dictionary. */
export type CreateDictionaryVariables = Omit<
  Parameters<typeof createDictionaryFromDraft>[0],
  "workspaceId"
>;

/**
 * Creates the dictionary a proposal describes and opens it. A refusal is
 * explained with the same copy as a save on the Dictionary view, and the
 * create flow keeps its state so the user can retry.
 */
export function useCreateDictionary(): [
  create: (variables: CreateDictionaryVariables) => void,
  isCreating: boolean,
] {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const [create, isCreating] = useMutation({
    mutationFn: (variables: CreateDictionaryVariables) => {
      return createDictionaryFromDraft({ ...variables, workspaceId: workspace.id });
    },
    queryToInvalidate: DataDictionaryClient.QueryKeys.getAll(),
    onSuccess: (dictionary) => {
      const dictionaryName = dictionary.name;
      notifySuccess(t`Saved ${dictionaryName} to Dictionaries.`);
      const link = AppLinks.dataManagerDictionaryView({
        workspaceSlug: workspace.slug,
        dictionaryId: dictionary.id,
        dictionaryName,
      });
      navigate({ to: link.to, params: link.params });
    },
    onError: (error) => {
      notifyError(copy.describeSaveError(error));
    },
  });
  return [create, isCreating];
}
```

`useNewDictionaryFlow.ts`:

```ts
import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCreateDictionary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import { useDictionarySuggestions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import { useMeaningMatches } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import { useReadDatasets } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets";
import { useSuggestLabels } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestLabels";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserProfile } from "$/models/User/UserProfile";
import type {
  NewDictionaryAction,
  NewDictionaryState,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { CreateDictionaryVariables } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { ReadableDataset } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets";
import type { Dispatch } from "react";

/** What the create flow's steps can do beyond changing its state. */
export type NewDictionaryFlow = {
  suggestionAvailability: DictionarySuggestionAvailability;
  readPickedDatasets: () => void;
  isReading: boolean;
  meaningMatchStatus: MeaningMatchStatus;
  suggestLabels: (codeList: DictionaryProposal.CodeList) => void;
  suggestingCodeListKey: string | undefined;
  createDictionary: () => void;
  isCreating: boolean;
};

type FlowOptions = {
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
  sources: NewDictionarySources;
};

function _getReadableDatasets(
  sources: Readonly<NewDictionarySources>,
  datasetIds: readonly Dataset.Id[],
): ReadableDataset[] {
  return datasetIds.flatMap((datasetId) => {
    const dataset = sources.datasets.find((current) => {
      return current.id === datasetId;
    });
    const columns = sources.columnsByDatasetId.get(datasetId) ?? [];
    return dataset ? [{ dataset, columns }] : [];
  });
}

function _makeCreateDictionary(
  options: Readonly<{
    state: NewDictionaryState;
    userProfile: UserProfile.T | undefined;
    create: (variables: CreateDictionaryVariables) => void;
  }>,
): () => void {
  const { state, userProfile, create } = options;
  return () => {
    if (!userProfile || !state.proposal) {
      return;
    }
    create({
      owner: userProfile,
      name: state.name.trim(),
      description: state.description.trim(),
      datasetIds: DictionaryProposal.getDatasetIds(state.proposal),
      draft: DictionaryProposal.toDraft({
        proposal: state.proposal,
        labels: state.labels,
      }),
    });
  };
}

/**
 * Reads datasets and, once they are read, asks the suggestion model which
 * of their columns mean the same thing. Online, the first such request opens
 * the consent prompt; after a no it is not sent.
 */
function useReadWithMatches(
  options: Readonly<
    FlowOptions & { suggestions: ReturnType<typeof useDictionarySuggestions> }
  >,
): {
  read: (datasets: readonly ReadableDataset[]) => void;
  isReading: boolean;
  meaningMatchStatus: MeaningMatchStatus;
} {
  const { state, dispatch, sources, suggestions } = options;
  const { t } = useLingui();
  const matches = useMeaningMatches({
    requestReply: suggestions.requestReply,
    onFound: (found) => {
      dispatch({ type: "meaning_matches_found", matches: found });
    },
  });
  const [read, isReading] = useReadDatasets({
    onRead: (proposal) => {
      const firstName =
        sources.datasets.find((dataset) => {
          return dataset.id === state.pickedDatasetIds[0];
        })?.name ?? "";
      const defaultName = t`${firstName} codes`;
      dispatch({ type: "datasets_read", proposal, defaultName });
      const { availability } = suggestions;
      if (availability === "online" || availability === "on_device") {
        matches.findMatches(proposal);
      }
    },
  });
  return { read, isReading, meaningMatchStatus: matches.status };
}

/** Reads the dataset whose menu opened the flow, once its columns load. */
function useReadOriginDataset(
  options: Readonly<{
    state: NewDictionaryState;
    sources: NewDictionarySources;
    read: (datasets: readonly ReadableDataset[]) => void;
  }>,
): void {
  const { state, sources, read } = options;
  const hasStarted = useRef(false);
  const { originDatasetId, proposal } = state;
  useEffect(() => {
    if (hasStarted.current || !originDatasetId || proposal || sources.isLoading) {
      return;
    }
    hasStarted.current = true;
    read(_getReadableDatasets(sources, [originDatasetId]));
  }, [originDatasetId, proposal, sources, read]);
}

/**
 * Connects the create flow's state to everything outside it: reading the
 * picked datasets, meaning matches, label suggestions, and saving.
 * `NewDictionaryFromDatasetsView` calls it once and hands the result to its
 * steps.
 */
export function useNewDictionaryFlow(
  options: Readonly<FlowOptions>,
): NewDictionaryFlow {
  const { state, dispatch, sources } = options;
  const [userProfile] = useCurrentUserProfile();
  const suggestions = useDictionarySuggestions({
    consent: state.suggestionConsent,
    onConsentDecided: (isApproved) => {
      dispatch({ type: "suggestion_consent_decided", isApproved });
    },
  });
  const reading = useReadWithMatches({ state, dispatch, sources, suggestions });
  useReadOriginDataset({ state, sources, read: reading.read });
  const labels = useSuggestLabels({
    proposal: state.proposal,
    requestReply: suggestions.requestReply,
    dispatch,
  });
  const [create, isCreating] = useCreateDictionary();
  return {
    suggestionAvailability: suggestions.availability,
    readPickedDatasets: () => {
      reading.read(_getReadableDatasets(sources, state.pickedDatasetIds));
    },
    isReading: reading.isReading,
    meaningMatchStatus: reading.meaningMatchStatus,
    suggestLabels: labels.suggestLabels,
    suggestingCodeListKey: labels.suggestingCodeListKey,
    createDictionary: _makeCreateDictionary({ state, userProfile, create }),
    isCreating,
  };
}
```

- [ ] **Step 8:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions`. Expected: PASS (5 tests). `pnpm exec tsc -b --force --noEmit`. Expected: no errors. `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView`. Expected: PASS.

- [ ] **Step 9: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp/NewDictionaryFromDatasetsView
pnpm exec eslint --fix src/views/DataManagerApp/NewDictionaryFromDatasetsView
git add src/views/DataManagerApp/NewDictionaryFromDatasetsView
git commit -m "feat(data-dictionaries): read datasets, suggest, and save a learned dictionary

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The step footer and Pick datasets

Load the `impeccable` skill before this task (the create flow is a new surface), and read `docs/design/app-view-layout.md`. Each step renders its own `AppViewBody` and a sticky footer, the way the Dictionary view's save bar works. No `Paper`, `Card`, or info `Callout` between the slate and the content: the prototype's blue "notice" boxes become plain text lines.

**Files** (under `src/views/DataManagerApp/NewDictionaryFromDatasetsView/`):
- Create: `NewDictionaryFooter/NewDictionaryFooter.tsx`
- Create: `NewDictionaryFooter/NewDictionaryFooter.module.css`
- Create: `PickDatasetsStep/PickDatasetsStep.tsx`
- Create: `PickDatasetsStep/PickDatasetsTable.tsx`
- Test: `PickDatasetsStep/PickDatasetsStep.test.tsx`

- [ ] **Step 1: Write the failing test**

`PickDatasetsStep.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PickDatasetsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsStep";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

function _dataset(id: string, name: string): Dataset.T {
  return Model.make("Dataset", {
    id: id as Dataset.Id,
    name,
    sourceType: "csv_file",
    workspaceId: "00000000-0000-4000-8000-000000000001" as Dataset.T["workspaceId"],
    ownerId: "00000000-0000-4000-8000-000000000003" as Dataset.T["ownerId"],
    ownerProfileId: "00000000-0000-4000-8000-000000000004" as Dataset.T["ownerProfileId"],
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    dateOfLastSync: undefined,
    description: undefined,
    isRestricted: false,
  });
}

const KINGS = _dataset("00000000-0000-4000-8000-00000000000a", "Kings line list");
const ERIE = _dataset("00000000-0000-4000-8000-00000000000b", "Erie cases");
const COLUMN_COUNTS = new Map([
  [KINGS.id, 6],
  [ERIE.id, 9],
]);

function _renderStep(pickedDatasetIds: Dataset.Id[] = []) {
  const dispatch = vi.fn();
  const onRead = vi.fn();
  render(
    <PickDatasetsStep
      datasets={[KINGS, ERIE]}
      columnCounts={COLUMN_COUNTS}
      pickedDatasetIds={pickedDatasetIds}
      isLoading={false}
      isReading={false}
      dispatch={dispatch}
      onRead={onRead}
    />,
  );
  return { dispatch, onRead };
}

describe("PickDatasetsStep", () => {
  it("cannot read until a dataset is picked", () => {
    _renderStep();
    expect(screen.getByRole("button", { name: "Read 0 datasets" })).toBeDisabled();
  });

  it("picks a dataset with its checkbox", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pick Erie cases" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "toggle_dataset",
      datasetId: ERIE.id,
    });
  });

  it("counts the picked datasets' columns and reads them", () => {
    const { onRead } = _renderStep([KINGS.id, ERIE.id]);
    expect(screen.getByText("2 picked · 15 columns")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Read 2 datasets" }));
    expect(onRead).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the footer**

`NewDictionaryFooter.tsx`:

```tsx
import { Group } from "@mantine/core";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter.module.css";
import type { ReactNode } from "react";

type Props = {
  /** The leading edge: Back, or a note about the step. */
  start?: ReactNode;
  /** The step's actions on the trailing edge, the primary one last. */
  children: ReactNode;
};

/**
 * The bar at the bottom of each step of learning a dictionary. It holds
 * the step's actions, so they stay in reach while a long table scrolls.
 */
export function NewDictionaryFooter({
  start,
  children,
}: Readonly<Props>): ReactNode {
  return (
    // `data-sticky-action-bar` is what the NUX checklist and toasts clear.
    <div className={css.newDictionaryFooter} data-sticky-action-bar>
      <Group justify="space-between" gap="md" wrap="nowrap">
        <Group gap="sm" miw={0}>
          {start}
        </Group>
        <Group gap="sm" wrap="nowrap">
          {children}
        </Group>
      </Group>
    </div>
  );
}
```

`NewDictionaryFooter.module.css`:

```css
/*
 * Sticks to the bottom of the view body. The opaque background and top
 * hairline keep the table behind it from reading through.
 */
.newDictionaryFooter {
  background-color: var(--ava-surface-raised);
  border-top: 1px solid var(--ava-border-default);
  bottom: 0;
  margin-block-start: var(--mantine-spacing-lg);
  padding-block: var(--mantine-spacing-sm);
  position: sticky;
  z-index: 1;
}
```

- [ ] **Step 4: Write the step**

`PickDatasetsTable.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox, Group, Table, Text, VisuallyHidden } from "@mantine/core";
import { useDatasetSourceLabels } from "@/hooks/datasets/useDatasetSourceLabels";
import { DatasetSourceIcon } from "@/views/DataManagerApp/DatasetSourceIcon";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasets: readonly Dataset.T[];
  columnCounts: ReadonlyMap<Dataset.Id, number>;
  pickedDatasetIds: readonly Dataset.Id[];
  onToggle: (datasetId: Dataset.Id) => void;
};

/** Every dataset in the workspace, each with a checkbox to pick it. */
export function PickDatasetsTable({
  datasets,
  columnCounts,
  pickedDatasetIds,
  onToggle,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const sourceLabels = useDatasetSourceLabels();

  if (datasets.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        <Trans>There are no datasets yet. Add one, then learn a dictionary from it.</Trans>
      </Text>
    );
  }
  return (
    <Table highlightOnHover verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={44}>
            <VisuallyHidden>
              <Trans>Pick</Trans>
            </VisuallyHidden>
          </Table.Th>
          <Table.Th>
            <Trans>Dataset</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Source</Trans>
          </Table.Th>
          <Table.Th ta="right">
            <Trans>Columns</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {datasets.map((dataset) => {
          const datasetName = dataset.name;
          return (
            <Table.Tr key={dataset.id}>
              <Table.Td>
                <Checkbox
                  aria-label={t`Pick ${datasetName}`}
                  checked={pickedDatasetIds.includes(dataset.id)}
                  onChange={() => {
                    onToggle(dataset.id);
                  }}
                />
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={500}>
                  {datasetName}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <DatasetSourceIcon sourceType={dataset.sourceType} />
                  <Text size="sm">{sourceLabels[dataset.sourceType]}</Text>
                </Group>
              </Table.Td>
              <Table.Td ta="right">
                <Text size="sm">{columnCounts.get(dataset.id) ?? 0}</Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
```

`PickDatasetsStep.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Button, Center, Loader, Text } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import { PickDatasetsTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsTable";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  datasets: readonly Dataset.T[];
  columnCounts: ReadonlyMap<Dataset.Id, number>;
  pickedDatasetIds: readonly Dataset.Id[];
  isLoading: boolean;
  isReading: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onRead: () => void;
};

/**
 * The first step of learning a dictionary: pick the datasets to learn
 * from, then read them on this device. The footer says what is read, since
 * suggestions may send some of it to a model.
 */
export function PickDatasetsStep({
  datasets,
  columnCounts,
  pickedDatasetIds,
  isLoading,
  isReading,
  dispatch,
  onRead,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const pickedCount = pickedDatasetIds.length;
  const columnCount = pickedDatasetIds.reduce((sum, datasetId) => {
    return sum + (columnCounts.get(datasetId) ?? 0);
  }, 0);

  return (
    <AppViewBody>
      <AppViewSection
        title={t`Datasets to learn from`}
        meta={t`${pickedCount} picked · ${plural(columnCount, {
          one: "# column",
          other: "# columns",
        })}`}
      >
        <Text size="sm" c="dimmed" mb="sm">
          <Trans>
            Pick datasets that use the same codes. Avandar reads each column,
            finds the coded ones, and merges columns that mean the same thing.
          </Trans>
        </Text>
        {isLoading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : (
          <PickDatasetsTable
            datasets={datasets}
            columnCounts={columnCounts}
            pickedDatasetIds={pickedDatasetIds}
            onToggle={(datasetId) => {
              dispatch({ type: "toggle_dataset", datasetId });
            }}
          />
        )}
      </AppViewSection>
      <NewDictionaryFooter
        start={
          <Text size="sm" c="dimmed">
            <Trans>
              Only column names and the distinct values of short columns are
              read. Rows never leave this device for suggestions.
            </Trans>
          </Text>
        }
      >
        <Button onClick={onRead} loading={isReading} disabled={pickedCount === 0}>
          <Plural value={pickedCount} one="Read # dataset" other="Read # datasets" />
        </Button>
      </NewDictionaryFooter>
    </AppViewBody>
  );
}
```

- [ ] **Step 5:** Run the test again. Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp/NewDictionaryFromDatasetsView
pnpm exec eslint --fix src/views/DataManagerApp/NewDictionaryFromDatasetsView
pnpm exec stylelint src/views/DataManagerApp/NewDictionaryFromDatasetsView/**/*.css
git add src/views/DataManagerApp/NewDictionaryFromDatasetsView
git commit -m "feat(data-dictionaries): pick the datasets a dictionary learns from

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Review columns

The step that shows what was learned: three sections (Coded columns, Ordered scales, Descriptions only), one row per entry with an include checkbox, its name (editable in place), the columns it came from, its kind, the values seen, and, for a guessed merge, a Suggested tag and Keep apart. Empty sections are hidden ("withhold chrome").

Each entry starts with the name `DictionaryProposal` gave it: its most common column name, in lowercase words joined by `_` (`GENDER` becomes `gender`, `CaseNo` becomes `case_no`), the first dataset read winning a tie, and `_2`, `_3` added when two entries would share a name. The name field is labeled by the entry's first column, which stays put while the name is typed. It flags a blank name and a name another included entry already has, ignoring case and outer spaces, which is exactly what the save RPC refuses (`entry_name_required`, `entry_names_not_unique`); Next stays disabled until every included entry has a usable name. The copy is the Dictionary view's own.

**Files** (under `src/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/`):
- Create: `ReviewColumnsStep.tsx`
- Create: `ReviewColumnsStep.module.css`
- Create: `ReviewSummary.tsx`
- Create: `ReviewSections.tsx`
- Create: `ReviewEntriesSection.tsx`
- Create: `ReviewEntryRow.tsx`
- Create: `ReviewEntryNameInput.tsx`
- Create: `ValuesSeenCell.tsx`
- Create: `SuggestedTag.tsx`
- Test: `ReviewColumnsStep.test.tsx`

- [ ] **Step 1: Write the failing test**

`ReviewColumnsStep.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { ReviewColumnsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  codes: readonly string[] | undefined,
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  return {
    datasetId,
    datasetName: datasetId === BRONX_ID ? "Bronx" : "Erie",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes?.length ?? 300,
    values: codes?.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

const BRONX_COLUMNS = [
  _column("GENDER", ["1", "2", "9"]),
  _column("hosp_yn", ["Y", "N"]),
  _column("ses_cat", ["1", "2", "3", "4"]),
  _column("case_id", undefined),
];

const TWO_DATASETS = DictionaryProposal.fromColumnProfiles([
  ...BRONX_COLUMNS,
  _column("sex", ["M", "F", "U"], ERIE_ID),
]);

function _renderStep(
  options: {
    proposal?: DictionaryProposal.T;
    originDatasetName?: string;
    meaningMatchStatus?: MeaningMatchStatus;
  } = {},
) {
  const dispatch = vi.fn();
  render(
    <ReviewColumnsStep
      proposal={options.proposal ?? TWO_DATASETS}
      originDatasetName={options.originDatasetName}
      meaningMatchStatus={options.meaningMatchStatus ?? "done"}
      dispatch={dispatch}
    />,
  );
  return { dispatch };
}

function _keyOf(proposal: DictionaryProposal.T, name: string): string {
  return (
    proposal.entries.find((entry) => {
      return entry.name === name;
    })?.key ?? ""
  );
}

describe("ReviewColumnsStep", () => {
  it("sorts entries into coded, ordered, and description-only sections", () => {
    _renderStep();
    expect(screen.getByRole("heading", { name: "Coded columns" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ordered scales" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Descriptions only" })).toBeInTheDocument();
    expect(screen.getByText("GENDER (Bronx), sex (Erie)")).toBeInTheDocument();
  });

  it("leaves an entry out when it is unchecked", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(screen.getByRole("checkbox", { name: "Include hosp_yn" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_entry_included",
      entryKey: _keyOf(TWO_DATASETS, "hosp_yn"),
      isIncluded: false,
    });
  });

  it("keeps the columns of a guessed merge apart on request", () => {
    const { dispatch } = _renderStep();
    expect(
      screen.getByText("Same name, different codes. Kept as separate code lists under one entry."),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Keep the columns in gender apart" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "keep_apart",
      entryKey: _keyOf(TWO_DATASETS, "gender"),
    });
  });

  it("names an entry after its most common column and renames it in place", () => {
    const { dispatch } = _renderStep();
    const nameInput = screen.getByRole("textbox", {
      name: "Name of the entry from GENDER",
    });
    expect(nameInput).toHaveValue("gender");
    fireEvent.change(nameInput, { target: { value: "sex_at_intake" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "rename_entry",
      entryKey: _keyOf(TWO_DATASETS, "gender"),
      name: "sex_at_intake",
    });
  });

  it("flags a name another entry has and holds Next until it is fixed", () => {
    const proposal = DictionaryProposal.renameEntry(TWO_DATASETS, {
      entryKey: _keyOf(TWO_DATASETS, "hosp_yn"),
      name: " Gender",
    });
    _renderStep({ proposal });
    expect(screen.getAllByText("Another entry already has this name.")).toHaveLength(2);
    expect(screen.getByText("Fix the entry names marked above to go on.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next: label values" })).toBeDisabled();
  });

  it("changes an entry's kind", () => {
    const { dispatch } = _renderStep();
    pickMantineSelectOption("Kind for hosp_yn", "Ordered");
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_entry_kind",
      entryKey: _keyOf(TWO_DATASETS, "hosp_yn"),
      kind: "ordered",
    });
  });

  it("says while it is looking for columns that mean the same thing", () => {
    _renderStep({ meaningMatchStatus: "finding" });
    expect(
      screen.getByText("Looking for columns that mean the same thing"),
    ).toBeInTheDocument();
  });

  it("offers to learn from more datasets when it started from one", () => {
    const { dispatch } = _renderStep({
      proposal: DictionaryProposal.fromColumnProfiles(BRONX_COLUMNS),
      originDatasetName: "Bronx",
    });
    expect(screen.getByText("4 columns in Bronx became 4 entries.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Learn from more datasets" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "learn_from_more" });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the tag and the values cell**

`SuggestedTag.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Tooltip } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  reason: "meaning" | "similar_name";
};

/**
 * Marks an entry whose columns were joined by a guess, and says why on
 * hover or keyboard focus. Keep apart on the same row undoes the guess.
 */
export function SuggestedTag({ reason }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const explanation =
    reason === "meaning"
      ? t`Matched by meaning, not just by name. Keep apart if these record different things.`
      : t`Similar names and values. Keep apart if these record different things.`;
  return (
    <Tooltip label={explanation} multiline w={260}>
      <Badge
        tabIndex={0}
        variant="light"
        color="neutral"
        size="sm"
        tt="none"
        leftSection={<IconSparkles size={12} aria-hidden />}
      >
        <Trans>Suggested</Trans>
      </Badge>
    </Tooltip>
  );
}
```

`ValuesSeenCell.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  /** Other entries that share this entry's code list. */
  sharedWithNames: readonly string[];
};

/** How many of a coded entry's values the cell spells out. */
const MAX_SHOWN_VALUES = 6;

/** One line saying what an entry's columns hold. */
function useValuesSeenSummary(entry: DictionaryProposal.Entry): string {
  const { t, i18n } = useLingui();
  const values = DictionaryProposal.getValuesSeen(entry);
  const range = DictionaryProposal.getNumberRange(entry);
  if (entry.kind === "identifier") {
    return t`Unique per row`;
  }
  if (entry.kind === "date") {
    return t`Dates`;
  }
  if (values.length > 0) {
    const shown = values
      .slice(0, MAX_SHOWN_VALUES)
      .map((item) => {
        return item.value;
      })
      .join(", ");
    const moreCount = values.length - MAX_SHOWN_VALUES;
    return moreCount > 0 ? t`${shown} and ${moreCount} more` : shown;
  }
  if (range) {
    const lowest = i18n.number(range.min);
    const highest = i18n.number(range.max);
    return t`${lowest} to ${highest}`;
  }
  const distinctCount = Math.max(
    0,
    ...DictionaryProposal.getColumns(entry).map((column) => {
      return column.distinctCount;
    }),
  );
  return t`${plural(distinctCount, {
    one: "# different value",
    other: "# different values",
  })}`;
}

/**
 * What an entry's columns hold, and a note when the entry joined columns
 * with other codes or shares its code list with other entries.
 */
export function ValuesSeenCell({
  entry,
  sharedWithNames,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const summary = useValuesSeenSummary(entry);
  const sharedList = new Intl.ListFormat(i18n.locale, {
    type: "conjunction",
  }).format(sharedWithNames);

  return (
    <>
      <Text size="sm" lineClamp={1}>
        {summary}
      </Text>
      {entry.suggestionReason === "other_codes" ? (
        <Text size="xs" c="dimmed">
          <Trans>
            Same name, different codes. Kept as separate code lists under one
            entry.
          </Trans>
        </Text>
      ) : null}
      {sharedWithNames.length > 0 ? (
        <Text size="xs" c="dimmed">
          {t`Shares one code list with ${sharedList}.`}
        </Text>
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: Write the name field, the row, the section, and the summary**

`ReviewEntryNameInput.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  nameIssue: DictionaryProposal.EntryNameIssue | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The name an entry will be saved under, editable in place. It is labeled
 * by the entry's first column, which stays put while the name is typed, and
 * it flags the name problems the save RPC refuses.
 */
export function ReviewEntryNameInput({
  entry,
  nameIssue,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const firstColumnName = DictionaryProposal.getColumns(entry)[0]?.columnName ?? "";
  const issueMessages: Record<DictionaryProposal.EntryNameIssue, string> = {
    name_required: t`Give this entry a name.`,
    name_not_unique: t`Another entry already has this name.`,
  };
  return (
    <TextInput
      size="xs"
      aria-label={t`Name of the entry from ${firstColumnName}`}
      value={entry.name}
      error={nameIssue ? issueMessages[nameIssue] : undefined}
      onChange={(event) => {
        const name = event.currentTarget.value;
        dispatch({ type: "rename_entry", entryKey: entry.key, name });
      }}
    />
  );
}
```

`ReviewEntryRow.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Box, Button, Checkbox, Group, Select, Table, Text } from "@mantine/core";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep.module.css";
import { ReviewEntryNameInput } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntryNameInput";
import { SuggestedTag } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/SuggestedTag";
import { ValuesSeenCell } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ValuesSeenCell";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  sharedWithNames: readonly string[];
  nameIssue: DictionaryProposal.EntryNameIssue | undefined;
  /** One dataset needs no dataset names after each column. */
  isSingleDataset: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
};

function _formatSources(
  entry: DictionaryProposal.Entry,
  isSingleDataset: boolean,
): string {
  return DictionaryProposal.getColumnSources(entry)
    .map(({ columnName, datasetNames }) => {
      return isSingleDataset
        ? columnName
        : `${columnName} (${datasetNames.join(", ")})`;
    })
    .join(", ");
}

/**
 * One proposed entry on the Review step: include it or not, rename it, see
 * where it came from, change its kind, and undo a guessed merge.
 */
export function ReviewEntryRow({
  entry,
  sharedWithNames,
  nameIssue,
  isSingleDataset,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const copy = useDictionaryCopy();
  const entryName = entry.name;
  const reason = entry.suggestionReason;

  return (
    <Table.Tr className={css.reviewEntryRow} data-included={entry.isIncluded}>
      <Table.Td>
        <Checkbox
          aria-label={t`Include ${entryName}`}
          checked={entry.isIncluded}
          onChange={(event) => {
            const isIncluded = event.currentTarget.checked;
            dispatch({ type: "set_entry_included", entryKey: entry.key, isIncluded });
          }}
        />
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Box flex={1} miw={0}>
            <ReviewEntryNameInput entry={entry} nameIssue={nameIssue} dispatch={dispatch} />
          </Box>
          {reason === "meaning" || reason === "similar_name" ? (
            <SuggestedTag reason={reason} />
          ) : null}
        </Group>
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
          {_formatSources(entry, isSingleDataset)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Select
          size="xs"
          aria-label={t`Kind for ${entryName}`}
          allowDeselect={false}
          value={entry.kind}
          data={DataDictionary.ENTRY_KINDS.map((kind) => {
            return { value: kind, label: copy.kindShortLabels[kind] };
          })}
          onChange={(value) => {
            const kind = DataDictionary.ENTRY_KINDS.find((current) => {
              return current === value;
            });
            if (kind) {
              dispatch({ type: "set_entry_kind", entryKey: entry.key, kind });
            }
          }}
        />
      </Table.Td>
      <Table.Td>
        <ValuesSeenCell entry={entry} sharedWithNames={sharedWithNames} />
      </Table.Td>
      <Table.Td>
        {entry.suggestedColumns.length > 0 ? (
          <Button
            variant="subtle"
            color="neutral"
            size="compact-xs"
            aria-label={t`Keep the columns in ${entryName} apart`}
            onClick={() => {
              dispatch({ type: "keep_apart", entryKey: entry.key });
            }}
          >
            <Trans>Keep apart</Trans>
          </Button>
        ) : null}
      </Table.Td>
    </Table.Tr>
  );
}
```

`ReviewColumnsStep.module.css`:

```css
/* An entry left out reads as set aside, not removed: its checkbox stays bright. */
.reviewEntryRow[data-included="false"] td:not(:first-child) {
  opacity: 0.55;
}
```

`ReviewEntriesSection.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Table, VisuallyHidden } from "@mantine/core";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { ReviewEntryRow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntryRow";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  title: string;
  meta: string;
  entries: readonly DictionaryProposal.Entry[];
  sharedNamesByEntryKey: ReadonlyMap<string, string[]>;
  nameIssues: ReadonlyMap<string, DictionaryProposal.EntryNameIssue>;
  isSingleDataset: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** A stable empty list, so rows that share nothing keep one prop value. */
const NO_SHARED_NAMES: readonly string[] = [];

/** One titled group of proposed entries. Hidden when it has none. */
export function ReviewEntriesSection({
  title,
  meta,
  entries,
  sharedNamesByEntryKey,
  nameIssues,
  isSingleDataset,
  dispatch,
}: Readonly<Props>): ReactNode {
  if (entries.length === 0) {
    return null;
  }
  return (
    <AppViewSection title={title} meta={meta}>
      <Table verticalSpacing="xs" layout="fixed">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={44}>
              <VisuallyHidden>
                <Trans>Include</Trans>
              </VisuallyHidden>
            </Table.Th>
            <Table.Th>
              <Trans>Entry name and the columns it came from</Trans>
            </Table.Th>
            <Table.Th w={160}>
              <Trans>Kind</Trans>
            </Table.Th>
            <Table.Th>
              <Trans>Values seen</Trans>
            </Table.Th>
            <Table.Th w={120}>
              <VisuallyHidden>
                <Trans>Actions</Trans>
              </VisuallyHidden>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map((entry) => {
            return (
              <ReviewEntryRow
                key={entry.key}
                entry={entry}
                sharedWithNames={sharedNamesByEntryKey.get(entry.key) ?? NO_SHARED_NAMES}
                nameIssue={nameIssues.get(entry.key)}
                isSingleDataset={isSingleDataset}
                dispatch={dispatch}
              />
            );
          })}
        </Table.Tbody>
      </Table>
    </AppViewSection>
  );
}
```

`ReviewSummary.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  originDatasetName: string | undefined;
  meaningMatchStatus: MeaningMatchStatus;
  onLearnFromMore: () => void;
};

/**
 * What reading the datasets did, in one line, with how to adjust it and
 * whether the search for meaning matches is still running. From a single
 * dataset's menu it offers to learn from more datasets.
 */
export function ReviewSummary({
  proposal,
  originDatasetName,
  meaningMatchStatus,
  onLearnFromMore,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const columnCount = proposal.entries.reduce((sum, entry) => {
    return sum + DictionaryProposal.getColumns(entry).length;
  }, 0);
  const entryCount = proposal.entries.length;
  const datasetCount = DictionaryProposal.getDatasetIds(proposal).length;
  const columns = plural(columnCount, { one: "# column", other: "# columns" });
  const entries = plural(entryCount, { one: "# entry", other: "# entries" });
  const datasets = plural(datasetCount, { one: "# dataset", other: "# datasets" });

  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap="xxs" maw={720}>
        <Text fw={600} size="sm">
          {originDatasetName
            ? t`${columns} in ${originDatasetName} became ${entries}.`
            : t`${columns} from ${datasets} became ${entries}.`}
        </Text>
        <Text size="sm" c="dimmed">
          <Trans>
            Coded columns get labeled next. The rest become entries with a
            description, so the dictionary documents them too. Uncheck anything
            you don't want, or change its kind.
          </Trans>
        </Text>
        <div aria-live="polite">
          {meaningMatchStatus === "finding" ? (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">
                <Trans>Looking for columns that mean the same thing</Trans>
              </Text>
            </Group>
          ) : null}
          {meaningMatchStatus === "failed" ? (
            <Text size="sm" c="dimmed">
              <Trans>
                Could not look for columns that mean the same thing. The
                matches here are by name and values.
              </Trans>
            </Text>
          ) : null}
        </div>
      </Stack>
      {originDatasetName ? (
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconPlus size={14} aria-hidden />}
          onClick={onLearnFromMore}
        >
          <Trans>Learn from more datasets</Trans>
        </Button>
      ) : null}
    </Group>
  );
}
```

The `plural` results are interpolated into `t`; the ones in this file use plain identifiers (`columns`, `entries`, `datasets`), which keeps every placeholder named.

- [ ] **Step 5: Write the sections and the step**

`ReviewSections.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { ReviewEntriesSection } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewEntriesSection";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  nameIssues: ReadonlyMap<string, DictionaryProposal.EntryNameIssue>;
  dispatch: Dispatch<NewDictionaryAction>;
};

type ReviewSection = "coded" | "ordered" | "description";

function _getSection(kind: DataDictionaryEntry.Kind): ReviewSection {
  if (kind === "categorical") {
    return "coded";
  }
  return kind === "ordered" ? "ordered" : "description";
}

/** For each entry on a shared code list, the other entries on it. */
function _getSharedNamesByEntryKey(
  proposal: DictionaryProposal.T,
): Map<string, string[]> {
  const namesByKey = new Map(
    proposal.entries.map((entry) => {
      return [entry.key, entry.name];
    }),
  );
  const shared = new Map<string, string[]>();
  DictionaryProposal.getCodings(proposal)
    .codeLists.filter((codeList) => {
      return codeList.entryKeys.length > 1;
    })
    .forEach((codeList) => {
      codeList.entryKeys.forEach((entryKey) => {
        const others = codeList.entryKeys.filter((other) => {
          return other !== entryKey;
        });
        shared.set(
          entryKey,
          others.flatMap((other) => {
            return namesByKey.get(other) ?? [];
          }),
        );
      });
    });
  return shared;
}

/**
 * The Review step's three groups of proposed entries: coded columns,
 * ordered scales, and description-only entries. A group with no entries
 * is not shown.
 */
export function ReviewSections({
  proposal,
  nameIssues,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const sharedNamesByEntryKey = useMemo(() => {
    return _getSharedNamesByEntryKey(proposal);
  }, [proposal]);
  const entriesIn = (section: ReviewSection) => {
    return proposal.entries.filter((entry) => {
      return _getSection(entry.kind) === section;
    });
  };
  const coded = entriesIn("coded");
  const ordered = entriesIn("ordered");
  const described = entriesIn("description");
  const codedCount = coded.length;
  const orderedCount = ordered.length;
  const describedCount = described.length;
  const sectionProps = {
    sharedNamesByEntryKey,
    nameIssues,
    isSingleDataset: DictionaryProposal.getDatasetIds(proposal).length === 1,
    dispatch,
  };

  return (
    <>
      <ReviewEntriesSection
        title={t`Coded columns`}
        meta={t`${plural(codedCount, { one: "# entry", other: "# entries" })} · you'll label their values next`}
        entries={coded}
        {...sectionProps}
      />
      <ReviewEntriesSection
        title={t`Ordered scales`}
        meta={t`${plural(orderedCount, { one: "# entry", other: "# entries" })} · order is kept when charted`}
        entries={ordered}
        {...sectionProps}
      />
      <ReviewEntriesSection
        title={t`Descriptions only`}
        meta={t`${plural(describedCount, { one: "# entry", other: "# entries" })} · no codes to label`}
        entries={described}
        {...sectionProps}
      />
    </>
  );
}
```

`ReviewColumnsStep.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import { ReviewSections } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewSections";
import { ReviewSummary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewSummary";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  originDatasetName: string | undefined;
  meaningMatchStatus: MeaningMatchStatus;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The second step of learning a dictionary: what reading the datasets
 * proposed, ready to adjust before labeling. Back to Pick is offered only
 * when the flow started there. Next waits until every included entry has a
 * name the save will accept.
 */
export function ReviewColumnsStep({
  proposal,
  originDatasetName,
  meaningMatchStatus,
  dispatch,
}: Readonly<Props>): ReactNode {
  const hasIncludedEntry = proposal.entries.some((entry) => {
    return entry.isIncluded;
  });
  const nameIssues = useMemo(() => {
    return DictionaryProposal.getEntryNameIssues(proposal);
  }, [proposal]);
  const hasNameIssue = nameIssues.size > 0;
  return (
    <AppViewBody>
      <Stack gap="xl">
        <ReviewSummary
          proposal={proposal}
          originDatasetName={originDatasetName}
          meaningMatchStatus={meaningMatchStatus}
          onLearnFromMore={() => {
            dispatch({ type: "learn_from_more" });
          }}
        />
        <ReviewSections proposal={proposal} nameIssues={nameIssues} dispatch={dispatch} />
      </Stack>
      <NewDictionaryFooter
        start={
          originDatasetName ? null : (
            <Button
              variant="default"
              onClick={() => {
                dispatch({ type: "go_to_step", step: "pick" });
              }}
            >
              <Trans>Back</Trans>
            </Button>
          )
        }
      >
        {hasNameIssue ? (
          <Text size="sm" c="dimmed">
            <Trans>Fix the entry names marked above to go on.</Trans>
          </Text>
        ) : null}
        <Button
          disabled={!hasIncludedEntry || hasNameIssue}
          onClick={() => {
            dispatch({ type: "go_to_step", step: "label" });
          }}
        >
          <Trans>Next: label values</Trans>
        </Button>
      </NewDictionaryFooter>
    </AppViewBody>
  );
}
```

- [ ] **Step 6:** Run the test again. Expected: PASS (8 tests).

- [ ] **Step 7: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep
pnpm exec eslint --fix src/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep
pnpm exec stylelint src/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/*.css
git add src/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep
git commit -m "feat(data-dictionaries): review the columns a dictionary learned

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Label values

Master-detail: the code lists to label on the leading side, each tagged Labeled, Suggested, or To do; the selected list's values on the other, with a label input per value (a suggestion carries a marker), a Missing value checkbox, and Suggest labels. A list used by one entry also shows that entry's description, which the label suggestion fills in. A value can be left without a label: it is saved blank and marked "Needs a label" on the dictionary (Task 2). There are no drag handles to reorder values here; an ordered list is reordered on the dictionary after saving. When the user declined to send suggestions online (Task 12), Suggest labels is disabled with a line saying so; offline it still works.

**Files** (under `src/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/`):
- Create: `LabelValuesStep.tsx`
- Create: `LabelValuesStep.module.css`
- Create: `CodeListsToLabelNav.tsx`
- Create: `CodeListStatusBadge.tsx`
- Create: `CodeListLabelsPane.tsx`
- Create: `LabelValuesTable.tsx`
- Create: `LabelValueRow.tsx`
- Create: `LabelValuesFooter.tsx`
- Create: `EntryDescriptionField.tsx`
- Create: `NothingToLabel.tsx`
- Test: `LabelValuesStep.test.tsx`

- [ ] **Step 1: Write the failing test**

`LabelValuesStep.test.tsx`:

```tsx
import { beforeAll, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen, within } from "@/test-utils";
import { LabelValuesStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const DATASET_ID = uuid<Dataset.Id>();

function _column(columnName: string, codes: readonly string[]): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value, index) => {
      return { value, rowCount: 120 - index * 10 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  _column("GENDER", ["1", "2", "9"]),
  _column("county", ["Bronx", "Kings"]),
]);
const CODE_LISTS = DictionaryProposal.getCodings(PROPOSAL).codeLists;
const LABELS = DictionaryProposal.withDefaultLabels({}, CODE_LISTS);
const GENDER_LIST = CODE_LISTS[0];

function _renderStep(
  suggestionAvailability: DictionarySuggestionAvailability = "online",
) {
  const dispatch = vi.fn();
  const onSuggest = vi.fn();
  render(
    <LabelValuesStep
      proposal={PROPOSAL}
      labels={LABELS}
      selectedCodeListKey={GENDER_LIST?.key}
      suggestionAvailability={suggestionAvailability}
      suggestingCodeListKey={undefined}
      canSuggestLabels={() => {
        return true;
      }}
      dispatch={dispatch}
      onSuggest={onSuggest}
    />,
  );
  return { dispatch, onSuggest };
}

describe("LabelValuesStep", () => {
  it("lists each code list with how far along it is", () => {
    _renderStep();
    const nav = screen.getByRole("navigation", { name: "Code lists to label" });
    expect(
      within(nav).getByRole("button", { name: /gender \(1\/2\/9\).*To do/ }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("button", { name: /county \(Bronx\/Kings\).*Labeled/ }),
    ).toBeInTheDocument();
  });

  it("types a label for a value", () => {
    const { dispatch } = _renderStep();
    fireEvent.change(screen.getByRole("textbox", { name: "Label for 1" }), {
      target: { value: "Male" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_value_label",
      codeListKey: GENDER_LIST?.key,
      code: "1",
      label: "Male",
    });
  });

  it("marks a value as a missing answer", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "9 stands for a missing answer" }),
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_value_missing",
      codeListKey: GENDER_LIST?.key,
      code: "9",
      isMissing: true,
    });
  });

  it("asks for suggestions for the selected list", () => {
    const { onSuggest } = _renderStep();
    fireEvent.click(screen.getByRole("button", { name: "Suggest labels" }));
    expect(onSuggest).toHaveBeenCalledWith(GENDER_LIST);
  });

  it("explains that suggestions are off when no model is available", () => {
    _renderStep("unavailable");
    expect(screen.getByRole("button", { name: "Suggest labels" })).toBeDisabled();
    expect(
      screen.getByText("Suggestions need a connection or the offline model. Labeling still works."),
    ).toBeInTheDocument();
  });

  it("explains that suggestions are off when the user declined to send them", () => {
    _renderStep("declined");
    expect(screen.getByRole("button", { name: "Suggest labels" })).toBeDisabled();
    expect(
      screen.getByText(
        "You chose not to send values to the AI provider, so suggestions are off for this dictionary. Labeling still works.",
      ),
    ).toBeInTheDocument();
  });

  it("accepts the list and moves to the next one", () => {
    const { dispatch } = _renderStep();
    fireEvent.click(screen.getByRole("button", { name: "Accept and next list" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "accept_code_list",
      codeListKey: GENDER_LIST?.key,
    });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the leaf components**

`CodeListStatusBadge.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { ReactNode } from "react";

type Props = {
  status: DictionaryProposal.CodeListStatus;
};

/** Labeled, Suggested, or To do, beside a code list waiting for labels. */
export function CodeListStatusBadge({ status }: Readonly<Props>): ReactNode {
  if (status === "labeled") {
    return (
      <Badge size="sm" variant="light" color="success" tt="none">
        <Trans>Labeled</Trans>
      </Badge>
    );
  }
  if (status === "suggested") {
    return (
      <Badge
        size="sm"
        variant="light"
        color="neutral"
        tt="none"
        leftSection={<IconSparkles size={10} aria-hidden />}
      >
        <Trans>Suggested</Trans>
      </Badge>
    );
  }
  return (
    <Badge size="sm" variant="outline" color="neutral" tt="none">
      <Trans>To do</Trans>
    </Badge>
  );
}
```

`NothingToLabel.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** The Label values step when no entry that was kept has codes. */
export function NothingToLabel(): ReactNode {
  return (
    <Stack align="center" gap="xs" py="xxl" maw={720} mx="auto" ta="center">
      <Title order={4} fz="lg" fw={650}>
        <Trans>Nothing to label</Trans>
      </Title>
      <Text size="sm" c="dimmed">
        <Trans>
          None of the entries you kept has codes. Go on to save, or go back
          and change an entry's kind.
        </Trans>
      </Text>
    </Stack>
  );
}
```

`EntryDescriptionField.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Textarea } from "@mantine/core";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  entry: DictionaryProposal.Entry;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The description of the one entry a code list belongs to. A suggested
 * description says so until the user edits it.
 */
export function EntryDescriptionField({
  entry,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const entryName = entry.name;
  return (
    <Textarea
      maw={760}
      label={t`Description of ${entryName}`}
      description={
        entry.isDescriptionSuggested
          ? t`Suggested from the column name and values. Edit it or keep it.`
          : undefined
      }
      autosize
      minRows={2}
      value={entry.description}
      onChange={(event) => {
        const description = event.currentTarget.value;
        dispatch({ type: "set_entry_description", entryKey: entry.key, description });
      }}
    />
  );
}
```

`LabelValueRow.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Checkbox, Table, Text, TextInput, Tooltip } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  item: ColumnProfile.Value;
  codeListKey: string;
  label: DictionaryProposal.ValueLabel | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * One value to label: the code as found in the data, how many rows hold
 * it, its label (marked when it is an unchecked suggestion), and whether
 * it stands for a missing answer.
 */
export function LabelValueRow({
  item,
  codeListKey,
  label,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const code = item.value;
  const marker =
    label?.source === "suggested" ? (
      <Tooltip label={t`Suggested from the column name and values`}>
        <span tabIndex={0} aria-label={t`Suggested`}>
          <IconSparkles size={14} aria-hidden />
        </span>
      </Tooltip>
    ) : null;

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={600}>
          {code}
        </Text>
      </Table.Td>
      <Table.Td ta="right">
        <Text size="sm">{i18n.number(item.rowCount)}</Text>
      </Table.Td>
      <Table.Td>
        <TextInput
          size="xs"
          aria-label={t`Label for ${code}`}
          placeholder={t`Label for ${code}`}
          value={label?.label ?? ""}
          rightSection={marker}
          rightSectionPointerEvents="all"
          onChange={(event) => {
            const value = event.currentTarget.value;
            dispatch({ type: "set_value_label", codeListKey, code, label: value });
          }}
        />
      </Table.Td>
      <Table.Td>
        <Checkbox
          label={t`Missing`}
          aria-label={t`${code} stands for a missing answer`}
          checked={label?.isMissing ?? false}
          onChange={(event) => {
            const isMissing = event.currentTarget.checked;
            dispatch({ type: "set_value_missing", codeListKey, code, isMissing });
          }}
        />
      </Table.Td>
    </Table.Tr>
  );
}
```

`LabelValuesTable.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { LabelValueRow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValueRow";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  codeList: DictionaryProposal.CodeList;
  labels: DictionaryProposal.Labels;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** One code list's values, each with its row count, label, and missing flag. */
export function LabelValuesTable({
  codeList,
  labels,
  dispatch,
}: Readonly<Props>): ReactNode {
  const codeListKey = codeList.key;
  return (
    <Table verticalSpacing="xs" maw={760}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={140}>
            <Trans>Value in data</Trans>
          </Table.Th>
          <Table.Th w={90} ta="right">
            <Trans>Rows</Trans>
          </Table.Th>
          <Table.Th>
            <Trans>Label</Trans>
          </Table.Th>
          <Table.Th w={130}>
            <Trans>Missing value</Trans>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {codeList.values.map((item) => {
          return (
            <LabelValueRow
              key={item.value}
              item={item}
              codeListKey={codeListKey}
              label={DictionaryProposal.getValueLabel(labels, {
                codeListKey,
                code: item.value,
              })}
              dispatch={dispatch}
            />
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
```

- [ ] **Step 4: Write the nav, the pane, and the step**

`LabelValuesStep.module.css`:

```css
/* The code lists to label beside the selected list's values. */
.labelValuesStep {
  display: grid;
  gap: var(--mantine-spacing-lg);
  grid-template-columns: 18rem minmax(0, 1fr);
}

.labelValuesStepNav {
  align-self: start;
  background-color: var(--ava-surface-body);
  border: 1px solid var(--ava-border-default);
  border-radius: var(--mantine-radius-sm);
  padding: var(--mantine-spacing-xs);
}

@media (width < 62em) {
  .labelValuesStep {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

`CodeListsToLabelNav.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { NavLink, Stack, Text } from "@mantine/core";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { CodeListStatusBadge } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListStatusBadge";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep.module.css";
import type { ReactNode } from "react";

type Props = {
  codeLists: readonly DictionaryProposal.CodeList[];
  labels: DictionaryProposal.Labels;
  selectedKey: string;
  onSelect: (codeListKey: string) => void;
};

/** Every code list waiting for labels, with how far along each one is. */
export function CodeListsToLabelNav({
  codeLists,
  labels,
  selectedKey,
  onSelect,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const doneCount = codeLists.filter((codeList) => {
    return DictionaryProposal.getCodeListStatus(labels, codeList) === "labeled";
  }).length;
  const listCount = codeLists.length;

  return (
    <nav aria-label={t`Code lists to label`} className={css.labelValuesStepNav}>
      <Text size="xs" c="dimmed" fw={600} px="xs" pb="xs">
        {t`${doneCount} of ${listCount} done`}
      </Text>
      <Stack gap={2}>
        {codeLists.map((codeList) => {
          const valueCount = codeList.values.length;
          const isSelected = codeList.key === selectedKey;
          return (
            <NavLink
              key={codeList.key}
              component="button"
              type="button"
              active={isSelected}
              aria-current={isSelected ? "true" : undefined}
              label={codeList.name}
              description={
                codeList.isOrdered
                  ? t`${plural(valueCount, { one: "# value", other: "# values" })} · ordered`
                  : t`${plural(valueCount, { one: "# value", other: "# values" })}`
              }
              rightSection={
                <CodeListStatusBadge
                  status={DictionaryProposal.getCodeListStatus(labels, codeList)}
                />
              }
              onClick={() => {
                onSelect(codeList.key);
              }}
            />
          );
        })}
      </Stack>
    </nav>
  );
}
```

`CodeListLabelsPane.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { EntryDescriptionField } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/EntryDescriptionField";
import { LabelValuesTable } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesTable";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  codeList: DictionaryProposal.CodeList;
  /** The entries that use the list. */
  entries: readonly DictionaryProposal.Entry[];
  labels: DictionaryProposal.Labels;
  suggestionAvailability: DictionarySuggestionAvailability;
  isSuggesting: boolean;
  /** False when the list's columns look like they name people. */
  canSuggest: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (codeList: DictionaryProposal.CodeList) => void;
};

/** One sentence on how to label this list. */
function useCodeListHint(
  codeList: DictionaryProposal.CodeList,
  entries: readonly DictionaryProposal.Entry[],
): string {
  const { t, i18n } = useLingui();
  if (entries.length > 1) {
    const names = new Intl.ListFormat(i18n.locale, { type: "conjunction" }).format(
      entries.map((entry) => {
        return entry.name;
      }),
    );
    return t`${names} hold the same values, so they share this one list. Label it once.`;
  }
  return codeList.isOrdered
    ? t`This list is ordered, lowest level first. Reorder it on the dictionary after saving if the order is wrong.`
    : t`Give each value the label people should see. Suggestions are only a starting point.`;
}

/** The selected code list: its values to label and Suggest labels. */
export function CodeListLabelsPane({
  codeList,
  entries,
  labels,
  suggestionAvailability,
  isSuggesting,
  canSuggest,
  dispatch,
  onSuggest,
}: Readonly<Props>): ReactNode {
  const hint = useCodeListHint(codeList, entries);
  const [onlyEntry] = entries.length === 1 ? entries : [];
  const isUnavailable = suggestionAvailability === "unavailable";
  const isDeclined = suggestionAvailability === "declined";

  return (
    <Stack gap="md" miw={0}>
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Title order={4} fz="lg" fw={650}>
          {codeList.name}
        </Title>
        <Button
          variant="default"
          size="compact-sm"
          leftSection={<IconSparkles size={14} aria-hidden />}
          loading={isSuggesting}
          disabled={isUnavailable || isDeclined || !canSuggest}
          onClick={() => {
            onSuggest(codeList);
          }}
        >
          <Trans>Suggest labels</Trans>
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        {hint}
      </Text>
      {isUnavailable ? (
        <Text size="xs" c="dimmed">
          <Trans>Suggestions need a connection or the offline model. Labeling still works.</Trans>
        </Text>
      ) : null}
      {isDeclined ? (
        <Text size="xs" c="dimmed">
          <Trans>
            You chose not to send values to the AI provider, so suggestions are
            off for this dictionary. Labeling still works.
          </Trans>
        </Text>
      ) : null}
      {!isUnavailable && !isDeclined && !canSuggest ? (
        <Text size="xs" c="dimmed">
          <Trans>These columns look like they name people, so their values are not sent for suggestions.</Trans>
        </Text>
      ) : null}
      <LabelValuesTable codeList={codeList} labels={labels} dispatch={dispatch} />
      {onlyEntry ? <EntryDescriptionField entry={onlyEntry} dispatch={dispatch} /> : null}
    </Stack>
  );
}
```

`LabelValuesFooter.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  /** The list Accept and next list accepts, if there is one. */
  selectedKey: string | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/** Back, Accept and next list, and Next: save, under the Label values step. */
export function LabelValuesFooter({ selectedKey, dispatch }: Readonly<Props>): ReactNode {
  return (
    <NewDictionaryFooter
      start={
        <Button
          variant="default"
          onClick={() => {
            dispatch({ type: "go_to_step", step: "review" });
          }}
        >
          <Trans>Back</Trans>
        </Button>
      }
    >
      {selectedKey ? (
        <Button
          variant="default"
          onClick={() => {
            dispatch({ type: "accept_code_list", codeListKey: selectedKey });
          }}
        >
          <Trans>Accept and next list</Trans>
        </Button>
      ) : null}
      <Button
        onClick={() => {
          dispatch({ type: "go_to_step", step: "save" });
        }}
      >
        <Trans>Next: save</Trans>
      </Button>
    </NewDictionaryFooter>
  );
}
```

`LabelValuesStep.tsx`:

```tsx
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { CodeListLabelsPane } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListLabelsPane";
import { CodeListsToLabelNav } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/CodeListsToLabelNav";
import { LabelValuesFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesFooter";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep.module.css";
import { NothingToLabel } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/NothingToLabel";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
  selectedCodeListKey: string | undefined;
  suggestionAvailability: DictionarySuggestionAvailability;
  suggestingCodeListKey: string | undefined;
  /** Whether a list's values can be sent for suggestions at all. */
  canSuggestLabels: (codeList: DictionaryProposal.CodeList) => boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onSuggest: (codeList: DictionaryProposal.CodeList) => void;
};

/**
 * The third step of learning a dictionary: label every code list's values,
 * by hand or with suggestions. Labels can be left unfinished and finished
 * on the dictionary later.
 */
export function LabelValuesStep(props: Readonly<Props>): ReactNode {
  const { proposal, labels, dispatch } = props;
  const { codeLists } = useMemo(() => {
    return DictionaryProposal.getCodings(proposal);
  }, [proposal]);
  const selected =
    codeLists.find((codeList) => {
      return codeList.key === props.selectedCodeListKey;
    }) ?? codeLists[0];
  const canSuggest = selected ? props.canSuggestLabels(selected) : false;

  return (
    <AppViewBody>
      {selected ? (
        <div className={css.labelValuesStep}>
          <CodeListsToLabelNav
            codeLists={codeLists}
            labels={labels}
            selectedKey={selected.key}
            onSelect={(codeListKey) => {
              dispatch({ type: "select_code_list", codeListKey });
            }}
          />
          <CodeListLabelsPane
            codeList={selected}
            entries={proposal.entries.filter((entry) => {
              return selected.entryKeys.includes(entry.key);
            })}
            labels={labels}
            suggestionAvailability={props.suggestionAvailability}
            isSuggesting={props.suggestingCodeListKey === selected.key}
            canSuggest={canSuggest}
            dispatch={dispatch}
            onSuggest={props.onSuggest}
          />
        </div>
      ) : (
        <NothingToLabel />
      )}
      <LabelValuesFooter selectedKey={selected?.key} dispatch={dispatch} />
    </AppViewBody>
  );
}
```

- [ ] **Step 5:** Run the test again. Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep
pnpm exec eslint --fix src/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep
pnpm exec stylelint src/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/*.css
git add src/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep
git commit -m "feat(data-dictionaries): label a learned dictionary's values with suggestions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Save

Name, description, a summary of what will be saved, a warning for unlabeled values (they are saved with a blank label and marked as needing one on the dictionary, which Task 1 and Task 2 allow), and Create dictionary. Unlabeled values never block Create dictionary. From a single dataset it says the dictionary is not tied to it. There is no "Apply it to <dataset> next" checkbox in this slice (see Refinements).

**Files** (under `src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/`):
- Create: `SaveStep.tsx`
- Create: `SaveNameFields.tsx`
- Create: `SaveSummary.tsx`
- Create: `SaveWarnings.tsx`
- Test: `SaveStep.test.tsx`

- [ ] **Step 1: Write the failing test**

`SaveStep.test.tsx`:

```tsx
import { beforeAll, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen } from "@/test-utils";
import { SaveStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const DATASET_ID = uuid<Dataset.Id>();

function _column(columnName: string, codes: readonly string[] | undefined): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings line list",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes?.length ?? 300,
    values: codes?.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  _column("GENDER", ["1", "2", "9"]),
  _column("case_id", undefined),
]);
const LABELS = DictionaryProposal.withDefaultLabels(
  {},
  DictionaryProposal.getCodings(PROPOSAL).codeLists,
);

function _renderStep(options: { name?: string; originDatasetName?: string } = {}) {
  const dispatch = vi.fn();
  const onCreate = vi.fn();
  render(
    <SaveStep
      proposal={PROPOSAL}
      labels={LABELS}
      name={options.name ?? "Kings codes"}
      description=""
      originDatasetName={options.originDatasetName}
      learnedFromNames={["Kings line list"]}
      isCreating={false}
      dispatch={dispatch}
      onCreate={onCreate}
    />,
  );
  return { dispatch, onCreate };
}

describe("SaveStep", () => {
  it("sums up what will be saved", () => {
    _renderStep();
    expect(screen.getByRole("row", { name: "Entries 2" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "Code lists 1" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "Values labeled 0 of 3" })).toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: "Learned from Kings line list" }),
    ).toBeInTheDocument();
  });

  it("warns about unlabeled values but still creates the dictionary", () => {
    const { onCreate } = _renderStep();
    expect(
      screen.getByText(
        "3 values in gender (1/2/9) have no label yet. They are saved without one and marked as needing a label, so you can finish them on the dictionary.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create dictionary" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Create dictionary" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("cannot create a dictionary without a name", () => {
    _renderStep({ name: " " });
    expect(screen.getByRole("button", { name: "Create dictionary" })).toBeDisabled();
  });

  it("renames the dictionary as it is typed", () => {
    const { dispatch } = _renderStep();
    fireEvent.change(screen.getByRole("textbox", { name: "Dictionary name" }), {
      target: { value: "Borough codes" },
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "set_name", name: "Borough codes" });
  });

  it("says a dictionary learned from one dataset is not tied to it", () => {
    _renderStep({ originDatasetName: "Kings line list" });
    expect(
      screen.getByText(/Kings line list is only where it started/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the summary and the warnings**

`SaveSummary.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Table } from "@mantine/core";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
  learnedFromNames: readonly string[];
};

/** What the new dictionary will hold, and where it was learned from. */
export function SaveSummary({
  draft,
  proposal,
  labels,
  learnedFromNames,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const { codeLists } = useMemo(() => {
    return DictionaryProposal.getCodings(proposal);
  }, [proposal]);
  const valueCount = codeLists.reduce((sum, codeList) => {
    return sum + codeList.values.length;
  }, 0);
  const unlabeledCount = DictionaryProposal.getUnlabeledValues(labels, codeLists).valueCount;
  const labeledCount = valueCount - unlabeledCount;
  const facts = [
    { label: t`Entries`, value: i18n.number(draft.entries.length) },
    { label: t`Code lists`, value: i18n.number(draft.codeLists.length) },
    { label: t`Values labeled`, value: t`${labeledCount} of ${valueCount}` },
    {
      label: t`Learned from`,
      value: new Intl.ListFormat(i18n.locale, { type: "conjunction" }).format(learnedFromNames),
    },
  ];

  return (
    <AppViewSection title={t`What you're saving`}>
      <Table withRowBorders={false} verticalSpacing={4}>
        <Table.Tbody>
          {facts.map((fact) => {
            return (
              <Table.Tr key={fact.label}>
                <Table.Th scope="row" w={160} fw={500} c="dimmed">
                  {fact.label}
                </Table.Th>
                <Table.Td>{fact.value}</Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </AppViewSection>
  );
}
```

`SaveWarnings.tsx`:

```tsx
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Callout } from "@avandar/ui";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useMemo } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useDictionaryCopy } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryCopy";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  draft: DataDictionary.Draft;
  issues: readonly DataDictionary.DraftIssue[];
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
};

function _describeWhere(
  draft: DataDictionary.Draft,
  issue: DataDictionary.DraftIssue,
): string {
  if ("codeListId" in issue) {
    return draft.codeLists.find((codeList) => codeList.id === issue.codeListId)?.name ?? "";
  }
  return draft.entries.find((entry) => entry.id === issue.entryId)?.name ?? "";
}

/**
 * The Save step's warnings: values with no label yet, which are saved
 * without one and marked as needing a label on the dictionary, and anything
 * the dictionary would refuse, which blocks Create dictionary until it is
 * fixed.
 */
export function SaveWarnings({
  draft,
  issues,
  proposal,
  labels,
}: Readonly<Props>): ReactNode {
  const { t, i18n } = useLingui();
  const copy = useDictionaryCopy();
  const unlabeled = useMemo(() => {
    const { codeLists } = DictionaryProposal.getCodings(proposal);
    return DictionaryProposal.getUnlabeledValues(labels, codeLists);
  }, [proposal, labels]);
  const unlabeledCount = unlabeled.valueCount;
  const listNames = new Intl.ListFormat(i18n.locale, { type: "conjunction" }).format(
    unlabeled.codeListNames,
  );
  const issueText = issues
    .map((issue) => {
      return `${_describeWhere(draft, issue)}: ${copy.describeIssue(issue)}`;
    })
    .join(" ");

  return (
    <>
      {unlabeledCount > 0 ? (
        <Callout
          color="warning"
          icon={<IconAlertTriangle size={18} aria-hidden />}
          messageSize="sm"
          message={t`${plural(unlabeledCount, {
            one: "# value",
            other: "# values",
          })} in ${listNames} have no label yet. They are saved without one and marked as needing a label, so you can finish them on the dictionary.`}
        />
      ) : null}
      {issues.length > 0 ? (
        <Callout
          title={t`Fix these before saving`}
          messageSize="sm"
          message={issueText}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 4: Write the name fields and the step**

`SaveNameFields.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stack, Text, Textarea, TextInput } from "@mantine/core";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  name: string;
  description: string;
  originDatasetName: string | undefined;
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * The new dictionary's name and description. From a dataset's menu it adds
 * that the dictionary is not tied to that dataset.
 */
export function SaveNameFields({
  name,
  description,
  originDatasetName,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="md">
      <TextInput
        label={t`Dictionary name`}
        value={name}
        onChange={(event) => {
          dispatch({ type: "set_name", name: event.currentTarget.value });
        }}
      />
      <Textarea
        label={t`Description`}
        autosize
        minRows={2}
        value={description}
        onChange={(event) => {
          const nextDescription = event.currentTarget.value;
          dispatch({ type: "set_description", description: nextDescription });
        }}
      />
      {originDatasetName ? (
        <Text size="sm" c="dimmed">
          {t`Saved to Dictionaries like any other dictionary. ${originDatasetName} is only where it started, so you can use it with any dataset.`}
        </Text>
      ) : null}
    </Stack>
  );
}
```

`SaveStep.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Button, Stack } from "@mantine/core";
import { useMemo } from "react";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { OfflineGated } from "@/components/offline/OfflineGated/OfflineGated";
import { NewDictionaryFooter } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFooter/NewDictionaryFooter";
import { SaveNameFields } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveNameFields";
import { SaveSummary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveSummary";
import { SaveWarnings } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveWarnings";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  labels: DictionaryProposal.Labels;
  name: string;
  description: string;
  originDatasetName: string | undefined;
  learnedFromNames: readonly string[];
  isCreating: boolean;
  dispatch: Dispatch<NewDictionaryAction>;
  onCreate: () => void;
};

/**
 * The last step of learning a dictionary: name it, check what will be
 * saved, and create it. Creating needs a connection; every step before it
 * works offline.
 */
export function SaveStep(props: Readonly<Props>): ReactNode {
  const { proposal, labels, dispatch } = props;
  const draft = useMemo(() => {
    return DictionaryProposal.toDraft({ proposal, labels });
  }, [proposal, labels]);
  const issues = useMemo(() => {
    return DataDictionary.findDraftIssues(draft);
  }, [draft]);
  const canCreate =
    issues.length === 0 && draft.entries.length > 0 && props.name.trim() !== "";

  return (
    <AppViewBody contentMaxWidth={720}>
      <Stack gap="xl">
        <SaveNameFields
          name={props.name}
          description={props.description}
          originDatasetName={props.originDatasetName}
          dispatch={dispatch}
        />
        <SaveSummary
          draft={draft}
          proposal={proposal}
          labels={labels}
          learnedFromNames={props.learnedFromNames}
        />
        <SaveWarnings draft={draft} issues={issues} proposal={proposal} labels={labels} />
      </Stack>
      <NewDictionaryFooter
        start={
          <Button
            variant="default"
            onClick={() => {
              dispatch({ type: "go_to_step", step: "label" });
            }}
          >
            <Trans>Back</Trans>
          </Button>
        }
      >
        <OfflineGated>
          <Button onClick={props.onCreate} loading={props.isCreating} disabled={!canCreate}>
            <Trans>Create dictionary</Trans>
          </Button>
        </OfflineGated>
      </NewDictionaryFooter>
    </AppViewBody>
  );
}
```

- [ ] **Step 5:** Run the test again. Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep
pnpm exec eslint --fix src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep
git add src/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep
git commit -m "feat(data-dictionaries): name and save a learned dictionary

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: The view, its route, and its link

Puts the steps together under one task view at `dictionaries/new`, with a header band, a step bar, and the step's body. Only `fromDatasetId` goes in the URL.

**Files:**
- Modify: `src/config/AppLinks/AppLinks.tsx`
- Create: `src/routes/_auth/$workspaceSlug/data-manager/dictionaries/new.tsx`
- Generated: `src/routeTree.gen.ts`
- Create (under `src/views/DataManagerApp/NewDictionaryFromDatasetsView/`):
  - `NewDictionaryFromDatasetsView.tsx`
  - `NewDictionaryFlowView.tsx`
  - `NewDictionaryHeader.tsx`
  - `NewDictionaryStepper/NewDictionaryStepper.tsx`
  - `NewDictionaryStepper/NewDictionaryStepper.module.css`
  - `NewDictionaryStepBody.tsx`
  - `ProposalStepBody.tsx`
  - `NewDictionaryReading.tsx`
  - `NewDictionaryNoAccess.tsx`
- Test: `NewDictionaryStepper/NewDictionaryStepper.test.tsx`

- [ ] **Step 1: Write the failing stepper test**

`NewDictionaryStepper.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { fireEvent, render, screen } from "@/test-utils";
import {
  makeInitialNewDictionaryState,
  newDictionaryReducer,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import { NewDictionaryStepper } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper/NewDictionaryStepper";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = uuid<Dataset.Id>();

const READ_STATE = newDictionaryReducer(makeInitialNewDictionaryState(undefined), {
  type: "datasets_read",
  proposal: DictionaryProposal.fromColumnProfiles([]),
  datasetIds: [],
  defaultName: "Codes",
});

describe("NewDictionaryStepper", () => {
  it("has no Pick datasets step when the flow opened from a dataset", () => {
    render(
      <NewDictionaryStepper
        state={makeInitialNewDictionaryState(DATASET_ID)}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Pick datasets/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Review columns/ })).toBeInTheDocument();
  });

  it("goes back to an earlier step", () => {
    const dispatch = vi.fn();
    render(
      <NewDictionaryStepper
        state={{ ...READ_STATE, step: "label" }}
        dispatch={dispatch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Review columns/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: "go_to_step", step: "review" });
  });
});
```

- [ ] **Step 2:** `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper`. Expected: FAIL, module not found.

- [ ] **Step 3: Write the stepper**

`NewDictionaryStepper.module.css`:

```css
/* The step bar sits between the header band and the step, on the lit surface. */
.newDictionaryStepper {
  border-block-end: 1px solid var(--ava-border-default);
  padding: var(--mantine-spacing-sm) var(--mantine-spacing-lg);
}
```

`NewDictionaryStepper.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Stepper } from "@mantine/core";
import css from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper/NewDictionaryStepper.module.css";
import type {
  NewDictionaryAction,
  NewDictionaryState,
  NewDictionaryStep,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { Dispatch, ReactNode } from "react";

type Props = {
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
};

const STEPS_FROM_PICK: readonly NewDictionaryStep[] = ["pick", "review", "label", "save"];
const STEPS_FROM_DATASET: readonly NewDictionaryStep[] = ["review", "label", "save"];

/**
 * The step bar of learning a dictionary: where the flow is, with earlier
 * steps one click away. A flow opened from a dataset's menu has no Pick
 * datasets step.
 */
export function NewDictionaryStepper({ state, dispatch }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const labels: Record<NewDictionaryStep, string> = {
    pick: t`Pick datasets`,
    review: t`Review columns`,
    label: t`Label values`,
    save: t`Save`,
  };
  const steps = state.originDatasetId ? STEPS_FROM_DATASET : STEPS_FROM_PICK;

  return (
    <div className={css.newDictionaryStepper}>
      <Stepper
        size="sm"
        active={steps.indexOf(state.step)}
        allowNextStepsSelect={false}
        onStepClick={(index) => {
          const step = steps[index];
          if (step) {
            dispatch({ type: "go_to_step", step });
          }
        }}
      >
        {steps.map((step) => {
          return <Stepper.Step key={step} label={labels[step]} />;
        })}
      </Stepper>
    </div>
  );
}
```

- [ ] **Step 4:** Run the stepper test again. Expected: PASS (2 tests).

- [ ] **Step 5: Write the header, the placeholders, and the step body**

`NewDictionaryHeader.tsx`:

```tsx
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  /** The dataset Cancel returns to, when the flow started from one. */
  cancelDatasetId: Dataset.Id | undefined;
  /** Set while the flow is learning from that one dataset. */
  originDatasetName: string | undefined;
};

/**
 * The header band of learning a dictionary: what is being made, one line
 * on what happens to it, and Cancel, which goes back where the flow began.
 */
export function NewDictionaryHeader({
  cancelDatasetId,
  originDatasetName,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const isFromDataset = originDatasetName !== undefined;
  const onCancel = (): void => {
    if (!cancelDatasetId) {
      navigate(AppLinks.dataManagerHome(workspace.slug));
      return;
    }
    const link = AppLinks.dataManagerDatasetView({
      workspaceSlug: workspace.slug,
      datasetId: cancelDatasetId,
      datasetName: originDatasetName ?? "",
    });
    navigate({ to: link.to, params: link.params });
  };

  return (
    <AppViewHeader
      title={isFromDataset ? t`New dictionary from ${originDatasetName}` : t`New dictionary from datasets`}
      description={
        isFromDataset
          ? t`Saved to Dictionaries, so any dataset can use it.`
          : t`Avandar learns the codes your datasets use and what their columns mean.`
      }
      actions={
        <Button variant="default" onClick={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      }
    />
  );
}
```

`NewDictionaryReading.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Center, Group, Loader, Text } from "@mantine/core";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import type { ReactNode } from "react";

type Props = {
  datasetName: string | undefined;
};

/** Shown while the dataset that opened the flow is read on this device. */
export function NewDictionaryReading({ datasetName }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <AppViewBody>
      <Center py="xxl">
        <Group gap="sm" aria-live="polite">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {datasetName
              ? t`Reading ${datasetName} on this device`
              : t`Reading datasets on this device`}
          </Text>
        </Group>
      </Center>
    </AppViewBody>
  );
}
```

`NewDictionaryNoAccess.tsx`:

```tsx
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import { AppView } from "@/components/layouts/AppView/AppView";
import type { ReactNode } from "react";

/** The create route for someone who cannot edit dictionaries. */
export function NewDictionaryNoAccess(): ReactNode {
  const { t } = useLingui();
  return (
    <AppView>
      <Center flex={1} p="lg">
        <Callout
          maw={520}
          title={t`You can't create dictionaries`}
          message={t`Creating a dictionary needs edit access to Data Sources. Ask a workspace admin for it.`}
        />
      </Center>
    </AppView>
  );
}
```

`ProposalStepBody.tsx`:

```tsx
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { LabelValuesStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/LabelValuesStep/LabelValuesStep";
import { ReviewColumnsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ReviewColumnsStep/ReviewColumnsStep";
import { SaveStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/SaveStep/SaveStep";
import type {
  NewDictionaryAction,
  NewDictionaryState,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { NewDictionaryFlow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow";
import type { Dispatch, ReactNode } from "react";

type Props = {
  proposal: DictionaryProposal.T;
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
  flow: NewDictionaryFlow;
  originDatasetName: string | undefined;
};

function _getLearnedFromNames(proposal: DictionaryProposal.T): string[] {
  const names = proposal.entries.flatMap((entry) => {
    return DictionaryProposal.getColumns(entry).map((column) => {
      return column.datasetName;
    });
  });
  return [...new Set(names)];
}

/** The step to show once the datasets are read: Review, Label, or Save. */
export function ProposalStepBody({
  proposal,
  state,
  dispatch,
  flow,
  originDatasetName,
}: Readonly<Props>): ReactNode {
  if (state.step === "label") {
    return (
      <LabelValuesStep
        proposal={proposal}
        labels={state.labels}
        selectedCodeListKey={state.selectedCodeListKey}
        suggestionAvailability={flow.suggestionAvailability}
        suggestingCodeListKey={flow.suggestingCodeListKey}
        canSuggestLabels={flow.canSuggestLabels}
        dispatch={dispatch}
        onSuggest={flow.suggestLabels}
      />
    );
  }
  if (state.step === "save") {
    return (
      <SaveStep
        proposal={proposal}
        labels={state.labels}
        name={state.name}
        description={state.description}
        originDatasetName={originDatasetName}
        learnedFromNames={_getLearnedFromNames(proposal)}
        isCreating={flow.isCreating}
        dispatch={dispatch}
        onCreate={flow.createDictionary}
      />
    );
  }
  return (
    <ReviewColumnsStep
      proposal={proposal}
      originDatasetName={originDatasetName}
      meaningMatchStatus={flow.meaningMatchStatus}
      dispatch={dispatch}
    />
  );
}
```

`NewDictionaryStepBody.tsx`:

```tsx
import { useMemo } from "react";
import { NewDictionaryReading } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryReading";
import { PickDatasetsStep } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/PickDatasetsStep/PickDatasetsStep";
import { ProposalStepBody } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/ProposalStepBody";
import type {
  NewDictionaryAction,
  NewDictionaryState,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { NewDictionaryFlow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow";
import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { Dispatch, ReactNode } from "react";

type Props = {
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
  sources: NewDictionarySources;
  flow: NewDictionaryFlow;
  originDatasetName: string | undefined;
};

/** The current step of learning a dictionary, or a wait while it reads. */
export function NewDictionaryStepBody({
  state,
  dispatch,
  sources,
  flow,
  originDatasetName,
}: Readonly<Props>): ReactNode {
  const columnCounts = useMemo(() => {
    return new Map(
      [...sources.columnsByDatasetId].map(([datasetId, columns]) => {
        return [datasetId, columns.length];
      }),
    );
  }, [sources.columnsByDatasetId]);

  if (state.step === "pick") {
    return (
      <PickDatasetsStep
        datasets={sources.datasets}
        columnCounts={columnCounts}
        pickedDatasetIds={state.pickedDatasetIds}
        isLoading={sources.isLoading}
        isReading={flow.isReading}
        dispatch={dispatch}
        onRead={flow.readPickedDatasets}
      />
    );
  }
  if (!state.proposal) {
    return <NewDictionaryReading datasetName={originDatasetName} />;
  }
  return (
    <ProposalStepBody
      proposal={state.proposal}
      state={state}
      dispatch={dispatch}
      flow={flow}
      originDatasetName={originDatasetName}
    />
  );
}
```

`NewDictionaryFlowView.tsx`:

```tsx
import { useReducer } from "react";
import { AppView } from "@/components/layouts/AppView/AppView";
import {
  makeInitialNewDictionaryState,
  newDictionaryReducer,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import { NewDictionaryHeader } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryHeader";
import { NewDictionaryStepBody } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepBody";
import { NewDictionaryStepper } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepper/NewDictionaryStepper";
import { useNewDictionaryFlow } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionaryFlow";
import { useNewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  originDatasetId: Dataset.Id | undefined;
};

/**
 * The create flow itself, for someone allowed to create dictionaries: its
 * state, the datasets it reads, and the header, step bar, and current step.
 */
export function NewDictionaryFlowView({ originDatasetId }: Readonly<Props>): ReactNode {
  const [state, dispatch] = useReducer(
    newDictionaryReducer,
    originDatasetId,
    makeInitialNewDictionaryState,
  );
  const sources = useNewDictionarySources();
  const flow = useNewDictionaryFlow({ state, dispatch, sources });
  const originDatasetName = state.originDatasetId
    ? (sources.datasets.find((dataset) => {
        return dataset.id === state.originDatasetId;
      })?.name ?? "")
    : undefined;

  return (
    <AppView>
      <NewDictionaryHeader
        cancelDatasetId={originDatasetId}
        originDatasetName={originDatasetName}
      />
      <NewDictionaryStepper state={state} dispatch={dispatch} />
      <NewDictionaryStepBody
        state={state}
        dispatch={dispatch}
        sources={sources}
        flow={flow}
        originDatasetName={originDatasetName}
      />
    </AppView>
  );
}
```

`NewDictionaryFromDatasetsView.tsx`:

```tsx
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { NewDictionaryFlowView } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFlowView";
import { NewDictionaryNoAccess } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryNoAccess";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  /** The dataset whose menu opened the flow, which skips Pick datasets. */
  originDatasetId: Dataset.Id | undefined;
};

/**
 * Learning a dictionary from datasets, in four steps: Pick datasets, Review
 * columns, Label values, and Save. Opened from the Data Sources toolbar's
 * New dictionary menu, or from a dataset's menu. Only someone who can edit
 * dictionaries gets the flow, so nothing is read before that is checked.
 */
export function NewDictionaryFromDatasetsView({
  originDatasetId,
}: Readonly<Props>): ReactNode {
  const canEditDictionaries = useHasPermission("data_sources__can_edit_dictionaries");
  return canEditDictionaries ? (
    <NewDictionaryFlowView originDatasetId={originDatasetId} />
  ) : (
    <NewDictionaryNoAccess />
  );
}
```

- [ ] **Step 6: Add the link** after `dataManagerDictionaryView` in `AppLinks.tsx`:

```tsx
  dataManagerNewDictionary: (workspaceSlug: string) => {
    return {
      key: "data-manager-new-dictionary",
      to: "/$workspaceSlug/data-manager/dictionaries/new",
      params: { workspaceSlug },
      label: (): string => {
        return t`New dictionary`;
      },
      // Reading datasets and labeling work offline. Only saving needs a
      // connection, and the Save step gates that button itself.
      isAvailableOffline: true,
    };
  },
```

- [ ] **Step 7: Write the route**

`src/routes/_auth/$workspaceSlug/data-manager/dictionaries/new.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NewDictionaryFromDatasetsView } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryFromDatasetsView";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/data-manager/dictionaries/new",
)({
  component: RouteComponent,
  validateSearch: z.object({
    fromDatasetId: z.uuid().optional().catch(undefined),
  }),
});

function RouteComponent(): ReactNode {
  const { fromDatasetId } = Route.useSearch();
  // The router's search typing drops the id's brand, so restore it. A new
  // key starts the flow over when the route opens from another dataset.
  const originDatasetId = fromDatasetId as Dataset.Id | undefined;
  return (
    <NewDictionaryFromDatasetsView
      key={fromDatasetId ?? "datasets"}
      originDatasetId={originDatasetId}
    />
  );
}
```

The static `dictionaries/new` segment ranks above `dictionaries/$dictionaryId`, so `$dictionaryId`'s loader never sees `new`.

- [ ] **Step 8: Regenerate the route tree.** It is written by the router plugin when Vite starts: run `pnpm dev`, wait for Vite's "ready" line, and stop it. `src/routeTree.gen.ts` now includes `/_auth/$workspaceSlug/data-manager/dictionaries/new`. Never edit it by hand.

- [ ] **Step 9:** `pnpm exec tsc -b --force --noEmit`. Expected: no errors. `pnpm vitest run src/views/DataManagerApp/NewDictionaryFromDatasetsView`. Expected: PASS.

- [ ] **Step 10: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp/NewDictionaryFromDatasetsView src/config/AppLinks/AppLinks.tsx "src/routes/_auth/\$workspaceSlug/data-manager/dictionaries/new.tsx"
pnpm exec eslint --fix src/views/DataManagerApp/NewDictionaryFromDatasetsView src/config/AppLinks/AppLinks.tsx "src/routes/_auth/\$workspaceSlug/data-manager/dictionaries/new.tsx"
pnpm exec stylelint src/views/DataManagerApp/NewDictionaryFromDatasetsView/**/*.css
git add src/views/DataManagerApp/NewDictionaryFromDatasetsView src/config/AppLinks/AppLinks.tsx "src/routes/_auth/\$workspaceSlug/data-manager/dictionaries/new.tsx" src/routeTree.gen.ts
git commit -m "feat(data-dictionaries): add the route that learns a dictionary from datasets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Ways in: the toolbar, the list, and a dataset's menu

Three entry-point changes in Data Sources, plus the slice 1 spec that clicked the old button:

1. **New dictionary** becomes a menu: **From datasets** opens the flow; **Start empty** opens slice 1's dialog. This is the "Add from datasets" entry point next to New dictionary.
2. The create route is a task view, so the Data Sources list is hidden there by default, with **Show list** / **Hide list** in the slate toolbar. The choice resets when the route changes.
3. A dataset's ⋯ menu gets **Create a dictionary from this dataset**, above Refresh and Delete, for anyone who can edit dictionaries. The spec shows it only while the dataset has no dictionary applied; bindings arrive in slice 3, so here it always shows, and slice 3 adds the check.

**Files:**
- Move: `src/views/DataManagerApp/DataManagerToolbarActions.tsx` to `src/views/DataManagerApp/DataManagerToolbarActions/DataManagerToolbarActions.tsx`
- Create: `src/views/DataManagerApp/DataManagerToolbarActions/NewDictionaryMenu.tsx`
- Create: `src/views/DataManagerApp/DataManagerToolbarActions/ListToggleButton.tsx`
- Test: `src/views/DataManagerApp/DataManagerToolbarActions/DataManagerToolbarActions.test.tsx`
- Create: `src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.ts`
- Test: `src/views/DataManagerApp/useListPaneToggle/useListPaneToggle.test.ts`
- Modify: `src/views/DataManagerApp/DataManagerApp.tsx`
- Create: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/CreateDictionaryMenuItem.tsx`
- Modify: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.tsx`
- Test: `src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu.test.tsx`
- Modify: `tests/e2e/data-dictionary-edit.spec.ts`

- [ ] **Step 1: Move the toolbar file**

```bash
mkdir -p src/views/DataManagerApp/DataManagerToolbarActions
git mv src/views/DataManagerApp/DataManagerToolbarActions.tsx src/views/DataManagerApp/DataManagerToolbarActions/DataManagerToolbarActions.tsx
```

In `DataManagerApp.tsx`, change its import to `@/views/DataManagerApp/DataManagerToolbarActions/DataManagerToolbarActions`.

- [ ] **Step 2: Write the failing toolbar test**

`DataManagerToolbarActions.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataManagerToolbarActions } from "@/views/DataManagerApp/DataManagerToolbarActions/DataManagerToolbarActions";

const { navigateMock, permissionState } = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    permissionState: { canEditDictionaries: true },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return permissionState.canEditDictionaries;
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return navigateMock;
    },
  };
});

describe("DataManagerToolbarActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionState.canEditDictionaries = true;
  });

  it("opens learning a dictionary from the New dictionary menu", async () => {
    render(<DataManagerToolbarActions onNewDictionary={vi.fn()} listToggle={undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "New dictionary" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /From datasets/ }));
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/$workspaceSlug/data-manager/dictionaries/new",
        params: { workspaceSlug: "demo" },
      }),
    );
  });

  it("opens the empty dictionary dialog from Start empty", async () => {
    const onNewDictionary = vi.fn();
    render(
      <DataManagerToolbarActions onNewDictionary={onNewDictionary} listToggle={undefined} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "New dictionary" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Start empty/ }));
    expect(onNewDictionary).toHaveBeenCalledOnce();
  });

  it("shows no New dictionary menu to someone who cannot edit dictionaries", () => {
    permissionState.canEditDictionaries = false;
    render(<DataManagerToolbarActions onNewDictionary={vi.fn()} listToggle={undefined} />);
    expect(screen.queryByRole("button", { name: "New dictionary" })).toBeNull();
  });

  it("shows the list again from Show list", () => {
    const onToggle = vi.fn();
    render(
      <DataManagerToolbarActions
        onNewDictionary={vi.fn()}
        listToggle={{ isListShown: false, onToggle }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show list" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3:** `pnpm vitest run src/views/DataManagerApp/DataManagerToolbarActions`. Expected: FAIL (no menu yet, no `listToggle` prop).

- [ ] **Step 4: Write the menu, the toggle, and the toolbar**

`NewDictionaryMenu.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Menu, Text } from "@mantine/core";
import { IconBook, IconChevronDown, IconPencil, IconSparkles } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { POPOVER_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ReactNode } from "react";

type Props = {
  /** Opens the dialog that creates an empty dictionary. */
  onStartEmpty: () => void;
};

/**
 * The two ways to start a dictionary: learn it from datasets, or start
 * empty and write it by hand.
 */
export function NewDictionaryMenu({ onStartEmpty }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();

  return (
    <Menu position="bottom-end" width={300} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <Button
          leftSection={<IconBook size={18} aria-hidden />}
          rightSection={<IconChevronDown size={14} aria-hidden />}
          size="compact-sm"
          variant="default"
        >
          {t`New dictionary`}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconSparkles size={16} aria-hidden />}
          onClick={() => {
            navigate(AppLinks.dataManagerNewDictionary(workspace.slug));
          }}
        >
          <Text size="sm">{t`From datasets`}</Text>
          <Text size="xs" c="dimmed">
            {t`Learns the codes and column meanings your datasets use`}
          </Text>
        </Menu.Item>
        <Menu.Item leftSection={<IconPencil size={16} aria-hidden />} onClick={onStartEmpty}>
          <Text size="sm">{t`Start empty`}</Text>
          <Text size="xs" c="dimmed">
            {t`Write the entries and code lists yourself`}
          </Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
```

`ListToggleButton.tsx`:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  isListShown: boolean;
  onToggle: () => void;
};

/**
 * Shows or hides the Data Sources list on a task view, which hides it by
 * default to give its tables the width.
 */
export function ListToggleButton({ isListShown, onToggle }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const Icon = isListShown ? IconLayoutSidebarLeftCollapse : IconLayoutSidebarLeftExpand;
  return (
    <Button
      variant="subtle"
      color="neutral"
      size="compact-sm"
      leftSection={<Icon size={18} aria-hidden />}
      onClick={onToggle}
    >
      {isListShown ? t`Hide list` : t`Show list`}
    </Button>
  );
}
```

Replace `DataManagerToolbarActions.tsx` with:

```tsx
import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ListToggleButton } from "@/views/DataManagerApp/DataManagerToolbarActions/ListToggleButton";
import { NewDictionaryMenu } from "@/views/DataManagerApp/DataManagerToolbarActions/NewDictionaryMenu";
import type { ReactNode } from "react";

type Props = {
  onNewDictionary: () => void;
  /** Set on a task view, where the list is hidden until shown. */
  listToggle: { isListShown: boolean; onToggle: () => void } | undefined;
};

/**
 * The Data Sources toolbar: Show list or Hide list on a task view, the New
 * dictionary menu for people who can edit dictionaries, and Add new
 * dataset.
 */
export function DataManagerToolbarActions({
  onNewDictionary,
  listToggle,
}: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const navigate = useNavigate();
  const { t } = useLingui();
  const canEditDictionaries = useHasPermission("data_sources__can_edit_dictionaries");

  return (
    <Group gap="xs" wrap="nowrap">
      {listToggle ? <ListToggleButton {...listToggle} /> : null}
      {canEditDictionaries ? <NewDictionaryMenu onStartEmpty={onNewDictionary} /> : null}
      <Button
        leftSection={<IconPlus size={18} />}
        onClick={() => {
          navigate(AppLinks.dataImport(workspace.slug));
        }}
        size="compact-sm"
        variant="light"
      >
        {t`Add new dataset`}
      </Button>
    </Group>
  );
}
```

- [ ] **Step 5:** Run the toolbar test again. Expected: PASS (4 tests).

- [ ] **Step 6: Write the failing list toggle test**

`useListPaneToggle.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@/test-utils";

const { routeState } = vi.hoisted(() => {
  return { routeState: { pathname: "/demo/data-manager/dictionaries/new", isTaskView: true } };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useMatchRoute: () => {
      return () => {
        return routeState.isTaskView ? {} : false;
      };
    },
    useLocation: (options: { select: (location: { pathname: string }) => string }) => {
      return options.select({ pathname: routeState.pathname });
    },
  };
});

const { useListPaneToggle } = await import("./useListPaneToggle");

describe("useListPaneToggle", () => {
  beforeEach(() => {
    routeState.pathname = "/demo/data-manager/dictionaries/new";
    routeState.isTaskView = true;
  });

  it("hides the list on a task view until it is shown", () => {
    const { result } = renderHook(() => {
      return useListPaneToggle();
    });
    expect(result.current.isListShown).toBe(false);
    act(() => {
      result.current.onToggleList();
    });
    expect(result.current.isListShown).toBe(true);
  });

  it("hides the list again when the route changes", () => {
    const { result, rerender } = renderHook(() => {
      return useListPaneToggle();
    });
    act(() => {
      result.current.onToggleList();
    });
    routeState.pathname = "/other/data-manager/dictionaries/new";
    rerender();
    expect(result.current.isListShown).toBe(false);
  });

  it("always shows the list outside task views", () => {
    routeState.isTaskView = false;
    const { result } = renderHook(() => {
      return useListPaneToggle();
    });
    expect(result.current).toMatchObject({ isTaskView: false, isListShown: true });
  });
});
```

- [ ] **Step 7:** `pnpm vitest run src/views/DataManagerApp/useListPaneToggle`. Expected: FAIL, module not found.

- [ ] **Step 8: Write the hook and use it**

`useListPaneToggle.ts`:

```ts
import { useLocation, useMatchRoute } from "@tanstack/react-router";
import { useState } from "react";

/**
 * Whether the Data Sources list shows beside the current view. A task view
 * (the create flow) hides it by default to free width for its tables, and
 * Show list brings it back until the route changes. Every other view always
 * shows it. Used by `DataManagerApp` and its toolbar.
 */
export function useListPaneToggle(): {
  isTaskView: boolean;
  isListShown: boolean;
  onToggleList: () => void;
} {
  const matchRoute = useMatchRoute();
  const pathname = useLocation({
    select: (location) => {
      return location.pathname;
    },
  });
  const [shownOnPathname, setShownOnPathname] = useState<string | undefined>();
  const isTaskView = Boolean(
    matchRoute({ to: "/$workspaceSlug/data-manager/dictionaries/new" }),
  );
  return {
    isTaskView,
    // Remembered for one pathname only, so the choice resets on navigation.
    isListShown: !isTaskView || shownOnPathname === pathname,
    onToggleList: () => {
      setShownOnPathname((current) => {
        return current === pathname ? undefined : pathname;
      });
    },
  };
}
```

In `DataManagerApp.tsx`: call `const listPane = useListPaneToggle();` beside the other hooks, pass the toggle to the toolbar, and render the list only while it is shown:

```tsx
        <DataManagerToolbarActions
          onNewDictionary={() => {
            setIsNewDictionaryOpen(true);
          }}
          listToggle={
            listPane.isTaskView
              ? { isListShown: listPane.isListShown, onToggle: listPane.onToggleList }
              : undefined
          }
        />
```

```tsx
        {listPane.isListShown ? (
          <DatasetNavbar
            className={css.dataManagerAppList}
            isLoading={isLoading}
            datasets={allDatasets ?? []}
            dictionaries={allDictionaries ?? []}
          />
        ) : null}
```

Add one sentence to `DataManagerApp`'s docstring: "A task view, such as learning a dictionary, hides the list until Show list brings it back."

- [ ] **Step 9:** `pnpm vitest run src/views/DataManagerApp/useListPaneToggle src/views/DataManagerApp/DataManagerToolbarActions`. Expected: PASS.

- [ ] **Step 10: Write the failing dataset menu test**

`DatasetActionsMenu.test.tsx`:

```tsx
import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DatasetActionsMenu } from "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetActionsMenu";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const { navigateMock, permissionState } = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    permissionState: { canEditDictionaries: true },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return permissionState.canEditDictionaries;
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => {
      return navigateMock;
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useFullDelete: () => {
        return [vi.fn(), false];
      },
      QueryKeys: {
        getAll: () => {
          return ["DatasetClient", "getAll"];
        },
      },
    },
  };
});

vi.mock(
  "@/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu/DatasetRefreshMenuItem",
  () => {
    return {
      DatasetRefreshMenuItem: () => {
        return null;
      },
    };
  },
);

const DATASET = Model.make("Dataset", {
  id: "00000000-0000-4000-8000-00000000000a" as Dataset.Id,
  name: "Kings line list",
  sourceType: "csv_file",
  workspaceId: "00000000-0000-4000-8000-000000000001" as Dataset.T["workspaceId"],
  ownerId: "00000000-0000-4000-8000-000000000003" as Dataset.T["ownerId"],
  ownerProfileId: "00000000-0000-4000-8000-000000000004" as Dataset.T["ownerProfileId"],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  dateOfLastSync: undefined,
  description: undefined,
  isRestricted: false,
});

describe("DatasetActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionState.canEditDictionaries = true;
  });

  it("opens learning a dictionary from this dataset", async () => {
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(screen.getByRole("button", { name: "More dataset actions" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /Create a dictionary from this dataset/ }),
    );
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/$workspaceSlug/data-manager/dictionaries/new",
      params: { workspaceSlug: "demo" },
      search: { fromDatasetId: DATASET.id },
    });
  });

  it("does not offer it to someone who cannot edit dictionaries", async () => {
    permissionState.canEditDictionaries = false;
    render(<DatasetActionsMenu dataset={DATASET} />);
    fireEvent.click(screen.getByRole("button", { name: "More dataset actions" }));
    expect(await screen.findByRole("menuitem", { name: /Delete Dataset/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Create a dictionary from this dataset/ }),
    ).toBeNull();
  });
});
```

- [ ] **Step 11:** `pnpm vitest run src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu`. Expected: FAIL (no such item).

- [ ] **Step 12: Write the menu item and add it**

`CreateDictionaryMenuItem.tsx`:

```tsx
import { Trans } from "@lingui/react/macro";
import { Menu, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * A dataset menu's way into learning a dictionary from that dataset, for
 * people who can edit dictionaries. It opens the create flow at Review with
 * the dataset already being read.
 */
export function CreateDictionaryMenuItem({ datasetId }: Readonly<Props>): ReactNode {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const canEditDictionaries = useHasPermission("data_sources__can_edit_dictionaries");
  if (!canEditDictionaries) {
    return null;
  }
  const link = AppLinks.dataManagerNewDictionary(workspace.slug);
  return (
    <>
      <Menu.Item
        leftSection={<IconSparkles size={16} aria-hidden />}
        onClick={() => {
          navigate({ to: link.to, params: link.params, search: { fromDatasetId: datasetId } });
        }}
      >
        <Text size="sm">
          <Trans>Create a dictionary from this dataset</Trans>
        </Text>
        <Text size="xs" c="dimmed">
          <Trans>Saved to Dictionaries, so other datasets can use it too</Trans>
        </Text>
      </Menu.Item>
      <Menu.Divider />
    </>
  );
}
```

In `DatasetActionsMenu.tsx`: import it, widen the menu from `width={230}` to `width={300}` so the item's second line fits, and render it first in `Menu.Dropdown`:

```tsx
      <Menu.Dropdown>
        <CreateDictionaryMenuItem datasetId={dataset.id} />
        <DatasetRefreshMenuItem dataset={dataset} />
```

Update the component's docstring's first sentence to "The actions that apply to a whole dataset but are not what the user came to do: learning a dictionary from it, re-syncing it, and deleting it."

- [ ] **Step 13:** Run the dataset menu test again. Expected: PASS (2 tests).

- [ ] **Step 14: Update slice 1's spec for the menu.** In `tests/e2e/data-dictionary-edit.spec.ts`, the New dictionary button now opens a menu. Replace

```ts
      await page.getByRole("button", { name: "New dictionary" }).click();
```

with

```ts
      await page.getByRole("button", { name: "New dictionary" }).click();
      await page.getByRole("menuitem", { name: /Start empty/ }).click();
```

- [ ] **Step 15:** `pnpm exec tsc -b --force --noEmit` and `pnpm vitest run src/views/DataManagerApp`. Expected: no errors, PASS.

- [ ] **Step 16: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore src/views/DataManagerApp tests/e2e/data-dictionary-edit.spec.ts
pnpm exec eslint --fix src/views/DataManagerApp/DataManagerToolbarActions src/views/DataManagerApp/useListPaneToggle src/views/DataManagerApp/DataManagerApp.tsx src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu tests/e2e/data-dictionary-edit.spec.ts
git add src/views/DataManagerApp/DataManagerToolbarActions src/views/DataManagerApp/DataManagerToolbarActions.tsx src/views/DataManagerApp/useListPaneToggle src/views/DataManagerApp/DataManagerApp.tsx src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu tests/e2e/data-dictionary-edit.spec.ts
git commit -m "feat(data-dictionaries): open learning a dictionary from Data Sources and a dataset

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: End-to-end spec

Load the `playwright-best-practices` skill. Read `docs/rules/e2e-testing.md`. The dataset is imported through the UI as a precondition (a 24-row CSV parses in seconds); everything under test is driven through the UI. The online suggestion route is stubbed with `page.route`, so the spec never reaches a third party. The second test runs the same suggestion on the offline model through the scripted mock runtime that e2e already enables (`VITE_OFFLINE_CHAT_MOCK=true`), and proves no request went online.

**Files:**
- Create: `tests/data/measles-line-list-small/measles-line-list-small.csv`
- Modify: `tests/e2e/helpers/constants.ts`
- Create: `tests/e2e/dictionary-create-from-dataset.spec.ts`

- [ ] **Step 1: Write the fixture**

`tests/data/measles-line-list-small/measles-line-list-small.csv`:

```csv
case_id,GENDER,hosp_yn,ses_cat,onset_dt,county
NY-2026-001,1,N,2,2026-02-03,Bronx
NY-2026-002,2,N,1,2026-02-04,Kings
NY-2026-003,1,Y,3,2026-02-04,Bronx
NY-2026-004,2,N,2,2026-02-05,Queens
NY-2026-005,1,N,4,2026-02-06,Kings
NY-2026-006,9,N,1,2026-02-06,New York
NY-2026-007,1,Y,2,2026-02-07,Bronx
NY-2026-008,2,N,3,2026-02-08,Richmond
NY-2026-009,1,N,1,2026-02-09,Kings
NY-2026-010,2,N,2,2026-02-09,Bronx
NY-2026-011,1,N,2,2026-02-10,Queens
NY-2026-012,2,Y,3,2026-02-11,Kings
NY-2026-013,9,N,4,2026-02-12,Bronx
NY-2026-014,1,N,1,2026-02-12,New York
NY-2026-015,2,N,2,2026-02-13,Kings
NY-2026-016,1,Y,3,2026-02-14,Bronx
NY-2026-017,2,N,2,2026-02-15,Queens
NY-2026-018,1,N,1,2026-02-15,Kings
NY-2026-019,2,N,4,2026-02-16,Bronx
NY-2026-020,1,N,2,2026-02-17,Richmond
NY-2026-021,2,N,3,2026-02-18,Kings
NY-2026-022,9,Y,1,2026-02-18,Bronx
NY-2026-023,1,N,2,2026-02-19,Queens
NY-2026-024,2,N,2,2026-02-20,Kings
```

What each column profiles as: `case_id` identifier (24 different values), `GENDER` categorical with 11 ones, 10 twos, and 3 nines (so its entry is named `gender` and its list is `gender (1/2/9)`), `hosp_yn` categorical with `Y`/`N`, which are too short to read as labels, so they stay unlabeled, `ses_cat` ordered (1 to 4 and a scale word), `onset_dt` date, `county` categorical whose values already read as labels.

- [ ] **Step 2: Add the constants** after `SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT` in `tests/e2e/helpers/constants.ts`:

```ts
/**
 * 24 measles cases with coded columns (GENDER 1/2/9, hosp_yn Y/N, ses_cat
 * 1 to 4), onset dates, and case ids, for learning a dictionary from a
 * dataset.
 */
export const MEASLES_LINE_LIST_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/measles-line-list-small/measles-line-list-small.csv",
);

/** Row count reported after DuckDB parses {@link MEASLES_LINE_LIST_CSV_PATH}. */
export const MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT = 24;
```

- [ ] **Step 3: Write the spec**

`tests/e2e/dictionary-create-from-dataset.spec.ts`:

```ts
/*
 * A workspace owner imports a small line list, opens "Create a dictionary
 * from this dataset" from its menu, has the values of gender suggested,
 * and saves with hosp_yn still unlabeled. The first test agrees to the
 * consent prompt and answers suggestions from a stubbed online route; the
 * second runs them on the scripted offline model and checks no prompt
 * opened and nothing went online. The imported dataset is a precondition;
 * everything the tests create is deleted afterwards.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
  MEASLES_LINE_LIST_CSV_PATH,
} from "./helpers/constants";
import { deleteDatasetFixture } from "./helpers/deleteDatasetFixture";
import { importDatasetViaUi } from "./helpers/importDatasetViaUi";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page, Route } from "@playwright/test";

const DICTIONARY_NAME = "E2E line list codes";
const SUGGESTIONS_ROUTE =
  "**/functions/v1/chat/*/dictionary-suggestions/dictionary-suggestions-v1";
const SESSION_SECRET_ROUTE = "**/functions/v1/chat/*/session-secret";
const LABELS_REPLY = JSON.stringify({
  labels: [
    { value: "1", label: "Male", isMissing: false },
    { value: "2", label: "Female", isMissing: false },
    { value: "9", label: "Unknown", isMissing: true },
  ],
  description: "Sex recorded at intake.",
});

async function _replyToSuggestions(route: Route): Promise<void> {
  const body = route.request().postDataJSON() as {
    request?: { task?: string };
  };
  const reply = body.request?.task === "labels" ? LABELS_REPLY : '{"matches":[]}';
  await route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ reply }),
  });
}

/** The consent gate mints its ack token with the chat's session secret. */
async function _replyWithSessionSecret(route: Route): Promise<void> {
  if (route.request().method() !== "GET") {
    await route.fallback();
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      sessionSecret: Buffer.alloc(32, 0x42).toString("base64"),
      issuedAt: Date.now(),
    }),
  });
}

/** Agrees to the chat's consent prompt, which a `gender` column opens as a personal data warning. */
async function _agreeToSend(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Personal data detected" });
  await dialog
    .getByRole("checkbox", {
      name: "I understand this data will be sent to the AI provider",
    })
    .check();
  await dialog.getByRole("button", { name: "Send" }).click();
}

async function _openCreateFromDataset(page: Page): Promise<void> {
  await page.getByRole("button", { name: "More dataset actions" }).click();
  await page
    .getByRole("menuitem", { name: /Create a dictionary from this dataset/ })
    .click();
  await expect(page.getByRole("heading", { name: "Coded columns" })).toBeVisible({
    timeout: LONG_WAIT,
  });
}

async function _suggestGenderLabels(
  page: Page,
  options: Readonly<{ isOnline: boolean }>,
): Promise<void> {
  await page.getByRole("button", { name: "Next: label values" }).click();
  await page.getByRole("button", { name: /gender \(1\/2\/9\)/ }).click();
  await page.getByRole("button", { name: "Suggest labels" }).click();
  if (options.isOnline) {
    await _agreeToSend(page);
  }
  await expect(page.getByRole("textbox", { name: "Label for 1" })).toHaveValue(
    "Male",
    { timeout: MEDIUM_WAIT },
  );
}

test.describe("learning a dictionary from a dataset", () => {
  test("a dictionary learned from a dataset keeps its suggested labels and its source", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    let datasetId: string | undefined;
    await page.route(SESSION_SECRET_ROUTE, _replyWithSessionSecret);
    await page.route(SUGGESTIONS_ROUTE, _replyToSuggestions);
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await _openCreateFromDataset(page);
      await expect(page.getByRole("row", { name: /ses_cat/ })).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Name of the entry from GENDER" }),
      ).toHaveValue("gender");
      await _suggestGenderLabels(page, { isOnline: true });
      await page.getByRole("button", { name: "Accept and next list" }).click();
      await page.getByRole("button", { name: "Next: save" }).click();
      await expect(page.getByText(/have no label yet/)).toBeVisible();
      await page.getByRole("textbox", { name: "Dictionary name" }).fill(DICTIONARY_NAME);
      await page.getByRole("button", { name: "Create dictionary" }).click();

      await expect(page.getByRole("heading", { name: DICTIONARY_NAME })).toBeVisible({
        timeout: LONG_WAIT,
      });
      await expect(page.getByRole("button", { name: "gender" })).toBeVisible();
      await expect(page.getByRole("row", { name: /hosp_yn/ })).toContainText(
        "2 values need a label",
      );
      const { data } = await admin
        .from("data_dictionaries")
        .select("created_from_dataset_ids")
        .eq("workspace_id", workspaceId)
        .eq("name", DICTIONARY_NAME)
        .single()
        .throwOnError();
      expect(data.created_from_dataset_ids).toEqual([datasetId]);
    } finally {
      await admin
        .from("data_dictionaries")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("name", DICTIONARY_NAME);
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });

  test("labels are suggested by the offline model when offline mode is on", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: e2eWorkerDb.workspaceSlug,
    });
    let datasetId: string | undefined;
    let onlineRequestCount = 0;
    await page.route(SUGGESTIONS_ROUTE, async (route) => {
      onlineRequestCount += 1;
      await route.abort();
    });
    await page.addInitScript(
      ({ labelsReply }) => {
        window.localStorage.setItem("avandar.offlineChat.isOfflineModeOn", "on");
        window.localStorage.setItem(
          "avandar.offlineChat.downloadedModels",
          JSON.stringify({ "Qwen3-4B-q4f16_1-MLC": true }),
        );
        Object.assign(window, {
          __AVANDAR_OFFLINE_CHAT_MOCK_SCRIPT__: [
            { match: "You label the coded values", response: labelsReply },
            { match: "You find columns", response: '{"matches":[]}' },
          ],
        });
      },
      { labelsReply: LABELS_REPLY },
    );
    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      datasetId = await importDatasetViaUi({
        page,
        filePath: MEASLES_LINE_LIST_CSV_PATH,
        expectedRowCount: MEASLES_LINE_LIST_CSV_EXPECTED_ROW_COUNT,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      await _openCreateFromDataset(page);
      await _suggestGenderLabels(page, { isOnline: false });
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(onlineRequestCount).toBe(0);
      await page.getByRole("button", { name: "Cancel" }).click();
    } finally {
      if (datasetId) {
        await deleteDatasetFixture({ admin, datasetId, workspaceId });
      }
    }
  });
});
```

The consent prompt's kind comes from the chat's detectors: a column named `gender` is a personal data warning ("Personal data detected", with an acknowledgement checkbox). If the detectors change and it opens as the plain "Send to AI?" prompt, drop the checkbox step from `_agreeToSend`; never stub `decideIfDataCanCrossBoundary` here, since the prompt is what the test is for. The model id in the init script is `LocalChatModel.OFFLINE_BUNDLE.answer`; the spec runs in the browser context, where the import is not available, so it is written out. If the bundle's model changes, change it here too.

- [ ] **Step 4:** `pnpm test:e2e dictionary-create-from-dataset.spec.ts`. Expected: 2 passed, each under 45 s. Fix the UI or the locators, never the timeout, and never add a fixed wait. If the Review heading does not appear, the dataset menu item navigated before the dataset's columns loaded: check `useReadOriginDataset` waits for `sources.isLoading` to be false.

- [ ] **Step 5: Commit**

```bash
pnpm exec oxfmt --ignore-path .oxfmtignore tests/e2e/dictionary-create-from-dataset.spec.ts tests/e2e/helpers/constants.ts
pnpm exec eslint --fix tests/e2e/dictionary-create-from-dataset.spec.ts tests/e2e/helpers/constants.ts
git add tests/data/measles-line-list-small tests/e2e/dictionary-create-from-dataset.spec.ts tests/e2e/helpers/constants.ts
git commit -m "test(data-dictionaries): cover learning a dictionary from a dataset

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Look at it, design detector, translations, feature log

**Files:**
- Modify: `src/i18n/locales/*/messages.po|ts` (generated)
- Modify: `docs/measles-demo/pr-feature-log.md`
- Modify (only when a later decision changes them): `docs/measles-demo/data-dictionaries-design.md`

- [ ] **Step 1: Capture the prototype.** With a headless Playwright session (the Playwright MCP, or `pnpm exec playwright` in a scratch script), open `file://<worktree>/.impeccable/mocks/prototype/data-dictionaries.html`, pick "Create a dictionary" in its guide, and capture each step (Pick datasets, Review columns, Label values with the race list selected, Save) into `.temp/feat-dictionary-inference/prototype-<step>.png`. Then open a dataset there, open its ⋯ menu, pick "Create a dictionary from this dataset", and capture the Review step as `prototype-from-dataset-review.png`.
- [ ] **Step 2: Capture the app.** Run `pnpm dev`. Headless, sign in with the seeded credentials from `seed/SeedData.ts` (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, workspace `TEST_WORKSPACE_SLUG`), import `tests/data/measles-line-list-small/measles-line-list-small.csv` twice (rename the second copy so two datasets exist), and capture into `.temp/feat-dictionary-inference/`: the toolbar's New dictionary menu open, a dataset's ⋯ menu, Pick datasets with both picked, the consent prompt that opens once both are read, Review columns (with Show list toggled once, both states, and an entry renamed to a name another entry has, showing the error and the disabled Next), Label values before and after Suggest labels, Label values after declining the prompt in a fresh flow, Save with the unlabeled warning, and the dictionary view after Create with its "needs a label" counts. Suggestions online need `OPEN_ROUTER_API_KEY` in `supabase/functions/.env`; without it, capture the offline path instead by turning offline mode on in Ask Avandar after downloading the bundle, or note that suggestions were not captured.
- [ ] **Step 3: Compare.** Put each app capture beside its prototype capture. Fix what differs from the prototype or from `docs/design/app-view-layout.md`, except what this plan's Refinements change on purpose (the menu instead of the Add menu, plain text instead of info notices, no Rows column on Pick, no drag handles on Label values, no Apply checkbox on Save). Check: no `Paper` or `Card` between the slate and the content, no `Callout color="info"`, more space above a heading than below, every sticky footer carries `data-sticky-action-bar`, tables fill the content column, tooltips open on focus.
- [ ] **Step 4:** `.claude/skills/impeccable/scripts/impeccable detect --json src/views/DataManagerApp/NewDictionaryFromDatasetsView src/views/DataManagerApp/DataManagerToolbarActions src/views/DataManagerApp/DatasetMetaView/DatasetActionsMenu`. Fix every mechanical finding; list the rest in the PR description.
- [ ] **Step 5:** `pnpm i18n:extract && pnpm i18n:compile`. Confirm `src/i18n/locales/en/messages.po` has `#:` references to the new view's files. Commit `src/i18n/locales` as `chore(data-dictionaries): extract learning messages`. (The pre-push hook adds machine translations; that is expected.)
- [ ] **Step 6: Log the feature.** In `docs/measles-demo/pr-feature-log.md`:
  - add a Features table row after F129: `| F130 | Learn a data dictionary from datasets: profiling, matching, and suggested labels online and offline | not started | F129 | |`
  - add a Merge order row after F129's: `| after F129 | F130 | Builds on F129's tables, save RPC, models, and Dictionary view. Changes the save RPC's pair check (migration). Deploy the migration, then the \`chat\` edge function, then the frontend. |`
  - add a `## F130: Learn a data dictionary from datasets` section after F129's, in F129's format: Status (built on `feat/dictionary-inference`, branched from `demo/measles` at `5516a9e6e`), Purpose and Value (a team creates a dictionary from one or more datasets in four steps; coded and ordered columns are found on the device, matching columns across datasets are merged, and labels are suggested online or by the offline model, sending only column names and the values of short coded columns), Design (the spec and this plan), PR title `feat(data-dictionaries): learn a dictionary from datasets`, Depends on F129, Files by area with each area's commit SHAs (list them with `git log --oneline 5516a9e6e..HEAD` and put each short SHA beside the files it touched: the save RPC schema, its migration, the desktop twin, and pgTAP; slice 1's model, copy, and editor files changed for blank labels; shared models; suggestions prompt and the `chat` route; profiling and suggestions libraries; the consent context in `ConsentAuditEntry.constants.ts`, `decideIfDataCanCrossBoundary.tsx`, and `ConsentLogPanel.tsx`; the create flow view; Data Sources entry points; e2e and fixture; translations; this plan), Schema: yes, one migration (`data_dictionaries_blank_labels`) that replaces `data_dictionaries__check_pairs` so a value may be saved with a blank label (label uniqueness ignores blanks; a blank code is still refused), plus its desktop SQLite twin; no table, column, or policy changes, Deploy: the migration first (the frontend saves blank labels, which the old function refuses), then the `chat` edge function (new route `/:workspaceId/dictionary-suggestions/:promptId`, which requires an ack token, so the frontend must ship with or after it), then the frontend, Known gaps (applying a dictionary and hiding the dataset menu item once one is applied are slice 3; Add from datasets into an existing dictionary is a separate small piece after slice 3 and will update "Made from"; slice 4 must decide what a blank-label value does in each conversion direction), and Verification (the commands in Task 21).
- [ ] **Step 7:** Commit the log: `docs(measles-demo): log learning dictionaries from datasets`.

---

### Task 21: Final verification

Run each command and read its real exit code (not through `head`).

- [ ] `ava supabase status`. Expected: first line names `feat-dictionary-inference`.
- [ ] `pnpm lint`
- [ ] `pnpm exec tsc -b --force --noEmit && pnpm type-check:deno`
- [ ] `pnpm test:frontend`
- [ ] `pnpm vitest run --config vitest.executed.config.ts src/lib/dataDictionaries`
- [ ] `pnpm test:db` (the save RPC's blank-label tests from Task 1, and slice 1's tests unchanged otherwise)
- [ ] `ava supabase migrations validate`
- [ ] `pnpm desktop:sqlite:gen-migrations`, then `git status`: no new or changed file (Task 1 committed the twin)
- [ ] `pnpm i18n:check`
- [ ] `pnpm test:e2e dictionary-create-from-dataset.spec.ts`
- [ ] `pnpm test:e2e data-dictionary-edit.spec.ts` (slice 1's spec, through the new menu and with blank labels allowed)
- [ ] `pnpm test:e2e csv-import.spec.ts` (clicks the toolbar's Add new dataset beside the new menu)
- [ ] `git status` is clean apart from generated files already committed. Leave the `ava supabase switch` in place (it changes no tracked file).

---

## Executing this plan in batches

The tasks are ordered so each batch can go to one subagent, with independent batches in parallel. Task 0 runs first, by the coordinating session.

| Batch | Tasks | Needs | Runs alongside |
| --- | --- | --- | --- |
| S: blank labels | 1, then 2 | Task 0, with `ava supabase status` naming `feat-dictionary-inference` | none |
| A: shared model | 3, 4, 5, 6 (in order) | S (Task 5's draft test uses Task 2's `findDraftWarnings`) | B |
| B: prompt and route | 7, then 8 | Task 0 | A |
| C: browser libraries | 9, 10 (either order) | A, and B's Task 7 | none |
| D: flow state and hooks | 11, then 12 | A, C, and B's Task 8 (the route body type carries `ackToken`) | none |
| E: steps | 13, 14, 15, 16 (in order; they share the footer) | D | none |
| F: wiring | 17, then 18 | E | none |
| G: e2e | 19 | F | H's Steps 1 to 4 |
| H: finish | 20, then 21 | G | none |

Every batch ends with its own tests green and a commit per task. Review between batches with the `avandar-code-review` skill.

---

## Refinements made while planning

These override the spec where they differ.

- **One schema change: blank labels (decided by the product owner).** A value may be saved without a label. `data_dictionaries__check_pairs` accepts an empty or blank label (it still needs the `label` key, as a string, and a non-blank code), and label uniqueness ignores blank labels, so two unlabeled values in one list are fine while `Yes` and `yes` still collide. The label is stored as typed (blank), never as the code. The dictionary editor and the entries table mark such a value "Needs a label" as a warning that never blocks Save (Task 2), and the create flow's Save step says unlabeled values are saved without one (Task 16). Slice 4 must decide what a blank-label value does in each conversion direction (codes to labels: keep the code or leave the cell blank; labels to codes: a blank cell cannot map back to a single code).
- **No other schema change.** `data_dictionaries.created_from_dataset_ids` is already insertable: slice 1's guard trigger refuses only updates to it. The flow inserts the dictionary with its source dataset ids, then saves the contents through the existing `rpc_data_dictionaries__save`, as spec 5.5 says. Those are two writes, so `createDictionaryFromDraft` deletes the new dictionary again when the save fails (the owner may delete their own dictionary under slice 1's RLS), and the user's work stays in the flow to retry.
- **The AI route is its own small route** (spec 18, open decision 3): `POST chat/:workspaceId/dictionary-suggestions/:promptId`, with a versioned prompt (`dictionary-suggestions-v1`) in `shared/agent/dictionarySuggestions/`, exactly like chat titles. It requires Data Sources editor. Offline, the same prompt runs on `OfflineChatEngineStore.complete` with JSON-schema constrained decoding. Where it runs comes from `resolveChatRuntimeMode`, so suggestions follow the chat's own online and offline rules: offline mode on, or offline with the bundle downloaded, means the offline model.
- **Two AI requests, with acceptance built in.** Meaning matches are asked once, automatically, right after reading two or more datasets (never for one dataset, where no match could apply). They arrive merged with a Suggested tag and a **Keep apart** button that undoes them. Labels are asked per list with **Suggest labels**, arrive prefilled with a marker, never overwrite a label the user typed, and a list stays "Suggested" until **Accept and next list**. The description comes with the label suggestion and fills the entry's description only when the list belongs to one entry and nothing was typed there.
- **Same name, different codes is joined but reviewable.** `GENDER` (1/2/9) and `sex` (M/F/U) score below 0.6 by the spec's weights (name 1, values 0), yet the prototype shows them as one entry with two code lists. Clustering joins any pair whose names are the same after normalizing, and marks it `other_codes` with the note "Same name, different codes" and Keep apart.
- **The scorer's name part, refined.** The spec's abbreviation table gains a small synonym table, so `GENDER` matches `sex` and `zip_code` matches `ZIP` and `postal_code`, which the product owner named. Jaro-Winkler is applied word by word inside the token overlap (two words of four letters or more at 0.9 or above count as one), not to whole names: whole-name Jaro-Winkler scored `symptom_fever` and `symptom_rash` at 0.89 and `sex` against `ses` at 0.82, which merged unrelated columns. When values cannot be compared (no listed values and no number ranges), the name and type weights are rescaled to sum to 1. Two columns of one dataset never merge.
- **Classification, refined.** Dates are checked before identifiers, since a timestamp is unique per row. The identifier rule's distinct share above 0.95 also needs more than 20 distinct values, so a coded column in a three-row dataset is not an identifier. The id-word rule reads the column's last raw word (`CaseNo`, `case_id`), so `hosp_yn` (expanded to "yes no") is not an identifier. `time` columns are text. Ranges are compared for numbers only, not dates.
- **Shared code lists (decided by the product owner).** Entries whose codes are identical and not all numbers share one list: `fever`, `rash`, and `cough` with `Y/N/U` share `fever, rash, cough (Y/N/U)`. Purely numeric codes share only when the columns' names start with the same word: `symptom_fever` and `symptom_rash` (both 1/2/9) share `symptom (1/2/9)`, while `GENDER` and `fever` (both 1/2/9) keep separate lists, since identical numbers alone do not mean identical meanings. A list is named after its one entry, else the shared first word, else up to three entry names, then its first four codes. Its key is built from the codes and the shared word, never from an entry name, so renaming an entry keeps its labels.
- **Entry points.** The spec's toolbar **Add** menu does not exist; slice 1 kept the "Add new dataset" button, which five e2e helpers click. So slice 1's **New dictionary** button becomes a menu with **From datasets** (this flow) and **Start empty** (slice 1's dialog). This is the "Add from datasets" entry point next to New dictionary in Data Sources. Slice 1's e2e spec is updated for the extra click.
- **"Add from datasets" into an existing dictionary is a separate small piece after slice 3 (decided by the product owner).** It is not in this slice. When built, it will merge a proposal into saved entries and add the datasets to the dictionary's "Made from" (`created_from_dataset_ids`), which slice 1's guard trigger refuses today, so that piece carries its own schema change.
- **The dataset menu item always shows to dictionary editors in this slice.** The spec shows it "only while the dataset has no binding of any mode", but bindings arrive in slice 3. Slice 3 adds that check and the "Apply a dictionary" item.
- **No "Apply it to <dataset> next" on Save.** Apply is slice 3. After saving, the new dictionary opens with a "Saved ... to Dictionaries" toast. Slice 3 adds the checkbox and the hand-off to Apply.
- **The step is not in the URL.** Spec 7.1 lists `fromDatasetId` and `step` search params. Only `fromDatasetId` is kept: every step after Pick needs the in-memory profile, so a reloaded or shared step URL would open a step with nothing to show.
- **No drag handles on Label values (decided by the product owner).** Ordered lists arrive in scale order (integer codes ascending, known scale words in scale order, missing values last), and the dictionary's Code lists tab already reorders with drag and keyboard.
- **Description-only entries get no AI description here.** Only a single-entry coded list gets one, through Suggest labels. Description-only entries are saved without descriptions and described on the dictionary.
- **Privacy.** Never sent: rows, identifiers, dates, numbers, free text, and the values of any column whose name names a person or a contact detail (`name`, `email`, `phone`, `address`, `ssn`, `mrn`, and the like). Demographic columns such as sex and race do send their codes, since a code is not a person; `isPersonalColumnName` was not reused because it flags exactly those demographics.
- **Online suggestions use the chat's consent prompt (decided by the product owner).** Every online send goes through `decideIfDataCanCrossBoundary`, the chat's gate: its detectors, `ConsentModal`, the browser-local consent log, and an ack token the `chat` route verifies with `verifyAckToken` and `hashTextPayload`, as the PDF table assistant's measurement route does. The chat keeps no stored "agreed" flag (it asks per send), so the create flow keeps the answer in its own state: the first online send of a flow forces the "Send to AI?" prompt (`explicitConsentRequired`, as the PDF assistant does); after a yes, later sends only prompt when the detectors flag something; after a no, nothing is sent online for the rest of the flow and Label values says suggestions are off. Meaning matches still run automatically after reading two or more datasets, so the prompt appears at that moment, or at the first Suggest labels, whichever comes first. Offline nothing leaves the device, so, as in the chat, nothing is asked. Consent log rows use a new context, `dictionary_suggestions`, shown as "Dictionary suggestions".
- **Offline copy.** The prototype's "Working offline? ... Suggestions need a connection" notice contradicts offline parity. The flow shows spec 8.4's sentence only when no model can answer: "Suggestions need a connection or the offline model. Labeling still works." Saving offline uses the app's standard `OfflineGated` button, not spec 12's custom sentence.
- **Pick shows Source and Columns, not Rows.** A row count needs each dataset loaded into DuckDB, which is the profiling cost the user has not asked for yet.
- **The prototype's blue notices become plain text lines,** and the unlabeled-values notice a warning `Callout`, per `app-view-layout.md` ("Callout is for failures and warnings").
- **The list pane collapses on the create route only,** the one task view so far. `useListPaneToggle` is where slice 3's Apply route and slice 5's crosswalk routes add themselves.
- **Entries are renamed inline on Review (decided by the product owner).** The default name is the entry's most common column name in lowercase words joined by `_` (`GENDER` to `gender`, `CaseNo` to `case_no`, `ZIPCode` to `zip_code`), with the first dataset read winning a tie and `_2`, `_3` added when two entries would share a name. This matches the prototype's lowercase `sex` and slice 1's names, which are compared trimmed and case-insensitively. A blank name or one another included entry has is flagged with the Dictionary view's copy and holds Next, matching the save RPC's `entry_name_required` and `entry_names_not_unique`.

## Resolved decisions

The product owner settled every open question from the first draft of this plan:

| # | Question | Decision | Where |
| --- | --- | --- | --- |
| 1 | Unlabeled values | Saved with a blank label, marked "Needs a label", never blocking Save | Tasks 1, 2, 5, 16 |
| 2 | Add from datasets into an existing dictionary | A separate small piece after slice 3, updating "Made from" | Out of this slice |
| 3 | Consent for online suggestions | The chat's consent prompt, first answer kept per flow, matches still automatic | Tasks 8, 10, 11, 12, 15, 19 |
| 4 | Renaming entries on Review | Inline, with save-matching validation and a lowercase default name | Tasks 3, 4, 6, 11, 14 |
| 5 | Drag handles on Label values | Not needed | Task 15 |
| 6 | Yes/no style lists without a shared prefix | Share one list when the codes are not all numbers | Task 5 |

Matches requests do not pass column names to the detectors after the first approval: once the user agrees to a send in a flow, `approveRequest` only prompts again when the detectors flag the values. Column names are always sent, by design, since they carry no row data and the model needs them to find a match.
