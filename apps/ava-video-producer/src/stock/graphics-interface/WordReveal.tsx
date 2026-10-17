import { DUR, EASE, mix, ramp } from "../../motion";
import { Eyebrow, STOCK, Text, type GraphicProps } from "../graphics-common";

const REVEAL_WORDS = [
  {
    word: "Make",
    x: 76,
    y: 263,
    size: 91,
    width: 232,
    at: 15,
    accented: false,
  },
  {
    word: "ideas",
    x: 329,
    y: 263,
    size: 91,
    width: 236,
    at: 23,
    accented: false,
  },
  {
    word: "move.",
    x: 72,
    y: 417,
    size: 137,
    width: 414,
    at: 36,
    accented: true,
  },
];

export function WordReveal({ frame, accent, id }: GraphicProps) {
  return (
    <g>
      <defs>
        {REVEAL_WORDS.map((word, i) => (
          <clipPath id={`${id}-word-${i}`} key={word.word}>
            <rect
              x={word.x - 2}
              y={word.y - word.size}
              width={word.width}
              height={word.size + 8}
            />
          </clipPath>
        ))}
      </defs>
      <Eyebrow x={80}>MASKED WORD REVEAL</Eyebrow>
      {REVEAL_WORDS.map((word, i) => (
        <g key={word.word} clipPath={`url(#${id}-word-${i})`}>
          <g
            transform={`translate(0 ${mix(ramp(frame, word.at, DUR.word, EASE.word), word.size * 1.12, 0)})`}
          >
            <Text
              x={word.x}
              y={word.y}
              size={word.size}
              fill={word.accented ? accent : STOCK.text}
              weight={600}
            >
              {word.word}
            </Text>
          </g>
        </g>
      ))}
      <g opacity={ramp(frame, 51, DUR.sheet)}>
        <path
          d="M691 189 H827 V325 M826 189 L667 349"
          fill="none"
          stroke={accent}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={667} cy={349} r={5} fill={accent} />
        <path
          d="M666 189 V136 M666 189 H613"
          stroke={STOCK.line}
          strokeWidth={1.5}
        />
      </g>
      <rect
        x={80}
        y={452}
        width={745 * ramp(frame, 62, DUR.hero)}
        height={2}
        fill={STOCK.line}
      />
      <g opacity={ramp(frame, 73, DUR.sheet)}>
        <Text x={80} y={506} size={18} fill={STOCK.muted}>
          Kinetic typography, one word at a time.
        </Text>
        <Text x={80} y={550} size={12} fill={STOCK.muted} mono>
          TRANSLATION + MASK · FIXED TYPE SIZE
        </Text>
      </g>
    </g>
  );
}
