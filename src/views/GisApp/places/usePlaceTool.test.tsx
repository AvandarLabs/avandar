import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { renderHook } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";

const mocks = vi.hoisted(() => {
  return { placesDatasetIds: new Set<string>() };
});

vi.mock("@/clients/places/VirtualPlacesStore/VirtualPlacesStore", () => {
  return {
    VirtualPlacesStore: {
      usePlacesDatasetIds: () => {
        return mocks.placesDatasetIds;
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[]];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [[]];
      },
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return undefined;
    },
  };
});

vi.mock("@/views/GisApp/places/usePlacesActions", () => {
  return {
    usePlacesActions: () => {
      return {};
    },
  };
});

vi.mock("@/views/GisApp/places/useRefreshPlacesOnMapOpen", () => {
  return { useRefreshPlacesOnMapOpen: vi.fn() };
});

const { usePlaceTool } = await import("@/views/GisApp/places/usePlaceTool");

const WORKSPACE_ID = uuid<Workspace.Id>();
const PLACES_DATASET = Model.make("Dataset", {
  id: uuid<Dataset.Id>(),
  createdAt: "2026-11-09T00:00:00.000Z",
  updatedAt: "2026-11-09T00:00:00.000Z",
  dateOfLastSync: undefined,
  description: undefined,
  isRestricted: false,
  name: "Exposure sites",
  sourceType: "virtual",
  ownerId: uuid<User.Id>(),
  ownerProfileId: uuid<UserProfile.Id>(),
  workspaceId: WORKSPACE_ID,
});

function _createApp(): GisAppState {
  const layer = MapLayer.fromDataSource({
    dataSource: PLACES_DATASET,
    name: PLACES_DATASET.name,
  });
  return {
    avaMap: { workspaceId: WORKSPACE_ID },
    mapConfig: { layers: [layer] },
    mapToolMode: { type: "pan" },
    placeToolState: { draft: undefined },
  } as unknown as GisAppState;
}

describe("usePlaceTool", () => {
  it("keeps the target dataset while the places dataset list refetches", () => {
    const app = _createApp();
    mocks.placesDatasetIds = new Set([PLACES_DATASET.id]);
    const { result, rerender } = renderHook(() => {
      return usePlaceTool(app);
    });
    expect(result.current.targetDatasetId).toBe(PLACES_DATASET.id);

    mocks.placesDatasetIds = new Set();
    rerender();
    expect(result.current.targetDatasetId).toBe(PLACES_DATASET.id);
  });

  it("has no target until the map shows a places dataset", () => {
    mocks.placesDatasetIds = new Set();
    const { result } = renderHook(() => {
      return usePlaceTool(_createApp());
    });
    expect(result.current.targetDatasetId).toBeUndefined();
  });
});
