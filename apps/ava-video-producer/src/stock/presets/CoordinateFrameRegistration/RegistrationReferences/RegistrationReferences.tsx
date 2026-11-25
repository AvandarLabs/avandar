import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeRegisteredLandmarksFromInputAndFrame } from "../makeRegisteredLandmarksFromInputAndFrame";
import { RegistrationReference } from "./RegistrationReference";
import type { Input } from "../CoordinateFrameRegistration.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Fixed target rings and source ghosts preserve the physical reference sites.
 */
export function RegistrationReferences({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const points = makeRegisteredLandmarksFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {" "}
      {points.map((point) => {
        return <RegistrationReference key={point.id} point={point} />;
      })}
    </g>
  );
}
