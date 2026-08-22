/**
 * When the map clock's slider tells its parent about a new range.
 *
 * A pointer drag over a range slider cannot be driven meaningfully in jsdom,
 * since Mantine derives the value from the track's measured geometry and jsdom
 * measures everything as zero. The slider is stubbed instead so its two
 * callbacks can be fired directly: the point under test is not how Mantine
 * tracks a pointer, it is which of those callbacks reaches the parent, because
 * each range that reaches the parent refetches every time-filtered layer.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";

vi.mock("@mantine/core", async () => {
  const actual =
    await vi.importActual<typeof import("@mantine/core")>("@mantine/core");
  return {
    ...actual,
    RangeSlider: ({
      value,
      onChange,
      onChangeEnd,
    }: {
      value: [number, number];
      onChange: (next: [number, number]) => void;
      onChangeEnd: (next: [number, number]) => void;
    }) => {
      return (
        <div>
          <output data-testid="slider-value">{value.join(",")}</output>
          <button
            type="button"
            onClick={() => {
              onChange([0, 400]);
            }}
          >
            drag
          </button>
          <button
            type="button"
            onClick={() => {
              onChangeEnd([0, 400]);
            }}
          >
            release
          </button>
        </div>
      );
    },
  };
});

const { MapTimeSliderBar } =
  await import("@/views/GisApp/shell/MapTimeSlider/MapTimeSliderBar");

function _renderBar(sliderValue: [number, number] = [0, 1000]) {
  const onSliderChange = vi.fn();
  render(
    <MapTimeSliderBar
      sliderValue={sliderValue}
      prefersReducedMotion={false}
      startLabel="start"
      endLabel="end"
      onSliderChange={onSliderChange}
      onPlay={vi.fn()}
    />,
  );
  return onSliderChange;
}

describe("MapTimeSliderBar", () => {
  it("does not report a range while the handle is still moving", () => {
    const onSliderChange = _renderBar();
    fireEvent.click(screen.getByRole("button", { name: "drag" }));
    expect(onSliderChange).not.toHaveBeenCalled();
  });

  it("moves the handle to follow the pointer during the drag", () => {
    _renderBar();
    fireEvent.click(screen.getByRole("button", { name: "drag" }));
    expect(screen.getByTestId("slider-value")).toHaveTextContent("0,400");
  });

  it("reports the range once the handle is released", () => {
    const onSliderChange = _renderBar();
    fireEvent.click(screen.getByRole("button", { name: "drag" }));
    fireEvent.click(screen.getByRole("button", { name: "release" }));
    expect(onSliderChange).toHaveBeenCalledExactlyOnceWith([0, 400]);
  });

  it("follows a range changed from outside the slider", () => {
    // Play and extent clamping both move the window without a drag, so the
    // handles have to accept a value the slider did not produce.
    const { rerender } = render(
      <MapTimeSliderBar
        sliderValue={[0, 1000]}
        prefersReducedMotion={false}
        startLabel="start"
        endLabel="end"
        onSliderChange={vi.fn()}
        onPlay={vi.fn()}
      />,
    );
    rerender(
      <MapTimeSliderBar
        sliderValue={[100, 200]}
        prefersReducedMotion={false}
        startLabel="start"
        endLabel="end"
        onSliderChange={vi.fn()}
        onPlay={vi.fn()}
      />,
    );
    expect(screen.getByTestId("slider-value")).toHaveTextContent("100,200");
  });
});
