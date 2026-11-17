import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { where } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useLinkedDatasets } from "@/hooks/datasets/useLinkedDatasets/useLinkedDatasets";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { useBundledPluginManifests } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useBundledPluginManifests";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/** One thing that reads a dataset and stops working once it is deleted. */
export type DatasetDependent = Readonly<{
  key: string;
  kind: "linkedDataset" | "dataSlot";
  label: string;
}>;

/** What reads one dataset, as `useDatasetDependents` returns it. */
export type DatasetDependents = Readonly<{
  /**
   * Empty of data slots until their lookups settle, and when the bindings or
   * installs lookup fails. Linked datasets are listed regardless.
   */
  dependents: readonly DatasetDependent[];
  isLoading: boolean;

  /**
   * Whether the linked datasets, the bindings, or the installs could not be
   * loaded, so the list may be missing items or leave a data slot unnamed.
   * What was found is listed regardless.
   */
  hasFailed: boolean;
}>;

type SlotNames = Readonly<{ pluginName: string; slotTitle: string }>;

/**
 * The plugin name and slot title of a binding in the reader's language, or
 * the plugin id and slot id when this build has no manifest for the plugin
 * or the manifest does not declare the slot.
 */
function _getSlotNamesFromBinding(
  options: Readonly<{
    binding: PluginDataSlotBinding.T;
    pluginId: string;
    manifestModule: PluginManifestModule | undefined;
    locale: string;
  }>,
): SlotNames {
  const { binding, pluginId, manifestModule, locale } = options;
  if (manifestModule === undefined) {
    return { pluginName: pluginId, slotTitle: binding.slotId };
  }
  const { manifest, strings } = manifestModule;
  const localize = (value: string): string => {
    return getLocalizedTextFromManifestStrings({ strings, locale, value });
  };
  const slot = getOwnValue(manifest.dataSlots, binding.slotId);
  return {
    pluginName: localize(manifest.name),
    slotTitle: slot === undefined ? binding.slotId : localize(slot.title),
  };
}

/**
 * The names of each data slot that reads the dataset, leaving out the
 * bindings of the install being uninstalled.
 */
function _listOtherInstallSlotNames(
  options: Readonly<{
    bindings: readonly PluginDataSlotBinding.T[];
    installations: readonly PluginInstallation.T[];
    manifestModules: readonly PluginManifestModule[];
    installationId: PluginInstallation.Id;
    locale: string;
  }>,
): Array<Readonly<{ key: string; names: SlotNames }>> {
  const { installations, manifestModules } = options;
  return options.bindings
    .filter((binding) => {
      return binding.installationId !== options.installationId;
    })
    .map((binding) => {
      const pluginId =
        installations.find((installation) => {
          return installation.id === binding.installationId;
        })?.pluginId ?? binding.installationId;
      const names = _getSlotNamesFromBinding({
        binding,
        pluginId,
        manifestModule: manifestModules.find((manifestModule) => {
          return manifestModule.manifest.id === pluginId;
        }),
        locale: options.locale,
      });
      return { key: binding.id, names };
    });
}

/**
 * Other installs' data slots that read the dataset, labelled "<plugin>:
 * <slot>". Nothing is listed while the lookups load or after one fails.
 */
function useDataSlotDependents(
  options: Readonly<{
    datasetId: Dataset.Id;
    installationId: PluginInstallation.Id;
  }>,
): DatasetDependents {
  const { t, i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  // Both lists are read again on every mount, since the persisted cache can
  // restore one from before a slot was bound or a plugin was installed.
  const [bindings, , bindingsQuery] = PluginDataSlotBindingClient.useGetAll({
    ...where("dataset_id", "eq", options.datasetId),
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [installations, , installationsQuery] =
    PluginInstallationClient.useGetAll({
      ...where("workspace_id", "eq", workspace.id),
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const [loadedManifests, isLoadingManifests] = useBundledPluginManifests();
  const isLoading =
    bindingsQuery.isFetching ||
    installationsQuery.isFetching ||
    isLoadingManifests;
  const hasFailed = bindingsQuery.isError || installationsQuery.isError;
  if (isLoading || hasFailed) {
    return { dependents: [], isLoading, hasFailed };
  }
  const dependents = _listOtherInstallSlotNames({
    bindings: bindings ?? [],
    installations: installations ?? [],
    manifestModules: loadedManifests?.manifestModules ?? [],
    installationId: options.installationId,
    locale: i18n.locale,
  }).map(({ key, names }) => {
    const { pluginName, slotTitle } = names;
    return {
      key,
      kind: "dataSlot" as const,
      label: t`${pluginName}: ${slotTitle}`,
    };
  });
  return { dependents, isLoading, hasFailed };
}

/**
 * What reads one dataset and stops working once it is deleted: the linked
 * datasets that read it, then other plugins' data slots bound to it. The
 * install being uninstalled is left out, since its bindings go with it. It
 * tells an admin what would break before they choose to delete the dataset.
 *
 * Both sides are read fresh on every mount, so the result reports loading
 * while either refetches, and a failure when either lookup failed. The data
 * slot side lists nothing while it loads or after it fails. The linked
 * datasets side lists whatever it found.
 */
export function useDatasetDependents(
  options: Readonly<{
    datasetId: Dataset.Id;
    installationId: PluginInstallation.Id;
  }>,
): DatasetDependents {
  const linkedDatasetsResult = useLinkedDatasets(options.datasetId);
  const dataSlotsResult = useDataSlotDependents(options);
  return {
    dependents: [
      ...linkedDatasetsResult.linkedDatasets.map((linkedDataset) => {
        return {
          key: linkedDataset.id,
          kind: "linkedDataset" as const,
          label: linkedDataset.name,
        };
      }),
      ...dataSlotsResult.dependents,
    ],
    isLoading:
      linkedDatasetsResult.isLoading ||
      linkedDatasetsResult.isFetching ||
      dataSlotsResult.isLoading,
    hasFailed: linkedDatasetsResult.hasFailed || dataSlotsResult.hasFailed,
  };
}
