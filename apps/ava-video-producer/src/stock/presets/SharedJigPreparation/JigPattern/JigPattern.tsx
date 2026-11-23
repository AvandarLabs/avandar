import { SketchedShape } from "../../../primitives/SketchedShape";
import { JigCutout } from "./JigCutout";
import { useJigPatternPresentation } from "./useJigPatternPresentation";
import type { Input } from "../SharedJigPreparation.schema.ts";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  pattern: Input["guide"]["pattern"];
  progress?: number;
  isGuide?: boolean;
  color: string;
};
/** The selected categorical pattern cuts the guide or marks its workpiece. */
export function JigPattern(props: Readonly<Props>): ReactNode {
  const presentation = useJigPatternPresentation(props);

  return (
    <g>
      {presentation.isGuide ? <JigCutout {...presentation} /> : undefined}
      {props.pattern === "two-holes" ? (
        [30, 70].map((offset) => {
          return (
            <SketchedShape
              key={offset}
              shape={{
                kind: "circle",
                cx: props.x + offset,
                cy: props.y + 32,
                r: presentation.radius,
              }}
              profile={presentation.tokens.sketch.shape}
              data-hole-mark="true"
              fill={presentation.isGuide ? "none" : props.color}
              stroke={props.color}
            />
          );
        })
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${props.x} ${props.y + 22 * presentation.progress} h${22 * presentation.progress} v${-22 * presentation.progress}`,
          }}
          profile={presentation.tokens.sketch.shape}
          data-corner-mark="true"
          fill="none"
          stroke={props.color}
          strokeWidth={presentation.scales.stroke(
            presentation.tokens.stroke.emphasis,
          )}
        />
      )}
    </g>
  );
}
