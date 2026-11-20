import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../videoTheme/useVideoTheme";
import {
  getConnectorProgress,
  getOverlayPose,
} from "../overlayMotion/overlayMotion";
import { ConnectorLine } from "./ConnectorLine";
import { type Props } from "./DiagramConnectorShared/DiagramConnectorShared.types";
import { DiagramSpotlight } from "./DiagramSpotlight";
import type { ReactNode } from "react";
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
    ? getOverlayPose({ frame, cue: active.overlay, source: content.source })
        .opacity
    : 0;
  const { source } = content;
  const connector = useVideoProps("Connector", {});
  const motion = useVideoMotion();
  const signal = getConnectorProgress({
    frame,
    effect: content.effect,
    signalAt: content.signalAt,
    timing: {
      duration: motion.scale(connector.drawIn),
      easing: motion.curve(connector.easing),
    },
  });
  return (
    <>
      <DiagramSpotlight source={source} opacity={opacity} />
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
