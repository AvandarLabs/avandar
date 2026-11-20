import { AnchoredOverlay } from "../../../motion-components/AnchoredOverlay";
import { getObjectFlight } from "../../../motion-components/getObjectFlight/getObjectFlight";
import { getOverlayPose } from "../../../motion-components/getOverlayPose";
import {
  MotionRect,
  OverlayCue,
} from "../../../motion-components/getOverlayTimings";
import { MotionSettings } from "../../../motion-components/MotionSettings/MotionSettings";
import { SharedElement } from "../../../motion-components/SharedElement";
import { SvgObjectDeparture } from "../../../motion-components/SvgObjectDeparture";
import css from "./demos.module.css";
import { DemoTheme } from "./DemoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { DemoDiagram } from "./parts/DemoDiagram";
import { getDiagramNodeRect } from "./parts/getDiagramNodeRect";
import type { HelperDemoProps } from "./helperDemo.types";
import type { DemoReadout } from "./HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const SOURCE: MotionRect = { x: 40, y: 300, width: 200, height: 52 };
const TARGET: MotionRect = { x: 420, y: 40, width: 440, height: 140 };
const SHARE_AT = 20;
const SHARE_FRAMES = 30;
/** Outlines of where a moving element starts and lands. */
function RectOutline({ rect, label }: { rect: MotionRect; label: string }) {
  return (
    <div
      className={css.box}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    >
      <span className={css.boxLabel}>{label}</span>
    </div>
  );
}
/** One chip travelling from a list into a header as the same element. */
export function SharedElementDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const progress = MotionSettings.getMotionProgress({
    frame,
    at: SHARE_AT,
    duration: SHARE_FRAMES,
    options: undefined,
    fallback: undefined,
    theme: settingsTheme,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`<SharedElement source target frame at={${SHARE_AT}} durationInFrames={${SHARE_FRAMES}}>`}
      readouts={[
        {
          name: "progress",
          value: DemoTheme.formatReadout({ value: progress }),
        },
      ]}
    >
      <RectOutline rect={SOURCE} label="source" />
      <RectOutline rect={TARGET} label="target" />
      <SharedElement
        source={SOURCE}
        target={TARGET}
        frame={frame}
        at={SHARE_AT}
        durationInFrames={SHARE_FRAMES}
        className={css.sharedToken}
      >
        {"Response cases"}
      </SharedElement>
    </HelperDemoFrame>
  );
}
const CELL: MotionRect = { x: 60, y: 260, width: 160, height: 44 };
const CUE: OverlayCue = {
  at: 10,
  until: 130,
  target: { x: 460, y: 60, width: 360, height: 140 },
};
const TABLE_ROWS = ["first", "second", "third", "fourth"];
/** A callout rising from a table cell, holding, and returning to it. */
export function AnchoredOverlayDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
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
      readouts={[
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
      ]}
    >
      {TABLE_ROWS.map((row, index) => {
        return (
          <div
            key={row}
            className={css.tableRow}
            style={{ top: 160 + index * 50 }}
          >
            <span className={css.tableCell} />
            <span className={css.tableCell} />
          </div>
        );
      })}
      <div
        className={css.box}
        style={{
          left: CELL.x,
          top: CELL.y,
          width: CELL.width,
          height: CELL.height,
        }}
      />
      <AnchoredOverlay
        frame={frame}
        source={CELL}
        cue={CUE}
        className={css.callout}
      >
        Callout drawn from this cell
      </AnchoredOverlay>
    </HelperDemoFrame>
  );
}
const FLIGHT = {
  at: 20,
  duration: 30,
  dx: 380,
  dy: -60,
  rect: getDiagramNodeRect("model"),
};
/** One diagram node leaving on its own vector while the diagram stays. */
export function ObjectDepartureDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const flight = getObjectFlight({
    flight: FLIGHT,
    frame,
    theme: MotionSettings.useMotionSettingsTheme(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="<SvgObjectDeparture frame flight={{ at: 20, duration: 30, dx: 380, dy: -60, rect }}>"
      readouts={_getDepartureReadouts(flight)}
    >
      <div className={css.centered}>
        <svg
          viewBox="0 0 960 600"
          width={656}
          height={410}
          aria-hidden="true"
          className={css.diagramFrame}
        >
          <SvgObjectDeparture frame={frame} flight={FLIGHT}>
            <DemoDiagram />
          </SvgObjectDeparture>
        </svg>
      </div>
    </HelperDemoFrame>
  );
}
/** Formats the live readouts displayed by ObjectDepartureDemo. */
function _getDepartureReadouts(
  flight: ReturnType<typeof getObjectFlight>,
): DemoReadout[] {
  return [
    {
      name: "x",
      value: DemoTheme.formatReadout({ value: flight.x, digits: 1 }),
    },
    {
      name: "y",
      value: DemoTheme.formatReadout({ value: flight.y, digits: 1 }),
    },
    {
      name: "opacity",
      value: DemoTheme.formatReadout({ value: flight.opacity }),
    },
    { name: "active", value: String(flight.active) },
  ];
}
