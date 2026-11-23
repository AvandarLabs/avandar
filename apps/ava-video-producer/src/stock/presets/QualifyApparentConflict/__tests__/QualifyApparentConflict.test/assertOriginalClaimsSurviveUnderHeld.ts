import { QualifyApparentConflictTestState } from "./QualifyApparentConflictTestState";

const { render: _render } = QualifyApparentConflictTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../QualifyApparentConflict.fixtures";

/**
 * Asserts original claims survive under their authored contexts before the
 * qualifier resolves.
 */
export function assertOriginalClaimsSurviveUnderHeld(held: string): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: held,
        marker: "context-0",
      }),
      name: "data-y",
    }),
    145,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({
          frame: 150,
          input: { ...DEFAULT_INPUT, contextPlacement: "below" },
        }),
        marker: "context-0",
      }),
      name: "data-y",
    }),
    340,
  );
}
