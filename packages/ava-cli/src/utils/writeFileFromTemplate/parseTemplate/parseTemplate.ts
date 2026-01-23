export type TemplateParams = Readonly<Record<string, string>>;

type ParseTemplateOptions = Readonly<{
  template: string;
  params: TemplateParams;
}>;

export function parseTemplate(options: ParseTemplateOptions): string {
  return fillTemplate({
    template: options.template,
    params: options.params,
  });
}

/** Fill a template using `params` tokens (e.g. `$NAME$`). */
function fillTemplate(options: {
  template: string;
  params: TemplateParams;
}): string {
  const applyReplacement = (current: string, entry: [string, string]) => {
    const [key, value] = entry;
    const token = getTokenFromKey(key);

    return current.replaceAll(token, value);
  };

  return Object.entries(options.params).reduce(
    applyReplacement,
    options.template,
  );
}

function getTokenFromKey(key: string): string {
  if (key.startsWith("$") && key.endsWith("$")) {
    return key;
  }

  return `$${key}$`;
}
