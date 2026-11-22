import { AnchoredOverlay } from "../../../../motion-components/AnchoredOverlay";
import { getOverlayPose } from "../../../../motion-components/getOverlayPose";
import type {
  MotionRect,
  OverlayCue,
} from "../../../../motion-components/getOverlayTimings";
import { MotionSettings } from "../../../../motion-components/MotionSettings/MotionSettings";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { OverlaySourceOutline } from "../OverlaySourceOutline/OverlaySourceOutline";
import css from "./AnchoredOverlayDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const CELL: MotionRect = { x: 60, y: 260, width: 160, height: 44 };

const CUE: OverlayCue = {
  at: 10,
  until: 130,
  target: { x: 460, y: 60, width: 360, height: 140 },
};

const TABLE_ROWS = ["first", "second", "third", "fourth"];

/** Renders AnchoredOverlayDemo for live helper catalog previews. */
export function AnchoredOverlayDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
  const pose = getOverlayPose({
    frame,
    cue: CUE,
    source: CELL,
    theme: MotionSettings.useMotionSettingsTheme(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="<AnchoredOverlay frame source={cell} cue={{ at: 10, until: 130, target }} />"
      readouts={_getOverlayReadouts({ pose })}
    >
      {TABLE_ROWS.map((row, index) => {
        return (
          <div
            key={row}
            className={css.anchoredOverlayDemoTableRow}
            style={{ top: 160 + index * 50 }}
          >
            <span className={css.anchoredOverlayDemoTableCell} />
            <span className={css.anchoredOverlayDemoTableCell} />
          </div>
        );
      })}
      <OverlaySourceOutline {...{}} />
      <AnchoredOverlay
        frame={frame}
        source={CELL}
        cue={CUE}
        className={css.anchoredOverlayDemoCallout}
      >
        Callout drawn from this cell
      </AnchoredOverlay>
    </HelperDemoFrame>
  );
}

function _getOverlayReadouts({
  pose,
}: Readonly<{ pose: ReturnType<typeof getOverlayPose> }>): DemoReadout[] {
  return [
    {
      name: "x",
      value: DemoTheme.formatReadout({ value: pose.x, digits: 1 }),
    },
    {
      name: "y",
      value: DemoTheme.formatReadout({ value: pose.y, digits: 1 }),
    },
    {
      name: "opacity",
      value: DemoTheme.formatReadout({ value: pose.opacity }),
    },
    {
      name: "scale",
      value: DemoTheme.formatReadout({ value: pose.scale }),
    },
  ];
}

type Props = HelperDemoProps;
