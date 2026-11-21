import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { type Input } from "../../VoluntaryFamilyReunion.schema";

/**
 * Asserts changed greeting changes actual arms and every member stays
 * distinct after sequential acceptance.
 */
export function assertChangedGreetingChangesActualPeople({
  people,
  input,
}: Readonly<{
  people: (frame: number) => RegExpExecArray[];
  input: Readonly<Input>;
}>): void {
  assert.deepEqual(
    people(24).map((person) => {
      return person[2];
    }),
    people(59).map((person) => {
      return person[2];
    }),
  );
  assert.notDeepEqual(
    people(59).map((person) => {
      return person[2];
    }),
    people(80).map((person) => {
      return person[2];
    }),
  );
  const final = people(150);
  assert.equal(final.length, input.groups.flatMap(prop("members")).length);
  assert.equal(
    new Set(
      final.map((person) => {
        return person[2];
      }),
    ).size,
    final.length,
  );
}
