import { AquiferBudgetTerm } from "../AquiferBudgetTerm/AquiferBudgetTerm";
import type { Input } from "../AquiferAllocationBalance.schema";
import type { ReactNode } from "react";

type Props = {
  terms: Array<
    | {
        owner: string;
        number: undefined;
        label: Input["copy"]["initial"];
        value: Input["aquifer"]["initialM3"];
      }
    | {
        owner: string;
        number: number;
        label: Input["copy"]["recharge"];
        value: Input["flows"]["rechargeM3"];
      }
    | {
        owner: string;
        number: number;
        label: Input["copy"]["naturalOutflow"];
        value: Input["flows"]["naturalOutflowM3"];
      }
    | {
        owner: string;
        number: number;
        label: Input["copy"]["approved"];
        value: Input["flows"]["approvedWithdrawalM3"];
      }
    | {
        owner: string;
        number: undefined;
        label: Input["copy"]["final"];
        value: number;
      }
    | {
        owner: string;
        number: undefined;
        label: Input["copy"]["requested"];
        value: Input["flows"]["requestedWithdrawalM3"];
      }
    | (
        | Array<{
            owner: string;
            number: number;
            label: Input["copy"]["unallocated"];
            value: number;
          }>
        | never[]
      )[number]
  >;
};

/** Renders the terms layer with authored geometry. */
export function AquiferBudgetTerms({ terms }: Readonly<Props>): ReactNode {
  return (
    <>
      {terms.map(({ owner, number, label, value }, index) => {
        return (
          <AquiferBudgetTerm
            key={owner}
            {...{ owner, number, index, label, value }}
          />
        );
      })}
    </>
  );
}
