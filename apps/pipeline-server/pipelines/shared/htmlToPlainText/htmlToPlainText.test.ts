import { htmlToPlainText } from "@pipelines/shared/htmlToPlainText/htmlToPlainText";
import { describe, expect, it } from "vitest";

describe("htmlToPlainText", () => {
  it("keeps a link's text and puts its URL after it", () => {
    expect(htmlToPlainText('Find it <a href="https://x.gov/a">here</a>.')).toBe(
      "Find it here (https://x.gov/a).",
    );
  });

  it("shows a bare URL once when the link's text is the URL", () => {
    expect(htmlToPlainText('<a href="https://x.gov">https://x.gov</a>')).toBe(
      "https://x.gov",
    );
  });

  it("turns breaks and block ends into lines, and list items into dashes", () => {
    expect(
      htmlToPlainText("<p>One</p><p>Two<br>Three</p><ul><li>Four</li></ul>"),
    ).toBe("One\nTwo\nThree\n- Four");
  });

  it("decodes entities and leaves plain text alone", () => {
    expect([
      htmlToPlainText("Fish &amp; Chips&#39; &lt;menu&gt;&nbsp;now"),
      htmlToPlainText("Already plain."),
    ]).toEqual(["Fish & Chips' <menu> now", "Already plain."]);
  });
});
