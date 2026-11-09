import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
/**
 * Buffer tool: spatial and selection gating, default confirm payload.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { BufferMapTool } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const spatialAvailability = vi.hoisted(() => {
  return {
    value: "unavailable" as "loading" | "available" | "unavailable",
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      getSpatialAvailability: () => {
        return spatialAvailability.value;
      },
      subscribeSpatialAvailability: () => {
        return () => {
          return undefined;
        };
      },
    },
  };
});

function _createPolygonLayer(): MapLayer.T {
  return {
    ...MapLayer.createArea("Cases"),
    geoBinding: {
      type: "geometryColumn",
      column: uuid<QueryColumn.Id>(),
      encoding: "wkt",
      family: "polygon",
      simplification: { tolerancePixels: 0.75 },
      sourceCrs: undefined,
    },
  };
}

function _makeQueryColumn(name: string): QueryColumn.T {
  return QueryColumn.makeFromDatasetColumn(
    Model.make("DatasetColumn", {
      createdAt: "2026-11-09T00:00:00.000Z",
      updatedAt: "2026-11-09T00:00:00.000Z",
      id: uuid<DatasetColumn.Id>(),
      datasetId: uuid<Dataset.Id>(),
      workspaceId: uuid<Workspace.Id>(),
      name,
      originalName: name,
      originalDataType: "VARCHAR",
      dataType: "varchar",
      detectedDataType: "VARCHAR",
      description: undefined,
      columnIdx: 0,
    }),
  );
}

/**
 * A latitude and longitude layer as a new layer has it: only the bound
 * coordinate columns are queried, and the source's other columns are only
 * in its hydrated source columns.
 */
function _createLatLngLayer(name: string): MapLayer.T {
  const siteName = _makeQueryColumn("site_name");
  const latitude = _makeQueryColumn("latitude");
  const longitude = _makeQueryColumn("longitude");
  const layer = MapLayer.makeEmpty(name);
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: [latitude, longitude],
      sourceColumns: [
        siteName,
        { ...latitude, id: uuid<QueryColumn.Id>() },
        { ...longitude, id: uuid<QueryColumn.Id>() },
      ],
    },
    geoBinding: {
      type: "latLngColumns",
      latitude: latitude.id,
      longitude: longitude.id,
    },
  };
}

function _makeBufferOf(source: MapLayer.T): MapLayer.T {
  return {
    ...MapLayer.createArea(`Buffer of ${source.name}`),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: source.id,
      distanceMeters: 805,
      distanceUnit: "mi",
      labelColumn: undefined,
      dissolve: false,
    },
  };
}

async function _openBufferForm(): Promise<void> {
  fireEvent.click(
    screen.getByRole("button", { name: "Buffer around a layer" }),
  );
  await screen.findByRole("button", { name: "Confirm" });
}

/**
 * Picks a Select option the way a pointer does: a mouse down before the
 * click, which is what a popover listens to when it closes on outside
 * presses.
 */
function _pressMantineSelectOption(
  comboboxLabel: string,
  optionLabel: string,
): void {
  fireEvent.click(screen.getByRole("combobox", { name: comboboxLabel }));
  const option = screen.getByRole("option", {
    name: optionLabel,
    hidden: true,
  });
  fireEvent.mouseDown(option);
  fireEvent.click(option);
}

describe("BufferMapTool", () => {
  beforeEach(() => {
    spatialAvailability.value = "unavailable";
  });

  it("disables confirm when Spatial is unavailable", () => {
    render(
      <BufferMapTool
        selectedLayer={_createPolygonLayer()}
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
        selectedLayer={_createPolygonLayer()}
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
        selectedLayer={_createLatLngLayer("Sites")}
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
      ..._createLatLngLayer("Sites"),
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
        selectedLayer={_createPolygonLayer()}
        onBufferConfirm={onBufferConfirm}
      />,
    );

    await _openBufferForm();
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
        selectedLayer={_createPolygonLayer()}
        onBufferConfirm={vi.fn()}
      />,
    );

    await _openBufferForm();
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
        selectedLayer={_createPolygonLayer()}
        onBufferConfirm={onBufferConfirm}
      />,
    );

    await _openBufferForm();
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
    const sites = _createLatLngLayer("Sites");
    const onBufferConfirm = vi.fn();
    render(
      <BufferMapTool selectedLayer={sites} onBufferConfirm={onBufferConfirm} />,
    );

    await _openBufferForm();
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
        selectedLayer={_createLatLngLayer("Sites")}
        onBufferConfirm={vi.fn()}
      />,
    );

    await _openBufferForm();
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

  it("offers to filter a point layer by the new buffer", async () => {
    spatialAvailability.value = "available";
    const sites = _createLatLngLayer("Sites");
    const schools = _createLatLngLayer("Schools");
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

    await _openBufferForm();
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
    const sites = _createLatLngLayer("Sites");
    const schools = _createLatLngLayer("Schools");
    const buffer = _makeBufferOf(sites);
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, buffer, schools]}
        onBufferConfirm={() => {
          return buffer.id;
        }}
      />,
    );

    await _openBufferForm();
    _pressMantineSelectOption("Unit", "mi");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    _pressMantineSelectOption("Filter another layer by this buffer", "Schools");

    expect(
      screen.getByRole("button", { name: "Filter and show list" }),
    ).toBeEnabled();
  });

  it("anchors the popover to the tool button", async () => {
    spatialAvailability.value = "available";
    render(
      <BufferMapTool
        selectedLayer={_createPolygonLayer()}
        onBufferConfirm={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "Buffer around a layer",
    });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await _openBufferForm();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute(
      "aria-controls",
      screen.getByRole("dialog").id,
    );
  });

  it("says so when no layer can be filtered by the new buffer", async () => {
    spatialAvailability.value = "available";
    const schools = _createLatLngLayer("Schools");
    const schoolsBuffer = _makeBufferOf(schools);
    const sites: MapLayer.T = {
      ..._createLatLngLayer("Sites"),
      spatialFilter: { layerId: schoolsBuffer.id },
    };
    const sitesBuffer = _makeBufferOf(sites);
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, sitesBuffer, schools, schoolsBuffer]}
        onBufferConfirm={() => {
          return sitesBuffer.id;
        }}
      />,
    );

    await _openBufferForm();
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
    const sites = _createLatLngLayer("Sites");
    const schools = _createLatLngLayer("Schools");
    const buffer = _makeBufferOf(sites);
    render(
      <BufferMapTool
        selectedLayer={sites}
        layers={[sites, buffer, schools]}
        onBufferConfirm={() => {
          return buffer.id;
        }}
      />,
    );

    await _openBufferForm();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("status")).toHaveTextContent("Buffer added.");
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toContainElement(
        document.activeElement as HTMLElement,
      );
    });
  });
});
