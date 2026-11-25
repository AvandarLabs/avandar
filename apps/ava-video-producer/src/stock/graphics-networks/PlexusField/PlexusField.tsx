import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { GRAPHIC_WIDTH } from "../../graphics-common/graphicCanvas.constants";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FieldConnections } from "./FieldConnections";
import { FieldParticles } from "./FieldParticles";
import { getParticlePointsFromFrame } from "./getParticlePointsFromFrame";
import { FOOTER_Y } from "./PlexusField.constants";
import type { Props } from "./PlexusField.types";
import type { ReactNode } from "react";

/** Renders the authored particle study for StockGraphic at a given frame. */
export function PlexusField(props: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "PlexusField",
    props: {},
  });
  const { color, layout, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const margin = layout.graphic.margin;
  const right = GRAPHIC_WIDTH - margin;
  const points = getParticlePointsFromFrame({
    input: props.input,
    frame: props.frame,
    drift: motion.drift.distance,
  });
  const drawing = {
    ...props,
    style,
    color,
    sketch,
    shapes,
    margin,
    right,
    points,
  };
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].ambientConnections,
        })}
      </Eyebrow>
      <FieldConnections {...drawing} />
      <FieldParticles {...drawing} />
      <Text role="footnote" x={right} y={FOOTER_Y} anchor="end">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["plexus-field"].deterministicField,
        })}
      </Text>
    </g>
  );
}
