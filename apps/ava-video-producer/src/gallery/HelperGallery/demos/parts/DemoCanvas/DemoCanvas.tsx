import css from "./DemoCanvas.module.css";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

/**
 * The mini film frame window previews draw into, at the 1.6 aspect ratio of
 * the film canvas. Its dashed edge is the frame edge, so a whip visibly
 * leaves the picture.
 */
export const DEMO_CANVAS = { width: 640, height: 400 } as const;

/** The mini film frame, centred on the preview stage. */
export function DemoCanvas({ children }: Readonly<Props>): ReactNode {
  return <div className={css.demoCanvasCanvas}>{children}</div>;
}
