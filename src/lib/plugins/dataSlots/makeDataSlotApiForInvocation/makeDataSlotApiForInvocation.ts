import { PluginError } from "@avandar/plugin-sdk";
import { isDefined } from "@avandar/utils";
import { match } from "ts-pattern";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { ConceptRelationDenied } from "@/clients/qetl/QueryMediator/conceptRelation/ConceptRelationDenied";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { getDataSlotBindingStatus } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import { loadDataSlotSource } from "@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource";
import {
  makeDataSlotSqlFromBinding,
  QUERY_SLOT_MAX_ROWS,
} from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import { runDataSlotQuery } from "@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery";
import { getPluginInstallStatusFromInstallation } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import { PluginDrawerStore } from "@/lib/plugins/PluginDrawerHost/PluginDrawerStore";
import {
  makeQueryHandleRegistry,
  MAX_LIVE_QUERY_HANDLES,
} from "@/lib/plugins/QueryHandleRegistry/QueryHandleRegistry";
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

  /**
   * Rows of a handle querySlot issued in this invocation, else undefined.
   * Only the `MAX_LIVE_QUERY_HANDLES` newest handles keep their rows.
   */
  getSlotRows: (handle: QueryHandle) => readonly SlotRow[] | undefined;

  /** Whether querySlot issued the handle in this invocation, evicted or not. */
  wasSlotHandleIssued: (handle: QueryHandle) => boolean;
}>;

type InvocationOptions = {
  plugin: ActivePlugin;
  pluginName: string;
};

/**
 * The workspace view a command started in. Its host is gone once the drawer
 * host generation changes, and from then on the command may read nothing.
 */
type InvocationHost = Readonly<{
  /** Throws `InvalidHandle` once the host is gone, and aborts `signal`. */
  assertFromCurrentHost: () => void;

  /** Aborts when the host is found gone. */
  signal: AbortSignal;

  /** Runs `run`, and aborts `signal` if the host goes while it runs. */
  runWhileHostLasts: <Result>(run: () => Promise<Result>) => Promise<Result>;
}>;

type SlotRowsStore = Readonly<{
  registry: ReturnType<typeof makeQueryHandleRegistry>;
  issuedHandles: Set<QueryHandle>;
}>;

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

const PLUGIN_NOT_ACTIVE_MESSAGE =
  "This plugin is not available in this workspace right now.";

// Generic on purpose. A host or DuckDB error can name a table, a workspace
// field, or a cell value, none of which the plugin was given.
const QUERY_FAILED_MESSAGE = "The data slot could not be read.";

const HOST_CLOSED_MESSAGE =
  "The workspace this command ran in is no longer open. Run the command again.";

function _makeHostFromCurrentGeneration(): InvocationHost {
  const hostGeneration = PluginDrawerStore.getGeneration();
  const abortController = new AbortController();
  const isFromCurrentHost = (): boolean => {
    return PluginDrawerStore.getGeneration() === hostGeneration;
  };
  return {
    signal: abortController.signal,
    assertFromCurrentHost: () => {
      if (!isFromCurrentHost()) {
        abortController.abort();
        throw new PluginError("InvalidHandle", HOST_CLOSED_MESSAGE);
      }
    },
    runWhileHostLasts: async (run) => {
      const stopListening = PluginDrawerStore.subscribe(() => {
        if (!isFromCurrentHost()) {
          abortController.abort();
        }
      });
      try {
        return await run();
      } finally {
        stopListening();
      }
    },
  };
}

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
    host: InvocationHost;
  }>,
): Promise<SlotRow[]> {
  const { plugin, slot, source, fieldsByAttributeKey, host } = options;
  const boundFields = Object.values(fieldsByAttributeKey).filter(isDefined);
  const result = await host.runWhileHostLasts(async () => {
    return await runDataSlotQuery({
      workspaceId: plugin.installation.workspaceId,
      source,
      // With no field bound, the dataset loads every column.
      fields: boundFields.length > 0 ? boundFields : undefined,
      signal: host.signal,
      sql: makeDataSlotSqlFromBinding({
        slot,
        source,
        fieldsByAttributeKey,
        limit: QUERY_SLOT_MAX_ROWS + 1,
      }),
    });
  });
  return result.data;
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

/**
 * Rejects unless the plugin is still installed, enabled, and granted what its
 * manifest asks for. The `ActivePlugin` a command started with is a snapshot,
 * and an overlay the command opened keeps using it long after an admin
 * disables the plugin, so each read asks the database again.
 */
async function _assertPluginIsInstalled(plugin: ActivePlugin): Promise<void> {
  const installation = await PluginInstallationClient.getById({
    id: plugin.installation.id,
  });
  const status = getPluginInstallStatusFromInstallation({
    installation,
    manifestPermissions: plugin.manifestModule.manifest.permissions,
  });
  if (status !== "installed") {
    throw new PluginError("PermissionDenied", PLUGIN_NOT_ACTIVE_MESSAGE);
  }
}

async function _querySlot(
  options: Readonly<{
    plugin: ActivePlugin;
    slotId: string;
    host: InvocationHost;
    rowsStore: SlotRowsStore;
  }>,
): Promise<QuerySlotResult> {
  const { plugin, slotId, host, rowsStore } = options;
  host.assertFromCurrentHost();
  await _assertPluginIsInstalled(plugin);
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
    host,
  });
  host.assertFromCurrentHost();
  const keptRows =
    rows.length > QUERY_SLOT_MAX_ROWS
      ? rows.slice(0, QUERY_SLOT_MAX_ROWS)
      : rows;
  const queryHandle = rowsStore.registry.getOrCreate(keptRows);
  rowsStore.issuedHandles.add(queryHandle);
  return {
    queryHandle,
    columns: _getColumnsFromSlot({ slot, fieldsByAttributeKey }),
    rowCount: keptRows.length,
    isTruncated: rows.length > QUERY_SLOT_MAX_ROWS,
  };
}

