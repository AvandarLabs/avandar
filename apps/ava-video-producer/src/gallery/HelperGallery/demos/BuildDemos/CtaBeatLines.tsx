import { typed } from "../../../../motion";
import { BrandLockupMotion } from "../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import { getLineRevealStyle } from "../../../../scenes/textReveal/textReveal";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import css from "../demos.module.css";
import { BuildDemosShared } from "./BuildDemosShared/BuildDemosShared";
import type { ReactNode } from "react";
/** Subtitle, URL, typed command and badge arriving on their computed beats. */
/** The CTA's subtitle, URL, typed command, and badge on their beats. */
export function CtaBeatLines({
  frame,
  beats,
  cps,
}: {
  frame: number;
  beats: ReturnType<typeof BrandLockupMotion.getCtaBeats>;
  cps: number;
}): ReactNode {
  const motion = useVideoMotion();
  const reveal = (at: number) => {
    return getLineRevealStyle({
      frame,
      at,
      mode: "line-fade",
      options: {},
      motion,
    });
  };
  return (
    <div className={css.lines}>
      <p className={css.kicker} style={reveal(beats.subtitleAt)}>
        Every helper, previewed live.
      </p>
      <p className={css.headline} style={reveal(beats.urlAt)}>
        localhost:4173/motion.html
      </p>
      <div className={css.terminal} style={reveal(beats.promptAt)}>
        <span className={css.prompt}>$ </span>
        {typed(frame, beats.typingAt, BuildDemosShared.COMMAND, cps)}
        <span style={{ opacity: motion.caretOn(frame) ? 1 : 0 }}>▍</span>
      </div>
      <span className={css.badge} style={motion.enter(frame, beats.badgeAt)}>
        Live previews
      </span>
    </div>
  );
}
