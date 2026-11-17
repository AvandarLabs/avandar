# Plugins: Keep or Delete Imported Datasets at Uninstall

**Author:** Juan Pablo Sarmiento (pablo@avandarlabs.com)
**Date:** 2026-11-16
**Status:** Design approved
**Parent:** `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`
(section 4, "Disable and uninstall")
**Builds on:** `docs/superpowers/specs/2026-11-11-plugins-1d-data-slots-design.md`,
which listed this as a non-goal

## Context

Slice 1d lets a plugin bundle datasets (`contributes.content`). An admin
imports them in the install wizard or on the plugin card, and each import is
recorded in `plugin_content_imports`. Uninstalling deletes the
`plugin_installations` row and with it the plugin's data slot bindings, but
every imported dataset stays. The uninstall confirmation says so: "Its
features are removed from this workspace. The datasets it imported stay in
Data Sources."

The ecosystem spec's uninstall table says imported content is "Kept by
default, since the workspace owns them. Each item gets a keep or delete
choice". This spec adds that choice.

Three facts shape the design:

1. Deleting a dataset needs admin access to that dataset
   (`util__auth_user_can_delete_resource`, the `datasets` DELETE policy). That
   is a different right from managing plugins in Settings, and an import is
   owned by whoever imported it.
2. An imported dataset may now be read by other things: linked datasets
   (dictionary conversions) and other plugins' data slot bindings.
3. `DatasetClient.fullDelete` checks the user's admin access to the dataset,
   removes its parquet (and retained original) from Storage, deletes the
   `datasets` row, and confirms the row is gone. Storage cleanup happens in
   the browser, so no server transaction can make an uninstall and its
   deletes atomic.

## Goals

- When a plugin has imported datasets into the workspace, the uninstall
  dialog lists them, and the admin can mark each one for deletion.
- Keeping stays the default. Nothing is deleted unless the admin checks it.
- Uninstalling never deletes a dataset the admin could not already delete from
  Data Sources.
- Before deleting, the admin sees what reads each dataset marked for deletion,
  as Delete Dataset in Data Sources does today.
- A lookup that fails is never shown as a dataset the user cannot see or
  cannot delete. The admin is told, can retry, and can still uninstall with
  every dataset kept.
- A failed delete never blocks the uninstall. A dataset the user may not
  delete is never touched, and one whose delete did not finish is named, so
  the admin can check it.

## Non-goals

- A server function that deletes datasets on behalf of a user without
  dataset admin access.
- Blocking a delete because something reads the dataset.
- Listing dashboards, maps, or crosswalks that read the dataset. The dialog
  matches what Data Sources lists today (linked datasets), plus other plugins'
  data slots.
- Deleting imported datasets from the plugin card outside of uninstall. Data
  Sources already does that.
- Plugin storage, secrets, and the 30-day retention from the ecosystem spec's
  uninstall table. None of them exist yet.

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Who can delete | Only datasets the current user may delete (`canAccessResource(dataset, admin)`). Others are shown as kept, with the reason |
| 2 | Datasets in use | Warn, then allow. A checked dataset lists what reads it and stops working |
| 3 | Order | Uninstall first, then delete the chosen datasets one at a time in the browser through `DatasetClient.fullDelete` |
| 4 | Default | Every dataset starts unchecked (kept) |
| 5 | Plugins without imports | Keep today's one-line confirm |
| 6 | A lookup fails | Say so with a Retry. Uninstall stays enabled as an uninstall that keeps every dataset, because keeping is always safe, and the copy says so |

Two alternatives were rejected:

- **One server RPC that uninstalls and deletes the rows in a transaction.** It
  cannot delete the Storage objects, so it is atomic only in appearance, and it
  would add a second delete path that skips `fullDelete`'s cleanup.
- **Delete first, uninstall only if every delete succeeded.** One failed delete
  would block the uninstall, and the deletes that already ran cannot be undone.

## What the admin sees

The card's Uninstall button opens a modal instead of the confirm, when this
workspace has at least one `plugin_content_imports` row for the plugin:

```
Uninstall Mozambique?
Its features are removed from this workspace.

Datasets it imported
  [ ] Delete  Mozambique provinces
  [x] Delete  Mozambique districts
        These read it and stop working once it is deleted:
        • Districts with population (linked dataset)
        • Cases in the Epidemiology plugin
  [–] Mozambique health facilities
        Kept. Only a dataset admin can delete it.
  1 more dataset you can't see stays.

Unchecked datasets stay in Data Sources.
                              [Cancel]  [Uninstall]
```

