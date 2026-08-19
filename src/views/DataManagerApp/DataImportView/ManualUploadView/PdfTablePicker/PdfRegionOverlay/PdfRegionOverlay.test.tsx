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

  it("measures its own surface rather than trusting the canvas scale", () => {
    /*
     * The regression this pins was found only by driving a browser. The
     * `scale` prop counts BITMAP pixels per point, but a pointer event
     * reports CSS pixels, and Mantine's `--mantine-scale` displays the
     * preview at 0.9 or 0.8 of its bitmap size on the viewport widths a
     * laptop or tablet has. Below, the surface is laid out at 0.9 of the
     * `scale` it was handed, exactly as it is at `--mantine-scale: 0.9`.
     *
     * Reading the offsets against the handed-down 0.5 would report
     * [20, 708, 220, 808]: a region the user did not draw, ~11% short in
     * both axes and shifted down the page by the y flip.
     */
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
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 270, 381.6),
    );

    fireEvent.pointerDown(surface, { clientX: 9, clientY: 18 });
    fireEvent.pointerMove(surface, { clientX: 99, clientY: 63 });
    fireEvent.pointerUp(surface, { clientX: 99, clientY: 63 });

    // 381.6 rendered pixels over an 848-point page is 0.45 pixels per point,
    // so x runs 9/0.45 = 20 to 99/0.45 = 220, and y flips to 848-140 = 708.
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

  it("reports a click as a PDF point in pick mode", () => {
    const onRegionDrawn = vi.fn();
    const onPointPicked = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        interaction="pick"
        onRegionDrawn={onRegionDrawn}
        onPointPicked={onPointPicked}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 20 });
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 20 });

    expect(onPointPicked).toHaveBeenCalledWith({ x: 20, y: 808 });
    expect(onRegionDrawn).not.toHaveBeenCalled();
  });

  it("measures a pick against the rendered surface, not the bitmap scale", () => {
    const onPointPicked = vi.fn();
    render(
      <PdfRegionOverlay
        width={300}
        height={424}
        scale={0.5}
        pageHeight={848}
        interaction="pick"
        onRegionDrawn={vi.fn()}
        onPointPicked={onPointPicked}
      />,
    );

    const surface = screen.getByTestId("pdf-region-overlay");
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 270, 381.6),
    );

    fireEvent.pointerDown(surface, { clientX: 9, clientY: 18 });
    fireEvent.pointerUp(surface, { clientX: 9, clientY: 18 });

    expect(onPointPicked).toHaveBeenCalledWith({ x: 20, y: 808 });
  });
});
