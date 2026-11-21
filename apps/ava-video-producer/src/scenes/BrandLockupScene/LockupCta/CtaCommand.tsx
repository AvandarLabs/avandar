import { Motion } from "../../../motion";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { LockupCtaShared } from "./LockupCtaShared/LockupCtaShared";
import {
  type CtaLineBox,
  type CtaBeats,
} from "./LockupCtaShared/LockupCtaShared.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  box: CtaLineBox;
  beats: CtaBeats;
  cps: number;
  command: string;
};
/** The command, typed after its prompt, with a caret lit while typing. */
export function CtaCommand({
  frame,
  box,
  beats,
  cps,
  command,
}: Readonly<Props>): ReactNode {
  const tokens = useVideoTheme().semantic;
  const motion = useVideoMotion();
  const scene = tokens.color.scene;
  const isTyping = frame >= beats.typingAt && frame < beats.typingEnd;
  return (
    <div
      style={{
        ...LockupCtaShared.buildCtaLineStyle({
          box,
          top: 0.735,
          fontSize: box.height * 0.03,
        }),
        fontFamily: tokens.text.stage.command.fontFamily,
        opacity: frame >= beats.promptAt ? 1 : 0,
      }}
    >
      <span style={{ color: scene.mutedForeground }}>$ </span>
      {Motion.typed({
        frame,
        at: beats.typingAt,
        text: command,
        cps,
      })}
      <span
        style={{
          display: "inline-block",
          width: "0.6em",
          height: "1.1em",
          verticalAlign: "-0.2em",
          background: scene.brand,
          opacity: isTyping || motion.caretOn(frame) ? 1 : 0,
        }}
      />
    </div>
  );
}
