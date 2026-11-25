import { Motion } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { missingMessage } from "./WideTableToObservations.controls";
import type { getMeasurementStripFromFrame } from "./getMeasurementStripFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getMeasurementStripFromFrame>;
  showSourceGuides: boolean;
  subjectIndex: number;
  measureIndex: number;
};

type GetMeasureNameLabelSlotOptions = {
  x: Readonly<Props>["scene"]["x"];
  y: Readonly<Props>["scene"]["y"];
  progress: Readonly<Props>["scene"]["progress"];
  measure: Readonly<Props>["scene"]["measure"];
};

type GetMeasureLabelSlotsOptions = {
  x: Readonly<Props>["scene"]["x"];
  y: Readonly<Props>["scene"]["y"];
  progress: Readonly<Props>["scene"]["progress"];
  measure: Readonly<Props>["scene"]["measure"];
};

type GetSubjectLabelSlotOptions = {
  x: Readonly<Props>["scene"]["x"];
  y: Readonly<Props>["scene"]["y"];
  progress: Readonly<Props>["scene"]["progress"];
  subject: Readonly<Props>["scene"]["subject"];
};

/**
 * The labels fade in over the last part of the strip's travel. Both values are
 * fractions of that travel, not frames, so tempo never scales them.
 */
const LABEL_REVEAL_AT = 0.92;

const LABEL_REVEAL_SPAN = 0.08;

/** Positions the measured value or its explicit missing-data label. */
function _getMeasurementValueLabel({
  x,
  y,
  progress,
  value,
}: Readonly<{
  x: number;
  y: number;
  progress: number;
  value: Props["scene"]["value"];
}>): NonNullable<Parameters<typeof LabelSlots>[0]["labels"]>[number] {
  return [
    value === undefined ? missingMessage.message : String(value),
    x +
      Motion.mix({
        t: progress,
        from: 174,
        to: 440,
      }),
    y,
    Motion.mix({
      t: progress,
      from: 70,
      to: 190,
    }),
    12,
    4,
  ];
}

/** Samples the subject label slot for the current authored frame. */
function _getSubjectLabelSlot({
  x,
  y,
  progress,
  subject,
}: Readonly<GetSubjectLabelSlotOptions>): NonNullable<
  Parameters<typeof LabelSlots>[0]["labels"]
>[number] {
  return [
    subject.label,
    x + 10,
    y,
    Motion.mix({
      t: progress,
      from: 150,
      to: 180,
    }),
    12,
    4,
  ];
}

/** Samples the measure name label slot for the current authored frame. */
function _getMeasureNameLabelSlot({
  x,
  y,
  progress,
  measure,
}: Readonly<GetMeasureNameLabelSlotOptions>): NonNullable<
  Parameters<typeof LabelSlots>[0]["labels"]
>[number] {
  return [
    measure.label,
    x +
      Motion.mix({
        t: progress,
        from: 10,
        to: 218,
      }),
    y,
    200,
    12,
    3,
  ];
}

/** Samples the measure label slots for the current authored frame. */
function _getMeasureLabelSlots({
  x,
  y,
  progress,
  measure,
}: Readonly<GetMeasureLabelSlotsOptions>): NonNullable<
  Parameters<typeof LabelSlots>[0]["labels"]
> {
  return [
    _getMeasureNameLabelSlot({ x, y, progress, measure }),
    [
      measure.unit,
      x +
        Motion.mix({
          t: progress,
          from: 10,
          to: 650,
        }),
      y,
      186,
      12,
      2,
    ],
  ];
}

/** Key copies and values keep distinct readable lanes throughout travel. */
export function MeasurementStripLabels({
  scene,
  showSourceGuides,
  subjectIndex,
  measureIndex,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y, progress, subject, measure, value } = scene;
  return (
    <g>
      {showSourceGuides ? (
        <LabelSlots
          labels={[
            [`${subjectIndex + 1}/${measureIndex + 1}`, x - 30, y, 28, 12, 1],
          ]}
        />
      ) : undefined}
      <LabelSlots
        labels={[
          _getSubjectLabelSlot({ x, y, progress, subject }),
          _getMeasurementValueLabel({ x, y, progress, value }),
        ]}
      />
      <g opacity={motion.ramp(progress, LABEL_REVEAL_AT, LABEL_REVEAL_SPAN)}>
        <LabelSlots
          labels={_getMeasureLabelSlots({ x, y, progress, measure })}
        />
      </g>
    </g>
  );
}
