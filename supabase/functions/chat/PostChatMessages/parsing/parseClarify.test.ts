import {
  countClarificationsInHistory,
  parseClarify,
} from "@sbfn/chat/PostChatMessages/parsing/parseClarify.ts";
import { describe, expect, it } from "vitest";
import type { ChatClarifyRequest } from "$/types/chat.types.ts";

const DISCOVERY_CLARIFICATION_ARGUMENTS = {
  question: "Which stored state represents California?",
  responseShape: {
    kind: "discovery",
    query:
      'SELECT DISTINCT "province_state" FROM "mortality" ORDER BY 1 LIMIT 100',
    column: "province_state",
    multi: false,
    candidateValues: [
      " California ",
      "CA",
      "California",
      42,
      "Calif.",
      "Golden State",
      "US-CA",
      "CAL",
      "California State",
      "State of California",
    ],
  },
} satisfies Record<string, unknown>;

const EXPECTED_DISCOVERY_REQUEST = {
  question: "Which stored state represents California?",
  rationale: undefined,
  responseShape: {
    kind: "discovery",
    query:
      'SELECT DISTINCT "province_state" FROM "mortality" ORDER BY 1 LIMIT 100',
    column: "province_state",
    multi: false,
    candidateValues: [
      "California",
      "CA",
      "Calif.",
      "Golden State",
      "US-CA",
      "CAL",
      "California State",
      "State of California",
    ],
  },
  turnNumber: 1,
} satisfies ChatClarifyRequest;

describe("parseClarify", () => {
  it("returns a bounded clarification request for fixed options", () => {
    expect(
      parseClarify(
        JSON.stringify({
          question: "Which region should I compare?",
          rationale: "The dataset contains multiple regions.",
          responseShape: {
            kind: "fixed_options",
            options: ["North", "South"],
            multi: false,
          },
        }),
        0,
      ),
    ).toEqual({
      question: "Which region should I compare?",
      rationale: "The dataset contains multiple regions.",
      responseShape: {
        kind: "fixed_options",
        options: ["North", "South"],
        multi: false,
      },
      turnNumber: 1,
    });
  });

  it("prepares bounded prompt-derived candidates for discovery", () => {
    expect(
      parseClarify(JSON.stringify(DISCOVERY_CLARIFICATION_ARGUMENTS), 0),
    ).toEqual(EXPECTED_DISCOVERY_REQUEST);
  });

  it("does not count view-change lines as clarification answers", () => {
    // View-change lines lack the `[Clarification answer:` marker.
    expect(
      countClarificationsInHistory([
        {
          role: "user",
          content:
            "[View changed: app=data-explorer; route=/x; dataset=none; dashboard=none]",
        },
        { role: "user", content: "count rows" },
      ]),
    ).toBe(0);
  });
});
