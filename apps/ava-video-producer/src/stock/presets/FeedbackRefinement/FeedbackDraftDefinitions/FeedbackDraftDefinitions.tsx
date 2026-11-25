import type { getFeedbackStateFromInputAndFrame } from "../getFeedbackStateFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  clipId: string;
  x: ReturnType<typeof getFeedbackStateFromInputAndFrame>["x"];
  revision: ReturnType<typeof getFeedbackStateFromInputAndFrame>["revision"];
};

/** Renders the definitions with authored geometry. */
export function FeedbackDraftDefinitions({
  clipId,
  x,
  revision,
}: Readonly<Props>): ReactNode {
  return (
    <defs>
      <clipPath id={`${clipId}-draft`}>
        <rect
          x={x + 16 + 268 * revision}
          y={230}
          width={268 * (1 - revision)}
          height={84}
        />
      </clipPath>
      <clipPath id={`${clipId}-revision`}>
        <rect x={x + 16} y={230} width={268 * revision} height={84} />
      </clipPath>
    </defs>
  );
}
