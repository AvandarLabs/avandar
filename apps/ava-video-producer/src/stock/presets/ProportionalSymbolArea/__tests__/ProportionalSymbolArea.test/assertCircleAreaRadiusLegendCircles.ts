import { ProportionalSymbolAreaTestState } from "./ProportionalSymbolAreaTestState";

const {
  render,
  marks: _marks,
  number: _number,
} = ProportionalSymbolAreaTestState;

import assert from "node:assert/strict";
import { type Input } from "../../ProportionalSymbolArea.schema";

/** Asserts circle area, radius and legend share one authored area scale. */
export function assertCircleAreaRadiusLegendCircles({
  circles,
  values,
  input,
}: Readonly<{
  circles: Readonly<string[]>;
  values: Readonly<number[]>;
  input: Readonly<Input>;
}>): void {
  assert.equal(circles.length, 2);
  const ratio = values[1] / values[0];
  assert.ok(
    Math.abs(
      _number({ markup: circles[1], name: "r" }) /
        _number({ markup: circles[0], name: "r" }) -
        Math.sqrt(ratio),
    ) < 1e-12,
  );
  assert.equal(
    _number({ markup: circles[1], name: "data-area" }) /
      _number({ markup: circles[0], name: "data-area" }),
    ratio,
  );
  assert.equal(
    _number({
      markup: _marks({
        markup: render({ frame: 150, input: input }),
        name: "area-legend",
      })[0],
      name: "data-area-per-unit",
    }),
    input.areaPerUnit,
  );
}
