import { useCurrentFrame } from "remotion";
import { CameraTrack } from "../../motion-components/CameraTrack/CameraTrack";
import { DiagramCamera } from "../../motion-components/DiagramCamera/DiagramCamera";
import { getObjectFlight } from "../../motion-components/getObjectFlight/getObjectFlight";
import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { useContinuityAppearance } from "../ContinuityAppearanceContext/useContinuityAppearance";
import { ContinuityGraphicObjects } from "./ContinuityGraphicObjects";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: Extract<
    ContinuityBeat["content"],
    {
      kind: "stock";
    }
  >;
};
/** Apply the reusable vector camera to the continuity beat's stock artwork. */
export function ContinuityCameraGraphic({ content }: Props): ReactNode {
  const frame = useCurrentFrame();
  const { cameraMotion, motionBlur } = useContinuityAppearance();
  const theme = MotionSettings.useMotionSettingsTheme();
  const flightActive = Boolean(
    content.flight &&
    getObjectFlight({ flight: content.flight, frame, theme }).active,
  );
  const useFlightBlur =
    flightActive &&
    content.flight?.motion &&
    !CameraTrack.isMoving({
      keys: content.camera,
      frame,
      options: content.cameraOptions,
      theme,
    });
  const { shutterAngle, samples, blurStrength } =
    MotionSettings.resolveMotionSettings({
      options: content.flight?.motion,
      theme,
    });
  return (
    <DiagramCamera
      track={content.camera}
      enabled={cameraMotion}
      motionBlur={motionBlur}
      blurActive={flightActive}
      {...content.cameraOptions}
      blurOptions={
        useFlightBlur ? { shutterAngle, samples, blurStrength } : undefined
      }
      render={(sampleFrame) => {
        return (
          <ContinuityGraphicObjects content={content} frame={sampleFrame} />
        );
      }}
    />
  );
}
