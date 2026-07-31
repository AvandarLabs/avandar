import { ChatSyntaxHighlighter } from "@/components/ChatPanel/ChatThread/ChatSyntaxHighlighter";
import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock/AvaSqlBlock";

const SqlLanguages = new Set(["sql", "duckdb"]);

type Props = Parameters<typeof ChatSyntaxHighlighter>[0];

/** Routes SQL fences to the dataset-aware block or Prism. */
export function ChatSyntaxHighlighterRouter({
  language,
  code,
  ...syntaxHighlighterProps
}: Readonly<Props>): React.ReactNode {
  return SqlLanguages.has(language.toLowerCase()) ?
      <AvaSqlBlock value={code} readOnly />
    : <ChatSyntaxHighlighter
        {...syntaxHighlighterProps}
        language={language}
        code={code}
      />;
}
