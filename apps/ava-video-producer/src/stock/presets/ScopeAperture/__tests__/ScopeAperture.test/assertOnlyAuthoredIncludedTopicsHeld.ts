import { ScopeApertureTestState } from "./ScopeApertureTestState";

const { topicAttributes: _topicAttributes, render: _render } =
  ScopeApertureTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../ScopeAperture.fixtures";

/**
 * Asserts only authored included topics finish inside the contracted
 * aperture.
 */
export function assertOnlyAuthoredIncludedTopicsHeld(held: string): void {
  const early = SvgAttributes.fromMarker({
    markup: _render({ frame: 24 }),
    marker: "aperture",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: early, name: "width" }) >
      480,
  );
  const hidden = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showExcludedTopics: false },
  });
  DEFAULT_INPUT.topics
    .filter((topic) => {
      return !topic.included;
    })
    .forEach((topic) => {
      return assert.match(
        _topicAttributes({ markup: hidden, id: topic.id }),
        /opacity="0"/,
      );
    });
  assert.match(
    SvgAttributes.fromMarker({ markup: held, marker: "outside-caption" }),
    /opacity="1"/,
  );
}
