import { describe, expect, it } from "vitest";
import { buildHttpQueryString } from "$/utils/urls/buildHttpQueryString/buildHttpQueryString.ts";

/**
 * What goes in a URL, and what must not.
 *
 * Every value here is checked as the exact string a server receives, because
 * the failures this helper can cause are invisible locally: a number that
 * arrives with thousands separators, or a value that a locale renders
 * differently, still produces a request, just not the one that was meant.
 */
describe("buildHttpQueryString", () => {
  describe("shape of the result", () => {
    it("omits the leading question mark, which the caller adds", () => {
      expect(buildHttpQueryString({ a: "1" })).toBe("a=1");
    });

    it("joins pairs with &, in insertion order", () => {
      expect(buildHttpQueryString({ b: "2", a: "1" })).toBe("b=2&a=1");
    });

    it("is empty for no params at all", () => {
      expect(buildHttpQueryString({})).toBe("");
      expect(buildHttpQueryString(undefined)).toBe("");
    });
  });

  describe("numbers", () => {
    it("writes an integer as digits, never as a formatted number", () => {
      // `unknownToString` formats numbers for display by default, which in a
      // URL means a Google Sheets `gid` of 988142735 goes out as
      // `988,142,735`, with a separator that changes with the locale.
      expect(buildHttpQueryString({ gid: 988_142_735 })).toBe("gid=988142735");
    });

    it("keeps a decimal point and a minus sign", () => {
      expect(buildHttpQueryString({ lat: -1.286_389 })).toBe("lat=-1.286389");
    });

    it("writes zero rather than dropping it", () => {
      // Zero is falsy, so a naive filter loses it, and `gid=0` is the first
      // tab of every spreadsheet.
      expect(buildHttpQueryString({ gid: 0 })).toBe("gid=0");
    });
  });

  describe("booleans", () => {
    it("writes true and false as words", () => {
      expect(buildHttpQueryString({ supportsAllDrives: true })).toBe(
        "supportsAllDrives=true",
      );
      expect(buildHttpQueryString({ archived: false })).toBe("archived=false");
    });
  });

  describe("absence", () => {
    it("omits an undefined value, key included", () => {
      // Not `a=`: an empty value is a value, and a server that distinguishes
      // "unset" from "empty" would read the wrong one.
      expect(buildHttpQueryString({ a: "1", b: undefined })).toBe("a=1");
    });

    it("writes null as the word null", () => {
      expect(buildHttpQueryString({ a: null })).toBe("a=null");
    });

    it("writes an empty string as an empty value", () => {
      expect(buildHttpQueryString({ q: "" })).toBe("q=");
    });
  });

  describe("arrays", () => {
    it("joins members with a semicolon", () => {
      expect(buildHttpQueryString({ ids: ["a", "b", "c"] })).toBe(
        "ids=a%3Bb%3Bc",
      );
    });

    it("writes an empty array as an empty value", () => {
      expect(buildHttpQueryString({ ids: [] })).toBe("ids=");
    });

    it("formats numeric members as digits too", () => {
      expect(buildHttpQueryString({ ids: [1000, 2000] })).toBe(
        "ids=1000%3B2000",
      );
    });
  });

  describe("encoding", () => {
    it("encodes the characters that would otherwise end the value", () => {
      expect(buildHttpQueryString({ q: "a&b=c?d#e" })).toBe(
        "q=a%26b%3Dc%3Fd%23e",
      );
    });

    it("encodes a space as %20, not as +", () => {
      expect(buildHttpQueryString({ q: "two words" })).toBe("q=two%20words");
    });

    it("encodes the parentheses and commas of a field mask", () => {
      // Google's `fields` masks look like this, and the encoded form is what
      // the Sheets API is called with.
      expect(
        buildHttpQueryString({ fields: "sheets.properties(sheetId,title)" }),
      ).toBe("fields=sheets.properties(sheetId%2Ctitle)");
    });

    it("encodes non-ASCII text", () => {
      expect(buildHttpQueryString({ name: "Bogotá" })).toBe("name=Bogot%C3%A1");
    });

    it("leaves the key as written", () => {
      // Keys are code, not user input: encoding them would hide a mistake in
      // the caller rather than fix it.
      expect(buildHttpQueryString({ "a b": "1" })).toBe("a b=1");
    });
  });
});
