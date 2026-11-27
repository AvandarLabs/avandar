import { openSync } from "node:fs";
import { emitKeypressEvents } from "node:readline";
import { ReadStream, WriteStream } from "node:tty";

/**
 * Creates terminal text roles for `benchmarkLint.mjs`, omitting ANSI color on
 * redirected or plain streams.
 */
export function createTheme(isTerminal) {
  const color =
    isTerminal && !process.env.NO_COLOR && process.env.TERM !== "dumb";
  const wrap = (code) => {
    return (text) => {
      return color ? `\u001b[${code}m${text}\u001b[0m` : text;
    };
  };
  return {
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
 * Builds themed command help for `benchmarkLint.mjs` while preserving plain
 * output when redirected.
 */
export function buildHelpText(options) {
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
        .replace(/^(\s+)(--[\w-]+|-[a-z]\b)/, (_match, space, name) => {
          return `${space}${theme.accent(name)}`;
        })
        .replace(/(Default:) ([^.]+\.)/g, (_match, label, value) => {
          return `${theme.muted(label)} ${theme.value(value)}`;
        });
    })
    .join("\n");
}

function _createKeyReader(input) {
  const buffered = [];
  let pending;
  const deliver = (value) => {
    if (pending) {
      const accept = pending;
      pending = undefined;
      accept(value);
    } else {
      buffered.push(value);
    }
  };
  input.on("keypress", (text, key) => {
    deliver(
      key.ctrl && (key.name === "c" || key.name === "d")
        ? new Error("Cancelled")
        : { name: key.name ?? "", text: text ?? "" },
    );
  });
  input.on("end", () => {
    deliver(new Error("Cancelled (EOF)"));
  });
  input.on("error", deliver);
  return async () => {
    const value =
      buffered.shift() ??
      (await new Promise((resolve) => {
        pending = resolve;
      }));
    if (value instanceof Error) {
      throw value;
    }
    return value;
  };
}

async function _ask({ readKey, output, label, defaultValue }) {
  const theme = createTheme(true);
  output.write(
    `${theme.prompt(label)} [${theme.muted("default:")} ${theme.value(defaultValue)}]: `,
  );
  const read = async (value) => {
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

/**
 * Opens prompt IO on the controlling terminal for `benchmarkLint.mjs`, or
 * returns undefined if unavailable.
 */
export function openTerminal() {
  let descriptor;
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
      return _ask({ readKey, output, label, defaultValue });
    },
    close: () => {
      input.setRawMode(false);
      input.pause();
      input.destroy();
      output.destroy();
    },
  };
}
