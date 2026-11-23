import { CliOutput } from "./CliOutput/CliOutput.mjs";
import { TerminalSession } from "./TerminalSession.mjs";

/** Returns a wrapped choice index for the documented terminal keys. */
function _move({ index, length, key }) {
  if (["up", "k"].includes(key)) return (index + length - 1) % length;
  if (["down", "j"].includes(key)) return (index + 1) % length;
  if (key === "g") return 0;
  if (key === "G") return length - 1;
  return index;
}

/** Prompts for a choice with arrows, j/k, g/G and Enter. */
async function _choose({ terminal, label, choices, selected = 0 }) {
  let index = selected;
  terminal.output.write(`${CliOutput.heading(label)}\n`);
  while (true) {
    terminal.output.write(
      choices
        .map((choice, choiceIndex) =>
          choiceIndex === index ? CliOutput.selection(choice) : `  ${choice}`,
        )
        .join("\n") + "\n",
    );
    const key = await TerminalSession.readKey(terminal);
    if (key.name === "return") return choices[index];
    index = _move({
      index,
      length: choices.length,
      key: ["up", "down"].includes(key.name) ? key.name : key.text || key.name,
    });
  }
}

/** Prompts for an editable line with a visible default, preserving spaces. */
async function _line({ terminal, label, fallback = "" }) {
  terminal.output.write(`${label}${fallback ? ` [${fallback}]` : ""}: `);
  let value = "";
  while (true) {
    const key = await TerminalSession.readKey(terminal);
    if (key.name === "return") {
      terminal.output.write("\n");
      return value || String(fallback);
    }
    if (key.name === "backspace") {
      value = value.slice(0, -1);
      terminal.output.write(
        process.env.NO_COLOR || process.env.TERM === "dumb"
          ? `\n${label}: ${value}`
          : "\b \b",
      );
    } else if (key.text && !key.ctrl && !key.meta && key.name !== "tab") {
      value += key.text;
      terminal.output.write(key.text);
    }
  }
}

/** Shared full-wizard prompts and pure menu navigation. */
export const PromptView = {
  /** Returns the wrapped index for a navigation key. */
  move: _move,
  /** Returns a confirmed choice without executing it. */
  choose: _choose,
  /** Returns an editable terminal line or its accepted default. */
  line: _line,
};
