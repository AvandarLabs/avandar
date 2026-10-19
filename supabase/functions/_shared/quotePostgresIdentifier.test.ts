import {
  quotePostgresIdentifier,
  quoteQualifiedPostgresIdentifier,
} from "@sbfn/_shared/quotePostgresIdentifier.ts";
import { describe, expect, it } from "vitest";

describe("quotePostgresIdentifier", () => {
  it("quotes an ordinary identifier", () => {
    expect(quotePostgresIdentifier("customers")).toBe('"customers"');
  });

  it("doubles an embedded double quote", () => {
    expect(quotePostgresIdentifier('cust"omers')).toBe('"cust""omers"');
  });

  it("neutralizes a statement-terminating injection payload", () => {
    const payload = 'users"; drop table db_connections; --';
    const quoted = quotePostgresIdentifier(payload);
    // The entire payload, including the originally-unescaped double quote,
    // ends up inside one quoted identifier token - no unescaped `"` remains
    // to end the identifier early.
    expect(quoted).toBe('"users""; drop table db_connections; --"');
  });

  it("neutralizes a line comment inside the name", () => {
    expect(quotePostgresIdentifier("foo--bar")).toBe('"foo--bar"');
  });

  it("neutralizes a block comment inside the name", () => {
    expect(quotePostgresIdentifier("foo/*bar*/baz")).toBe('"foo/*bar*/baz"');
  });

  it("quotes a reserved keyword without complaint", () => {
    expect(quotePostgresIdentifier("select")).toBe('"select"');
    expect(quotePostgresIdentifier("table")).toBe('"table"');
  });

  it("passes Unicode through unchanged, still quoted", () => {
    expect(quotePostgresIdentifier("tablé_日本語")).toBe('"tablé_日本語"');
  });

  it("rejects a NUL byte", () => {
    expect(() => {
      quotePostgresIdentifier("foo\0bar");
    }).toThrow();
  });

  it("rejects a Unicode NUL lookalike only if it actually is U+0000", () => {
    // A visually-similar character (e.g. the "SYMBOL FOR NULL" glyph U+2400)
    // is not the NUL byte and must NOT be rejected - only a real \0 is unsafe
    // at the Postgres wire-protocol level.
    expect(() => {
      quotePostgresIdentifier("foo␀bar");
    }).not.toThrow();
  });

  it("rejects an empty identifier", () => {
    expect(() => {
      quotePostgresIdentifier("");
    }).toThrow();
  });
});

describe("quoteQualifiedPostgresIdentifier", () => {
  it("quotes schema and table separately, joined by an unquoted dot", () => {
    expect(quoteQualifiedPostgresIdentifier("public", "customers")).toBe(
      '"public"."customers"',
    );
  });

  it("does not let a dot in the table name merge into the schema name", () => {
    // If this were quoted as one string, "public.customers" would become a
    // single (wrong) identifier instead of schema `public`, table
    // `customers`.
    const quoted = quoteQualifiedPostgresIdentifier("public", 'cust"omers');
    expect(quoted).toBe('"public"."cust""omers"');
  });

  it("neutralizes an injection payload in either half independently", () => {
    const quoted = quoteQualifiedPostgresIdentifier(
      'public"; drop schema public cascade; --',
      "customers",
    );
    expect(quoted).toBe(
      '"public""; drop schema public cascade; --"."customers"',
    );
  });
});
