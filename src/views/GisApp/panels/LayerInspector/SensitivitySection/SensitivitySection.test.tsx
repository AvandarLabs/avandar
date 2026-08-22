import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { assertIsDefined } from "@avandar/utils";
import { modals } from "@mantine/modals";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";

type Props = {
  label: string;
  onChange: (value: string | number) => void;
  suffix?: string;
  value: number;
};

vi.mock("@mantine/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/core")>();
  return {
    ...actual,
    NumberInput: Object.assign(
      ({ label, onChange, suffix, value }: Props) => {
        return (
          <label>
            {label}
            <input
              aria-label={label}
              type="number"
              value={value}
              onChange={(event) => {
                const parsed = event.currentTarget.valueAsNumber;
                if (Number.isFinite(parsed)) {
                  onChange(parsed);
                }
              }}
            />
            {suffix}
          </label>
        );
      },
      { extend: actual.NumberInput.extend },
    ),
    Select: Object.assign(
      ({
        data,
        label,
        onChange,
      }: {
        data: ReadonlyArray<{ label: string; value: string }>;
        label: string;
        onChange: (value: string | null) => void;
      }) => {
        return (
          <div>
            <span>{label}</span>
            {data.map((option) => {
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      },
      { extend: actual.Select.extend },
    ),
  };
});

vi.mock("@avandar/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Callout: ({ children }: { children: ReactNode }) => {
      return <div role="note">{children}</div>;
    },
  };
});

vi.mock(
  "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection",
  () => {
    return {
      InspectorSection: ({
        children,
        note,
        title,
      }: {
        children: ReactNode;
        note?: string;
        title: string;
      }) => {
        return (
          <section aria-label={title}>
            <h2>{title}</h2>
            {note ? <span data-testid="section-note">{note}</span> : null}
            {children}
          </section>
        );
      },
    };
  },
);

function _applyLatestUpdate(
  options: Readonly<{
    onLayerChange: ReturnType<typeof vi.fn<LayerChangeHandler>>;
    layer: MapLayer.T;
  }>,
): MapLayer.T {
  const { onLayerChange, layer } = options;
  const latestCall = onLayerChange.mock.lastCall;
  assertIsDefined(latestCall, "Expected a layer update");
  return latestCall[0](layer);
}

describe("SensitivitySection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the default jitter policy when Displace is selected", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = MapLayer.makeEmpty("Cases");

    render(<SensitivitySection layer={layer} onLayerChange={onLayerChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Displace" }));

    expect(
      _applyLatestUpdate({ onLayerChange: onLayerChange, layer: layer })
        .sensitivity,
    ).toEqual({
      mode: "jitter",
      radiusMeters: 500,
    });
  });

  it("shows the aggregate warning and default threshold", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = MapLayer.makeEmpty("Cases");
    const { rerender } = render(
      <SensitivitySection layer={layer} onLayerChange={onLayerChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aggregate only" }));
    const aggregateLayer = _applyLatestUpdate({
      onLayerChange: onLayerChange,
      layer: layer,
    });
    rerender(
      <SensitivitySection
        layer={aggregateLayer}
        onLayerChange={onLayerChange}
      />,
    );

    expect(screen.getByLabelText("Suppress areas below")).toHaveValue(5);
    expect(
      screen.getByText(
        "Aggregate only draws areas after at least 5 contributing records. Areas below that minimum are shown as Not reported without revealing their exact count.",
      ),
    ).toBeInTheDocument();
  });

  it("requires confirmation before relaxing aggregate-only handling", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = MapLayer.withSensitivity(MapLayer.makeEmpty("Cases"), {
      mode: "aggregateOnly" as const,
      minCellCount: 5,
      minGeoLevel: "",
    });
    let confirmOptions:
      | Parameters<typeof modals.openConfirmModal>[0]
      | undefined;
    vi.spyOn(modals, "openConfirmModal").mockImplementation((options) => {
      confirmOptions = options;
      return "sensitivity-confirmation";
    });

    render(<SensitivitySection layer={layer} onLayerChange={onLayerChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Show exact locations" }),
    );

    expect(confirmOptions?.children).toBe(
      "Individual locations will be drawn on the map, and suppressed areas will show their real counts. Continue?",
    );
    expect(onLayerChange).not.toHaveBeenCalled();

    confirmOptions?.onConfirm?.();

    expect(
      _applyLatestUpdate({ onLayerChange: onLayerChange, layer: layer })
        .sensitivity,
    ).toEqual({
      mode: "exact",
    });
  });

  it("requires confirmation before relaxing aggregate-only handling to displacement", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = MapLayer.withSensitivity(MapLayer.makeEmpty("Cases"), {
      mode: "aggregateOnly" as const,
      minCellCount: 5,
      minGeoLevel: "",
    });
    let confirmOptions:
      | Parameters<typeof modals.openConfirmModal>[0]
      | undefined;
    vi.spyOn(modals, "openConfirmModal").mockImplementation((options) => {
      confirmOptions = options;
      return "sensitivity-confirmation";
    });

    render(<SensitivitySection layer={layer} onLayerChange={onLayerChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Displace" }));

    expect(confirmOptions).toBeDefined();
    expect(onLayerChange).not.toHaveBeenCalled();

    confirmOptions?.onCancel?.();
    expect(onLayerChange).not.toHaveBeenCalled();
  });
});
