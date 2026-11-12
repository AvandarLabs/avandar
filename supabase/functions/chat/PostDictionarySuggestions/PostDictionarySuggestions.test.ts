import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DictionarySuggestionsRequest } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts";

const {
  sendOpenRouterRequestMock,
  assertMeetsMinAppRoleMock,
  verifyAckTokenMock,
} = vi.hoisted(() => {
  return {
    sendOpenRouterRequestMock: vi.fn(),
    assertMeetsMinAppRoleMock: vi.fn(),
    verifyAckTokenMock: vi.fn(),
  };
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

vi.mock("@sbfn/_shared/assertMeetsMinAppRole.ts", () => {
  return { assertMeetsMinAppRole: assertMeetsMinAppRoleMock };
});

vi.mock("@sbfn/_shared/privacy/verifyAckToken.ts", () => {
  return { verifyAckToken: verifyAckTokenMock };
});

vi.stubGlobal("Deno", {
  env: {
    get: () => {
      return "test-openrouter-key";
    },
  },
});

const { PostDictionarySuggestions } =
  await import("@sbfn/chat/PostDictionarySuggestions/PostDictionarySuggestions.ts");
const { stringifyDictionarySuggestionsRequest } =
  await import("$/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts");
const { hashTextPayload } =
  await import("$/utils/privacy/sessionSecretUtils.ts");

const REQUEST: DictionarySuggestionsRequest = {
  task: "labels",
  locale: "en",
  column: {
    name: "GENDER",
    otherNames: [],
    kind: "categorical",
    values: ["1", "2"],
  },
};

async function _callRoute(promptId: string): Promise<unknown> {
  return await PostDictionarySuggestions.state.action({
    body: { request: REQUEST, ackToken: "ack-token" },
    pathParams: { workspaceId: "workspace-id", promptId },
    supabaseClient: {},
    user: { id: "user-id" },
  } as never);
}

describe("PostDictionarySuggestions", () => {
  beforeEach(() => {
    sendOpenRouterRequestMock.mockReset();
    assertMeetsMinAppRoleMock.mockReset();
    sendOpenRouterRequestMock.mockResolvedValue({ text: '{"labels":[]}' });
    assertMeetsMinAppRoleMock.mockResolvedValue(undefined);
    verifyAckTokenMock.mockReset();
    verifyAckTokenMock.mockResolvedValue({ valid: true });
  });

  it("returns the model's reply to a Data Sources editor", async () => {
    await expect(_callRoute("dictionary-suggestions-v1")).resolves.toEqual({
      reply: '{"labels":[]}',
    });
    expect(assertMeetsMinAppRoleMock).toHaveBeenCalledWith(
      expect.objectContaining({ app: "data_sources", minRole: "editor" }),
    );
  });

  it("checks the consent covers exactly the request it got", async () => {
    await _callRoute("dictionary-suggestions-v1");
    expect(verifyAckTokenMock).toHaveBeenCalledWith({
      token: "ack-token",
      expectedWorkspaceId: "workspace-id",
      expectedUserId: "user-id",
      expectedPayloadHash: await hashTextPayload(
        stringifyDictionarySuggestionsRequest(REQUEST),
      ),
    });
  });

  it("refuses a request the user did not consent to, before calling the model", async () => {
    verifyAckTokenMock.mockResolvedValue({
      valid: false,
      reason: "hash_mismatch",
    });
    await expect(_callRoute("dictionary-suggestions-v1")).rejects.toMatchObject(
      {
        httpCode: 400,
      },
    );
    expect(sendOpenRouterRequestMock).not.toHaveBeenCalled();
  });

  it("refuses an unknown prompt version before calling the model", async () => {
    await expect(_callRoute("dictionary-suggestions-v0")).rejects.toMatchObject(
      {
        httpCode: 400,
      },
    );
    expect(sendOpenRouterRequestMock).not.toHaveBeenCalled();
  });

  it("refuses someone who cannot edit Data Sources before calling the model", async () => {
    assertMeetsMinAppRoleMock.mockRejectedValue(
      Object.assign(new Error("Forbidden"), { httpCode: 403 }),
    );
    await expect(_callRoute("dictionary-suggestions-v1")).rejects.toMatchObject(
      {
        httpCode: 403,
      },
    );
    expect(sendOpenRouterRequestMock).not.toHaveBeenCalled();
  });
});
