import { SketchedShape } from "../stock/primitives/SketchedShape";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme";
import css from "./ContinuityOverlays.module.css";
import { CONTINUITY_STAGE } from "./continuityStage";
import { getConnectorProgress, getOverlayPose } from "./overlayMotion";
import type { ContinuityBeat } from "./continuitySchema";
import type { ReactNode } from "react";

type Props = Readonly<{
  content: Extract<ContinuityBeat["content"], { kind: "composite" }>;
  frame: number;
  accent: string;
}>;

/**
 * The spotlight around the source and the connector line to the active
 * diagram. The spotlight dims everything around it with the theme's scrim;
 * the connector draws through the theme's shape sketch.
 */
export function DiagramConnector({ content, frame, accent }: Props): ReactNode {
  const active = content.diagrams.find((diagram) => {
    return frame >= diagram.overlay.at && frame < diagram.overlay.until;
  });
  const opacity = active?.overlay
    ? getOverlayPose(frame, active.overlay, content.source).opacity
    : 0;
  const { source } = content;
  const spotlight = useVideoProps("Spotlight", {});
  const connector = useVideoProps("Connector", {});
  const motion = useVideoMotion();
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const scrim = `0 0 0 ${spotlight.scrimSpread}px ${tokens.color.scrim}`;
  const signal = getConnectorProgress(frame, content.effect, content.signalAt, {
    duration: motion.scale(connector.drawIn),
    easing: motion.curve(connector.easing),
  });
  return (
    <>
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
      {active && signal > 0 && (
        <ConnectorLine
          source={source}
          target={active.overlay.target}
          opacity={opacity * signal}
          accent={accent}
        />
      )}
    </>
  );
}

type SourceRect = Props["content"]["source"];
type ConnectorTarget = Readonly<{ x: number; y: number }>;

/** A curve from the source's centre to the active diagram's target. */
function _buildConnectorPath(
  source: SourceRect,
  target: ConnectorTarget,
  bend: Readonly<{ bend: number; drop: number }>,
): string {
  return `M ${source.x + source.width / 2} ${source.y + source.height / 2} Q ${target.x} ${source.y + source.height / 2} ${target.x + bend.bend} ${target.y + bend.drop}`;
}

/** The sketched connector line, drawn across the whole stage. */
function ConnectorLine({
  source,
  target,
  opacity,
  accent,
}: Readonly<{
  source: SourceRect;
  target: ConnectorTarget;
  opacity: number;
  accent: string;
}>): ReactNode {
  const connector = useVideoProps("Connector", {});
  const tokens = useVideoTokens();
  return (
    <svg
      className={css.connector}
      viewBox={`0 0 ${CONTINUITY_STAGE.width} ${CONTINUITY_STAGE.height}`}
      style={{
        width: CONTINUITY_STAGE.width,
        height: CONTINUITY_STAGE.height,
        opacity,
      }}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: _buildConnectorPath(source, target, connector),
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={connector.strokeWidth}
        strokeDasharray={connector.dash.join(" ")}
      />
    </svg>
  );
}
