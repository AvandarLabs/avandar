import css from "@/views/GisApp/MapCanvas/MapCanvasSurface/MapCanvasSurface.module.css";
import type { ReactNode, RefObject } from "react";

type Props = { containerRef: RefObject<HTMLDivElement | null> };

/** The DOM surface attached to a map controller. */
export function MapCanvasSurface({ containerRef }: Props): ReactNode {
  return <div ref={containerRef} className={css.mapCanvasSurface} />;
}
