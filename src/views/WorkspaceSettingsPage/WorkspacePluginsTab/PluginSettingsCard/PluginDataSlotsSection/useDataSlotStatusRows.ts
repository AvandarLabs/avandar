import { useQuery } from "@avandar/query-hooks";
import { where } from "@avandar/utils";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import { loadDataSlotSource } from "@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type {
  PluginDataSlot,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

/** One data slot of an installed plugin, with its binding and status. */
export type DataSlotStatusRow = Readonly<{
  slotId: string;
  slot: PluginDataSlot;
  binding: PluginDataSlotBinding.T | undefined;

  /** Undefined when unbound, or when the bound source is gone. */
  source: DataSlotSource | undefined;
  status: DataSlotBindingStatus;
}>;

async function _loadRow(
  options: Omit<DataSlotStatusRow, "source" | "status">,
): Promise<DataSlotStatusRow> {
  const { slot, binding } = options;
  const source =
    binding === undefined ? undefined : await loadDataSlotSource(binding);
  return {
    ...options,
    source,
    status: getDataSlotBindingStatus({ slot, binding, source }),
  };
}

/** The data slot rows of an installed plugin, or why they did not load. */
export type DataSlotStatusRows = Readonly<{
  /** Undefined while loading, and when loading failed. */
  rows: readonly DataSlotStatusRow[] | undefined;
  isError: boolean;
}>;

/**
 * Loads every data slot of an installed plugin with its binding, the source
 * the binding reads, and its status, in manifest order. The rows stay in
 * place while a save or a remove reloads them, and a slot's source is read
 * again every time, so a change made elsewhere shows up. A plugin's card
 * reads it for its Records section.
 */
export function useDataSlotStatusRows(options: {
  manifest: PluginManifest;
  installation: PluginInstallation.T;
}): DataSlotStatusRows {
  const { manifest, installation } = options;
  const [bindings, , bindingsResult] = PluginDataSlotBindingClient.useGetAll(
    where("installation_id", "eq", installation.id),
  );
  const [rows, , rowsResult] = useQuery({
    queryKey: [
      "pluginDataSlots",
      "statusRows",
      installation.id,
      manifest.dataSlots,
      bindings,
    ],
    enabled: bindings !== undefined,
    usePreviousDataAsPlaceholder: true,
    // A source can change elsewhere without touching the bindings.
    staleTime: 0,
    // The rows name workspace records, so they are never written to disk.
    meta: { persist: false },
    queryFn: () => {
      return Promise.all(
        Object.entries(manifest.dataSlots).map(([slotId, slot]) => {
          const binding = bindings?.find((candidate) => {
            return candidate.slotId === slotId;
          });
          return _loadRow({ slotId, slot, binding });
        }),
      );
    },
  });
  return { rows, isError: bindingsResult.isError || rowsResult.isError };
}
