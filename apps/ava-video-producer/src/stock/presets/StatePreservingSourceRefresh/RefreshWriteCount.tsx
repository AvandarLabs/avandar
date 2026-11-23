import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { useStatePreservingSourceRefreshPresentation } from "./useStatePreservingSourceRefreshPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useStatePreservingSourceRefreshPresentation>,
  "frame" | "writes" | "tokens" | "scales"
>;
/** Render the refresh write count. */
export function RefreshWriteCount(props: Readonly<Props>): ReactNode {
  return (
    <g data-write-count={props.frame >= 139 ? props.writes : 0}>
      <SketchedShape
        shape={{ kind: "path", d: "M720 559 l12 -12 l5 5 l-12 12 l-7 2 Z" }}
        profile={props.tokens.sketch.shape}
        fill="none"
        stroke={props.tokens.color.accentAlt}
        strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
      />
      <LabelSlots
        labels={[
          [String(props.frame >= 139 ? props.writes : 0), 755, 566, 145, 16, 1],
        ]}
      />
    </g>
  );
}
