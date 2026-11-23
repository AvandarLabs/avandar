import { CodeWindow } from "../CodeWindow";
import { CodeFooter } from "./CodeFooter";
import { CodeHighlight } from "./CodeHighlight";
import { CodeLineRow } from "./CodeLineRow";
import { getKeyedCodeLinesFromLines } from "./getKeyedCodeLinesFromLines";
import type { FocusedCodeWindowData } from "./CodeFocus.types";
import type { ReactNode } from "react";

type Props = FocusedCodeWindowData;

/** Renders the focused code window layer for CodeFocus. */
export function FocusedCodeWindow(options: Readonly<Props>): ReactNode {
  return (
    <CodeWindow title={options.input.title}>
      {options.input.showHighlight ? (
        <CodeHighlight line={options.line} accent={options.accent} />
      ) : null}
      {getKeyedCodeLinesFromLines(options.input.lines).map(
        ({ key, codeTokens, lineNumber }) => {
          return (
            <CodeLineRow
              key={key}
              codeTokens={codeTokens}
              index={lineNumber}
              accent={options.accent}
            />
          );
        },
      )}
      <CodeFooter footer={options.input.footer} accent={options.accent} />
    </CodeWindow>
  );
}
