import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts interruption consumes its exact width while later task widths and
 * deadline remain fixed.
 */
export function assertInterruptionConsumesItsExactBefore({
  before,
  after,
  delay,
}: Readonly<{ before: string; after: string; delay: number }>): void {
  const tasks = (markup: string) => {
    return [...markup.matchAll(/<rect[^>]*data-task-id="[^"]*"[^>]*>/g)].map(
      ([value]) => {
        return value;
      },
    );
  };
  tasks(before).forEach((task, index) => {
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: task, name: "width" }),
      SvgAttributes.getNumberFromMarkup({
        attributes: tasks(after)[index],
        name: "width",
      }),
    );
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({
          attributes: tasks(after)[index],
          name: "x",
        }) -
          SvgAttributes.getNumberFromMarkup({ attributes: task, name: "x" }) -
          (index ? delay : 0),
      ) < 1e-8,
    );
  });
}
