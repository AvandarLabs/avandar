import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";
type Props = { input: Input; opacity: number };
/** The requester retains the exact delivered result during the next lookup. */
export function CacheResponse({ input, opacity }: Readonly<Props>): ReactNode {
  return (
    <g
      data-response-key={input.request.key}
      data-response-value={input.result.value}
      opacity={opacity}
    >
      <path d="M40 520 H920" stroke={STOCK.line} />
      <FitText
        text={input.result.label}
        x={40}
        y={545}
        width={400}
        fontSize={16}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      <LiteralDataText value={input.result.value} x={500} y={560} />
    </g>
  );
}
