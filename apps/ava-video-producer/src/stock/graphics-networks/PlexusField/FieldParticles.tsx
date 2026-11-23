import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Particle } from "../../graphics-common/Particle";
import { Rule } from "../../graphics-common/Rule";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { RULE_Y, FOOTER_Y, TWINKLE_PHASE_STEP } from "./PlexusField.constants";
import type { Drawing } from "./PlexusField.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the field particles layer for PlexusField. */
export function FieldParticles(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.points.map((point, particleIndex) => {
        return (
          <Particle
            key={particleIndex}
            x={point.x}
            y={point.y}
            frame={props.frame}
            phase={particleIndex * TWINKLE_PHASE_STEP}
            color={
              particleIndex % 4 === 0 ? props.color.accentAlt : props.accent
            }
            haloColor={props.accent}
            isLarge={particleIndex % 7 === 0}
          />
        );
      })}
      <Rule x1={props.margin} x2={props.right} y={RULE_Y} />
      <Text role="footnote" x={props.margin} y={FOOTER_Y}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].particleCount,
          values: { count: props.input.particleCount },
        })}
      </Text>
    </>
  );
}
