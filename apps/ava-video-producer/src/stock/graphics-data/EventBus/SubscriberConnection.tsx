import { Arrive } from "../../graphics-common/Arrive/Arrive";
import { DrawPath } from "../../graphics-common/DrawPath";
import { Packet } from "../../graphics-common/Packet/Packet";
import { Panel } from "../../graphics-common/Panel";
import { Text } from "../../graphics-common/Text";
import type { SubscriberConnectionData } from "./EventBus.types";
import type { ReactNode } from "react";

type Props = SubscriberConnectionData;

/** Renders the subscriber connection layer for EventBus. */
export function SubscriberConnection(options: Readonly<Props>): ReactNode {
  return (
    <>
      <DrawPath
        d={`M${options.center} 335 V418`}
        frame={options.frame}
        at={35 + options.i * 4}
        color={options.color.highlight}
        opacity={options.atomic.opacity["45"]}
      />
      {options.input.showPackets ? (
        <Packet
          frame={options.frame}
          from={options.from}
          to={options.to}
          color={options.color.highlight}
          delay={options.i * 24 + 34}
          period={80}
        />
      ) : null}
      <Arrive frame={options.frame} index={options.i} at={26}>
        <Panel x={options.x} y={418} width={120} height={72}>
          <Text role="itemLabel" x={options.center} y={460} anchor="middle">
            {options.name}
          </Text>
        </Panel>
      </Arrive>
    </>
  );
}
