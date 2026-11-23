function _getPayload(source: string, index: number, start: number): string {
  const inBlock =
    source.lastIndexOf("/*", index) > source.lastIndexOf("*/", index);
  const remainder = source.slice(start);
  const end = inBlock
    ? remainder.indexOf("*/")
    : remainder.search(/[\r\n\u2028\u2029]/);
  return (end < 0 ? remainder : remainder.slice(0, end))
    .split(/\s--(?:\s|$)/, 1)[0]!
    .trim();
}

/**
 * Gives coverage producers the original rule suppressions that prevent a
 * whole-file enforcement claim. Textual matches can conservatively overmatch
 * strings or unusual comments. "*" retains every detector when the payload
 * is ambiguous.
 */
export function getSuppressedRuleNames(
  source: string,
  engine: "native" | "css",
): string[] {
  const pattern =
    engine === "native"
      ? /\b(?:eslint|oxlint)-disable(-[a-z-]+)?\b/g
      : /\bstylelint-disable(-[a-z-]+)?\b/g;
  return [
    ...new Set(
      [...source.matchAll(pattern)].flatMap((match) => {
        if (match[1] && !["-line", "-next-line"].includes(match[1])) {
          return ["*"];
        }
        const payload = _getPayload(
          source,
          match.index,
          match.index + match[0].length,
        );
        const rules = payload.split(",").map((rule) => {
          return rule.trim();
        });
        if (
          !payload ||
          rules.some((rule) => {
            return rule === "all" || !/^[\w@][\w@./-]*$/.test(rule);
          })
        ) {
          return ["*"];
        }
        return rules.map((rule) => {
          return rule.split("/").at(-1)!;
        });
      }),
    ),
  ];
}
