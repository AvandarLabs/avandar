import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen, within } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import {
  isochroneFlag,
  spatialAvailability,
} from "../MapToolClusterTestHelpers";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { PlaceToolController } from "@/views/GisApp/places/PlaceTool.types";

describe("MapToolCluster", () => {
  beforeEach(() => {
    spatialAvailability.value = "unavailable";
    isochroneFlag.enabled = false;
  });

  afterEach(() => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      canvas.remove();
    });
  });

  it("filters the picked point layer by the new buffer and opens its list", async () => {
    spatialAvailability.value = "available";
    const makePointLayer = (name: string): MapLayer.T => {
      return {
        ...MapLayer.makeEmpty(name),
        geoBinding: {
          type: "latLngColumns",
          latitude: uuid<QueryColumn.Id>(),
          longitude: uuid<QueryColumn.Id>(),
        },
      };
    };
    const sites = makePointLayer("Sites");
    const schools = makePointLayer("Schools");
    let config: AvaMapConfig.T = {
      ...AvaMapConfig.makeEmpty(),
      layers: [sites, schools],
    };
    const updateConfig = vi.fn(
      (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => {
        config = update(config);
      },
    );
    const onOpenFeatureList = vi.fn();
    const renderCluster = () => {
      return (
        <MapToolCluster
          mapToolMode={{ type: "pan" }}
          onMapToolModeChange={vi.fn()}
          selectedLayer={sites}
          updateConfig={updateConfig}
          layers={config.layers}
          onOpenFeatureList={onOpenFeatureList}
        />
      );
    };
    const { rerender } = render(renderCluster());

    fireEvent.click(
      screen.getByRole("button", { name: "Buffer around a layer" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    rerender(renderCluster());
    pickMantineSelectOption("Filter another layer by this buffer", "Schools");
    fireEvent.click(
      screen.getByRole("button", { name: "Filter and show list" }),
    );

    const buffer = config.layers.find((layer) => {
      return layer.geoBinding?.type === "bufferOfLayer";
    });
    const filteredSchools = config.layers.find((layer) => {
      return layer.id === schools.id;
    });
    expect(filteredSchools?.spatialFilter).toEqual({ layerId: buffer?.id });
    expect(onOpenFeatureList).toHaveBeenCalledWith(schools.id);
  });

  it("places Add a place right after Buffer when the map can hold places", () => {
    const placeTool = {
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
    } satisfies PlaceToolController;
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
        placeTool={placeTool}
      />,
    );
    const labels = within(screen.getByRole("toolbar", { name: "Map tools" }))
      .getAllByRole("button")
      .map((button) => {
        return button.getAttribute("aria-label");
      });
    expect(labels.indexOf("Add a place")).toBe(
      labels.findIndex((label) => {
        return label?.startsWith("Buffer around a layer") ?? false;
      }) + 1,
    );
  });
});

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../MapToolClusterTestHelpers");
});
