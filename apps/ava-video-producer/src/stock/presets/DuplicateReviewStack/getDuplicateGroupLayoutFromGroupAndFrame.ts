import { propEq, propNotEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import type { Input } from "./DuplicateReviewStack.schema";

type Options = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  groupIndex: number;
};
/** Data for getDuplicateGroupLayoutFromGroupAndFrame. */
type GetDuplicateGroupLayoutResult = {
  x: number;
  y: number;
  isPair: boolean;
  progress: number;
  records: Array<{ id: string; label: string; comparisonValue: string }>;
};

/** Group frames reflow for comparison pairs while retained faces paint last. */
export function getDuplicateGroupLayoutFromGroupAndFrame({
  frame,
  input,
  group,
  groupIndex,
}: Readonly<Options>): GetDuplicateGroupLayoutResult {
  const progress = ramp(frame, 70, 30);
  const isPair = input.finalView === "comparison-pair";
  const x = mix(isPair ? progress : 0, 44 + groupIndex * 456, 30);
  const y = mix(isPair ? progress : 0, 200, 192 + groupIndex * 240);
  const alternatives = group.records.filter(
    propNotEq<{ id: unknown }, "id", unknown>("id", group.retainedId),
  );
  const records =
    group.retainedId !== null && frame >= 70
      ? [
          ...alternatives.reverse(),
          ...group.records.filter(
            propEq<{ id: unknown }, "id", unknown>("id", group.retainedId),
          ),
        ]
      : group.records;
  return { x, y, isPair, progress, records };
}
