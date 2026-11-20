import { type TokenRow } from "../../tokenRows/tokenRows.types";
import { SketchPreview } from "../SketchPreview/SketchPreview";
import type { ResolvedSketchProfile } from "../../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

type Props = Readonly<{ row: TokenRow }>;
/**
 * The sketch preview of a sketch profile row, and nothing for any other row.
 */
export function CompositeSketchPreview({ row }: Props): ReactNode {
  return row.definition.kind === "sketchProfile" ? (
    <SketchPreview
      profile={row.resolved as ResolvedSketchProfile | undefined}
    />
  ) : null;
}
