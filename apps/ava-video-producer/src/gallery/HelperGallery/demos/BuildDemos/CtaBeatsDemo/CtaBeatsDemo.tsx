import { BrandLockupMotion } from "../../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { BuildDemosShared } from "../BuildDemosShared/BuildDemosShared";
import { CtaBeatLines } from "../CtaBeatLines/CtaBeatLines";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const CTA = { atFrame: 10, command: BuildDemosShared.COMMAND };

/** The command's typing speed at tempo 1, in characters per second. */
const CPS = 30;

/** Renders CtaBeatsDemo with the authored gallery behavior. */
export function CtaBeatsDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const cps = CPS * motion.tempo;
  const beats = BrandLockupMotion.getCtaBeats({
    cta: CTA,
    charsPerSecond: cps,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`BrandLockupMotion.getCtaBeats({ cta: { atFrame: 10, command: "${BuildDemosShared.COMMAND}" }, charsPerSecond: ${cps} })`}
      readouts={[
        { name: "urlAt", value: `${beats.urlAt}f` },
        { name: "typingAt", value: `${beats.typingAt}f` },
        { name: "typingEnd", value: `${beats.typingEnd}f` },
        { name: "badgeAt", value: `${beats.badgeAt}f` },
      ]}
    >
      <CtaBeatLines frame={frame} beats={beats} cps={cps} />
    </HelperDemoFrame>
  );
}
