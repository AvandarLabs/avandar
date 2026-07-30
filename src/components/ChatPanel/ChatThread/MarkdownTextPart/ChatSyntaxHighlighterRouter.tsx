import { ChatSyntaxHighlighter } from "@/components/ChatPanel/ChatThread/ChatSyntaxHighlighter";
import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock/AvaSqlBlock";

const SQL_LANGUAGES = new Set(["sql", "duckdb"]);

type Props = Parameters<typeof ChatSyntaxHighlighter>[0];

/** Routes SQL fences to the dataset-aware block or Prism. */
export function ChatSyntaxHighlighterRouter(props: Props): React.ReactNode {
  if (SQL_LANGUAGES.has(props.language.toLowerCase())) {
    return <AvaSqlBlock value={props.code} readOnly />;
  }
  return <ChatSyntaxHighlighter {...props} />;
}
