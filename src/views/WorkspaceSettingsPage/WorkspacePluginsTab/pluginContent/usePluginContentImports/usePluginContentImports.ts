import { promiseMapSequential } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getPluginIndexEntry } from "@/lib/plugins/pluginIndexHelpers";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { importPluginContentItem } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";

/**
 * Where one content item's import stands in this session.
 *
 * - `pending`: queued behind the item importing before it.
 * - `importing`: downloading, parsing, and uploading now.
 * - `done`: imported as the dataset `datasetId`.
 * - `failed`: stopped for `reason`. Importing it again retries it.
 */
export type PluginContentImportStatus =
  | Readonly<{ kind: "pending" }>
  | Readonly<{ kind: "importing" }>
  | Readonly<{ kind: "done"; datasetId: Dataset.Id }>
  | Readonly<{ kind: "failed"; reason: string }>;

/** A plugin's content imports, with what each item is doing. */
export type PluginContentImports = Readonly<{
  /** Only items imported in this session have a status. */
  statusesByContentId: Readonly<Record<string, PluginContentImportStatus>>;
  isImporting: boolean;

  /** Imports items one at a time. A failure stops only that item. */
  importItems: (items: readonly PluginContentItem[]) => Promise<void>;
}>;

type StatusesByContentId = PluginContentImports["statusesByContentId"];

function _getReasonFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type ContentUrlsPromise = Promise<Readonly<Record<string, string>>>;

/** Imports one content item, recording its status as it goes. */
function useImportContentItem(
  manifestModule: PluginManifestModule,
  setStatuses: (statuses: StatusesByContentId) => void,
): (item: PluginContentItem, urlsPromise: ContentUrlsPromise) => Promise<void> {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const localize = useLocalizePluginText(manifestModule.strings);
  return async (item, urlsPromise) => {
    setStatuses({ [item.id]: { kind: "importing" } });
    try {
      const url = getOwnValue(await urlsPromise, item.id);
      if (url === undefined) {
        const filePath = item.file;
        throw new Error(t`This plugin no longer includes ${filePath}.`);
      }
      const datasetId = await importPluginContentItem({
        workspaceId: workspace.id,
        userId: user!.id,
        pluginId: manifestModule.manifest.id,
        item,
        datasetName: localize(item.title),
        datasetDescription: localize(item.description),
        url,
      });
      setStatuses({ [item.id]: { kind: "done", datasetId } });
      void queryClient.invalidateQueries({
        queryKey: PluginContentImportClient.QueryKeys.getAll(),
      });
      // The new dataset joins every dataset list, such as Data Sources.
      void queryClient.invalidateQueries({
        queryKey: DatasetClient.QueryKeys.getAll(),
      });
    } catch (error) {
      setStatuses({
        [item.id]: { kind: "failed", reason: _getReasonFromError(error) },
      });
    }
  };
}

/**
 * Imports a plugin's bundled content into the current workspace as datasets,
 * named and described in the reader's language, and tracks each item's
 * progress for the screen that started it. Use it wherever content is
 * imported, for example the install wizard's Confirm step or the Import and
 * Retry buttons on a plugin's card.
 */
export function usePluginContentImports(
  manifestModule: PluginManifestModule,
): PluginContentImports {
  const [statusesByContentId, setStatusesByContentId] =
    useState<StatusesByContentId>({});
  const setStatuses = (statuses: StatusesByContentId): void => {
    setStatusesByContentId((current) => {
      return { ...current, ...statuses };
    });
  };
  const importItem = useImportContentItem(manifestModule, setStatuses);
  return {
    statusesByContentId,
    isImporting: Object.values(statusesByContentId).some((status) => {
      return status.kind === "pending" || status.kind === "importing";
    }),
    importItems: async (items) => {
      setStatuses(
        Object.fromEntries(
          items.map((item) => {
            return [item.id, { kind: "pending" }];
          }),
        ),
      );
      // Loaded once for the batch, and awaited inside each item's import,
      // so a failure to load them fails each item with its reason.
      const urlsPromise = Promise.resolve(
        getPluginIndexEntry(manifestModule.manifest.id)?.loadContentUrls?.() ??
          {},
      );
      await promiseMapSequential(items, (item) => {
        return importItem(item, urlsPromise);
      });
    },
  };
}
