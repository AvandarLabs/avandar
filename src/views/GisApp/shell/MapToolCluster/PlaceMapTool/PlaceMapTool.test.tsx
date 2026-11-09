import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  PlaceDraft,
  PlaceToolController,
} from "@/views/GisApp/places/PlaceTool.types";

vi.mock(
  "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/AddressSearchField/AddressSearchField",
  () => {
    return {
      AddressSearchField: () => {
        return <div data-testid="address-search" />;
      },
    };
  },
);

const { PlaceMapTool } =
  await import("@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceMapTool");

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const NEW_DRAFT: PlaceDraft = {
  datasetId: undefined,
  placeId: undefined,
  coordinate: undefined,
  values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
  isAddressFromSearch: false,
};

function _createController(
  overrides: Partial<PlaceToolController> = {},
): PlaceToolController {
  return {
    state: {
      draft: undefined,
      startNew: vi.fn(),
      startEdit: vi.fn(),
      startMove: vi.fn(),
      onPlacePicked: vi.fn(),
      onSearchResultPicked: vi.fn(),
      clearCoordinate: vi.fn(),
      close: vi.fn(),
    },
    isArmed: false,
    isSaving: false,
    targetDatasetId: undefined,
    placesDatasetOptions: [],
    getBiasBox: () => {
      return undefined;
    },
    armMapPick: vi.fn(),
    createPlacesDataset: vi.fn(),
    addPlacesLayer: vi.fn(),
    savePlace: vi.fn(),
    featureActions: {
      placesDatasetIds: new Set(),
      onEdit: vi.fn(),
      onMove: vi.fn(),
      onDelete: vi.fn(),
    },
    ...overrides,
  };
}

function _withDraft(
  draft: PlaceDraft,
  overrides: Partial<PlaceToolController> = {},
): PlaceToolController {
  const controller = _createController(overrides);
  return { ...controller, state: { ...controller.state, draft } };
}

describe("PlaceMapTool", () => {
  it("opens a new place from the tool button", () => {
    const controller = _createController();
    render(<PlaceMapTool controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: "Add a place" }));
    expect(controller.state.startNew).toHaveBeenCalled();
  });

  it("asks for a places dataset first, suggesting Exposure sites", () => {
    const controller = _withDraft(NEW_DRAFT);
    render(<PlaceMapTool controller={controller} />);
    expect(
      screen.getByRole("textbox", { name: "New places dataset name" }),
    ).toHaveValue("Exposure sites");
    fireEvent.click(
      screen.getByRole("button", { name: "Create places dataset" }),
    );
    expect(controller.createPlacesDataset).toHaveBeenCalledWith(
      "Exposure sites",
    );
  });

  it("waits for a map click when asked", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    fireEvent.click(screen.getByRole("button", { name: "Click the map" }));
    expect(controller.armMapPick).toHaveBeenCalled();
  });

  it("uses typed coordinates as the place's location", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    const input = screen.getByRole("textbox", {
      name: "Latitude and longitude",
    });
    fireEvent.change(input, { target: { value: "40.7603, -73.9885" } });
    fireEvent.submit(input.closest("form")!);
    expect(controller.state.onPlacePicked).toHaveBeenCalledWith({
      latitude: 40.7603,
      longitude: -73.9885,
    });
  });

  it("explains a typed value that is not a coordinate", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    const input = screen.getByRole("textbox", {
      name: "Latitude and longitude",
    });
    fireEvent.change(input, { target: { value: "WD-10" } });
    fireEvent.submit(input.closest("form")!);
    expect(
      screen.getByText(
        "Type a latitude and longitude, like 40.7603, -73.9885.",
      ),
    ).toBeVisible();
    expect(controller.state.onPlacePicked).not.toHaveBeenCalled();
  });

  it("shows the place form once the place has a location", () => {
    const controller = _withDraft(
      { ...NEW_DRAFT, coordinate: { latitude: 40.7603, longitude: -73.9885 } },
      { targetDatasetId: DATASET_ID },
    );
    render(<PlaceMapTool controller={controller} />);
    expect(screen.getByRole("textbox", { name: /Place name/ })).toBeVisible();
  });

  it("anchors the popover to the tool button", () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    const trigger = screen.getByRole("button", { name: "Add a place" });
    const dropdownId = trigger.getAttribute("aria-controls");
    expect(dropdownId).toBeTruthy();
    expect(document.getElementById(dropdownId!)).toContainElement(
      screen.getByRole("button", { name: "Click the map" }),
    );
  });

  it("hides the tool's tooltip while the popover is open", async () => {
    const controller = _withDraft(NEW_DRAFT, { targetDatasetId: DATASET_ID });
    render(<PlaceMapTool controller={controller} />);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Add a place" }));
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("gets out of the way while waiting for the map click", () => {
    const controller = _withDraft(NEW_DRAFT, {
      targetDatasetId: DATASET_ID,
      isArmed: true,
    });
    render(<PlaceMapTool controller={controller} />);
    expect(
      screen.queryByRole("button", { name: "Click the map" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a place" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
