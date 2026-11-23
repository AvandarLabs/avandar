import { Motion } from "../../../../motion";
import { QuarantinedRows } from "../QuarantinedRows";
import type { getQuarantineStateFromFrame } from "../getQuarantineStateFromFrame";
import type { Input } from "../InvalidTableQuarantine.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  arrival: ReturnType<typeof getQuarantineStateFromFrame>["arrival"];
  incoming: ReturnType<typeof getQuarantineStateFromFrame>["incoming"];
};
/** Slides replacement rows into place before they are committed. */
export function QuarantineIncomingSheet({
  input,
  arrival,
  incoming,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {incoming ? (
        <g data-replacement-sheet="true">
          <QuarantinedRows
            rows={input.reload.rows}
            x={Motion.mix({ t: arrival, from: 170, to: 110 })}
            isReload
          />
        </g>
      ) : null}
    </>
  );
}