- Each row shows the dataset's current name, which may differ from the
  manifest's content title after a rename.
- A dataset the user may not delete has no checkbox, and reads "Kept. Only a
  dataset admin can delete it."
- An import whose dataset the user cannot read (RLS hides the row) is not
  named. The rows collapse into one count line: "1 more dataset you can't see
  stays" (plural through Lingui `Plural`).
- The dependents list appears under a row only while it is checked.
- The confirm button reads "Uninstall" with nothing checked, and "Uninstall
  and delete 1 dataset" / "Uninstall and delete N datasets" otherwise.
- While the uninstall and deletes run, the confirm button shows a loader, and
  the modal cannot be closed (no close button, no Escape, no outside click),
  the same rule as the install wizard. Focus returns to the card heading
  afterwards, because the Uninstall button is gone once the plugin is
  uninstalled.
- A plugin with imports but status `unavailable` (no manifest in this build)
  gets the same modal. Every value it shows comes from the import rows and
  the dataset rows, not the manifest.

- A linked dataset reads "<name> (linked dataset)". Another plugin's use of the
  dataset reads "<slot title> in the <plugin name> plugin", one translatable
  message with named placeholders. Without a manifest for that plugin in this
  build, it uses the plugin id and the slot id in the same sentence.

When a lookup fails, the admin sees an error instead of a claim from data that
never loaded. There are two places it can fail, and both offer Retry and an
uninstall that keeps every dataset.

**On the card**, when the lookup of the plugin's imports failed (and no retry
is in flight), an alert sits under the card's actions, only for an admin of an
installed plugin:

```
We could not check whether this plugin imported datasets.   [Retry]
```

- Retry asks for the imports again. While the lookup loads or retries,
  Uninstall is disabled and the alert is hidden, as before.
- Uninstall stays enabled. It opens the one-line confirm, never the dataset
  modal, even when a restored cache still lists imports. The confirm adds a
  second paragraph: "We could not check for datasets this plugin imported. If
  you uninstall it now, every dataset it imported is kept." Confirming runs
  today's plain delete, which touches no dataset.

**In the modal**, when the imports lookup, the dataset lookup, or any access
check failed (and no retry is in flight), an alert replaces the list:

```
Uninstall Mozambique?
Its features are removed from this workspace.

Datasets it imported
  We could not load the datasets this plugin imported.   [Retry]

Every dataset it imported stays in Data Sources.
                       [Cancel]  [Uninstall and keep all datasets]
```

- There is no "can't see" count and no "Kept. Only a dataset admin can delete
  it." line, since neither is known. Nothing can be checked for deletion, and
  the confirm passes an empty delete list.
- Retry asks again for whatever failed. While it runs, the modal shows the
  loader and the confirm button is disabled. A successful retry returns to the
  normal list. A retry that fails shows the error again.
- An import whose dataset the user genuinely cannot read (RLS hides the row)
  is unchanged: when the lookup succeeded, it still counts toward "N more
  datasets you can't see stay".

All copy goes through Lingui. The copy says "dataset", never "content import",
and never "data slot", which is the manifest's term and not the admin's.

## Parts

All new files live under
`src/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/`
unless stated otherwise.

| Part | Job |
| --- | --- |
| `openUninstallPluginModal.tsx` | Opens the modal through Mantine `modals.open`, following `openPluginInstallWizard.tsx` |
| `UninstallPluginModal.tsx` | The modal body: the rows, the checkboxes, the count line, the confirm and cancel buttons, and the running state |
| `UninstallContentRow.tsx` | One dataset row, with its checkbox or its "Kept" reason, and its dependents while checked |
| `useUninstallContentRows.ts` | Builds the rows. See Data flow |
| `useDatasetDependents.ts` | For one dataset id, the linked datasets that read it and the other installs' data slot bindings on it |
| `uninstallPluginAndDeleteDatasets.ts` | Plain async function, no React. Uninstalls, then deletes each chosen dataset. Returns the ids it deleted, the ids the user may not delete, and the ids whose delete did not finish |
| `UninstallPluginError.ts` | The error `uninstallPluginAndDeleteDatasets` throws when it cannot show the install is gone. Its `reason` is `still_installed` or `not_confirmed`, and its message is for logs |
| `useRunUninstall.ts` | Runs an uninstall from the modal. Logs a failure, refreshes the plugin and dataset lists, says how it went (the translated copy for each `UninstallPluginError` reason, a generic sentence for any other error), and calls `onDone` once the lists have refreshed |

