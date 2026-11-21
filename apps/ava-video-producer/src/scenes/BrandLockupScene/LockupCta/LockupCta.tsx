import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { BrandLockupMotion } from "../BrandLockupMotion/BrandLockupMotion";
import { CtaBadge } from "./CtaBadge";
import { CtaCommand } from "./CtaCommand";
import { CtaSubtitle } from "./CtaSubtitle";
import { CtaUrl } from "./CtaUrl";
import type { BrandLockupSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  cta: NonNullable<BrandLockupSceneProps["cta"]>;
  width: number;
  height: number;
};
/** Default command typing speed, about one character per frame. */
const COMMAND_CHARS_PER_SECOND = 30;
/** Subtitle, URL, typed command and badge, cascading in below the mark. */
export function LockupCta({
  frame,
  cta,
  width,
  height,
}: Readonly<Props>): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  const badge = tokens.text.stage.badge;
  const cps = cta.commandCharsPerSecond ?? COMMAND_CHARS_PER_SECOND;
  const beats = BrandLockupMotion.getCtaBeats({
    cta,
    charsPerSecond: cps,
    motion,
  });
  const box = { width, height, lineHeight: badge.lineHeight };
  return (
    <>
      {cta.subtitle ? (
        <CtaSubtitle {...{ frame, box, beats }} subtitle={cta.subtitle} />
      ) : null}
      {cta.url ? <CtaUrl {...{ frame, box, beats }} url={cta.url} /> : null}
      {cta.command ? (
        <CtaCommand {...{ frame, box, beats, cps }} command={cta.command} />
      ) : null}
      {cta.badge ? (
        <CtaBadge {...{ frame, box, beats }} badge={cta.badge} />
      ) : null}
    </>
  );
}
