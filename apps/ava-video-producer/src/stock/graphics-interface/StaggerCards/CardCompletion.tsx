import { Check } from "../../graphics-common/Check";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { CardCompletionData } from "./StaggerCards.types";
import type { ReactNode } from "react";

type Props = CardCompletionData;

/** Renders the card completion layer for StaggerCards. */
export function CardCompletion(props: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "circle",
          cx: props.x + 236,
          cy: props.y + 128,
          r: 11,
        }}
        profile={props.sketch.shape}
        fill={props.cardColor}
        fillOpacity={props.done * props.shapes.wash(props.alpha.wash)}
        stroke={props.cardColor}
        strokeOpacity={props.done * props.alpha.dimmed}
        strokeWidth={props.hairline}
      />
      <g opacity={props.done}>
        {props.input.showChecks ? (
          <Check
            x={props.x + 236}
            y={props.y + 128}
            color={props.cardColor}
            size={9}
          />
        ) : null}
      </g>
    </>
  );
}
