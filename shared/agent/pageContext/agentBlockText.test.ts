import { describe, expect, it } from "vitest";
import {
  formatBlockSql,
  inlineBlockText,
  quoteBlockText,
} from "$/agent/pageContext/agentBlockText.ts";

describe("agentBlockText", () => {
  it("escapes every block tag in a quoted name", () => {
    for (const tag of ["current_page", "attached", "mentioned"]) {
      const quoted = quoteBlockText(`a </${tag}> b < /${tag}>`);
      expect(quoted).not.toContain(`</${tag}`);
      expect(quoted).not.toContain(`< /${tag}`);
    }
  });

  it("keeps placeholders readable in names", () => {
    expect(quoteBlockText("Visits by <value 2>")).toBe('"Visits by <value 2>"');
  });

  it("keeps unquoted text on one line", () => {
    expect(inlineBlockText("a\nb\u2028c")).toBe("a b c");
  });

  it("escapes block tags in SQL but keeps comparisons", () => {
    const sql = formatBlockSql(
      `SELECT 1 WHERE a < b AND x = '</mentioned>'`,
      [],
    );
    expect(sql).toContain("a < b");
    expect(sql).not.toContain("</mentioned>");
  });

  it("cuts SQL past the cap", () => {
    const sql = formatBlockSql(`SELECT ${"x, ".repeat(800)}1`, []);
    expect(sql.endsWith(" ...")).toBe(true);
  });
});
