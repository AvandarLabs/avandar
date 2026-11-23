import { Motion } from "../../../../../motion";
import { LabelSlots } from "../../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../../primitives/SketchedShape";
import { AcknowledgmentBox } from "./AcknowledgmentBox";
import type { useRecognitionExchangePresentation } from "../useRecognitionExchangePresentation";
import type { ReactNode } from "react";

type Props = ReturnType<typeof useRecognitionExchangePresentation>;
/** Render the recognition response. */
export function RecognitionResponse(props: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={Motion.ramp({
        frame: props.frame,
        at: 89,
        dur: props.acknowledge,
        easing: props.motion.reveal.easing,
      })}
    >
      <AcknowledgmentBox {...props} />
      {props.input.acknowledgment.form === "spoken" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M800 120 l10 18 l10 -18" }}
          profile={props.tokens.sketch.shape}
          fill={props.tokens.color.surface}
          stroke={props.peer}
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: "M870 30 v20 h30" }}
          profile={props.tokens.sketch.shape}
          stroke={props.peer}
          fill="none"
        />
      )}
      <LabelSlots
        labels={[[props.input.acknowledgment.text, 330, 55, 550, 18, 3]]}
      />
    </g>
  );
}
