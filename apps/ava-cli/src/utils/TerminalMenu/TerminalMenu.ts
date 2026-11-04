import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";

/** A key press the menu reacts to. */
export type MenuKey =
  | "up"
  | "down"
  | "first"
  | "last"
  | "toggle"
  | "toggleAll"
  | "confirm"
  | "cancel";

/** Where the cursor is and which items are checked. */
export type MenuState = {
  cursorIndex: number;
  selectedIndexes: readonly number[];
};

/** How a menu session ended. */
export type MenuResult =
  | { kind: "confirm"; state: MenuState }
  | { kind: "cancel" };

const KEY_FROM_INPUT: Readonly<Record<string, MenuKey>> = {
  "\u001B[A": "up",
  k: "up",
  "\u001B[B": "down",
  j: "down",
  g: "first",
  G: "last",
  " ": "toggle",
  a: "toggleAll",
  "\r": "confirm",
  "\n": "confirm",
  "\u0003": "cancel",
  "\u0004": "cancel",
  "\u001B": "cancel",
  q: "cancel",
};

function _getKeyFromInput(input: string): MenuKey | undefined {
  return KEY_FROM_INPUT[input];
}

function _getToggledIndexes(
  options: Readonly<{ selectedIndexes: readonly number[]; index: number }>,
): number[] {
  const { selectedIndexes, index } = options;
  return selectedIndexes.includes(index)
    ? selectedIndexes.filter((selectedIndex) => {
        return selectedIndex !== index;
      })
    : [...selectedIndexes, index].sort((left, right) => {
        return left - right;
      });
}

function _reduceKey(
  options: Readonly<{
    state: MenuState;
    key: MenuKey;
    itemCount: number;
    isMultiSelect: boolean;
  }>,
): { state: MenuState; outcome: "confirm" | "cancel" | undefined } {
  const { state, key, itemCount, isMultiSelect } = options;
  const lastIndex = itemCount - 1;
  const moveTo = (cursorIndex: number) => {
    return { state: { ...state, cursorIndex }, outcome: undefined };
  };
  switch (key) {
    case "up":
      return moveTo(
        state.cursorIndex === 0 ? lastIndex : state.cursorIndex - 1,
      );
    case "down":
      return moveTo(
        state.cursorIndex === lastIndex ? 0 : state.cursorIndex + 1,
      );
    case "first":
      return moveTo(0);
    case "last":
      return moveTo(lastIndex);
    case "toggle":
      return {
        state: isMultiSelect
          ? {
              ...state,
              selectedIndexes: _getToggledIndexes({
                selectedIndexes: state.selectedIndexes,
                index: state.cursorIndex,
              }),
            }
          : state,
        outcome: undefined,
      };
    case "toggleAll": {
      const isAllSelected = state.selectedIndexes.length === itemCount;
      return {
        state: isMultiSelect
          ? {
              ...state,
              selectedIndexes: isAllSelected
                ? []
                : Array.from({ length: itemCount }, (_unused, index) => {
                    return index;
                  }),
            }
          : state,
        outcome: undefined,
      };
    }
    case "confirm":
      return { state, outcome: "confirm" };
    case "cancel":
      return { state, outcome: "cancel" };
  }
}

function _makeLines(
  options: Readonly<{
    state: MenuState;
    labels: readonly string[];
    isMultiSelect: boolean;
    isColorEnabled: boolean;
  }>,
): string[] {
  const { state, labels, isMultiSelect, isColorEnabled } = options;
  return labels.map((label, index) => {
    const isCurrent = index === state.cursorIndex;
    const checkbox = isMultiSelect
      ? state.selectedIndexes.includes(index)
        ? "[x] "
        : "[ ] "
      : "";
    const line = `${isCurrent ? "›" : " "} ${checkbox}${label}`;
    return isCurrent
      ? CliTheme.paint({ style: "selection", text: line, isColorEnabled })
      : line;
  });
}

