import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BackoffAttempt } from "./BackoffAttempt";
import { getBackoffStateFromInputAndFrame } from "./getBackoffStateFromInputAndFrame";
import { OperationHeading } from "./OperationHeading";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** One unchanged operation returns from retries across growing waiting gaps. */
export function RetryBackoff({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const state = getBackoffStateFromInputAndFrame({ motion, frame, input });
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <OperationHeading label={input.operationLabel} accent={accent} />
      {state.markers.map((marker) => {
        return (
          <BackoffAttempt
            key={marker.index}
            {...marker}
            frame={frame}
            input={input}
            accent={accent}
          />
        );
      })}
      <circle
        data-operation-token="true"
        cx={state.tokenX}
        cy={state.tokenY}
        r={8}
        fill={accent}
      />
    </g>
  );
}
