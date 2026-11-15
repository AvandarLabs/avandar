import { prop } from "@avandar/utils";
import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getPhrasePositionsFromSentenceParts } from "./getPhrasePositionsFromSentenceParts";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  background: string;
};
/** Exact fragments stay in place while only mapped fragments are underlined. */
export function SourceSentence({
  frame,
  input,
  accent,
  background,
}: Readonly<Props>): ReactNode {
  const mapped = new Set(
    [
      ...input.draft.entities,
      ...input.draft.relationships,
      ...input.draft.attributes,
    ].map(prop("partId")),
  );
  const parts = getPhrasePositionsFromSentenceParts(input.sentenceParts);
  return (
    <g aria-label={input.sentenceParts.map(prop("text")).join("")}>
      <rect
        data-source-backing="true"
        x={44}
        y={96}
        width={896}
        height={Math.max(...parts.map(prop("y"))) - 96 + 14}
        fill={background}
      />
      {parts.map((part) => (
        <g key={part.id} data-source-fragment={part.id}>
          <text
            aria-label={part.text}
            x={part.x}
            y={part.y}
            fill={STOCK.text}
            fontSize={12}
            fontFamily="Arial, sans-serif"
            xmlSpace="preserve"
          >
            {part.text}
          </text>
          {mapped.has(part.id) ? (
            <path
              d={`M${part.x} ${part.y + 8} h${part.width * ramp(frame, 12, 36)}`}
              stroke={accent}
              strokeWidth={2}
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
