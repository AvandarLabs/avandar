import { modals } from "@mantine/modals";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PlaceFeatureActions } from "@/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PlaceFeatureActionHandlers } from "@/views/GisApp/places/PlaceTool.types";

const TARGET = {
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
  placeId: "p1",
};

function _renderActions(): PlaceFeatureActionHandlers {
  const handlers: PlaceFeatureActionHandlers = {
    placesDatasetIds: new Set([TARGET.datasetId]),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<PlaceFeatureActions target={TARGET} handlers={handlers} />);
  return handlers;
}

describe("PlaceFeatureActions", () => {
  it("edits the clicked place", () => {
    const handlers = _renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Edit place" }));

    expect(handlers.onEdit).toHaveBeenCalledWith(TARGET);
  });

  it("moves the clicked place", () => {
    const handlers = _renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Move place" }));

    expect(handlers.onMove).toHaveBeenCalledWith(TARGET);
  });

  it("deletes the clicked place only after confirming", () => {
    let confirmOptions:
      | Parameters<typeof modals.openConfirmModal>[0]
      | undefined;
    vi.spyOn(modals, "openConfirmModal").mockImplementation((options) => {
      confirmOptions = options;
      return "delete-place";
    });
    const handlers = _renderActions();

    fireEvent.click(screen.getByRole("button", { name: "Delete place" }));

    expect(confirmOptions?.labels?.confirm).toBe("Delete");
    expect(handlers.onDelete).not.toHaveBeenCalled();
    confirmOptions?.onConfirm?.();
    expect(handlers.onDelete).toHaveBeenCalledWith(TARGET);
  });
});
