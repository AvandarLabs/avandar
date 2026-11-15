/** shadcn and most Tailwind 3 setups store colours as bare channel triplets:
 *  `--background: 0 0% 100%`, and wrap them at every use site with
 *  `hsl(var(--background))`. Copied straight across, those land in this kit as
 *  `color: var(--background)`, which is not a colour at all: the token is
 *  invalid, the declaration is dropped, and the frame renders with the
 *  browser's default instead. It fails silently and it is the single most
 *  likely input this script gets.
 *
 *  So: learn the wrapper the source itself uses, and re-apply it here. */
export function detectWrapper(css) {
  for (const fn of ["hsl", "hsla", "rgb", "rgba", "oklch", "lab"]) {
    if (new RegExp(`${fn}\\(\\s*var\\(`).test(css)) return fn;
  }
  return null;
}

const BARE_TRIPLET =
  /^-?[\d.]+(deg|turn|rad)?\s+-?[\d.]+%?\s+-?[\d.]+%?(\s*\/\s*[\d.]+%?)?$/;

/** Check whether a custom property's value is a bare, unwrapped channel triplet. */
export const isBareChannels = (v) => BARE_TRIPLET.test(v.trim());
