import {
  suggestNextVersion,
  toDevVersion,
  toReleaseTag,
  toReleaseVersion,
  validateReleaseVersion,
} from "@ava-cli/ReleaseCli/releaseVersionUtils/releaseVersionUtils";
import { describe, expect, it } from "vitest";

describe("validateReleaseVersion", () => {
  it("accepts an X.Y.Z version", () => {
    expect(validateReleaseVersion("0.11.0", "Version")).toEqual({
      valid: true,
    });
    expect(validateReleaseVersion("10.0.123", "Version")).toEqual({
      valid: true,
    });
  });

  it("accepts a version with surrounding whitespace", () => {
    expect(validateReleaseVersion("  0.11.0 ", "Version")).toEqual({
      valid: true,
    });
  });

  it("rejects a v prefix, since the git tag adds it", () => {
    const result = validateReleaseVersion("v0.11.0", "Version");

    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain(
      'must not start with "v"',
    );
  });

  it("rejects a dev suffix, since it is added automatically", () => {
    const result = validateReleaseVersion("0.11.0-dev", "Version");

    expect(result.valid).toBe(false);
    expect(result.valid === false && result.message).toContain(
      'must not end with "dev"',
    );
  });

  it("rejects anything that is not X.Y.Z", () => {
    expect(validateReleaseVersion("", "Version").valid).toBe(false);
    expect(validateReleaseVersion("0.11", "Version").valid).toBe(false);
    expect(validateReleaseVersion("0.11.0.1", "Version").valid).toBe(false);
    expect(validateReleaseVersion("0.11.x", "Version").valid).toBe(false);
    expect(validateReleaseVersion("0.11.0-rc.1", "Version").valid).toBe(false);
  });

  it("uses the label in the message", () => {
    const result = validateReleaseVersion("nope", "The next version");

    expect(result.valid === false && result.message).toContain(
      "The next version",
    );
  });
});

describe("toReleaseVersion", () => {
  it("strips the dev suffix develop carries", () => {
    expect(toReleaseVersion("0.10.2-dev")).toBe("0.10.2");
  });

  it("leaves a plain version alone", () => {
    expect(toReleaseVersion("0.10.2")).toBe("0.10.2");
  });
});

describe("suggestNextVersion", () => {
  it("bumps the patch", () => {
    expect(suggestNextVersion("0.10.2")).toBe("0.10.3");
    expect(suggestNextVersion("1.0.0")).toBe("1.0.1");
    expect(suggestNextVersion("0.9.9")).toBe("0.9.10");
  });

  it("accepts a dev version and bumps the release it implies", () => {
    expect(suggestNextVersion("0.10.2-dev")).toBe("0.10.3");
  });

  it("returns undefined when there is no sensible suggestion", () => {
    expect(suggestNextVersion("not-a-version")).toBeUndefined();
    expect(suggestNextVersion("0.10")).toBeUndefined();
  });
});

describe("toDevVersion and toReleaseTag", () => {
  it("formats the develop version and the tag", () => {
    expect(toDevVersion("0.10.3")).toBe("0.10.3-dev");
    expect(toReleaseTag("0.10.2")).toBe("v0.10.2");
  });
});
