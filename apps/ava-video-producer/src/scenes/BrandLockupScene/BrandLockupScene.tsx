import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../videoTheme/videoThemeHelpers";
import { TextLayout } from "../layout/TextLayout";
import { SceneShell } from "../SceneShell/SceneShell";
import { BrandLockupMotion } from "./BrandLockupMotion/BrandLockupMotion";
import { LockupCta } from "./LockupCta/LockupCta";
import { LockupMark } from "./LockupMark/LockupMark";
import { LockupWordmark } from "./LockupWordmark/LockupWordmark";
import type { BrandLockupSceneProps as Props } from "../scenes.types";
import type { ReactNode } from "react";
/**
 * A brand mark with an optional wordmark, centred on the field, for an
 * opening or closing card. The mark can build through column masks, the
 * wordmark wipes in beside it, a CTA stack (subtitle, URL, typed command,
 * badge) can cascade in below, and the mark's columns can fly through the
 * frame to hand over to the next shot's field colour. The build and flight
 * read `components.BrandLockup`, colours the scene palette.
 */
export function BrandLockupScene(props: Props): ReactNode {
  const { frame, width = 1600, height = 1000, wordmark, cta } = props;
  const motion = useVideoMotion();
  const { columnStagger } = useVideoProps({
    name: "BrandLockup",
    props: {},
  });
  const buildMotion = { motion, columnStagger };
  const geometry = _getLockupGeometry({
    props,
    width,
    height,
  });
  const wordmarkAt =
    props.wordmarkAtFrame ??
    BrandLockupMotion.getMarkBuildEndFrame({
      build: props.build,
      buildMotion,
    }) + motion.sheet;
  return (
    <SceneShell frame={frame} width={width} height={height}>
      <LockupMark
        {...props}
        mark={geometry.mark}
        width={width}
        height={height}
      />
      {wordmark && geometry.wordmark ? (
        <LockupWordmark
          {...props}
          wordmark={wordmark}
          box={geometry.wordmark}
          fontSize={geometry.wordmarkFontSize}
          atFrame={wordmarkAt}
        />
      ) : null}
      {cta ? (
        <LockupCta frame={frame} cta={cta} width={width} height={height} />
      ) : null}
    </SceneShell>
  );
}
/** Pixel boxes of the mark and wordmark, centred together as one lockup. */
function _getLockupGeometry({
  props: { logo, wordmark, cta },
  width,
  height,
}: Readonly<{
  props: Props;
  width: number;
  height: number;
}>) {
  const markHeight = logo.height ?? Math.round(height * 0.167);
  const markWidth = markHeight * (logo.aspectRatio ?? 1);
  const wordmarkFontSize = markHeight * 0.72;
  const gap = markHeight * 0.22;
  const wordmarkWidth = wordmark
    ? TextLayout.textUnits(wordmark) * wordmarkFontSize * 1.05
    : 0;
  const groupWidth = markWidth + (wordmark ? gap + wordmarkWidth : 0);
  const left = (width - groupWidth) / 2;
  const centerY = height * (cta ? 0.235 : 0.445);
  const mark = {
    x: left,
    y: centerY - markHeight / 2,
    width: markWidth,
    height: markHeight,
  };
  return {
    mark,
    wordmarkFontSize,
    wordmark: wordmark
      ? {
          x: left + markWidth + gap,
          y: mark.y,
          width: wordmarkWidth,
          height: markHeight,
        }
      : undefined,
  };
}
