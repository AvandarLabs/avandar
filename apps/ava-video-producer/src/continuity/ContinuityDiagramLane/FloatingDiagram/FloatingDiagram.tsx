import { useId } from "react";
import { AnchoredOverlay } from "../../../motion-components/AnchoredOverlay";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { VideoCssValues } from "../../../videoTheme/VideoCssValues/VideoCssValues";
import {
  useVideoProps,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import { useContinuityAppearance } from "../../ContinuityAppearanceContext/useContinuityAppearance";
import { ContinuityBoxOutline } from "../../ContinuityBoxOutline/ContinuityBoxOutline";
import css from "./FloatingDiagram.module.css";
import { FloatingDiagramGraphic } from "./FloatingDiagramGraphic";
import type { ContinuityBeat } from "../../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Content = Extract<ContinuityBeat["content"], { kind: "composite" }>;
type Props = {
  content: Content;
  frame: number;
  diagram: Content["diagrams"][number];
};
/**
 * Extracted explanatory artwork travels from the UI without cloning the UI
 * itself.
 */
export function FloatingDiagram({
  content,
  diagram,
  frame,
}: Readonly<Props>): ReactNode {
  const clipId = `overlay-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const appearance = useContinuityAppearance();
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const floating = useVideoProps({
    name: "FloatingDiagram",
    props: {},
  });
  const isSketched = tokens.sketch.box.roughness > 0;
  const cue = diagram.overlay;
  if (frame < cue.at || frame >= cue.until) {
    return null;
  }
  return (
    <AnchoredOverlay
      frame={frame}
      source={content.source}
      cue={cue}
      motionBlur={appearance.motionBlur}
      className={css.floatingDiagram}
      style={{
        filter: VideoCssValues.makeDropShadowFilterFromElevation(
          floating.elevation,
        ),
      }}
    >
      <div
        className={css.floatingDiagramLabel}
        style={{
          borderColor: isSketched ? "transparent" : undefined,
          borderRadius: isSketched ? 0 : scales.corner(tokens.corner.label),
        }}
      >
        <ContinuityBoxOutline />
        {diagram.label}
      </div>
      <FloatingDiagramGraphic diagram={diagram} frame={frame} clipId={clipId} />
    </AnchoredOverlay>
  );
}
