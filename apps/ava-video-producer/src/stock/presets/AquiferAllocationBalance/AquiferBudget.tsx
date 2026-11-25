import { AquiferBudgetTerms } from "./AquiferBudgetTerms/AquiferBudgetTerms";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";

type AquiferBudgetTerm = {
  owner: string;
  number: number | undefined;
  label: string;
  value: number;
};

/** Inputs for AquiferBudget. */
type Props = { input: Input };

/** Retains unallocated request terms only when the authored option is shown. */
function _createUnallocatedBudgetTerms({
  input,
  copy,
  flows,
}: Readonly<CreateUnallocatedBudgetTermsOptions>): AquiferBudgetTerm[] {
  return input.showUnallocatedRequest
    ? [
        {
          owner: "unallocated",
          number: 4,
          label: copy.unallocated,
          value: flows.requestedWithdrawalM3 - flows.approvedWithdrawalM3,
        },
      ]
    : [];
}

/** Builds the ordered storage equation and separate request quantities. */
function _createAquiferBudgetTerms({
  input,
  copy,
  aquifer,
  flows,
  final,
}: Readonly<CreateAquiferBudgetTermsOptions>): AquiferBudgetTerm[] {
  return [
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
    ..._createUnallocatedBudgetTerms({ input, copy, flows }),
  ];
}

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
  const terms = _createAquiferBudgetTerms({
    input,
    copy,
    aquifer,
    flows,
    final,
  });
  return (
    <g>
      <AquiferBudgetTerms terms={terms} />
    </g>
  );
}

type CreateUnallocatedBudgetTermsOptions = {
  input: Input;
  copy: Input["copy"];
  flows: Input["flows"];
};

type CreateAquiferBudgetTermsOptions = {
  input: Input;
  copy: Input["copy"];
  aquifer: Input["aquifer"];
  flows: Input["flows"];
  final: number;
};