Changes to existing files:

- `usePluginInstallationActions.ts`: `uninstall` opens the modal when the
  plugin has imports, and otherwise runs today's delete mutation.
- `PluginActions.tsx` / `usePluginActionCopy.ts`: the uninstall confirm copy
  loses its "datasets stay" sentence, since a plugin with imports now gets the
  modal instead of the confirm. The card must not show the confirm and then
  the modal. When the imports lookup failed, the confirm gains the paragraph
  that says every dataset is kept.
- `PluginSettingsCard.tsx`: shows the lookup alert with Retry, and tells
  `PluginActions` whether the lookup is loading or has failed.
- `useImportedPluginContent.ts`: exposes `refetch`.
- `PluginLookupErrorCallout.tsx` (new, in `PluginSettingsCard/`): the alert
  with a Retry button, shared by the card and the modal.

## Data flow

`useUninstallContentRows({ pluginId, installationId })`:

1. Loads the workspace's `plugin_content_imports` rows for `pluginId`
   (`useImportedPluginContent`).
2. Loads those datasets by id (`DatasetClient.useGetAll` with an `in` filter).
   An import whose dataset is missing from the result is one the user cannot
   read. It counts toward the "can't see" line.
3. For each readable dataset, checks
   `UserClient.canAccessResource({ resourceType: "dataset", resourceId, minRole: "admin" })`
   through one React Query query per dataset. A check that throws counts as a
   failure (see `hasFailed`), not as "not allowed".
4. Returns rows `{ datasetId, name, canDelete }`, sorted by name, plus
   `hiddenCount`, `isLoading`, `hasFailed`, and `retry`.

`hasFailed` is true when the imports lookup failed, the dataset lookup failed,
or any access check failed, and none of them is being retried. A failure is
never read as an answer: a failed dataset lookup does not count the imports
as "can't see", and a failed access check does not mean "not deletable". In
that state `rows` is empty and `hiddenCount` is 0. After a failed imports
lookup the restored list is not used to ask for datasets. `retry` refetches
only what failed, and `isLoading` stays true until the retry settles.

`useDatasetDependents({ datasetId, installationId })`, called only for a
checked row:

- Linked datasets: reuse `useLinkedDatasets` (the hook behind
  `DeleteDatasetConfirmBody`).
- Data slots: `plugin_data_slot_bindings` rows with this `dataset_id` and an
  `installation_id` other than the one being uninstalled. Each is labelled
  "<plugin name>: <slot title>", localized from the bundled manifests
  (`useBundledPluginManifests`, `useLocalizePluginText`). A binding whose
  plugin has no manifest in this build is labelled with its plugin id.
- Case type bindings are not listed. A case type that reads the dataset is a
  concept relation, which Data Sources does not list either.

`uninstallPluginAndDeleteDatasets({ installationId, datasetIds })`:

1. Deletes the install with `PluginInstallationClient.delete`, then reads it
   back with `PluginInstallationClient.getById`. It throws an
   `UninstallPluginError` and deletes nothing in two cases:
   - `still_installed`: the install is still there after a delete that did not
     throw. The read-back is needed because the Supabase CRUD client's
     `delete` does not check how many rows it deleted, so a delete that RLS
     refuses succeeds silently with zero rows.
   - `not_confirmed`: the read-back itself threw, so it is unknown whether the
     install is gone.

   If the delete itself throws, that error propagates unchanged and nothing is
   deleted. On desktop the read-back proves nothing about the server:
   `plugin_installations` is not mirrored to the desktop SQLite database, so
   the CRUD client targets a local table that does not exist and its delete
   throws before any dataset is touched.
