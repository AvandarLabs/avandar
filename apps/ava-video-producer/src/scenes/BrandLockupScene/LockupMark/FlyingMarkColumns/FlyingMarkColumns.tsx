import { BrandLockupMotion } from "../../BrandLockupMotion/BrandLockupMotion";
import { MarkColumn } from "../MarkColumn";
import type { MarkColumnsProps } from "../LockupMarkShared/LockupMarkShared.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  exit: MarkColumnsProps["exit"];
  src: string;
  columns: number;
  rise: number[];
  flights: number[];
  mark: MarkColumnsProps["mark"];
  stage: { width: number; height: number };
};
/** Renders flying mark columns. */
export function FlyingMarkColumns({
  frame,
  exit,
  src,
  columns,
  rise,
  flights,
  mark,
  stage,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {rise.map((columnRise, index) => {
        const flight = flights[index];
        const rect = BrandLockupMotion.getFlightColumnRect({
          index,
          columns,
          mark,
          canvas: stage,
          progress: flight,
        });
        return (
          // prettier-ignore
          // These are fixed left-to-right slices of one mark. A
          // column slot retains its identity while its rise and
          // flight values animate.
          // react-doctor-disable-next-line no-array-index-as-key
          <MarkColumn key={`mark-column-${index}`} {...{ frame, exit, src, columns, columnRise, index }} rect={rect}/>
        );
      })}
    </>
  );
}
