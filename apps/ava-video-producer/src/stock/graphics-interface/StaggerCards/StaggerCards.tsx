import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CardsFooter } from "./CardsFooter";
import { StaggerCard } from "./StaggerCard";
import { HEADING_SIZE } from "./StaggerCards.constants";
import type { Props } from "./StaggerCards.types";
import type { ReactNode } from "react";

/** Renders the authored card study for StockGraphic at a given frame. */
export function StaggerCards(props: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { stroke, alpha, sketch } = tokens;
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const drawing = {
    ...props,
    atomic,
    tokens,
    alpha,
    sketch,
    shapes,
    motion,
    hairline: shapes.stroke(stroke.hairline),
  };
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["stagger-cards"].staggeredAssembly,
        })}
      </Eyebrow>
      <Text role="title" x={64} y={111} size={HEADING_SIZE}>
        {props.input.heading}
      </Text>
      {props.input.cards.map((card, cardIndex) => {
        return (
          <StaggerCard key={card.label} {...{ ...drawing, card, cardIndex }} />
        );
      })}
      <CardsFooter />
    </g>
  );
}
