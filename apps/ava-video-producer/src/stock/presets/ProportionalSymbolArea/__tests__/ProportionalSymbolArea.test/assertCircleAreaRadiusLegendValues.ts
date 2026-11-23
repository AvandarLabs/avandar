import { ProportionalSymbolAreaTestState } from "./ProportionalSymbolAreaTestState";

const {
  render,
  marks: _marks,
  number: _number,
} = ProportionalSymbolAreaTestState;
import assert from "node:assert/strict";
import { DEFAULT_INPUT } from "../../ProportionalSymbolArea.fixtures";
import { type Input } from "../../ProportionalSymbolArea.schema";
import { assertCircleAreaRadiusLegendCircles as _assertCircleAreaRadiusLegendCircles } from "./assertCircleAreaRadiusLegendCircles";

/** Asserts circle area, radius and legend share one authored area scale. */
export function assertCircleAreaRadiusLegendValues(
  values: Readonly<number[]>,
): void {
  const input: Input = {
    ...DEFAULT_INPUT,
    sites: DEFAULT_INPUT.sites.map(
      (site: Input["sites"][number], i: number) => {
        return { ...site, value: values[i] };
      },
    ),
  };
  const circles = _marks({
    markup: render({ frame: 150, input: input }),
    name: "symbol",
  });
  _assertCircleAreaRadiusLegendCircles({ circles, values, input });
  const moved = {
    ...input,
    sites: input.sites.map((site: Input["sites"][number]) => {
      return { ...site, x: site.x + 2 };
    }),
  };
  assert.deepEqual(
    _marks({
      markup: render({ frame: 150, input: moved }),
      name: "symbol",
    }).map((mark) => {
      return _number({ markup: mark, name: "r" });
    }),
    circles.map((mark) => {
      return _number({ markup: mark, name: "r" });
    }),
  );
}
