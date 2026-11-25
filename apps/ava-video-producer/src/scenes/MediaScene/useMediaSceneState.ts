import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { assertMediaScene } from "../assertMediaScene";
import { TextLayout } from "../layout/TextLayout";
import type { Rect } from "../layout/SceneGeometry";
import type { MediaSceneProps as Props } from "../scenes.types";
import type { MediaFigure } from "./MediaFigure/MediaFigure";
import type { MediaHeader } from "./MediaHeader/MediaHeader";
import type { CSSProperties, ComponentProps } from "react";

type MediaInput = Props &
  Required<
    Pick<
      Props,
      | "width"
      | "height"
      | "trimBefore"
      | "fit"
      | "objectPosition"
      | "crop"
      | "callouts"
    >
  >;
type MediaState = ComponentProps<typeof MediaHeader> &
  ComponentProps<typeof MediaFigure>;
/** Preserves media validation and the four original theme hook reads. */
export function useMediaSceneState({
  input,
}: Readonly<{ input: MediaInput }>): MediaState {
  assertMediaScene(input);

  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  const cardTitle = tokens.text.stage.cardTitle;
  const caption = tokens.text.stage.caption;
  const captionLineHeight = caption.lineHeight ?? 1;
  const geometry = _getMediaGeometryFromScene(input);
  return {
    ...input,
    title: input.title,
    tokens,
    spacing,
    motion,
    scales,
    scene,
    cardTitle,
    caption,
    captionLineHeight,
    ...geometry,
  };
}
type MediaGeometry = {
  bounds: Rect;
  heading: ReturnType<typeof TextLayout.fitTextLines> | undefined;
  subtitle: ReturnType<typeof TextLayout.fitTextLines> | undefined;
  mediaStyle: CSSProperties;
};
/** Fits header copy and the fixed media crop into the authored canvas. */
function _getMediaGeometryFromScene(
  input: Readonly<MediaInput>,
): MediaGeometry {
  const top = input.title || input.kicker ? 92 : 24;
  const bounds = {
    x: 24,
    y: top,
    width: input.width - 48,
    height: input.height - top - 24,
  };
  const heading = input.title
    ? TextLayout.fitTextLines({
        lines: [input.title],
        width: input.width * 0.57,
        height: 54,
        requested: 36,
        minimum: 28,
      })
    : undefined;
  const subtitle = input.kicker
    ? TextLayout.fitTextLines({
        lines: [input.kicker],
        width: input.width * 0.38,
        height: 54,
        requested: 24,
        minimum: 18,
      })
    : undefined;
  const mediaStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: input.fit,
    objectPosition: `${input.objectPosition.x * 100}% ${input.objectPosition.y * 100}%`,
  };
  return { bounds, heading, subtitle, mediaStyle };
}
