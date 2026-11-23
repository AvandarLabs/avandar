import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { SupportRequestCopy } from "./SupportRequestCopy";
import { useSupportWordsPresentation } from "./useSupportWordsPresentation";
import type { Input } from "../SupportRequestResponse.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Exact authored words stay distinct from the structured response state. */
export function SupportWords(props: Readonly<Props>): ReactNode {
  const presentation = useSupportWordsPresentation(props);

  return (
    <g>
      <SupportRequestCopy {...presentation} />
      <g
        data-response-copy="true"
        opacity={presentation.motion.ramp(
          props.frame,
          43,
          presentation.motion.scale(20),
        )}
      >
        <StockRect
          x={510}
          y={55}
          width={390}
          height={126}
          rx={presentation.scales.corner(presentation.tokens.corner.panel)}
          fill={presentation.tokens.color.surface}
          stroke={presentation.tokens.color.accentAlt}
        />
        <SketchedShape
          shape={{ kind: "path", d: "M640 181 l15 18 l15 -18" }}
          profile={presentation.tokens.sketch.shape}
          data-response-tail="true"
          fill={presentation.tokens.color.surface}
          stroke={presentation.tokens.color.accentAlt}
        />
        <LabelSlots
          labels={[[props.input.response.text, 530, 86, 350, 18, 4]]}
        />
      </g>
    </g>
  );
}
