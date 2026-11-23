import { BrandLockupMotion } from "../../../../../scenes/BrandLockupScene/BrandLockupMotion/BrandLockupMotion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { FlightColumns } from "../FlightColumns/FlightColumns";
import css from "./FlyThroughDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const FLY_THROUGH = { kind: "fly-through", atFrame: 30 } as const;

/** The mark's columns flying out to cover the frame in a token colour. */
export function FlyThroughDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const { retract, flight, cover } = BrandLockupMotion.getFlightProgress({
    frame,
    exit: FLY_THROUGH,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        'BrandLockupMotion.getFlightProgress({ frame, exit: { kind: "fly-through", atFrame: 30 } }) → BrandLockupMotion.getFlightColumnRect(...)'
      }
      readouts={[
        { name: "retract", value: DemoTheme.formatReadout({ value: retract }) },
        { name: "flight", value: DemoTheme.formatReadout({ value: flight }) },
        { name: "cover", value: DemoTheme.formatReadout({ value: cover }) },
      ]}
    >
      <DemoCanvas>
        <p
          className={css.flyThroughDemoWordmark}
          style={{ clipPath: `inset(0 ${(retract * 100).toFixed(2)}% 0 0)` }}
        >
          Motion Atlas
        </p>
        <FlightColumns flight={flight} cover={cover} />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
