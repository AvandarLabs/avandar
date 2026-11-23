import { DraftSlip } from "../DraftSlip/DraftSlip";
import type { getDraftModelLayout } from "./getDraftModelLayout";
import type { ReactNode } from "react";

type Props = Pick<ReturnType<typeof getDraftModelLayout>, "input" | "scene">;
/** Render the draft attribute slips. */
export function DraftAttributeSlips(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.input.draft.attributes.map((attribute) => {
        return (
          <DraftSlip
            key={attribute.id}
            item={attribute}
            index={3}
            {...props.scene}
            x={
              props.input.modelLayout === "horizontal"
                ? attribute.entityId === props.input.draft.entities[0].id
                  ? 60
                  : 670
                : 690
            }
            y={404}
            role={props.input.copy.attribute}
          />
        );
      })}
    </>
  );
}
