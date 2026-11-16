import { PluginError } from "@avandar/plugin-sdk";
import { isDefined } from "@avandar/utils";
import { match } from "ts-pattern";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import { loadDataSlotSource } from "@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource";
import {
  makeDataSlotSqlFromBinding,
  QUERY_SLOT_MAX_ROWS,
} from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import { runDataSlotQuery } from "@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type {
  DataSlotSource,
  DataSlotSourceField,
} from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotBindingProblem } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type {
  DataSlotAttributeType,
  PluginDataSlot,
} from "@avandar/plugin-manifest/runtime";
import type {
  PluginColumnDataType,
  QueryHandle,
  QuerySlotResult,
} from "@avandar/plugin-sdk";

type SlotRow = Readonly<Record<string, unknown>>;

type FieldsByAttributeKey = Readonly<
  Record<string, DataSlotSourceField | undefined>
>;

/**
 * The data slot part of the `avandar` object one command invocation
 * receives. `runPluginCommand` makes one per invocation and hands it to
 * `makePluginApi`, which exposes `querySlot` and `openDataSlotBinding` to
 * the command and lets `fetchRows` read the handles `querySlot` issued.
 */
export type DataSlotInvocationApi = Readonly<{
  querySlot: (slotId: string) => Promise<QuerySlotResult>;
  openDataSlotBinding: (slotId: string) => Promise<void>;

  /** Rows of a handle querySlot issued in this invocation, else undefined. */
  getSlotRows: (handle: QueryHandle) => readonly SlotRow[] | undefined;
}>;

type InvocationOptions = {
  plugin: ActivePlugin;
  pluginName: string;
};

/**
 * The type of a slot column whose attribute is unmapped, which is the type
 * of the NULL `makeDataSlotSqlFromBinding` selects for it.
 */
const UNMAPPED_DATA_TYPE_BY_ATTRIBUTE_TYPE: Readonly<
  Record<DataSlotAttributeType, PluginColumnDataType>
> = {
  number: "double",
  date: "date",
  text: "varchar",
  boolean: "boolean",
  "geo.admin1": "varchar",
  "geo.admin2": "varchar",
};

const PERMISSION_DENIED_MESSAGE =
  "You cannot read the records this data slot is bound to.";

function _getSlotFromPlugin(
  options: Readonly<{ plugin: ActivePlugin; slotId: string }>,
): PluginDataSlot {
  const { dataSlots } = options.plugin.manifestModule.manifest;
  const slot = Object.hasOwn(dataSlots, options.slotId)
    ? dataSlots[options.slotId]
    : undefined;
  if (slot === undefined) {
    throw new PluginError(
      "InvalidSlot",
      `The manifest declares no data slot "${options.slotId}".`,
    );
  }
  return slot;
}

/**
 * Reads the binding's case type or dataset. A binding that still names its
 * source has a source that exists, since deleting a case type or dataset
 * clears the id, so finding nothing there means the user cannot read it.
 */
async function _loadBoundSource(
  binding: Readonly<PluginDataSlotBinding.T> | undefined,
): Promise<DataSlotSource | undefined> {
  if (binding === undefined) {
    return undefined;
  }
  const source = await loadDataSlotSource(binding);
  const sourceId =
    binding.sourceType === "concept" ? binding.conceptId : binding.datasetId;
  if (source === undefined && sourceId !== undefined) {
    throw new PluginError("PermissionDenied", PERMISSION_DENIED_MESSAGE);
  }
  return source;
}

// Names the attribute and the reason only. A field name or a value would
// tell the plugin about workspace data it was not given.
function _getTextFromProblem(problem: DataSlotBindingProblem): string {
  return match(problem)
    .with({ kind: "source_missing" }, () => {
      return "its case type or dataset no longer exists";
    })
    .with({ kind: "field_missing" }, ({ attributeKey }) => {
      return `"${attributeKey}" is bound to a field that no longer exists`;
    })
    .with({ kind: "type_mismatch" }, ({ attributeKey }) => {
      return `"${attributeKey}" is bound to a field whose type no longer fits`;
    })
    .with({ kind: "required_unmapped" }, ({ attributeKey }) => {
      return `"${attributeKey}" is required and has no field`;
    })
    .exhaustive();
}

async function _loadBoundFields(
  options: Readonly<{
    plugin: ActivePlugin;
    slotId: string;
    slot: PluginDataSlot;
  }>,
): Promise<{
  source: DataSlotSource;
  fieldsByAttributeKey: FieldsByAttributeKey;
}> {
  const { plugin, slotId, slot } = options;
  const [binding] = await PluginDataSlotBindingClient.getAll({
    where: {
      installation_id: { eq: plugin.installation.id },
      slot_id: { eq: slotId },
    },
  });
  const source = await _loadBoundSource(binding);
  const status = getDataSlotBindingStatus({ slot, binding, source });
  if (status.kind === "broken") {
    const reasons = status.problems.map(_getTextFromProblem).join("; ");
    throw new PluginError(
      "SlotBroken",
      `The "${slotId}" data slot cannot be read: ${reasons}.`,
    );
  }
  // A binding with no source reads as broken, so only an unbound slot
  // reaches here without one.
  if (status.kind === "unbound" || source === undefined) {
    throw new PluginError(
      "SlotNotBound",
      `No records are chosen for the "${slotId}" data slot yet.`,
    );
  }
  return { source, fieldsByAttributeKey: status.fieldsByAttributeKey };
}

