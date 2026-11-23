/**
 * Blur radii below this are invisible at delivery size, so no filter runs.
 * `HorizontalBlurFilter` reads it to skip rendering a filter that would not
 * show, and `getHorizontalBlurFilter` reads it to return no `filter` value.
 */
export const MIN_VISIBLE_BLUR = 0.25;
/**
 * The CSS `filter` value that applies a `HorizontalBlurFilter`, or undefined
 * when the blur is too small to see, so a resting layer is never filtered.
 */
export function getHorizontalBlurFilter({
  id,
  amount,
}: Readonly<{
  id: string;
  amount: number;
}>): string | undefined {
  return amount < MIN_VISIBLE_BLUR ? undefined : `url(#${id})`;
}
