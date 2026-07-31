import { makePrismAsyncLightSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter";
import { PrismAsyncLight } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import { Theme } from "@/config/Theme";

function _registerChatPrismLanguages(): void {
  PrismAsyncLight.registerLanguage("bash", bash);
  PrismAsyncLight.registerLanguage("sh", bash);
  PrismAsyncLight.registerLanguage("shell", bash);
  PrismAsyncLight.registerLanguage("json", json);
  PrismAsyncLight.registerLanguage("python", python);
  PrismAsyncLight.registerLanguage("py", python);
  PrismAsyncLight.registerLanguage("sql", sql);
  PrismAsyncLight.registerLanguage("duckdb", sql);

  (["javascript", "js", "jsx", "typescript", "ts", "tsx"] as const).forEach(
    (alias) => {
      return PrismAsyncLight.registerLanguage(alias, tsx);
    },
  );
}

_registerChatPrismLanguages();

/** VS Code dark+ palette for fenced code in assistant markdown. */
export const ChatSyntaxHighlighter = makePrismAsyncLightSyntaxHighlighter({
  style: vscDarkPlus,
  customStyle: {
    background: Theme.colors.neutral[8],
    borderBottomLeftRadius: "var(--mantine-radius-sm)",
    borderBottomRightRadius: "var(--mantine-radius-sm)",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    fontSize: "0.8125rem",
    lineHeight: 1.5,
    margin: 0,
    padding: "10px 12px",
  },
  codeTagProps: {
    style: {
      background: "transparent",
      display: "block",
      fontFamily: "inherit",
      lineHeight: "inherit",
      margin: 0,
      padding: 0,
      whiteSpace: "pre",
    },
  },
  wrapLongLines: false,
});
