import { openSync } from "node:fs";
import { emitKeypressEvents } from "node:readline";
import { ReadStream, WriteStream } from "node:tty";

/** Inputs consumed by _ask. */
type AskOptions = {
  readKey: KeyReader;
  output: WriteStream;
  label: string;
  defaultValue: string;
};

/** Inputs consumed by _choose. */
type ChooseOptions = {
  readKey: KeyReader;
  output: WriteStream;
  label: string;
  values: readonly string[];
  initial: number;
};

/**
 * Wizard IO shared by the native terminal implementation and contract tests.
 */
export type PromptIo = {
  ask: (label: string, defaultValue: string) => Promise<string>;
  choose: (
    label: string,
    values: readonly string[],
    selected: number,
  ) => Promise<number>;
  close?: () => void;
};

/** Semantic text roles shared by command help, prompts, and diagnostics. */
export type TerminalTheme = {
  selected: (text: string) => string;
  heading: (text: string) => string;
  accent: (text: string) => string;
  value: (text: string) => string;
  muted: (text: string) => string;
  success: (text: string) => string;
  error: (text: string) => string;
  warning: (text: string) => string;
  info: (text: string) => string;
  prompt: (text: string) => string;
};

/**
 * Creates terminal text roles. Use it, for example, to keep help and errors
 * readable while omitting color on redirected or explicitly plain output.
 */
export function createTheme(isTerminal: boolean): TerminalTheme {
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
    accent: wrap("36"),
    value: wrap("37"),
    muted: wrap("90"),
    success: wrap("32"),
    error: wrap("31"),
    warning: wrap("33"),
    info: wrap("34"),
    prompt: wrap("1;36"),
  };
}

/**
 * Builds themed command help. Use it, for example, when printing the same
 * usage text to a terminal or a plain redirected stream.
 */
export function buildHelpText(
  options: Readonly<{
    text: string;
    isTerminal: boolean;
  }>,
): string {
  const theme = createTheme(options.isTerminal);
  return options.text
    .split("\n")
    .map((line, index) => {
      if (index === 0) {
        return theme.info(line);
      }
      return line
        .replace(
          /^(Usage:|Commands:|Arguments:|Options:|Examples:)/,
          (heading) => {
            return theme.heading(heading);
          },
        )
        .replace(
          /^(\s+)(--[\w-]+|-[a-z]\b|coverage\b|PATH\b)/,
          (_match, space, name) => {
            return `${space}${theme.accent(name)}`;
          },
        )
        .replace(/(Default:) ([^.]+\.)/g, (_match, label, value) => {
          return `${theme.muted(label)} ${theme.value(value)}`;
        });
    })
    .join("\n");
}

/**
 * Returns the selected index after a navigation key, wrapping at the ends.
 * Use it, for example, to update an interactive choice menu.
 */
export function getMenuSelectionFromKey({
  key,
  selected,
  numChoices,
}: Readonly<{ key: string; selected: number; numChoices: number }>): number {
  if (key === "g") {
    return 0;
  }
  if (key === "G") {
    return numChoices - 1;
  }
  if (key === "up" || key === "k") {
    return (selected - 1 + numChoices) % numChoices;
  }
  if (key === "down" || key === "j") {
    return (selected + 1) % numChoices;
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

async function _ask({
  readKey,
  output,
  label,
  defaultValue,
}: Readonly<AskOptions>): Promise<string> {
  const theme = createTheme(true);
  output.write(
    `${theme.prompt(label)} [${theme.muted("default:")} ${theme.value(defaultValue)}]: `,
  );
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

async function _choose({
  readKey,
  output,
  label,
  values,
  initial,
}: Readonly<ChooseOptions>): Promise<number> {
  const theme = createTheme(true);
  const choose = async (selected: number): Promise<number> => {
    output.write(
      `${theme.prompt(label)} [${theme.muted("default:")} ${theme.value(values[initial] ?? "")}]\n${values
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
    const updated = getMenuSelectionFromKey({
      key: key.name === "up" || key.name === "down" ? key.name : key.text,
      selected: selected,
      numChoices: values.length,
    });
    return choose(updated);
  };
  return choose(initial);
}

/**
 * Opens prompt IO on the controlling terminal, or returns undefined if
 * unavailable.
 * Use it, for example, to prompt while preserving piped input and data stdout.
 */
export function openTerminal(): PromptIo | undefined {
  const descriptor: number | undefined = (() => {
    try {
      return openSync("/dev/tty", "r+");
    } catch {
      return undefined;
    }
  })();
  if (descriptor === undefined) {
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
      return _ask({
        readKey: readKey,
        output: output,
        label: label,
        defaultValue: defaultValue,
      });
    },
    choose: (label, values, selected) => {
      return _choose({
        readKey: readKey,
        output: output,
        label: label,
        values: values,
        initial: selected,
      });
    },
    close: () => {
      input.setRawMode(false);
      input.pause();
      input.destroy();
      output.destroy();
    },
  };
}
