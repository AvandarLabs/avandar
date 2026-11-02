import { useCurrentFrame } from "remotion";
import { isCameraMoving } from "../../motion-components/cameraTrack";
import { DiagramCamera } from "../../motion-components/DiagramCamera";
import { resolveMotionSettings } from "../../motion-components/motionSettings";
import { useContinuityAppearance } from "../ContinuityAppearanceContext";
import { ContinuityGraphicObjects } from "./ContinuityGraphicObjects";
import { getObjectFlight } from "./objectFlight";
import type { ContinuityBeat } from "../continuitySchema";

type Props = { content: Extract<ContinuityBeat["content"], { kind: "stock" }> };

/** Apply the reusable vector camera to the continuity beat's stock artwork. */
export function ContinuityCameraGraphic({ content }: Props) {
  const frame = useCurrentFrame();
  const { cameraMotion, motionBlur } = useContinuityAppearance();
  const flightActive = Boolean(
    content.flight && getObjectFlight(content.flight, frame).active,
  );
  const useFlightBlur =
    flightActive &&
    content.flight?.motion &&
    !isCameraMoving(content.camera, frame, content.cameraOptions);
  const { shutterAngle, samples, blurStrength } = resolveMotionSettings(
    content.flight?.motion,
  );
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
      render={(sampleFrame) => (
        <ContinuityGraphicObjects content={content} frame={sampleFrame} />
      )}
    />
  );
}