2. Removes duplicate ids, keeping the order of first appearance. Then, for each
   id in that order:
   1. Reads the dataset with `DatasetClient.getById`. A row that is already
      missing, such as one deleted by someone else after the dialog loaded, is
      nothing to do. It is in none of the outcome lists, and `fullDelete` is
      not called. A read that throws records the id as incomplete. Nothing was
      deleted, but the admin should check it.
   2. Calls `DatasetClient.fullDelete({ id })`. It does not check admin access
      itself, because `fullDelete` checks it before it touches Storage (through
      the platform server API, since the desktop webview has no Supabase
      session) and throws a `DatasetDeleteError` with reason `not_allowed`.
      That error records the id as refused. Nothing of it was touched, and it
      is not logged as unexpected.
   3. Any other throw is logged. `fullDelete` removes a dataset's files before
      its row, so a dataset that did not end up deleted is recorded as
      incomplete, never assumed intact. A `DatasetDeleteError` with reason
      `still_present` already shows the row survived. For any other error the
      dataset is read again, since `fullDelete` can throw after it deleted
      the row, for example while it cleans up local copies or reads the row
      back. A dataset whose row is gone counts as deleted. A dataset whose
      row is still there, or whose re-read throws, is incomplete. A failure
      never stops the loop.
3. Returns `{ deletedDatasetIds, refusedDatasetIds, incompleteDatasetIds }`.
   A dataset that was already gone is in none of the lists.

The modal then:

- Logs the uninstall error with the install id, and translates an
  `UninstallPluginError` by its `reason` into plain copy. It never shows an
  error's own message, which is for logs. Any other error gets a generic
  translated sentence.
- Invalidates the plugin installation, plugin content import, plugin data
  slot binding, and dataset queries, so Data Sources and the cards update
  without a reload. This also runs when the uninstall throws, so a card does
  not keep showing an install that is gone. A refresh that rejects is logged
  and does not change how the uninstall is reported. The modal closes only
  after the refresh has finished.
- Notifies:
  - Nothing checked, or nothing deleted by this run: "Mozambique
    uninstalled" (today's message).
  - Everything deleted: "Mozambique uninstalled. 2 datasets deleted." The
    count is the datasets this run deleted.
  - Some datasets the user may not delete: a warning titled "Mozambique
    uninstalled", reading "These datasets were not deleted because you can't
    delete them, and they are still in Data Sources:" and their names.
  - Some datasets whose delete did not finish: a warning with the same title,
    reading "These datasets could not be fully deleted. Their data may
    already be gone. Check them in Data Sources and delete them again:" and
    their names.
  - Both kinds: one warning with both sentences, the incomplete one first.
    Each sentence is its own translatable message with its own list of names.
  - Any warning replaces the success message, even when other datasets were
    deleted, so a failure never hides behind a success.
  - Uninstall failed with `still_installed`: "Could not update Mozambique.
    Mozambique is still installed. You may not have permission to uninstall
    it."
  - Uninstall failed with `not_confirmed`: "Could not update Mozambique. We
    could not confirm the uninstall. Check the plugin list, then try again."
  - Any other uninstall failure: "Could not update Mozambique. Something went
    wrong while uninstalling. Try again." The modal stays open and the admin
    can retry or cancel.

What deleting a dataset already does, unchanged by this spec:

- Its `plugin_content_imports` row is deleted by the cascade on
  `plugin_content_imports__dataset_in_workspace_fkey`, so a reinstall offers
  the item for import again.
- Another plugin's binding on it keeps a null `dataset_id` and reads as
  Broken on that plugin's card.

## Testing

No schema change, so no pgTAP tests and no Supabase switch.

