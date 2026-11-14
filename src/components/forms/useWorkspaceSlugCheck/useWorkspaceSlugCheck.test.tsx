import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceSlugCheck } from "@/components/forms/useWorkspaceSlugCheck/useWorkspaceSlugCheck";
import { renderHook, TestProviders } from "@/test-utils";
import type { Mock } from "vitest";

type MutationOptions = {
  onSuccess: (
    isAvailable: boolean,
    variables: { workspaceSlug: string },
  ) => void;
  onError: (error: Error, variables: { workspaceSlug: string }) => void;
};

const mocks = vi.hoisted(() => {
  const state: {
    requestSlugAvailability: Mock;
    mutationOptions?: MutationOptions;
  } = { requestSlugAvailability: vi.fn() };
  return state;
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      useIsWorkspaceSlugAvailable: (options: MutationOptions) => {
        mocks.mutationOptions = options;
        return [mocks.requestSlugAvailability, false];
      },
    },
  };
});

beforeEach(() => {
  mocks.requestSlugAvailability.mockReset();
});

function _renderSlugCheck() {
  return renderHook(
    () => {
      return useWorkspaceSlugCheck();
    },
    { wrapper: TestProviders },
  );
}

describe("useWorkspaceSlugCheck", () => {
  it("rejects a malformed slug without calling the server", () => {
    const { result } = _renderSlugCheck();

    act(() => {
      result.current[1]("ab");
    });

    expect(mocks.requestSlugAvailability).not.toHaveBeenCalled();
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
    expect(mocks.requestSlugAvailability).toHaveBeenCalledWith({
      workspaceSlug: "nyc-measles",
    });
    expect(result.current[0]).toEqual({
      status: "checking",
      slug: "nyc-measles",
    });

    act(() => {
      mocks.mutationOptions!.onSuccess(false, { workspaceSlug: "nyc-measles" });
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
      mocks.mutationOptions!.onSuccess(true, { workspaceSlug: "nyc-measle" });
    });
    expect(result.current[0]).toEqual({
      status: "checking",
      slug: "nyc-measles",
    });

    act(() => {
      mocks.mutationOptions!.onSuccess(true, { workspaceSlug: "nyc-measles" });
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
      mocks.mutationOptions!.onError(new Error("offline"), {
        workspaceSlug: "nyc-measles",
      });
    });
    expect(result.current[0]).toEqual({
      status: "failed",
      slug: "nyc-measles",
    });
  });
});