async function _runSlotQuery(
  options: Readonly<{
    plugin: ActivePlugin;
    slot: PluginDataSlot;
    source: DataSlotSource;
    fieldsByAttributeKey: FieldsByAttributeKey;
  }>,
): Promise<SlotRow[]> {
  const { plugin, slot, source, fieldsByAttributeKey } = options;
  const boundFields = Object.values(fieldsByAttributeKey).filter(isDefined);
  try {
    const result = await runDataSlotQuery({
      workspaceId: plugin.installation.workspaceId,
      source,
      // With no field bound, the dataset loads every column.
      fields: boundFields.length > 0 ? boundFields : undefined,
      sql: makeDataSlotSqlFromBinding({
        slot,
        source,
        fieldsByAttributeKey,
        limit: QUERY_SLOT_MAX_ROWS + 1,
      }),
    });
    return result.data;
  } catch (error) {
    if (error instanceof WorkspaceRelationsDenied) {
      throw new PluginError("PermissionDenied", PERMISSION_DENIED_MESSAGE);
    }
    throw error;
  }
}

function _getColumnsFromSlot(
  options: Readonly<{
    slot: PluginDataSlot;
    fieldsByAttributeKey: FieldsByAttributeKey;
  }>,
): QuerySlotResult["columns"] {
  return Object.entries(options.slot.attributes).map(
    ([attributeKey, attribute]) => {
      return {
        name: attributeKey,
        dataType:
          options.fieldsByAttributeKey[attributeKey]?.dataType ??
          UNMAPPED_DATA_TYPE_BY_ATTRIBUTE_TYPE[attribute.type],
      };
    },
  );
}

async function _querySlot(
  options: Readonly<{
    plugin: ActivePlugin;
    slotId: string;
    rowsByHandle: Map<QueryHandle, readonly SlotRow[]>;
  }>,
): Promise<QuerySlotResult> {
  const { plugin, slotId, rowsByHandle } = options;
  const slot = _getSlotFromPlugin({ plugin, slotId });
  const { source, fieldsByAttributeKey } = await _loadBoundFields({
    plugin,
    slotId,
    slot,
  });
  const rows = await _runSlotQuery({
    plugin,
    slot,
    source,
    fieldsByAttributeKey,
  });
  const keptRows = rows.slice(0, QUERY_SLOT_MAX_ROWS);
  const queryHandle = crypto.randomUUID() as QueryHandle;
  rowsByHandle.set(queryHandle, keptRows);
  return {
    queryHandle,
    columns: _getColumnsFromSlot({ slot, fieldsByAttributeKey }),
    rowCount: keptRows.length,
    isTruncated: rows.length > QUERY_SLOT_MAX_ROWS,
  };
}

// The binding modal checks whether the user may bind slots, because it
// renders inside the router where the user's roles are readable. It is
// Settings UI, so it loads only when a command opens it.
async function _openDataSlotBinding(
  options: Readonly<InvocationOptions & { slotId: string }>,
): Promise<void> {
  const { plugin, pluginName, slotId } = options;
  _getSlotFromPlugin({ plugin, slotId });
  const { openDataSlotBindingModal } =
    await import("@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal");
  await openDataSlotBindingModal({
    pluginName,
    manifestModule: plugin.manifestModule,
    installation: plugin.installation,
    slotId,
  });
}

/**
 * Makes the data slot API of one command invocation: `querySlot` reads the
 * records an admin bound to a slot of the plugin, with the current user's
 * access, and `openDataSlotBinding` opens the slot's binding modal, which
 * lets a settings admin choose them and tells anyone else to ask one. The
 * handles `querySlot` issues are readable through `getSlotRows` for this
 * invocation only, and are never registered in the app-wide
 * `QueryHandleRegistry`.
 *
 * `runPluginCommand` calls it once per invocation. It reaches the binding
 * client and the slot query, so import it only from the lazy command
 * runtime.
 */
export function makeDataSlotApiForInvocation(
  options: Readonly<InvocationOptions>,
): DataSlotInvocationApi {
  const rowsByHandle = new Map<QueryHandle, readonly SlotRow[]>();
  return {
    // `async` turns a thrown `PluginError` into a rejected promise, which is
    // how a plugin receives it.
    querySlot: async (slotId) => {
      return _querySlot({ plugin: options.plugin, slotId, rowsByHandle });
    },
    openDataSlotBinding: async (slotId) => {
      return _openDataSlotBinding({ ...options, slotId });
    },
    getSlotRows: (handle) => {
      return rowsByHandle.get(handle);
    },
  };
}
