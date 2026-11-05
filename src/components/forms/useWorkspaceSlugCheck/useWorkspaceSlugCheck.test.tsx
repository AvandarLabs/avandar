import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import {
  getWorkspaceSlugFormatProblem,
  useWorkspaceSlugCheck,
} from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import { renderHook, TestProviders } from "@/test-utils";

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: { useValidateWorkspaceSlug: vi.fn() },
  };
});

type MutationOptions = {
  onSuccess: (
    result: { isValid: true } | { isValid: false; reason: string },
    variables: { workspaceSlug: string },
  ) => void;
  onError: (error: Error, variables: { workspaceSlug: string }) => void;
};

const validateSlug = vi.fn();
let mutationOptions: MutationOptions;

beforeEach(() => {
  validateSlug.mockReset();
  vi.mocked(WorkspaceClient.useValidateWorkspaceSlug).mockImplementation(((
    options: MutationOptions,
  ) => {
    mutationOptions = options;
    return [validateSlug, false];
  }) as unknown as typeof WorkspaceClient.useValidateWorkspaceSlug);
});

function _renderSlugCheck() {
  return renderHook(
    () => {
      return useWorkspaceSlugCheck();
    },
    { wrapper: TestProviders },
  );
}

describe("getWorkspaceSlugFormatProblem", () => {
  it("reports each format problem", () => {
    expect(getWorkspaceSlugFormatProblem("")).toBe("empty");
    expect(getWorkspaceSlugFormatProblem("ab")).toBe("too_short");
    expect(getWorkspaceSlugFormatProblem("a".repeat(21))).toBe("too_long");
    expect(getWorkspaceSlugFormatProblem("nyc measles")).toBe(
      "invalid_characters",
    );
    expect(getWorkspaceSlugFormatProblem("nyc_measles")).toBe(
      "invalid_characters",
    );
    expect(getWorkspaceSlugFormatProblem("a".repeat(20))).toBeUndefined();
    expect(getWorkspaceSlugFormatProblem("nyc-measles")).toBeUndefined();
  });
});

describe("useWorkspaceSlugCheck", () => {
  it("rejects a malformed slug without calling the server", () => {
    const { result } = _renderSlugCheck();

    act(() => {
      result.current[1]("ab");
    });

    expect(validateSlug).not.toHaveBeenCalled();
    expect(result.current[0]).toEqual({
      status: "invalid",
      slug: "ab",
      problem: "too_short",
    });
  });

  it("reports checking, then the server's answer", () => {
    const { result } = _renderSlugCheck();

    act(() => {
      result.current[1]("nyc-measles");
    });
    expect(validateSlug).toHaveBeenCalledWith({ workspaceSlug: "nyc-measles" });
    expect(result.current[0]).toEqual({
      status: "checking",
      slug: "nyc-measles",
    });

    act(() => {
      mutationOptions.onSuccess(
        { isValid: false, reason: "taken" },
        { workspaceSlug: "nyc-measles" },
      );
    });
    expect(result.current[0]).toEqual({ status: "taken", slug: "nyc-measles" });
  });

  it("ignores answers for a slug the user has since changed", () => {
    const { result } = _renderSlugCheck();

    act(() => {
      result.current[1]("nyc-measle");
    });
    act(() => {
      result.current[1]("nyc-measles");
    });
    act(() => {
      mutationOptions.onSuccess(
        { isValid: true },
        { workspaceSlug: "nyc-measle" },
      );
    });
    expect(result.current[0]).toEqual({
      status: "checking",
      slug: "nyc-measles",
    });

    act(() => {
      mutationOptions.onSuccess(
        { isValid: true },
        { workspaceSlug: "nyc-measles" },
      );
    });
    expect(result.current[0]).toEqual({
      status: "available",
      slug: "nyc-measles",
    });
  });

  it("reports a failed check when the request errors", () => {
    const { result } = _renderSlugCheck();

    act(() => {
      result.current[1]("nyc-measles");
    });
    act(() => {
      mutationOptions.onError(new Error("offline"), {
        workspaceSlug: "nyc-measles",
      });
    });
    expect(result.current[0]).toEqual({
      status: "failed",
      slug: "nyc-measles",
    });
  });
});
