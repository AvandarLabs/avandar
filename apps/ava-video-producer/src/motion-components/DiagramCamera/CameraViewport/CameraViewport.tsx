import { CameraMotionBlur } from "@remotion/motion-blur";
import css from "./CameraViewport.module.css";
import type { CameraViewportOptions as Props } from "../DiagramCamera.types";
import type { ReactNode } from "react";
/** Renders a camera viewport. */
export function CameraViewport({
  children,
  blur,
  samples,
  shutterAngle,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.cameraViewportRoot}
      data-camera-moving={blur || undefined}
    >
      {blur ? (
        <CameraMotionBlur samples={samples} shutterAngle={shutterAngle}>
          {children}
        </CameraMotionBlur>
      ) : (
        children
      )}
    </div>
  );
}
