import { FitText } from "../../../primitives/FitText/FitText";
import { AquiferOwnershipKey } from "../AquiferOwnershipKey";
import type { Input } from "../AquiferAllocationBalance.schema";
import type { ReactNode } from "react";

type Props = {
  owner: Array<
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
  >[number]["owner"];
  number: Array<
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
  >[number]["number"];
  index: number;
  label: Array<
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
  >[number]["label"];
  value: Array<
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
  >[number]["value"];
};

/** Renders the budget term with authored geometry. */
export function AquiferBudgetTerm({
  owner,
  number,
  index,
  label,
  value,
}: Readonly<Props>): ReactNode {
  return (
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
  );
}
