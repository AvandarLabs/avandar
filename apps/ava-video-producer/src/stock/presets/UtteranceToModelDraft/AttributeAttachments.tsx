import { propEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";

type Props = { input: Input; stacked: boolean };
/** Attribute connectors lead only to their supplied owning entity. */
export function AttributeAttachments({
  input,
  stacked,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      {input.draft.attributes.map((attribute) => {
        const index = input.draft.entities.findIndex(
          propEq("id", attribute.entityId),
        );
        return (
          <SketchedShape
            key={attribute.id}
            shape={{
              kind: "path",
              d: stacked
                ? `M314 ${314 + index * 120} H340 V490 H690`
                : `M${175 + index * 610} 381 V404`,
            }}
            profile={tokens.sketch.shape}
            data-attribute-attachment={attribute.entityId}
            fill="none"
            stroke={tokens.color.highlight}
          />
        );
      })}
    </g>
  );
}
