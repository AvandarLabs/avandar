import { describe, expect, it } from "vitest";
import {
  EARLIER_VALUE_TEXT,
  hideEarlierPlaceholders,
} from "@/lib/agent/dataAgent/pagePrivacy/hideEarlierPlaceholders/hideEarlierPlaceholders";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";

describe("hideEarlierPlaceholders", () => {
  it("replaces every placeholder with the earlier-value text", () => {
    expect(
      hideEarlierPlaceholders("<value 1> and <value 12> had 2 visits."),
    ).toBe(`${EARLIER_VALUE_TEXT} and ${EARLIER_VALUE_TEXT} had 2 visits.`);
  });

  it("replaces a placeholder written in another case, spacing, or zero padding", () => {
    expect(hideEarlierPlaceholders("<VALUE 1> < value 02 > <value  3>")).toBe(
      `${EARLIER_VALUE_TEXT} ${EARLIER_VALUE_TEXT} ${EARLIER_VALUE_TEXT}`,
    );
  });

  it("replaces a quoted placeholder inside SQL text", () => {
    expect(hideEarlierPlaceholders(`WHERE "name" = '<value 1>'`)).toBe(
      `WHERE "name" = '${EARLIER_VALUE_TEXT}'`,
    );
  });

  it("keeps text with no placeholder as it is", () => {
    expect(hideEarlierPlaceholders("1 < 2 and value 1 > 0")).toBe(
      "1 < 2 and value 1 > 0",
    );
  });

  it("writes text a vault never unmasks, whatever it holds", () => {
    const vault = createSqlPlaceholderVault();
    vault.redact(`SELECT 1 WHERE "last_name" = 'Smith'`, {
      isSensitiveColumn: () => {
        return true;
      },
      isSensitiveValue: () => {
        return false;
      },
      knownColumnNames: new Set(["last_name"]),
    });
    const text = hideEarlierPlaceholders("<value 1> had 2 visits.");

    expect(vault.unmaskText(text)).toBe(text);
  });
});
