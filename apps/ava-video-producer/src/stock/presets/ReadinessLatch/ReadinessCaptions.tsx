import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ReadinessLatch.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; allReady: boolean };
const TEXT = {
  x: 480,
  width: 850,
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
/** Shared action and state captions remain clear of the last dense ribbon. */
export function ReadinessCaptions({
  input,
  frame,
  allReady,
}: Readonly<Props>): ReactNode {
  const captions = [
    {
      text: allReady && frame >= 122 ? input.copy.released : input.copy.held,
      y: 572,
      fontSize: 16 as const,
    },
    {
      text: input.copy.example,
      y: 596,
      fontSize: 12 as const,
      color: STOCK.muted,
    },
  ];
  return (
    <g>
      {captions.map((caption) => (
        <FitText key={caption.y} {...TEXT} {...caption} />
      ))}
    </g>
  );
}
