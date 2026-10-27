import { STOCK } from "../../stockPalette";
import { DeviceCopy } from "./DeviceCopy";
import { InternalWriting } from "./InternalWriting";
import { ModelCartridge } from "./ModelCartridge";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";
/** Complete contained computation illustration input. */
export type Props = GraphicProps & { input: Input };
/**
 * The complete illustrated computation stays inside one stable device
 * silhouette.
 */
export function PocketInference({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const phone = input.deviceShape === "phone";
  const laptop = input.deviceShape === "laptop";
  return (
    <g>
      <rect
        data-device-boundary={input.deviceShape}
        x={phone ? 174 : 142}
        y={90}
        width={phone ? 612 : 676}
        height={414}
        rx={phone ? 38 : 18}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      {laptop ? (
        <path
          d="M142 504 h676 l30 8 h-736 z"
          fill={STOCK.elevated}
          stroke={STOCK.line}
        />
      ) : (
        <path
          d={phone ? "M438 100 h84" : "M466 100 h28"}
          stroke={STOCK.muted}
          strokeWidth={3}
        />
      )}
      <g data-processing-content="inside-device">
        <ModelCartridge {...{ frame, input, accent }} />
        <InternalWriting {...{ frame, input, accent }} />
      </g>
      <DeviceCopy input={input} />
    </g>
  );
}
