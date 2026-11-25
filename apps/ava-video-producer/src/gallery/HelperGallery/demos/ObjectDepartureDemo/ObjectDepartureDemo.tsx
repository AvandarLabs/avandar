import { getObjectFlight } from "../../../../motion-components/getObjectFlight/getObjectFlight";
import { MotionSettings } from "../../../../motion-components/MotionSettings/MotionSettings";
import { SvgObjectDeparture } from "../../../../motion-components/SvgObjectDeparture";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { DemoDiagram } from "../parts/DemoDiagram/DemoDiagram";
import { getDiagramNodeRect } from "../parts/getDiagramNodeRect";
import css from "./ObjectDepartureDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const FLIGHT = {
  at: 20,
  duration: 30,
  dx: 380,
  dy: -60,
  rect: getDiagramNodeRect("model"),
};

/** Renders ObjectDepartureDemo for live helper catalog previews. */
export function ObjectDepartureDemo({
  frame,
  frames,
}: Readonly<Props>): ReactNode {
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
      <div className={css.objectDepartureDemoCentered}>
        <svg
          viewBox="0 0 960 600"
          width={656}
          height={410}
          aria-hidden="true"
          className={css.objectDepartureDemoDiagramFrame}
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

type Props = HelperDemoProps;
