import { propEq } from "@avandar/utils";
import { getConflictCandidateStateFromField } from "./getConflictCandidateStateFromField";
import type { Input } from "./FieldConflictChoice.schema";

type Options = {
  field: Input["fields"][number];
  input: Input;
  y: number;
  progress: number;
};
/** Decision annotations use the same moving position as the chosen panel. */
export function getConflictChoicePositionFromField({
  field,
  input,
  y,
  progress,
}: Readonly<Options>): { x: number; top: number } | undefined {
  if (field.chosenSourceId === null) {
    return undefined;
  }
  const sourceIndex = input.sources.findIndex(
    propEq<{ id: unknown }, "id", unknown>("id", field.chosenSourceId),
  );
  const source = input.sources[sourceIndex];
  if (!source) {
    throw new Error("A validated choice must reference a source.");
  }
  const { x, top } = getConflictCandidateStateFromField({
    source,
    sourceIndex,
    field,
    input,
    y,
    progress,
  });
  return { x, top };
}
