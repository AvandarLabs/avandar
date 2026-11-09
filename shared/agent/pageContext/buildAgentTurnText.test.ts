import { describe, expect, it } from "vitest";
import {
  ATTACHED_CLEARED_BLOCK,
  ATTACHED_UNCHANGED_BLOCK,
  buildAgentTurnText,
  PAGE_UNCHANGED_BLOCK,
} from "$/agent/pageContext/buildAgentTurnText.ts";

const BLOCK = "<current_page>\nPage: Map\n</current_page>";

describe("buildAgentTurnText", () => {
  it("puts the page block before the message", () => {
    expect(
      buildAgentTurnText({ message: "How many cases?", pageBlock: BLOCK }),
    ).toBe(`${BLOCK}\n\nHow many cases?`);
  });

  it("says the page is unchanged instead of repeating the block", () => {
    expect(
      buildAgentTurnText({
        message: "And deaths?",
        pageBlock: BLOCK,
        previousPageBlock: BLOCK,
      }),
    ).toBe(`${PAGE_UNCHANGED_BLOCK}\n\nAnd deaths?`);
  });

  it("sends the message alone when there is no page block", () => {
    expect(buildAgentTurnText({ message: "Hi" })).toBe("Hi");
  });

  it("sends the new full block when the page changed", () => {
    const changed = "<current_page>\nPage: Dashboard\n</current_page>";

    expect(
      buildAgentTurnText({
        message: "Next",
        pageBlock: changed,
        previousPageBlock: BLOCK,
      }),
    ).toBe(`${changed}\n\nNext`);
  });

  it("orders page, attached, mentioned, then the message", () => {
    const text = buildAgentTurnText({
      message: "hi",
      pageBlock: "<current_page>P</current_page>",
      attachedBlock: "<attached>A</attached>",
      mentionedBlock: "<mentioned>M</mentioned>",
    });
    expect(text).toBe(
      "<current_page>P</current_page>\n\n<attached>A</attached>\n\n<mentioned>M</mentioned>\n\nhi",
    );
  });

  it("sends one line for an attached block that did not change", () => {
    const text = buildAgentTurnText({
      message: "hi",
      attachedBlock: "<attached>A</attached>",
      previousAttachedBlock: "<attached>A</attached>",
    });
    expect(text).toBe(`${ATTACHED_UNCHANGED_BLOCK}\n\nhi`);
  });

  it("sends the cleared line when the attached block disappears", () => {
    const text = buildAgentTurnText({
      message: "hi",
      previousAttachedBlock: "<attached>A</attached>",
    });
    expect(text).toBe(`${ATTACHED_CLEARED_BLOCK}\n\nhi`);
  });
});
