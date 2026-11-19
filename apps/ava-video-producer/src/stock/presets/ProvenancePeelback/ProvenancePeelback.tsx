import { propEq, propNotEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ProvenanceSource } from "./ProvenanceSource";
import { ProvenanceSummary } from "./ProvenanceSummary";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode } from "react";
/** Complete provenance props. The shared renderer owns the loop envelope. */
export type Props = GraphicProps & { input: Input };
/** Expose literal source passages and align only the selected citation. */
export function ProvenancePeelback({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const selected = input.sources.find(propEq("id", input.selectedSourceId))!;
  const remaining = input.sources.filter(
    propNotEq("id", input.selectedSourceId),
  );
  return (
    <g>
      {[...remaining, selected].map((source) => {
        return (
          <ProvenanceSource
            key={source.id}
            source={source}
            index={input.sources.indexOf(source)}
            otherIndex={remaining.indexOf(source)}
            input={input}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <ProvenanceSummary input={input} frame={frame} accent={accent} />
      <g
        data-focal-citation="authored"
        data-source-id={selected.id}
        data-excerpt={selected.excerpt}
        data-locator={input.showLocators ? selected.locator : undefined}
        opacity={motion.ramp(frame, 82, motion.scale(22))}
      >
        <SketchedShape
          shape={{ kind: "path", d: "M464 330H480V192H512" }}
          profile={tokens.sketch.shape}
          data-citation-link="selected-passage"
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.hairline)}
        />
      </g>
    </g>
  );
}
