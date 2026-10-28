import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./PortableWorkTransfer.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; folioX: number };
/**
 * State captions identify their actual source, moving folio and destination.
 */
export function TransferCaptions({
  input,
  frame,
  folioX,
}: Readonly<Props>): ReactNode {
  const outcome =
    frame >= 130
      ? input.transferState === "accepted"
        ? input.labels.received
        : input.labels.pending
      : input.labels.portable;
  return (
    <LabelSlots
      labels={[
        [input.tools.source, 48, 40, 280, 20, 3],
        [input.tools.destination, 640, 40, 280, 20, 3],
        [input.labels.originals, 48, 124, 270, 16, 4],
        [
          frame < 93 ? input.labels.copies : outcome,
          frame < 93
            ? folioX
            : frame >= 130 && input.transferState === "accepted"
              ? 350
              : 640,
          124,
          264,
          16,
          4,
        ],
        [input.labels.example, 48, 580, 864, 14, 1],
        [input.ownerLabel, 335, 58, 280, 16, 3],
      ]}
    />
  );
}
