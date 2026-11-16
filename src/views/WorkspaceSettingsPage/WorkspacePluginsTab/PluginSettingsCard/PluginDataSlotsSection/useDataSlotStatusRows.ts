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

/**
 * Loads every data slot of an installed plugin with its binding, the source
 * the binding reads, and its status, in manifest order. Undefined while
 * loading. A plugin's card reads it for its Records section.
 */
export function useDataSlotStatusRows(options: {
  manifest: PluginManifest;
  installation: PluginInstallation.T;
}): readonly DataSlotStatusRow[] | undefined {
  const { manifest, installation } = options;
  const [bindings] = PluginDataSlotBindingClient.useGetAll(
    where("installation_id", "eq", installation.id),
  );
  const [rows] = useQuery({
    queryKey: [
      "pluginDataSlots",
      "statusRows",
      installation.id,
      manifest.dataSlots,
      bindings,
    ],
    enabled: bindings !== undefined,
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
  return rows;
}
