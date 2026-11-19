import { HorizontalBlurDemo, VelocityBlurDemo } from "./BlurDemos";
import {
  BarBeatsDemo,
  CtaBeatsDemo,
  FlyThroughDemo,
  MarkBuildDemo,
} from "./BuildDemos";
import {
  CameraTrackDemo,
  DiagramCameraDemo,
  WindowCameraDemo,
} from "./CameraDemos";
import {
  AnchoredOverlayDemo,
  ObjectDepartureDemo,
  SharedElementDemo,
} from "./ContinuityDemos";
import { createCurveDemo } from "./createCurveDemo";
import { createDurationDemo } from "./createDurationDemo";
import { createLineRevealDemo } from "./createLineRevealDemo";
import { BezierDemo, MotionPresetsDemo } from "./CurveDemos";
import { StaggerColumnDemo, StaggerDemo } from "./DurationDemos";
import {
  EnterAtDemo,
  EnterDemo,
  LeaveDemo,
  PopDemo,
  PressDemo,
} from "./EntranceDemos";
import { CountToDemo, MixTokenDemo, RampDemo } from "./InterpolationDemos";
import { LoopEnvelopeDemo, LoopPhaseDemo, WaveDemo } from "./LoopDemos";
import {
  EraseMaskDemo,
  EraseScheduleDemo,
  RoughEdgeDemo,
  SteppedColumnWipeDemo,
  WindowRevealDemo,
} from "./MaskDemos";
import { MediaPlaneDemo } from "./MediaDemos";
import {
  ClickFeedbackDemo,
  CursorOnTargetDemo,
  CursorShutterDemo,
  TrackPosDemo,
} from "./PointerDemos";
import {
  ActiveHeadlineDemo,
  HeadingRevealDemo,
  StagedExitDemo,
  TypedDemo,
  WipeExitDemo,
} from "./TextDemos";
import { ThemeStyleDemo } from "./ThemeDemos";
import { SceneTransitionDemo, ShotTransitionDemo } from "./TransitionDemos";
import {
  CarouselDemo,
  FlipSplitDemo,
  PullBackDemo,
  ScrollOffsetDemo,
  SideEntranceDemo,
  WindowBoxesDemo,
  WindowTiltDemo,
  WindowWhipDemo,
} from "./WindowDemos";
import type { HelperDemoId } from "../helperDemoIds";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ComponentType } from "react";

/**
 * Every live helper preview by id. Typed against `HELPER_DEMO_IDS`, so a new
 * id fails to compile until its preview is registered here.
 */
export const HELPER_DEMOS: Record<
  HelperDemoId,
  ComponentType<HelperDemoProps>
> = {
  "curve-out": createCurveDemo("out"),
  "curve-out-back": createCurveDemo("outBack"),
  "curve-in-out": createCurveDemo("inOut"),
  "curve-in-out-cubic": createCurveDemo("inOutCubic"),
  "curve-word": createCurveDemo("word"),
  "curve-in": createCurveDemo("in"),
  "curve-surge": createCurveDemo("surge"),
  "curve-bezier": BezierDemo,
  "motion-presets": MotionPresetsDemo,
  "duration-press": createDurationDemo("press"),
  "duration-chip": createDurationDemo("chip"),
  "duration-panel": createDurationDemo("panel"),
  "duration-sheet": createDurationDemo("sheet"),
  "duration-hero": createDurationDemo("hero"),
  "duration-word": createDurationDemo("word"),
  "duration-whip": createDurationDemo("whip"),
  stagger: StaggerDemo,
  "stagger-column": StaggerColumnDemo,
  ramp: RampDemo,
  "mix-token": MixTokenDemo,
  "count-to": CountToDemo,
  enter: EnterDemo,
  "enter-at": EnterAtDemo,
  leave: LeaveDemo,
  pop: PopDemo,
  press: PressDemo,
  "line-fade": createLineRevealDemo("line-fade"),
  "line-wipe": createLineRevealDemo("wipe"),
  "line-cut": createLineRevealDemo("cut"),
  "wipe-exit": WipeExitDemo,
  "heading-reveal": HeadingRevealDemo,
  "staged-exit": StagedExitDemo,
  typed: TypedDemo,
  "active-headline": ActiveHeadlineDemo,
  "erase-mask": EraseMaskDemo,
  "erase-schedule": EraseScheduleDemo,
  "stepped-column-wipe": SteppedColumnWipeDemo,
  "window-reveal": WindowRevealDemo,
  "rough-edge": RoughEdgeDemo,
  "horizontal-blur": HorizontalBlurDemo,
  "velocity-blur": VelocityBlurDemo,
  "camera-track": CameraTrackDemo,
  "diagram-camera": DiagramCameraDemo,
  "window-camera": WindowCameraDemo,
  "window-whip": WindowWhipDemo,
  "side-entrance": SideEntranceDemo,
  carousel: CarouselDemo,
  "pull-back": PullBackDemo,
  "flip-split": FlipSplitDemo,
  "scroll-offset": ScrollOffsetDemo,
  "window-tilt": WindowTiltDemo,
  "window-boxes": WindowBoxesDemo,
  "media-plane": MediaPlaneDemo,
  "shot-transition": ShotTransitionDemo,
  "scene-transition": SceneTransitionDemo,
  "shared-element": SharedElementDemo,
  "anchored-overlay": AnchoredOverlayDemo,
  "object-departure": ObjectDepartureDemo,
  "theme-style": ThemeStyleDemo,
  "track-pos": TrackPosDemo,
  "cursor-on-target": CursorOnTargetDemo,
  "click-feedback": ClickFeedbackDemo,
  "cursor-shutter": CursorShutterDemo,
  "loop-phase": LoopPhaseDemo,
  wave: WaveDemo,
  "loop-envelope": LoopEnvelopeDemo,
  "mark-build": MarkBuildDemo,
  "fly-through": FlyThroughDemo,
  "cta-beats": CtaBeatsDemo,
  "bar-beats": BarBeatsDemo,
};
