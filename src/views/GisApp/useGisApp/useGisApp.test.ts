/**
 * useGisApp expands the inspector when an annotation is created or selected.
 */
import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { act, renderHook } from "@/test-utils";
import { MapLayerIds } from "@/views/GisApp/layers/MapLayerIds";
import { makeTextAnnotationFeature } from "@/views/GisApp/tools/makeAnnotationFeatureHelpers";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { User } from "$/models/User/User";
import type { UserProfile } from "$/models/User/UserProfile";
import type { Workspace } from "$/models/Workspace/Workspace";

const { expandPanelMock, mapCanvasState } = vi.hoisted(() => {
  return {
    expandPanelMock: vi.fn(),
    mapCanvasState: {
      lastCreatedAnnotationId: undefined as
        | AvaMapConfig.AnnotationFeatureId
        | undefined,
    },
  };
});

vi.mock("@/views/GisApp/shell/ChromePanelState/ChromePanelState", () => {
  return {
    ChromePanelState: {
      fromCanvasWidth: () => {
        return { layers: false, inspector: true, legend: false };
      },
      useChromePanelState: () => {
        return {
          panelState: { layers: false, inspector: true, legend: false },
          togglePanel: vi.fn(),
          expandPanel: expandPanelMock,
        };
      },
    },
  };
});

vi.mock("@/views/GisApp/MapCanvas/useMapCanvas", () => {
  return {
    useMapCanvas: () => {
      return {
        containerRef: { current: null },
        mapInstance: { mapRef: { current: null } },
        invalidRingStatus: undefined,
        measureVertices: [],
        lastCreatedAnnotationId: mapCanvasState.lastCreatedAnnotationId,
      };
    },
  };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return {
    AvaMapClient: {
      saveMapConfig: vi.fn(),
      QueryKeys: {
        getAll: () => {
          return ["AvaMap", "getAll"];
        },
      },
    },
  };
});

vi.mock("@/config/AvaQueryClient", () => {
  return {
    AvaQueryClient: { invalidateQueries: vi.fn() },
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

vi.mock("@/views/GisApp/layers/useMapLayersData/useMapLayersData", () => {
  return {
    useMapLayersData: () => {
      return new Map();
    },
  };
});

const { useGisApp } = await import("@/views/GisApp/useGisApp/useGisApp");

function _createAvaMap(): AvaMap.T {
  return Model.make("AvaMap", {
    id: uuid<AvaMap.Id>(),
    workspaceId: uuid<Workspace.Id>(),
    ownerId: uuid<User.Id>(),
    ownerProfileId: uuid<UserProfile.Id>(),
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    name: "Untitled map",
    description: undefined,
    isPublic: false,
    isRestricted: false,
    slug: undefined,
    config: AvaMapConfig.makeEmpty(),
  });
}

describe("useGisApp annotation inspector", () => {
  beforeEach(() => {
    expandPanelMock.mockReset();
    mapCanvasState.lastCreatedAnnotationId = undefined;
  });

  it("expands the inspector when a new annotation is created", () => {
    const feature = makeTextAnnotationFeature([10, 10], "Goma");
    const { rerender } = renderHook(() => {
      return useGisApp(_createAvaMap());
    });

    expect(expandPanelMock).not.toHaveBeenCalled();

    mapCanvasState.lastCreatedAnnotationId = feature.id;
    rerender();

    expect(expandPanelMock).toHaveBeenCalledWith("inspector");
  });

  it("expands the inspector when an annotation feature is clicked on the map", () => {
    const feature = makeTextAnnotationFeature([10, 10], "Goma");
    const { result } = renderHook(() => {
      return useGisApp(_createAvaMap());
    });

    act(() => {
      result.current.onMapFeatureClick(
        {
          type: "Feature",
          properties: { id: feature.id },
          geometry: {
            type: "Point",
            coordinates: [10, 10],
          },
        },
        MapLayerIds.annotationSymbolLayer,
      );
    });

    expect(expandPanelMock).toHaveBeenCalledWith("inspector");
    expect(result.current.selectedAnnotationFeatureId).toBe(feature.id);
    expect(result.current.isAnnotationRowSelected).toBe(true);
  });
});
