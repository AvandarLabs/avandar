import type { ReactNode } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { useNuxJoyrideTargetEpoch } from "@/components/Nux/NuxTour/useNuxJoyrideTargetEpoch";
import { useNuxLaidOutTarget } from "@/components/Nux/NuxTour/useNuxLaidOutTarget/useNuxLaidOutTarget";
import { act, render, screen, waitFor } from "@/test-utils";

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

function _appendShareButton(rect: DOMRect, id: string): HTMLElement {
  const element = document.createElement("button");
  element.id = id;
  element.setAttribute("data-nux", NuxAnchors.ids.dashboardShareButton);
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);
  document.body.append(element);
  return element;
}

function LaidOutTargetId(): ReactNode {
  const target = useNuxLaidOutTarget(NuxAnchors.ids.dashboardShareButton);
  return <span data-testid="target-id">{target?.id ?? ""}</span>;
}

function JoyrideTargetEpoch(): ReactNode {
  const epoch = useNuxJoyrideTargetEpoch(NuxAnchors.ids.dashboardShareButton);
  return <span data-testid="target-epoch">{String(epoch)}</span>;
}

describe("useNuxLaidOutTarget", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("returns the laid-out Share control", () => {
    _appendShareButton(_LAID_OUT_RECT, "share-laid-out");
    render(<LaidOutTargetId />);
    expect(screen.getByTestId("target-id")).toHaveTextContent("share-laid-out");
  });

  it("ignores a sized copy parked at the viewport origin", () => {
    _appendShareButton(_ORIGIN_RECT, "share-origin");
    render(<LaidOutTargetId />);
    expect(screen.getByTestId("target-id")).toHaveTextContent("");
  });

  it("returns the replacement node after Puck remounts Share", async () => {
    const firstShare = _appendShareButton(_LAID_OUT_RECT, "share-first");
    render(<LaidOutTargetId />);
    expect(screen.getByTestId("target-id")).toHaveTextContent("share-first");

    act(() => {
      _appendShareButton(_LAID_OUT_RECT, "share-second");
      firstShare.remove();
    });

    await waitFor(() => {
      expect(screen.getByTestId("target-id")).toHaveTextContent("share-second");
    });
  });

  it("returns null when the laid-out Share control is removed", async () => {
    const share = _appendShareButton(_LAID_OUT_RECT, "share-laid-out");
    render(<LaidOutTargetId />);
    expect(screen.getByTestId("target-id")).toHaveTextContent("share-laid-out");

    act(() => {
      share.remove();
    });

    await waitFor(() => {
      expect(screen.getByTestId("target-id")).toHaveTextContent("");
    });
  });

  it("bumps the Joyride remount epoch once after Share is replaced", async () => {
    const firstShare = _appendShareButton(_LAID_OUT_RECT, "share-first");
    render(<JoyrideTargetEpoch />);
    expect(screen.getByTestId("target-epoch")).toHaveTextContent("0");

    act(() => {
      _appendShareButton(_LAID_OUT_RECT, "share-second");
      firstShare.remove();
      _appendShareButton(_LAID_OUT_RECT, "share-third");
      document.getElementById("share-second")?.remove();
    });

    expect(screen.getByTestId("target-epoch")).toHaveTextContent("0");
    await waitFor(() => {
      expect(screen.getByTestId("target-epoch")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("target-epoch")).toHaveTextContent("1");
  });
});
