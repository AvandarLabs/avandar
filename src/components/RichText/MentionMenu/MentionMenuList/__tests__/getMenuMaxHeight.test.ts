import { describe, expect, it } from "vitest";
import { getMenuMaxHeight } from "@/components/RichText/MentionMenu/MentionMenuList/getMenuMaxHeight";

/** A 720px window, with the caret line `top` pixels down and 20px tall. */
function _getHeight(options: { placement: string; top: number; room: number }) {
  return getMenuMaxHeight({
    placement: options.placement,
    availableHeight: options.room,
    referenceRect: { top: options.top, bottom: options.top + 20 },
    viewportHeight: 720,
    padding: 8,
  });
}

describe("getMenuMaxHeight", () => {
  it("caps the menu to the room on its side when that is enough", () => {
    expect(_getHeight({ placement: "bottom-start", top: 100, room: 600 })).toBe(
      600,
    );
  });

  it("keeps a floor under the cap when the other side has more room, so the menu can flip", () => {
    // 100px below the caret and 612px above it.
    expect(_getHeight({ placement: "bottom-start", top: 620, room: 100 })).toBe(
      240,
    );
  });

  it("caps to the room on its side when the other side has less", () => {
    // Flipped above the caret: 612px above, 72px below.
    expect(_getHeight({ placement: "top-start", top: 620, room: 612 })).toBe(
      612,
    );
  });

  it("caps to the room left when neither side has the floor and this side has more", () => {
    // 150px below the caret, 92px above it.
    expect(_getHeight({ placement: "bottom-start", top: 100, room: 150 })).toBe(
      150,
    );
  });

  it("keeps the floor when the other side has more room even if neither reaches it", () => {
    // 100px below the caret, 162px above it.
    expect(_getHeight({ placement: "bottom-start", top: 170, room: 100 })).toBe(
      240,
    );
  });
});
