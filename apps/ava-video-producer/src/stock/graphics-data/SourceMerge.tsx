import {
  Arrive,
  Curve,
  DrawPath,
  Eyebrow,
  Packet,
  Panel,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const SOURCES = [
  { name: "Records", kind: "CSV", y: 148, color: STOCK.cyan },
  { name: "Events", kind: "API", y: 280, color: STOCK.mint },
  { name: "Documents", kind: "TXT", y: 412, color: STOCK.orange },
] as const;

export function SourceMerge({ frame, accent }: GraphicProps) {
  return (
    <g>
      <Eyebrow>UNIFY THE INPUTS</Eyebrow>
      {SOURCES.map((source, i) => {
        const from = { x: 290, y: source.y + 43 };
        const to = { x: 491, y: 323 };
        const color = i === 1 ? accent : source.color;
        return (
          <g key={source.name}>
            <DrawPath
              d={Curve({ from, to })}
              frame={frame}
              at={24 + i * 3}
              color={color}
              opacity={0.42}
            />
            <Packet
              frame={frame}
              from={from}
              to={to}
              color={color}
              delay={i * 22}
            />
            <Arrive frame={frame} index={i}>
              <Panel x={64} y={source.y} width={226} height={86}>
                <rect
                  x={81}
                  y={source.y + 20}
                  width={46}
                  height={46}
                  rx={10}
                  fill={color}
                  fillOpacity={0.07}
                  stroke={color}
                  strokeOpacity={0.3}
                />
                <Text
                  x={104}
                  y={source.y + 49}
                  size={13}
                  anchor="middle"
                  fill={color}
                  mono
                >
                  {source.kind}
                </Text>
                <Text x={143} y={source.y + 49} size={21}>
                  {source.name}
                </Text>
              </Panel>
            </Arrive>
          </g>
        );
      })}
      <DrawPath
        d="M525 323 H662"
        frame={frame}
        at={40}
        color={accent}
        opacity={0.5}
        width={3}
      />
      <Packet
        frame={frame}
        from={{ x: 525, y: 323 }}
        to={{ x: 662, y: 323 }}
        color={accent}
        period={60}
        delay={31}
      />
      <Arrive frame={frame} at={24}>
        <circle
          cx={508}
          cy={323}
          r={39}
          fill={STOCK.surface}
          stroke={accent}
          strokeOpacity={0.65}
        />
        <path
          d="M493 314 L508 329 L523 314 M508 300 V329 M508 329 V344"
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Text x={508} y={394} size={15} anchor="middle" fill={STOCK.muted}>
          MERGE
        </Text>
      </Arrive>
      <Arrive frame={frame} at={34}>
        <Panel x={662} y={233} width={234} height={180} stroke={accent}>
          <rect
            x={682}
            y={252}
            width={194}
            height={6}
            rx={3}
            fill={accent}
            fillOpacity={0.8}
          />
          <Text x={779} y={305} size={25} weight={600} anchor="middle">
            One dataset
          </Text>
          <Text x={779} y={336} size={16} fill={STOCK.muted} anchor="middle">
            A shared structure
          </Text>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={695 + i * 59}
                y={361}
                width={45}
                height={26}
                rx={5}
                fill={accent}
                fillOpacity={0.12}
              />
              <path
                d={`M${706 + i * 59} 374 h23`}
                stroke={accent}
                strokeOpacity={0.6}
                strokeWidth={2}
              />
            </g>
          ))}
        </Panel>
      </Arrive>
      <Text x={896} y={552} size={13} fill={STOCK.muted} anchor="end" mono>
        CONCEPTUAL DATA FLOW
      </Text>
    </g>
  );
}
