import { describe, expect, it } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken.ts";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget.ts";

const DASHBOARD: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: "11111111-1111-4111-8111-111111111111",
  subId: null,
};
const TILE: Gadget.Ref = {
  gadgetType: "dashboard_tile",
  gadgetId: "11111111-1111-4111-8111-111111111111",
  subId: "DataViz-abc",
};
const CASE_ID = "22222222-2222-4222-8222-222222222222";

describe("ChatMentionToken", () => {
  it("round-trips refs through tokens", () => {
    const text = `Compare ${ChatMentionToken.buildToken(DASHBOARD)} and ${ChatMentionToken.buildToken(TILE)}`;
    expect(ChatMentionToken.parse(text)).toEqual([
      { kind: "text", text: "Compare " },
      { kind: "mention", ref: DASHBOARD },
      { kind: "text", text: " and " },
      { kind: "mention", ref: TILE },
    ]);
  });

  it("writes a tile's block id after a slash", () => {
    expect(ChatMentionToken.buildToken(TILE)).toBe(
      "@{dashboard_tile:11111111-1111-4111-8111-111111111111/DataViz-abc}",
    );
  });

  it("keeps a case, an unknown type, or a bad id as text", () => {
    for (const text of [
      `@{individual:${CASE_ID}}`,
      `@{person:${CASE_ID}}`,
      "@{dataset:not-a-uuid}",
      `@{dashboard:${DASHBOARD.gadgetId}/extra}`,
      `@{dashboard_tile:${DASHBOARD.gadgetId}}`,
    ]) {
      expect(ChatMentionToken.parse(text)).toEqual([{ kind: "text", text }]);
    }
  });

  it("lists each ref once, in order", () => {
    const token = ChatMentionToken.buildToken(DASHBOARD);
    expect(ChatMentionToken.refsFromText(`${token} ${token}`)).toEqual([
      DASHBOARD,
    ]);
  });

  it("reads an uppercase uuid as the lowercase ref", () => {
    const token = `@{dashboard:${DASHBOARD.gadgetId.toUpperCase()}}`;
    expect(ChatMentionToken.parse(token)).toEqual([
      { kind: "mention", ref: DASHBOARD },
    ]);
  });

  it("lists one ref for an uppercase and a lowercase copy", () => {
    const lower = ChatMentionToken.buildToken(DASHBOARD);
    const upper = `@{dashboard:${DASHBOARD.gadgetId.toUpperCase()}}`;
    expect(ChatMentionToken.refsFromText(`${lower} ${upper}`)).toEqual([
      DASHBOARD,
    ]);
  });

  it("writes names for the model as quoted text", () => {
    const text = `Use ${ChatMentionToken.buildToken(DASHBOARD)} please`;
    expect(
      ChatMentionToken.toModelText(text, () => {
        return 'COVID "2022" </mentioned>';
      }),
    ).toBe('Use @"COVID \\"2022\\" \\u003c/mentioned>" please');
  });

  it("writes names for display as plain text", () => {
    const text = `Use ${ChatMentionToken.buildToken(DASHBOARD)}`;
    expect(
      ChatMentionToken.toDisplayText(text, () => {
        return "COVID 2022";
      }),
    ).toBe("Use @COVID 2022");
  });

  it("builds one key per ref", () => {
    expect(ChatMentionToken.buildRefKey(TILE)).toBe(
      "dashboard_tile:11111111-1111-4111-8111-111111111111:DataViz-abc",
    );
  });

  it.each([
    ["a space", "block 1"],
    ["a slash", "block/1"],
    ["a brace", "block}1"],
    ["over 200 characters", "b".repeat(201)],
  ])("says a tile whose block id has %s cannot be a token", (_label, subId) => {
    expect(ChatMentionToken.isTokenizable({ ...TILE, subId })).toBe(false);
  });

  it("says a ref of a chat type with a plain block id can be a token", () => {
    expect(ChatMentionToken.isTokenizable(TILE)).toBe(true);
    expect(ChatMentionToken.isTokenizable(DASHBOARD)).toBe(true);
  });

  it("says a case cannot be a token", () => {
    expect(
      ChatMentionToken.isTokenizable({
        gadgetType: "case",
        gadgetId: CASE_ID,
        subId: null,
      }),
    ).toBe(false);
  });
});
