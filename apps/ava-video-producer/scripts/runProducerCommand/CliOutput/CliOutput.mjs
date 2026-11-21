/** Formats every human command message using the same semantic colors. */
function _format(kind, text, stream = process.stderr) {
  const colors = {
    success: "1;32",
    warning: 33,
    error: 31,
    info: 36,
    heading: 1,
  };
  const hasColor =
    stream.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";
  return hasColor ? `\u001b[${colors[kind]}m${text}\u001b[0m` : text;
}

/** Shared stderr output. Machine results remain on stdout. */
export const CliOutput = {
  /** Returns a heading styled for help written to stdout. */
  helpHeading(message) {
    return _format("heading", message, process.stdout);
  },
  /** Announces a phase before work starts. */
  progress(message) {
    process.stderr.write(`${_format("info", `ℹ️ ${message}`)}\n`);
  },
  /** Reports a completed successful operation. */
  success(message) {
    process.stderr.write(`${_format("success", `✅ ${message}`)}\n`);
  },
  /** Reports a recoverable warning. */
  warning(message) {
    process.stderr.write(`${_format("warning", `⚠️ ${message}`)}\n`);
  },
  /** Reports an error and concrete recovery advice on separate lines. */
  error(message, recovery) {
    process.stderr.write(`${_format("error", `❌ ${message}`)}\n`);
    process.stderr.write(`${_format("warning", `  ⚠️ ${recovery}`)}\n`);
  },
  /** Returns a themed heading for the prompt's output stream. */
  heading(message) {
    return _format("heading", message);
  },
  /** Returns a highlighted choice with its textual cursor. */
  selection(message) {
    return _format("success", `> ${message}`);
  },
};
