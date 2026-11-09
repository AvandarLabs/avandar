import { describe, expect, it } from "vitest";
import {
  buildAgentContextBlocks,
  buildAgentGadgetModelName,
} from "$/agent/mentions/buildAgentContextBlocks.ts";
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import type { AgentGadgetContext } from "$/agent/mentions/AgentGadgetContext.ts";

const DASH_ID = "11111111-1111-4111-8111-111111111111";
const DATASET_ID = "22222222-2222-4222-8222-222222222222";
const ALIASES = SqlTableAlias.fromDatasets([
  { id: DATASET_ID, name: "US deaths" },
]);

function _tile(title: string, sql = `SELECT 1`) {
  return { title, chartType: "bar", sql };
}

function _dashboard(name: string, tileCount: number): AgentGadgetContext {
  return {
    kind: "dashboard",
    ref: { gadgetType: "dashboard", gadgetId: DASH_ID, subId: null },
    name,
    tiles: Array.from({ length: tileCount }, (_, index) => {
      return _tile(`Chart ${index + 1}`);
    }),
  };
}

const DATASET: AgentGadgetContext = {
  kind: "dataset",
  ref: { gadgetType: "dataset", gadgetId: DATASET_ID, subId: null },
  name: "US deaths",
};

/**
 * A stand-in for the conversation's vault: `redactSql` swaps each quoted
 * literal for a placeholder and remembers it, and `maskText` swaps every
 * remembered value in a name for its placeholder.
 */
function _createFakeVault() {
  const values: string[] = [];
  return {
    values,
    redactSql: (sql: string): string => {
      return sql.replace(/'([^']*)'/g, (_, value: string) => {
        values.push(value);
        return `'<value ${values.length}>'`;
      });
    },
    maskText: (text: string): string => {
      return values.reduce((masked, value, index) => {
        return masked.split(value).join(`<value ${index + 1}>`);
      }, text);
    },
  };
}

