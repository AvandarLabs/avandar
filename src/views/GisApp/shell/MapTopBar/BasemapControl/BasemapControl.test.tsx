import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";
import { BasemapControl } from "@/views/GisApp/shell/MapTopBar/BasemapControl/BasemapControl";
import { CustomBasemapForm } from "@/views/GisApp/shell/MapTopBar/BasemapControl/CustomBasemapForm";

const BUILT_IN_BASEMAP = {
  type: "builtIn",
  style: "avandar",
} as const satisfies AvaMapConfig.Basemap;

const CUSTOM_BASEMAP = {
  type: "custom",
  kind: "wms",
  url: "https://tiles.example/{bbox-epsg-3857}",
  attribution: "Example tiles",
} as const satisfies AvaMapConfig.Basemap;

describe("BasemapControl", () => {
  it("selects a built-in basemap from the menu", async () => {
    const onBasemapChange = vi.fn();

    render(
      <BasemapControl
        basemap={BUILT_IN_BASEMAP}
        onBasemapChange={onBasemapChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Basemap" }));
    fireEvent.click(await screen.findByText("Avandar"));

    expect(onBasemapChange).toHaveBeenCalledWith({
      type: "builtIn",
      style: "avandar",
    });
  });

  it("requires a URL and attribution before using a custom basemap", async () => {
    const onBasemapChange = vi.fn();

    render(
      <BasemapControl
        basemap={BUILT_IN_BASEMAP}
        onBasemapChange={onBasemapChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Basemap" }));
    fireEvent.click(await screen.findByText("Add a tile service"));

    const submitButton = await screen.findByRole("button", {
      name: "Use this basemap",
    });
    expect(submitButton).toBeDisabled();

    fireEvent.change(
      await screen.findByRole("textbox", { name: "URL template" }),
      {
        target: { value: "https://tiles.example/{z}/{x}/{y}.png" },
      },
    );
    expect(submitButton).toBeDisabled();

    fireEvent.change(
      await screen.findByRole("textbox", { name: "Attribution" }),
      {
        target: { value: "Example tiles" },
      },
    );
    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);

    expect(onBasemapChange).toHaveBeenCalledWith({
      type: "custom",
      kind: "xyz",
      url: "https://tiles.example/{z}/{x}/{y}.png",
      attribution: "Example tiles",
    });
  });

  it("adopts the current custom basemap whenever the form opens", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <CustomBasemapForm
        opened={false}
        basemap={BUILT_IN_BASEMAP}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    rerender(
      <CustomBasemapForm
        opened
        basemap={CUSTOM_BASEMAP}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(
      await screen.findByRole("combobox", { name: "Protocol" }),
    ).toHaveValue("WMS");
    expect(
      await screen.findByRole("textbox", { name: "URL template" }),
    ).toHaveValue(CUSTOM_BASEMAP.url);
    expect(
      await screen.findByRole("textbox", { name: "Attribution" }),
    ).toHaveValue(CUSTOM_BASEMAP.attribution);
  });
});
