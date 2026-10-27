import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CustodyTransfer.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
const CAPTION_TEXT = {
  x: 480,
  width: 800,
  maxLines: 2,
  anchor: "middle" as const,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "x"
  | "width"
  | "maxLines"
  | "anchor"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
const HOLDER_TEXT = {
  y: 165,
  width: 300,
  fontSize: 18 as const,
  maxLines: 3,
  anchor: "middle" as const,
  breakLongWords: true,
  normalizeWhitespace: true,
} satisfies Pick<
  Parameters<typeof FitText>[0],
  | "y"
  | "width"
  | "fontSize"
  | "maxLines"
  | "anchor"
  | "breakLongWords"
  | "normalizeWhitespace"
>;
/** Supplied custody copy occupies fixed slots away from the supports. */
export function CustodyCaptions({ input, frame }: Readonly<Props>): ReactNode {
  const status =
    frame < 72
      ? input.copy.offered
      : input.outcome === "accepted"
        ? input.copy.accepted
        : input.copy.waiting;
  const holders = [
    { role: "sender", text: input.holders.sender, x: 240 },
    { role: "recipient", text: input.holders.recipient, x: 720 },
  ];

  const captions = [
    { text: status, y: 68, fontSize: 20 as const },
    { text: input.copy.responsible, y: 468, fontSize: 16 as const },
    {
      text: input.copy.example,
      y: 550,
      fontSize: 14 as const,
      color: STOCK.muted,
    },
  ];

  return (
    <g opacity={ramp(frame, 18, 12)}>
      {holders.map(({ role, text, x }) => (
        <FitText key={role} {...HOLDER_TEXT} text={text} x={x} />
      ))}
      {captions.map((caption) => (
        <FitText key={caption.y} {...CAPTION_TEXT} {...caption} />
      ))}
    </g>
  );
}
