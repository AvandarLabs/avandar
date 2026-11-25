import { ObjectGlyph } from "../../../primitives/ObjectGlyph/ObjectGlyph";
import { SceneLabel } from "../SceneLabel";
import { type Props as CustodyLaneProps } from "./CustodyLaneShared.types";
import type { ReactNode } from "react";

type Props = {
  crate: CustodyLaneProps["crate"];
  x: number;
  y: number;
  accent: string;
  showIdentity: boolean;
};
/** The container itself, with its identity ribbon when shown. */
export function MovingContainer({
  crate,
  x,
  y,
  accent,
  showIdentity,
}: Readonly<Props>): ReactNode {
  return (
    <g data-moving-container={crate.id} transform={`translate(${x} ${y})`}>
      <ObjectGlyph
        kind={crate.kind === "carrier" ? "resource" : "box"}
        x={0}
        y={0}
        size={26}
        color={accent}
      />
      {showIdentity ? (
        <SceneLabel text={crate.id} x={22} y={-5} width={185} lines={2} />
      ) : undefined}
    </g>
  );
}
