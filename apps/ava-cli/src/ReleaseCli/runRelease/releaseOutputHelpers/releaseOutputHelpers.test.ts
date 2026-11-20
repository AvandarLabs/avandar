import {
  ALPHA_RELEASE_LINE,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { buildReleaseBanner } from "@ava-cli/ReleaseCli/runRelease/releaseOutputHelpers/releaseOutputHelpers";
import { describe, expect, it } from "vitest";

describe("buildReleaseBanner", () => {
  it("announces an alpha release to production in yellow", () => {
    expect(buildReleaseBanner(ALPHA_RELEASE_LINE)).toBe(
      "|bright_yellow|ALPHA release|reset|: alpha-dev to alpha. Deploys PRODUCTION (app.avandarlabs.com).",
    );
  });

  it("announces a mainline release in cyan", () => {
    expect(buildReleaseBanner(MAINLINE_RELEASE_LINE)).toBe(
      "|bright_cyan|MAINLINE release|reset|: develop to main. Deploys the mainline test URL, not production.",
    );
  });
});
