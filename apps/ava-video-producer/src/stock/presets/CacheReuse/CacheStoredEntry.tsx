import { FitText } from "../../primitives/FitText/FitText";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CacheReuse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; opacity: number; accent: string };
/**
 * The persistent keyed shelf entry remains after the first response returns.
 */
export function CacheStoredEntry({
  input,
  opacity,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-stored-entry={input.request.key}
      data-stored-value={input.result.value}
      opacity={opacity}
    >
      <path d="M430 338 H890" stroke={accent} strokeWidth={3} />
      <LiteralDataText
        value={input.request.key}
        x={430}
        y={245}
        color={accent}
      />
      <FitText
        text={input.result.label}
        x={430}
        y={275}
        width={450}
        fontSize={16}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
      {input.showStoredValue ? (
        <LiteralDataText
          value={input.result.value}
          x={430}
          y={325}
          color={STOCK.text}
        />
      ) : undefined}
    </g>
  );
}
