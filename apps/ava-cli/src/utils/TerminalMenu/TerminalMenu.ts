import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { isDefined, makeArrayWithLength, matchLiteral } from "@avandar/utils";

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
  selectedIndexes: number[];
};

/** A menu state after some input, and whether that input ended the menu. */
export type MenuStep = {
  state: MenuState;
  outcome: "confirm" | "cancel" | undefined;
};

/** How a menu session ended. */
export type MenuResult =
  | { kind: "confirm"; state: MenuState }
  | { kind: "cancel" };

/** What a menu shows: its question, key hint, and one label per item. */
type MenuContent = {
  title: string;
  hint: string;
  labels: readonly string[];
  isMultiSelect: boolean;
};

const KEY_FROM_INPUT: Record<string, MenuKey> = {
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

/** The checked items after a toggle key, or unchanged for any other key. */
function _getSelectionAfterKey(
  options: Readonly<{
    key: "toggle" | "toggleAll";
    state: Readonly<MenuState>;
    numItems: number;
  }>,
): number[] {
  const { state, numItems } = options;
  if (options.key === "toggleAll") {
    return state.selectedIndexes.length === numItems
      ? []
      : makeArrayWithLength(numItems);
  }
  return state.selectedIndexes.includes(state.cursorIndex)
    ? state.selectedIndexes.filter((selectedIndex) => {
        return selectedIndex !== state.cursorIndex;
      })
    : [...state.selectedIndexes, state.cursorIndex].sort((left, right) => {
        return left - right;
      });
}

/** Where the cursor lands after a movement key, wrapping at both ends. */
function _getCursorIndexAfterKey(
  options: Readonly<{
    key: "up" | "down" | "first" | "last";
    cursorIndex: number;
    numItems: number;
  }>,
): number {
  const { cursorIndex } = options;
  const lastIndex = options.numItems - 1;
  return matchLiteral(options.key, {
    up: cursorIndex === 0 ? lastIndex : cursorIndex - 1,
    down: cursorIndex === lastIndex ? 0 : cursorIndex + 1,
    first: 0,
    last: lastIndex,
  });
}

function _reduceKey(
  options: Readonly<{
    state: Readonly<MenuState>;
    key: MenuKey;
    numItems: number;
    isMultiSelect: boolean;
  }>,
): MenuStep {
  const { state, numItems, isMultiSelect } = options;
  const move = (key: "up" | "down" | "first" | "last"): MenuStep => {
    const cursorIndex = _getCursorIndexAfterKey({
      key,
      cursorIndex: state.cursorIndex,
      numItems,
    });
    return { state: { ...state, cursorIndex }, outcome: undefined };
  };
  const toggle = (key: "toggle" | "toggleAll"): MenuStep => {
    const selectedIndexes = isMultiSelect
      ? _getSelectionAfterKey({ key, state, numItems })
      : state.selectedIndexes;
    return { state: { ...state, selectedIndexes }, outcome: undefined };
  };
  const end = (outcome: "confirm" | "cancel"): MenuStep => {
    return { state: { ...state }, outcome };
  };
  return matchLiteral(options.key, {
    up: move,
    down: move,
    first: move,
    last: move,
    toggle,
    toggleAll: toggle,
    confirm: end,
    cancel: end,
  });
}

function _applyInput(
  options: Readonly<{
    input: string;
    state: Readonly<MenuState>;
    numItems: number;
    isMultiSelect: boolean;
  }>,
): MenuStep {
  const { input, numItems, isMultiSelect } = options;
  // An escape sequence arrives as one chunk, but fast typing can batch plain
  // keys together, so a chunk that is not itself a key is read per character.
  const keys = (_getKeyFromInput(input) === undefined ? [...input] : [input])
    .map(_getKeyFromInput)
    .filter(isDefined);
  return keys.reduce<MenuStep>(
    (stepResult, key) => {
      return stepResult.outcome === undefined
        ? _reduceKey({ state: stepResult.state, key, numItems, isMultiSelect })
        : stepResult;
    },
    { state: { ...options.state }, outcome: undefined },
  );
}

function _truncate(
  options: Readonly<{ text: string; maxWidth: number | undefined }>,
): string {
  const { text, maxWidth } = options;
  return maxWidth === undefined || [...text].length <= maxWidth
    ? text
    : `${[...text].slice(0, Math.max(maxWidth - 1, 0)).join("")}…`;
}

function _makeLines(
  options: Readonly<{
    state: Readonly<MenuState>;
    labels: readonly string[];
    isMultiSelect: boolean;
    isColorEnabled: boolean;
    /** Widest a line may be, so a redraw never wraps onto an extra row. */
    maxWidth?: number;
  }>,
): string[] {
  const { state, labels, isMultiSelect, isColorEnabled, maxWidth } = options;
  return labels.map((label, index) => {
    const isCurrent = index === state.cursorIndex;
    const checkbox = isMultiSelect
      ? state.selectedIndexes.includes(index)
        ? "[x] "
        : "[ ] "
      : "";
    const line = _truncate({
      text: `${isCurrent ? "›" : " "} ${checkbox}${label}`,
      maxWidth,
    });
    return isCurrent
      ? CliTheme.paint({ style: "selection", text: line, isColorEnabled })
      : line;
  });
}

function _makeFrameLines(
  options: Readonly<
    MenuContent & {
      state: Readonly<MenuState>;
      isColorEnabled: boolean;
      maxWidth: number;
    }
  >,
): string[] {
  const { isColorEnabled, maxWidth } = options;
  return [
    CliTheme.paint({
      style: "prompt",
      text: _truncate({ text: options.title, maxWidth }),
      isColorEnabled,
    }),
    CliTheme.paint({
      style: "muted",
      text: _truncate({ text: options.hint, maxWidth }),
      isColorEnabled,
    }),
    ..._makeLines(options),
  ];
}

/** Draws a frame on stderr, first rewinding over the one drawn before. */
function _createFrameDrawer(
  content: Readonly<MenuContent>,
): (state: Readonly<MenuState>) => void {
  const { stderr } = process;
  const isColorEnabled = CliTheme.isColorEnabled({
    stream: stderr,
    env: process.env,
  });
  let numDrawnLines = 0;
  return (state) => {
    // One column spare, since some terminals wrap a line that fills the row.
    const maxWidth = Math.max((stderr.columns || 80) - 1, 20);
    const lines = _makeFrameLines({
      ...content,
      state,
      isColorEnabled,
      maxWidth,
    });
    const rewind = numDrawnLines > 0 ? `\u001B[${numDrawnLines}A\u001B[J` : "";
    stderr.write(`${rewind}${lines.join("\n")}\n`);
    numDrawnLines = lines.length;
  };
}

function _prompt(
  options: Readonly<MenuContent & { initialState: MenuState }>,
): Promise<MenuResult> {
  const { stdin, stderr } = process;
  const draw = _createFrameDrawer(options);
  let state = options.initialState;
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
      const step = _applyInput({
        input: chunk.toString("utf8"),
        state,
        numItems: options.labels.length,
        isMultiSelect: options.isMultiSelect,
      });
      state = step.state;
      if (step.outcome === undefined) {
        draw(state);
        return;
      }
      finish(
        step.outcome === "cancel"
          ? { kind: "cancel" }
          : { kind: "confirm", state },
      );
    };
    stderr.write("\u001B[?25l");
    draw(state);
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

  /** Applies a raw stdin chunk, which may hold several keys. */
  applyInput: _applyInput,

  /** Renders the item lines for a menu state. */
  makeLines: _makeLines,

  /**
   * Draws the menu on stderr and resolves once the user confirms or
   * cancels.
   */
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
