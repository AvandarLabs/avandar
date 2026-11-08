import type { SimulatedUserScript } from "../EvalQuestion";

/** What the simulated user submits on a clarification card. */
export type SimulatedAnswer =
  | { kind: "preset"; value: string | string[] }
  | { kind: "custom"; text: string };

function _normalize(text: string): string {
  return text.normalize("NFKC").trim().toLowerCase();
}

/**
 * Picks a fixed option: the first one matching the script's pattern, else the
 * script's typed answer, else the first option.
 */
function _answerOptions(
  options: readonly string[],
  script: SimulatedUserScript | undefined,
): SimulatedAnswer {
  const chosen = script?.choose
    ? options.find((option) => {
        return script.choose!.test(option);
      })
    : undefined;
  if (chosen) {
    return { kind: "preset", value: chosen };
  }
  if (script?.say) {
    return { kind: "custom", text: script.say };
  }
  return options[0]
    ? { kind: "preset", value: options[0] }
    : { kind: "custom", text: "Use your best judgment." };
}

/** Answers a free-text question with the script's answer or a neutral one. */
function _answerFreeText(script: SimulatedUserScript | undefined): string {
  return script?.say ?? "Use your best judgment.";
}

/**
 * Picks values on a lookup card: the values the script names, else the listed
 * values the prompt names. Types the names when none are listed.
 */
function _pickValues(
  listedValues: readonly string[],
  script: SimulatedUserScript | undefined,
  prompt: string,
): SimulatedAnswer {
  const wanted = script?.pick?.map(_normalize);
  const picks = listedValues.filter((value) => {
    return wanted
      ? wanted.includes(_normalize(value))
      : _normalize(value).length > 2 &&
          _normalize(prompt).includes(_normalize(value));
  });
  if (picks.length > 0) {
    return { kind: "preset", value: picks.length === 1 ? picks[0]! : picks };
  }
  if (script?.pick) {
    return { kind: "custom", text: script.pick.join(", ") };
  }
  return listedValues[0]
    ? { kind: "preset", value: listedValues[0] }
    : { kind: "custom", text: "Use your best judgment." };
}

/** Formats an answer the way the clarification card adds it to the thread. */
function _toThreadText(answer: SimulatedAnswer): string {
  if (answer.kind === "custom") {
    return `[Clarification answer: (custom answer: ${answer.text.trim()})]`;
  }
  const rendered = Array.isArray(answer.value)
    ? answer.value.join(", ")
    : answer.value;
  return `[Clarification answer: ${rendered}]`;
}

/** A scripted stand-in for the person answering clarification cards. */
export const SimulatedUser = {
  answerOptions: _answerOptions,
  answerFreeText: _answerFreeText,
  pickValues: _pickValues,
  toThreadText: _toThreadText,
};
