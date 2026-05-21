import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from "@assistant-ui/react-markdown";
import clsx from "clsx";
import remarkGfm from "remark-gfm";
import { ChatSyntaxHighlighter } from "@/components/ChatPanel/ChatThread/chatSyntaxHighlighter";
import { MarkdownCodeHeader } from "@/components/ChatPanel/ChatThread/MarkdownCodeHeader/MarkdownCodeHeader";
import css from "../ChatThread.module.css";

const markdownComponents = memoizeMarkdownComponents({
  SyntaxHighlighter: ChatSyntaxHighlighter,
  CodeHeader: MarkdownCodeHeader,
  pre: ({ className, ...props }) => {return (
    <pre {...props} className={clsx(css.codeBlockPre, className)} />
  )},
  code: ({ className, ...props }) => {return (
    <code {...props} className={clsx(css.codeBlockCode, className)} />
  )},
});

/**
 * Renders assistant text parts as GitHub-flavored markdown (headings, lists,
 * links, fenced code blocks with syntax highlighting). Must be used inside
 * `MessagePrimitive.Parts`.
 */
export function MarkdownTextPart(): JSX.Element {
  return (
    <MarkdownTextPrimitive
      className={css.messageMarkdown}
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    />
  );
}
