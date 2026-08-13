/**
 * Configuration that only means something inside the browser bundle.
 *
 * Anything meaningful outside the browser (the desktop app, the edge
 * functions, a server-side validator) belongs in `GlobalAppConfig`
 * (`shared/config/GlobalAppConfig.ts`) instead.
 */
export const WebAppConfig = {
  /**
   * The path and filename to the logo file relative to the `public/` directory.
   * The logo must be in the `public` directory.
   */
  // TODO(jpsyx): move this to an environment variable so it does not get
  // bundled in every page of the app
  logoFilename: "logoWhite.png",
} as const satisfies { logoFilename: string };