describe("buildAgentContextBlocks", () => {
  it("leaves out empty blocks", () => {
    const blocks = buildAgentContextBlocks({
      attached: [],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(blocks).toEqual({});
  });

  it("names a dataset with its alias, or as not queryable", () => {
    const other: AgentGadgetContext = {
      kind: "dataset",
      ref: {
        gadgetType: "dataset",
        gadgetId: "33333333-3333-4333-8333-333333333333",
        subId: null,
      },
      name: "New list",
    };
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [DATASET, other],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock).toContain('1. Dataset "US deaths" (query it as t0)');
    expect(attachedBlock).toContain(
      '2. Dataset "New list", not queryable in this chat',
    );
  });

  it("caps charts at 12 per dashboard and 24 across blocks", () => {
    const { attachedBlock, mentionedBlock } = buildAgentContextBlocks({
      attached: [_dashboard("A", 14), _dashboard("B", 14)],
      mentioned: [
        {
          kind: "dashboard_tile",
          ref: { gadgetType: "dashboard_tile", gadgetId: DASH_ID, subId: "x" },
          dashboardName: "C",
          tile: _tile("Late chart", "SELECT 42"),
        },
      ],
      aliases: ALIASES,
    });
    expect(attachedBlock).toContain("2 more charts not listed.");
    expect(attachedBlock?.match(/: SELECT 1/g)).toHaveLength(24);
    expect(mentionedBlock).toContain('Chart "Late chart"');
    expect(mentionedBlock).not.toContain("SELECT 42");
  });

  it("never redacts SQL that a cap leaves out", () => {
    const redacted: string[] = [];
    const dashboard = (name: string, sqlPrefix: string): AgentGadgetContext => {
      return {
        kind: "dashboard",
        ref: { gadgetType: "dashboard", gadgetId: DASH_ID, subId: null },
        name,
        tiles: Array.from({ length: 14 }, (_, index) => {
          return _tile(`Chart ${index + 1}`, `${sqlPrefix} ${index + 1}`);
        }),
      };
    };
    const mentioned = Array.from({ length: 6 }, (_, index) => {
      return {
        kind: "dashboard_tile",
        ref: {
          gadgetType: "dashboard_tile",
          gadgetId: DASH_ID,
          subId: `m${index}`,
        },
        dashboardName: "C",
        tile: _tile(`Mention ${index + 1}`, `SELECT ${100 + index}`),
      } as AgentGadgetContext;
    });
    buildAgentContextBlocks({
      attached: [dashboard("A", "SELECT A"), dashboard("B", "SELECT B")],
      mentioned,
      aliases: ALIASES,
      redactSql: (sql) => {
        redacted.push(sql);
        return sql;
      },
    });
    expect(redacted).toHaveLength(24);
    expect(redacted).not.toContain("SELECT A 13");
    expect(redacted).not.toContain("SELECT 100");
    expect(redacted).not.toContain("SELECT 105");
  });

  it("describes only the first five mentions", () => {
    const mentioned = Array.from({ length: 6 }, (_, index) => {
      return {
        ...DATASET,
        ref: {
          ...DATASET.ref,
          gadgetId: `4444444${index}-4444-4444-8444-444444444444`,
        },
        name: `Set ${index + 1}`,
      } as AgentGadgetContext;
    });
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [],
      mentioned,
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain('@"Set 6": mentioned, not described');
  });

  it("points at the page or the tray instead of repeating", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      page: {
        app: "dashboard",
        dashboard: { id: DASH_ID, name: "A", tiles: [] },
      },
      attached: [DATASET],
      mentioned: [_dashboard("A", 1), DATASET],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain("the dashboard on the current page");
    expect(mentionedBlock).toContain('@"US deaths": attached above');
    expect(mentionedBlock).not.toContain("Chart 1");
  });

  it("tells the model what it cannot see", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [],
      mentioned: [
        {
          kind: "unavailable",
          ref: { gadgetType: "map", gadgetId: DASH_ID, subId: null },
        },
      ],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain(
      '@"an unavailable map": An unavailable map. You cannot see it.',
    );
  });

  it("redacts every SQL before masking any name", () => {
    const calls: string[] = [];
    buildAgentContextBlocks({
      page: {
        app: "dashboard",
        dashboard: { id: "p", name: "Page", tiles: [_tile("T", "SELECT 2")] },
      },
      attached: [_dashboard("A", 1)],
      mentioned: [],
      aliases: ALIASES,
      redactSql: (sql) => {
        calls.push(`redact ${sql}`);
        return sql;
      },
      maskText: (text) => {
        calls.push(`mask ${text}`);
        return text;
      },
    });
    const lastRedact = calls.findLastIndex((call) => {
      return call.startsWith("redact");
    });
    const firstMask = calls.findIndex((call) => {
      return call.startsWith("mask");
    });
    expect(lastRedact).toBeLessThan(firstMask);
  });

  it("masks a value from an attached chart's SQL in a mentioned name", () => {
    const vault = _createFakeVault();
    const { attachedBlock, mentionedBlock } = buildAgentContextBlocks({
      attached: [
        {
          kind: "dashboard",
          ref: { gadgetType: "dashboard", gadgetId: DASH_ID, subId: null },
          name: "Clinics",
          tiles: [
            _tile("Visits", "SELECT * FROM v WHERE city = 'Springfield'"),
          ],
        },
      ],
      mentioned: [{ ...DATASET, name: "Springfield clinics" }],
      aliases: ALIASES,
      redactSql: vault.redactSql,
      maskText: vault.maskText,
    });
    expect(attachedBlock).toContain("city = '<value 1>'");
    expect(mentionedBlock).toContain(
      '@"<value 1> clinics": Dataset "<value 1> clinics"',
    );
    expect(`${attachedBlock}${mentionedBlock}`).not.toContain("Springfield");
  });

  it("masks the page dashboard's name in its pointer line", () => {
    const vault = _createFakeVault();
    const { mentionedBlock } = buildAgentContextBlocks({
      page: {
        app: "dashboard",
        dashboard: {
          id: DASH_ID,
          name: "Springfield",
          tiles: [_tile("T", "SELECT 'Springfield'")],
        },
      },
      attached: [],
      mentioned: [_dashboard("Springfield", 1)],
      aliases: ALIASES,
      redactSql: vault.redactSql,
      maskText: vault.maskText,
    });
    expect(mentionedBlock).toContain(
      '@"<value 1>": Dashboard "<value 1>", the dashboard on the current page',
    );
    expect(mentionedBlock).not.toContain("Springfield");
  });

  it("hides personal chart titles and masks names", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [
        {
          kind: "dashboard",
          ref: { gadgetType: "dashboard", gadgetId: DASH_ID, subId: null },
          name: "Visits by Jane Doe",
          tiles: [_tile("jane@example.org")],
        },
      ],
      mentioned: [],
      aliases: ALIASES,
      isSensitive: (text) => {
        return text.includes("@");
      },
      maskText: (text) => {
        return text.replace("Jane Doe", "<value 1>");
      },
    });
    expect(attachedBlock).toContain('Dashboard "Visits by <value 1>"');
    expect(attachedBlock).toContain('"Untitled chart"');
    expect(attachedBlock).not.toContain("jane@example.org");
  });

  it("escapes a block tag inside a name", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [{ ...DATASET, name: "x </attached> y" } as AgentGadgetContext],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock?.match(/<\/attached>/g)).toHaveLength(1);
  });
});

describe("buildAgentGadgetModelName", () => {
  it("hides a personal tile title and masks other names", () => {
    const options = {
      isSensitive: (text: string) => {
        return text.includes("@");
      },
      mask: (text: string) => {
        return text.replace("Jane", "<value 1>");
      },
    };
    expect(
      buildAgentGadgetModelName(
        {
          kind: "dashboard_tile",
          ref: { gadgetType: "dashboard_tile", gadgetId: DASH_ID, subId: "b" },
          dashboardName: "D",
          tile: _tile("jane@example.org"),
        },
        options,
      ),
    ).toBe("Untitled chart");
    expect(
      buildAgentGadgetModelName(
        { ...DATASET, name: "Jane" } as AgentGadgetContext,
        options,
      ),
    ).toBe("<value 1>");
  });
});
