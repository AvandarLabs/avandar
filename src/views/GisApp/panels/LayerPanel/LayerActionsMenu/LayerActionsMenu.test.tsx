import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { LayerActionsMenu } from "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu";

const LAYER_NAME = "Population";

describe("LayerActionsMenu", () => {
  it("exposes the layer actions through an accessible menu", async () => {
    render(
      <LayerActionsMenu
        layerName={LAYER_NAME}
        onRename={vi.fn()}
        onDuplicate={vi.fn()}
        onZoomToLayer={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "More actions for the layer Population",
      }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Rename", hidden: true }),
    ).toHaveAccessibleName("Rename");
    expect(
      await screen.findByRole("menuitem", {
        name: "Zoom to layer",
        hidden: true,
      }),
    ).toHaveAccessibleName("Zoom to layer");
    expect(
      await screen.findByRole("menuitem", { name: "Duplicate", hidden: true }),
    ).toHaveAccessibleName("Duplicate");
    expect(
      await screen.findByRole("menuitem", { name: "Delete", hidden: true }),
    ).toHaveAccessibleName("Delete");
    expect(screen.getAllByRole("menuitem", { hidden: true })).toHaveLength(4);
  });

  it.each([
    ["Rename", "onRename"],
    ["Zoom to layer", "onZoomToLayer"],
    ["Duplicate", "onDuplicate"],
    ["Delete", "onDelete"],
  ] as const)(
    "invokes the %s action callback",
    async (action, callbackName) => {
      const callbacks = {
        onRename: vi.fn(),
        onDuplicate: vi.fn(),
        onZoomToLayer: vi.fn(),
        onDelete: vi.fn(),
      };

      render(<LayerActionsMenu layerName={LAYER_NAME} {...callbacks} />);
      fireEvent.click(
        screen.getByRole("button", {
          name: "More actions for the layer Population",
        }),
      );
      fireEvent.click(
        await screen.findByRole("menuitem", { name: action, hidden: true }),
      );

      expect(callbacks[callbackName]).toHaveBeenCalledOnce();
    },
  );
});
