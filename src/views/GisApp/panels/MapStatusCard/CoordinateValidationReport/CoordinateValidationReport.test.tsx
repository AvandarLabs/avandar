import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { CoordinateValidationReport } from "@/views/GisApp/panels/MapStatusCard/CoordinateValidationReport/CoordinateValidationReport";

describe("CoordinateValidationReport", () => {
  it("shows only reported reasons with counts, samples, and the totals note", () => {
    render(
      <CoordinateValidationReport
        drops={[
          {
            reason: "suspectedLatLngSwap",
            count: 2,
            sampleRowIndexes: [14, 62],
          },
          { reason: "nullIsland", count: 1, sampleRowIndexes: [71] },
        ]}
        onBack={vi.fn()}
        onSwapLatLng={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Latitude and longitude look swapped"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 rows")).toBeInTheDocument();
    expect(screen.getByText(/Rows 14 and 62\./)).toBeInTheDocument();
    expect(screen.getByText("Coordinate is 0, 0")).toBeInTheDocument();
    expect(screen.getByText("1 row")).toBeInTheDocument();
    expect(screen.getByText(/Row 71\./)).toBeInTheDocument();
    expect(
      screen.queryByText("Latitude or longitude is empty"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Unmapped rows are still counted in this layer's totals. They are excluded from the map only.",
      ),
    ).toBeInTheDocument();
  });

  it("offers swap only for suspected swapped coordinates", () => {
    const onSwapLatLng = vi.fn();
    const { rerender } = render(
      <CoordinateValidationReport
        drops={[
          {
            reason: "suspectedLatLngSwap",
            count: 1,
            sampleRowIndexes: [3],
          },
        ]}
        onBack={vi.fn()}
        onSwapLatLng={onSwapLatLng}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Swap latitude and longitude" }),
    );
    expect(onSwapLatLng).toHaveBeenCalledOnce();

    rerender(
      <CoordinateValidationReport
        drops={[
          { reason: "outOfRange", count: 1, sampleRowIndexes: [3] },
        ]}
        onBack={vi.fn()}
        onSwapLatLng={onSwapLatLng}
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: "Swap latitude and longitude",
      }),
    ).not.toBeInTheDocument();
  });
});
