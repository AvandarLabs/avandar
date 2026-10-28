import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode, ComponentProps } from "react";
type Props = {
  source: Input["sources"][number];
  selected: boolean;
  showLocators: boolean;
  height: number;
  accent: string;
};
/** Source text stays upright even when its background sheet fans out. */
export function SourcePassageCopy({
  source,
  selected,
  showLocators,
  height,
  accent,
}: Readonly<Props>): ReactNode {
  const slots: Array<ComponentProps<typeof FitText>> = [
    {
      text: source.title,
      x: 16,
      y: 26,
      width: 368,
      fontSize: 14,
      maxLines: 2,
      color: selected ? accent : STOCK.text,
    },
    ...(showLocators
      ? [
          {
            text: source.locator,
            x: 16,
            y: 64,
            width: 368,
            fontSize: 12 as const,
            maxLines: 1,
            color: STOCK.muted,
          },
        ]
      : []),
    {
      text: source.excerpt,
      x: 16,
      y: selected ? 92 : 82,
      width: 368,
      fontSize: 14,
      maxLines: 8,
    },
  ];
  return (
    <g data-copy-block={source.id} data-bottom={height - 8}>
      {slots.map((slot) => (
        <FitText key={slot.y} {...slot} breakLongWords normalizeWhitespace />
      ))}
    </g>
  );
}
