import { isNonNullish, propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./WideTableToObservations.schema";

type Params = {
  input: Input;
  frame: number;
  subjectIndex: number;
  measureIndex: number;
  motion: VideoMotion;
};

type ValueOptions = {
  input: Readonly<Params>["input"];
  frame: Readonly<Params>["frame"];
  subjectIndex: Readonly<Params>["subjectIndex"];
  measureIndex: Readonly<Params>["measureIndex"];
  motion: Readonly<Params>["motion"];
  subject: Readonly<Params>["input"]["subjects"][number];
  measure: Readonly<Params>["input"]["measures"][number];
};

type ValueResult = {
  value: number | undefined;
  sourceIndex: number;
  outputIndex: number;
  isOmitted: boolean;
  progress: number;
};

type GetMeasurementStripFromFrameYOptions = {
  frame: Readonly<Params>["frame"];
  subjectIndex: Readonly<Params>["subjectIndex"];
  motion: Readonly<Params>["motion"];
  sourceIndex: ValueResult["sourceIndex"];
  outputIndex: ValueResult["outputIndex"];
  isOmitted: ValueResult["isOmitted"];
};

type GetMeasurementStripGeometryOptions = {
  frame: Readonly<Params>["frame"];
  subjectIndex: Readonly<Params>["subjectIndex"];
  measureIndex: Readonly<Params>["measureIndex"];
  motion: Readonly<Params>["motion"];
  subject: Readonly<Params>["input"]["subjects"][number];
  measure: Readonly<Params>["input"]["measures"][number];
  value: ValueResult["value"];
  sourceIndex: ValueResult["sourceIndex"];
  outputIndex: ValueResult["outputIndex"];
  isOmitted: ValueResult["isOmitted"];
  progress: ValueResult["progress"];
};

/** Data for getMeasurementStripFromFrame. */
type GetMeasurementStripFromFrameResult = {
  subject: {
    id: string;
    label: string;
    values: Array<{
      measureId: string;
      value: number | null;
    }>;
  };
  measure: {
    id: string;
    label: string;
    unit: string;
  };
  value: number | undefined;
  sourceIndex: number;
  isOmitted: boolean;
  progress: number;
  x: number;
  y: number;
  width: number;
  opacity: number;
};

/**
 * Samples the measurement strip from frame y for the current authored frame.
 */
function _getMeasurementStripFromFrameY({
  frame,
  subjectIndex,
  motion,
  sourceIndex,
  outputIndex,
  isOmitted,
}: Readonly<GetMeasurementStripFromFrameYOptions>): number {
  return Motion.mix({
    t: motion.ramp(
      frame,
      51 + sourceIndex * motion.stagger.list,
      motion.scale(24),
      motion.travel.easing,
    ),
    from: 210 + subjectIndex * 112,
    to: isOmitted ? 530 : 170 + outputIndex * 88,
  });
}

/**
 * Samples the subject, measure, value, sourceIndex, isOmitted, progress, x, y
 * geometry fields.
 */
function _getMeasurementStripGeometry({
  frame,
  subjectIndex,
  measureIndex,
  motion,
  subject,
  measure,
  value,
  sourceIndex,
  outputIndex,
  isOmitted,
  progress,
}: Readonly<GetMeasurementStripGeometryOptions>): Pick<
  ReturnType<typeof getMeasurementStripFromFrame>,
  | "subject"
  | "measure"
  | "value"
  | "sourceIndex"
  | "isOmitted"
  | "progress"
  | "x"
  | "y"
> {
  return {
    subject,
    measure,
    value,
    sourceIndex,
    isOmitted,
    progress,
    x: Motion.mix({
      t: progress,
      from: 350 + measureIndex * 280,
      to: 52,
    }),
    y: _getMeasurementStripFromFrameY({
      frame,
      subjectIndex,
      motion,
      sourceIndex,
      outputIndex,
      isOmitted,
    }),
  };
}

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

/**
 * A strip's row in the long table: its source order, or that order counting
 * only present values when missing rows are omitted.
 */
function _getOutputIndex({
  input,
  sourceIndex,
}: Readonly<{
  input: Input;
  sourceIndex: number;
}>): number {
  return input.missingPolicy === "retain-missing-row"
    ? sourceIndex
    : _getOrderedValues(input).slice(0, sourceIndex).filter(isNonNullish)
        .length;
}

/**
 * Samples the measurement strip from frame value state for the current authored
 * frame.
 */
function _getMeasurementStripFromFrameValueState({
  input,
  frame,
  subjectIndex,
  measureIndex,
  motion,
  subject,
  measure,
}: Readonly<ValueOptions>): ValueResult {
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
  return { value, sourceIndex, outputIndex, isOmitted, progress };
}

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
  const { value, sourceIndex, outputIndex, isOmitted, progress } =
    _getMeasurementStripFromFrameValueState({
      input,
      frame,
      subjectIndex,
      measureIndex,
      motion,
      subject,
      measure,
    });
  return {
    ..._getMeasurementStripGeometry({
      frame,
      subjectIndex,
      measureIndex,
      motion,
      subject,
      measure,
      value,
      sourceIndex,
      outputIndex,
      isOmitted,
      progress,
    }),
    width: Motion.mix({
      t: progress,
      from: 264,
      to: 856,
    }),
    opacity:
      motion.reveal(frame, 13 + sourceIndex * motion.stagger.list) *
      (isOmitted ? 1 - motion.ramp(frame, 100, motion.scale(10)) : 1),
  };
}
