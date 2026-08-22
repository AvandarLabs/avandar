import type { ReactElement, RefObject } from "react";

/**
 * Behavioral tests for the shared canvas-docked drawer: that it stays in
 * document flow rather than overlaying as a dialog, and that the resize
 * handle and collapsible region follow open state.
 */
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { CanvasDrawer } from "@/components/CanvasDrawer/CanvasDrawer";
import { render, screen } from "@/test-utils";

function _drawer(
  opened: boolean,
  canvasRef: RefObject<HTMLDivElement | null>,
): ReactElement {
  return (
    <CanvasDrawer opened={opened} canvasRef={canvasRef}>
      <CanvasDrawer.ResizeHandle />
      <CanvasDrawer.Body regionId="canvas-drawer-region">
        Drawer body
      </CanvasDrawer.Body>
    </CanvasDrawer>
  );
}

describe("CanvasDrawer", () => {
  it("shows the body in document flow rather than a dialog overlay", () => {
    render(_drawer(true, createRef<HTMLDivElement>()));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Drawer body")).toBeInTheDocument();
    expect(document.getElementById("canvas-drawer-region")).toBeInTheDocument();
  });

  it("shows a resize handle only while open", () => {
    const canvasRef = createRef<HTMLDivElement>();
    const view = render(_drawer(false, canvasRef));

    expect(
      screen.queryByRole("separator", { name: /resize drawer/i }),
    ).not.toBeInTheDocument();

    view.rerender(_drawer(true, canvasRef));

    expect(
      screen.getByRole("separator", { name: /resize drawer/i }),
    ).toBeInTheDocument();
  });

  it("keeps the collapsible region mounted across open and close", () => {
    const canvasRef = createRef<HTMLDivElement>();
    const view = render(_drawer(false, canvasRef));
    const regionWhileShut = document.getElementById("canvas-drawer-region");

    view.rerender(_drawer(true, canvasRef));

    expect(document.getElementById("canvas-drawer-region")).toBe(
      regionWhileShut,
    );
  });
});
