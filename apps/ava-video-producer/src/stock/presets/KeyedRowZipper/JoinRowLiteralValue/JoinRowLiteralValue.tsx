import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import type { getJoinRowLayoutFromInputAndFrame } from "../getJoinRowLayoutFromInputAndFrame";
import type { Input } from "../KeyedRowZipper.schema";
import type { ReactNode } from "react";

type Props = {
  row: Input["leftRows"][number];
  x: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["x"];
  y: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["y"];
  isContext: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["isContext"];
};

/** Renders the outline row with authored geometry. */
export function JoinRowLiteralValue({
  row,
  x,
  y,
  isContext,
}: Readonly<Props>): ReactNode {
  return (
    <LiteralDataText
      value={row.value}
      x={x + 12}
      y={y + (isContext ? 33 : 43)}
    />
  );
}
