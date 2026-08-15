import { modals } from "@mantine/modals";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

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
              value={value}
              onChange={(event) => {
                onChange(Number(event.target.value));
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
            {note ?
              <span data-testid="section-note">{note}</span>
            : null}
            {children}
          </section>
        );
      },
    };
  },
);

function _applyLatestUpdate(
  onLayerChange: ReturnType<typeof vi.fn<LayerChangeHandler>>,
  layer: MapLayer.T,
): MapLayer.T {
  const latestCall = onLayerChange.mock.lastCall;
  if (!latestCall) {
    throw new Error("Expected a layer update");
  }
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

    expect(_applyLatestUpdate(onLayerChange, layer).sensitivity).toEqual({
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
    const aggregateLayer = _applyLatestUpdate(onLayerChange, layer);
    rerender(
      <SensitivitySection
        layer={aggregateLayer}
        onLayerChange={onLayerChange}
      />,
    );

    expect(screen.getByLabelText("Suppress areas below")).toHaveValue("5");
    expect(
      screen.getByText(
        "This layer cannot be drawn yet. Aggregate only needs an area to aggregate into, and boundary joins arrive in a later release.",
      ),
    ).toBeInTheDocument();
  });

  it("requires confirmation before relaxing aggregate-only handling", () => {
    const onLayerChange = vi.fn<LayerChangeHandler>();
    const layer = {
      ...MapLayer.makeEmpty("Cases"),
      sensitivity: {
        mode: "aggregateOnly" as const,
        minCellCount: 5,
        minGeoLevel: "",
      },
    };
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

    expect(_applyLatestUpdate(onLayerChange, layer).sensitivity).toEqual({
      mode: "exact",
    });
  });
});
