import { afterEach, describe, expect, it, vi } from "vitest";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";

const _ZERO_RECT = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 0,
  height: 0,
  toJSON: () => {
    return {};
  },
};

const _ORIGIN_RECT = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 32,
  right: 80,
  width: 80,
  height: 32,
  toJSON: () => {
    return {};
  },
};

const _LAID_OUT_RECT = {
  x: 800,
  y: 40,
  top: 40,
  left: 800,
  bottom: 72,
  right: 880,
  width: 80,
  height: 32,
  toJSON: () => {
    return {};
  },
};

describe("nuxAnchors", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("builds a data attribute selector", () => {
    expect(NuxAnchors.selector(NuxAnchors.ids.datasetUploadForm)).toBe(
      '[data-nux="dataset-upload-form"]',
    );
  });

  it("spreads onto a component as a data attribute", () => {
    expect(NuxAnchors.props(NuxAnchors.ids.datasetSummary)).toEqual({
      "data-nux": "dataset-summary",
    });
  });

  it("keeps every anchor value unique", () => {
    const values = Object.values(NuxAnchors.ids);
    expect(new Set(values).size).toBe(values.length);
  });

  it("skips a zero-size match so Joyride does not park at 0,0", () => {
    const collapsed = document.createElement("button");
    collapsed.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
    vi.spyOn(collapsed, "getBoundingClientRect").mockReturnValue(_ZERO_RECT);
    const laidOut = document.createElement("button");
    laidOut.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
    vi.spyOn(laidOut, "getBoundingClientRect").mockReturnValue(_LAID_OUT_RECT);
    document.body.append(collapsed, laidOut);

    expect(NuxAnchors.queryLaidOut(NuxAnchors.ids.dashboardShareButton)).toBe(
      laidOut,
    );
  });

  it("returns null while no laid-out match exists", () => {
    const collapsed = document.createElement("button");
    collapsed.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
    vi.spyOn(collapsed, "getBoundingClientRect").mockReturnValue(_ZERO_RECT);
    document.body.append(collapsed);

    expect(
      NuxAnchors.queryLaidOut(NuxAnchors.ids.dashboardShareButton),
    ).toBeNull();
  });

  it("skips a sized copy parked at the viewport origin", () => {
    // Puck's collapsed header menu is `position: absolute; left: 0`. The
    // Share button inside it has a real box, so a width/height check is not
    // enough: measuring it parks the tooltip in the top-left corner.
    const originCopy = document.createElement("button");
    originCopy.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
    vi.spyOn(originCopy, "getBoundingClientRect").mockReturnValue(_ORIGIN_RECT);
    const laidOut = document.createElement("button");
    laidOut.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
    vi.spyOn(laidOut, "getBoundingClientRect").mockReturnValue(_LAID_OUT_RECT);
    document.body.append(originCopy, laidOut);

    expect(NuxAnchors.queryLaidOut(NuxAnchors.ids.dashboardShareButton)).toBe(
      laidOut,
    );
  });

  it("returns null while the only match is still at the viewport origin", () => {
    const originCopy = document.createElement("button");
    originCopy.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
    vi.spyOn(originCopy, "getBoundingClientRect").mockReturnValue(_ORIGIN_RECT);
    document.body.append(originCopy);

    expect(
      NuxAnchors.queryLaidOut(NuxAnchors.ids.dashboardShareButton),
    ).toBeNull();
  });

  it("skips a sized match whose ancestor is display none", () => {
    const hiddenParent = document.createElement("div");
    hiddenParent.style.display = "none";
    const hiddenButton = document.createElement("button");
    hiddenButton.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
    vi.spyOn(hiddenButton, "getBoundingClientRect").mockReturnValue(
      _LAID_OUT_RECT,
    );
    hiddenParent.append(hiddenButton);
    document.body.append(hiddenParent);

    expect(
      NuxAnchors.queryLaidOut(NuxAnchors.ids.dashboardShareButton),
    ).toBeNull();
  });
});
