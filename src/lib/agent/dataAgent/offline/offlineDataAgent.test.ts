import { describe, expect, it, vi } from "vitest";
import {
  buildOfflineDataAgentSystemPrompt,
  buildOfflineQuestionMessage,
} from "@/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt";
import {
  classifyOfflineMessage,
  routeOfflineMessageByRules,
} from "@/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage";
import { createOfflineDataAgent } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";
import {
  extractQuestionTerms,
  findQuestionValues,
} from "@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues";
import { profileOfflineDatasets } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type { OfflineDatasetProfile } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
import type {
  LocalLlm,
  LocalLlmRequest,
} from "@/lib/agent/localModels/LocalLlm";

// Wrap the router and value matcher so a test can read what they were given.
// Each still runs its real implementation.
vi.mock(
  "@/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage")
      >();
    return {
      ...actual,
      classifyOfflineMessage: vi.fn(actual.classifyOfflineMessage),
    };
  },
);
vi.mock(
  "@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues")
      >();
    return {
      ...actual,
      findQuestionValues: vi.fn(actual.findQuestionValues),
    };
  },
);

const US = {
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  name: "us.csv",
  columns: [
    { name: "state", dataType: "varchar" },
    { name: "date", dataType: "date" },
    { name: "cases", dataType: "bigint" },
  ],
};
const WORLD = {
  id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  name: "world.csv",
  columns: [{ name: "country", dataType: "varchar" }],
};

