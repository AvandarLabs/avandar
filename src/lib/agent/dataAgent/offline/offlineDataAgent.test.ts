import { describe, expect, it, vi } from "vitest";
import {
  buildOfflineDataAgentSystemPrompt,
  buildOfflineQuestionMessage,
} from "@/lib/agent/dataAgent/offline/buildOfflineDataAgentSystemPrompt/buildOfflineDataAgentSystemPrompt";
import { routeOfflineMessageByRules } from "@/lib/agent/dataAgent/offline/classifyOfflineMessage/classifyOfflineMessage";
import { createOfflineDataAgent } from "@/lib/agent/dataAgent/offline/createOfflineDataAgent/createOfflineDataAgent";
import {
  extractQuestionTerms,
  findQuestionValues,
} from "@/lib/agent/dataAgent/offline/findQuestionValues/findQuestionValues";
import { profileOfflineDatasets } from "@/lib/agent/dataAgent/offline/profileOfflineDatasets/profileOfflineDatasets";
import type { DataAgentHost } from "@/lib/agent/dataAgent/DataAgentHost";
import type {
  LocalLlm,
  LocalLlmRequest,
} from "@/lib/agent/localModels/LocalLlm";

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
