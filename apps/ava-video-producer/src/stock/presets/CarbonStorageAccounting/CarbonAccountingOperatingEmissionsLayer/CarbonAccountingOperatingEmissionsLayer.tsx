import { OperatingEmissionRow } from "../OperatingEmissionRow/OperatingEmissionRow";
import type { Input } from "../CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
};

/** Renders the operating emissions layer with authored geometry. */
export function CarbonAccountingOperatingEmissionsLayer({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.operatingEmissions.map((row, index) => {
        return (
          <OperatingEmissionRow
            key={row.id}
            row={row}
            index={index}
            unit={input.copy.accountingUnit}
            frame={frame}
          />
        );
      })}
    </>
  );
}
