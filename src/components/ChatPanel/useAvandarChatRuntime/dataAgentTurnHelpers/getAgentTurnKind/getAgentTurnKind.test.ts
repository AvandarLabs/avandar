import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { createAgentAskRecord, getAgentTurnKind } from "./getAgentTurnKind";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { AgentAskRecord } from "@/components/ChatPanel/useAvandarChatRuntime/dataAgentTurnHelpers/dataAgentConversation.types";

/** A thread whose messages alternate user and assistant, user first. */
function _thread(contents: readonly string[]): ChatClientMessage.T[] {
  return contents.map((content, index) => {
    return Model.make("ChatClientMessage", {
      role: index % 2 === 0 ? "user" : "assistant",
      content,
    });
  });
}

/** A thread with each message's role given, for two user messages in a row. */
function _threadWithRoles(
  messages: ReadonlyArray<readonly [ChatClientMessage.T["role"], string]>,
): ChatClientMessage.T[] {
  return messages.map(([role, content]) => {
    return Model.make("ChatClientMessage", { role, content });
  });
}

function _record(messages: readonly ChatClientMessage.T[]): AgentAskRecord {
  return createAgentAskRecord({ apiMessages: messages, isKept: true });
}

const ASKED = _thread(["How many?", "Forty-two.", "And deaths?"]);

describe("getAgentTurnKind", () => {
  it("calls a conversation with no record a first turn", () => {
    expect(getAgentTurnKind({ lastAsk: undefined, apiMessages: ASKED })).toBe(
      "first",
    );
  });

  it("calls the recorded thread again the same thread", () => {
    expect(
      getAgentTurnKind({
        lastAsk: _record(ASKED),
        apiMessages: _thread(["How many?", "Forty-two.", "And deaths?"]),
      }),
    ).toBe("same_thread");
  });

  it("calls a longer thread that starts with the recorded one a continuation", () => {
    expect(
      getAgentTurnKind({
        lastAsk: _record(ASKED),
        apiMessages: _thread([
          "How many?",
          "Forty-two.",
          "And deaths?",
          "Seven.",
          "And cases?",
        ]),
      }),
    ).toBe("continues");
  });

  it.each([
    ["a shorter prefix", ["How many?"]],
    [
      "the same length with one message changed",
      ["How many?", "Forty-two.", "And cases?"],
    ],
    [
      "a longer thread whose start differs",
      ["How many cases?", "Forty-two.", "And deaths?", "Seven.", "And cases?"],
    ],
  ])("calls %s rewound", (_label, contents) => {
    expect(
      getAgentTurnKind({
        lastAsk: _record(ASKED),
        apiMessages: _thread(contents),
      }),
    ).toBe("rewound");
  });
});

describe("getAgentTurnKind after a newer message stopped a run", () => {
  // The newer turn was asked before the stopped run's reply landed, so its
  // thread holds two user messages in a row.
  const NEWER_ASK = _record(
    _threadWithRoles([
      ["user", "First?"],
      ["user", "Second?"],
    ]),
  );

  it("calls a follow-up a continuation once the stopped run's reply lands", () => {
    expect(
      getAgentTurnKind({
        lastAsk: NEWER_ASK,
        apiMessages: _thread([
          "First?",
          "Stopped.",
          "Second?",
          "Second.",
          "Third?",
        ]),
      }),
    ).toBe("continues");
  });

  it("calls a Try again of the newer answer the same thread", () => {
    expect(
      getAgentTurnKind({
        lastAsk: NEWER_ASK,
        apiMessages: _thread(["First?", "Stopped.", "Second?"]),
      }),
    ).toBe("same_thread");
  });
});
