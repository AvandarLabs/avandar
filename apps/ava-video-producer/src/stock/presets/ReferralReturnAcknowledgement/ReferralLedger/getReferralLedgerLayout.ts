import type { Input } from "../ReferralReturnAcknowledgement.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  rows: Array<
    | { state: string; label: string; value: number }
    | { state: string; label: string; value: string }
  >;
};

/**
 * Returns waiting, attended, and acknowledged referral ledger rows for
 * `ReferralLedger`.
 */
export function getReferralLedgerLayout({
  input,
  frame,
}: Readonly<Options>): Presentation {
  const numAttended = input.referrals.filter((referral, index) => {
    return referral.attended && frame >= 77 + index * 2;
  }).length;
  const numReturned = input.referrals.filter((referral, index) => {
    return referral.acknowledged && frame >= 105 + index * 2;
  }).length;
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
  return { rows };
}
