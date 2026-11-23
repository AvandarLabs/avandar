import { useMemo } from "react";
import { CameraTrack } from "../CameraTrack/CameraTrack";
import type { CameraKeyframe } from "../CameraTrack/CameraTrack";

/** Validates a camera route once for its track and canvas dimensions. */
export function useValidatedCameraTrack({
  track,
  width,
  height,
}: Readonly<{
  track: readonly CameraKeyframe[] | undefined;
  width: number;
  height: number;
}>): CameraKeyframe[] | undefined {
  const validatedTrack = useMemo(() => {
    return (
      track &&
      CameraTrack.makeSchemaFromViewport({
        width,
        height,
      }).parse(track)
    );
  }, [track, width, height]);

  return validatedTrack;
}
