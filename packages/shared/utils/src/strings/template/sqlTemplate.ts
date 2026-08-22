import { template } from "@utils/strings/template/template.ts";
import type { UnknownToStringOptions } from "@utils/strings/unknownToString/unknownToString.ts";

/**
 * Like `template`, but for SQL: numbers are not locale-formatted (no
 * thousands separators in interpolated literals).
 *
 * @param templateString - The template string with `$key$` placeholders.
 */
export function sqlTemplate(templateString: string): {
  parse: (
    templateParams?: Record<string, unknown>,
    options?: Omit<UnknownToStringOptions, "formatNumbers">,
  ) => string;
} {
  const inner = template(templateString);
  return {
    parse: (templateParams, options) => {
      return inner.parse(templateParams, {
        ...options,
        formatNumbers: false,
      });
    },
  };
}
