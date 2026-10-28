import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./ReferralReturnAcknowledgement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Exclusive final states and attendance fractions retain separate meanings. */
export function ReferralLedger({ input, frame }: Readonly<Props>): ReactNode {
  const numAttended = input.referrals.filter(
    (referral, index) => referral.attended && frame >= 77 + index * 2,
  ).length;
  const numReturned = input.referrals.filter(
    (referral, index) => referral.acknowledged && frame >= 105 + index * 2,
  ).length;
  const rows = [
    {
      state: "waiting",
      label: input.copy.waiting,
      value: input.referrals.length - numAttended,
    },
    {
      state: "attendedOpen",
      label: input.copy.attendedOpen,
      value: numAttended - numReturned,
    },
    { state: "closed", label: input.copy.closed, value: numReturned },
    {
      state: "referrals",
      label: input.copy.referrals,
      value: input.referrals.length,
    },
    {
      state: "attendance",
      label: input.copy.attendance,
      value: `${numAttended} / ${input.referrals.length}`,
    },
    {
      state: "returned",
      label: input.copy.returned,
      value: `${numReturned} / ${input.referrals.length}`,
    },
  ];
  return (
    <g>
      {rows.map(({ state, label, value }, index) => (
        <g key={state} data-referral-category={state} data-quantity={value}>
          <FitText
            text={String(value)}
            x={45 + index * 150}
            y={454}
            width={135}
            fontSize={18}
            maxLines={1}
            normalizeWhitespace
          />
          <FitText
            text={label}
            x={45 + index * 150}
            y={478}
            width={135}
            fontSize={12}
            maxLines={7}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ))}
    </g>
  );
}
