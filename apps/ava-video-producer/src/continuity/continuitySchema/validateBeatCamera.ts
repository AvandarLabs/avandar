import { CameraTrack } from "../../motion-components/CameraTrack/CameraTrack";
import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import type { ContinuityBeat } from "./continuitySchema";
/** Check camera and object travel bounds. */
export function validateBeatCamera({
  beat,
  issue,
}: Readonly<{ beat: ContinuityBeat; issue: (message: string) => void }>): void {
  try {
    if (
      beat.content.kind === "stock" &&
      beat.content.camera &&
      CameraTrack.retime({
        keys: beat.content.camera,
        options: beat.content.cameraOptions,
      }).some((key) => {
        return key.at >= beat.duration;
      })
    ) {
      issue("Camera cues must stay within their beat");
    }
    if (
      beat.content.kind === "stock" &&
      beat.content.flight &&
      beat.content.flight.at +
        MotionSettings.getMotionDuration({
          frames: beat.content.flight.duration,
          options: beat.content.flight.motion,
        }) >=
        beat.duration
    ) {
      issue("Object flight must finish within its beat");
    }
  } catch {
    issue("Camera and object motion require valid travel timing");
  }
}
