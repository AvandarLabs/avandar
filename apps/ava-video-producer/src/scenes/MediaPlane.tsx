import { Freeze, Img, OffthreadVideo, staticFile } from "remotion";
import { safePublicPath } from "./layout/layout";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  frame: number;
  kind: "image" | "video";
  /** Path inside public/, without a leading slash, URL, query, or fragment. */
  src: string;
  trimBefore?: number;
  alt: string;
  style: CSSProperties;
};

/**
 * One still or one piece of footage, sampled at an explicit scene frame, for
 * any scene that frames captured media, such as a full-bleed media shot or a
 * screenshot inside a tilted window. Video goes through `Freeze`, so the
 * footage follows the scene's own clock rather than the composition's.
 */
export function MediaPlane({
  frame,
  kind,
  src,
  trimBefore = 0,
  alt,
  style,
}: Props): ReactNode {
  const asset = staticFile(safePublicPath(src));
  if (kind === "image") {
    return <Img src={asset} alt={alt} style={style} />;
  }
  return (
    <Freeze frame={Math.max(0, Math.floor(frame))}>
      <OffthreadVideo src={asset} trimBefore={trimBefore} muted style={style} />
    </Freeze>
  );
}
