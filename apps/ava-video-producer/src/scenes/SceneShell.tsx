import { TYPE } from "../fonts";
import { DUR, enter } from "../motion";
import { assertFinite, fitTextLines } from "./layout/layout";
import type { SceneBase } from "./scenes.types";
import type { CSSProperties, ReactNode } from "react";

/** Shared chrome for a scene: the ground, title/kicker header, and content area. */
export function SceneShell({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  children,
}: SceneBase & { children: ReactNode }) {
  assertFinite(frame, "scene frame");
  const titleSize = title
    ? fitTextLines([title], width * 0.88, 74, 48, 32).fontSize
    : 48;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        overflow: "hidden",
        background: "var(--ground)",
        color: "var(--foreground)",
        fontFamily: TYPE,
      }}
    >
      {title || kicker ? (
        <header
          style={{ position: "absolute", left: "6%", right: "6%", top: 64 }}
        >
          {title ? (
            <h1
              style={{
                margin: 0,
                fontSize: titleSize,
                lineHeight: 1.12,
                letterSpacing: -1.2,
                fontWeight: 600,
                ...enter(frame, 0, { y: 10, dur: DUR.sheet }),
              }}
            >
              {title}
            </h1>
          ) : null}
          {kicker ? (
            <p
              style={{
                margin: "16px 0 0",
                maxWidth: "100%",
                fontSize: 24,
                lineHeight: 1.35,
                color: "var(--muted-foreground)",
                ...enter(frame, DUR.panel, { y: 8 }),
              }}
            >
              {kicker}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}

/** Absolutely positions an element at a pixel rect computed by scene layout. */
export function positioned(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CSSProperties {
  return {
    position: "absolute",
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    boxSizing: "border-box",
  };
}
