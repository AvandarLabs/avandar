import { Motion } from "../../../../../motion";
import { BrandLockupMotion } from "../../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import { TextReveal } from "../../../../../scenes/TextReveal/TextReveal";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { BuildDemosShared } from "../BuildDemosShared/BuildDemosShared";
import css from "./CtaBeatLines.module.css";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  beats: ReturnType<typeof BrandLockupMotion.getCtaBeats>;
  cps: number;
};
/** Subtitle, URL, typed command and badge arriving on their computed beats. */
/** The CTA's subtitle, URL, typed command, and badge on their beats. */
export function CtaBeatLines({
  frame,
  beats,
  cps,
}: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const reveal = (at: number) => {
    return TextReveal.getLineRevealStyle({
      frame,
      at,
      mode: "line-fade",
      options: {},
      motion,
    });
  };
  return (
    <div className={css.ctaBeatLinesLines}>
      <p className={css.ctaBeatLinesKicker} style={reveal(beats.subtitleAt)}>
        Every helper, previewed live.
      </p>
      <p className={css.ctaBeatLinesHeadline} style={reveal(beats.urlAt)}>
        localhost:4173/motion.html
      </p>
      <div className={css.ctaBeatLinesTerminal} style={reveal(beats.promptAt)}>
        <span className={css.ctaBeatLinesPrompt}>$ </span>
        {Motion.typed({
          frame,
          at: beats.typingAt,
          text: BuildDemosShared.COMMAND,
          cps,
        })}
        <span style={{ opacity: motion.caretOn(frame) ? 1 : 0 }}>▍</span>
      </div>
      <span
        className={css.ctaBeatLinesBadge}
        style={motion.enter(frame, beats.badgeAt)}
      >
        Live previews
      </span>
    </div>
  );
}