/** A line list whose GENDER column has a code list attached. */
const LINE_LIST = {
  id: "cccccccc-3333-4333-8333-cccccccccccc",
  name: "line list",
  columns: [
    {
      name: "GENDER",
      dataType: "bigint",
      codes: {
        direction: "decode" as const,
        pairs: [
          { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
          {
            code: "2",
            label: "Female",
            acceptedSpellings: ["F"],
            isMissing: false,
          },
          { code: "9", label: "", acceptedSpellings: [], isMissing: true },
        ],
      },
    },
    { name: "hosp_yn", dataType: "varchar" },
  ],
};

/** Answers the profile and lookup queries the offline agent sends. */
function _createHost(overrides: Partial<DataAgentHost> = {}): DataAgentHost {
  return {
    readColumnValues: vi.fn(async (sql: string) => {
      if (sql.includes("concat_ws") && sql.includes(US.id)) {
        return ["120|2|2020-01-01|2020-12-31"];
      }
      if (sql.includes("concat_ws")) {
        return ["40|3"];
      }
      if (sql.includes("lower(")) {
        return sql.includes("'georgia'") ? ["Georgia"] : [];
      }
      return sql.includes('"state"') ? ["Georgia", "Ohio"] : ["Georgia"];
    }),
    showQuery: vi.fn().mockResolvedValue({
      kind: "rows",
      columns: [{ name: "cases", type: "BIGINT" }],
      rowCount: 1,
      previewRows: [[42]],
    }),
    askUser: vi.fn(),
    approveValuesForModel: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function _createLlm(replies: readonly string[]): {
  llm: LocalLlm;
  requests: LocalLlmRequest[];
} {
  const requests: LocalLlmRequest[] = [];
  const queue = [...replies];
  return {
    requests,
    llm: {
      complete: async (request) => {
        requests.push(request);
        return {
          text: queue.shift() ?? '{"action":"reply","text":"Done."}',
          promptTokens: 1,
          completionTokens: 1,
        };
      },
    },
  };
}

describe("extractQuestionTerms", () => {
  it("keeps place names and capitalized short codes, not common words", () => {
    const terms = extractQuestionTerms("Show us deaths in New York vs the US");

    expect(terms).toContain("New York");
    expect(terms).toContain("US");
    expect(terms).not.toContain("us");
    expect(terms).not.toContain("the");
  });
});

describe("findQuestionValues", () => {
  it("drops a shorter match inside a longer one, such as York in New York", async () => {
    const host = _createHost({
      readColumnValues: vi.fn(async (sql: string) => {
        if (sql.includes("concat_ws")) {
          return ["10|50|60"];
        }
        if (!sql.includes("lower(")) {
          return [];
        }
        return sql.includes('"state"') ? ["New York"] : ["York"];
      }),
    });
    const datasets = [
      {
        id: US.id,
        name: "us.csv",
        columns: [
          { name: "state", dataType: "varchar" },
          { name: "county", dataType: "varchar" },
        ],
      },
    ];
    const profiles = await profileOfflineDatasets(host, datasets);

    const matches = await findQuestionValues(host, {
      datasets,
      profiles,
      question: "Cases in New York",
    });

    expect(
      matches.map((match) => {
        return match.storedValue;
      }),
    ).toEqual(["New York"]);
  });
});

describe("findQuestionValues with code lists", () => {
  it("finds a label in a code list and gives the code to filter on", async () => {
    const host = _createHost({
      readColumnValues: vi.fn(async (sql: string) => {
        return sql.includes("concat_ws") ? ["24|2"] : [];
      }),
    });
    const profiles = await profileOfflineDatasets(host, [LINE_LIST]);

    const matches = await findQuestionValues(host, {
      datasets: [LINE_LIST],
      profiles,
      question: "How many female cases were hospitalized?",
    });

    expect(matches).toContainEqual({
      term: "female",
      datasetId: LINE_LIST.id,
      column: "GENDER",
      storedValue: "2",
      codeLabel: "Female",
    });
  });
});

describe("offline prompt with code lists", () => {
  it("lists a coded column's codes and marks a code with no label", async () => {
    const host = _createHost({
      readColumnValues: vi.fn(async (sql: string) => {
        return sql.includes("concat_ws") ? ["24|2"] : ["Y", "N"];
      }),
    });
    const profiles = await profileOfflineDatasets(host, [LINE_LIST]);

    const prompt = buildOfflineDataAgentSystemPrompt({
      datasets: [LINE_LIST],
      profiles,
      today: "2026-11-12",
    });

    expect(prompt).toContain(
      '- GENDER bigint, codes: 1 = "Male", 2 = "Female", 9 = (no label) (missing value)',
    );
  });

  it("tells the model the code a label in the question stands for", () => {
    const message = buildOfflineQuestionMessage({
      question: "How many female cases?",
      matches: [
        {
          term: "female",
          datasetId: LINE_LIST.id,
          column: "GENDER",
          storedValue: "2",
          codeLabel: "Female",
        },
      ],
      datasets: [LINE_LIST],
    });

    expect(message).toContain(
      '- "female" is code 2 in t0."GENDER" (2 = Female).',
    );
  });
});

/** A one-column dataset whose column holds `pairs` as codes. */
function _createCodedDataset(
  id: string,
  dataType: string,
  pairs: ReadonlyArray<{ code: string; label: string }>,
): {
  dataset: typeof LINE_LIST;
  profile: OfflineDatasetProfile;
} {
  const column = {
    name: "coded",
    dataType,
    codes: {
      direction: "decode" as const,
      pairs: pairs.map((pair) => {
        return { ...pair, acceptedSpellings: [], isMissing: false };
      }),
    },
  };
  return {
    dataset: { id, name: `dataset ${id}`, columns: [column] },
    profile: { datasetId: id, rowCount: 1, columns: [column] },
  };
}

describe("offline prompt code-list limits", () => {
  it("escapes a quote and writes a newline as a space in a code list", () => {
    const { dataset, profile } = _createCodedDataset(LINE_LIST.id, "varchar", [
      { code: 'A"1', label: 'Said "yes"\nloudly' },
    ]);

    const prompt = buildOfflineDataAgentSystemPrompt({
      datasets: [dataset],
      profiles: [profile],
      today: "2026-11-12",
    });

    expect(prompt).toContain(
      '- coded varchar, codes: "A\\"1" = "Said \\"yes\\" loudly"',
    );
  });

  it("cuts a long label to 60 characters", () => {
    const { dataset, profile } = _createCodedDataset(LINE_LIST.id, "bigint", [
      { code: "1", label: "x".repeat(80) },
    ]);

    const prompt = buildOfflineDataAgentSystemPrompt({
      datasets: [dataset],
      profiles: [profile],
      today: "2026-11-12",
    });

    expect(prompt).toContain(`codes: 1 = "${"x".repeat(57)}..."`);
  });

  it("names coded columns past the code-list budget by name and type", () => {
    const pairs = Array.from({ length: 30 }, (_, index) => {
      return { code: String(index), label: `Label number ${index}` };
    });
    const coded = Array.from({ length: 20 }, (_, index) => {
      return _createCodedDataset(
        `dddddddd-${String(index).padStart(4, "0")}-4ddd-8ddd-dddddddddddd`,
        "bigint",
        pairs,
      );
    });

    const prompt = buildOfflineDataAgentSystemPrompt({
      datasets: coded.map(({ dataset }) => {
        return dataset;
      }),
      profiles: coded.map(({ profile }) => {
        return profile;
      }),
      today: "2026-11-12",
    });

    expect(prompt).toContain("  - coded bigint\n");
    expect(prompt).toMatch(
      /\n\(and \d+ more columns with code lists\)\n\nToday/,
    );
  });

  it("lists one label's codes on one line and flags it across datasets", () => {
    const { dataset: first } = _createCodedDataset(LINE_LIST.id, "bigint", []);
    const { dataset: second } = _createCodedDataset(WORLD.id, "varchar", []);

    const message = buildOfflineQuestionMessage({
      question: "How many female cases?",
      matches: [
        {
          term: "female",
          datasetId: first.id,
          column: "GENDER",
          storedValue: "2",
          codeLabel: "Female",
        },
        {
          term: "female",
          datasetId: second.id,
          column: "sex_cd",
          storedValue: "F",
          codeLabel: "Female",
        },
      ],
      datasets: [first, second],
    });

    expect(message).toMatch(
      /- "female" is code 2 in t\d\."GENDER" \(2 = Female\), code F in t\d\."sex_cd" \(F = Female\)\. This name means different things/,
    );
  });

  it("caps the columns one label lists", () => {
    const matches = Array.from({ length: 8 }, (_, index) => {
      return {
        term: "yes",
        datasetId: LINE_LIST.id,
        column: `flag_${index}`,
        storedValue: "Y",
        codeLabel: "Yes",
      };
    });

    const message = buildOfflineQuestionMessage({
      question: "How many said yes?",
      matches,
      datasets: [LINE_LIST],
    });

    expect(message).toContain('t0."flag_4" (Y = Yes), and 3 more columns.');
    expect(message).not.toContain("flag_5");
  });
});

describe("offline prompt", () => {
  it("lists profiled values and flags a name stored in two kinds of column", async () => {
    const host = _createHost();
    const profiles = await profileOfflineDatasets(host, [US, WORLD]);
    const matches = await findQuestionValues(host, {
      datasets: [US, WORLD],
      profiles,
      question: "Cases in Georgia",
    });

    const prompt = buildOfflineDataAgentSystemPrompt({
      datasets: [US, WORLD],
      profiles,
      today: "2026-11-07",
    });
    const message = buildOfflineQuestionMessage({
      question: "Cases in Georgia",
      matches,
      datasets: [US, WORLD],
    });

    expect(prompt).toContain("- date date, 2020-01-01 to 2020-12-31");
    expect(prompt).toContain('- state text, values: "Georgia", "Ohio"');
    expect(message).toContain(
      '"Georgia" is stored in t0."state", t1."country"',
    );
    expect(message).toContain("ask the user which one they mean");
    expect(message).toMatch(/QUESTION\nCases in Georgia$/);
  });

  it("does not flag a value stored in similar columns as ambiguous", () => {
    const message = buildOfflineQuestionMessage({
      question: "Deaths in the US",
      matches: [
        { term: "US", datasetId: US.id, column: "iso2", storedValue: "US" },
        {
          term: "US",
          datasetId: US.id,
          column: "Country_Region",
          storedValue: "US",
        },
        {
          term: "US",
          datasetId: WORLD.id,
          column: "Country/Region",
          storedValue: "US",
        },
      ],
      datasets: [US, WORLD],
    });

    expect(message).not.toContain("ask the user");
  });
});

describe("createOfflineDataAgent", () => {
  const MODELS = { answer: "answer-model", router: "router-model" };

  it("keeps one system prompt across questions so it stays cached", async () => {
    const { llm, requests } = _createLlm([
      '{"action":"run_query","args":{"sql":"SELECT 1 FROM \\"t0\\"","summary":"Ohio."}}',
      '{"action":"reply","text":"Done."}',
      '{"action":"run_query","args":{"sql":"SELECT 2 FROM \\"t0\\"","summary":"Utah."}}',
      '{"action":"reply","text":"Done."}',
    ]);
    const agent = createOfflineDataAgent({
      datasets: [US, WORLD],
      host: _createHost(),
      llm,
      models: MODELS,
      contextWindow: 8192,
      today: "2026-11-07",
    });

    await agent.ask("How many cases in Ohio?");
    await agent.ask("How many cases in Georgia?");

    const firstCall = requests[0]!.messages;
    const laterCall = requests[2]!.messages;
    expect(laterCall.slice(0, firstCall.length)).toEqual(firstCall);
  });

  it("makes a data question run a query, then shows the model its rows", async () => {
    const { llm, requests } = _createLlm([
      '{"action":"run_query","args":{"sql":"SELECT 1 FROM \\"t0\\"","summary":"All cases."}}',
      '{"action":"reply","text":"There were 42 cases."}',
    ]);
    const agent = createOfflineDataAgent({
      datasets: [US, WORLD],
      host: _createHost(),
      llm,
      models: MODELS,
      contextWindow: 8192,
      today: "2026-11-07",
    });

    const reply = await agent.ask("How many cases in Ohio?");

    expect(requests[0]?.modelId).toBe("answer-model");
    expect(JSON.stringify(requests[0]?.jsonSchema)).not.toContain('"reply"');
    expect(JSON.stringify(requests[1]?.jsonSchema)).toContain('"reply"');
    expect(requests[1]?.messages.at(-1)?.content).toContain("cases\n42");
    expect(reply.text).toBe("There were 42 cases.");
  });

  it("asks the router model only when rules cannot tell", async () => {
    const { llm, requests } = _createLlm([
      '{"route":"chat"}',
      '{"action":"reply","text":"It is a virus."}',
    ]);
    const agent = createOfflineDataAgent({
      datasets: [US],
      host: _createHost(),
      llm,
      models: MODELS,
      contextWindow: 8192,
      today: "2026-11-07",
    });

    const reply = await agent.ask("covid in a few words");

    expect(requests[0]?.modelId).toBe("router-model");
    expect(JSON.stringify(requests[1]?.jsonSchema)).toContain('"reply"');
    expect(reply.text).toBe("It is a virus.");
  });

  it("lets a greeting be answered in words without asking the router", async () => {
    const { llm, requests } = _createLlm([
      '{"action":"reply","text":"Hello!"}',
    ]);
    const agent = createOfflineDataAgent({
      datasets: [US],
      host: _createHost(),
      llm,
      models: MODELS,
      contextWindow: 8192,
      today: "2026-11-07",
    });

    const reply = await agent.ask("hi there");

    expect(requests).toHaveLength(1);
    expect(JSON.stringify(requests[0]?.jsonSchema)).toContain('"reply"');
    expect(reply.text).toBe("Hello!");
  });

  it("rejects with the engine's error when the local model fails", async () => {
    const agent = createOfflineDataAgent({
      datasets: [US],
      host: _createHost(),
      llm: {
        complete: async () => {
          throw new Error(
            "Prompt tokens exceed context window size: number of prompt tokens: 9000",
          );
        },
      },
      models: { answer: "answer-model" },
      contextWindow: 8192,
      today: "2026-11-07",
    });

    // The chat turns this message into its "too long" reply.
    await expect(agent.ask("hi there")).rejects.toThrow(/context window/);
  });
});

describe("routeOfflineMessageByRules", () => {
  it.each([
    ["hi there", "chat"],
    ["Thanks!", "chat"],
    ["How do I import a file?", "chat"],
    ["thanks, now show it by week", "data"],
    ["Total covid cases in New York in 2021", "data"],
    ["covid in georgia", undefined],
  ])("routes %j as %s", (message, route) => {
    expect(routeOfflineMessageByRules(message, ["us.csv"])).toBe(route);
  });
});

/**
 * Asks the offline agent one turn and reports the message the router was
 * given, the question the value matcher read, and the text the answer
 * model read as the user's turn.
 */
async function _askOffline(turnText: string): Promise<{
  routerMessage: string | undefined;
  matchedQuestion: string | undefined;
  modelText: string;
}> {
  const { llm, requests } = _createLlm([
    '{"action":"run_query","args":{"sql":"SELECT 1 FROM \\"t0\\"","summary":"Deaths."}}',
    '{"action":"reply","text":"Done."}',
  ]);
  vi.mocked(classifyOfflineMessage).mockClear();
  vi.mocked(findQuestionValues).mockClear();
  const agent = createOfflineDataAgent({
    datasets: [US],
    host: _createHost(),
    llm,
    models: { answer: "answer-model", router: "router-model" },
    contextWindow: 8192,
    today: "2026-11-11",
  });

  await agent.ask(turnText);

  const userMessage = requests[0]?.messages.find((message) => {
    return message.role === "user";
  });
  return {
    routerMessage: vi.mocked(classifyOfflineMessage).mock.calls[0]?.[1].message,
    matchedQuestion: vi.mocked(findQuestionValues).mock.calls[0]?.[1].question,
    modelText: userMessage?.content ?? "",
  };
}

describe("offline dashboard requests", () => {
  it("routes an add-to-dashboard request to data by rules", () => {
    expect(
      routeOfflineMessageByRules("Add a heading to the Budget dashboard", []),
    ).toBe("data");
    expect(routeOfflineMessageByRules("how do I make a dashboard?", [])).toBe(
      "chat",
    );
  });

  it("tells the offline model about blocks and the dashboard tool", () => {
    const prompt = buildOfflineDataAgentSystemPrompt({
      datasets: [],
      profiles: [],
      today: "2026-11-11",
    });
    const planPrompt = buildOfflineDataAgentSystemPrompt({
      datasets: [],
      profiles: [],
      today: "2026-11-11",
      queryStyle: "plan",
    });

    expect(prompt).toContain("add_dashboard_block");
    expect(prompt).toContain("<current_page>");
    expect(planPrompt).toContain("add_dashboard_block");
    expect(planPrompt).toContain("<current_page>");
  });

  it("routes and matches values on the message, keeping the blocks", async () => {
    const asked = await _askOffline(
      "<current_page>Page: Map\nTitle: Ohio cases</current_page>\n\nhow many deaths in total?",
    );

    expect(asked.routerMessage).toBe("how many deaths in total?");
    expect(asked.matchedQuestion).toBe("how many deaths in total?");
    expect(asked.modelText.startsWith("<current_page>")).toBe(true);
    expect(asked.modelText).toContain("how many deaths in total?");
  });
});
