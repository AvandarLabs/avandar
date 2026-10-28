import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { transfer: number };
/** Workshop Bench for the authored scene. */
export function WorkshopBench({ transfer }: Readonly<Props>): ReactNode {
  return (
    <g
      data-workshop-bench="true"
      transform={`translate(${mix(transfer, 640, 570)} 388)`}
      opacity={transfer}
    >
      <path
        d="M0 0 H260 M20 0 V105 M240 0 V105 M20 65 H240"
        stroke={STOCK.line}
        strokeWidth={7}
      />
      <path
        d="M235 -16 V16 H218"
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={6}
      />
    </g>
  );
}
