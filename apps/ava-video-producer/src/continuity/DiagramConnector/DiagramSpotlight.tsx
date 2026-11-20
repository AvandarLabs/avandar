import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoProps, useVideoTokens } from "../../videoTheme/useVideoTheme";
import css from "../ContinuityOverlays.module.css";
import type { Props as ConnectorProps } from "./DiagramConnectorShared/DiagramConnectorShared.types";
import type { ReactNode } from "react";

type Props = { source: ConnectorProps["content"]["source"]; opacity: number };
/** Dims the stage around the connector's source rectangle. */
export function DiagramSpotlight({
  source,
  opacity,
}: Readonly<Props>): ReactNode {
  const spotlight = useVideoProps("Spotlight", {});
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const scrim = `0 0 0 ${spotlight.scrimSpread}px ${tokens.color.scrim}`;
  return (
    <div
      className={css.spotlight}
      style={{
        left: source.x - spotlight.padding,
        top: source.y - spotlight.padding,
        width: source.width + spotlight.padding * 2,
        height: source.height + spotlight.padding * 2,
        borderRadius: scales.corner(tokens.corner.spotlight),
        boxShadow: scrim,
        opacity,
      }}
    />
  );
}
