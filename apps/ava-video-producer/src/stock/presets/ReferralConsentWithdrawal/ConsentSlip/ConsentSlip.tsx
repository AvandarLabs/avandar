import { StockRect } from "../../../primitives/StockRect";
import { ConsentSlipCopy } from "./ConsentSlipCopy";
import { useConsentSlipPresentation } from "./useConsentSlipPresentation";
import type { Input } from "../ReferralConsentWithdrawal.schema.ts";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  permission: Input["permissions"][number];
  index: number;
};
/** A destination and purpose retain their scope on both faces of the slip. */
export function ConsentSlip(props: Readonly<Props>): ReactNode {
  const presentation = useConsentSlipPresentation(props);

  return (
    <g
      data-permission={props.permission.id}
      data-withdrawn={presentation.turn === 1}
    >
      <StockRect
        data-slip={props.permission.id}
        x={48 + (460 - presentation.width) / 2}
        y={presentation.y}
        width={presentation.width}
        height={96}
        rx={presentation.scales.corner(5)}
        fill={presentation.tokens.color.surface}
        stroke={
          presentation.turn > 0.5
            ? presentation.tokens.color.highlight
            : props.accent
        }
      />
      <ConsentSlipCopy {...presentation} />
    </g>
  );
}
