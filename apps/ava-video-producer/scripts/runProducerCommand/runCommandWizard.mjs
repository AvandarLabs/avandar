async function _askDirectComposition({
  direct,
  commandName,
  arguments_,
  terminal,
}) {
  if (direct && ["preview", "render"].includes(commandName))
    arguments_.push(
      await PromptView.line({
        terminal,
        label: "Composition identifier",
        fallback: "demo",
      }),
    );
}

async function _askPositionals({
  schema,
  commandName,
  action,
  terminal,
  arguments_,
}) {
  if (commandName === "theme:parity")
    return _askParityTargets({ terminal, arguments_ });
  if (
    schema.positional &&
    commandName !== "capture" &&
    !(commandName === "motion" && action === "list")
  ) {
    const positional = await PromptView.line({
      terminal,
      label: schema.positional,
      fallback: schema.fallback,
    });
    if (positional)
      arguments_.push(
        ...(schema.maximum === Infinity
          ? positional.split(/\s+/)
          : [positional]),
      );
  }
}

async function _askMissing({ supplied, terminal, parsed }) {
  const arguments_ = [...supplied];
  if (parsed.positional.length < (parsed.schema.minimum ?? 0)) {
    const value = await PromptView.line({
      terminal,
      label: parsed.schema.positional,
    });
    const insertion = parsed.action ? 1 : 0;
    arguments_.splice(insertion, 0, value);
  }
  for (const [name, definition] of Object.entries(parsed.schema.flags ?? {})) {
    if (definition.required && !parsed.values[name])
      arguments_.push(...(await _askFlag({ terminal, name, definition })));
  }
  return arguments_;
}

async function _chooseSourceMode({ commandName, terminal }) {
  if (commandName === "data:generate") {
    const mode = await PromptView.choose({
      terminal,
      label: "Fixture operation",
      choices: ["Generate fixtures", "Check regeneration", "Print model JSON"],
    });
    return mode === "Check regeneration"
      ? ["--check"]
      : mode === "Print model JSON"
        ? ["--model"]
        : [];
  }
  if (commandName === "capture") {
    const mode = await PromptView.choose({
      terminal,
      label: "Capture action",
      choices: ["Record flows", "List flows"],
    });
    if (mode === "List flows") return ["--list"];
  }
  return undefined;
}

import { CommandSchemas } from "./CommandSchemas.mjs";
import { PromptView } from "./PromptView.mjs";

async function _askFlag({ terminal, name, definition }) {
  if (definition.boolean) {
    const answer = await PromptView.choose({
      terminal,
      label: definition.label,
      choices: ["No", "Yes"],
      selected: definition.fallback ? 1 : 0,
    });
    return answer === "Yes" ? [name] : [`${name}=false`];
  }
  const value = definition.values
    ? await PromptView.choose({
        terminal,
        label: definition.label,
        choices: definition.values,
        selected: definition.values.indexOf(definition.fallback),
      })
    : await PromptView.line({
        terminal,
        label: definition.label,
        fallback: definition.fallback,
      });
  return value ? [name, value] : [];
}

/** Returns confirmed values for every applicable field and visible default. */
export async function runCommandWizard({
  commandName,
  arguments: supplied,
  terminal,
  parsed,
  onlyMissing = false,
  direct = false,
}) {
  const base = CommandSchemas[commandName];
  if (!base || base.forward) return supplied;
  if (onlyMissing)
    return _askMissing({ commandName, supplied, terminal, parsed });
  const modeArguments = await _chooseSourceMode({ commandName, terminal });
  if (modeArguments) return modeArguments;
  const action = base.actions
    ? (supplied[0] ??
      (await PromptView.choose({
        terminal,
        label: `${commandName}: choose an action`,
        choices: base.actions,
      })))
    : undefined;
  const schema = {
    ...base,
    flags: { ...base.flags, ...base.actionFlags?.[action] },
  };
  const arguments_ = action ? [action] : [];
  await _askDirectComposition({ direct, commandName, arguments_, terminal });
  await _askPositionals({ schema, commandName, action, terminal, arguments_ });
  const flags =
    commandName === "motion" && action === "list" ? {} : schema.flags;
  for (const [name, definition] of Object.entries(flags)) {
    if (
      (commandName === "capture" && name === "--list") ||
      (commandName === "theme:parity" && name === "--all") ||
      (direct && name === "--composition")
    )
      continue;
    arguments_.push(...(await _askFlag({ terminal, name, definition })));
  }
  return arguments_;
}

async function _askParityTargets({ terminal, arguments_ }) {
  const mode = await PromptView.choose({
    terminal,
    label: "Parity target selection",
    choices: ["Fast base targets", "All targets", "Selected target IDs"],
  });
  if (mode === "All targets") arguments_.push("--all");
  else if (mode === "Selected target IDs") {
    const selection = await PromptView.line({
      terminal,
      label: "Target IDs separated by spaces",
    });
    arguments_.push(...selection.split(/\s+/).filter(Boolean));
  }
}
