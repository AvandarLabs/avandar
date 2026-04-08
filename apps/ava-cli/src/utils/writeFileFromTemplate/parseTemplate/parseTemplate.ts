import { template } from "@utils/strings/template/template";

export type TemplateParams = Readonly<Record<string, string>>;

type ParseTemplateOptions = Readonly<{
  template: string;
  params: TemplateParams;
}>;

export function parseTemplate(options: ParseTemplateOptions): string {
  return template(options.template).parse(
    _normalizeTemplateParams(options.params),
  );
}

/**
 * Maps param keys to `template()` keys (`$KEY$` in the string uses `KEY`).
 * Accepts either `NAME` or `$NAME$` style keys (legacy).
 */
function _normalizeTemplateParams(
  params: TemplateParams,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("$") && key.endsWith("$")) {
      out[key.slice(1, -1)] = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}
