import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { BackoffAttempt } from "./BackoffAttempt";
import { getBackoffStateFromInputAndFrame } from "./getBackoffStateFromInputAndFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./RetryBackoff.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** One unchanged operation returns from retries across growing waiting gaps. */
export function RetryBackoff({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const state = getBackoffStateFromInputAndFrame({ frame, input });
  return (
    <g opacity={ramp(frame, 12, 12)}>
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
      <path d="M80 310 H880" stroke={accent} strokeOpacity={0.24} />
      {state.markers.map((marker) => (
        <BackoffAttempt
          key={marker.index}
          {...marker}
          frame={frame}
          input={input}
          accent={accent}
        />
      ))}
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
