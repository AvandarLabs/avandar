import { getRandomItem } from "@utils/arrays/getRandomItem/getRandomItem.ts";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getRandomItem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the first item when Math.random is at the low bound", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(getRandomItem(["a", "b", "c"])).toBe("a");
  });

  it("returns the last item when Math.random is near the high bound", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(getRandomItem(["a", "b", "c"])).toBe("c");
  });

  it("maps the random value to the matching index", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(getRandomItem(["a", "b", "c", "d"])).toBe("c");
  });

  it("returns the only item for a single-element array", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.42);
    expect(getRandomItem(["only"])).toBe("only");
  });

  it("always returns an item that is a member of the array", () => {
    const items = [1, 2, 3, 4, 5];
    for (let attempt = 0; attempt < 100; attempt++) {
      expect(items).toContain(getRandomItem(items));
    }
  });

  it("returns undefined when the array is empty", () => {
    expect(getRandomItem([])).toBeUndefined();
  });
});
