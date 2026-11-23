import { Motion } from "../../../../motion";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { AcknowledgmentAnchor } from "./AcknowledgmentAnchor";
import { RecognitionResponse } from "./RecognitionResponse/RecognitionResponse";
import { useRecognitionExchangePresentation } from "./useRecognitionExchangePresentation";
import type { Input } from "../PeerContributionRecognition.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; focusedX: number };
/** A pointing arm contacts the focused object before turning to its maker. */
export function RecognitionExchange(props: Readonly<Props>): ReactNode {
  const presentation = useRecognitionExchangePresentation(props);

  return (
    <g>
      <g opacity={presentation.motion.reveal(props.frame, 12)}>
        <PersonGlyph x={150} y={300} size={76} color={props.accent} />
        <PersonGlyph x={810} y={300} size={76} color={presentation.peer} />
      </g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M810 300 L${presentation.handX} ${presentation.handY}`,
        }}
        profile={presentation.tokens.sketch.shape}
        stroke={presentation.peer}
        strokeWidth={presentation.scales.stroke(
          presentation.tokens.stroke.heavy,
        )}
        fill="none"
      />
      <circle
        data-pointing-hand="true"
        cx={presentation.handX}
        cy={presentation.handY}
        r={5}
        fill={presentation.peer}
      />
      <circle
        cx={Motion.mix({ t: presentation.turn, from: 803, to: 799 })}
        cy={277}
        r={2.5}
        fill={presentation.peer}
      />
      <AcknowledgmentAnchor {...presentation} />
      <RecognitionResponse {...presentation} />
    </g>
  );
}
