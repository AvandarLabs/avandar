import { useId } from "react";
import { AnchoredOverlay } from "../motion-components/AnchoredOverlay";
import { StockGraphic } from "../stock/StockGraphic";
import {
  useContinuityAppearance,
  getEditorialInk,
} from "./ContinuityAppearanceContext";
import { ContinuityBoxOutline } from "./ContinuityBoxOutline";
import css from "./ContinuityOverlays.module.css";
import { sampleStockFrame } from "./continuityTimeline";
import { getOverlayPose, getConnectorProgress } from "./overlayMotion";
import { useContinuityCopy } from "./useContinuityCopy";
import type { ContinuityBeat } from "./continuitySchema";

type Content = Extract<ContinuityBeat["content"], { kind: "composite" }>;
type Props = { content: Content; frame: number; accent: string };
type DiagramProps = Props & { diagram: Content["diagrams"][number] };

/** Extracted explanatory artwork travels from the UI without cloning the UI itself. */
function FloatingDiagram({ content, diagram, frame, accent }: DiagramProps) {
  const clipId = `overlay-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const translate = useContinuityCopy();
  const appearance = useContinuityAppearance();
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
      style={{
        color: getEditorialInk(appearance.background),
        filter: "drop-shadow(0 16px 22px #06101455)",
      }}
    >
      <div
        className={css.label}
        style={{
          background: appearance.background,
          borderColor: appearance.boxRoughness > 0 ? "transparent" : undefined,
          borderRadius: appearance.boxRoughness > 0 ? 0 : undefined,
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
            accent={accent}
            boxRoughness={appearance.boxRoughness}
            transparent
          />
        </g>
      </svg>
    </AnchoredOverlay>
  );
}

/** Timed spotlight and anchored artwork share the full native product stage. */
export function ContinuityDiagramLane({ content, frame, accent }: Props) {
  const appearance = useContinuityAppearance();
  const active = content.diagrams.find(
    (diagram) => frame >= diagram.overlay.at && frame < diagram.overlay.until,
  );
  const opacity = active?.overlay
    ? getOverlayPose(frame, active.overlay, content.source).opacity
    : 0;
  const { source } = content;
  const signal = getConnectorProgress(frame, content.effect, content.signalAt);
  return (
    <>
      <div
        className={css.spotlight}
        style={{
          left: source.x - 10,
          top: source.y - 10,
          width: source.width + 20,
          height: source.height + 20,
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
            d={`M ${source.x + source.width / 2} ${source.y + source.height / 2} Q ${active.overlay.target.x} ${source.y + source.height / 2} ${active.overlay.target.x + 30} ${active.overlay.target.y + 60}`}
            fill="none"
            stroke={accent}
            strokeWidth={2}
            strokeDasharray="5 9"
          />
        </svg>
      )}
      {content.diagrams.map((diagram) => (
        <FloatingDiagram
          key={diagram.at}
          content={content}
          diagram={diagram}
          frame={frame}
          accent={appearance.accent}
        />
      ))}
    </>
  );
}
