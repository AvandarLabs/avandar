import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./WideTableToObservations.schema";

type Params = {
  input: Input;
  frame: number;
  subjectIndex: number;
  measureIndex: number;
  motion: VideoMotion;
};
function _getMeasurementValue({
  subject,
  measureId,
}: Readonly<{
  subject: Input["subjects"][number];
  measureId: string;
}>): number | null {
  const measurement = subject.values.find(propEq("measureId", measureId));
  if (!measurement) {
    throw new Error(`Missing subject measurement: ${measureId}`);
  }
  return measurement.value;
}
function _getOrderedValues(input: Readonly<Input>): Array<number | null> {
  return input.measures.flatMap((measure) => {
    return input.subjects.map((subject) => {
      // WideTableToObservations.schema verifies exactly one value per
      // existing measure in each subject.
      return _getMeasurementValue({ subject, measureId: measure.id });
    });
  });
}
/** Data for getMeasurementStripFromFrame. */
type GetMeasurementStripFromFrameResult = {
  subject: {
    id: string;
    label: string;
    values: Array<{ measureId: string; value: number | null }>;
  };
  measure: { id: string; label: string; unit: string };
  value: number | undefined;
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
  motion,
}: Readonly<Params>): GetMeasurementStripFromFrameResult {
  const subject = input.subjects[subjectIndex],
    measure = input.measures[measureIndex];
  const value =
    _getMeasurementValue({ subject, measureId: measure.id }) ?? undefined;
  const sourceIndex = measureIndex * 2 + subjectIndex;
  const outputIndex = _getOutputIndex({ input, sourceIndex });
  const isOmitted =
    value === undefined && input.missingPolicy === "omit-with-ledger";
  const progress = motion.ramp(
    frame,
    81 + sourceIndex * motion.stagger.list,
    motion.scale(23),
    motion.travel.easing,
  );
  return {
    subject,
    measure,
    value,
    sourceIndex,
    isOmitted,
    progress,
    x: mix(progress, 350 + measureIndex * 280, 52),
    y: mix(
      motion.ramp(
        frame,
        51 + sourceIndex * motion.stagger.list,
        motion.scale(24),
        motion.travel.easing,
      ),
      210 + subjectIndex * 112,
      isOmitted ? 530 : 170 + outputIndex * 88,
    ),
    width: mix(progress, 264, 856),
    opacity:
      motion.reveal(frame, 13 + sourceIndex * motion.stagger.list) *
      (isOmitted ? 1 - motion.ramp(frame, 100, motion.scale(10)) : 1),
  };
}
/**
 * A strip's row in the long table: its source order, or that order counting
 * only present values when missing rows are omitted.
 */
function _getOutputIndex({
  input,
  sourceIndex,
}: Readonly<{ input: Input; sourceIndex: number }>): number {
  if (input.missingPolicy === "retain-missing-row") {
    return sourceIndex;
  }
  return _getOrderedValues(input)
    .slice(0, sourceIndex)
    .filter((item) => {
      return item !== null;
    }).length;
}
