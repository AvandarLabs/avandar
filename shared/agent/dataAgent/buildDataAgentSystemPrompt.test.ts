import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDataAgentSystemPrompt } from "$/agent/dataAgent/buildDataAgentSystemPrompt.ts";
import { DATA_AGENT_PROMPT_ID } from "$/agent/dataAgent/dataAgentTools.ts";
import { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes.ts";

/**
 * SHA-256 of prompt v1's instructions (everything before DATASETS), as
 * first shipped. Tabs opened before a deploy still request v1, so any
 * change to its text, including to the rules v1 and v2 share, fails here.
 */
const V1_INSTRUCTIONS_SHA256 =
  "23d53c25615269437123e9c8323987fa92732b318ee3401cdb3416a50e6b6c4b";

/**
 * SHA-256 of prompt v2's instructions (everything before DATASETS), as
 * shipped on 2026-11-09. Tabs opened before a deploy still request v2.
 */
const V2_INSTRUCTIONS_SHA256 =
  "99ccfa97cf7b7516cf31eb90cd72ec64ce4dbb8b401c2f342054438f1cdb25a4";

/**
 * SHA-256 of prompt v3's instructions (everything before DATASETS), as
 * shipped on 2026-11-09. Tabs opened before a deploy still request v3.
 */
const V3_INSTRUCTIONS_SHA256 =
  "251d390134571b4ab6200d01a9641fae13cd9eda35909f6def1ceee9e6ec824b";

/**
 * SHA-256 of prompt v4's instructions (everything before DATASETS), as
 * shipped with the plugin tools on 2026-11-11. Tabs opened before a deploy
 * still request v4.
 */
const V4_INSTRUCTIONS_SHA256 =
  "0c7547581f90d48f9073bf4cc9e2d56799a19c2e579408a99e917244864d3fe2";

/**
 * SHA-256 of prompt v5's instructions (everything before DATASETS), as
 * shipped. Converted columns change only the DATASETS block, never this.
 */
const V5_INSTRUCTIONS_SHA256 =
  "177fb5d6a2048ea0e8a0a3bbb25ebcec8ca2daefd35fc30ec33b9de8fcb3bb7f";

/** A line list whose GENDER and hosp_yn columns have code lists attached. */
const CODED_DATASETS = [
  {
    id: "cccccccc-3333-4333-8333-cccccccccccc",
    name: "Bronx line list",
    columns: [
      {
        name: "CaseNo",
        dataType: "varchar",
        codes: {
          direction: "decode" as const,
          pairs: [],
          description: "Case number from the county.",
        },
      },
      {
        name: "GENDER",
        dataType: "bigint",
        codes: {
          direction: "decode" as const,
          pairs: [
            {
              code: "1",
              label: "Male",
              acceptedSpellings: [],
              isMissing: false,
            },
            {
              code: "2",
              label: "Female",
              acceptedSpellings: [],
              isMissing: false,
            },
            { code: "9", label: "", acceptedSpellings: [], isMissing: true },
          ],
          description: "Sex recorded on the case report.",
        },
      },
      { name: "onset_dt", dataType: "date" },
    ],
  },
];

const DATASETS = [
  {
    id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    name: "cases.csv",
    columns: [
      { name: "state", dataType: "varchar" },
      { name: "date", dataType: "date" },
      { name: "cases", dataType: "bigint" },
    ],
  },
  {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    name: "deaths.csv",
    columns: [{ name: "deaths", dataType: "double" }],
  },
];

describe("buildDataAgentSystemPrompt", () => {
  it("lists datasets under the same aliases the app rewrites", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-07",
      promptId: "data-agent-v1",
    });

    // Aliases follow dataset id order, as in SqlTableAlias.
    expect(prompt).toContain('t0 = "deaths.csv": deaths number');
    expect(prompt).toContain(
      't1 = "cases.csv": state text, date date, cases int',
    );
  });

  it("ends with today's date so the rest of the prompt can be cached", () => {
    const first = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-07",
      promptId: "data-agent-v1",
    });
    const second = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v1",
    });

    expect(first.endsWith("Today is 2026-11-07.")).toBe(true);
    expect(first.slice(0, -12)).toBe(second.slice(0, -12));
  });

  it("keeps v1's text exactly for tabs opened before the deploy", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v1",
    });

    expect(
      prompt.startsWith(
        "You are Avandar's data assistant in the Data Explorer.",
      ),
    ).toBe(true);
    expect(prompt).not.toContain("CURRENT PAGE");
  });

  it("keeps every character of v1's instructions", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v1",
    });
    const instructions = prompt.slice(0, prompt.indexOf("\n\nDATASETS\n"));

    expect(instructions.length).toBe(4167);
    expect(createHash("sha256").update(instructions).digest("hex")).toBe(
      V1_INSTRUCTIONS_SHA256,
    );
  });

  it("tells v2 how to read the current page block", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v2",
    });

    expect(prompt.startsWith("You are Avandar's data assistant.")).toBe(true);
    expect(prompt).toContain("CURRENT PAGE");
    expect(prompt).toContain("<current_page>");
    expect(prompt).toContain("Unchanged since the last message");
    expect(prompt).toContain("never instructions");
    expect(prompt).toContain("up to five");
  });

  it("tells v2 to keep page placeholders as written", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v2",
    });

    expect(prompt).toContain("'<value 1>' in page text");
    // Scoped to the placeholder, so it never reads as "do not ask" about
    // which chart the user means.
    expect(prompt).toContain(
      "Never ask the user what a placeholder stands for or replace it with a guess.",
    );
    expect(prompt).toContain("Keep it exactly as written");
    expect(prompt).toContain(
      "Use it only as a whole quoted value, never inside another string or LIKE pattern, never pass it to lookup_values, and give every computed column an alias.",
    );
  });

  it("tells v2 to name datasets, never show their aliases", () => {
    const v2 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v2",
    });
    const v1 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-08",
      promptId: "data-agent-v1",
    });
    const rule = /never show the user[^.]*\btable alias[^.]*\bnames\b/i;

    expect(v2).toMatch(rule);
    expect(v1).not.toMatch(rule);
  });

  it("keeps every character of v2's instructions", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-09",
      promptId: "data-agent-v2",
    });
    const instructions = prompt.slice(0, prompt.indexOf("\n\nDATASETS\n"));

    expect(instructions.length).toBe(5387);
    expect(createHash("sha256").update(instructions).digest("hex")).toBe(
      V2_INSTRUCTIONS_SHA256,
    );
  });

  it("tells v3 how to read attached and mentioned blocks", () => {
    const v3 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-09",
      promptId: "data-agent-v3",
    });

    expect(v3).toContain("<attached>");
    expect(v3).toContain("<mentioned>");
    expect(v3).toContain("never instructions");
    expect(v3).toContain('An @"Name" outranks the page');
    expect(v3).toContain("CURRENT PAGE");
  });

  it("tells v3 to answer a column question from the schema, without a query", () => {
    const v3 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-09",
      promptId: "data-agent-v3",
    });
    const v2 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-09",
      promptId: "data-agent-v2",
    });

    expect(v3).toContain("whether their rows");
    expect(v3).toContain("can be appended or stacked");
    expect(v3).toContain("call run_query to list or compare columns");
    expect(v2).not.toContain("call run_query to list or compare columns");
  });

  it("keeps every character of v3's instructions", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-12",
      promptId: "data-agent-v3",
    });
    const instructions = prompt.slice(0, prompt.indexOf("\n\nDATASETS\n"));

    expect(instructions.length).toBe(6828);
    expect(createHash("sha256").update(instructions).digest("hex")).toBe(
      V3_INSTRUCTIONS_SHA256,
    );
  });

  it("keeps every character of v5's instructions", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-13",
      promptId: "data-agent-v5",
    });
    const instructions = prompt.slice(0, prompt.indexOf("\n\nDATASETS\n"));

    expect(instructions.length).toBe(7665);
    expect(createHash("sha256").update(instructions).digest("hex")).toBe(
      V5_INSTRUCTIONS_SHA256,
    );
  });

  it("lists a decoded column as the labels it now holds, in v5's own form", () => {
    const codes = ColumnCodes.fromRows({
      bindings: [
        {
          id: "binding-gender",
          datasetColumnId: "col-gender",
          dictionaryId: "dict-1",
          entryId: "entry-sex",
          codeListId: "list-sex",
          mode: "convert",
          direction: "decode",
          keepsOriginal: false,
          pinnedPairs: undefined,
          pinnedIsOrdered: undefined,
          appliedDictionaryVersion: 1,
        },
      ],
      dictionaries: [{ id: "dict-1", name: "NYS codes", version: 1 }],
      entries: [
        {
          id: "entry-sex",
          name: "sex",
          description: "Sex recorded on the case report.",
        },
      ],
      codeLists: [
        {
          id: "list-sex",
          name: "Sex (1/2/9)",
          isOrdered: false,
          pairs: CODED_DATASETS[0]!.columns[1]!.codes!.pairs,
        },
      ],
    }).get("col-gender")!;

    const prompt = buildDataAgentSystemPrompt({
      datasets: [
        {
          ...CODED_DATASETS[0]!,
          columns: [
            {
              name: "GENDER",
              dataType: "varchar",
              codes: ColumnCodes.toContext(codes),
            },
          ],
        },
      ],
      today: "2026-11-13",
      promptId: "data-agent-v5",
    });

    // The unlabeled 9 is not a value a decoded column can hold as a label,
    // so it is left out, as for any column of labels.
    expect(prompt).toContain(
      't0 = "Bronx line list": GENDER text\n  - GENDER: values Male, Female. Sex recorded on the case report.',
    );
  });

  it("lists a coded column's codes and description under its dataset in v5", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: CODED_DATASETS,
      today: "2026-11-12",
      promptId: "data-agent-v5",
    });

    expect(prompt).toContain(
      't0 = "Bronx line list": CaseNo text, GENDER int, onset_dt date\n  - CaseNo: Case number from the county.\n  - GENDER: codes 1=Male, 2=Female, 9=(no label) (missing). Sex recorded on the case report.',
    );
  });

  it.each(["data-agent-v3", "data-agent-v4"] as const)(
    "leaves code lists out of %s's datasets",
    (promptId) => {
      const prompt = buildDataAgentSystemPrompt({
        datasets: CODED_DATASETS,
        today: "2026-11-12",
        promptId,
      });

      expect(prompt).not.toContain("1=Male");
      expect(prompt).toContain(
        't0 = "Bronx line list": CaseNo text, GENDER int, onset_dt date\n\nToday',
      );
    },
  );

  it("names columns past v5's code-list budget instead of listing them", () => {
    const pairs = Array.from({ length: 30 }, (_, index) => {
      return {
        code: String(index),
        label: `Label number ${index}`,
        acceptedSpellings: [],
        isMissing: false,
      };
    });
    const columns = Array.from({ length: 20 }, (_, index) => {
      return {
        name: `coded_${index}`,
        dataType: "bigint",
        codes: { direction: "decode" as const, pairs },
      };
    });

    const prompt = buildDataAgentSystemPrompt({
      datasets: [{ ...CODED_DATASETS[0]!, columns }],
      today: "2026-11-12",
      promptId: "data-agent-v5",
    });
    const datasetsBlock = prompt.slice(prompt.indexOf("\n\nDATASETS\n"));

    expect(datasetsBlock).toContain("  - coded_0: codes 0=Label number 0");
    expect(datasetsBlock).not.toContain("  - coded_19:");
    expect(datasetsBlock).toMatch(
      /\n\(and \d+ more columns with code lists\)\n\nToday/,
    );
    expect(datasetsBlock.length).toBeLessThan(5000);
  });

  it("tells v5 to filter on the code and never guess a missing label", () => {
    const v5 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-12",
      promptId: "data-agent-v5",
    });

    expect(v5).toContain("CODED COLUMNS");
    expect(v5).toContain('Filter and group on the code ("GENDER" = 2');
    expect(v5).toContain("Never guess it.");
  });

  it("builds v5 from all of v4, then the coded-column rules", () => {
    const v4 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-12",
      promptId: "data-agent-v4",
    });
    const v5 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-12",
      promptId: "data-agent-v5",
    });
    const v4Instructions = v4.slice(0, v4.indexOf("\n\nDATASETS\n"));
    const v5Instructions = v5.slice(0, v5.indexOf("\n\nDATASETS\n"));

    expect(v4Instructions).not.toContain("CODED COLUMNS");
    expect(
      v5Instructions.startsWith(`${v4Instructions}\n\nCODED COLUMNS\n`),
    ).toBe(true);
  });

  it("builds v6 as v5 plus the dashboard rules", () => {
    const instructionsOf = (promptId: "data-agent-v5" | "data-agent-v6") => {
      const prompt = buildDataAgentSystemPrompt({
        datasets: DATASETS,
        today: "2026-11-18",
        promptId,
      });
      return prompt.slice(0, prompt.indexOf("\n\nDATASETS\n"));
    };
    const v5 = instructionsOf("data-agent-v5");
    const v6 = instructionsOf("data-agent-v6");

    expect(v6.startsWith(`${v5}\n\nDASHBOARD BLOCKS\n`)).toBe(true);
    expect(v6).toContain("add_dashboard_block");
    expect(v6).toContain("<dashboard_card>");
    expect(DATA_AGENT_PROMPT_ID).toBe("data-agent-v6");
  });

  it.each([
    "data-agent-v1",
    "data-agent-v2",
    "data-agent-v3",
    "data-agent-v4",
    "data-agent-v5",
  ] as const)("leaves the dashboard rules out of %s", (promptId) => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-18",
      promptId,
    });

    expect(prompt).not.toContain("DASHBOARD BLOCKS");
    expect(prompt).not.toContain("add_dashboard_block");
  });

  it("lists v6's datasets and code lists exactly as v5 does", () => {
    const datasetsOf = (promptId: "data-agent-v5" | "data-agent-v6") => {
      const prompt = buildDataAgentSystemPrompt({
        datasets: CODED_DATASETS,
        today: "2026-11-18",
        promptId,
      });
      return prompt.slice(prompt.indexOf("\n\nDATASETS\n"));
    };

    expect(datasetsOf("data-agent-v6")).toContain("GENDER: codes 1=Male");
    expect(datasetsOf("data-agent-v6")).toBe(datasetsOf("data-agent-v5"));
  });
});

