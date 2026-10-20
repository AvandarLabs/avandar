import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./SharedJigPreparation.schema";
/** Data for getJigSceneFromFrame. */
type GetJigSceneFromFrameResult = {
  centers: number[];
  guideX: number;
  guideY: number;
  formed: number;
  applications: boolean[];
  activeIndex: number;
};

/** Frame-derived guide position and one application beat per collaborator. */
export function getJigSceneFromFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): GetJigSceneFromFrameResult {
  const centers = input.collaborators.map((_, index) =>
    input.collaborators.length === 1
      ? 610
      : 350 + (index * 500) / (input.collaborators.length - 1),
  );
  const duration = 73 / input.collaborators.length;
  const activeIndex = Math.min(
    input.collaborators.length - 1,
    Math.max(0, Math.floor((frame - 49) / duration)),
  );
  const previousX = activeIndex === 0 ? 80 : centers[activeIndex - 1] - 50;
  const arriving = ramp(
    frame,
    49 + activeIndex * duration,
    duration * 0.4,
    EASE.inOut,
  );
  const travellingX = mix(arriving, previousX, centers[activeIndex] - 50);
  const guideX =
    frame < 49 ? 80 : mix(ramp(frame, 122, 8, EASE.inOut), travellingX, 80);
  return {
    centers,
    guideX,
    guideY: 350,
    formed: ramp(frame, 20, 28, EASE.inOut),
    applications: centers.map(
      (_, index) => frame >= 49 + index * duration + duration * 0.65,
    ),
    activeIndex: frame >= 49 && frame < 122 ? activeIndex : -1,
  };
}
