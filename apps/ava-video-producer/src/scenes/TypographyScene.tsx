import { DUR, EASE, mix, ramp } from "../motion";
import { assertFrame, fitTextLines, sceneBounds } from "./layout/layout";
import { positioned, SceneShell } from "./SceneShell";
import type { TypographySceneProps } from "./scenes.types";

/** Headline copy that reveals word by word, with optional emphasized words. */
export function TypographyScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  lines,
  emphasis = [],
  align = "center",
  fontSize = 92,
  revealAtFrame = 6,
  wordStaggerFrames = 3,
}: TypographySceneProps) {
  if (!lines.length || lines.length > 6 || lines.some((line) => !line.trim()))
    throw new Error("TypographyScene needs 1 to 6 nonempty lines");
  assertFrame(revealAtFrame, "revealAtFrame");
  assertFrame(wordStaggerFrames, "wordStaggerFrames");
  if (wordStaggerFrames < 2)
    throw new Error("wordStaggerFrames must be at least 2");
  const bounds = sceneBounds(width, height, Boolean(title || kicker));
  const fitted = fitTextLines(
    lines,
    bounds.width,
    bounds.height - 56,
    fontSize,
  );
  let wordIndex = 0;
  return (
    <SceneShell {...{ frame, width, height, title, kicker }}>
      <div
        aria-label={lines.join(" ")}
        style={{
          ...positioned(bounds),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: align === "center" ? "center" : "flex-start",
          gap: fitted.fontSize * 0.15,
        }}
      >
        {fitted.lines.map((line, row) => (
          <div
            key={row}
            style={{
              display: "flex",
              justifyContent: align === "center" ? "center" : "flex-start",
              gap: fitted.fontSize * 0.3,
              maxWidth: "100%",
            }}
          >
            {line.split(/\s+/).map((word) => {
              const index = wordIndex++;
              const progress = ramp(
                frame,
                revealAtFrame + index * wordStaggerFrames,
                DUR.word,
                EASE.word,
              );
              return (
                <span
                  key={index}
                  style={{
                    display: "inline-block",
                    overflow: "hidden",
                    paddingBottom: fitted.fontSize * 0.07,
                    lineHeight: 1.08,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: fitted.fontSize,
                      fontWeight: 600,
                      letterSpacing: -fitted.fontSize * 0.025,
                      color: emphasis.includes(word)
                        ? "var(--brand-strong)"
                        : "var(--foreground)",
                      transform: `translateY(${mix(progress, 110, 0).toFixed(2)}%)`,
                    }}
                  >
                    {word}
                  </span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </SceneShell>
  );
}
