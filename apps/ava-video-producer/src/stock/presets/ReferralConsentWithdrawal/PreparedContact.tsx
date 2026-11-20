import { mix } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ContactCard } from "./ContactCard";
import { ContactHandling } from "./ContactHandling";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";

type GetPreparationOptions = {
  frame: number;
  index: number;
  order: number;
  motion: VideoMotion;
};
type Props = {
  frame: number;
  labels: Input["labels"];
  accent: string;
  contact: Input["plannedContacts"][number];
  index: number;
  order: number;
  permissionTurn: number;
};
/** The worker stops below the idle phone and deposits a preparation. */
export function PreparedContact({
  frame,
  labels,
  accent,
  contact,
  index,
  order,
  permissionTurn,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { progress, x, y, isHandling } = _getPreparation({
    frame,
    index,
    order,
    motion,
  });
  return (
    <g>
      <ContactHandling
        contactId={contact.id}
        index={index}
        x={x}
        y={y}
        isAffected={order >= 0}
        isHandling={isHandling}
      />
      <ContactCard
        contact={contact}
        x={x}
        y={y}
        isHeld={progress === 1}
        status={
          permissionTurn > 0.5
            ? progress === 1
              ? labels.held
              : labels.withdrawn
            : labels.permitted
        }
        color={order >= 0 ? tokens.color.highlight : accent}
      />
    </g>
  );
}
/**
 * A contact affected by the withdrawal lifts and moves to the held column
 * on its turn; the worker handles it while it moves.
 */
function _getPreparation({
  frame,
  index,
  order,
  motion,
}: Readonly<GetPreparationOptions>) {
  const progress =
    order < 0
      ? 0
      : motion.ramp(
          frame,
          60 + order * motion.scaleStagger(16),
          motion.scale(16),
          motion.entrance.easing,
        );
  return {
    progress,
    x: mix(progress, 520, 560),
    y: 194 + index * 102 - 20 * Math.sin(progress * Math.PI),
    isHandling:
      order >= 0 &&
      frame >= 60 + order * motion.scaleStagger(16) &&
      frame <= 76 + order * motion.scaleStagger(16),
  };
}
