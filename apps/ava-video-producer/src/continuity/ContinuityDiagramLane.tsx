import { useId } from "react";
import { AnchoredOverlay } from "../motion-components/AnchoredOverlay";
import { StockGraphic } from "../stock/StockGraphic/StockGraphic";
import { elevationToDropShadowFilter } from "../videoTheme/cssValueHelpers/cssValueHelpers";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme";
import { useContinuityAppearance } from "./ContinuityAppearanceContext";
import { ContinuityBoxOutline } from "./ContinuityBoxOutline";
import css from "./ContinuityOverlays.module.css";
import { sampleStockFrame } from "./continuityTimeline";
import { DiagramConnector } from "./DiagramConnector/DiagramConnector";
import type { ContinuityBeat } from "./continuitySchema";
import type { ReactNode } from "react";

type Content = Extract<ContinuityBeat["content"], { kind: "composite" }>;
type Props = { content: Content; frame: number; accent: string };
type DiagramProps = Omit<Props, "accent"> & {
  diagram: Content["diagrams"][number];
};
/**
 * Extracted explanatory artwork travels from the UI without cloning the UI
 * itself.
 */
function FloatingDiagram({ content, diagram, frame }: DiagramProps) {
  const clipId = `overlay-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const appearance = useContinuityAppearance();
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
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
          borderRadius: isSketched ? 0 : scales.corner(tokens.corner.label),
        }}
      >
        <ContinuityBoxOutline />
        {diagram.label}
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
export function ContinuityDiagramLane({
  content,
  frame,
  accent,
}: Props): ReactNode {
  return (
    <>
      <DiagramConnector content={content} frame={frame} accent={accent} />
      {content.diagrams.map((diagram) => {
        return (
          <FloatingDiagram
            key={diagram.at}
            content={content}
            diagram={diagram}
            frame={frame}
          />
        );
      })}
    </>
  );
}