/**
 * What a plugin may learn from a failed read. A `PluginError` is already
 * written for the plugin. A denied relation or case type is a permission
 * failure. Anything else is logged for the host and reported generically,
 * since the original message can name a table, a workspace field, or a value.
 * A failure after the host is gone reads as the host being gone.
 */
function _getPluginErrorFromFailure(
  options: Readonly<{ error: unknown; host: InvocationHost }>,
): PluginError {
  const { error, host } = options;
  if (error instanceof PluginError) {
    return error;
  }
  try {
    host.assertFromCurrentHost();
  } catch (hostError) {
    return hostError as PluginError;
  }
  if (
    error instanceof WorkspaceRelationsDenied ||
    error instanceof ConceptRelationDenied
  ) {
    return new PluginError("PermissionDenied", PERMISSION_DENIED_MESSAGE);
  }
  console.error("A plugin's data slot could not be read.", error);
  return new PluginError("CommandFailed", QUERY_FAILED_MESSAGE);
}

async function _runWithoutLeaks<Result>(
  options: Readonly<{ host: InvocationHost; run: () => Promise<Result> }>,
): Promise<Result> {
  try {
    return await options.run();
  } catch (error) {
    throw _getPluginErrorFromFailure({ error, host: options.host });
  }
}

// The binding modal checks whether the user may bind slots, because it
// renders inside the router where the user's roles are readable. It is
// Settings UI, so it loads only when a command opens it.
async function _openDataSlotBinding(
  options: Readonly<
    InvocationOptions & { slotId: string; host: InvocationHost }
  >,
): Promise<void> {
  const { plugin, pluginName, slotId, host } = options;
  host.assertFromCurrentHost();
  await _assertPluginIsInstalled(plugin);
  _getSlotFromPlugin({ plugin, slotId });
  const { openDataSlotBindingModal } =
    await import("@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal");
  // The workspace can change while the modal code loads, and the modal must
  // not open in the next workspace with this one's installation.
  host.assertFromCurrentHost();
  await openDataSlotBindingModal({
    pluginName,
    manifestModule: plugin.manifestModule,
    installation: plugin.installation,
    slotId,
  });
}

/**
 * Makes a function that runs the jobs it is given one at a time, in call
 * order. A job that fails does not stop the next one.
 */
function _makeSerialRunner(): <Result>(
  job: () => Promise<Result>,
) => Promise<Result> {
  let queue: Promise<unknown> = Promise.resolve();
  return (job) => {
    const result = queue.then(job);
    queue = result.catch(() => {
      return undefined;
    });
    return result;
  };
}

/**
 * Makes the data slot API of one command invocation: `querySlot` reads the
 * records an admin bound to a slot of the plugin, with the current user's
 * access, and `openDataSlotBinding` opens the slot's binding modal, which
 * lets a settings admin choose them and tells anyone else to ask one. The
 * handles `querySlot` issues are readable through `getSlotRows` for this
 * invocation only, the newest `MAX_LIVE_QUERY_HANDLES` of them, and are never
 * registered in the app-wide `QueryHandleRegistry`.
 *
 * Nothing a plugin receives from a failed read comes from the host or
 * DuckDB: a failure is a `PluginError` written for the plugin. Once the
 * drawer host generation the invocation started in changes, both members
 * reject with `InvalidHandle` and a running query is aborted. Each call also
 * asks the database whether the plugin is still installed and enabled, and
 * rejects with `PermissionDenied` when it is not. `querySlot` calls run one
 * at a time, so a plugin cannot hold several large results in flight.
 *
 * `runPluginCommand` calls it once per invocation. It reaches the binding
 * client and the slot query, so import it only from the lazy command
 * runtime.
 */
export function makeDataSlotApiForInvocation(
  options: Readonly<InvocationOptions>,
): DataSlotInvocationApi {
  const host = _makeHostFromCurrentGeneration();
  const runSerially = _makeSerialRunner();
  const rowsStore: SlotRowsStore = {
    registry: makeQueryHandleRegistry({
      maxLiveHandles: MAX_LIVE_QUERY_HANDLES,
    }),
    issuedHandles: new Set(),
  };
  return {
    // `async` turns a thrown `PluginError` into a rejected promise, which is
    // how a plugin receives it.
    querySlot: async (slotId) => {
      return runSerially(() => {
        return _runWithoutLeaks({
          host,
          run: () => {
            return _querySlot({
              plugin: options.plugin,
              slotId,
              host,
              rowsStore,
            });
          },
        });
      });
    },
    openDataSlotBinding: async (slotId) => {
      return _runWithoutLeaks({
        host,
        run: () => {
          return _openDataSlotBinding({ ...options, slotId, host });
        },
      });
    },
    getSlotRows: (handle) => {
      return rowsStore.registry.getRows(handle);
    },
    wasSlotHandleIssued: (handle) => {
      return rowsStore.issuedHandles.has(handle);
    },
  };
}
