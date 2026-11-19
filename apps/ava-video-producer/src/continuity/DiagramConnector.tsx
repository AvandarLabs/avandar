import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoProps } from "../videoTheme/useVideoTheme";
import css from "./ContinuityOverlays.module.css";
import { getConnectorProgress, getOverlayPose } from "./overlayMotion";
import type { ContinuityBeat } from "./continuitySchema";
import type { ReactNode } from "react";

type Props = Readonly<{
  content: Extract<ContinuityBeat["content"], { kind: "composite" }>;
  frame: number;
  accent: string;
}>;

/**
 * The spotlight around the source and the connector line to the active diagram.
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
          opacity,
        }}
      />
      {active && signal > 0 && (
        <svg
          className={css.connector}
          viewBox="0 0 1600 840"
          style={{ opacity: opacity * signal }}
        >
          <path
            d={`M ${source.x + source.width / 2} ${source.y + source.height / 2} Q ${active.overlay.target.x} ${source.y + source.height / 2} ${active.overlay.target.x + connector.bend} ${active.overlay.target.y + connector.drop}`}
            fill="none"
            stroke={accent}
            strokeWidth={connector.strokeWidth}
            strokeDasharray={connector.dash.join(" ")}
          />
        </svg>
      )}
    </>
  );
}
