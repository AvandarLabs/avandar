import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PrivateCaseConversation.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  person: Input["people"][number];
  waitingOpacity: number;
  accent: string;
};

type Props = {
  person: Readonly<ParentProps>["person"];
  waitingOpacity: Readonly<ParentProps>["waitingOpacity"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  isSupporter: boolean;
  travel: number;
  x: number;
  y: number;
  posture: Parameters<typeof PersonGlyph>[0]["posture"];
};

/** Renders the conversation person person in authored paint order. */
export function ConversationParticipant(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-person={options.person.id}
      data-space={
        options.isSupporter && options.travel === 1 ? "waiting" : "meeting"
      }
      opacity={options.isSupporter ? options.waitingOpacity : 1}
    >
      <PersonGlyph
        x={options.x}
        y={options.y}
        posture={options.posture}
        role={options.person.role === "worker" ? "worker" : "participant"}
        color={
          options.isSupporter ? options.tokens.color.highlight : options.accent
        }
      />
      <circle
        data-person-anchor={options.person.id}
        cx={options.x}
        cy={options.y}
        r={0}
        fill="none"
      />
      <LabelSlots
        labels={[
          [
            options.person.label,
            options.x - 105,
            options.isSupporter ? 483 : 218,
            210,
            14,
            3,
          ],
        ]}
      />
    </g>
  );
}
