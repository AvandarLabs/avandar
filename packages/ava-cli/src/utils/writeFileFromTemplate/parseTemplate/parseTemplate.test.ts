import { describe, expect, it } from "vitest";
import { parseTemplate } from "./parseTemplate";

const SIMPLE_TEMPLATE = "Hello, $NAME$!";
const MULTI_TEMPLATE = [
  'export const name = "$NAME$";',
  'export const model = "$MODEL_NAME$";',
  'export const greeting = "Hello $NAME$ ($NAME$)";',
].join("\n");

const TOKENIZED_TEMPLATE = ["Hello, $NAME$!", "Also hello, $NAME$!"].join("\n");

describe("parseTemplate", () => {
  it("replaces tokens using non-token keys", () => {
    const contents = parseTemplate({
      template: SIMPLE_TEMPLATE,
      params: { NAME: "World" },
    });

    expect(contents).toBe("Hello, World!");
  });

  it("replaces multiple tokens and all occurrences", () => {
    const contents = parseTemplate({
      template: MULTI_TEMPLATE,
      params: { NAME: "Ada", MODEL_NAME: "Dashboard" },
    });

    expect(contents).toContain('export const name = "Ada";');
    expect(contents).toContain('export const model = "Dashboard";');
    expect(contents).toContain('export const greeting = "Hello Ada (Ada)"');
  });

  it("accepts tokenized keys (e.g. `$NAME$`) in params", () => {
    const contents = parseTemplate({
      template: TOKENIZED_TEMPLATE,
      params: { $NAME$: "World" },
    });

    expect(contents).toBe("Hello, World!\nAlso hello, World!");
  });
});
