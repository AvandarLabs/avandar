import { Linter, RuleTester } from "eslint";
import type { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import plugin from "../../index";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest" } });
// The compatibility adapter retains Oxlint's type, including its context API.
// These behavioral tests verify the converted plugin at ESLint's boundary.
const eslintPlugin = plugin as unknown as ESLint.Plugin;

tester.run("function-body-line-comments", eslintPlugin.rules![
  "function-body-line-comments"
]!, {
  valid: [
    "function load() {\n  // Read only once.\n  consume();\n}",
    "/** Public reader. */\nfunction load() {}",
    "function load() {\n  /** Nested reader. */\n  function read() {}\n}",
    "function load() {\n  /** Nested value. */\n  const value = 1;\n}",
    "function load() {\n  /** Nested value docs. */\n  // Implementation note.\n  const value = 1;\n}",
    "function load() {\n  /*! Copyright Example */\n  consume();\n}",
    "function load() { return /* inline */ 1; }",
    "function load() {\n  /* istanbul ignore next */\n  consume();\n}",
    "function load() {\n  /** @type {number} */\n  consume();\n}",
    "function load() {\n  /* global store */\n  consume();\n}",
    "function load() {\n  /* Keep this.\u2028consume(); */\n  consume();\n}",
    "function load() {\n  /* Keep this.\rconsume(); */\n  consume();\n}",
    "function load() {\n  /* Inline. */ consume();\n}",
    "function load() {\n  const nested = {\n    /** Nested method. */\n    read() {}\n  };\n}",
    "const data = '/** text */';",
  ],
  invalid: [
    {
      code: "function load() {\n  /** Read only once. */\n  consume();\n}",
      output: "function load() {\n  // Read only once.\n  consume();\n}",
      errors: [{ messageId: "ordinary" }],
    },
    {
      code: "const load = () => {\n  /*\n   * Read once.\n   *\n   * Keep the result.\n   */\n  consume();\n};",
      output: "const load = () => {\n  // Read once.\n  //\n  // Keep the result.\n  consume();\n};",
      errors: [{ messageId: "ordinary" }],
    },
    {
      code: "function load() {\r\n\t/* Keep this. */\r\n\tconsume();\r\n}",
      output: "function load() {\r\n\t// Keep this.\r\n\tconsume();\r\n}",
      errors: [{ messageId: "ordinary" }],
    },
  ],
});

tester.run("single-line-short-jsdoc", eslintPlugin.rules![
  "single-line-short-jsdoc"
]!, {
  valid: [
    "/** A short reader. */\nfunction read() {}",
    "/**\n * @returns A result.\n */\nfunction read() {}",
    "/**\n * First paragraph.\n *\n * Second paragraph.\n */\nfunction read() {}",
    "/**\n * ```ts\n * consume();\n * ```\n */\nfunction read() {}",
    "/**\n * A line that cannot fit into eighty columns when represented as a complete one line documentation comment.\n */\nfunction read() {}",
    "/*\n * Ordinary comment.\n */\nconsume();",
    "function read() {\n  /**\n   * Interior prose.\n   */\n  consume();\n}",
    "/**\n * - Preserve list formatting.\n */\nfunction read() {}",
    "/**\n * Preserve this break.  \n * Next line.\n */\nfunction read() {}",
    "/**\n * Preserve this break.\\\n * Next line.\n */\nfunction read() {}",
    "function load() {\n                /**\n                 * This description fits without its indentation but overflows with it.\n                 */\n                function read() {}\n}",
  ],
  invalid: [
    {
      code: "/**\n * A short reader.\n */\nfunction read() {}",
      output: "/** A short reader. */\nfunction read() {}",
      errors: [{ messageId: "singleLine" }],
    },
    {
      code: "/**\n * Read the selected\n * record.\n */\nfunction read() {}",
      output: "/** Read the selected record. */\nfunction read() {}",
      errors: [{ messageId: "singleLine" }],
    },
    {
      code: "function load() {\n  /**\n   * Nested reader.\n   */\n  function read() {}\n}",
      output: "function load() {\n  /** Nested reader. */\n  function read() {}\n}",
      errors: [{ messageId: "singleLine" }],
    },
  ],
});

tester.run("export-key-jsdoc", eslintPlugin.rules![
  "export-key-jsdoc"
]!, {
  valid: [
    "/** " + "a".repeat(73) + " */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};",
    "/**\n * " + "a".repeat(77) + "\n */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};",
    "/**\n * " + "a".repeat(77) + "\n */\nconst LIMIT = 1;\nexport const Reader = {\n\tLIMIT,\n};",
    "/** Detached module header. */\n\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};",
    "const LIMIT = 1;\nexport const Reader = {\n  /** Smallest value. */\n  LIMIT,\n};",
    "/** Smallest value. */\nexport const LIMIT = 1;\nexport const Reader = { LIMIT };",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = { first: LIMIT, second: LIMIT };",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = { [key]: LIMIT };",
    "/** Smallest value. */\nconst LIMIT = 1;\nconst Alias = { LIMIT };\nexport const Reader = { LIMIT };",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport { LIMIT };\nexport const Reader = { LIMIT };",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = { ...other, LIMIT };",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = {\n  /** Existing member. */\n  LIMIT,\n};",
    "/** Smallest value. */\nconst LIMIT = 1, OTHER = 2;\nexport const Reader = { LIMIT };",
    "/** Smallest value. */\nlet LIMIT = 1;\nexport const Reader = { LIMIT };",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = {\n  first: LIMIT,\n  second: LIMIT,\n};",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = {\n  [key]: LIMIT,\n};",
    "/** Smallest value. */\nconst LIMIT = 1;\nconst Alias = { LIMIT };\nexport const Reader = {\n  LIMIT,\n};",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport { LIMIT };\nexport const Reader = {\n  LIMIT,\n};",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = {\n  ...other,\n  LIMIT,\n};",
    "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = {\n  value: LIMIT,\n  value: 2,\n};",
  ],
  invalid: [
    {
      code: "/** " + "a".repeat(71) + " */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};",
      output: "const LIMIT = 1;\nexport const Reader = {\n  /** " + "a".repeat(71) + " */\n  LIMIT,\n};",
      errors: [{ messageId: "member" }],
    },
    {
      code: "/**\n * " + "a".repeat(75) + "\n */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};",
      output: "const LIMIT = 1;\nexport const Reader = {\n  /**\n   * " + "a".repeat(75) + "\n   */\n  LIMIT,\n};",
      errors: [{ messageId: "member" }],
    },
    {
      code: "/**\n * " + "a".repeat(75) + "\n */\nconst LIMIT = 1;\nexport const Reader = {\n\tLIMIT,\n};",
      output: "const LIMIT = 1;\nexport const Reader = {\n\t/**\n\t * " + "a".repeat(75) + "\n\t */\n\tLIMIT,\n};",
      errors: [{ messageId: "member" }],
    },
    {
      code: "/** Smallest value. */\nconst LIMIT = 1;\nexport const Reader = {\n  LIMIT,\n};",
      output: "const LIMIT = 1;\nexport const Reader = {\n  /** Smallest value. */\n  LIMIT,\n};",
      errors: [{ messageId: "member" }],
    },
    {
      code: "/**\n * Read a value.\n */\nfunction _read() {}\nexport const Reader = {\n  read: _read,\n};",
      output: "function _read() {}\nexport const Reader = {\n  /** Read a value. */\n  read: _read,\n};",
      errors: [{ messageId: "member" }],
    },
  ],
});

it("reaches a stable result when the three comment rules interact", () => {
  const linter = new Linter();
  const config = [{
    plugins: { avandar: eslintPlugin },
    rules: {
      "avandar/function-body-line-comments": "error" as const,
      "avandar/single-line-short-jsdoc": "error" as const,
      "avandar/export-key-jsdoc": "error" as const,
    },
  }];
  const source = "function load() {\n  /** Read once. */\n  consume();\n}\n/**\n * Read a value.\n */\nfunction _read() {}\nexport const Reader = {\n  read: _read,\n};";
  const fixed = linter.verifyAndFix(source, config);
  expect(fixed.output).toBe("function load() {\n  // Read once.\n  consume();\n}\nfunction _read() {}\nexport const Reader = {\n  /** Read a value. */\n  read: _read,\n};");
  expect(fixed.messages).toEqual([]);
  expect(linter.verifyAndFix(fixed.output, config)).toMatchObject({
    fixed: false,
    output: fixed.output,
    messages: [],
  });
});
