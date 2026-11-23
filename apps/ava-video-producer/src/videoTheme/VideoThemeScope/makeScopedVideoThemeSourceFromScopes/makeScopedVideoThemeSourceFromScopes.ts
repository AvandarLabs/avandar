import type {
  VideoThemeScope as Scope,
  VideoThemeSource,
} from "../../videoTheme.types";
/**
 * The source for an item nested inside another. The inner item's overrides
 * rank below the outer ones, so a composition's art direction wins over the
 * preset it contains; inner patches apply after outer patches, so explicit
 * content such as a stock `accent` prop wins over the surrounding draft.
 */
export function makeScopedVideoThemeSourceFromScopes({
  outer,
  inner,
}: Readonly<{
  outer: VideoThemeSource;
  inner: Scope;
}>): VideoThemeSource {
  return {
    library: outer.library,
    themeId: outer.themeId,
    scope: {
      overrideIds: [
        ...(inner.overrideIds ?? []),
        ...(outer.scope?.overrideIds ?? []),
      ],
      patches: [...(outer.scope?.patches ?? []), ...(inner.patches ?? [])],
    },
  };
}
