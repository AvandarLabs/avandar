import { BarComparisonMotion } from "../../../../../../scenes/BarComparisonScene/BarComparisonMotion/BarComparisonMotion";
import { BarRow } from "../../BarRow/BarRow";
import type { ReactNode } from "react";

/** Fictional demonstration rows for the bar build. */
const ROWS = [
  { id: "north", value: 42 },
  { id: "harbor", value: 30 },
  { id: "valley", value: 18 },
  { id: "ridge", value: 9 },
];
type Props = {
  frame: number;
  beats: ReturnType<typeof BarComparisonMotion.getBarComparisonBeats>;
};
/** Draws the fictional comparison rows on their computed reveal beats. */
export function BarBeatRows({ frame, beats }: Readonly<Props>): ReactNode {
  const fractions = BarComparisonMotion.getBarFractions(ROWS);
  const labels = ["North", "Harbor", "Valley", "Ridge"];
  return ROWS.map((row, index) => {
    return (
      <BarRow
        key={row.id}
        frame={frame}
        beats={beats}
        index={index}
        label={labels[index]}
        value={row.value}
        fraction={fractions[index]}
      />
    );
  });
}
