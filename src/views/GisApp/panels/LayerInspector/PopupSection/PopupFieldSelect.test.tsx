import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const NOW = "2026-11-09T00:00:00.000Z";
const WORKSPACE_ID = uuid<Workspace.Id>();

const { mockState } = vi.hoisted(() => {
  return {
    mockState: {
      placesDatasetIds: new Set<string>(),
      sourceColumns: [] as unknown[],
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: WORKSPACE_ID };
    },
  };
});

vi.mock("@/clients/places/VirtualPlacesStore/VirtualPlacesStore", () => {
  return {
    VirtualPlacesStore: {
      usePlacesDatasetIds: () => {
        return mockState.placesDatasetIds;
      },
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/useSourceColumnCatalog/useSourceColumnCatalog",
  () => {
    return {
      useSourceColumnCatalog: (sourceKey: unknown) => {
        return {
          sourceKey,
          status: "ready",
          columns: sourceKey ? mockState.sourceColumns : [],
        };
      },
    };
  },
);

vi.mock("@/views/GisApp/panels/LayerInspector/useLayerSourceColumns", () => {
  return {
    useLayerSourceColumns: () => {
      return mockState.sourceColumns;
    },
  };
});

const { PopupFieldSelect } =
  await import("@/views/GisApp/panels/LayerInspector/PopupSection/PopupFieldSelect");

const DATASET: Dataset.T = Model.make("Dataset", {
  id: uuid<Dataset.Id>(),
  createdAt: NOW,
  updatedAt: NOW,
  dateOfLastSync: undefined,
  description: undefined,
  isRestricted: false,
  name: "Exposure sites",
  sourceType: "virtual",
  ownerId: uuid<User.Id>(),
  ownerProfileId: uuid<UserProfile.Id>(),
  workspaceId: WORKSPACE_ID,
});

function _makeQueryColumn(name: string, columnIdx: number): QueryColumn.T {
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      id: uuid<DatasetColumn.Id>(),
      datasetId: DATASET.id,
      workspaceId: WORKSPACE_ID,
      createdAt: NOW,
      updatedAt: NOW,
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx,
    }),
  );
}

function _renderSelect(): void {
  mockState.sourceColumns = [
    _makeQueryColumn("place_id", 0),
    _makeQueryColumn("name", 1),
  ];
  const emptyLayer = MapLayer.makeEmpty("Exposure sites");
  const layer: MapLayer.T = {
    ...emptyLayer,
    source: { ...emptyLayer.source, dataSource: DATASET },
    popup: { columnIds: [], action: undefined },
  };
  render(<PopupFieldSelect layer={layer} onLayerChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("combobox", { name: "Fields" }));
}

/** The field names the picker offers, in order. */
async function _getOfferedFieldNames(): Promise<Array<string | null>> {
  const options = await screen.findAllByRole("option", { hidden: true });
  return options.map((option) => {
    return option.textContent;
  });
}

describe("PopupFieldSelect", () => {
  it("never offers a place's internal place_id as a popup field", async () => {
    mockState.placesDatasetIds = new Set([DATASET.id]);
    _renderSelect();

    expect(await _getOfferedFieldNames()).toEqual(["name"]);
  });

  it("offers a place_id column from a dataset that is not a places dataset", async () => {
    mockState.placesDatasetIds = new Set();
    _renderSelect();

    expect(await _getOfferedFieldNames()).toEqual(["place_id", "name"]);
  });
});
