import {
  ProvenancePeelbackTestState,
  type AssertFocalCitationNamesOnlyCitationOptions,
} from "./ProvenancePeelbackTestState";

const { render: _render } = ProvenancePeelbackTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts the focal citation names only the selected source's exact passage
 * and optional locator.
 */
export function assertFocalCitationNamesOnlyCitation({
  citation,
  input,
  selected,
  markup,
}: Readonly<AssertFocalCitationNamesOnlyCitationOptions>): void {
  assert.equal(citation.includes("data-locator="), input.showLocators);
  if (input.showLocators) {
    assert.ok(citation.includes(`data-locator="${selected.locator}"`));
  }
  assert.equal((markup.match(/data-citation-underline=/g) ?? []).length, 1);
  assert.equal(
    (markup.match(/data-source-sheet=/g) ?? []).length,
    input.sources.length,
  );
  input.sources.forEach((source) => {
    return assert.ok(markup.includes(`data-source-sheet="${source.id}"`));
  });
  assert.notEqual(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 36, input }),
      marker: "summary-strip",
    }),
    SvgAttributes.fromMarker({ markup, marker: "summary-strip" }),
  );
  assert.notEqual(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 72, input }),
      marker: "summary-strip",
    }),
    SvgAttributes.fromMarker({ markup, marker: "summary-strip" }),
  );
}
