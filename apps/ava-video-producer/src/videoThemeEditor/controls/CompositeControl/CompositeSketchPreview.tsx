import { SketchPreview } from "../SketchPreview/SketchPreview";
import type { ResolvedSketchProfile } from "../../../videoTheme/videoTheme.types";
import type { TokenRow } from "../../tokenRows/tokenRows";

type Props = Readonly<{ row: TokenRow }>;

/** The sketch preview of a sketch profile row, and nothing for any other row. */
export function CompositeSketchPreview({ row }: Props) {
  return row.definition.kind === "sketchProfile" ? (
    <SketchPreview
      profile={row.resolved as ResolvedSketchProfile | undefined}
    />
  ) : null;
}
