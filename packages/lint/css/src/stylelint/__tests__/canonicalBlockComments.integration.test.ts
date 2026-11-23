import { resolve } from "node:path";
import { parse } from "postcss";
import stylelint from "stylelint";
import { expect, it } from "vitest";
import plugins from "../index";

const RULE: string = "avandar/canonical-block-comments";

async function _lint({
  code,
  fix = true,
}: Readonly<{ code: string; fix?: boolean }>): Promise<stylelint.LinterResult> {
  return stylelint.lint({
    code,
    fix,
    config: { plugins, rules: { [RULE]: true } },
  });
}

it.each([
  [
    "/*Read once.*/\na { color: red; }\n",
    "/* Read once. */\na { color: red; }\n",
  ],
  [
    "a {\n  /* First sentence.\n     Second sentence. */\n  color: red;\n}\n",
    "a {\n  /*\n   * First sentence.\n   * Second sentence.\n   */\n  color: red;\n}\n",
  ],
  [
    "/*\n First sentence.\n\n Second sentence.\n*/\n",
    "/*\n * First sentence.\n *\n * Second sentence.\n */\n",
  ],
  [
    "/* First sentence.\r\n   Second sentence. */\r\n",
    "/*\r\n * First sentence.\r\n * Second sentence.\r\n */\r\n",
  ],
  [
    "\t/* First sentence.\n\t   Second sentence. */\n",
    "\t/*\n\t * First sentence.\n\t * Second sentence.\n\t */\n",
  ],
  [
    "/* Déjà vu.\n   Keep <code>, punctuation & `symbols`. */\n",
    "/*\n * Déjà vu.\n * Keep <code>, punctuation & `symbols`.\n */\n",
  ],
])(
  "canonicalizes ordinary prose without changing surrounding CSS: %s",
  async (source, expected) => {
    const first = await _lint({ code: source });
    expect(first.errored).toBe(false);
    expect(first.code).toBe(expected);
    const second = await _lint({ code: first.code! });
    expect(second.code).toBe(expected);
    expect(second.results[0]!.warnings).toEqual([]);
  },
);

it("reports the canonical error ID and the original comment range", async () => {
  const result = await _lint({
    code: ".a { color: red; }\n  /* First.\n     Second. */\n",
    fix: false,
  });
  expect(result.errored).toBe(true);
  expect(result.results[0]!.warnings).toEqual([
    expect.objectContaining({
      rule: RULE,
      severity: "error",
      text: expect.stringContaining("AF-20:"),
      line: 2,
      column: 3,
      endLine: 3,
      endColumn: 16,
    }),
  ]);
});

it.each([
  "/* First sentence.\r\n   Second sentence.\n   Third sentence. */\n",
  "/* First sentence.\n   Second sentence.\r\n   Third sentence. */\r\n",
])(
  "preserves mixed line endings inside a prose comment: %s",
  async (source) => {
    const result = await _lint({ code: source });
    expect(result.code).toBe(source);
    expect(result.results[0]!.warnings).toEqual([]);
  },
);

it.each([
  "/** Declaration docs.\n * Preserve this shape. */\n.a {}\n",
  "/*! Copyright Example.\n All rights reserved. */\n",
  "/*@ sourceURL=app.css */\n",
  "/* stylelint-disable color-no-invalid-hex */\n",
  "/* autoprefixer: off */\n",
  "/* prettier-ignore */\n",
  "/* purgecss start ignore */\n",
  "/* postcss-custom-properties: off */\n",
  "/*\\*/\n.a { color: red; }\n/**/\n",
  "/* */\n",
  "/* ** decorative ** */\n",
  "/* * A literal bullet. */\n",
  "/* * A literal bullet.\n * Another literal bullet. */\n",
  "/* rtl:begin:ignore */\n",
  "/* unknown-tool: off\n Preserve metadata. */\n",
  ".a { color: /* Inline.\n Preserve. */ red; }\n",
  "/* Inline.\n Preserve. */ .a {}\n",
  "/* Example: a {\n color: red;\n } */\n",
  "/* Literal * marker.\n * a bullet may be prose.\n Unmarked end. */\n",
  "/* First.\n   Second.  \n */\n",
])(
  "preserves documentation, directives, hacks and ambiguous shapes: %s",
  async (source) => {
    const result = await _lint({ code: source });
    expect(result.code).toBe(source);
    expect(result.results[0]!.warnings).toEqual([]);
  },
);

