import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../../primitives/SketchedShape";
import { FILL_AT, COUNT_SIZE } from "./DotMatrix.constants";
import type { Drawing } from "./DotMatrix.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the cohort count layer for DotMatrix. */
export function CohortCount(props: Readonly<Props>): ReactNode {
  const selected = Math.round(
    props.cohort.dots
      .slice(0, props.cohort.selectedTotal)
      .reduce((total, _, index) => {
        return (
          total +
          props.motion.ramp(props.frame, FILL_AT + index, props.motion.chip)
        );
      }, 0),
  );
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M705 181 V450" }}
        profile={props.sketch.shape}
        stroke={props.color.line}
        strokeWidth={props.shapes.stroke(props.stroke.hairline)}
      />
      <Text role="figure" x={744} y={288} size={COUNT_SIZE} fill={props.accent}>
        {selected}
      </Text>
      <Text role="question" x={748} y={329}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["dot-matrix"].cohortTotal,
          values: { count: props.cohort.cohortTotal },
        })}
      </Text>
      <Text role="note" x={748} y={362}>
        {props.input.cohortLabel}
      </Text>
    </>
  );
}
