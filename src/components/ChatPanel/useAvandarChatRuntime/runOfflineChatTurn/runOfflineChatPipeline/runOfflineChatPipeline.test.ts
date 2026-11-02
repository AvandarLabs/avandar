import { describe, expect, it } from "vitest";
import { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import { runOfflineChatPipeline } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/runOfflineChatPipeline/runOfflineChatPipeline";
import { createMockOfflineChatEngine } from "@/stores/OfflineChatEngineStore/createOfflineChatEngine/createMockOfflineChatEngine";

const SCHEMA = {
  datasets: [{ id: "ds-1", name: "Sales" }],
  columns: [{ dataset_id: "ds-1", name: "amount", data_type: "number" }],
} as const;

const COPY = {
  replying: "Respondiendo…",
  understandingQuestion: "Analizando tu pregunta…",
  writingQuery: "Escribiendo consulta…",
  generatingSql: "Generando SQL…",
  repairingQuery: "Reparando consulta…",
  fixingQuery: "Corrigiendo consulta…",
  noSql: "No se pudo generar SQL sin conexión.",
  metadataQuery: "Esta es una consulta basada en los metadatos.",
} as const;

describe("runOfflineChatPipeline", () => {
  it("runs analyze then SQL and rewrites table aliases", async () => {
    const engine = createMockOfflineChatEngine([
      {
        match: "offline assistant",
        response: '{"summary":"Count sales","proceed":true,"tableName":"t0"}',
      },
      {
        match: "DuckDB SQL generator",
        response: 'Counting rows.\n```sql\nSELECT COUNT(*) FROM "t0"\n```',
      },
    ]);

    const result = await runOfflineChatPipeline({
      engine,
      schema: SCHEMA,
      pageContext: ChatPageContext.createDataExplorerViewContext({
        openDatasetId: "ds-1",
      }),
      messages: [{ role: "user", content: "How many rows?" }],
      lastUserPrompt: "How many rows?",
      copy: COPY,
    });

    expect(result.generatedSql?.sql).toContain('FROM "ds-1"');
    expect(result.generatedSql?.sql).not.toContain('"t0"');
  });

  it("runs analyze then SQL and returns generatedSql", async () => {
    const engine = createMockOfflineChatEngine([
      {
        match: "offline assistant",
        response: '{"summary":"Count sales","proceed":true}',
      },
      {
        match: "DuckDB SQL generator",
        response: 'Counting rows.\n```sql\nSELECT COUNT(*) FROM "ds-1"\n```',
      },
    ]);

    const result = await runOfflineChatPipeline({
      engine,
      schema: SCHEMA,
      pageContext: ChatPageContext.createDataExplorerViewContext({
        openDatasetId: "ds-1",
      }),
      messages: [{ role: "user", content: "How many rows?" }],
      lastUserPrompt: "How many rows?",
      copy: COPY,
    });

    expect(result.generatedSql?.sql).toContain("SELECT COUNT");
    expect(result.assistantText).toBe("");
    expect(result.phaseLabels).toContain("Reparando consulta…");
    expect(result.clarification).toBeUndefined();
  });

  it("returns clarification when analyze does not proceed", async () => {
    const engine = createMockOfflineChatEngine([
      {
        match: "offline assistant",
        response:
          '{"summary":"Ambiguous","proceed":false,"clarifyQuestion":"Which year?","clarifyOptions":["2023","2024"]}',
      },
    ]);

    const result = await runOfflineChatPipeline({
      engine,
      schema: SCHEMA,
      pageContext: ChatPageContext.createDataExplorerViewContext(),
      messages: [{ role: "user", content: "Trends this year" }],
      lastUserPrompt: "Trends this year",
      copy: COPY,
    });

    expect(result.clarification?.question).toBe("Which year?");
    expect(result.generatedSql).toBeUndefined();
  });
});
