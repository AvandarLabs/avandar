import { useId } from "react";
import { AnchoredOverlay } from "../motion-components/AnchoredOverlay";
import { StockGraphic } from "../stock/StockGraphic";
import { elevationToDropShadowFilter } from "../videoTheme/cssValues/cssValues";
import { useVideoMotion } from "../videoTheme/useVideoMotion/useVideoMotion";
import {
  useVideoProps,
  useVideoTokens,
} from "../videoTheme/useVideoTheme/useVideoTheme";
import { useContinuityAppearance } from "./ContinuityAppearanceContext";
import { ContinuityBoxOutline } from "./ContinuityBoxOutline";
import css from "./ContinuityOverlays.module.css";
import { sampleStockFrame } from "./continuityTimeline";
import { getOverlayPose, getConnectorProgress } from "./overlayMotion";
import { useContinuityCopy } from "./useContinuityCopy";
import type { ContinuityBeat } from "./continuitySchema";

type Content = Extract<ContinuityBeat["content"], { kind: "composite" }>;
type Props = { content: Content; frame: number; accent: string };
type DiagramProps = Omit<Props, "accent"> & {
  diagram: Content["diagrams"][number];
};

/** Extracted explanatory artwork travels from the UI without cloning the UI itself. */
function FloatingDiagram({ content, diagram, frame }: DiagramProps) {
  const clipId = `overlay-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const translate = useContinuityCopy();
  const appearance = useContinuityAppearance();
  const tokens = useVideoTokens();
  const floating = useVideoProps("FloatingDiagram", {});
  const isSketched = tokens.sketch.box.roughness > 0;
  const cue = diagram.overlay;
  if (frame < cue.at || frame >= cue.until) return null;
  const detail = diagram.detail;
  return (
    <AnchoredOverlay
      frame={frame}
      source={content.source}
      cue={cue}
      motionBlur={appearance.motionBlur}
      className={css.floating}
      style={{ filter: elevationToDropShadowFilter(floating.elevation) }}
    >
      <div
        className={css.label}
        style={{
          borderColor: isSketched ? "transparent" : undefined,
          borderRadius: isSketched ? 0 : undefined,
        }}
      >
        <ContinuityBoxOutline />
        {translate(diagram.label)}
      </div>
      <svg
        width="100%"
        height="100%"
        viewBox={
          detail
            ? `${detail.x} ${detail.y} ${detail.width} ${detail.height}`
            : "0 0 960 600"
        }
      >
        {detail && (
          <defs>
            <clipPath id={clipId}>
              <rect {...detail} />
            </clipPath>
          </defs>
        )}
        <g clipPath={detail ? `url(#${clipId})` : undefined}>
          <StockGraphic
            {...diagram.request}
            frame={sampleStockFrame((frame - cue.at) * 3 + 36)}
            width={960}
            height={600}
            transparent
          />
        </g>
      </svg>
    </AnchoredOverlay>
  );
}

/** Timed spotlight and anchored artwork share the full native product stage. */
export function ContinuityDiagramLane({ content, frame, accent }: Props) {
  const active = content.diagrams.find(
    (diagram) => frame >= diagram.overlay.at && frame < diagram.overlay.until,
  );
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
      {content.diagrams.map((diagram) => (
        <FloatingDiagram
          key={diagram.at}
          content={content}
          diagram={diagram}
          frame={frame}
        />
      ))}
    </>
  );
}
