import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollNuxAnchorScrollParentToTop } from "@/components/Nux/NuxTour/scrollNuxAnchorScrollParentToTop/scrollNuxAnchorScrollParentToTop";

describe("scrollNuxAnchorScrollParentToTop", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("scrolls the nearest overflow ancestor back to the top", () => {
    const scroller = document.createElement("div");
    scroller.style.overflow = "auto";
    scroller.style.height = "80px";
    const filler = document.createElement("div");
    filler.style.height = "400px";
    const target = document.createElement("span");
    target.setAttribute("data-nux", "dataset-summary-tab");
    filler.append(target);
    scroller.append(filler);
    document.body.append(scroller);
    scroller.scrollTop = 240;

    scrollNuxAnchorScrollParentToTop("dataset-summary-tab");

    expect(scroller.scrollTop).toBe(0);
  });

  it("scrolls a Radix/Mantine ScrollArea viewport even when overflow is hidden", () => {
    const scroller = document.createElement("div");
    scroller.setAttribute("data-radix-scroll-area-viewport", "");
    scroller.style.overflow = "hidden";
    scroller.style.height = "80px";
    const filler = document.createElement("div");
    filler.style.height = "400px";
    const target = document.createElement("span");
    target.setAttribute("data-nux", "dataset-summary-tab");
    filler.append(target);
    scroller.append(filler);
    document.body.append(scroller);
    scroller.scrollTop = 240;

    scrollNuxAnchorScrollParentToTop("dataset-summary-tab");

    expect(scroller.scrollTop).toBe(0);
  });

  it("jumps instantly so the overlay cannot interrupt a smooth tween", () => {
    const scroller = document.createElement("div");
    scroller.setAttribute("data-radix-scroll-area-viewport", "");
    scroller.style.overflow = "hidden";
    scroller.style.height = "80px";
    const filler = document.createElement("div");
    filler.style.height = "400px";
    const target = document.createElement("span");
    target.setAttribute("data-nux", "dataset-summary-tab");
    filler.append(target);
    scroller.append(filler);
    document.body.append(scroller);
    scroller.scrollTop = 240;
    const scrollTo = vi.fn();
    scroller.scrollTo = scrollTo;

    scrollNuxAnchorScrollParentToTop("dataset-summary-tab");

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });

  it("does nothing when the anchor is not in the document", () => {
    expect(() => {
      scrollNuxAnchorScrollParentToTop("dataset-summary-tab");
    }).not.toThrow();
  });
});
