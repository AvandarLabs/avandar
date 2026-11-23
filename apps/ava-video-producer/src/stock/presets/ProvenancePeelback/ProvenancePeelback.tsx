import { propEq, propNotEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FocalCitation } from "./FocalCitation";
import { ProvenanceSource } from "./ProvenanceSource/ProvenanceSource";
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
      <FocalCitation
        selected={selected}
        showLocators={input.showLocators}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
