import type { CameraKeyframe } from "../../../../../motion-components/CameraTrack/CameraTrack";

/** Push into the filter node, read it, and pull back out. */
const TRACK: CameraKeyframe[] = [
  { at: 0, x: 480, y: 300, zoom: 1 },
  { at: 20, x: 480, y: 300, zoom: 1 },
  { at: 50, x: 470, y: 180, zoom: 2.2, ease: "push" },
  { at: 90, x: 470, y: 180, zoom: 2.2 },
  { at: 125, x: 480, y: 300, zoom: 1 },
];

/** Authored route shared by the camera-track and diagram-camera previews. */
export const CameraDemosGalleryValues = {
  /** Camera keys that approach the filter node, hold, and return. */
  TRACK,
};
