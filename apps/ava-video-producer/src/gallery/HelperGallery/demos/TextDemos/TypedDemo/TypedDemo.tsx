import { Motion } from "../../../../../motion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./TypedDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const COMMAND = "pnpm showcase";

const TYPED_AT = 10;

/** A command typed character by character with a blinking caret. */
export function TypedDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const text = Motion.typed({
    frame,
    at: TYPED_AT,
    text: COMMAND,
    cps: motion.typing.rate,
  });
  const isCaretOn = motion.caretOn(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`typed(frame, ${TYPED_AT}, "${COMMAND}") + caretOn(frame)`}
      readouts={[
        { name: "characters", value: `${text.length}/${COMMAND.length}` },
        { name: "caretOn", value: String(isCaretOn) },
      ]}
    >
      <div className={css.typedDemoCentered}>
        <div className={css.typedDemoTerminal}>
          <span className={css.typedDemoPrompt}>$ </span>
          {text}
          <span style={{ opacity: isCaretOn ? 1 : 0 }}>▍</span>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
