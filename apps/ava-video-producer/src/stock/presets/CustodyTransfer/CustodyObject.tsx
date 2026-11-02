import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { CustodyObjectShape } from "./CustodyObjectShape";
import type { Input } from "./CustodyTransfer.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const DETAILS = {
  x: 534,
  width: 310,
  fontSize: 14 as const,
  maxLines: 2,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "x"
  | "width"
  | "fontSize"
  | "maxLines"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
/** One object keeps a fixed adjoining label area in all three metaphors. */
export function CustodyObject({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const label = {
    text: input.object.label,
    x: 480,
    y: 108,
    width: 700,
    fontSize: 18 as const,
    maxLines: 2,
    anchor: "middle" as const,
    breakLongWords: true,
    normalizeWhitespace: true,
  };

  return (
    <g data-object-shape={input.objectShape} opacity={ramp(frame, 14, 12)}>
      <CustodyObjectShape shape={input.objectShape} accent={accent} />
      {input.showLabels ? (
        <g>
          <FitText {...label} />
          {input.object.details.map((text, index) => (
            <FitText
              key={index}
              {...DETAILS}
              text={text}
              y={260 + index * 35}
            />
          ))}
        </g>
      ) : undefined}
    </g>
  );
}
