import {
  ALPHA_RELEASE_LINE,
  MAINLINE_RELEASE_LINE,
} from "@ava-cli/ReleaseCli/getReleaseLineFromBranch/getReleaseLineFromBranch";
import { promptForVersion } from "@ava-cli/ReleaseCli/releasePromptHelpers";
import {
  resolveNextVersion,
  resolveReleaseVersion,
} from "@ava-cli/ReleaseCli/runRelease/resolveVersionHelpers/resolveVersionHelpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@ava-cli/ReleaseCli/releasePromptHelpers");

describe("version prompts", () => {
  beforeEach(() => {
    vi.mocked(promptForVersion).mockResolvedValue("0.15.0");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tells the reviewer -alpha is added when asking for an alpha release version", async () => {
    await resolveReleaseVersion({
      line: ALPHA_RELEASE_LINE,
      provided: undefined,
      suggested: "0.15.0",
      assumeYes: false,
    });

    expect(promptForVersion).toHaveBeenCalledExactlyOnceWith({
      message:
        "What version number do you want for this release? (-alpha is added automatically)",
      defaultValue: "0.15.0",
      label: "The release version",
    });
  });

  it("asks for a mainline release version with no suffix note", async () => {
    await resolveReleaseVersion({
      line: MAINLINE_RELEASE_LINE,
      provided: undefined,
      suggested: "0.14.2",
      assumeYes: false,
    });

    expect(promptForVersion).toHaveBeenCalledExactlyOnceWith({
      message: "What version number do you want for this release?",
      defaultValue: "0.14.2",
      label: "The release version",
    });
  });

  it("names alpha-dev when asking for the next version on the alpha line", async () => {
    await resolveNextVersion({
      line: ALPHA_RELEASE_LINE,
      provided: undefined,
      releaseVersion: "0.15.0",
      assumeYes: false,
    });

    expect(promptForVersion).toHaveBeenCalledExactlyOnceWith({
      message: "Which version should alpha-dev move to next?",
      defaultValue: "0.15.1",
      label: "The next version",
    });
  });
});
