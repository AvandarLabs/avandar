import { isArray } from "../../guards/guards";
import {
  unknownToString,
  UnknownToStringOptions,
} from "../../strings/transformations";

function _repeatIndents(count: number): string {
  return "".padStart(count, "\t");
}

function _objectToPrettyStringHelper(
  value: object,
  options: {
    depth: number;
    formatOptions: UnknownToStringOptions;
  },
): string {
  const { depth, formatOptions } = options;
  const indentsAtDepth = _repeatIndents(depth);
  const indentsAtNextDepth = _repeatIndents(depth + 1);

  if (isArray(value)) {
    if (value.length === 0) {
      return `${unknownToString(value, formatOptions)}`;
    }

    const itemStrings = value.map((item) => {
      if (typeof item === "object" && item !== null) {
        const itemStr = _objectToPrettyStringHelper(item, {
          depth: depth + 1,
          formatOptions,
        });
        return `${indentsAtNextDepth}${itemStr}`;
      }

      return `${indentsAtNextDepth}${unknownToString(item, formatOptions)}`;
    });
    const prettyArrayString = itemStrings.join("\n");

    return `[\n${prettyArrayString}\n${indentsAtDepth}]`;
  }

  const objKeys = Object.keys(value);
  if (objKeys.length === 0) {
    return unknownToString(value, formatOptions);
  }

  const keyValueStrings = objKeys.map((key) => {
    const val = (value as Record<string, unknown>)[key]! as unknown;
    if (typeof val === "object" && val !== null) {
      const valStr = _objectToPrettyStringHelper(val, {
        depth: depth + 1,
        formatOptions,
      });
      return `${indentsAtNextDepth}${key}: ${valStr}`;
    }

    return `${indentsAtNextDepth}${key}: ${unknownToString(val, formatOptions)}`;
  });

  const prettyObjectString = keyValueStrings.join("\n");
  return `{\n${prettyObjectString}\n${indentsAtDepth}}`;
}

/**
 * Pretty prints an object, array, or value, using indentation for nesting.
 * @param value The value to pretty print.
 * @param options The options, matching unknownToString options.
 * @returns The pretty printed string.
 */
export function objectToPrettyString(
  value: object,
  options: Omit<UnknownToStringOptions, "prettyPrintObject"> = {},
): string {
  const optionsForPrettyPrint = {
    ...options,
    prettyPrintObject: true,
  };

  return _objectToPrettyStringHelper(value, {
    depth: 0,
    formatOptions: optionsForPrettyPrint,
  });
}
