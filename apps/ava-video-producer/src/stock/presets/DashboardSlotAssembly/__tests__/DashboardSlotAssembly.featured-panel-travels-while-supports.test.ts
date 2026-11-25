import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fixtures } from "../DashboardSlotAssembly.fixtures";
import { _render, _getRectFromPanel } from "./DashboardSlotAssemblyTestHelpers";

function _makeDockingInputsFromContract(
  correctionContract: typeof import("../DashboardSlotAssembly.contract").dashboardSlotAssemblyContract,
): Array<(typeof fixtures)[number]["input"]> {
  return Array.from(
    [
      correctionContract.defaultInput,
      correctionContract.fixtures.find(propEq("id", "dense"))!.input,
    ].flatMap((candidateInput) => {
      return (["feature-left", "feature-top"] as const).flatMap((layout) => {
        return candidateInput.widgets.map((widget) => {
          return {
            ...candidateInput,
            layout,
            featuredWidgetId: widget.id,
          };
        });
      });
    }),
  );
}

function _assertLaterSupportDocking(
  input: (typeof fixtures)[number]["input"],
): void {
  assert.deepEqual(
    _getRectFromPanel({
      markup: _render({ frame: 88, input }),
      id: "widget 2",
    }),
    _getRectFromPanel({
      markup: _render({ frame: 64, input }),
      id: "widget 2",
    }),
  );
  assert.notDeepEqual(
    _getRectFromPanel({
      markup: _render({ frame: 100, input }),
      id: "widget 2",
    }),
    _getRectFromPanel({
      markup: _render({ frame: 88, input }),
      id: "widget 2",
    }),
  );
  assert.deepEqual(
    _getRectFromPanel({
      markup: _render({ frame: 112, input }),
      id: "widget 2",
    }),
    _getRectFromPanel({
      markup: _render({ frame: 150, input }),
      id: "widget 2",
    }),
  );
}

function _assertEarlySupportDocking(
  input: (typeof fixtures)[number]["input"],
): void {
  assert.notDeepEqual(
    _getRectFromPanel({
      markup: _render({ frame: 76, input }),
      id: "widget 0",
    }),
    _getRectFromPanel({
      markup: _render({ frame: 64, input }),
      id: "widget 0",
    }),
  );
  assert.deepEqual(
    _getRectFromPanel({
      markup: _render({ frame: 76, input }),
      id: "widget 1",
    }),
    _getRectFromPanel({
      markup: _render({ frame: 64, input }),
      id: "widget 1",
    }),
  );
}

function _assertFeaturedPanelTravelsWhileSupportsInput(
  input: (typeof fixtures)[number]["input"],
): void {
  input.widgets.slice(0, 3).forEach(({ id }, index) => {
    assert.deepEqual(
      _getRectFromPanel({ markup: _render({ frame: 64, input }), id }),
      {
        x: 440,
        y: 136 + index * (452 / 3),
        width: 504,
        height: 428 / 3,
      },
    );
  });
}

test("featured panel travels while supports stage clear before their staggered final docking", () => {
  const input = fixtures[2].input;
  const setup = _getRectFromPanel({
    markup: _render({ frame: 40, input }),
    id: "widget 3",
  });
  const middle = _getRectFromPanel({
    markup: _render({ frame: 52, input }),
    id: "widget 3",
  });
  const docked = _getRectFromPanel({
    markup: _render({ frame: 64, input }),
    id: "widget 3",
  });
  assert.deepEqual(docked, { x: 24, y: 132, width: 396, height: 444 });
  assert.ok(setup.x - docked.x >= 300);
  assert.ok(middle.x < setup.x && middle.x > docked.x);
  assert.ok(middle.height > setup.height && middle.height < docked.height);
  _assertFeaturedPanelTravelsWhileSupportsInput(input);
  _assertEarlySupportDocking(input);
  _assertLaterSupportDocking(input);
});

test("all supplied widget text remains clear during staged final docking", async () => {
  const { dashboardSlotAssemblyContract: correctionContract } =
    await import("../DashboardSlotAssembly.contract");
  const { DashboardSlotAssembly: Component } =
    await import("../DashboardSlotAssembly");
  const { SvgPaintAssertions } =
    await import("../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  _makeDockingInputsFromContract(correctionContract).forEach((source) => {
    const input = { ...source };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );

    [64, 72, 80, 88, 90, 100, 112, 150].forEach((frame) => {
      const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        renderToStaticMarkup(
          createElement(Component, {
            input,
            frame,
            accent: "#9fefca",
            id: "correction",
          }),
        ),
      );
      SvgPaintAssertions.assertPaintClearance({
        texts: paint.filter((item) => {
          return item.kind === "text" && item.opacity === 1;
        }),
        rectangles: paint.filter((item) => {
          return (
            item.kind === "rect" &&
            item.fill !== "none" &&
            item.opacity * item.fillOpacity === 1
          );
        }),
      });
    });
  });
});
