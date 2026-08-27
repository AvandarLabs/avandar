import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { ExportSheet } from "@/views/GisApp/export/ExportSheet/ExportSheet";
import type { RenderResult } from "@testing-library/react";
import type { ComponentProps } from "react";

const { useExportPdfDownloadMock } = vi.hoisted(() => {
  return { useExportPdfDownloadMock: vi.fn() };
});

vi.mock(
  "@/views/GisApp/export/useExportPdfDownload/useExportPdfDownload",
  () => {
    return { useExportPdfDownload: useExportPdfDownloadMock };
  },
);

type ConfigUpdate = (config: AvaMapConfig.T) => AvaMapConfig.T;
type Props = ComponentProps<typeof ExportSheet>;

/** A bare config with one visible standard layer so a subtitle can resolve. */
function _config(): AvaMapConfig.T {
  const layer = {
    ...MapLayer.createArea("Attack rate"),
    legend: {
      ...MapLayer.createArea("Attack rate").legend,
      title: "Attack rate by health zone",
    },
  };
  return AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer,
  });
}

function _aggregateOnlyLayer(): MapLayer.T {
  return MapLayer.withSensitivity(MapLayer.createArea("GBV service points"), {
    mode: "aggregateOnly",
    minCellCount: 5,
    minGeoLevel: "district",
  });
}

type Overrides = Partial<{
  onConfigChange: (update: ConfigUpdate) => void;
  mapName: string;
  disclaimer: string;
  layers: MapLayer.T[];
  basemap: AvaMapConfig.Basemap;
}>;

function _buildConfig(overrides: Overrides): AvaMapConfig.T {
  let config = _config();
  if (overrides.layers !== undefined) {
    config = { ...config, layers: overrides.layers };
  }
  if (overrides.basemap !== undefined) {
    config = { ...config, basemap: overrides.basemap };
  }
  if (overrides.disclaimer !== undefined) {
    config = {
      ...config,
      exportLayout: {
        ...config.exportLayout,
        disclaimer: overrides.disclaimer,
      },
    };
  }
  return config;
}

function _props(overrides: Overrides): Props {
  return {
    opened: true,
    onClose: () => {
      return;
    },
    config: _buildConfig(overrides),
    mapName: overrides.mapName ?? "Cholera response",
    workspaceName: "Test workspace",
    basemapAttribution: "MapLibre, OpenStreetMap contributors",
    spec: { sources: {}, layers: [] },
    view: { center: [0, 0], zoom: 4 },
    legendEntries: [],
    hasDrawnDisputedFeature: false,
    onConfigChange:
      overrides.onConfigChange ??
      (() => {
        return;
      }),
  };
}

function _render(overrides: Overrides): RenderResult {
  return render(<ExportSheet {...(_props(overrides) as Props)} />);
}

describe("ExportSheet", () => {
  beforeEach(() => {
    useExportPdfDownloadMock.mockReset();
    useExportPdfDownloadMock.mockReturnValue({
      status: "idle",
      errorMessage: undefined,
      download: vi.fn(),
    });
  });

  it("persists the paper size", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.click(screen.getByRole("radio", { name: "US Letter" }));

    expect(onConfigChange.mock.calls[0]![0](_config()).exportLayout.paper).toBe(
      "letter",
    );
  });

  it("persists the orientation", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.click(screen.getByRole("radio", { name: "Portrait" }));

    expect(
      onConfigChange.mock.calls[0]![0](_config()).exportLayout.orientation,
    ).toBe("portrait");
  });

  it("persists an edited title", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "North Kivu" },
    });

    expect(
      onConfigChange.mock.calls.at(-1)![0](_config()).exportLayout.title.text,
    ).toBe("North Kivu");
  });

  it("shows the live title fallback as a placeholder", () => {
    _render({ mapName: "Cholera response" });

    const titleInput = screen.getByRole("textbox", { name: "Title" });
    expect(titleInput).toHaveAttribute("placeholder", "Cholera response");
    expect(titleInput).toHaveValue("");
  });

  it("shows the live source-line fallback as a placeholder", () => {
    _render({});

    const sourceLineInput = screen.getByRole("textbox", {
      name: "Source line",
    });
    expect(sourceLineInput).toHaveAttribute(
      "placeholder",
      "MapLibre, OpenStreetMap contributors",
    );
    expect(sourceLineInput).toHaveValue("");
  });

  it("unsets the disclaimer when the field is cleared", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange, disclaimer: "Our own wording." });

    fireEvent.change(screen.getByRole("textbox", { name: "Disclaimer" }), {
      target: { value: "" },
    });

    expect(
      onConfigChange.mock.calls.at(-1)![0](_config()).exportLayout.disclaimer,
    ).toBeUndefined();
  });

  it("keeps the mandatory controls checked, disabled, and focusable", () => {
    _render({});

    ["Source attribution", "Boundary disclaimer", "Production date"].forEach(
      (name) => {
        const control = screen.getByRole("checkbox", {
          name: new RegExp(name),
        });
        expect(control).toBeChecked();
        expect(control).toHaveAttribute("aria-disabled", "true");
        expect(control).not.toBeDisabled();
        expect(control).toHaveAccessibleName(/Always included/);
      },
    );
  });

  it("does not let a mandatory control be unchecked", () => {
    const onConfigChange = vi.fn<(update: ConfigUpdate) => void>();
    _render({ onConfigChange });

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Boundary disclaimer/ }),
    );

    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it("shows the filter readout only when a filter is set", () => {
    const { rerender } = _render({});
    expect(screen.queryByText("Area of interest applied")).toBeNull();

    rerender(
      <ExportSheet
        {..._props({})}
        config={{
          ..._config(),
          aoi: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        }}
      />,
    );
    expect(screen.getByText("Area of interest applied")).toBeInTheDocument();
  });

  it("states the aggregate-only suppression when such a layer is visible", () => {
    _render({ layers: [_aggregateOnlyLayer()] });

    expect(
      screen.getByText(/applies the same suppression as the screen/),
    ).toBeInTheDocument();
  });

  it("warns about a dark basemap without disabling download", () => {
    _render({ basemap: { type: "builtIn", style: "dark" } });

    expect(screen.getByText(/photocopy poorly/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("stays available with an empty layer stack", () => {
    _render({ layers: [] });

    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("stays available while DuckDB Spatial is unavailable", () => {
    // ExportSheet snapshots whatever the screen already shows and has no
    // notion of spatial availability, so nothing here can gate download.
    _render({});

    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("disables the download while the export is pending", () => {
    useExportPdfDownloadMock.mockReturnValue({
      status: "pending",
      errorMessage: undefined,
      download: vi.fn(),
    });

    _render({});

    expect(screen.getByRole("button", { name: "Download PDF" })).toBeDisabled();
  });

  it("shows a retry status when the download fails", () => {
    useExportPdfDownloadMock.mockReturnValue({
      status: "error",
      errorMessage: "The PDF could not be created: boom",
      download: vi.fn(),
    });

    _render({});

    expect(
      screen.getByText("The PDF could not be created: boom"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("gives the preview an accessible name", () => {
    _render({});

    expect(
      screen.getByRole("img", { name: "Export preview" }),
    ).toBeInTheDocument();
  });
});
