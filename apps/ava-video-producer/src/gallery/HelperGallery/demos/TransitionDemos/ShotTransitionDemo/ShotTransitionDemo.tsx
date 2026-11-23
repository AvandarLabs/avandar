import { clsx } from "clsx";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { TransitionDemosGalleryValues } from "../TransitionDemosGalleryValues/TransitionDemosGalleryValues";
import { ShotTransitionCard } from "./ShotTransitionCard/ShotTransitionCard";
import css from "./ShotTransitionDemo.module.css";
import type { ShotTransition } from "../../../../../storyboard/schema/shotTransitionSchema";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** The three transition kinds a storyboard shot can declare. */
const TRANSITIONS: Array<{
  code: string;
  transition?: ShotTransition;
  frames: number;
}> = [
  { code: "dissolve (default)", frames: 18 },
  {
    code: "stepped-column-wipe + drift",
    transition: {
      kind: "stepped-column-wipe",
      outgoingDrift: { x: -0.2, blur: 16 },
    },
    frames: 18,
  },
  { code: "cut", transition: { kind: "cut" }, frames: 0 },
];

/** Shot A handing over to shot B under each declared transition. */
export function ShotTransitionDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getShotTransitionLayers({ transition, transitionInFrames, localFrame: frame - ${TransitionDemosGalleryValues.CUT_AT}, ... })`}
      readouts={[
        {
          name: "localFrame",
          value: String(
            Math.max(0, frame - TransitionDemosGalleryValues.CUT_AT),
          ),
        },
      ]}
    >
      <div
        className={clsx(
          css.shotTransitionDemoMiniStages,
          css.shotTransitionDemoThreeUp,
        )}
      >
        {TRANSITIONS.map((item) => {
          return (
            <ShotTransitionCard key={item.code} item={item} frame={frame} />
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
