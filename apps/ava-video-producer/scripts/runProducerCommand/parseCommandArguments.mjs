import { CompositionIds } from "./CompositionIds.mjs";
function _validateRequiredFlags({ requireValues, schema, tokens }) {
  if (
    requireValues &&
    Object.entries(schema.flags ?? {}).some(
      ([name, flag]) => flag.required && !tokens.values[name],
    )
  )
    throw new Error("Missing required option value.");
}

function _validateExclusiveOptions({ commandName, tokens, positional }) {
  if (
    commandName === "data:generate" &&
    tokens.values["--check"] &&
    tokens.values["--model"]
  )
    throw new Error("--check and --model are mutually exclusive.");
  if (
    commandName === "theme:parity" &&
    tokens.values["--all"] &&
    positional.length
  )
    throw new Error("Choose target IDs or --all, not both.");
}

import { CommandSchemas } from "./CommandSchemas.mjs";

/**
 * Validates one public option value without reading configuration or outputs.
 */
function _validateValue(name, value, definition) {
  if (!value || (value.startsWith("--") && name !== "--output-suffix"))
    throw new Error(`Missing value for ${name}.`);
  if (definition.values && !definition.values.includes(value))
    throw new Error(`${name} must be ${definition.values.join("| ")}.`);
  if (definition.pattern && !definition.pattern.test(value))
    throw new Error(`Invalid value for ${name}: ${value}.`);
  if (definition.integer) {
    const number = Number(value);
    const [minimum, maximum = Infinity] = definition.integer;
    if (
      !/^\d+$/.test(value) ||
      !Number.isSafeInteger(number) ||
      number < minimum ||
      number > maximum
    )
      throw new Error(
        `${name} must be an integer from ${minimum} to ${maximum}.`,
      );
  }
}

function _readTokens(argv, flags) {
  const positional = [];
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") continue;
    if (!token.startsWith("-")) {
      positional.push(token);
      continue;
    }
    const [name, inlineValue] = token.split(/=(.*)/s);
    const definition = flags[name];
    if (!definition) throw new Error(`Unknown option: ${name}.`);
    if (Object.hasOwn(values, name))
      throw new Error(`Repeated option: ${name}.`);
    if (definition.boolean) {
      if (inlineValue !== undefined && !["true", "false"].includes(inlineValue))
        throw new Error(`${name} accepts only =true or =false.`);
      values[name] = inlineValue !== "false";
    } else {
      const value = inlineValue ?? argv[++index];
      _validateValue(name, value, definition);
      values[name] = value;
    }
  }
  return { positional, values };
}

function _validatePositionals({
  commandName,
  tokens,
  direct,
  schema,
  requireValues,
  base,
  action,
  isMotionListing,
}) {
  _validateCompositionId({ commandName, tokens, direct });
  _validateInheritedOptions(schema, tokens.values);
  const maximum =
    direct && ["preview", "render"].includes(commandName)
      ? (schema.maximum ?? 0) + 1
      : (schema.maximum ?? 0);
  if (tokens.positional.length > maximum)
    throw new Error(
      `Unexpected positional argument: ${tokens.positional[maximum]}.`,
    );
  const positional =
    direct && ["preview", "render"].includes(commandName)
      ? tokens.positional.slice(1)
      : tokens.positional;
  if (
    schema.positionalPattern &&
    positional.some((value) => !schema.positionalPattern.test(value))
  )
    throw new Error(`Invalid ${schema.positional.toLowerCase()}.`);
  if (
    requireValues &&
    (positional.length < (schema.minimum ?? 0) ||
      (base.actions && !action && !isMotionListing))
  )
    throw new Error("Missing required command or argument.");
  if (
    commandName === "preview" &&
    positional.some((value) => !/^\d+$/.test(value))
  )
    throw new Error("Body frames must be non-negative integers.");
  _validateRequiredFlags({ requireValues, schema, tokens });
  _validateExclusiveOptions({ commandName, tokens, positional });
}

/**
 * Parses all arguments and rejects unknown, repeated or missing flag values.
 */
export function parseCommandArguments({
  commandName,
  arguments: argv,
  direct = false,
  requireValues = false,
}) {
  const base = CommandSchemas[commandName];
  if (!base || base.forward)
    return {
      schema: base ?? {},
      positional: [...argv],
      values: {},
      action: undefined,
    };
  const hasAction = base.actions?.includes(argv[0]);
  const action = hasAction ? argv[0] : undefined;
  const isMotionListing =
    commandName === "motion" && !["preview", "render"].includes(argv[0]);
  if (base.actions && argv.length && !hasAction && !isMotionListing)
    throw new Error(`Unknown action: ${argv[0]}.`);
  const schema = {
    ...base,
    flags: { ...base.flags, ...base.actionFlags?.[action] },
  };
  const tokens = _readTokens(hasAction ? argv.slice(1) : argv, schema.flags);
  _validatePositionals({
    commandName,
    tokens,
    direct,
    schema,
    requireValues,
    base,
    action,
    isMotionListing,
  });
  return { schema, ...tokens, action };
}

function _validateCompositionId({ commandName, tokens, direct }) {
  if (
    (direct && ["preview", "render"].includes(commandName)) ||
    commandName === "add-sfx"
  ) {
    const id = tokens.positional[0];
    if (id !== undefined) CompositionIds.assert(id);
  }
}

function _validateInheritedOptions(schema, values) {
  for (const [name, definition] of Object.entries(schema.flags ?? {})) {
    if (definition.validateInherited && !Object.hasOwn(values, name)) {
      const inherited = process.env[definition.environment];
      if (inherited !== undefined && inherited !== "")
        _validateValue(name, inherited, definition);
    }
  }
}
