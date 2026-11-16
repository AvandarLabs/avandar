import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendOpenRouterRequestMock } = vi.hoisted(() => {
  return { sendOpenRouterRequestMock: vi.fn() };
});

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  return {
    POST: () => {
      const handler = {
        action: (action: unknown) => {
          return { state: { action } };
        },
        bodySchema: () => {
          return handler;
        },
      };
      return handler;
    },
  };
});

vi.mock(
  "@sbfn/chat/PostChatMessages/openRouter/sendOpenRouterRequest.ts",
  () => {
    return { sendOpenRouterRequest: sendOpenRouterRequestMock };
  },
);

vi.stubGlobal("Deno", {
  env: {
    get: () => {
      return "test-openrouter-key";
    },
  },
});

const { PostChatTitle } =
  await import("@sbfn/chat/PostChatTitle/PostChatTitle.ts");

function _createSupabaseClient(isMember: boolean): {
  from: ReturnType<typeof vi.fn>;
} {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    throwOnError: vi.fn(async () => {
      return {
        data: isMember ? { workspace_id: "workspace-id" } : null,
      };
    }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.maybeSingle.mockReturnValue(query);
  return {
    from: vi.fn(() => {
      return query;
    }),
  };
}

async function _callPostChatTitle(isMember: boolean): Promise<unknown> {
  return await PostChatTitle.state.action({
    body: {
      excerpt: "user: How many cases?",
      locale: "en",
      placeholder: "New chat",
    },
    pathParams: {
      workspaceId: "workspace-id",
      promptId: "chat-title-v1",
    },
    supabaseClient: _createSupabaseClient(isMember),
    user: { id: "user-id" },
  } as never);
}

describe("PostChatTitle", () => {
  beforeEach(() => {
    sendOpenRouterRequestMock.mockReset();
    sendOpenRouterRequestMock.mockResolvedValue({ text: "Case counts" });
  });

  it("returns a generated title for a workspace member", async () => {
    await expect(_callPostChatTitle(true)).resolves.toEqual({
      title: "Case counts",
    });
    expect(sendOpenRouterRequestMock).toHaveBeenCalledOnce();
  });

  it("rejects a non-member before requesting a title", async () => {
    await expect(_callPostChatTitle(false)).rejects.toMatchObject({
      httpCode: 403,
    });
    expect(sendOpenRouterRequestMock).not.toHaveBeenCalled();
  });
});
