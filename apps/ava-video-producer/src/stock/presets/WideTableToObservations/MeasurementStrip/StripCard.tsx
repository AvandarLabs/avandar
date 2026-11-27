import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getMeasurementStripFromFrame } from "../getMeasurementStripFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getMeasurementStripFromFrame>;
  cellKey: string;
  accent: string;
};

/** The strip's card, keyed to its source cell and resulting observation. */
export function StripCard({
  scene,
  cellKey,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <StockRect
      data-transfer-measurement={cellKey}
      data-observation={
        !scene.isOmitted ? `${scene.subject.id}:${scene.measure.id}` : undefined
      }
      data-missing={scene.value === undefined ? "true" : undefined}
      data-subject-id={scene.subject.id}
      data-measure-id={scene.measure.id}
      data-source-value={scene.value ?? "missing"}
      x={scene.x}
      y={scene.y - 22}
      width={scene.width}
      height={76}
      fill={tokens.color.surface}
      fillOpacity={atomic.opacity["80"]}
      stroke={accent}
    />
  );
}
