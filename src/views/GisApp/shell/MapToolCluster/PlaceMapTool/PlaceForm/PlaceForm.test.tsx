import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PlaceForm } from "@/views/GisApp/shell/MapToolCluster/PlaceMapTool/PlaceForm/PlaceForm";
import type { PlaceDraft } from "@/views/GisApp/places/PlaceTool.types";

const NYC = { latitude: 40.7603, longitude: -73.9885 };
const NEW_DRAFT: PlaceDraft = {
  datasetId: undefined,
  placeId: undefined,
  coordinate: NYC,
  values: { name: "", address: "", startsAt: "", endsAt: "", notes: "" },
  isAddressFromSearch: false,
};

function _renderForm(draft: PlaceDraft = NEW_DRAFT): {
  onSubmit: ReturnType<typeof vi.fn>;
  onChangeLocation: ReturnType<typeof vi.fn>;
} {
  const onSubmit = vi.fn();
  const onChangeLocation = vi.fn();
  render(
    <PlaceForm
      draft={draft}
      coordinate={NYC}
      isSaving={false}
      onChangeLocation={onChangeLocation}
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, onChangeLocation };
}

function _type(name: RegExp, value: string): void {
  fireEvent.change(screen.getByRole("textbox", { name }), {
    target: { value },
  });
}

describe("PlaceForm", () => {
  it("asks for a name before saving", async () => {
    const { onSubmit } = _renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Give the place a name.",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("saves the typed fields with the picked location", () => {
    const { onSubmit } = _renderForm();
    _type(/Place name/, "Restaurant, W 46th St");
    _type(/Notes/, "Exposure 10/02 6-10pm");
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Restaurant, W 46th St",
      address: undefined,
      latitude: 40.7603,
      longitude: -73.9885,
      startsAt: undefined,
      endsAt: undefined,
      notes: "Exposure 10/02 6-10pm",
    });
  });

  it("refuses an exposure that ends before it starts", async () => {
    _renderForm({
      ...NEW_DRAFT,
      values: {
        ...NEW_DRAFT.values,
        name: "Clinic",
        startsAt: "2026-10-02T18:00",
        endsAt: "2026-10-02T17:00",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save place" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The exposure must end after it starts.",
    );
  });

  it("starts an edit from the place's saved values", () => {
    _renderForm({
      ...NEW_DRAFT,
      placeId: "p1",
      values: { ...NEW_DRAFT.values, name: "Clinic" },
    });
    expect(screen.getByRole("textbox", { name: /Place name/ })).toHaveValue(
      "Clinic",
    );
  });

  it("credits OpenStreetMap only for an address that came from search", () => {
    _renderForm({ ...NEW_DRAFT, isAddressFromSearch: true });
    expect(
      screen.getByRole("link", { name: "© OpenStreetMap contributors" }),
    ).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  });

  it("does not credit OpenStreetMap for a typed address", () => {
    _renderForm();
    expect(
      screen.queryByRole("link", { name: "© OpenStreetMap contributors" }),
    ).not.toBeInTheDocument();
  });

  it("goes back to choosing a location", () => {
    const { onChangeLocation } = _renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Change location" }));
    expect(onChangeLocation).toHaveBeenCalled();
  });
});
