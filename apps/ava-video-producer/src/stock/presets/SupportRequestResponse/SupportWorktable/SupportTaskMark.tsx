import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useSupportWorktablePresentation } from "./useSupportWorktablePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSupportWorktablePresentation>,
  "input" | "tokens" | "atomic"
>;
/** Render the support task mark. */
export function SupportTaskMark(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.input.task.kind === "document" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M350 325 h115 M350 340 h75 M480 340 h65" }}
          profile={props.tokens.sketch.shape}
          stroke={props.tokens.color.inactive}
          strokeDasharray={props.atomic.dash.long.join(" ")}
          fill="none"
        />
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: "M355 325 h60 v25 h-60 Z M475 325 h65 v25 h-65 Z M415 338 h60",
          }}
          profile={props.tokens.sketch.shape}
          stroke={props.tokens.color.inactive}
          strokeDasharray={props.tokens.dash.placeholder.join(" ")}
          fill="none"
        />
      )}
    </>
  );
}
