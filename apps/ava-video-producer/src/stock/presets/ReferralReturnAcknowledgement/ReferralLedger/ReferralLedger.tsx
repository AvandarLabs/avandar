import { FitText } from "../../../primitives/FitText/FitText";
import { getReferralLedgerLayout } from "./getReferralLedgerLayout";
import type { Input } from "../ReferralReturnAcknowledgement.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Exclusive final states and attendance fractions retain separate meanings. */
export function ReferralLedger(props: Readonly<Props>): ReactNode {
  const presentation = getReferralLedgerLayout(props);

  return (
    <g>
      {presentation.rows.map(({ state, label, value }, index) => {
        return (
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
        );
      })}
    </g>
  );
}
