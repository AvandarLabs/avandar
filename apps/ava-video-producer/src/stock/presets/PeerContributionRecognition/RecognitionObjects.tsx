import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PeerContributionRecognition.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Fixed authored objects keep named authorship beneath each visible work. */
export function RecognitionObjects({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.contributions.map((item, index) => {
        const x = input.contributions.length === 1 ? 400 : 300 + index * 220;
        const focused = item.id === input.focusedContributionId;
        return (
          <g
            key={item.id}
            data-contribution-id={item.id}
            opacity={ramp(frame, 16 + index * 2, 12)}
          >
            <g data-contribution-caption={item.id}>
              <LabelSlots labels={[[item.label, x - 10, 145, 180, 16, 4]]} />
            </g>
            <rect
              data-focused-object={focused ? item.id : undefined}
              x={x}
              y={230}
              width={160}
              height={100}
              rx={item.artifact === "repair" ? 24 : 4}
              stroke={focused ? accent : STOCK.line}
              strokeWidth={2}
              fill={STOCK.surface}
            />
            {item.artifact === "guide" ? (
              <path
                d={`M${x + 22} 250 h110 M${x + 22} 270 h95 M${x + 22} 290 h105`}
                stroke={STOCK.muted}
                fill="none"
              />
            ) : item.artifact === "repair" ? (
              <path
                d={`M${x + 35} 280 h90 M${x + 75} 250 v60 M${x + 85} 250 v60`}
                stroke={accent}
                strokeWidth={6}
                fill="none"
              />
            ) : (
              <path
                d={`M${x + 25} 305 l45 -50 l60 50 Z M${x + 70} 255 v50`}
                stroke={accent}
                strokeWidth={2}
                fill="none"
              />
            )}
            {input.showAuthorshipTab ? (
              <g data-authorship-tab={item.id}>
                <path
                  d={`M${x + 4} 330 v14 h150`}
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
