import { WeaveBandPattern } from "../WeaveBandPattern";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ContributionWeave } from "../ContributionWeave";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof ContributionWeave>[0]["input"];
  id: Parameters<typeof ContributionWeave>[0]["id"];
  colors: Array<
    | Parameters<typeof ContributionWeave>[0]["accent"]
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["accentAlt"]
    | ReturnType<
        typeof GraphicThemeHooks.useGraphicTokens
      >["color"]["highlight"]
  >;
};

/** Renders the definitions with authored geometry. */
export function ContributionWeaveDefinitions({
  input,
  id,
  colors,
}: Readonly<Props>): ReactNode {
  return (
    <defs>
      {[...input.warp, ...input.weft].map((contributor, index) => {
        return (
          <WeaveBandPattern
            key={contributor.id}
            id={`${id}-band-${index}`}
            color={colors[index % 3]}
            pattern={contributor.pattern}
          />
        );
      })}
    </defs>
  );
}
