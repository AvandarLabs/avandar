import { StockRect } from "../../../primitives/StockRect";
import { AquiferOwnershipKey } from "../AquiferOwnershipKey";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../AquiferAllocationBalance.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  flows: Input["flows"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the unallocated with authored geometry. */
export function AquiferCutawayUnallocated({
  input,
  flows,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.showUnallocatedRequest ? (
        <>
          <StockRect
            data-unallocated="true"
            data-quantity={
              flows.requestedWithdrawalM3 - flows.approvedWithdrawalM3
            }
            x={35}
            y={401}
            width={
              204 *
              (flows.requestedWithdrawalM3
                ? (flows.requestedWithdrawalM3 - flows.approvedWithdrawalM3) /
                  flows.requestedWithdrawalM3
                : 0)
            }
            height={9}
            fill="none"
            stroke={tokens.color.highlight}
          />
          <g data-flow-ownership="unallocated">
            <AquiferOwnershipKey number={4} x={18} y={405.5} />
          </g>
        </>
      ) : undefined}
    </>
  );
}
