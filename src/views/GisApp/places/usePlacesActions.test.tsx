import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlacesNotEditableError } from "@/clients/places/PlacesNotEditableError";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { renderHook, TestProviders } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceInput, PlaceRow } from "@/clients/places/places.types";
import type { PlacesNotEditableReason } from "@/clients/places/PlacesNotEditableError";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { GisAppState } from "@/views/GisApp/useGisApp/useGisApp";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    readPlaces: vi.fn(),
    writePlaces: vi.fn(),
    createPlacesDataset: vi.fn(),
    refreshPlacesDatasetCaches: vi.fn(),
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  };
});

vi.mock("@/clients/places/VirtualPlacesStore/VirtualPlacesStore", () => {
  return {
    VirtualPlacesStore: {
      readPlaces: mocks.readPlaces,
      writePlaces: mocks.writePlaces,
      createPlacesDataset: mocks.createPlacesDataset,
    },
  };
});

vi.mock(
  "@/views/GisApp/places/refreshPlacesDatasetCaches/refreshPlacesDatasetCaches",
  () => {
    return { refreshPlacesDatasetCaches: mocks.refreshPlacesDatasetCaches };
  },
);

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: USER_ID };
    },
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return {
    notifyError: mocks.notifyError,
    notifySuccess: mocks.notifySuccess,
  };
});

const { usePlacesActions } =
  await import("@/views/GisApp/places/usePlacesActions");

const USER_ID = "44444444-4444-4444-8444-444444444444";
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const PLACE_INPUT: PlaceInput = {
  name: "Clinic",
  address: undefined,
  latitude: 1,
  longitude: 2,
  startsAt: undefined,
  endsAt: undefined,
  notes: undefined,
};

function _createApp(): GisAppState {
  return {
    avaMap: { workspaceId: WORKSPACE_ID },
    placeToolState: {
      draft: { datasetId: DATASET_ID, placeId: undefined },
      close: vi.fn(),
      startEdit: vi.fn(),
      startMove: vi.fn(),
    },
    updateConfig: vi.fn(),
    setSelectedLayerId: vi.fn(),
    closeInspector: vi.fn(),
  } as unknown as GisAppState;
}

/**
 * Mounts the hook under a query client that is NOT `AvaQueryClient`, so a
 * test can tell which client the cache refresh received.
 */
function _renderActions(): { current: ReturnType<typeof usePlacesActions> } {
  const providerClient = new QueryClient();
  function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <TestProviders>
        <QueryClientProvider client={providerClient}>
          {children}
        </QueryClientProvider>
      </TestProviders>
    );
  }
  return renderHook(
    () => {
      return usePlacesActions({
        app: _createApp(),
        datasets: [],
        datasetColumns: [],
        placesDatasetIds: new Set([DATASET_ID]),
        targetDatasetId: DATASET_ID,
      });
    },
    { wrapper: Wrapper },
  ).result;
}

function _notEditable(reason: PlacesNotEditableReason): PlacesNotEditableError {
  return new PlacesNotEditableError({ datasetId: DATASET_ID, reason });
}

function _getFeatureActions(result: {
  current: ReturnType<typeof usePlacesActions>;
}): PlaceToolController["featureActions"] {
  return result.current.featureActions;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readPlaces.mockResolvedValue([] satisfies PlaceRow[]);
  mocks.writePlaces.mockResolvedValue(undefined);
  mocks.refreshPlacesDatasetCaches.mockResolvedValue(undefined);
});

describe("usePlacesActions", () => {
  it("refreshes caches through the query client QETL reads from", async () => {
    const result = _renderActions();
    act(() => {
      result.current.savePlace(PLACE_INPUT);
    });
    await waitFor(() => {
      expect(mocks.refreshPlacesDatasetCaches).toHaveBeenCalledOnce();
    });
    const [refreshOptions] = mocks.refreshPlacesDatasetCaches.mock.calls[0]!;
    expect(refreshOptions.datasetId).toBe(DATASET_ID);
    // Identity, not equality: a QueryClient keeps its state in private
    // fields, so any two clients compare as deeply equal.
    expect(refreshOptions.queryClient).toBe(AvaQueryClient);
  });

  it("explains a dataset that is not a places dataset", async () => {
    mocks.readPlaces.mockRejectedValue(_notEditable("not_places_dataset"));
    const result = _renderActions();
    act(() => {
      result.current.savePlace(PLACE_INPUT);
    });
    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        "This dataset isn't a places dataset, so places can't be added to it.",
      );
    });
  });

  it("explains places changed outside the map when deleting", async () => {
    mocks.readPlaces.mockRejectedValue(_notEditable("rows_not_places"));
    const result = _renderActions();
    act(() => {
      _getFeatureActions(result).onDelete({
        datasetId: DATASET_ID,
        placeId: "place-1",
      });
    });
    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        "This places dataset was changed outside the map and can no longer be edited here.",
      );
    });
  });

  it("explains a non-editable dataset when opening a place", async () => {
    mocks.readPlaces.mockRejectedValue(_notEditable("rows_not_places"));
    const result = _renderActions();
    act(() => {
      _getFeatureActions(result).onEdit({
        datasetId: DATASET_ID,
        placeId: "place-1",
      });
    });
    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        "This places dataset was changed outside the map and can no longer be edited here.",
      );
    });
  });

  it("falls back to the generic message for any other failure", async () => {
    mocks.readPlaces.mockRejectedValue(new Error("network down"));
    const result = _renderActions();
    act(() => {
      result.current.savePlace(PLACE_INPUT);
    });
    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith(
        "Could not save the place.",
      );
    });
  });
});
