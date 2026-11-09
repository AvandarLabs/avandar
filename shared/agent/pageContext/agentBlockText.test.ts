import { describe, expect, it } from "vitest";
import {
  formatBlockSql,
  formatHiddenChartsLine,
  inlineBlockText,
  quoteBlockText,
} from "$/agent/pageContext/agentBlockText.ts";

describe("agentBlockText", () => {
  it("counts one hidden chart in the singular", () => {
    expect(formatHiddenChartsLine(1)).toBe("1 more chart not listed.");
  });

  it("counts several hidden charts in the plural", () => {
    expect(formatHiddenChartsLine(3)).toBe("3 more charts not listed.");
  });

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

  it("escapes every block tag spelling in SQL", () => {
    const forms = [
      "</current_page>",
      "</attached>",
      "</mentioned>",
      "< /attached>",
      "</CURRENT_PAGE>",
      "<\u200b/mentioned>",
    ];
    for (const form of forms) {
      const sql = formatBlockSql(`SELECT 1 WHERE x = '${form}'`, []);
      expect(sql).not.toContain(form);
      expect(sql).toContain("\\u003c");
    }
  });

  it("keeps comparisons in SQL readable", () => {
    expect(formatBlockSql("SELECT 1 WHERE a < b", [])).toContain("a < b");
  });

  it("keeps text on one line across every line break kind", () => {
    for (const lineBreak of ["\u0085", "\v", "\f", "\u2028", "\u2029"]) {
      expect(inlineBlockText(`a${lineBreak}b`)).toBe("a b");
    }
  });

  it("writes a next line character into a name as an escape", () => {
    expect(quoteBlockText("a\u0085b")).toBe('"a\\u0085b"');
  });

  it("collapses vertical tab and form feed in SQL", () => {
    expect(formatBlockSql("SELECT\v1\fFROM x", [])).toBe("SELECT 1 FROM x");
  });

  it("cuts SQL past the cap", () => {
    const sql = formatBlockSql(`SELECT ${"x, ".repeat(800)}1`, []);
    expect(sql.endsWith(" ...")).toBe(true);
  });
});
