import { DraftSlip } from "../DraftSlip/DraftSlip";
import type { getDraftModelLayout } from "./getDraftModelLayout";
import type { ReactNode } from "react";

type Props = Pick<ReturnType<typeof getDraftModelLayout>, "scene" | "input"> & {
  entity: ReturnType<
    typeof getDraftModelLayout
  >["input"]["draft"]["entities"][number];
  index: number;
};
/** Render one draft entity slip. */
export function DraftEntitySlip(props: Readonly<Props>): ReactNode {
  return (
    <DraftSlip
      key={props.entity.id}
      item={props.entity}
      index={props.index}
      {...props.scene}
      x={props.input.modelLayout === "horizontal" ? 60 + props.index * 610 : 60}
      y={
        props.input.modelLayout === "horizontal" ? 285 : 275 + props.index * 120
      }
      role={props.input.copy.entity}
    />
  );
}
