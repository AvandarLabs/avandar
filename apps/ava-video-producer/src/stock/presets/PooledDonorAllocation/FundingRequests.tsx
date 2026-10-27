import { FundingEnvelope } from "./FundingEnvelope";
import type { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  tokens: ReturnType<typeof getAllocationTokensFromInputAndFrame>;
  frame: number;
  accent: string;
};

/** Each envelope total reflects its actual arrived donor-attributed credits. */
export function FundingRequests({
  input,
  tokens,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.requests.map((request, index) => (
        <FundingEnvelope
          key={request.id}
          input={input}
          index={index}
          allocatedCredits={
            tokens.filter(
              (token) => token.arrived && token.requestId === request.id,
            ).length
          }
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
