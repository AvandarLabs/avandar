import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@/test-utils";
import { useKeepScrollOnPrepend } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useKeepScrollOnPrepend";

/** A scrolling container whose content height the test controls. */
function _createScroller(): {
  scroller: HTMLDivElement;
  content: HTMLDivElement;
  setScrollHeight: (height: number) => void;
} {
  const scroller = document.createElement("div");
  scroller.style.overflowY = "auto";
  const content = document.createElement("div");
  scroller.append(content);
  document.body.append(scroller);
  let scrollHeight = 0;
  Object.defineProperty(scroller, "scrollHeight", {
    get: () => {
      return scrollHeight;
    },
  });
  return {
    scroller,
    content,
    setScrollHeight: (height) => {
      scrollHeight = height;
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useKeepScrollOnPrepend", () => {
  it("keeps the reader's place when earlier entries are added above", () => {
    const { scroller, content, setScrollHeight } = _createScroller();
    setScrollHeight(1000);
    scroller.scrollTop = 700;
    const anchorRef = { current: content };
    const { result, rerender } = renderHook(
      ({ pageCount }) => {
        return useKeepScrollOnPrepend(anchorRef, pageCount);
      },
      { initialProps: { pageCount: 1 } },
    );
    result.current();
    setScrollHeight(1600);
    rerender({ pageCount: 2 });
    expect(scroller.scrollTop).toBe(1300);
  });

  it("leaves the scroll alone when a page arrives without a request", () => {
    const { scroller, content, setScrollHeight } = _createScroller();
    setScrollHeight(1000);
    scroller.scrollTop = 700;
    const anchorRef = { current: content };
    const { rerender } = renderHook(
      ({ pageCount }) => {
        return useKeepScrollOnPrepend(anchorRef, pageCount);
      },
      { initialProps: { pageCount: 1 } },
    );
    setScrollHeight(1600);
    rerender({ pageCount: 2 });
    expect(scroller.scrollTop).toBe(700);
  });
});
