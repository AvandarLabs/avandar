import { ParcelCopy } from "./ParcelCopy";
import { ParcelGeometry } from "./ParcelGeometry";
import { ParcelLedger } from "./ParcelLedger";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";
/** Inputs for ParcelSetbackInset. */
type Props = GraphicProps & { input: Input };

/** Equal inward clearance leaves a measured envelope for the full footprint. */
export function ParcelSetbackInset({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ParcelGeometry input={input} frame={frame} accent={accent} id={id} />
      <ParcelLedger input={input} />
      <ParcelCopy input={input} />
    </g>
  );
}
