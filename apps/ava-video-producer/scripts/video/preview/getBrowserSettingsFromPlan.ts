import { productRequirements } from "../../lib/productRequirements/productRequirements";
import type { Storyboard } from "../../../src/storyboard/schema/schema";

/**
 * The browser and Chromium options a preview uses to open its browser and
 * render its stills. Native MapLibre needs ANGLE on macOS Headless Shell:
 * the default SwiftShader can fail WebGL2 context creation. This does not
 * replace serial rendering.
 */
export function getBrowserSettingsFromPlan(plan: Storyboard) {
  const browserOptions = process.env.CHROME_PATH
    ? {
        browserExecutable: process.env.CHROME_PATH,
        chromeMode: "chrome-for-testing" as const,
      }
    : { chromeMode: "headless-shell" as const };
  const chromiumOptions = {
    headless: true,
    ...(productRequirements(plan).needsMap ? { gl: "angle" as const } : {}),
  };
  return { browserOptions, chromiumOptions };
}
