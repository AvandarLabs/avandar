import { EASE, ramp } from "../../motion";
import { Eyebrow, Pill, STOCK, Text, type GraphicProps } from "../graphics-common";
import { CodeWindow } from "./CodeWindow";

type CodeToken = { text: string; color: string };
const CODE_LINES: CodeToken[][] = [
  [
    { text: "const", color: STOCK.cyan },
    { text: " connect = ", color: STOCK.text },
    { text: "async", color: STOCK.cyan },
    { text: " (source) => {", color: STOCK.text },
  ],
  [
    { text: "  const", color: STOCK.cyan },
    { text: " rows = ", color: STOCK.text },
    { text: "await", color: STOCK.cyan },
    { text: " read(source);", color: STOCK.text },
  ],
  [
    { text: "  const", color: STOCK.cyan },
    { text: " clean = rows.", color: STOCK.text },
    { text: "map", color: STOCK.mint },
    { text: "(normalize);", color: STOCK.text },
  ],
  [
    { text: "  const", color: STOCK.cyan },
    { text: " ready = clean.", color: STOCK.text },
    { text: "filter", color: STOCK.mint },
    { text: "(isValid);", color: STOCK.text },
  ],
  [
    { text: "  return", color: STOCK.cyan },
    { text: " { status: ", color: STOCK.text },
    { text: '"ready"', color: STOCK.orange },
    { text: ", rows: ready };", color: STOCK.text },
  ],
  [{ text: "};", color: STOCK.text }],
];

export function CodeFocus({ frame, accent }: GraphicProps) {
  const line =
    1 +
    ramp(frame, 43, 13, EASE.inOut) +
    ramp(frame, 81, 13, EASE.inOut) +
    ramp(frame, 119, 13, EASE.inOut);
  const y = 189 + line * 46;
  return (
    <g>
      <Eyebrow>CODE FOCUS</Eyebrow>
      <Pill x={740} y={44} width={156} text="EXAMPLE CODE" color={accent} />
      <CodeWindow title="transform.example.ts">
        <rect
          x={84}
          y={y - 23}
          width={792}
          height={40}
          rx={7}
          fill={accent}
          fillOpacity={0.065}
        />
        <rect x={84} y={y - 23} width={3} height={40} rx={1.5} fill={accent} />
        {CODE_LINES.map((tokens, i) => (
          <g key={i}>
            <Text
              x={111}
              y={189 + i * 46}
              size={17}
              fill={STOCK.muted}
              mono
              anchor="end"
            >
              {i + 1}
            </Text>
            <text
              x={144}
              y={189 + i * 46}
              fontSize={21}
              fontFamily="'Courier New', monospace"
              xmlSpace="preserve"
            >
              {tokens.map((token, j) => (
                <tspan
                  key={j}
                  fill={token.color === STOCK.mint ? accent : token.color}
                >
                  {token.text}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        <path d="M84 478 H876" stroke={STOCK.line} />
        <circle cx={107} cy={500} r={3.5} fill={accent} />
        <Text x={122} y={505} size={13} mono fill={STOCK.muted}>
          Read → normalize → validate → return
        </Text>
      </CodeWindow>
    </g>
  );
}
