import { Arrive } from "../../graphics-common/Arrive/Arrive";
import { DrawPath } from "../../graphics-common/DrawPath";
import { Packet } from "../../graphics-common/Packet/Packet";
import { Panel } from "../../graphics-common/Panel";
import { Text } from "../../graphics-common/Text";
import type { ProducerConnectionData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = ProducerConnectionData;

/** Renders the producer connection layer for EventBus. */
export function ProducerConnection(options: Readonly<Props>): ReactNode {
  return (
    <>
      <DrawPath
        d={`M${options.center} 193 V277`}
        frame={options.frame}
        at={23 + options.i * 4}
        color={options.color.accentAlt}
        opacity={options.alpha.guide}
      />
      {options.input.showPackets ? (
        <Packet
          frame={options.frame}
          from={options.from}
          to={options.to}
          color={options.color.accentAlt}
          delay={options.i * 24}
          period={80}
        />
      ) : null}
      <Arrive frame={options.frame} index={options.i}>
        <Panel x={options.x} y={121} width={120} height={72}>
          <Text role="itemLabel" x={options.center} y={163} anchor="middle">
            {options.name}
          </Text>
        </Panel>
      </Arrive>
    </>
  );
}
