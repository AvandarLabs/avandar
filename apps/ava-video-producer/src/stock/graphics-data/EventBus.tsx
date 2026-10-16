import {
  Arrive,
  DrawPath,
  Eyebrow,
  Packet,
  Panel,
  STOCK,
  Text,
  type GraphicProps,
} from "../graphics-common";

const EVENT_PRODUCERS = ["Create", "Update", "Archive"];
const EVENT_CONSUMERS = ["Log", "Index", "Notify"];

export function EventBus({ frame, accent }: GraphicProps) {
  return (
    <g>
      <Eyebrow>EVENT BUS</Eyebrow>
      <rect
        x={136}
        y={277}
        width={688}
        height={58}
        rx={29}
        fill={accent}
        fillOpacity={0.045}
        stroke={accent}
        strokeOpacity={0.35}
      />
      <path
        d="M165 306 H794"
        stroke={accent}
        strokeOpacity={0.4}
        strokeWidth={2}
      />
      {[0, 1, 2, 3].map((i) => (
        <Packet
          key={i}
          frame={frame}
          from={{ x: 165, y: 306 }}
          to={{ x: 794, y: 306 }}
          delay={i * 25}
          period={100}
          color={accent}
          radius={4.5}
        />
      ))}
      {EVENT_PRODUCERS.map((name, i) => {
        const x = 160 + i * 260;
        const center = x + 60;
        const to = { x: center, y: 277 };
        const from = { x: center, y: 193 };
        return (
          <g key={name}>
            <DrawPath
              d={`M${center} 193 V277`}
              frame={frame}
              at={23 + i * 4}
              color={STOCK.cyan}
              opacity={0.5}
            />
            <Packet
              frame={frame}
              from={from}
              to={to}
              color={STOCK.cyan}
              delay={i * 24}
              period={80}
            />
            <Arrive frame={frame} index={i}>
              <Panel x={x} y={121} width={120} height={72}>
                <Text x={center} y={163} size={21} anchor="middle">
                  {name}
                </Text>
              </Panel>
            </Arrive>
            <Text
              x={center}
              y={101}
              size={11}
              fill={STOCK.muted}
              anchor="middle"
              mono
            >
              PRODUCER 0{i + 1}
            </Text>
          </g>
        );
      })}
      {EVENT_CONSUMERS.map((name, i) => {
        const x = 160 + i * 260;
        const center = x + 60;
        const from = { x: center, y: 335 };
        const to = { x: center, y: 418 };
        return (
          <g key={name}>
            <DrawPath
              d={`M${center} 335 V418`}
              frame={frame}
              at={35 + i * 4}
              color={STOCK.orange}
              opacity={0.45}
            />
            <Packet
              frame={frame}
              from={from}
              to={to}
              color={STOCK.orange}
              delay={i * 24 + 34}
              period={80}
            />
            <Arrive frame={frame} index={i} at={26}>
              <Panel x={x} y={418} width={120} height={72}>
                <Text x={center} y={460} size={21} anchor="middle">
                  {name}
                </Text>
              </Panel>
            </Arrive>
            <Text
              x={center}
              y={520}
              size={11}
              fill={STOCK.muted}
              anchor="middle"
              mono
            >
              SUBSCRIBER 0{i + 1}
            </Text>
          </g>
        );
      })}
    </g>
  );
}
