import { FitText } from "../../primitives/FitText/FitText";
import { AquiferOwnershipKey } from "./AquiferOwnershipKey";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";
/** Inputs for AquiferBudget. */
type Props = { input: Input };

/**
 * Request and unallocated demand are retained separately from the storage
 * equation.
 */
export function AquiferBudget({ input }: Readonly<Props>): ReactNode {
  const { copy, aquifer, flows } = input;
  const final =
    aquifer.initialM3 +
    flows.rechargeM3 -
    flows.naturalOutflowM3 -
    flows.approvedWithdrawalM3;
  const terms = [
    {
      owner: "initial",
      number: undefined,
      label: copy.initial,
      value: aquifer.initialM3,
    },
    {
      owner: "recharge",
      number: 1,
      label: copy.recharge,
      value: flows.rechargeM3,
    },
    {
      owner: "natural",
      number: 3,
      label: copy.naturalOutflow,
      value: flows.naturalOutflowM3,
    },
    {
      owner: "approved",
      number: 2,
      label: copy.approved,
      value: flows.approvedWithdrawalM3,
    },
    { owner: "final", number: undefined, label: copy.final, value: final },
    {
      owner: "requested",
      number: undefined,
      label: copy.requested,
      value: flows.requestedWithdrawalM3,
    },
    ...(input.showUnallocatedRequest
      ? [
          {
            owner: "unallocated",
            number: 4,
            label: copy.unallocated,
            value: flows.requestedWithdrawalM3 - flows.approvedWithdrawalM3,
          },
        ]
      : []),
  ];
  return (
    <g>
      {terms.map(({ owner, number, label, value }, index) => (
        <g key={owner} data-budget-term={owner}>
          {number ? (
            <AquiferOwnershipKey
              number={number}
              x={42 + (index % 4) * 232}
              y={484 + Math.floor(index / 4) * 75}
            />
          ) : undefined}
          <FitText
            text={label}
            x={32 + (index % 4) * 232}
            y={435 + Math.floor(index / 4) * 75}
            width={210}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
          <FitText
            text={String(value)}
            x={(number ? 64 : 32) + (index % 4) * 232}
            y={488 + Math.floor(index / 4) * 75}
            width={number ? 178 : 210}
            fontSize={12}
            maxLines={1}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ))}
    </g>
  );
}
