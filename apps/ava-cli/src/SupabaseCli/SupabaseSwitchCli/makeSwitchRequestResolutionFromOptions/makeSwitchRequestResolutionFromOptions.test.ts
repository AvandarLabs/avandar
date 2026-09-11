/**
 * One switch per branch: create, reuse, or confirm before reusing.
 */
import { makeSwitchRequestResolutionFromOptions } from "@ava-cli/SupabaseCli/SupabaseSwitchCli/makeSwitchRequestResolutionFromOptions/makeSwitchRequestResolutionFromOptions";
import { describe, expect, it } from "vitest";

describe("makeSwitchRequestResolutionFromOptions", () => {
  it("creates a kebab-cased id from the branch when none is requested and no switch exists", () => {
    expect(
      makeSwitchRequestResolutionFromOptions({
        branch: "feat/nux",
        requestedProjectId: undefined,
        existingProjectId: undefined,
      }),
    ).toEqual({ kind: "create", temporaryProjectId: "feat-nux" });
  });

  it("creates the requested id when no switch exists", () => {
    expect(
      makeSwitchRequestResolutionFromOptions({
        branch: "feat/nux",
        requestedProjectId: "feat-other",
        existingProjectId: undefined,
      }),
    ).toEqual({ kind: "create", temporaryProjectId: "feat-other" });
  });

  it("reuses the existing switch when the requested id matches it", () => {
    expect(
      makeSwitchRequestResolutionFromOptions({
        branch: "feat/nux",
        requestedProjectId: "feat-nux",
        existingProjectId: "feat-nux",
      }),
    ).toEqual({ kind: "reuse", existingProjectId: "feat-nux" });
  });

  it("asks to reuse when a different id is requested", () => {
    expect(
      makeSwitchRequestResolutionFromOptions({
        branch: "feat/nux",
        requestedProjectId: "feat-other",
        existingProjectId: "feat-nux",
      }),
    ).toEqual({ kind: "confirmReuse", existingProjectId: "feat-nux" });
  });

  it("asks to reuse when no id is requested and a switch already exists", () => {
    expect(
      makeSwitchRequestResolutionFromOptions({
        branch: "feat/nux",
        requestedProjectId: undefined,
        existingProjectId: "feat-nux",
      }),
    ).toEqual({ kind: "confirmReuse", existingProjectId: "feat-nux" });
  });
});
