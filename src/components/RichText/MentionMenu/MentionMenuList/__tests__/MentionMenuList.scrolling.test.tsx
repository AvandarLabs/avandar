import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@/test-utils";
import { MentionMenuListTestFixtures } from "./MentionMenuListTestFixtures";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";

const { PEOPLE, DASHBOARD, DATASET, _buildList, _renderList, _pressKey } =
  MentionMenuListTestFixtures;

const LIST_HEIGHT = 100;
const ROW_HEIGHT = 40;

/**
 * Lays the list out in jsdom, which measures nothing: the list shows the
 * top `LIST_HEIGHT` pixels, and each row sits where `getRowTop` says. Returns
 * the list's `scrollTop` writes, so a test sees how far the list scrolled.
 */
function _layoutList(getRowTop: (row: Element) => number): {
  scrollTops: number[];
} {
  const scrollTops: number[] = [];
  const list = screen.getByRole("listbox");
  Object.defineProperty(list, "scrollTop", {
    configurable: true,
    get: () => {
      return scrollTops.at(-1) ?? 0;
    },
    set: (value: number) => {
      scrollTops.push(value);
    },
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const top = this === list ? 0 : getRowTop(this);
      const height = this === list ? LIST_HEIGHT : ROW_HEIGHT;
      return { top, bottom: top + height } as DOMRect;
    },
  );
  return { scrollTops };
}

describe("MentionMenuList scrolling", () => {
  // The layout and scroll spies must not reach the next test.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls only the list to a highlighted row below its edge, never the page", async () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref });
    await screen.findByText("Priya Natarajan");
    const { scrollTops } = _layoutList((row) => {
      return row.textContent?.includes("Priscilla") ? 200 : 0;
    });
    _pressKey(ref, { key: "ArrowDown" });
    // The row's bottom is 240 and the list's is 100.
    await waitFor(() => {
      expect(scrollTops.at(-1)).toBe(140);
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls the list up to a highlighted row above its edge", async () => {
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref });
    await screen.findByText("Priya Natarajan");
    const { scrollTops } = _layoutList((row) => {
      return row.textContent?.includes("Priscilla") ? -30 : 0;
    });
    _pressKey(ref, { key: "ArrowDown" });
    await waitFor(() => {
      expect(scrollTops.at(-1)).toBe(-30);
    });
  });

  it("leaves the list alone when the highlighted row is in view", async () => {
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref });
    await screen.findByText("Priya Natarajan");
    const { scrollTops } = _layoutList(() => {
      return 10;
    });
    _pressKey(ref, { key: "ArrowDown" });
    expect(scrollTops).toEqual([]);
  });

  it("leaves the list at the top when gadget groups arrive below the highlighted member", async () => {
    const ref = createRef<MentionMenuListHandle>();
    const { rerender } = _renderList({ ref });
    await screen.findByText("Priya Natarajan");
    const { scrollTops } = _layoutList((row) => {
      return row.textContent?.includes("Priya") ? 0 : 200;
    });
    rerender(_buildList({ ref, gadgets: [DASHBOARD, DATASET] }));
    await screen.findByText("Measles by borough");
    expect(scrollTops).toEqual([]);
  });

  it("scrolls the highlighted row into view again when rows arrive above it", async () => {
    const ref = createRef<MentionMenuListHandle>();
    const { rerender } = _renderList({ ref });
    await screen.findByText("Priya Natarajan");
    let priscillaTop = 0;
    const { scrollTops } = _layoutList((row) => {
      return row.textContent?.includes("Priscilla") ? priscillaTop : 0;
    });
    _pressKey(ref, { key: "ArrowDown" });
    priscillaTop = 300;
    rerender(
      _buildList({
        ref,
        people: [
          {
            userId: "3",
            displayName: "Aaron Bell",
            email: "a.bell@example.org",
          },
          ...PEOPLE,
        ],
      }),
    );
    await screen.findByText("Aaron Bell");
    await waitFor(() => {
      expect(scrollTops.at(-1)).toBe(240);
    });
  });
});
