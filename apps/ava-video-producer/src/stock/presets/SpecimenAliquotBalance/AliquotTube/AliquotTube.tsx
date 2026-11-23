import { SketchedShape } from "../../../primitives/SketchedShape";
import { AliquotTubeLabels } from "../AliquotTubeLabels";
import { AliquotTubeOutline } from "./AliquotTubeOutline";
import { useAliquotTubePresentation } from "./useAliquotTubePresentation";
import type { Input } from "../SpecimenAliquotBalance.schema.ts";
import type { ReactNode } from "react";

type Props = {
  tube: Input["parent"];
  parentId: string;
  x: number;
  volume: number;
  showIdentity: boolean;
  accent: string;
  isChild?: boolean;
};
/**
 * Equal-width tubes encode the same material scale, including empty parents.
 */
export function AliquotTube(props: Readonly<Props>): ReactNode {
  const presentation = useAliquotTubePresentation(props);

  return (
    <g>
      {props.showIdentity && presentation.isChild ? (
        <g data-lineage={props.tube.id}>
          <SketchedShape
            shape={{ kind: "path", d: `M110 148 V126 H${props.x} V148` }}
            profile={presentation.tokens.sketch.shape}
            stroke={presentation.tokens.color.line}
            fill="none"
          />
        </g>
      ) : undefined}
      <AliquotTubeOutline {...presentation} />
      <rect
        data-liquid-id={props.tube.id}
        data-parent-id={props.parentId}
        x={props.x - 20}
        y={270 - props.volume * 9}
        width={40}
        height={props.volume * 9}
        fill={props.accent}
        opacity={presentation.atomic.opacity["70"]}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${props.x - 29} 146 H${props.x + 29}` }}
        profile={presentation.tokens.sketch.shape}
        stroke={presentation.tokens.color.accentAlt}
        strokeWidth={presentation.scales.stroke(7)}
      />
      <AliquotTubeLabels
        tube={props.tube}
        x={props.x}
        volume={props.volume}
        showIdentity={props.showIdentity}
      />
    </g>
  );
}
