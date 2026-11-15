import { AllocationCoordinator } from "./AllocationCoordinator";
import { DonorToken } from "./DonorToken";
import { DonorTray } from "./DonorTray";
import { FundingLabels } from "./FundingLabels";
import { FundingPool } from "./FundingPool";
import { FundingRequests } from "./FundingRequests";
import { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";
/** Complete authored funding input and shared frame controls. */
export type Props = GraphicProps & { input: Input };
/** Attributed credits pool, then move only into their configured requests. */
export function PooledDonorAllocation({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = getAllocationTokensFromInputAndFrame({ input, frame });
  return (
    <g>
      <FundingLabels input={input} />
      <FundingPool input={input} tokens={tokens} accent={accent} />
      <FundingRequests
        input={input}
        tokens={tokens}
        frame={frame}
        accent={accent}
      />
      {input.contributions.map((donor, donorIndex) => (
        <DonorTray
          key={donor.id}
          input={input}
          frame={frame}
          donorIndex={donorIndex}
        />
      ))}
      <AllocationCoordinator input={input} frame={frame} tokens={tokens} />
      {tokens.map((token) => (
        <DonorToken
          key={`${token.donorIndex}:${token.unitIndex}`}
          token={token}
          requestOrdinal={
            input.requests.findIndex(
              ({ id }) => id === token.donor.earmarkedRequestId,
            ) + 1
          }
          accent={accent}
        />
      ))}
    </g>
  );
}
