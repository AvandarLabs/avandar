import { AnchoredOverlayDemo } from "./AnchoredOverlayDemo/AnchoredOverlayDemo";
import { HorizontalBlurDemo } from "./BlurDemos/HorizontalBlurDemo/HorizontalBlurDemo";
import { VelocityBlurDemo } from "./BlurDemos/VelocityBlurDemo/VelocityBlurDemo";
import { BarBeatsDemo } from "./BuildDemos/BarBeatsDemo/BarBeatsDemo";
import { CtaBeatsDemo } from "./BuildDemos/CtaBeatsDemo/CtaBeatsDemo";
import { FlyThroughDemo } from "./BuildDemos/FlyThroughDemo/FlyThroughDemo";
import { MarkBuildDemo } from "./BuildDemos/MarkBuildDemo/MarkBuildDemo";
import { CameraTrackDemo } from "./CameraDemos/CameraTrackDemo/CameraTrackDemo";
import { DiagramCameraDemo } from "./CameraDemos/DiagramCameraDemo/DiagramCameraDemo";
import { WindowCameraDemo } from "./CameraDemos/WindowCameraDemo/WindowCameraDemo";
import { createCurveDemo } from "./createCurveDemo";
import { createDurationDemo } from "./createDurationDemo/createDurationDemo";
import { createLineRevealDemo } from "./createLineRevealDemo/createLineRevealDemo";
import { BezierDemo } from "./CurveDemos/BezierDemo/BezierDemo";
import { MotionPresetsDemo } from "./CurveDemos/MotionPresetsDemo/MotionPresetsDemo";
import { EnterAtDemo } from "./EntranceDemos/EnterAtDemo/EnterAtDemo";
import { EnterDemo } from "./EntranceDemos/EnterDemo/EnterDemo";
import { LeaveDemo } from "./EntranceDemos/LeaveDemo/LeaveDemo";
import { PopDemo } from "./EntranceDemos/PopDemo/PopDemo";
import { PressDemo } from "./EntranceDemos/PressDemo/PressDemo";
import { CountToDemo } from "./InterpolationDemos/CountToDemo/CountToDemo";
import { MixTokenDemo } from "./InterpolationDemos/MixTokenDemo/MixTokenDemo";
import { RampDemo } from "./InterpolationDemos/RampDemo/RampDemo";
import { LoopEnvelopeDemo } from "./LoopEnvelopeDemo/LoopEnvelopeDemo";
import { LoopPhaseDemo } from "./LoopPhaseDemo/LoopPhaseDemo";
import { EraseMaskDemo } from "./MaskDemos/EraseMaskDemo/EraseMaskDemo";
import { EraseScheduleDemo } from "./MaskDemos/EraseScheduleDemo/EraseScheduleDemo";
import { RoughEdgeDemo } from "./MaskDemos/RoughEdgeDemo/RoughEdgeDemo";
import { SteppedColumnWipeDemo } from "./MaskDemos/SteppedColumnWipeDemo/SteppedColumnWipeDemo";
import { WindowRevealDemo } from "./MaskDemos/WindowRevealDemo/WindowRevealDemo";
import { MediaPlaneDemo } from "./MediaPlaneDemo/MediaPlaneDemo";
import { ObjectDepartureDemo } from "./ObjectDepartureDemo/ObjectDepartureDemo";
import { ClickFeedbackDemo } from "./PointerDemos/ClickFeedbackDemo/ClickFeedbackDemo";
import { CursorOnTargetDemo } from "./PointerDemos/CursorOnTargetDemo/CursorOnTargetDemo";
import { CursorShutterDemo } from "./PointerDemos/CursorShutterDemo/CursorShutterDemo";
import { TrackPosDemo } from "./PointerDemos/TrackPosDemo/TrackPosDemo";
import { SharedElementDemo } from "./SharedElementDemo/SharedElementDemo";
import { StaggerColumnDemo } from "./StaggerColumnDemo/StaggerColumnDemo";
import { StaggerDemo } from "./StaggerDemo/StaggerDemo";
import { ActiveHeadlineDemo } from "./TextDemos/ActiveHeadlineDemo/ActiveHeadlineDemo";
import { HeadingRevealDemo } from "./TextDemos/HeadingRevealDemo/HeadingRevealDemo";
import { StagedExitDemo } from "./TextDemos/StagedExitDemo/StagedExitDemo";
import { TypedDemo } from "./TextDemos/TypedDemo/TypedDemo";
import { WipeExitDemo } from "./TextDemos/WipeExitDemo/WipeExitDemo";
import { ThemeStyleDemo } from "./ThemeStyleDemo/ThemeStyleDemo";
import { SceneTransitionDemo } from "./TransitionDemos/SceneTransitionDemo/SceneTransitionDemo";
import { ShotTransitionDemo } from "./TransitionDemos/ShotTransitionDemo/ShotTransitionDemo";
import { WaveDemo } from "./WaveDemo/WaveDemo";
import { CarouselDemo } from "./WindowDemos/CarouselDemo/CarouselDemo";
import { FlipSplitDemo } from "./WindowDemos/FlipSplitDemo/FlipSplitDemo";
import { PullBackDemo } from "./WindowDemos/PullBackDemo/PullBackDemo";
import { ScrollOffsetDemo } from "./WindowDemos/ScrollOffsetDemo/ScrollOffsetDemo";
import { SideEntranceDemo } from "./WindowDemos/SideEntranceDemo/SideEntranceDemo";
import { WindowBoxesDemo } from "./WindowDemos/WindowBoxesDemo/WindowBoxesDemo";
import { WindowTiltDemo } from "./WindowDemos/WindowTiltDemo/WindowTiltDemo";
import { WindowWhipDemo } from "./WindowDemos/WindowWhipDemo/WindowWhipDemo";
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
