import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import clsx from "clsx";
import remarkGfm from "remark-gfm";
import { MarkdownCodeHeader } from "@/components/ChatPanel/ChatThread/MarkdownCodeHeader/MarkdownCodeHeader";
import { ChatSyntaxHighlighterRouter } from "./ChatSyntaxHighlighterRouter";
import css from "./MarkdownTextPart.module.css";

export { ChatSyntaxHighlighterRouter } from "./ChatSyntaxHighlighterRouter";

const markdownComponents = memoizeMarkdownComponents({
  SyntaxHighlighter: ChatSyntaxHighlighterRouter,
  CodeHeader: MarkdownCodeHeader,
  pre: ({ className, ...props }) => {
    return (
      <pre
        {...props}
        className={clsx(css.markdownTextPartCodeBlockPre, className)}
      />
    );
  },
  code: ({ className, ...props }) => {
    return (
      <code
        {...props}
        className={clsx(css.markdownTextPartCodeBlockCode, className)}
      />
    );
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
      className={css.markdownTextPartMarkdown}
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    />
  );
}
