import { propEq } from "@avandar/utils";
import { STOCK } from "../../stockPalette";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";

type Props = { input: Input; stacked: boolean };
/** Attribute connectors lead only to their supplied owning entity. */
export function AttributeAttachments({
  input,
  stacked,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {input.draft.attributes.map((attribute) => {
        const index = input.draft.entities.findIndex(
          propEq("id", attribute.entityId),
        );
        return (
          <path
            key={attribute.id}
            data-attribute-attachment={attribute.entityId}
            d={
              stacked
                ? `M314 ${314 + index * 120} H340 V490 H690`
                : `M${175 + index * 610} 381 V404`
            }
            fill="none"
            stroke={STOCK.orange}
          />
        );
      })}
    </g>
  );
}
