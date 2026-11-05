import { TerminalMenu } from "@ava-cli/utils/TerminalMenu/TerminalMenu";
import { describe, expect, it } from "vitest";
import type {
  MenuKey,
  MenuState,
  MenuStep,
} from "@ava-cli/utils/TerminalMenu/TerminalMenu";

const ALL_SELECTED: MenuState = {
  cursorIndex: 0,
  selectedIndexes: [0, 1, 2],
};

function _press(
  options: Readonly<{
    state: MenuState;
    keys: readonly MenuKey[];
    isMultiSelect?: boolean;
  }>,
): MenuStep {
  const { state, keys, isMultiSelect = true } = options;
  return keys.reduce<MenuStep>(
    (result, key) => {
      return TerminalMenu.reduceKey({
        state: result.state,
        key,
        numItems: 3,
        isMultiSelect,
      });
    },
    { state, outcome: undefined },
  );
}

describe("TerminalMenu.getKeyFromInput", () => {
  it("maps arrow keys and their vim equivalents to up and down", () => {
    expect(
      ["\u001B[A", "k", "\u001B[B", "j"].map(TerminalMenu.getKeyFromInput),
    ).toEqual(["up", "up", "down", "down"]);
  });

  it("maps both Enter characters to confirm", () => {
    expect(["\r", "\n"].map(TerminalMenu.getKeyFromInput)).toEqual([
      "confirm",
      "confirm",
    ]);
  });

  it("maps g, G, space, and a to first, last, toggle, and toggle all", () => {
    expect(["g", "G", " ", "a"].map(TerminalMenu.getKeyFromInput)).toEqual([
      "first",
      "last",
      "toggle",
      "toggleAll",
    ]);
  });

  it("maps Ctrl-C, Escape, and q to cancel", () => {
    expect(["\u0003", "\u001B", "q"].map(TerminalMenu.getKeyFromInput)).toEqual(
      ["cancel", "cancel", "cancel"],
    );
  });

  it("ignores keys the menu does not use", () => {
    expect(TerminalMenu.getKeyFromInput("x")).toBeUndefined();
  });
});

describe("TerminalMenu.reduceKey", () => {
  it("wraps from the first item up to the last", () => {
    expect(
      _press({ state: ALL_SELECTED, keys: ["up"] }).state.cursorIndex,
    ).toBe(2);
  });

  it("wraps from the last item down to the first", () => {
    expect(
      _press({ state: ALL_SELECTED, keys: ["last", "down"] }).state.cursorIndex,
    ).toBe(0);
  });

  it("unselects the item under the cursor on toggle", () => {
    expect(
      _press({ state: ALL_SELECTED, keys: ["down", "toggle"] }).state
        .selectedIndexes,
    ).toEqual([0, 2]);
  });

  it("clears every item when all are selected, then selects all again", () => {
    expect(
      _press({ state: ALL_SELECTED, keys: ["toggleAll"] }).state
        .selectedIndexes,
    ).toEqual([]);
    expect(
      _press({ state: ALL_SELECTED, keys: ["toggleAll", "toggleAll"] }).state
        .selectedIndexes,
    ).toEqual([0, 1, 2]);
  });

  it("confirms with the current selection", () => {
    expect(_press({ state: ALL_SELECTED, keys: ["confirm"] })).toEqual({
      state: ALL_SELECTED,
      outcome: "confirm",
    });
  });

  it("cancels without changing the selection", () => {
    expect(_press({ state: ALL_SELECTED, keys: ["cancel"] })).toEqual({
      state: ALL_SELECTED,
      outcome: "cancel",
    });
  });

  it("ignores toggles in a single-choice menu", () => {
    expect(
      _press({
        state: { cursorIndex: 1, selectedIndexes: [] },
        keys: ["toggle", "toggleAll"],
        isMultiSelect: false,
      }).state.selectedIndexes,
    ).toEqual([]);
  });
});

describe("TerminalMenu.applyInput", () => {
  it("applies each key in a batched chunk until one ends the menu", () => {
    expect(
      TerminalMenu.applyInput({
        input: "j \rj",
        state: ALL_SELECTED,
        numItems: 3,
        isMultiSelect: true,
      }),
    ).toEqual({
      state: { cursorIndex: 1, selectedIndexes: [0, 2] },
      outcome: "confirm",
    });
  });

  it("ignores characters the menu does not use", () => {
    expect(
      TerminalMenu.applyInput({
        input: "xyz",
        state: ALL_SELECTED,
        numItems: 3,
        isMultiSelect: true,
      }),
    ).toEqual({ state: ALL_SELECTED, outcome: undefined });
  });
});

describe("TerminalMenu.makeLines", () => {
  it("marks the cursor with a pointer and checked items with a box", () => {
    expect(
      TerminalMenu.makeLines({
        state: { cursorIndex: 1, selectedIndexes: [0] },
        labels: ["feat-a", "feat-b"],
        isMultiSelect: true,
        isColorEnabled: false,
      }),
    ).toEqual(["  [x] feat-a", "› [ ] feat-b"]);
  });

  it("cuts a line to the terminal width so a redraw never wraps", () => {
    expect(
      TerminalMenu.makeLines({
        state: { cursorIndex: 0, selectedIndexes: [0] },
        labels: ["feat-a  (worktree ~/src/worktrees/avandar/feat/a is gone)"],
        isMultiSelect: true,
        isColorEnabled: false,
        maxWidth: 20,
      }),
    ).toEqual(["› [x] feat-a  (work…"]);
  });

  it("drops the boxes in a single-choice menu", () => {
    expect(
      TerminalMenu.makeLines({
        state: { cursorIndex: 0, selectedIndexes: [] },
        labels: ["Yes", "No"],
        isMultiSelect: false,
        isColorEnabled: false,
      }),
    ).toEqual(["› Yes", "  No"]);
  });
});