/** Draws the menu on stderr and resolves once the user confirms or cancels. */
function _prompt(
  options: Readonly<{
    title: string;
    hint: string;
    labels: readonly string[];
    isMultiSelect: boolean;
    initialState: MenuState;
  }>,
): Promise<MenuResult> {
  const { stdin, stderr } = process;
  const isColorEnabled = CliTheme.isColorEnabled({
    stream: stderr,
    env: process.env,
  });
  let state = options.initialState;
  let drawnLineCount = 0;

  const draw = () => {
    const lines = [
      CliTheme.paint({ style: "prompt", text: options.title, isColorEnabled }),
      CliTheme.paint({ style: "muted", text: options.hint, isColorEnabled }),
      ..._makeLines({ ...options, state, isColorEnabled }),
    ];
    const rewind =
      drawnLineCount > 0 ? `\u001B[${drawnLineCount}A\u001B[J` : "";
    stderr.write(`${rewind}${lines.join("\n")}\n`);
    drawnLineCount = lines.length;
  };

  return new Promise((resolve) => {
    const finish = (result: MenuResult) => {
      stdin.off("data", onData);
      stdin.off("end", onEnd);
      stdin.setRawMode(false);
      stdin.pause();
      stderr.write("\u001B[?25h");
      resolve(result);
    };
    const onEnd = () => {
      finish({ kind: "cancel" });
    };
    const onData = (chunk: Buffer) => {
      const input = chunk.toString("utf8");
      const keys = (
        _getKeyFromInput(input) === undefined ? [...input] : [input]
      ).flatMap((keyInput) => {
        const key = _getKeyFromInput(keyInput);
        return key === undefined ? [] : [key];
      });
      const result = keys.reduce<ReturnType<typeof _reduceKey>>(
        (previous, key) => {
          return previous.outcome === undefined
            ? _reduceKey({
                state: previous.state,
                key,
                itemCount: options.labels.length,
                isMultiSelect: options.isMultiSelect,
              })
            : previous;
        },
        { state, outcome: undefined },
      );
      state = result.state;
      if (result.outcome === "cancel") {
        finish({ kind: "cancel" });
        return;
      }
      if (result.outcome === "confirm") {
        finish({ kind: "confirm", state });
        return;
      }
      draw();
    };
    stderr.write("\u001B[?25l");
    draw();
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
    stdin.once("end", onEnd);
  });
}

/**
 * A keyboard-driven list for choosing one item or checking several, drawn on
 * stderr so stdout stays free for data.
 *
 * Use it for any interactive choice in `ava`, for example a yes/no
 * confirmation or picking which Docker projects to delete. Up/down and j/k
 * move and wrap, g/G jump to the ends, space and `a` toggle, Enter confirms,
 * and Esc, q, or Ctrl-C cancel. Only call it when stdin is a terminal.
 */
export const TerminalMenu = {
  /** Maps one raw stdin chunk to the menu key it means. */
  getKeyFromInput: _getKeyFromInput,

  /** Applies one key press to the menu state. */
  reduceKey: _reduceKey,

  /** Renders the item lines for a menu state. */
  makeLines: _makeLines,

  prompt: _prompt,

  /** Whether an interactive menu can run in this process. */
  isAvailable: (): boolean => {
    return process.stdin.isTTY === true && process.stderr.isTTY === true;
  },

  /** Asks a yes/no question; cancelling counts as the safer answer, "No". */
  confirm: async (
    options: Readonly<{ question: string; isYesDefault: boolean }>,
  ): Promise<boolean> => {
    const result = await _prompt({
      title: options.question,
      hint: "↑/↓ or j/k to move, Enter to choose, Esc to cancel",
      labels: ["Yes", "No"],
      isMultiSelect: false,
      initialState: {
        cursorIndex: options.isYesDefault ? 0 : 1,
        selectedIndexes: [],
      },
    });
    return result.kind === "confirm" && result.state.cursorIndex === 0;
  },
};
