import { describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import {
  buildLocalGadgetName,
  loadTurnGadgetContext,
  toHostedChatMessages,
  toLocalModelMessages,
} from "./loadTurnGadgetContext";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

function _datasetRef(gadgetId: string): Gadget.Ref {
  return { gadgetType: "dataset", gadgetId, subId: null };
}

const REF_A = _datasetRef("aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa");
const REF_B = _datasetRef("bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb");
const REF_C = _datasetRef("cccccccc-3333-4333-8333-cccccccccccc");
const TOKEN_A = ChatMentionToken.buildToken(REF_A);
const TOKEN_B = ChatMentionToken.buildToken(REF_B);
const TOKEN_C = ChatMentionToken.buildToken(REF_C);
const KEY_A = ChatMentionToken.buildRefKey(REF_A);
const DATASET_A: AgentGadgetContext = {
  kind: "dataset",
  ref: REF_A,
  name: "US deaths",
};

function _message(
  role: "user" | "assistant",
  content: string,
): ChatClientMessage.T {
  return { role, content } as ChatClientMessage.T;
}

describe("loadTurnGadgetContext", () => {
  it("is undefined when nothing is attached or mentioned", async () => {
    const load = vi.fn();

    const result = await loadTurnGadgetContext({
      apiMessages: [_message("user", "hi")],
      attachedRefs: [],
      loader: { load },
    });

    expect(result).toBeUndefined();
    expect(load).not.toHaveBeenCalled();
  });

  it("loads the tray and every user message's mentions once", async () => {
    const load = vi.fn().mockResolvedValue(new Map());

    await loadTurnGadgetContext({
      apiMessages: [
        _message("user", `a ${TOKEN_A}`),
        _message("assistant", `ignored ${TOKEN_B}`),
        _message("user", `${TOKEN_A} and ${TOKEN_C}`),
      ],
      attachedRefs: [REF_C],
      loader: { load },
    });

    expect(load).toHaveBeenCalledWith([REF_C, REF_A]);
  });

  it("keeps the tray when loading fails", async () => {
    const result = await loadTurnGadgetContext({
      apiMessages: [],
      attachedRefs: [REF_A],
      loader: { load: vi.fn().mockRejectedValue(new Error("down")) },
    });

    expect(result).toEqual({ attachedRefs: [REF_A], contexts: undefined });
  });
});

describe("buildLocalGadgetName", () => {
  const nameOf = buildLocalGadgetName({
    attachedRefs: [],
    contexts: new Map([[KEY_A, DATASET_A]]),
  });

  it("names a loaded gadget", () => {
    expect(nameOf(REF_A)).toBe("US deaths");
  });

  it("names an unknown gadget as unavailable", () => {
    expect(nameOf(REF_B)).toBe("an unavailable dataset");
  });
});

describe("toLocalModelMessages", () => {
  it("names each token with its real name for on-device uses", () => {
    const messages = toLocalModelMessages(
      [_message("user", `Show ${TOKEN_A}`)],
      { attachedRefs: [], contexts: new Map([[KEY_A, DATASET_A]]) },
    );

    expect(messages[0]?.content).toBe('Show @"US deaths"');
  });

  it("names unknown mentions as unavailable", () => {
    const messages = toLocalModelMessages(
      [_message("user", `Show ${TOKEN_A}`)],
      { attachedRefs: [], contexts: undefined },
    );

    expect(messages[0]?.content).toBe('Show @"an unavailable dataset"');
  });

  it("leaves assistant messages alone", () => {
    const reply = _message("assistant", `I saw ${TOKEN_A}`);

    const messages = toLocalModelMessages([reply], {
      attachedRefs: [],
      contexts: undefined,
    });

    expect(messages[0]).toBe(reply);
  });

  it("returns the same messages when there is no context", () => {
    const apiMessages = [_message("user", "hi")];

    expect(toLocalModelMessages(apiMessages, undefined)).toBe(apiMessages);
  });
});

describe("toHostedChatMessages", () => {
  it("names each mention by its type only, never its name or id", () => {
    const tileRef: Gadget.Ref = {
      gadgetType: "dashboard_tile",
      gadgetId: REF_B.gadgetId,
      subId: "block-1",
    };
    const messages = toHostedChatMessages(
      [
        _message(
          "user",
          `Show ${TOKEN_A} and ${ChatMentionToken.buildToken(tileRef)}`,
        ),
      ],
      undefined,
    );

    expect(messages[0]?.content).toBe('Show @"a dataset" and @"a chart"');
  });

  it("names a loaded gadget's real name in an assistant reply by its type", () => {
    const tileRef: Gadget.Ref = {
      gadgetType: "dashboard_tile",
      gadgetId: REF_B.gadgetId,
      subId: "block-1",
    };
    const messages = toHostedChatMessages(
      [_message("assistant", '"US deaths" and "Jane Doe visits" on Clinic.')],
      {
        attachedRefs: [],
        contexts: new Map<string, AgentGadgetContext>([
          [KEY_A, DATASET_A],
          [
            ChatMentionToken.buildRefKey(tileRef),
            {
              kind: "dashboard_tile",
              ref: tileRef,
              dashboardName: "Clinic",
              tile: { title: "Jane Doe visits", chartType: "bar", sql: "" },
            },
          ],
        ]),
      },
    );

    expect(messages[0]?.content).toBe(
      '"a dataset" and "a chart" on a dashboard.',
    );
  });

  it("leaves an assistant reply as written with nothing loaded", () => {
    const reply = _message("assistant", "Two rows.");

    expect(toHostedChatMessages([reply], undefined)[0]).toEqual(reply);
  });
});
