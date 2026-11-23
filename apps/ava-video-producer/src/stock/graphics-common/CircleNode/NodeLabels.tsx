import { Text } from "../Text";
import type { Props as NodeProps, NodeRingsData } from "./CircleNode.types";
import type { ReactNode } from "react";

type Props = Pick<NodeProps, "x" | "y" | "label" | "detail"> &
  Pick<NodeRingsData, "nodeRadius" | "node">;
/** Renders CircleNode's label and optional detail below its core. */
export function NodeLabels(props: Readonly<Props>): ReactNode {
  return (
    <>
      <Text
        role="label"
        x={props.x}
        y={props.y + props.nodeRadius + props.node.labelOffset}
        anchor="middle"
      >
        {props.label}
      </Text>
      {props.detail ? (
        <Text
          role="detail"
          x={props.x}
          y={props.y + props.nodeRadius + props.node.detailOffset}
          anchor="middle"
        >
          {props.detail}
        </Text>
      ) : null}
    </>
  );
}