it("does not repair unclosed comments", async () => {
  const source = ".a {\n /* First.\n Second.";
  const result = await _lint({ code: source });
  expect(result.errored).toBe(true);
  expect(result.code).toBeUndefined();
  expect(
    result.results[0]!.parseErrors.length + result.results[0]!.warnings.length,
  ).toBeGreaterThan(0);
});

it("respects whole-file and next-line disables in the ordinary fix path", async () => {
  const source = `/* stylelint-disable ${RULE} */\n/* First.\n Second. */\n`;
  expect((await _lint({ code: source })).code).toBe(source);
  const nextLine = `/* stylelint-disable-next-line ${RULE} */\n/*Read once.*/\n`;
  expect((await _lint({ code: nextLine })).code).toBe(nextLine);
});

it("leaves source-map nodes intact before PostCSS consumes annotations", async () => {
  const source = "/*# sourceMappingURL=app.css.map */\n";
  const root = parse(source);
  const plugin = plugins.find((entry) => {
    return "ruleName" in entry && entry.ruleName === RULE;
  });
  if (!plugin || !("rule" in plugin)) {
    throw new Error("CSS plugin is unavailable");
  }
  const result = await _lint({ code: "/* Ordinary prose. */\n", fix: false });
  plugin.rule(true, undefined, {})(root, result.results[0]!._postcssResult!);
  expect(root.toString()).toBe(source);
});

it("matches the engine's existing source-map annotation consumption with the rule disabled", async () => {
  const source = ".a { color: red; }\n/*# sourceMappingURL=app.css.map */\n";
  const cwd = resolve(import.meta.dirname, "../../../../../..");
  const config = await stylelint.resolveConfig("src/reviewed.css", { cwd });
  const enabled = await stylelint.lint({
    code: source,
    fix: true,
    config,
    cwd,
  });
  const disabled = await stylelint.lint({
    code: source,
    fix: true,
    cwd,
    config: {
      ...config,
      rules: { ...config!.rules, [RULE]: null },
    },
  });
  expect(enabled.code).toBe(".a { color: red; }\n");
  expect(disabled.code).toBe(enabled.code);
});

it.each([
  `/*${"a".repeat(76)}*/\n`,
  `/* First.\n${"a".repeat(78)}\n*/\n`,
  `\t/* First.\n${"a".repeat(74)}\n\t*/\n`,
])(
  "refuses comment prefixes that would exceed 80 columns: %s",
  async (source) => {
    expect((await _lint({ code: source })).code).toBe(source);
  },
);

it("permits single-line normalization at exactly 80 columns", async () => {
  expect((await _lint({ code: `/*${"a".repeat(74)}*/\n` })).code).toBe(
    `/* ${"a".repeat(74)} */\n`,
  );
});

it.each([
  ["", 77],
  ["  ", 75],
  ["\t", 73],
])(
  "permits multiline prefixes at exactly 80 columns with %j",
  async (indent, length) => {
    const source = `${indent}/* First.\n${"a".repeat(length)}\n${indent}*/\n`;
    const expected = `${indent}/*\n${indent} * First.\n${indent} * ${"a".repeat(length)}\n${indent} */\n`;
    const first = await _lint({ code: source });
    expect(first.code).toBe(expected);
    expect((await _lint({ code: first.code! })).code).toBe(expected);
  },
);