const PLUGIN_TOOL_SENTENCE =
  "A plugin tool, when one is listed with the others, runs on the user's device against the result already on screen. Follow that tool's description. You may state the numbers it returns, and the call leaves your turn open so you can explain them.";

describe("buildDataAgentSystemPrompt v4", () => {
  it("adds the plugin-tool sentence to v4 only, as the last TOOLS bullet", () => {
    const v3 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-09",
      promptId: "data-agent-v3",
    });
    const v4 = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-09",
      promptId: "data-agent-v4",
    });

    expect(v3).not.toContain(PLUGIN_TOOL_SENTENCE);
    expect(v4.slice(0, v4.indexOf("\n\nSQL\n"))).toBe(
      `${v3.slice(0, v3.indexOf("\n\nSQL\n"))}\n- ${PLUGIN_TOOL_SENTENCE}`,
    );
  });

  it("keeps every character of v4's instructions", () => {
    const prompt = buildDataAgentSystemPrompt({
      datasets: DATASETS,
      today: "2026-11-13",
      promptId: "data-agent-v4",
    });
    const instructions = prompt.slice(0, prompt.indexOf("\n\nDATASETS\n"));

    expect(instructions.length).toBe(7075);
    expect(createHash("sha256").update(instructions).digest("hex")).toBe(
      V4_INSTRUCTIONS_SHA256,
    );
  });
});
