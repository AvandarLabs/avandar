import { propEq } from "@avandar/utils";
import { buildDataExplorerToolDefinitions } from "@sbfn/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.ts";
import { describe, expect, it } from "vitest";

describe("buildDataExplorerToolDefinitions", () => {
  it("offers SQL generation and clarification", () => {
    expect(
      buildDataExplorerToolDefinitions().map((tool) => {
        return tool.function.name;
      }),
    ).toEqual(["generateSql", "clarify"]);
  });

  it("stops offering clarification after the turn cap", () => {
    expect(
      buildDataExplorerToolDefinitions(true).map((tool) => {
        return tool.function.name;
      }),
    ).toEqual(["generateSql"]);
  });

  it("requires bounded prompt-derived candidates for discovery", () => {
    const clarifyTool = buildDataExplorerToolDefinitions().find(
      propEq("function.name", "clarify"),
    );
    const parameters = clarifyTool?.function.parameters as {
      properties: {
        responseShape: {
          oneOf: Array<{
            properties: Record<string, unknown> & {
              kind: { const: string };
            };
            required: string[];
          }>;
        };
      };
    };
    const discoveryShape = parameters.properties.responseShape.oneOf.find(
      propEq("properties.kind.const", "discovery"),
    );

    expect(discoveryShape).toMatchObject({
      properties: {
        candidateValues: {
          type: "array",
          maxItems: 8,
          items: { type: "string", maxLength: 80 },
        },
      },
      required: expect.arrayContaining(["candidateValues"]),
    });
  });
});