| Level | File | Proves |
| --- | --- | --- |
| Unit | `uninstallPluginAndDeleteDatasets.test.ts` | Uninstall runs before any delete. A failed uninstall deletes nothing, including one whose install is still there (`still_installed`) or could not be read back (`not_confirmed`). Deletes run one at a time, and a delete does not start before the one before it settles. A failed delete does not stop the others and is returned as incomplete. A dataset `fullDelete` refuses with `not_allowed` is returned as refused without an error log. A dataset whose row survives (`still_present`) is returned as incomplete and its error is logged. A dataset that cannot be read first, or whose re-read also throws, is incomplete. A dataset whose row is gone after `fullDelete` threw counts as deleted. A dataset that is already gone is not failed and never reaches `fullDelete`. A duplicate id is deleted once |
| Unit | `useImportedPluginContent.test.tsx` | `refetch` asks the imports lookup again |
| Unit | `useUninstallContentRows.test.tsx` | Uses the dataset's current name. `canDelete` follows `canAccessResource`. Unreadable datasets count toward `hiddenCount`. Rows are sorted by name. `hasFailed` is true for each failure source (imports, datasets, an access check), with no rows and no `hiddenCount`, and false while a failed lookup is retried. `retry` refetches only what failed, and the rows return when it succeeds |
| Unit | `useDatasetDependents.test.ts` | Lists linked datasets. Describes other installs' bindings as "<slot> in the <plugin> plugin". Leaves out the uninstalled install's own bindings. Falls back to the plugin id without a manifest |
| Component | `UninstallPluginModal.test.tsx` | Checkboxes start unchecked. The confirm label follows the count. Dependents show only for checked rows. A non-deletable row has no checkbox. The modal cannot close while running. When a lookup failed it shows the alert and Retry, no "can't see" count and no "Kept" line, reads "Uninstall and keep all datasets" with "Every dataset it imported stays in Data Sources.", deletes nothing on confirm, and returns to the list after a successful retry |
| Unit | `useRunUninstall/useRunUninstall.test.tsx` | The notification matches the outcome, and counts only the datasets this run deleted. A refused dataset, an incomplete dataset, and both together each get their own warning text, and a warning is never replaced by a success when other datasets were deleted. An `UninstallPluginError` shows translated copy by reason, and any other error shows the generic sentence. A failure is logged with the install id. The lists refresh when the uninstall fails. A refresh that rejects is logged, and neither hides the result nor blocks `onDone`. `onDone` waits for the refresh |
| Component | `PluginActions.test.tsx` (existing) | A plugin with no imports still gets the one-line confirm. A plugin with imports opens the modal without a confirm first. When the imports lookup failed, Uninstall gets the plain confirm with the kept-datasets paragraph and never opens the modal |
| Component | `WorkspacePluginsTab.test.tsx` (existing) | Uninstall is disabled while the imports load or retry. When the lookup failed, the card shows the alert with Retry (only to an admin of an installed plugin), Retry refetches, Uninstall is enabled, and its confirm carries the kept-datasets paragraph |
| E2E | `tests/e2e/plugins-mozambique-uninstall.spec.ts` | Install the Mozambique pack through the UI, uninstall it with one dataset checked. That dataset is gone from Data Sources and the other stays. `finally` deletes whatever the test left and removes the install, through the helpers in `tests/e2e/helpers/mozambiquePackFlow.ts` |

The E2E runs under the 45-second local limit, using the existing Mozambique
install helpers.

## Docs

- `docs/plugin-authoring.md` section 14, "Bundle datasets": a paragraph on what
  an admin sees at uninstall, and that keeping is the default.
- `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`, "Disable and
  uninstall": note under the table that the keep or delete choice for imported
  datasets is built, and the rest of the table is not.
- New strings are extracted and translated in every locale.

## Branch

`feat/plugins-uninstall-content`, from `origin/demo/measles` at `4b443e1ed`.
It shares no source files with `fix/plugins-leftovers`, only the `.po`
catalogs. Merge into `demo/measles` only with Pablo's explicit approval. A
push to `demo/**` deploys.

## Fixed

- **`fullDelete` deleted a dataset's files before it knew the row would
  go.** It deleted the parquet from Storage before the `datasets` row, and a
  row that RLS hides from DELETE is deleted silently with zero rows affected.
  A user whose dataset admin access was revoked after the page loaded could
  end up with a dataset that has no data, and see a success. `fullDelete` now
  checks admin access before it touches Storage and reads the row back after
  the delete, and throws a `DatasetDeleteError` if either check fails. If
  access is revoked between the access check and the row delete, the files
  are already gone permanently, but the read-back now reports it as an error
  instead of a silent success. Because of that
  check, `uninstallPluginAndDeleteDatasets` has no access check of its own: it
  records a `not_allowed` refusal from `fullDelete` as a refused dataset. Any
  other failure after that check is recorded as incomplete, since the files
  may already be gone.
- **Known limit.** A dataset that becomes unreadable to the user between the
  uninstall's first read and `fullDelete`'s own read makes `fullDelete` skip
  the Storage cleanup and return normally after a delete that may remove no
  row. A user who may delete a row but not read it can also end with the row
  deleted and the parquet left behind. The uninstall still counts such a
  dataset as deleted. No data is lost that the admin did not ask to delete.

## Done when

An admin uninstalls the Mozambique pack, chooses to delete one of its two
datasets, and Data Sources then shows only the other one. An admin without
admin access to a dataset sees it marked as kept and cannot delete it.
