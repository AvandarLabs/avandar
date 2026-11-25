import { Arrive } from "../../graphics-common/Arrive/Arrive";
import { Panel } from "../../graphics-common/Panel";
import { LEGACY_ACCENT_HEX } from "../../presets/legacy/legacyAccentHex";
import { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import { CardCompletion } from "./CardCompletion";
import { CardContent } from "./CardContent";
import { CardIcon } from "./CardIcon";
import {
  ARRIVE_AT,
  ARRIVE_STEP,
  DONE_AT,
  DONE_STEP,
} from "./StaggerCards.constants";
import type { StaggerCardsInput } from "../../presets/StaggerCards/StaggerCards.schema";
import type { Drawing } from "./StaggerCards.types";
import type { ReactNode } from "react";

type Props = Drawing & {
  card: Readonly<StaggerCardsInput["cards"][number]>;
  cardIndex: number;
};

/** Renders the stagger card layer for StaggerCards. */
export function StaggerCard(props: Readonly<Props>): ReactNode {
  const x = 64 + (props.cardIndex % 3) * 284;
  const y = 151 + Math.floor(props.cardIndex / 3) * 188;
  const cardColor = getContentColorFromValue({
    value: props.card.color === LEGACY_ACCENT_HEX ? "accent" : props.card.color,
    options: { tokens: props.tokens, accent: props.accent },
  });
  const done = props.motion.ramp(
    props.frame,
    DONE_AT + props.cardIndex * DONE_STEP,
    props.motion.chip,
  );
  const drawing = { ...props, x, y, cardColor, done };
  return (
    <Arrive
      key={props.card.label}
      frame={props.frame}
      at={ARRIVE_AT + props.cardIndex * ARRIVE_STEP}
      index={props.cardIndex}
    >
      <Panel x={x} y={y} width={264} height={166}>
        <CardIcon {...drawing} />
        <CardContent {...drawing} />
        <CardCompletion {...drawing} />
      </Panel>
    </Arrive>
  );
}
