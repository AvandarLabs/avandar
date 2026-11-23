import { Motion } from "../../../../motion";
import { MediaPlane } from "../../../MediaPlane";
import { WindowMotion } from "../../WindowMotion/WindowMotion";
import css from "./WindowContent.module.css";
import type { WindowContentOptions as Props } from "../WindowCard.types";
import type { ReactNode } from "react";

/** The still or footage, fitted to the window or scrolled through. */
export function WindowContent({
  frame,
  source,
  height,
  stage,
}: Readonly<Props>): ReactNode {
  const position = source.objectPosition ?? { x: 0.5, y: 0 };
  const scroll = source.scrollSteps
    ? WindowMotion.getScrollOffset({ frame, steps: source.scrollSteps, stage })
    : undefined;
  return (
    <div className={css.windowContentdiv1} style={{ height }}>
      <MediaPlane
        frame={frame}
        kind={source.kind}
        src={source.src}
        trimBefore={source.trimBefore}
        alt=""
        style={
          scroll === undefined
            ? {
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: source.fit ?? "cover",
                objectPosition: `${position.x * 100}% ${position.y * 100}%`,
              }
            : {
                display: "block",
                width: "100%",
                height: "auto",
                transform: `translateY(${Motion.mix({
                  t: scroll,
                  from: 0,
                  to: -100,
                }).toFixed(3)}%)`,
              }
        }
      />
    </div>
  );
}
