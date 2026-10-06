import { EnvFileLine } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/EnvFileLine/EnvFileLine";
import { describe, expect, it } from "vitest";

describe("EnvFileLine.getAssignment", () => {
  it("splits a line into its key and trimmed value", () => {
    expect(EnvFileLine.getAssignment("VITE_APP_URL=  http://x/  ")).toEqual({
      key: "VITE_APP_URL",
      value: "http://x/",
    });
  });

  it("keeps a value that itself contains separators intact", () => {
    expect(EnvFileLine.getAssignment("DB_URL=postgres://a:b@h/db")).toEqual({
      key: "DB_URL",
      value: "postgres://a:b@h/db",
    });
  });

  it("reports no assignment for a line that assigns nothing", () => {
    expect(EnvFileLine.getAssignment("")).toBeUndefined();
    expect(EnvFileLine.getAssignment("# a comment")).toBeUndefined();
    expect(EnvFileLine.getAssignment("=orphaned")).toBeUndefined();
  });
});

describe("EnvFileLine.getQuote", () => {
  it("reports the quote character wrapping a value", () => {
    expect(EnvFileLine.getQuote('"quoted"')).toBe('"');
    expect(EnvFileLine.getQuote("'quoted'")).toBe("'");
  });

  it("reports no quote when the value is bare or unbalanced", () => {
    expect(EnvFileLine.getQuote("bare")).toBe("");
    expect(EnvFileLine.getQuote('"unbalanced')).toBe("");
    expect(EnvFileLine.getQuote('"')).toBe("");
  });
});

describe("EnvFileLine.getUnquotedValue", () => {
  it("strips a matching pair of surrounding quotes", () => {
    expect(EnvFileLine.getUnquotedValue('"quoted"')).toBe("quoted");
    expect(EnvFileLine.getUnquotedValue("'quoted'")).toBe("quoted");
  });

  it("leaves a bare or unbalanced value alone", () => {
    expect(EnvFileLine.getUnquotedValue("bare")).toBe("bare");
    expect(EnvFileLine.getUnquotedValue('"unbalanced')).toBe('"unbalanced');
  });
});

describe("EnvFileLine.getLoopbackUrl", () => {
  it("parses a loopback URL, quoted or bare", () => {
    expect(EnvFileLine.getLoopbackUrl("http://localhost:5173/")?.port).toBe(
      "5173",
    );
    expect(EnvFileLine.getLoopbackUrl('"http://127.0.0.1:54321/"')?.port).toBe(
      "54321",
    );
  });

  it("reports nothing for a remote host or an unparseable value", () => {
    expect(
      EnvFileLine.getLoopbackUrl("https://app.avandarlabs.com/"),
    ).toBeUndefined();
    expect(EnvFileLine.getLoopbackUrl("not-a-url")).toBeUndefined();
  });
});
