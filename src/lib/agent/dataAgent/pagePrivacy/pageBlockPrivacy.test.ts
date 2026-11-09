/**
 * The page block built the way the browser builds it, with a real vault:
 * values a chart's SQL filters on are hidden in that SQL and in every name
 * and title on the page, while words that only matched an unreadable
 * chart's literals stay readable.
 */
import { describe, expect, it } from "vitest";
import { buildAgentPageContextBlock } from "$/agent/pageContext/buildAgentPageContextBlock";
import { isPersonalDataText } from "@/components/privacy/privacy-helpers/detectPii/detectPii";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";
import { createSqlPlaceholderVault } from "@/lib/agent/dataAgent/pagePrivacy/SqlPlaceholderVault";
import type { AgentPageContext } from "$/agent/pageContext/AgentPageContext";

function _buildBlock(context: AgentPageContext): string {
  const vault = createSqlPlaceholderVault();
  return buildAgentPageContextBlock({
    context,
    aliases: [],
    isSensitive: isPersonalDataText,
    redactSql: (sql) => {
      return vault.redact(sql, {
        isSensitiveColumn: isPersonalColumnName,
        isSensitiveValue: isPersonalDataText,
      });
    },
    maskText: vault.maskText,
  });
}

function _dashboard(
  name: string,
  tiles: ReadonlyArray<{ title: string; sql: string }>,
): AgentPageContext {
  return {
    app: "dashboard",
    dashboard: {
      id: "d1",
      name,
      tiles: tiles.map((tile) => {
        return { ...tile, chartType: "bar" };
      }),
    },
  };
}

describe("page block privacy", () => {
  it("hides a filtered name in the chart's title", () => {
    const block = _buildBlock(
      _dashboard("Clinic", [
        {
          title: "Visits by Jane Doe",
          sql: `SELECT count(*) FROM t WHERE "patient_name" = 'Jane Doe'`,
        },
      ]),
    );

    expect(block).toContain(
      `1. "Visits by <value 1>" (bar): SELECT count(*) FROM t WHERE "patient_name" = '<value 1>'`,
    );
    expect(block).not.toContain("Jane");
  });

  it("hides a name another chart filters on in every title and name", () => {
    const block = _buildBlock(
      _dashboard("Jane Doe's visits", [
        { title: "Jane Doe by month", sql: "SELECT 1" },
        {
          title: "Visits",
          sql: `SELECT * FROM t WHERE "First Name" = 'Jane Doe'`,
        },
      ]),
    );

    expect(block).not.toContain("Jane");
  });

  it("keeps titles readable when a personal chart sweeps up ordinary words", () => {
    const block = _buildBlock(
      _dashboard("Measles 2022", [
        {
          title: "Births by month",
          sql: `SELECT date_trunc('month', "dob") AS "month", count(*) FROM t WHERE year("dob") = 2022 GROUP BY 1`,
        },
        {
          title: "Cases by month in 2022",
          sql: `SELECT date_trunc('month', "date") AS "month" FROM t WHERE year("date") = 2022 AND "state" = 'Texas' GROUP BY 1`,
        },
        {
          title: "Vaccinated: Yes or No",
          sql: `SELECT CASE WHEN "patient_name" IS NULL THEN 'No' ELSE 'Yes' END AS "named", count(*) FROM t GROUP BY 1`,
        },
        {
          title: "Visits by Jane Doe",
          sql: `SELECT count(*) FROM t WHERE "patient_name" = 'Jane Doe'`,
        },
      ]),
    );

    expect(block).toContain('Dashboard: "Measles 2022"');
    expect(block).toContain(`1. "Births by month" (bar)`);
    expect(block).toContain(
      // Values the vault holds are hidden in every chart's SQL, never in
      // titles unless they were compared with a personal column.
      `2. "Cases by month in 2022" (bar): SELECT date_trunc('<value 1>', "date") AS "month" FROM t WHERE year("date") = '<value 2>' AND "state" = 'Texas'`,
    );
    expect(block).toContain(`3. "Vaccinated: Yes or No" (bar)`);
    expect(block).toContain(`4. "Visits by <value 5>" (bar)`);
    expect(block).not.toContain("Jane");
  });

  it("keeps words that only match an unreadable chart's literals", () => {
    const block = _buildBlock(
      _dashboard("Deaths", [
        {
          title: "Deaths by month",
          sql: `SELECT date_trunc('month', "date"), count(*) FROM t GROUP BY ALL`,
        },
      ]),
    );

    expect(block).toContain(`1. "Deaths by month" (bar)`);
    expect(block).toContain(`date_trunc('<value 1>', "date")`);
  });
});
