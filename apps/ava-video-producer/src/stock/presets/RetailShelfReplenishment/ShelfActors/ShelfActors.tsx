import { ShelfActor } from "../ShelfActor/ShelfActor";
import { useShelfActorsPresentation } from "./useShelfActorsPresentation";
import type { Input } from "../RetailShelfReplenishment.schema.ts";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Pointing and handling hands stay tied to the actual gaps and unit poses. */
export function ShelfActors(props: Readonly<Props>): ReactNode {
  const presentation = useShelfActorsPresentation(props);

  return (
    <g>
      {" "}
      <ShelfActor
        role="retailer"
        x={630}
        y={presentation.loading ? presentation.loading.y - 45 : 212}
        handX={
          presentation.loading
            ? presentation.loading.x + 12
            : presentation.orderHandX
        }
        handY={
          presentation.loading
            ? presentation.loading.y
            : presentation.orderHandY
        }
        accent={props.accent}
      />
      <ShelfActor
        role="shopper"
        x={presentation.selecting ? 630 : 860}
        y={presentation.selecting ? presentation.selecting.y - 42 : 478}
        handX={presentation.selecting ? presentation.selecting.x + 12 : 840}
        handY={presentation.selecting ? presentation.selecting.y : 470}
        accent={presentation.tokens.color.highlight}
      />
    </g>
  );
}
