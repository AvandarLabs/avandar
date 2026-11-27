import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { BufferMapTool } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool";
import {
  createLatLngLayer,
  createPolygonLayer,
  makeBufferOf,
  openBufferForm,
  pressMantineSelectOption,
  spatialAvailability,
} from "../BufferMapToolTestHelpers";

describe("BufferMapTool", () => {
  beforeEach(() => {
    spatialAvailability.value = "unavailable";
  });

  it("offers to filter a point layer by the new buffer", async () => {
    spatialAvailability.value = "available";
    const sites = createLatLngLayer("Sites");
    const schools = createLatLngLayer("Schools");
    const buffer: MapLayer.T = {
      ...MapLayer.createArea("Buffer of Sites"),
      geoBinding: {
        type: "bufferOfLayer",
        layerId: sites.id,
        distanceMeters: 805,
        distanceUnit: "mi",
        labelColumn: undefined,
        dissolve: false,
      },
    };
    const onFilterByBuffer = vi.fn();
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, buffer, schools]}
        onBufferConfirm={() => {
          return buffer.id;
        }}
        onFilterByBuffer={onFilterByBuffer}
      />,
    );

    await openBufferForm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    pickMantineSelectOption("Filter another layer by this buffer", "Schools");
    fireEvent.click(
      screen.getByRole("button", { name: "Filter and show list" }),
    );

    expect(onFilterByBuffer).toHaveBeenCalledWith({
      bufferLayerId: buffer.id,
      targetLayerId: schools.id,
    });
  });

  it("stays open while a unit and a layer to filter are picked", async () => {
    spatialAvailability.value = "available";
    const sites = createLatLngLayer("Sites");
    const schools = createLatLngLayer("Schools");
    const buffer = makeBufferOf(sites);
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, buffer, schools]}
        onBufferConfirm={() => {
          return buffer.id;
        }}
      />,
    );

    await openBufferForm();
    pressMantineSelectOption("Unit", "mi");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    pressMantineSelectOption("Filter another layer by this buffer", "Schools");

    expect(
      screen.getByRole("button", { name: "Filter and show list" }),
    ).toBeEnabled();
  });

  it("anchors the popover to the tool button", async () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={createPolygonLayer()}
        onBufferConfirm={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "Buffer around a layer",
    });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await openBufferForm();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute(
      "aria-controls",
      screen.getByRole("dialog").id,
    );
  });

  it("says so when no layer can be filtered by the new buffer", async () => {
    spatialAvailability.value = "available";
    const schools = createLatLngLayer("Schools");
    const schoolsBuffer = makeBufferOf(schools);
    const sites: MapLayer.T = {
      ...createLatLngLayer("Sites"),
      spatialFilter: { layerId: schoolsBuffer.id },
    };
    const sitesBuffer = makeBufferOf(sites);
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, sitesBuffer, schools, schoolsBuffer]}
        onBufferConfirm={() => {
          return sitesBuffer.id;
        }}
      />,
    );

    await openBufferForm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(
      screen.getByText("No layer can be filtered by this buffer."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", {
        name: "Filter another layer by this buffer",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toHaveFocus();
  });

  it("announces the new buffer and keeps focus in the popover", async () => {
    spatialAvailability.value = "available";
    const sites = createLatLngLayer("Sites");
    const schools = createLatLngLayer("Schools");
    const buffer = makeBufferOf(sites);
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, buffer, schools]}
        onBufferConfirm={() => {
          return buffer.id;
        }}
      />,
    );

    await openBufferForm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("status")).toHaveTextContent("Buffer added.");
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toContainElement(
        document.activeElement as HTMLElement,
      );
    });
  });
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../BufferMapToolTestHelpers");
});
