import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import clsx from "clsx";
import remarkGfm from "remark-gfm";
import { ChatSyntaxHighlighter } from "@/components/ChatPanel/ChatThread/chatSyntaxHighlighter";
import { MarkdownCodeHeader } from "@/components/ChatPanel/ChatThread/MarkdownCodeHeader/MarkdownCodeHeader";
import { AvaSqlBlock } from "@/components/sql/AvaSqlBlock/AvaSqlBlock";
import css from "./MarkdownTextPart.module.css";

const SQL_LANGUAGES = new Set(["sql", "duckdb"]);

type Props = Parameters<typeof ChatSyntaxHighlighter>[0];

/**
 * Routes fenced code blocks to {@link AvaSqlBlock} when the language is SQL
 * (so dataset/column pills appear inline), and falls back to the Prism-based
 * {@link ChatSyntaxHighlighter} for every other language.
 */
export function ChatSyntaxHighlighterRouter(props: Props): React.ReactNode {
  if (SQL_LANGUAGES.has(props.language.toLowerCase())) {
    return <AvaSqlBlock value={props.code} readOnly />;
  }
  return <ChatSyntaxHighlighter {...props} />;
}

const markdownComponents = memoizeMarkdownComponents({
  SyntaxHighlighter: ChatSyntaxHighlighterRouter,
  CodeHeader: MarkdownCodeHeader,
  pre: ({ className, ...props }) => {
    return <pre {...props} className={clsx(css.codeBlockPre, className)} />;
  },
  code: ({ className, ...props }) => {
    return <code {...props} className={clsx(css.codeBlockCode, className)} />;
  },
});

/**
 * Renders assistant text parts as GitHub-flavored markdown (headings, lists,
 * links, fenced code blocks with syntax highlighting). Must be used inside
 * `MessagePrimitive.Parts`.
 */
export function MarkdownTextPart(): React.ReactNode {
  return (
    <MarkdownTextPrimitive
      className={css.messageMarkdown}
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    />
  );
}
