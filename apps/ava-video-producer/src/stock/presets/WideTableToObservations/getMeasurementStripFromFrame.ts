import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./WideTableToObservations.schema";

type Params = {
  input: Input;
  frame: number;
  subjectIndex: number;
  measureIndex: number;
};
function _getOrderedValues(input: Readonly<Input>): Array<number | null> {
  return input.measures.flatMap((measure) =>
    input.subjects.map(
      (subject) =>
        subject.values.find(({ measureId }) => measureId === measure.id)!.value,
    ),
  );
}
/** Data for getMeasurementStripFromFrame. */
type GetMeasurementStripFromFrameResult = {
  subject: {
    id: string;
    label: string;
    values: Array<{ measureId: string; value: number | null }>;
  };
  measure: { id: string; label: string; unit: string };
  value: number | null;
  sourceIndex: number;
  isOmitted: boolean;
  progress: number;
  x: number;
  y: number;
  width: number;
  opacity: number;
};

/** Keyed source cell and separated vertical-then-horizontal strip motion. */
export function getMeasurementStripFromFrame({
  input,
  frame,
  subjectIndex,
  measureIndex,
}: Readonly<Params>): GetMeasurementStripFromFrameResult {
  const subject = input.subjects[subjectIndex],
    measure = input.measures[measureIndex];
  const value = subject.values.find(
    ({ measureId }) => measureId === measure.id,
  )!.value;
  const sourceIndex = measureIndex * 2 + subjectIndex;
  const prior = _getOrderedValues(input).slice(0, sourceIndex);
  const outputIndex =
    input.missingPolicy === "retain-missing-row"
      ? sourceIndex
      : prior.filter((item) => item !== null).length;
  const isOmitted =
    value === null && input.missingPolicy === "omit-with-ledger";
  const progress = ramp(frame, 81 + sourceIndex * 2, 23, EASE.inOut);
  return {
    subject,
    measure,
    value,
    sourceIndex,
    isOmitted,
    progress,
    x: mix(progress, 350 + measureIndex * 280, 52),
    y: mix(
      ramp(frame, 51 + sourceIndex * 2, 24, EASE.inOut),
      210 + subjectIndex * 112,
      isOmitted ? 530 : 170 + outputIndex * 88,
    ),
    width: mix(progress, 264, 856),
    opacity:
      ramp(frame, 13 + sourceIndex * 2, 12) *
      (isOmitted ? 1 - ramp(frame, 100, 10) : 1),
  };
}
