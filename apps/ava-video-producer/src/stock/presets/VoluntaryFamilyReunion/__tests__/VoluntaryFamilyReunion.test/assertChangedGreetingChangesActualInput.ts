import assert from "node:assert/strict";
import { assertChangedGreetingChangesActualPeople as _assertChangedGreetingChangesActualPeople } from "./assertChangedGreetingChangesActualPeople";
import { VoluntaryFamilyReunionTestState } from "./VoluntaryFamilyReunionTestState";
import type { fixtures } from "../../VoluntaryFamilyReunion.fixtures";

const { render: _render } = VoluntaryFamilyReunionTestState;

/**
 * Asserts changed greeting changes actual arms and every member stays
 * distinct after sequential acceptance.
 */
export function assertChangedGreetingChangesActualInput(
  input: (typeof fixtures)[number]["input"],
): void {
  const people = (frame: number) => {
    return [
      ..._render({ frame: frame, input: input }).matchAll(
        /<g data-member="([^"]*)"[^>]*data-x="([^"]*)"/g,
      ),
    ];
  };
  _assertChangedGreetingChangesActualPeople({ people, input });
  assert.equal(
    (_render({ frame: 60, input: input }).match(/data-accepted="true"/g) ?? [])
      .length,
    2,
  );
  [36, 54].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    assert.match(markup, /data-accepting-hand/);
    assert.match(markup, /data-acceptance-mark/);
  });
}
