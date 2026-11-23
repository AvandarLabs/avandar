import {
  SharedJigPreparationTestState,
  type AssertMarkingHandsContactSelectedIdOptions,
} from "./SharedJigPreparationTestState";

const { render } = SharedJigPreparationTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertMarkingHandsContactSelectedHandX as _assertMarkingHandsContactSelectedHandX } from "./assertMarkingHandsContactSelectedHandX";

/**
 * Asserts marking hands contact the selected cutout and paint above the
 * opaque guide.
 */
export function assertMarkingHandsContactSelectedId({
  id,
  index,
  duration,
  input,
  pattern,
}: Readonly<AssertMarkingHandsContactSelectedIdOptions>): void {
  const markup = render({ frame: 49 + (index + 0.8) * duration, input: input });
  const guide = SvgAttributes.fromMarker({ markup, marker: "guide-body" });
  const origin = guide.match(/d="M([^ ]+) ([^ ]+) /);
  assert.ok(origin);
  const hand = SvgAttributes.fromMarker({ markup, marker: "marking-hand" });
  _assertMarkingHandsContactSelectedHandX({
    hand,
    origin,
    markup,
    guide,
    pattern,
    id,
  });
}
