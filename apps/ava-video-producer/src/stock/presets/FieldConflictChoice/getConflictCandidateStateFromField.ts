import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import type { Input } from "./FieldConflictChoice.schema";
type Options = {
  source: Input["sources"][number];
  sourceIndex: number;
  field: Input["fields"][number];
  input: Input;
  y: number;
  progress: number;
};
/** Data for getConflictCandidateStateFromField. */
type GetConflictCandidateStateResult = {
  value: string;
  isChosen: boolean;
  isResolved: boolean;
  isHidden: boolean;
  x: number;
  top: number;
  opacity: number;
};

/** An explicit choice determines lane movement and alternative visibility. */
export function getConflictCandidateStateFromField({
  source,
  sourceIndex,
  field,
  input,
  y,
  progress,
}: Readonly<Options>): GetConflictCandidateStateResult {
  const candidate = field.candidates.find(propEq("sourceId", source.id));
  if (!candidate) {
    throw new Error("A validated field must contain every source.");
  }
  const { value } = candidate;
  const isChosen = field.chosenSourceId === source.id;
  const isResolved = field.chosenSourceId !== null;
  const isHidden =
    isResolved &&
    !isChosen &&
    !input.showRetainedAlternatives &&
    progress === 1;
  const x = mix(
    progress,
    44 + sourceIndex * 456,
    isResolved ? (isChosen ? 44 : 500) : 44 + sourceIndex * 456,
  );
  const top = y + 30 - Math.sin(progress * Math.PI) * (isChosen ? 6 : 0);
  const opacity =
    isResolved && !isChosen
      ? input.showRetainedAlternatives
        ? 1 - progress * 0.25
        : 1 - progress
      : 1;
  return { value, isChosen, isResolved, isHidden, x, top, opacity };
}
