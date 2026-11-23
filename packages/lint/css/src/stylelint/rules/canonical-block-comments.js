import stylelint from "stylelint";

const ruleName = "avandar/canonical-block-comments";
const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: "AF-20: Use canonical CSS block comment markers.",
});

function _getCommentSource(comment) {
  const source = comment.source;
  const start = source?.start?.offset;
  const end = source?.end?.offset;
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return undefined;
  }
  const css = source.input.css;
  const token = css.slice(start, end);
  const indent = css.slice(css.lastIndexOf("\n", start - 1) + 1, start);
  const suffix = css.slice(end).split(/\r?\n/, 1)[0];
  if (
    !/^[\t ]*$/.test(indent) ||
    !/^[\t ]*$/.test(suffix) ||
    !token.startsWith("/*") ||
    !token.endsWith("*/")
  ) {
    return undefined;
  }
  return { token, indent };
}

function _isProtected(body) {
  return (
    /^[*!#@]/.test(body) ||
    /^[\t ]*\*/.test(body) ||
    /(?:^|\n)[\t ]*\*? ?[\w-]+:/.test(body) ||
    /\\|\/\*|\*\/|[{};\u2028\u2029]|\r(?!\n)/.test(body) ||
    /(?:stylelint|autoprefixer|prettier|purgecss|postcss|sourceMappingURL|sourceURL|@license|@preserve)/i.test(
      body,
    )
  );
}

function _stripMarkers(prose) {
  const hasMarkers = prose.some((line) => {
    return line.startsWith("*");
  });
  if (
    hasMarkers &&
    !prose.every((line) => {
      return !line || line === "*" || line.startsWith("* ");
    })
  ) {
    return undefined;
  }
  const content = hasMarkers
    ? prose.map((line) => {
        return line === "*" ? "" : line.slice(2);
      })
    : prose;
  return content.some((line) => {
    return /\p{L}|\p{N}/u.test(line);
  })
    ? content
    : undefined;
}

function _getProse(body) {
  const lines = body.split(/\r?\n/);
  if (!lines[0].trim()) {
    lines.shift();
  }
  if (lines.length && !lines[lines.length - 1].trim()) {
    lines.pop();
  }
  // Trailing double spaces can encode a Markdown hard break.
  if (
    lines.some((line) => {
      return /\S[\t ]{2,}$/.test(line);
    })
  ) {
    return undefined;
  }
  return _stripMarkers(
    lines.map((line) => {
      return line.trim();
    }),
  );
}

function _getLineWidth(line) {
  let width = 0;
  for (const character of line) {
    width += character === "\t" ? 4 - (width % 4) : 1;
  }
  return width;
}

function _fitReplacement(replacement, indent) {
  return (indent + replacement).split(/\r?\n/).every((line) => {
    return _getLineWidth(line) <= 80;
  })
    ? replacement
    : undefined;
}

function _buildReplacement(comment) {
  const source = _getCommentSource(comment);
  if (!source) {
    return undefined;
  }
  const body = source.token.slice(2, -2);
  if (_isProtected(body) || (body.includes("\r\n") && /(?<!\r)\n/.test(body))) {
    return undefined;
  }
  const prose = _getProse(body);
  if (!prose) {
    return undefined;
  }
  if (!body.includes("\n")) {
    return _fitReplacement(`/* ${prose[0]} */`, source.indent);
  }
  const newline = body.includes("\r\n") ? "\r\n" : "\n";
  const content = prose
    .map((line) => {
      return `${source.indent} *${line ? ` ${line}` : ""}`;
    })
    .join(newline);
  return _fitReplacement(
    `/*${newline}${content}${newline}${source.indent} */`,
    source.indent,
  );
}

/** Formats only standalone, unambiguous ordinary CSS prose comment nodes. */
const rule = (primary) => {
  return (root, result) => {
    if (
      !stylelint.utils.validateOptions(result, ruleName, {
        actual: primary,
        possible: [true],
      })
    ) {
      return;
    }
    root.walkComments((comment) => {
      const replacement = _buildReplacement(comment);
      if (!replacement || replacement === comment.toString()) {
        return;
      }
      stylelint.utils.report({
        message: messages.expected,
        node: comment,
        result,
        ruleName,
        fix: {
          node: comment,
          apply: () => {
            comment.raws.left = "";
            comment.raws.right = "";
            comment.text = replacement.slice(2, -2);
          },
        },
      });
    });
  };
};
rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = {
  url: "https://github.com/AvandarLabs/avandar/blob/develop/packages/lint/README.md",
  fixable: true,
};

/** Stylelint integration for safe ordinary CSS comment marker normalization. */
export default stylelint.createPlugin(ruleName, rule);
