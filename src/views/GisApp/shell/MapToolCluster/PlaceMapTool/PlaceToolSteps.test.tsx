import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { usePlaceToolState } from "@/views/GisApp/places/usePlaceToolState";
import { PlaceToolSteps } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceToolSteps";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceRow } from "@/clients/places/places.types";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";
import type { ReactNode } from "react";

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

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as Dataset.Id;
const SECOND_POINT = { latitude: 41, longitude: -74 };
const ROW: PlaceRow = {
  placeId: "place-1",
  name: "Saved name",
  address: undefined,
  latitude: 40,
  longitude: -73,
  startsAt: undefined,
  endsAt: undefined,
  notes: undefined,
};

function PlaceToolHarness(props: { start: "new" | "edit" }): ReactNode {
  const state = usePlaceToolState();
  const controller = {
    state,
    isSaving: false,
    targetDatasetId: DATASET_ID,
    savePlace: vi.fn(),
  } as unknown as PlaceToolController;
  return (
    <>
      <button
        onClick={() => {
          if (props.start === "new") {
            state.startNew();
          } else {
            state.startEdit({ datasetId: DATASET_ID, row: ROW });
          }
        }}
      >
        start
      </button>
      <button
        onClick={() => {
          state.onPlacePicked(SECOND_POINT);
        }}
      >
        pick
      </button>
      <PlaceToolSteps controller={controller} />
    </>
  );
}

async function _changeLocationAndPick(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Change location" }));
  fireEvent.click(screen.getByRole("button", { name: "pick" }));
  await screen.findByRole("button", { name: "Save place" });
}

describe("PlaceToolSteps", () => {
  it("keeps a new place's typed name when the location changes", async () => {
    render(<PlaceToolHarness start="new" />);
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.click(screen.getByRole("button", { name: "pick" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: /Place name/ }),
      {
        target: { value: "Typed name" },
      },
    );
    await _changeLocationAndPick();
    expect(screen.getByRole("textbox", { name: /Place name/ })).toHaveValue(
      "Typed name",
    );
  });

  it("keeps an edited place's typed name when the location changes", async () => {
    render(<PlaceToolHarness start="edit" />);
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    fireEvent.change(
      await screen.findByRole("textbox", { name: /Place name/ }),
      {
        target: { value: "Edited name" },
      },
    );
    await _changeLocationAndPick();
    expect(screen.getByRole("textbox", { name: /Place name/ })).toHaveValue(
      "Edited name",
    );
  });
});
