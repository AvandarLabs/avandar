import { getValueAtPath } from "../../getValueAtPath";
import { ThemeReferences } from "../../ThemeReferences/ThemeReferences";
import type { TokenReference } from "../../videoTheme.types";
import type { ResolutionContext } from "./ResolvedTokenTiers.types";

function _primaryColor(context: ResolutionContext): unknown {
  const shade = context.mantine.primaryShade;
  const index =
    typeof shade === "number"
      ? shade
      : context.isDarkGround
        ? shade.dark
        : shade.light;
  return context.mantine.colors[context.mantine.primaryColor]?.[index];
}
/** Looks up a referenced token in the current resolution tiers. */
export function getValueFromTokenReference({
  context,
  reference,
}: Readonly<{
  context: ResolutionContext;
  reference: TokenReference;
}>): unknown {
  const target = ThemeReferences.getTargetFromTokenReference(reference);
  if (target.tier === "primary") {
    return _primaryColor(context);
  }
  const source =
    target.tier === "mantine"
      ? context.mantine
      : target.tier === "atomic"
        ? context.atomic
        : context.semantic;
  return getValueAtPath({
    source,
    path: target.path,
  });
}
