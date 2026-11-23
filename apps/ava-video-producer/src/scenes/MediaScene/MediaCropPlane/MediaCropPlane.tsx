import { MediaPlane } from "../../MediaPlane";
import css from "./MediaCropPlane.module.css";
import type { Rect } from "../../layout/SceneGeometry";
import type { MediaSceneProps as SceneInput } from "../../scenes.types";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  frame: number;
  bounds: Rect;
  title: SceneInput["title"];
  kind: SceneInput["kind"];
  src: string;
  trimBefore: number;
  crop: NonNullable<SceneInput["crop"]>;
  mediaStyle: CSSProperties;
};
/** Renders media crop plane. */
export function MediaCropPlane({
  frame,
  bounds,
  title,
  kind,
  src,
  trimBefore,
  crop,
  mediaStyle,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.mediaCropPlanediv1}
      style={{
        width: bounds.width,
        height: bounds.height,
        transform: `translate(${(-crop.x / crop.width) * bounds.width}px, ${(-crop.y / crop.height) * bounds.height}px) scale(${1 / crop.width}, ${1 / crop.height})`,
      }}
    >
      <MediaPlane
        frame={frame}
        kind={kind}
        src={src}
        trimBefore={trimBefore}
        alt={title ?? "Captured product screen"}
        style={mediaStyle}
      />
    </div>
  );
}
