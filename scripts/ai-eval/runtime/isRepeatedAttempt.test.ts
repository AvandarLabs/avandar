import { describe, expect, it } from "vitest";
import { isRepeatedAttempt } from "./isRepeatedAttempt";
import type { EvalAnswer, EvalClarification } from "../harnesses/EvalHarness";

function _attempt(overrides: Partial<EvalAnswer>): EvalAnswer {
  return {
    assistantText: "",
    clarifications: [],
    consentPrompts: 0,
    valuesSentToModel: [],
    toolNames: [],
    usage: {
      calls: 1,
      promptTokens: 0,
      cachedPromptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      cost: 0,
    },
    latencyMs: 0,
    ...overrides,
  };
}

function _card(question: string, isAutomatic = false): EvalClarification {
  return { kind: "fixed_options", question, answer: "deaths", isAutomatic };
}

const HEADING = { kind: "HeadingBlock", text: "Deaths in 2022" } as const;

describe("isRepeatedAttempt", () => {
  it("counts the same query, spaced and cased differently, as a repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ finalSql: "SELECT  state\nFROM t0" }),
        _attempt({ finalSql: " select state from T0 " }),
      ),
    ).toBe(true);
  });

  it("counts a different query as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ finalSql: "SELECT state FROM t0" }),
        _attempt({ finalSql: "SELECT state FROM t1" }),
      ),
    ).toBe(false);
  });

  it("counts the same first card question as a repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ clarifications: [_card("Deaths or cases?")] }),
        _attempt({ clarifications: [_card(" Deaths or cases? ")] }),
      ),
    ).toBe(true);
  });

  it("counts a different first card question as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ clarifications: [_card("Deaths or cases?")] }),
        _attempt({ clarifications: [_card("Which year?")] }),
      ),
    ).toBe(false);
  });

  it("skips a card the client answered on its own", () => {
    expect(
      isRepeatedAttempt(
        _attempt({
          clarifications: [_card("Which county?", true), _card("Which year?")],
        }),
        _attempt({ clarifications: [_card("Which year?")] }),
      ),
    ).toBe(true);
  });

  it("counts the same single block as a repeat", () => {
    const write = {
      dashboardId: "d-1",
      via: "editor",
      block: HEADING,
    } as const;

    expect(
      isRepeatedAttempt(
        _attempt({ dashboardWrites: [write] }),
        _attempt({ dashboardWrites: [{ ...write }] }),
      ),
    ).toBe(true);
  });

  it("counts a different block as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({
          dashboardWrites: [
            { dashboardId: "d-1", via: "editor", block: HEADING },
          ],
        }),
        _attempt({
          dashboardWrites: [
            {
              dashboardId: "d-1",
              via: "editor",
              block: { kind: "HeadingBlock", text: "Deaths, 2022" },
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("counts the same reply with no query, card, or block as a repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ assistantText: "They differ. " }),
        _attempt({ assistantText: "They differ." }),
      ),
    ).toBe(true);
  });

  it("counts different replies as no repeat", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ assistantText: "They differ." }),
        _attempt({ assistantText: "They cannot be stacked." }),
      ),
    ).toBe(false);
  });

  it("does not compare replies when only one attempt showed a query", () => {
    expect(
      isRepeatedAttempt(
        _attempt({ finalSql: "SELECT 1", assistantText: "Done." }),
        _attempt({ assistantText: "Done." }),
      ),
    ).toBe(false);
  });
});
