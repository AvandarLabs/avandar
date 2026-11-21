function _normalizeInventory({
  commandName,
  parsed,
  positional,
  arguments_,
  values,
  environment,
}) {
  if (commandName === "capture" && positional.length) {
    environment.AVA_PRODUCER_LIST_FILTER = JSON.stringify(
      positional[0] === "list" ? positional.slice(1) : positional,
    );
    values["--list"] = true;
    positional.length = 0;
  }
  if (
    commandName === "motion" &&
    (!parsed.action || parsed.action === "list")
  ) {
    environment.AVA_PRODUCER_LIST_FILTER = JSON.stringify(
      positional.filter((word) => word !== "all"),
    );
    positional.splice(0, positional.length, "all");
    arguments_.splice(0, arguments_.length, "list");
  }
}

function _appendFlags({
  commandName,
  values,
  schema,
  arguments_,
  environment,
}) {
  for (const [name, value] of Object.entries(values)) {
    const definition = schema.flags?.[name];
    if (definition?.environment)
      environment[definition.environment] = String(value);
    if (
      commandName === "render" &&
      ["--standalone", "--declared-cuts", "--keep-frames"].includes(name)
    ) {
      const variable = {
        "--standalone": "STANDALONE",
        "--declared-cuts": "DECLARED_CUTS",
        "--keep-frames": "KEEP_RENDER_FRAMES",
      }[name];
      environment[variable] =
        typeof value === "boolean" ? (value ? "1" : "0") : String(value);
    } else if (name === "--force") environment.FORCE = value ? "1" : "0";
    else if (name === "--preview-only")
      environment.PREVIEW_ONLY = value ? "1" : "0";
    else if (!definition?.omit && value !== false) {
      if (commandName === "adopt" && name === "--mode")
        arguments_.push(`--mode=${value}`);
      else
        arguments_.push(...(value === true ? [name] : [name, String(value)]));
    }
  }
}

/** Returns worker arguments and environment values for the public flags. */
export function normalizeCommandArguments({
  commandName,
  parsed,
  direct = false,
}) {
  const environment = {};
  const values = { ...parsed.values };
  const positional = [...parsed.positional];
  const arguments_ = parsed.action ? [parsed.action] : [];
  if (["preview", "render"].includes(commandName)) {
    if (!direct)
      environment.AVA_PRODUCER_COMPOSITION = values["--composition"] ?? "demo";
    if (direct && !positional.length)
      positional.push(values["--composition"] ?? "demo");
    if (direct && values["--composition"])
      positional[0] = values["--composition"];
  }
  _normalizeInventory({
    commandName,
    parsed,
    positional,
    arguments_,
    values,
    environment,
  });
  if (commandName === "check" && !positional.length)
    positional.push("out/demo.mp4");
  arguments_.push(...positional);
  _appendFlags({
    commandName,
    values,
    schema: parsed.schema,
    arguments_,
    environment,
  });
  return { arguments: arguments_, environment };
}
