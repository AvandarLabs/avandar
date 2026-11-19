import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { BackoffAttempt } from "./BackoffAttempt";
import { getBackoffStateFromInputAndFrame } from "./getBackoffStateFromInputAndFrame";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const state = getBackoffStateFromInputAndFrame({ motion, frame, input });
  return (
    <g opacity={motion.reveal(frame, 12)}>
      <FitText
        text={input.operationLabel}
        x={40}
        y={72}
        width={880}
        maxLines={2}
        fontSize={24}
        normalizeWhitespace
        breakLongWords
      />
      <SketchedShape
        shape={{ kind: "path", d: "M80 310 H880" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeOpacity={0.24}
      />
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
