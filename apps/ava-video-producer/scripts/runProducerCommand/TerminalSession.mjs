import { openSync, closeSync } from "node:fs";
import { emitKeypressEvents } from "node:readline";
import { ReadStream, WriteStream } from "node:tty";

function _fail(terminal, error) {
  terminal.error = error;
  terminal.waiting?.reject(error);
  terminal.waiting = undefined;
}

function _createTerminal(descriptor) {
  const input = new ReadStream(descriptor, { autoClose: false });
  const output = new WriteStream(descriptor, { autoClose: false });
  const wasRaw = input.isRaw;
  const terminal = {
    input,
    output,
    keys: [],
    waiting: undefined,
    error: undefined,
    close() {
      input.setRawMode(wasRaw);
      input.pause();
      input.destroy();
      output.destroy();
      closeSync(descriptor);
    },
  };
  emitKeypressEvents(input);
  input.on("keypress", (text, key) => {
    const event = { text, ...key };
    if (terminal.waiting) {
      const pending = terminal.waiting;
      terminal.waiting = undefined;
      pending.resolve(event);
    } else terminal.keys.push(event);
  });
  input.on("end", () =>
    _fail(terminal, new Error("Cancelled: terminal input ended.")),
  );
  input.on("error", (error) => _fail(terminal, error));
  input.setRawMode(true);
  input.resume();
  return terminal;
}

/**
 * Opens a controlling terminal and buffers every key, including pasted input.
 */
function _open() {
  let descriptor;
  try {
    descriptor = openSync("/dev/tty", "r+");
    return _createTerminal(descriptor);
  } catch {
    if (descriptor !== undefined) closeSync(descriptor);
    return undefined;
  }
}

/** Returns the next buffered key and rejects cancellation or terminal EOF. */
async function _readKey(terminal) {
  if (terminal.error) throw terminal.error;
  const key = terminal.keys.length
    ? terminal.keys.shift()
    : await new Promise((resolve, reject) => {
        terminal.waiting = { resolve, reject };
      });
  if ((key.ctrl && ["c", "d"].includes(key.name)) || key.name === "escape")
    throw new Error("Cancelled.");
  return key;
}

/**
 * Controlling-terminal lifecycle and buffered input for every producer prompt.
 */
export const TerminalSession = {
  /** Opens a terminal when available, otherwise returns undefined. */
  open: _open,
  /** Returns the next key or throws on cancellation and EOF. */
  readKey: _readKey,
};
