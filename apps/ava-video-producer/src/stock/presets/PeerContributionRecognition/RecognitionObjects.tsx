import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PeerContributionRecognition.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** A repair object's rounded corner before the corner style scales it. */
const REPAIR_CORNER = 24;
/** The repair mark's line weight before the line weight scales it. */
const REPAIR_STROKE = 6;
/** Fixed authored objects keep named authorship beneath each visible work. */
export function RecognitionObjects({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const lineWidth = scales.stroke(tokens.stroke.default);
  return (
    <g>
      {input.contributions.map((item, index) => {
        const x = input.contributions.length === 1 ? 400 : 300 + index * 220;
        const focused = item.id === input.focusedContributionId;
        return (
          <g
            key={item.id}
            data-contribution-id={item.id}
            opacity={motion.reveal(frame, 16 + index * motion.stagger.list)}
          >
            <g data-contribution-caption={item.id}>
              <LabelSlots labels={[[item.label, x - 10, 145, 180, 16, 4]]} />
            </g>
            <StockRect
              data-focused-object={focused ? item.id : undefined}
              x={x}
              y={230}
              width={160}
              height={100}
              rx={scales.corner(
                item.artifact === "repair" ? REPAIR_CORNER : tokens.corner.chip,
              )}
              stroke={focused ? accent : tokens.color.line}
              strokeWidth={lineWidth}
              fill={tokens.color.surface}
            />
            {item.artifact === "guide" ? (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${x + 22} 250 h110 M${x + 22} 270 h95 M${x + 22} 290 h105`,
                }}
                profile={tokens.sketch.shape}
                stroke={tokens.color.inactive}
                fill="none"
              />
            ) : item.artifact === "repair" ? (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${x + 35} 280 h90 M${x + 75} 250 v60 M${x + 85} 250 v60`,
                }}
                profile={tokens.sketch.shape}
                stroke={accent}
                strokeWidth={scales.stroke(REPAIR_STROKE)}
                fill="none"
              />
            ) : (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${x + 25} 305 l45 -50 l60 50 Z M${x + 70} 255 v50`,
                }}
                profile={tokens.sketch.shape}
                stroke={accent}
                strokeWidth={lineWidth}
                fill="none"
              />
            )}
            {input.showAuthorshipTab ? (
              <g data-authorship-tab={item.id}>
                <SketchedShape
                  shape={{ kind: "path", d: `M${x + 4} 330 v14 h150` }}
                  profile={tokens.sketch.shape}
                  fill="none"
                  stroke={accent}
                />
                <LabelSlots
                  labels={[[input.people.contributor, x, 365, 180, 14, 3]]}
                />
              </g>
            ) : focused ? (
              <g data-authorship-byline="true">
                <LabelSlots
                  labels={[[input.people.contributor, x, 365, 180, 14, 3]]}
                />
              </g>
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
