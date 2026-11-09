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

/** A dataset with its own id, distinct for each `index` from 0 to 9. */
function _dataset(index: number, name: string): AgentGadgetContext {
  return {
    kind: "dataset",
    ref: {
      gadgetType: "dataset",
      gadgetId: `4444444${index}-4444-4444-8444-444444444444`,
      subId: null,
    },
    name,
  };
}

function _tileMention(
  subId: string,
  title: string,
  sql: string,
): AgentGadgetContext {
  return {
    kind: "dashboard_tile",
    ref: { gadgetType: "dashboard_tile", gadgetId: DASH_ID, subId },
    dashboardName: "C",
    tile: _tile(title, sql),
  };
}

/** An attached dashboard whose only chart filters on `'Springfield'`. */
const SPRINGFIELD_DASHBOARD: AgentGadgetContext = {
  kind: "dashboard",
  ref: { gadgetType: "dashboard", gadgetId: DASH_ID, subId: null },
  name: "Clinics",
  tiles: [_tile("Visits", "SELECT * FROM v WHERE city = 'Springfield'")],
};

describe("buildAgentContextBlocks", () => {
  it("leaves out empty blocks", () => {
    const blocks = buildAgentContextBlocks({
      attached: [],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(blocks).toEqual({});
  });

  it("names a dataset in the chat with its alias", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [DATASET],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock).toContain('1. Dataset "US deaths" (query it as t0)');
  });

  it("marks a dataset outside the chat as not queryable", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [_dataset(0, "New list")],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock).toContain(
      '1. Dataset "New list", not queryable in this chat',
    );
  });

  it("lists only the first five attached gadgets", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: Array.from({ length: 6 }, (_, index) => {
        return _dataset(index, `Set ${index + 1}`);
      }),
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock).toContain('5. Dataset "Set 5"');
    expect(attachedBlock).not.toContain("Set 6");
  });

  it("lists 12 charts per dashboard and counts the rest", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [_dashboard("A", 14)],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock?.match(/: SELECT 1/g)).toHaveLength(12);
    expect(attachedBlock).toContain("2 more charts not listed.");
  });

  it("gives SQL to at most 24 charts across the attached gadgets", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [_dashboard("A", 12), _dashboard("B", 12), _dashboard("C", 12)],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock?.match(/: SELECT 1/g)).toHaveLength(24);
    expect(attachedBlock?.match(/\(bar\)$/gm)).toHaveLength(12);
  });

  it("lists a mentioned chart past the budget by title only", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [_dashboard("A", 12), _dashboard("B", 12)],
      mentioned: [_tileMention("x", "Late chart", "SELECT 42")],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain(
      '@"Late chart": Chart "Late chart" on dashboard "C" (bar)\n',
    );
    expect(mentionedBlock).not.toContain("SELECT 42");
  });

  it("does not spend the chart budget on a chart with no SQL", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [_dashboard("A", 12), _dashboard("B", 11)],
      mentioned: [
        _tileMention("empty", "Empty chart", ""),
        _tileMention("late", "Late chart", "SELECT 42"),
      ],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain(
      '"Late chart" on dashboard "C" (bar): SELECT 42',
    );
  });

  it("does not spend the chart budget on a dashboard chart with no SQL", () => {
    const withEmptyCharts: AgentGadgetContext = {
      kind: "dashboard",
      ref: { gadgetType: "dashboard", gadgetId: DASH_ID, subId: null },
      name: "B",
      tiles: Array.from({ length: 12 }, (_, index) => {
        return index < 6
          ? _tile(`Empty ${index + 1}`, "")
          : _tile(`Chart ${index + 1}`);
      }),
    };
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [_dashboard("A", 12), withEmptyCharts, _dashboard("C", 12)],
      mentioned: [],
      aliases: ALIASES,
    });
    // 12 from A, 6 from B, and the 6 left go to C's first charts.
    expect(attachedBlock?.match(/: SELECT 1/g)).toHaveLength(24);
  });

  it("describes a mentioned chart with its SQL", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [],
      mentioned: [
        _tileMention("x", "Weekly", `SELECT * FROM ${ALIASES[0]!.tableName}`),
      ],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain(
      '@"Weekly": Chart "Weekly" on dashboard "C" (bar): SELECT * FROM "t0"',
    );
  });

  it("redacts SQL that a cap leaves out but never sends it", () => {
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
    const blocks = buildAgentContextBlocks({
      attached: [dashboard("A", "SELECT A"), dashboard("B", "SELECT B")],
      mentioned: Array.from({ length: 6 }, (_, index) => {
        return _tileMention(`m${index}`, `M ${index}`, `SELECT ${100 + index}`);
      }),
      aliases: ALIASES,
      redactSql: (sql) => {
        redacted.push(sql);
        return sql;
      },
    });
    // Every chart's SQL reaches the vault, so a value it filters on is
    // masked in names, but only the 24 the budget allows are sent.
    expect(redacted).toHaveLength(34);
    expect(redacted).toContain("SELECT A 13");
    expect(redacted).toContain("SELECT 105");
    const sent = Object.values(blocks).join("\n");
    expect(sent).toContain("SELECT B 12");
    expect(sent).not.toContain("SELECT A 13");
    expect(sent).not.toContain("SELECT 100");
    expect(sent).not.toContain("SELECT 105");
  });

  it("describes the first five mentions that are not pointers", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [DATASET],
      mentioned: [
        DATASET,
        ...Array.from({ length: 5 }, (_, index) => {
          return _dataset(index, `Set ${index + 1}`);
        }),
      ],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain('@"Set 5": Dataset "Set 5"');
  });

  it("names a sixth described mention without describing it", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [],
      mentioned: Array.from({ length: 6 }, (_, index) => {
        return _dataset(index, `Set ${index + 1}`);
      }),
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain('@"Set 6": mentioned, not described');
  });

  it("describes new mentions after four tray pointers", () => {
    const attached = Array.from({ length: 4 }, (_, index) => {
      return _dataset(index, `Pinned ${index + 1}`);
    });
    const { mentionedBlock } = buildAgentContextBlocks({
      attached,
      mentioned: [...attached, _dataset(5, "New 1"), _dataset(6, "New 2")],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain('@"New 2": Dataset "New 2"');
  });

  it("points at the page instead of repeating its dashboard", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      page: {
        app: "dashboard",
        dashboard: { id: DASH_ID, name: "A", tiles: [] },
      },
      attached: [],
      mentioned: [_dashboard("A", 1)],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toBe(
      [
        "<mentioned>",
        "What each @ in the message refers to:",
        '@"A": Dashboard "A", the dashboard on the current page',
        "</mentioned>",
      ].join("\n"),
    );
  });

  it("points at the tray instead of repeating an attached gadget", () => {
    const { mentionedBlock } = buildAgentContextBlocks({
      attached: [DATASET],
      mentioned: [DATASET],
      aliases: ALIASES,
    });
    expect(mentionedBlock).toContain('@"US deaths": attached above');
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

  it("lists a map's layers with their sources", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [
        {
          kind: "map",
          ref: { gadgetType: "map", gadgetId: DASH_ID, subId: null },
          name: "Clinics",
          layers: [
            { name: "Sites", sourceName: "Clinic list" },
            { name: "Areas" },
          ],
        },
      ],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock).toContain(
      '1. Map "Clinics", layers: "Sites" from "Clinic list"; "Areas"',
    );
  });

  it("masks a map's layer and source names", () => {
    const vault = _createFakeVault();
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [
        SPRINGFIELD_DASHBOARD,
        {
          kind: "map",
          ref: { gadgetType: "map", gadgetId: DATASET_ID, subId: null },
          name: "Clinics",
          layers: [{ name: "Springfield sites", sourceName: "Springfield" }],
        },
      ],
      mentioned: [],
      aliases: ALIASES,
      redactSql: vault.redactSql,
      maskText: vault.maskText,
    });
    expect(attachedBlock).toContain(
      '2. Map "Clinics", layers: "<value 1> sites" from "<value 1>"',
    );
  });

  it("masks a case type's field names", () => {
    const vault = _createFakeVault();
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [
        SPRINGFIELD_DASHBOARD,
        {
          kind: "concept",
          ref: { gadgetType: "concept", gadgetId: DATASET_ID, subId: null },
          name: "Measles case",
          fieldNames: ["Onset date", "Springfield ward"],
        },
      ],
      mentioned: [],
      aliases: ALIASES,
      redactSql: vault.redactSql,
      maskText: vault.maskText,
    });
    expect(attachedBlock).toContain(
      '2. Case type "Measles case", fields: "Onset date", "<value 1> ward"',
    );
  });

  it("lists 40 case type fields and counts the rest", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [
        {
          kind: "concept",
          ref: { gadgetType: "concept", gadgetId: DATASET_ID, subId: null },
          name: "Measles case",
          fieldNames: Array.from({ length: 41 }, (_, index) => {
            return `Field ${index + 1}`;
          }),
        },
      ],
      mentioned: [],
      aliases: ALIASES,
    });
    expect(attachedBlock).toContain('"Field 40", and 1 more');
    expect(attachedBlock).not.toContain("Field 41");
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
      attached: [SPRINGFIELD_DASHBOARD],
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

  it("hides a chart title that looks personal", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [
        {
          kind: "dashboard",
          ref: { gadgetType: "dashboard", gadgetId: DASH_ID, subId: null },
          name: "Visits",
          tiles: [_tile("jane@example.org")],
        },
      ],
      mentioned: [],
      aliases: ALIASES,
      isSensitive: (text) => {
        return text.includes("@");
      },
    });
    expect(attachedBlock).toContain('1. "Untitled chart" (bar)');
    expect(attachedBlock).not.toContain("jane@example.org");
  });

  it("masks a dashboard's name", () => {
    const { attachedBlock } = buildAgentContextBlocks({
      attached: [_dashboard("Visits by Jane Doe", 0)],
      mentioned: [],
      aliases: ALIASES,
      maskText: (text) => {
        return text.replace("Jane Doe", "<value 1>");
      },
    });
    expect(attachedBlock).toContain('Dashboard "Visits by <value 1>"');
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
  const OPTIONS = {
    isSensitive: (text: string) => {
      return text.includes("@");
    },
    mask: (text: string) => {
      return text.replace("Jane", "<value 1>").replace("map", "<value 2>");
    },
  };

  it("hides a tile title that looks personal", () => {
    expect(
      buildAgentGadgetModelName(
        _tileMention("b", "jane@example.org", "SELECT 1"),
        OPTIONS,
      ),
    ).toBe("Untitled chart");
  });

  it("masks a gadget's name", () => {
    expect(
      buildAgentGadgetModelName({ ...DATASET, name: "Jane" }, OPTIONS),
    ).toBe("<value 1>");
  });

  it("never masks an unavailable gadget's fixed name", () => {
    expect(
      buildAgentGadgetModelName(
        {
          kind: "unavailable",
          ref: { gadgetType: "map", gadgetId: DASH_ID, subId: null },
        },
        OPTIONS,
      ),
    ).toBe("an unavailable map");
  });
});
