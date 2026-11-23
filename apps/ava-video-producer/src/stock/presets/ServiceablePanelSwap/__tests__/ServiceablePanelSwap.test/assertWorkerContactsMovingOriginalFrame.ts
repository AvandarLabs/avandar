import assert from "node:assert/strict";
import { propNotEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../ServiceablePanelSwap.schema";
import { ServiceablePanelSwapTestState } from "./ServiceablePanelSwapTestState";

const { render } = ServiceablePanelSwapTestState;

/**
 * Asserts the worker contacts the moving original, replacement and target
 * latch.
 */
export function assertWorkerContactsMovingOriginalFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const markup = render({ frame: frame, input: input });
  assert.equal(
    SvgAttributes.fromMarker({ markup, marker: "enclosure" }),
    SvgAttributes.fromMarker({
      markup: render({ frame: 30, input: input }),
      marker: "enclosure",
    }),
  );
  input.modules
    .filter(propNotEq("id", input.replacement.targetModuleId))
    .forEach(({ id }) => {
      const extract = (svg: string) => {
        return svg.match(
          new RegExp(`<rect[^>]*data-module="${id}"[^>]*>`),
        )?.[0];
      };
      assert.equal(
        extract(markup),
        extract(render({ frame: 30, input: input })),
      );
    });
}
