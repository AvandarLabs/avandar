const BARE_TRIPLET =
  /^-?[\d.]+(deg|turn|rad)?\s+-?[\d.]+%?\s+-?[\d.]+%?(\s*\/\s*[\d.]+%?)?$/;

/**
 * The colour function the stylesheet wraps `var()` in, such as `hsl`, or
 * undefined. shadcn and most Tailwind 3 setups store colours as bare channel
 * triplets (`--background: 0 0% 100%`) and wrap them at every use site with
 * `hsl(var(--background))`. Copied straight across, those land in this kit
 * as `color: var(--background)`, which is not a colour: the declaration is
 * dropped and the frame renders with the browser's default. So adopt-theme
 * learns the wrapper the source uses and re-applies it.
 */
function _getColorWrapperFromCss(css: string): string | undefined {
  return ["hsl", "hsla", "rgb", "rgba", "oklch", "lab"].find(
    (colorFunction) => {
      return new RegExp(`${colorFunction}\\(\\s*var\\(`).test(css);
    },
  );
}

/** Whether a custom property's value is a bare, unwrapped channel triplet. */
function _isBareChannels(value: string): boolean {
  return BARE_TRIPLET.test(value.trim());
}

/** Identifies CSS color notation when adopting a product palette. */
export const ColorNotation = {
  /**
   * The colour function the stylesheet wraps `var()` in, such as `hsl`, or
   * undefined.
   */
  getColorWrapperFromCss: _getColorWrapperFromCss,
  /** Whether a custom property's value is a bare, unwrapped channel triplet. */
  isBareChannels: _isBareChannels,
};
