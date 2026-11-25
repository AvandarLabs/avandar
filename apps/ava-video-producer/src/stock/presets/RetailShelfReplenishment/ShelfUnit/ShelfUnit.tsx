import { SketchedShape } from "../../../primitives/SketchedShape";
import { ShelfGoodBody } from "./ShelfGoodBody";
import { useShelfUnitPresentation } from "./useShelfUnitPresentation";
import type { Input } from "../RetailShelfReplenishment.schema.ts";
import type { ReactNode } from "react";

type Props = {
  good: Input["goods"][number];
  unitIndex: number;
  x: number;
  y: number;
  owner: string;
  accent: string;
};
/** A single authored unit has one silhouette and exactly one current owner. */
export function ShelfUnit(props: Readonly<Props>): ReactNode {
  const presentation = useShelfUnitPresentation(props);

  return (
    <g
      data-good={props.good.id}
      data-unit={props.unitIndex}
      data-owner={props.owner}
      transform={`translate(${props.x} ${props.y})`}
    >
      <ShelfGoodBody {...presentation} />
      {props.good.symbol === "grain" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M0 9 V-8 M0 -3 L-6 -7 M0 2 L6 -2" }}
          profile={presentation.tokens.sketch.shape}
          stroke={props.accent}
          fill="none"
        />
      ) : props.good.symbol === "beans" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M-5 -5 Q5 -11 6 0 Q5 11 -5 5 Q1 0 -5 -5" }}
          profile={presentation.tokens.sketch.shape}
          stroke={presentation.tokens.color.highlight}
          fill="none"
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: "M0 6 Q-9 -4 0 -8 Q9 -4 0 6 M0 -8 V-12" }}
          profile={presentation.tokens.sketch.shape}
          stroke={presentation.tokens.color.positive}
          fill="none"
        />
      )}
    </g>
  );
}
