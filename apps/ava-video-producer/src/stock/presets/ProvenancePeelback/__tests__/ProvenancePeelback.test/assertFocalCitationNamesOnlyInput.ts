import { ProvenancePeelbackTestState } from "./ProvenancePeelbackTestState";

const { render: _render } = ProvenancePeelbackTestState;
import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import type { fixtures } from "../../ProvenancePeelback.fixtures";
import { assertFocalCitationNamesOnlyCitation as _assertFocalCitationNamesOnlyCitation } from "./assertFocalCitationNamesOnlyCitation";

/**
 * Asserts the focal citation names only the selected source's exact passage
 * and optional locator.
 */
export function assertFocalCitationNamesOnlyInput(
  input: (typeof fixtures)[number]["input"],
): void {
  const markup = _render({ frame: 150, input }),
    selected = input.sources.find(propEq("id", input.selectedSourceId))!;
  const citation = SvgAttributes.fromMarker({
    markup,
    marker: "focal-citation",
  });
  assert.ok(citation.includes(`data-source-id="${selected.id}"`));
  assert.ok(citation.includes(`data-excerpt="${selected.excerpt}"`));
  _assertFocalCitationNamesOnlyCitation({
    citation,
    input,
    selected,
    markup,
  });
  assert.match(
    SvgAttributes.fromMarker({ markup, marker: "summary-strip" }),
    /translate\(64 96\)/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup, marker: "citation-tab" }),
    /x="16"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup, marker: "citation-link" }),
    /M464 330H480V192H512/,
  );
}
