import { SketchedShape } from "../../../../primitives/SketchedShape";
import type { getRecognitionObjectLayout } from "./getRecognitionObjectLayout";
import type { ReactNode } from "react";
/** The repair mark's line weight before the line weight scales it. */
const REPAIR_STROKE = 6;
type Props = Pick<
  ReturnType<typeof getRecognitionObjectLayout>,
  "item" | "x" | "tokens" | "accent" | "scales" | "lineWidth"
>;
/** Render the recognition artifact glyph. */
export function RecognitionArtifactGlyph(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.item.artifact === "guide" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${props.x + 22} 250 h110 M${props.x + 22} 270 h95 M${props.x + 22} 290 h105`,
          }}
          profile={props.tokens.sketch.shape}
          stroke={props.tokens.color.inactive}
          fill="none"
        />
      ) : props.item.artifact === "repair" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${props.x + 35} 280 h90 M${props.x + 75} 250 v60 M${props.x + 85} 250 v60`,
          }}
          profile={props.tokens.sketch.shape}
          stroke={props.accent}
          strokeWidth={props.scales.stroke(REPAIR_STROKE)}
          fill="none"
        />
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${props.x + 25} 305 l45 -50 l60 50 Z M${props.x + 70} 255 v50`,
          }}
          profile={props.tokens.sketch.shape}
          stroke={props.accent}
          strokeWidth={props.lineWidth}
          fill="none"
        />
      )}
    </>
  );
}
