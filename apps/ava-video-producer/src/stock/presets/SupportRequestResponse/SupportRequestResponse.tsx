import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SupportParticipants } from "./SupportParticipants";
import { SupportWords } from "./SupportWords";
import { SupportWorktable } from "./SupportWorktable";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * An authored reply changes participation without transferring task ownership.
 */
export function SupportRequestResponse({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      <SupportWords input={input} frame={frame} />
      <SupportWorktable input={input} frame={frame} accent={accent} />
      <SupportParticipants input={input} frame={frame} accent={accent} />
      <g opacity={motion.reveal(frame, 12)}>
        <LabelSlots
          labels={[
            [input.people.requester, 60, 448, 220, 20, 3],
            [input.labels.ownedBy, 310, 448, 260, 14, 3],
            [input.labels.open, 300, 518, 350, 16, 3],
          ]}
        />
      </g>
      <g opacity={motion.ramp(frame, 131, motion.whip)}>
        {input.response.state === "joins" ? (
          <LabelSlots labels={[[input.labels.shared, 650, 448, 250, 14, 3]]} />
        ) : undefined}
      </g>
      <LabelSlots labels={[[input.labels.example, 60, 570, 840, 14, 2]]} />
    </g>
  );
}
