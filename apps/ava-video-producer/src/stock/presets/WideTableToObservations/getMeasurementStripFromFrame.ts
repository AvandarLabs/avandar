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
function _getOrderedValues(input: Readonly<Input>): Array<number | null> {
  return input.measures.flatMap((measure) => {
    return input.subjects.map((subject) => {
      return subject.values.find(({ measureId }) => {
        return measureId === measure.id;
      })!.value;
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
  motion,
}: Readonly<Params>): GetMeasurementStripFromFrameResult {
  const subject = input.subjects[subjectIndex],
    measure = input.measures[measureIndex];
  const value = subject.values.find(({ measureId }) => {
    return measureId === measure.id;
  })!.value;
  const sourceIndex = measureIndex * 2 + subjectIndex;
  const prior = _getOrderedValues(input).slice(0, sourceIndex);
  const outputIndex =
    input.missingPolicy === "retain-missing-row"
      ? sourceIndex
      : prior.filter((item) => {
          return item !== null;
        }).length;
  const isOmitted =
    value === null && input.missingPolicy === "omit-with-ledger";
  const progress = motion.ramp(
    frame,
    81 + sourceIndex * 2,
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
        51 + sourceIndex * 2,
        motion.scale(24),
        motion.travel.easing,
      ),
      210 + subjectIndex * 112,
      isOmitted ? 530 : 170 + outputIndex * 88,
    ),
    width: mix(progress, 264, 856),
    opacity:
      motion.reveal(frame, 13 + sourceIndex * 2) *
      (isOmitted ? 1 - motion.ramp(frame, 100, motion.scale(10)) : 1),
  };
}
