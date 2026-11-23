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

  it("asks for the release version", async () => {
    await resolveReleaseVersion({
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

  it("names develop when asking for the next version", async () => {
    await resolveNextVersion({
      provided: undefined,
      releaseVersion: "0.15.0",
      assumeYes: false,
    });

    expect(promptForVersion).toHaveBeenCalledExactlyOnceWith({
      message: "Which version should develop move to next?",
      defaultValue: "0.15.1",
      label: "The next version",
    });
  });
});
