import { FitText } from "../../../primitives/FitText/FitText";
import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = {
  record: Input["records"][number];
  excluded: boolean;
  opacity: number;
  x: number;
  y: number;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  rowIndex: number;
  width: number;
};

/** Renders the source record with authored geometry. */
export function SubscriptionSourceValue({
  record,
  excluded,
  opacity,
  x,
  y,
  accent,
  tokens,
  rowIndex,
  width,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-source-record={record.id}
      data-excluded-row={excluded ? record.id : undefined}
      opacity={opacity}
    >
      <text
        x={x + 9}
        y={y}
        fill={accent}
        fontSize={tokens.text.graphic.data.fontSize}
        fontWeight={tokens.text.graphic.data.fontWeight}
      >
        {rowIndex + 1}
      </text>
      <LiteralDataText value={record.category} x={x + 30} y={y} />
      <FitText
        text={String(record.value)}
        x={x + 30}
        y={y + 18}
        width={width - 42}
        fontSize={12}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
      />
    </g>
  );
}
