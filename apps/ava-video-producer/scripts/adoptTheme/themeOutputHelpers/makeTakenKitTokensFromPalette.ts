import { ColorNotation } from "../ColorNotation";
import { getAliasValueFromPalette } from "../getAliasValueFromPalette";
import { KIT_TOKENS } from "./themeOutputPalette";
import type { AliasHit, Palette } from "../adoptTheme.types";

/** A kit token taken from the source palette, with how it was written. */
type TakenToken = {
  kitToken: string;
  from: string;
  value: string;
  isWrapped: boolean;
};

/** A source value, wrapped in the stylesheet's colour function when bare. */
function _wrapValue(
  options: Readonly<{
    aliasMatch: Readonly<AliasHit>;
    kitToken: string;
    wrapper: string | undefined;
  }>,
): {
  value: string;
  isWrapped: boolean;
} {
  const { aliasMatch, kitToken, wrapper } = options;
  // --radius is a length, never a colour: wrapping it would produce
  // `hsl(1rem)`. Everything else in KIT_TOKENS is a colour.
  if (
    kitToken === "--radius" ||
    !ColorNotation.isBareChannels(aliasMatch.value)
  ) {
    return { value: aliasMatch.value, isWrapped: false };
  }
  if (wrapper) {
    return { value: `${wrapper}(${aliasMatch.value})`, isWrapped: true };
  }
  console.error(
    `adopt-theme: ${aliasMatch.from} looks like bare channels (${aliasMatch.value}) but the stylesheet never wraps a var() in a colour function, so there is no way to tell hsl from rgb. Copied as-is — check it.`,
  );
  return { value: aliasMatch.value, isWrapped: false };
}

/**
 * Matched palette records read by makeKitTokensFromPalette when building
 * its CSS values and source-match report.
 */
export function makeTakenKitTokensFromPalette({
  primary,
  wrapper,
}: Readonly<{
  primary: Readonly<Palette>;
  wrapper: string | undefined;
}>): TakenToken[] {
  return KIT_TOKENS.flatMap((kitToken) => {
    const aliasMatch = getAliasValueFromPalette({
      palette: primary,
      kitToken,
    });
    return aliasMatch
      ? [
          {
            kitToken,
            from: aliasMatch.from,
            ..._wrapValue({ aliasMatch, kitToken, wrapper }),
          },
        ]
      : [];
  });
}
