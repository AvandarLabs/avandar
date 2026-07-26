import { describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { render, screen } from "@/test-utils";
import { ChatSyntaxHighlighterRouter } from "./MarkdownTextPart";

vi.mock("@/components/sql/sql-helpers/useSqlDisplayCatalog", () => {
  return {
    useSqlDisplayCatalog: () => {
      return { catalog: { datasets: [] }, isReady: true };
    },
  };
});

vi.mock("@/components/ChatPanel/ChatThread/chatSyntaxHighlighter", () => {
  return {
    ChatSyntaxHighlighter: ({
      language,
      code,
    }: {
      language: string;
      code: string;
    }) => {
      return (
        <div data-testid="prism-fallback" data-lang={language}>
          {code}
        </div>
      );
    },
  };
});

const noopComponents = {
  Pre: ((props: { children?: React.ReactNode }) => {
    return <pre>{props.children}</pre>;
  }) as never,
  Code: ((props: { children?: React.ReactNode }) => {
    return <code>{props.children}</code>;
  }) as never,
};

describe("ChatSyntaxHighlighterRouter", () => {
  it("renders SQL code via AvaSqlBlock (no Prism fallback)", () => {
    render(
      <AvandarUiProvider>
        <ChatSyntaxHighlighterRouter
          language="sql"
          code={`SELECT 1`}
          components={noopComponents}
        />
      </AvandarUiProvider>,
    );
    expect(screen.queryByTestId("prism-fallback")).toBeNull();
    expect(screen.getByText("SELECT 1")).toBeInTheDocument();
  });

  it("renders duckdb fences via AvaSqlBlock", () => {
    render(
      <AvandarUiProvider>
        <ChatSyntaxHighlighterRouter
          language="duckdb"
          code={`SELECT 2`}
          components={noopComponents}
        />
      </AvandarUiProvider>,
    );
    expect(screen.queryByTestId("prism-fallback")).toBeNull();
    expect(screen.getByText("SELECT 2")).toBeInTheDocument();
  });

  it("falls back to Prism for non-SQL languages", () => {
    render(
      <AvandarUiProvider>
        <ChatSyntaxHighlighterRouter
          language="python"
          code={`print('hi')`}
          components={noopComponents}
        />
      </AvandarUiProvider>,
    );
    const fallback = screen.getByTestId("prism-fallback");
    expect(fallback).toBeInTheDocument();
    expect(fallback.getAttribute("data-lang")).toBe("python");
  });
});
