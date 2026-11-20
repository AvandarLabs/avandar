import { getStockDisplayCopyFromDescriptor } from "../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Arrive } from "../graphics-common/Arrive/Arrive";
import { DrawPath } from "../graphics-common/DrawPath";
import { Eyebrow } from "../graphics-common/Eyebrow";
import { Packet } from "../graphics-common/Packet";
import { Panel } from "../graphics-common/Panel";
import { Text } from "../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../primitives/SketchedShape";
import { StockRect } from "../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../graphics-common/graphicCommon.types";
import type { EventBusInput } from "../presets/EventBus/EventBus.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: EventBusInput };
const BUS_CORNER = 29;
const BUS_FILL_ALPHA = 0.045;
const ENDPOINT_NUMBER_SIZE = "11";
/** Draws the bounded authored event-bus study at an explicit frame. */
export function EventBus({ input, frame, accent }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, alpha, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const producers = input.producers;
  const subscribers = input.subscribers;
  return (
    <g>
      <Eyebrow>{input.heading}</Eyebrow>
      <StockRect
        x={136}
        y={277}
        width={688}
        height={58}
        rx={shapes.corner(BUS_CORNER)}
        fill={accent}
        fillOpacity={shapes.wash(BUS_FILL_ALPHA)}
        stroke={accent}
        strokeOpacity={atomic.opacity["35"]}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M165 306 H794" }}
        profile={sketch.shape}
        stroke={accent}
        strokeOpacity={alpha.dimmed}
        strokeWidth={shapes.stroke(stroke.default)}
      />
      {input.showPackets
        ? [0, 1, 2, 3].map((i) => {
            return (
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
            );
          })
        : null}
      {producers.map((name, i) => {
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
              color={color.accentAlt}
              opacity={alpha.guide}
            />
            {input.showPackets ? (
              <Packet
                frame={frame}
                from={from}
                to={to}
                color={color.accentAlt}
                delay={i * 24}
                period={80}
              />
            ) : null}
            <Arrive frame={frame} index={i}>
              <Panel x={x} y={121} width={120} height={72}>
                <Text role="itemLabel" x={center} y={163} anchor="middle">
                  {name}
                </Text>
              </Panel>
            </Arrive>
            <Text
              role="detail"
              x={center}
              y={101}
              size={ENDPOINT_NUMBER_SIZE}
              anchor="middle"
            >
              {getStockDisplayCopyFromDescriptor({
                descriptor: LEGACY_DISPLAY_COPY["event-bus"].producerNumber,
                values: { number: `0${i + 1}` },
              })}
            </Text>
          </g>
        );
      })}
      {subscribers.map((name, i) => {
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
              color={color.highlight}
              opacity={atomic.opacity["45"]}
            />
            {input.showPackets ? (
              <Packet
                frame={frame}
                from={from}
                to={to}
                color={color.highlight}
                delay={i * 24 + 34}
                period={80}
              />
            ) : null}
            <Arrive frame={frame} index={i} at={26}>
              <Panel x={x} y={418} width={120} height={72}>
                <Text role="itemLabel" x={center} y={460} anchor="middle">
                  {name}
                </Text>
              </Panel>
            </Arrive>
            <Text
              role="detail"
              x={center}
              y={520}
              size={ENDPOINT_NUMBER_SIZE}
              anchor="middle"
            >
              {getStockDisplayCopyFromDescriptor({
                descriptor: LEGACY_DISPLAY_COPY["event-bus"].subscriberNumber,
                values: { number: `0${i + 1}` },
              })}
            </Text>
          </g>
        );
      })}
    </g>
  );
}
