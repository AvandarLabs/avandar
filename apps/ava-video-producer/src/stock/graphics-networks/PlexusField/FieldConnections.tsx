import { Text } from "../../graphics-common/Text";
import { FieldConnection } from "./FieldConnection";
import { HEADING_Y } from "./PlexusField.constants";
import type { Drawing } from "./PlexusField.types";
import type { ReactNode } from "react";

type Props = Drawing;

/** Renders the field connections layer for PlexusField. */
export function FieldConnections(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text role="heading" x={props.margin} y={HEADING_Y}>
        {props.input.heading}
      </Text>
      {props.input.showConnections
        ? props.points.flatMap((source, sourceIndex) => {
            return props.points
              .slice(sourceIndex + 1)
              .map((target, targetOffset) => {
                return (
                  <FieldConnection
                    key={`${sourceIndex}-${targetOffset}`}
                    {...{
                      ...props,
                      source,
                      target,
                      sourceIndex,
                      targetOffset,
                    }}
                  />
                );
              });
          })
        : null}
    </>
  );
}
