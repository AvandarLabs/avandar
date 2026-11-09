import { Model } from "@avandar/models";
import { beforeEach, describe, expect, it, vi } from "vitest";
/**
 * Buffer tool: spatial and selection gating, default confirm payload.
 */
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fireEvent, render, screen } from "@/test-utils";
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

function _createLatLngLayer(name: string): MapLayer.T {
  const siteName = _makeQueryColumn("site_name");
  const layer = MapLayer.makeEmpty(name);
  return {
    ...layer,
    source: { ...layer.source, queryColumns: [siteName] },
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
}

async function _openBufferForm(): Promise<void> {
  fireEvent.click(
    screen.getByRole("button", { name: "Buffer around a layer" }),
  );
  await screen.findByRole("button", { name: "Confirm" });
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
    fireEvent.change(screen.getByRole("textbox", { name: "Distance" }), {
      target: { value: "0.5" },
    });
    pickMantineSelectOption("Unit", "mi");
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onBufferConfirm).toHaveBeenCalledWith({
      distanceMeters: 805,
      distanceUnit: "mi",
      dissolve: false,
      labelColumn: undefined,
    });
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
        labelColumn: sites.source.queryColumns[0]!.id,
      }),
    );
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
});
