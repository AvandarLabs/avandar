/** A semantic role a piece of terminal output plays. */
export type CliStyle =
  | "heading"
  | "accent"
  | "value"
  | "muted"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "prompt"
  | "selection";

/** The part of a Node stream that decides whether it is a terminal. */
type StreamLike = { isTTY?: boolean };

/** Escape codes per style, chosen to stay readable on a dark terminal. */
const ESCAPE_CODE_FROM_STYLE: Record<CliStyle, string> = {
  heading: "\u001B[1;96m",
  accent: "\u001B[96m",
  value: "\u001B[97m",
  muted: "\u001B[90m",
  success: "\u001B[32m",
  warning: "\u001B[33m",
  error: "\u001B[31m",
  info: "\u001B[36m",
  prompt: "\u001B[1;96m",
  selection: "\u001B[1;32m",
};

const RESET_CODE = "\u001B[0m";

function _isColorEnabled(
  options: Readonly<{ stream: StreamLike; env: NodeJS.ProcessEnv }>,
): boolean {
  const { stream, env } = options;
  return (
    stream.isTTY === true && (env.NO_COLOR ?? "") === "" && env.TERM !== "dumb"
  );
}

function _paint(
  options: Readonly<{ style: CliStyle; text: string; isColorEnabled: boolean }>,
): string {
  const { style, text, isColorEnabled } = options;
  return isColorEnabled
    ? `${ESCAPE_CODE_FROM_STYLE[style]}${text}${RESET_CODE}`
    : text;
}

function _makeErrorLines(
  options: Readonly<{
    command: string;
    message: string;
    hint: string;
    isColorEnabled: boolean;
  }>,
): string[] {
  const { isColorEnabled } = options;
  return [
    _paint({
      style: "error",
      text: `❌ ${options.command}: ${options.message}`,
      isColorEnabled,
    }),
    _paint({ style: "warning", text: `  ⚠️ ${options.hint}`, isColorEnabled }),
  ];
}

/** Writes one styled line to a stream, colored only when it is a terminal. */
function _writeLine(
  options: Readonly<{
    stream: NodeJS.WriteStream;
    style?: CliStyle;
    text: string;
  }>,
): void {
  const { stream, style, text } = options;
  const isColorEnabled = _isColorEnabled({ stream, env: process.env });
  stream.write(
    `${style === undefined ? text : _paint({ style, text, isColorEnabled })}\n`,
  );
}

/**
 * The one place `ava` commands decide how output looks, so every command
 * shares colors, emoji, and the plain-text fallback.
 *
 * Use it for progress, warnings, and errors on stderr, and for a styled
 * report on stdout, for example a status summary. Color turns off when the
 * stream is not a terminal, when `NO_COLOR` is set, or when `TERM=dumb`.
 */
export const CliTheme = {
  /** Whether output written to this stream should carry color codes. */
  isColorEnabled: _isColorEnabled,

  /** Styles a string, or returns it unchanged when color is off. */
  paint: _paint,

  /** Styles a string for one stream, checking that stream's color support. */
  paintFor: (
    options: Readonly<{
      stream: NodeJS.WriteStream;
      style: CliStyle;
      text: string;
    }>,
  ): string => {
    return _paint({
      style: options.style,
      text: options.text,
      isColorEnabled: _isColorEnabled({
        stream: options.stream,
        env: process.env,
      }),
    });
  },

  /** The two lines of a failure: what went wrong, then how to fix it. */
  makeErrorLines: _makeErrorLines,

  writeLine: _writeLine,

  /** Announces work on stderr before it starts. */
  progress: (text: string): void => {
    _writeLine({ stream: process.stderr, style: "info", text: `⏳ ${text}` });
  },

  /** Reports a completed outcome on stderr. */
  success: (text: string): void => {
    _writeLine({
      stream: process.stderr,
      style: "success",
      text: `✅ ${text}`,
    });
  },

  /** Reports something the user should look at, on stderr. */
  warning: (text: string): void => {
    _writeLine({
      stream: process.stderr,
      style: "warning",
      text: `⚠️  ${text}`,
    });
  },

  /** Reports neutral information on stderr. */
  info: (text: string): void => {
    _writeLine({ stream: process.stderr, style: "info", text });
  },

  /** Reports a failure and its fix on stderr. */
  error: (
    options: Readonly<{ command: string; message: string; hint: string }>,
  ): void => {
    _makeErrorLines({
      ...options,
      isColorEnabled: _isColorEnabled({
        stream: process.stderr,
        env: process.env,
      }),
    }).forEach((line) => {
      process.stderr.write(`${line}\n`);
    });
  },
};
