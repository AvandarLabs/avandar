import { openSync } from "node:fs";
import { emitKeypressEvents } from "node:readline";
import { ReadStream, WriteStream } from "node:tty";

/**
 * Wizard IO shared by the native terminal implementation and contract tests.
 */
export type PromptIO = {
  ask: (label: string, defaultValue: string) => Promise<string>;
  choose: (
    label: string,
    values: readonly string[],
    selected: number,
  ) => Promise<number>;
  close?: () => void;
};

/** Shared semantic terminal theme. Redirected and plain output omit escapes. */
export function createTheme(isTerminal: boolean): {
  selected: (text: string) => string;
  heading: (text: string) => string;
  success: (text: string) => string;
  error: (text: string) => string;
  warning: (text: string) => string;
} {
  const color =
    isTerminal && !process.env.NO_COLOR && process.env.TERM !== "dumb";
  const wrap = (code: string) => {
    return (text: string): string => {
      return color ? `\u001b[${code}m${text}\u001b[0m` : text;
    };
  };
  return {
    selected: wrap("1;32"),
    heading: wrap("1;36"),
    success: wrap("32"),
    error: wrap("31"),
    warning: wrap("33"),
  };
}

/** Computes wrapping choice navigation without touching terminal state. */
export function getMenuSelection(
  key: string,
  selected: number,
  count: number,
): number {
  if (key === "g") {
    return 0;
  }
  if (key === "G") {
    return count - 1;
  }
  if (key === "up" || key === "k") {
    return (selected - 1 + count) % count;
  }
  if (key === "down" || key === "j") {
    return (selected + 1) % count;
  }
  return selected;
}

type Key = { name: string; text: string };
type KeyReader = () => Promise<Key>;

function _createKeyReader(input: ReadStream): KeyReader {
  const buffered: Array<Key | Error> = [];
  let pending: ((value: Key | Error) => void) | undefined;
  const deliver = (value: Key | Error): void => {
    if (pending) {
      const accept = pending;
      pending = undefined;
      accept(value);
    } else {
      buffered.push(value);
    }
  };
  input.on(
    "keypress",
    (text: string | undefined, key: { name?: string; ctrl?: boolean }) => {
      deliver(
        key.ctrl && (key.name === "c" || key.name === "d")
          ? new Error("Cancelled")
          : { name: key.name ?? "", text: text ?? "" },
      );
    },
  );
  input.on("end", () => {
    deliver(new Error("Cancelled (EOF)"));
  });
  input.on("error", deliver);
  return async () => {
    const value =
      buffered.shift() ??
      (await new Promise<Key | Error>((resolve) => {
        pending = resolve;
      }));
    if (value instanceof Error) {
      throw value;
    }
    return value;
  };
}

async function _ask(
  readKey: KeyReader,
  output: WriteStream,
  label: string,
  defaultValue: string,
): Promise<string> {
  output.write(`${label} [default: ${defaultValue}]: `);
  const read = async (value: string): Promise<string> => {
    const key = await readKey();
    if (key.name === "return") {
      output.write("\n");
      return value || defaultValue;
    }
    if (key.name === "backspace") {
      output.write(value ? "\b \b" : "");
      return read(value.slice(0, -1));
    }
    if (
      key.text &&
      Array.from(key.text).every((character) => {
        return character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127;
      })
    ) {
      output.write(key.text);
      return read(`${value}${key.text}`);
    }
    return read(value);
  };
  return read("");
}

async function _choose(
  readKey: KeyReader,
  output: WriteStream,
  label: string,
  values: readonly string[],
  initial: number,
): Promise<number> {
  const theme = createTheme(true);
  const choose = async (selected: number): Promise<number> => {
    output.write(
      `${theme.heading(label)} [default: ${values[initial]}]\n${values
        .map((value, index) => {
          return index === selected
            ? theme.selected(`> ${value}`)
            : `  ${value}`;
        })
        .join("\n")}\n`,
    );
    const key = await readKey();
    if (key.name === "return") {
      return selected;
    }
    const updated = getMenuSelection(
      key.name === "up" || key.name === "down" ? key.name : key.text,
      selected,
      values.length,
    );
    return choose(updated);
  };
  return choose(initial);
}

/**
 * Opens the controlling terminal without consuming piped input or data stdout.
 */
export function openTerminal(): PromptIO | undefined {
  let descriptor: number;
  try {
    descriptor = openSync("/dev/tty", "r+");
  } catch {
    return undefined;
  }
  const input = new ReadStream(descriptor);
  const output = new WriteStream(openSync("/dev/tty", "w"));
  emitKeypressEvents(input);
  const readKey = _createKeyReader(input);
  input.setRawMode(true);
  input.resume();
  return {
    ask: (label, defaultValue) => {
      return _ask(readKey, output, label, defaultValue);
    },
    choose: (label, values, selected) => {
      return _choose(readKey, output, label, values, selected);
    },
    close: () => {
      input.setRawMode(false);
      input.pause();
      input.destroy();
      output.destroy();
    },
  };
}
