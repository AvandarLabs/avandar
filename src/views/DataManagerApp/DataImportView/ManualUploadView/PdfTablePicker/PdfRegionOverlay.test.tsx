import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PdfRegionOverlay } from "./PdfRegionOverlay";

/*
 * jsdom implements no `PointerEvent`, so `fireEvent.pointerDown` would fall
 * back to a bare `Event` and silently drop `clientX`/`clientY`, leaving the
 * component to compute NaN. Aliasing it to `MouseEvent` is enough: everything
 * this component reads off the event (the two coordinates) is a `MouseEvent`
 * property.
 */
if (!("PointerEvent" in window)) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent =
    MouseEvent;
}

describe("PdfRegionOverlay", () => {
  it("reports a drawn box in PDF points, not screen pixels", () => {
    const onRegionDrawn = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        onRegionDrawn={onRegionDrawn}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 20 });
    fireEvent.pointerMove(surface, { clientX: 110, clientY: 70 });
    fireEvent.pointerUp(surface, { clientX: 110, clientY: 70 });

    // x: 10/0.5 = 20 to 110/0.5 = 220.
    // y is flipped: pageHeight - clientY/scale, so 848-140=708 down to 808.
    expect(onRegionDrawn).toHaveBeenCalledWith([20, 708, 220, 808]);
  });

  it("ignores a click that does not drag", () => {
    // Without this, every click on the page creates a zero-area region.
    const onRegionDrawn = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        onRegionDrawn={onRegionDrawn}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 20 });
    fireEvent.pointerUp(surface, { clientX: 12, clientY: 21 });

    expect(onRegionDrawn).not.toHaveBeenCalled();
  });

  it("normalises a box dragged up and to the left", () => {
    const onRegionDrawn = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        onRegionDrawn={onRegionDrawn}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    fireEvent.pointerDown(surface, { clientX: 110, clientY: 70 });
    fireEvent.pointerMove(surface, { clientX: 10, clientY: 20 });
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 20 });

    expect(onRegionDrawn).toHaveBeenCalledWith([20, 708, 220, 808]);
  });
});
