import { Cursor } from "../../../../../chrome/Cursor/Cursor";
import { useCursorMotion } from "../../../../../chrome/useCursorMotion";
import { CursorMotionHelpers } from "../../../../../CursorMotionHelpers";
import { Motion } from "../../../../../motion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { useVideoTokens } from "../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { ClickFeedbackTarget } from "./ClickFeedbackTarget/ClickFeedbackTarget";
import type { CursorKey } from "../../../../../CursorMotionHelpers";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const PRESS_PATH: CursorKey[] = [
  { at: 0, x: 300, y: 380 },
  { at: 20, x: 452, y: 232 },
  { at: 89, x: 452, y: 232 },
];

const PRESS_CLICKS = [35, 62];

/** Renders ClickFeedbackDemo for live helper catalog previews. */
export function ClickFeedbackDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const cursorMotion = useCursorMotion();
  const brand = useVideoTokens().color.scene.brand;
  const { accent } = DemoTheme.useDemoColors();
  const isDown = CursorMotionHelpers.downAt({
    frame,
    beats: PRESS_CLICKS,
  });
  const fill = Motion.mixToken({
    t: Number(isDown),
    from: brand,
    to: accent,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`CursorMotionHelpers.downAt({ frame, beats: [${PRESS_CLICKS.join(", ")}] })  CursorMotionHelpers.cursorScale({ frame, clicks })`}
      readouts={_getClickReadouts({ isDown, frame, cursorMotion })}
    >
      <ClickFeedbackTarget {...{ fill, motion, frame }} />
      <Cursor
        frame={frame}
        path={PRESS_PATH}
        clicks={PRESS_CLICKS}
        cursor={frame >= 20 ? "pointer" : "default"}
      />
    </HelperDemoFrame>
  );
}

/** Formats the live readouts displayed by ClickFeedbackDemo. */
function _getClickReadouts({
  isDown,
  frame,
  cursorMotion,
}: Readonly<{
  isDown: boolean;
  frame: number;
  cursorMotion: ReturnType<typeof useCursorMotion>;
}>): DemoReadout[] {
  return [
    { name: "downAt", value: String(isDown) },
    {
      name: "cursorScale",
      value: DemoTheme.formatReadout({
        value: CursorMotionHelpers.cursorScale({
          frame,
          clicks: PRESS_CLICKS,
          motion: cursorMotion,
        }),
        digits: 3,
      }),
    },
  ];
}

type Props = HelperDemoProps;
