import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { PendingDeliveryTicket } from "./PendingDeliveryTicket";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Both durable halves share one atomic frame boundary and correlation ID. */
export function OutboxDurableState({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const isCommitted = input.outcome === "commit" && frame >= 111;
  return (
    <g>
      <g
        data-local-durable={isCommitted}
        data-local-value={
          isCommitted ? input.change.after : input.change.before
        }
        data-correlation-id={input.change.id}
      >
        <LabelSlots
          labels={[
            [
              isCommitted ? input.copy.after : input.copy.before,
              100,
              250,
              320,
              12,
              3,
            ],
          ]}
        />
        <LiteralDataText
          x={100}
          y={330}
          value={isCommitted ? input.change.after : input.change.before}
        />
        {input.showIdentifier ? (
          <LiteralDataText x={100} y={350} value={input.change.id} />
        ) : undefined}
      </g>
      {isCommitted ? (
        <PendingDeliveryTicket input={input} accent={accent} />
      ) : undefined}
    </g>
  );
}
