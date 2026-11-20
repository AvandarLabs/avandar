import { TYPE } from "../fonts";
import { assertFinite, fitTextLines } from "./layout/layout";
import { getHeadingRevealStyles } from "./textReveal";
import type { SceneBase } from "./scenes.types";
import type { CSSProperties, ReactNode } from "react";

/**
 * Shared chrome for a scene: the ground, title/kicker header, and content area.
 */
export function SceneShell({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  headingReveal,
  children,
}: SceneBase & { children: ReactNode }): ReactNode {
  assertFinite(frame, "scene frame");
  const reveal = getHeadingRevealStyles(frame, headingReveal);
  // A wipe clips to the text's own width, not to the header's full width.
  const lineBox: CSSProperties = {
    display: headingReveal?.mode === "wipe" ? "inline-block" : "block",
  };
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
              }}
            >
              <span style={{ ...lineBox, ...reveal.title }}>{title}</span>
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
              }}
            >
              <span style={{ ...lineBox, ...reveal.kicker }}>{kicker}</span>
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
