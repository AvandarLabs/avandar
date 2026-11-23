import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { BufferMapTool } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool";
import {
  createLatLngLayer,
  createPolygonLayer,
  openBufferForm,
  spatialAvailability,
} from "../BufferMapToolTestHelpers";

describe("BufferMapTool", () => {
  beforeEach(() => {
    spatialAvailability.value = "unavailable";
  });

  it("disables confirm when Spatial is unavailable", () => {
    render(
      <BufferMapTool
        selectedLayer={createPolygonLayer()}
        onBufferConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. This tool needs geometry support, which could not be loaded.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("disables confirm without a selected data layer", () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool selectedLayer={undefined} onBufferConfirm={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. Select a data layer to buffer.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("disables confirm when the selected layer has no geometry", () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={MapLayer.makeEmpty("Cases")}
        onBufferConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. Bind geometry on the selected layer to buffer it.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("confirms a polygon layer at 1000 m without dissolve", async () => {
    spatialAvailability.value = "available";
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool
        selectedLayer={createPolygonLayer()}
        onBufferConfirm={onBufferConfirm}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Buffer around a layer" }),
    );
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    fireEvent.click(confirm);

    expect(onBufferConfirm).toHaveBeenCalledWith({
      distanceMeters: 1000,
      distanceUnit: "m",
      dissolve: false,
      labelColumn: undefined,
    });
  });

  it("offers buffering a latitude and longitude layer", () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={createLatLngLayer("Sites")}
        onBufferConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Buffer around a layer" }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("refuses to buffer a layer whose locations are displaced", () => {
    spatialAvailability.value = "available";
    const sites: MapLayer.T = {
      ...createLatLngLayer("Sites"),
      sensitivity: { mode: "jitter", radiusMeters: 250 },
    };
    render(<BufferMapTool selectedLayer={sites} onBufferConfirm={vi.fn()} />);

    expect(
      screen.getByRole("button", {
        name: "Buffer around a layer. Buffers are off for layers set to Displace, since rings would reveal their exact locations.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("stores half a mile as 805 meters", async () => {
    spatialAvailability.value = "available";
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool
        selectedLayer={createPolygonLayer()}
        onBufferConfirm={onBufferConfirm}
      />,
    );

    await openBufferForm();
    pickMantineSelectOption("Unit", "mi");
    fireEvent.change(screen.getByRole("textbox", { name: "Distance" }), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onBufferConfirm).toHaveBeenCalledWith({
      distanceMeters: 805,
      distanceUnit: "mi",
      dissolve: false,
      labelColumn: undefined,
    });
  });

  it("restates the distance when the unit changes", async () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={createPolygonLayer()}
        onBufferConfirm={vi.fn()}
      />,
    );

    await openBufferForm();
    pickMantineSelectOption("Unit", "mi");

    expect(screen.getByRole("textbox", { name: "Distance" })).toHaveValue(
      "0.62",
    );
  });

  it("raises a distance below the limit to the smallest one in its unit", async () => {
    spatialAvailability.value = "available";
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool
        selectedLayer={createPolygonLayer()}
        onBufferConfirm={onBufferConfirm}
      />,
    );

    await openBufferForm();
    pickMantineSelectOption("Unit", "ft");
    expect(screen.getByText("At least 328.09 ft")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Distance" }), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onBufferConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ distanceMeters: 100, distanceUnit: "ft" }),
    );
  });

  it("carries the chosen ring label column", async () => {
    spatialAvailability.value = "available";
    const sites = createLatLngLayer("Sites");
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool selectedLayer={sites} onBufferConfirm={onBufferConfirm} />,
    );

    await openBufferForm();
    pickMantineSelectOption("Label each ring with", "site_name");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onBufferConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        labelColumn: sites.source.sourceColumns![0]!.id,
      }),
    );
  });

  it("offers every site column but the bound coordinates as a ring label", async () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={createLatLngLayer("Sites")}
        onBufferConfirm={vi.fn()}
      />,
    );

    await openBufferForm();
    fireEvent.click(
      screen.getByRole("combobox", { name: "Label each ring with" }),
    );
    const optionNames = screen
      .getAllByRole("option", { hidden: true })
      .map((option) => {
        return option.textContent;
      });

    expect(optionNames).toContain("site_name");
    expect(optionNames).not.toContain("latitude");
    expect(optionNames).not.toContain("longitude");
  });
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../BufferMapToolTestHelpers");
});
