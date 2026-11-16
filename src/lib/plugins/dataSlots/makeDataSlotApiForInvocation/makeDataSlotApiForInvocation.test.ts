import { PluginError } from "@avandar/plugin-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { QUERY_SLOT_MAX_ROWS } from "@/lib/pluginDataSlots/makeDataSlotSqlFromBinding/makeDataSlotSqlFromBinding";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { DataSlotSource } from "@/lib/pluginDataSlots/DataSlotSource.types";
import type { DataSlotInvocationApi } from "@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation";
import type { ActivePlugin } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type {
  PluginDataSlot,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";
import type { QueryHandle } from "@avandar/plugin-sdk";

const { getBindingsMock, loadSourceMock, openModalMock, runQueryMock } =
  vi.hoisted(() => {
    return {
      getBindingsMock: vi.fn(),
      loadSourceMock: vi.fn(),
      openModalMock: vi.fn(),
      runQueryMock: vi.fn(),
    };
  });

vi.mock(
  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
  () => {
    return { PluginDataSlotBindingClient: { getAll: getBindingsMock } };
  },
);

vi.mock("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource", () => {
  return { loadDataSlotSource: loadSourceMock };
});

vi.mock("@/lib/pluginDataSlots/runDataSlotQuery/runDataSlotQuery", () => {
  return { runDataSlotQuery: runQueryMock };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal",
  () => {
    return { openDataSlotBindingModal: openModalMock };
  },
);

const { makeDataSlotApiForInvocation } =
  await import("@/lib/plugins/dataSlots/makeDataSlotApiForInvocation/makeDataSlotApiForInvocation");

const WORKSPACE_ID = "workspace_1" as Workspace.Id;
const CONCEPT_ID = "concept_cases" as Concept.Id;

const CASES_SLOT: PluginDataSlot = {
  title: "%slot.cases.title%",
  required: false,
  attributes: {
    onsetDate: {
      type: "date",
      title: "%slot.cases.onsetDate%",
      required: true,
    },
    district: {
      type: "geo.admin2",
      title: "%slot.cases.district%",
      required: false,
    },
  },
};

const DATA_SLOTS: PluginManifest["dataSlots"] = { cases: CASES_SLOT };

const INSTALLATION = {
  id: "installation_1",
  workspaceId: WORKSPACE_ID,
} as PluginInstallation.T;

const MANIFEST_MODULE = {
  manifest: { dataSlots: DATA_SLOTS },
} as PluginManifestModule;

const PLUGIN = {
  installation: INSTALLATION,
  manifestModule: MANIFEST_MODULE,
} as ActivePlugin;

const ONSET_FIELD = {
  id: "attr_onset",
  columnName: "Onset date",
  label: "Onset date",
  dataType: "timestamp",
} as const;

const DISTRICT_FIELD = {
  id: "attr_district",
  columnName: "District name",
  label: "District name",
  dataType: "varchar",
} as const;

const SOURCE: DataSlotSource = {
  kind: "concept",
  conceptId: CONCEPT_ID,
  name: "Measles cases",
  fields: [ONSET_FIELD, DISTRICT_FIELD],
};

function _makeBinding(
  overrides: Partial<PluginDataSlotBinding.T> = {},
): PluginDataSlotBinding.T {
  return {
    sourceType: "concept",
    conceptId: CONCEPT_ID,
    datasetId: undefined,
    attributeMap: { onsetDate: ONSET_FIELD.id },
    ...overrides,
  } as PluginDataSlotBinding.T;
}

function _makeRows(rowCount: number): Array<{ onsetDate: string }> {
  return Array.from({ length: rowCount }, () => {
    return { onsetDate: "2026-01-05" };
  });
}

function _makeApi(): DataSlotInvocationApi {
  return makeDataSlotApiForInvocation({
    plugin: PLUGIN,
    pluginName: "Epidemiology",
  });
}

async function _getQuerySlotError(slotId: string): Promise<PluginError> {
  const error = await _makeApi()
    .querySlot(slotId)
    .catch((rejection: unknown) => {
      return rejection;
    });
  expect(error).toBeInstanceOf(PluginError);
  return error as PluginError;
}

describe("makeDataSlotApiForInvocation", () => {
  beforeEach(() => {
    getBindingsMock.mockResolvedValue([_makeBinding()]);
    loadSourceMock.mockResolvedValue(SOURCE);
    runQueryMock.mockResolvedValue({ data: _makeRows(2) });
    openModalMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("querySlot", () => {
    it("rejects a slot id the manifest does not declare with InvalidSlot", async () => {
      const error = await _getQuerySlotError("deaths");

      expect(error.code).toBe("InvalidSlot");
    });

    it("rejects a slot id inherited from Object with InvalidSlot", async () => {
      const error = await _getQuerySlotError("constructor");

      expect(error.code).toBe("InvalidSlot");
    });

    it("reads only this install's binding for the slot", async () => {
      await _makeApi().querySlot("cases");

      expect(getBindingsMock).toHaveBeenCalledWith({
        where: {
          installation_id: { eq: INSTALLATION.id },
          slot_id: { eq: "cases" },
        },
      });
    });

    it("rejects a slot with no binding with SlotNotBound", async () => {
      getBindingsMock.mockResolvedValue([]);

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("SlotNotBound");
    });

    it("rejects a binding whose source was deleted with SlotBroken", async () => {
      getBindingsMock.mockResolvedValue([
        _makeBinding({ conceptId: undefined }),
      ]);
      loadSourceMock.mockResolvedValue(undefined);

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("SlotBroken");
    });

    it("names the attribute and the reason in a SlotBroken message", async () => {
      getBindingsMock.mockResolvedValue([_makeBinding({ attributeMap: {} })]);

      const error = await _getQuerySlotError("cases");

      expect(error.message).toBe(
        'The "cases" data slot cannot be read: "onsetDate" is required and has no field.',
      );
    });

    it("keeps workspace field names out of a SlotBroken message", async () => {
      getBindingsMock.mockResolvedValue([
        _makeBinding({
          attributeMap: {
            onsetDate: DISTRICT_FIELD.id,
            district: "attr_deleted",
          },
        }),
      ]);

      const error = await _getQuerySlotError("cases");

      expect(error.message).toBe(
        'The "cases" data slot cannot be read: "onsetDate" is bound to a field whose type no longer fits; "district" is bound to a field that no longer exists.',
      );
    });

    it("rejects a bound source the user cannot read with PermissionDenied", async () => {
      loadSourceMock.mockResolvedValue(undefined);

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("PermissionDenied");
    });

    it("rejects a query outside the workspace's relations with PermissionDenied", async () => {
      runQueryMock.mockRejectedValue(
        new WorkspaceRelationsDenied({
          workspaceId: WORKSPACE_ID,
          deniedDatasetIds: ["dataset_other" as Dataset.Id],
        }),
      );

      const error = await _getQuerySlotError("cases");

      expect(error.code).toBe("PermissionDenied");
    });

    it("passes any other query failure through unchanged", async () => {
      const queryError = new Error("DuckDB is not ready");
      runQueryMock.mockRejectedValue(queryError);

      await expect(_makeApi().querySlot("cases")).rejects.toBe(queryError);
    });

    it("queries one row more than it keeps, in the install's workspace", async () => {
      await _makeApi().querySlot("cases");

      expect(runQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          sql: expect.stringContaining(`LIMIT ${QUERY_SLOT_MAX_ROWS + 1}`),
        }),
      );
    });

    it("names each column by its attribute key, typed by its bound field or its attribute", async () => {
      const result = await _makeApi().querySlot("cases");

      expect(result.columns).toEqual([
        { name: "onsetDate", dataType: "timestamp" },
        { name: "district", dataType: "varchar" },
      ]);
    });

    it("counts the rows it read when the slot fits under the limit", async () => {
      const result = await _makeApi().querySlot("cases");

      expect(result).toMatchObject({ rowCount: 2, isTruncated: false });
    });

    it("keeps the first rows up to the limit and reports truncation past it", async () => {
      runQueryMock.mockResolvedValue({
        data: _makeRows(QUERY_SLOT_MAX_ROWS + 1),
      });
      const api = _makeApi();

      const result = await api.querySlot("cases");

      expect(result).toMatchObject({
        rowCount: QUERY_SLOT_MAX_ROWS,
        isTruncated: true,
      });
      expect(api.getSlotRows(result.queryHandle)).toHaveLength(
        QUERY_SLOT_MAX_ROWS,
      );
    });
  });

  describe("getSlotRows", () => {
    it("returns the rows of a handle querySlot issued in the invocation", async () => {
      const api = _makeApi();

      const { queryHandle } = await api.querySlot("cases");

      expect(api.getSlotRows(queryHandle)).toEqual(_makeRows(2));
    });

    it("returns nothing for a handle another invocation's querySlot issued", async () => {
      const { queryHandle } = await _makeApi().querySlot("cases");

      expect(_makeApi().getSlotRows(queryHandle)).toBeUndefined();
    });

    it("returns nothing for a handle querySlot never issued", () => {
      expect(
        _makeApi().getSlotRows("handle-never-issued" as QueryHandle),
      ).toBeUndefined();
    });
  });

  describe("openDataSlotBinding", () => {
    it("opens the slot's binding modal, which decides what the user may do there", async () => {
      await _makeApi().openDataSlotBinding("cases");

      expect(openModalMock).toHaveBeenCalledWith({
        pluginName: "Epidemiology",
        manifestModule: MANIFEST_MODULE,
        installation: INSTALLATION,
        slotId: "cases",
      });
    });

    it("resolves only once the binding modal closes", async () => {
      const modalClosed = Promise.withResolvers<void>();
      openModalMock.mockReturnValue(modalClosed.promise);
      const onResolved = vi.fn();

      const opening = _makeApi().openDataSlotBinding("cases").then(onResolved);
      await vi.waitFor(() => {
        expect(openModalMock).toHaveBeenCalled();
      });
      expect(onResolved).not.toHaveBeenCalled();
      modalClosed.resolve();
      await opening;

      expect(onResolved).toHaveBeenCalledTimes(1);
    });

    it("rejects a slot id the manifest does not declare with InvalidSlot", async () => {
      await expect(
        _makeApi().openDataSlotBinding("deaths"),
      ).rejects.toMatchObject({ code: "InvalidSlot" });
    });

    it("opens no binding modal for a slot id the manifest does not declare", async () => {
      await _makeApi()
        .openDataSlotBinding("deaths")
        .catch(() => {
          return undefined;
        });

      expect(openModalMock).not.toHaveBeenCalled();
    });
  });
});
