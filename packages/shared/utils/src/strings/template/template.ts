import { objectKeys } from "../../objects/objectKeys.ts";
import { unknownToString } from "../unknownToString/unknownToString.ts";
import type { UnknownToStringOptions } from "../unknownToString/unknownToString.ts";

/**
 * Creates a template string parser. The template string is a string that
 * contains tokens that will be replaced with the values of the corresponding
 * keys in the `templateParams` object. Tokens are specified using `$key$`
 * syntax.
 *
 * Any template params that are not strings will be converted to strings using
 * the `unknownToString` function.
 *
 * @example
 * template("SELECT * FROM $table$ WHERE $column$ = '$value$'").parse({
 *   table: "users",
 *   column: "name",
 *   value: "John",
 * });
 * // "SELECT * FROM users WHERE name = 'John'"
 *
 * @param templateString - The template string to parse.
 * @returns An object with a `parse` method that can be used to parse the
 * template string.
 */
export function template(templateString: string): {
  parse: (
    templateParams?: Record<string, unknown>,
    options?: UnknownToStringOptions,
  ) => string;
} {
  return {
    parse: (
      templateParams?: Record<string, unknown>,
      options?: UnknownToStringOptions,
    ) => {
      const paramNames = objectKeys(templateParams ?? {});
      const outputString = paramNames.reduce((currString, paramName) => {
        const argValue = templateParams?.[paramName];
        if (argValue === undefined) {
          return currString;
        }
        return currString.replace(
          new RegExp(`\\$${paramName}\\$`, "g"),
          unknownToString(argValue, {
            arraySeparator: ",",
            emptyString: "",
            ...(options ?? {}),
          }),
        );
      }, templateString);
      return outputString;
    },
  };
}
