import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ContributionWeave.schema";
import type { ReactNode } from "react";

type Props = { copy: Input["copy"] };
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
/** Result copy remains independent from each contribution's band label. */
export function WeaveCaptions({ copy }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText {...TEXT} text={copy.result} y={535} fontSize={18} />
      <FitText
        {...TEXT}
        text={copy.example}
        y={580}
        fontSize={12}
        color={STOCK.muted}
      />
    </g>
  );
}
