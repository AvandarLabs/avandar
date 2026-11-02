import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";
/** Inputs for BatteryWindows. */
type Props = { input: Input };

/** Window labels retain chronological ownership in both physical layouts. */
export function BatteryWindows({ input }: Readonly<Props>): ReactNode {
  const vertical = input.orientation === "vertical";
  const labels = [
    { text: input.windows.chargeLabel, x: 32, y: 32, width: 420 },
    { text: input.windows.dispatchLabel, x: 508, y: 32, width: 420 },
    {
      text: input.windows.sourceLabel,
      x: vertical ? 32 : 32,
      y: vertical ? 172 : 193,
      width: vertical ? 260 : 250,
    },
    {
      text: input.windows.loadLabel,
      x: vertical ? 500 : 678,
      y: vertical ? 328 : 193,
      width: vertical ? 420 : 250,
    },
    {
      text: input.copy.capacity,
      x: vertical ? 500 : 310,
      y: vertical ? 185 : 153,
      width: vertical ? 420 : 340,
    },
    {
      text: String(input.battery.capacityKwh),
      x: vertical ? 500 : 310,
      y: vertical ? 230 : 192,
      width: vertical ? 420 : 340,
    },
    { text: input.copy.unit, x: 32, y: 424, width: 240 },
    { text: input.copy.disclaimer, x: 32, y: 588, width: 896 },
  ];
  return (
    <g>
      {labels.map(({ text, x, y, width }, index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={12}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
        />
      ))}
    </g>
  );
}
