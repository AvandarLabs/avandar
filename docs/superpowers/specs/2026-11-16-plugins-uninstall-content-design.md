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
- A failed delete never blocks the uninstall and never leaves a dataset half
  deleted.

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
| `uninstallPluginAndDeleteDatasets.ts` | Plain async function, no React. Uninstalls, then deletes each chosen dataset. Returns the ids it could not delete |

Changes to existing files:

- `usePluginInstallationActions.ts`: `uninstall` opens the modal when the
  plugin has imports, and otherwise runs today's delete mutation.
- `PluginActions.tsx` / `usePluginActionCopy.ts`: the uninstall confirm copy
  loses its "datasets stay" sentence, since a plugin with imports now gets the
  modal instead of the confirm. The card must not show the confirm and then
  the modal.

## Data flow

`useUninstallContentRows({ pluginId, installationId })`:

1. Loads the workspace's `plugin_content_imports` rows for `pluginId`
   (`useImportedPluginContent`).
2. Loads those datasets by id (`DatasetClient.useGetAll` with an `in` filter).
   An import whose dataset is missing from the result is one the user cannot
   read. It counts toward the "can't see" line.
3. For each readable dataset, checks
   `UserClient.canAccessResource({ resourceType: "dataset", resourceId, minRole: "admin" })`
   through one React Query query per dataset.
4. Returns rows `{ datasetId, name, canDelete }`, sorted by name, plus
   `hiddenCount` and `isLoading`.

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
   back with `PluginInstallationClient.getById`. If the delete throws, or the
   install is still there, it throws and deletes nothing. The read-back is
   needed because the Supabase CRUD client's `delete` does not check how many
   rows it deleted, so a delete that RLS refuses succeeds silently with zero
   rows.
2. For each dataset id, in the order shown:
   1. Re-checks `canAccessResource(dataset, admin)`. If it is false, the id is
      recorded as failed and `fullDelete` is not called. `fullDelete` checks
      the same access first and throws a `DatasetDeleteError`, so this check
      is kept only so that a refused dataset is recorded as failed without an
      error.
   2. Calls `DatasetClient.fullDelete({ id })`. A throw records the id as
      failed, and the loop continues.
3. Returns `{ failedDatasetIds }`.

The modal then:

- Invalidates the plugin installation, plugin content import, plugin data
  slot binding, and dataset queries, so Data Sources and the cards update
  without a reload.
- Notifies:
  - Nothing checked: "Mozambique uninstalled" (today's message).
  - Everything deleted: "Mozambique uninstalled. 2 datasets deleted."
  - Some failed: a warning, "Mozambique uninstalled. These datasets could not
    be deleted and are still in Data Sources:" followed by their names.
  - Uninstall failed: today's error notification. The modal stays open and
    the admin can retry or cancel.

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
| Unit | `uninstallPluginAndDeleteDatasets.test.ts` | Uninstall runs before any delete. A failed uninstall deletes nothing, including one whose install is still there after a delete that did not throw. A failed delete does not stop the others and is returned. A dataset that fails the admin re-check is returned and `fullDelete` is never called for it |
| Unit | `useUninstallContentRows.test.ts` | Uses the dataset's current name. `canDelete` follows `canAccessResource`. Unreadable datasets count toward `hiddenCount`. Rows are sorted by name |
| Unit | `useDatasetDependents.test.ts` | Lists linked datasets. Describes other installs' bindings as "<slot> in the <plugin> plugin". Leaves out the uninstalled install's own bindings. Falls back to the plugin id without a manifest |
| Component | `UninstallPluginModal.test.tsx` | Checkboxes start unchecked. The confirm label follows the count. Dependents show only for checked rows. A non-deletable row has no checkbox. The modal cannot close while running. The notification matches the outcome |
| Component | `PluginActions.test.tsx` (existing) | A plugin with no imports still gets the one-line confirm. A plugin with imports opens the modal without a confirm first |
| E2E | `tests/e2e/plugins-mozambique-uninstall.spec.ts` | Install the Mozambique pack through the UI, uninstall it with one dataset checked. That dataset is gone from Data Sources and the other stays. `finally` deletes whatever the test left and removes the install, through the helpers in `tests/e2e/helpers/pluginFlow.ts` |

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
  instead of a silent success. This path's own
  re-check in `uninstallPluginAndDeleteDatasets` stays, so a dataset the user
  may no longer delete is recorded as failed without a throw.

## Done when

An admin uninstalls the Mozambique pack, chooses to delete one of its two
datasets, and Data Sources then shows only the other one. An admin without
admin access to a dataset sees it marked as kept and cannot delete it.
