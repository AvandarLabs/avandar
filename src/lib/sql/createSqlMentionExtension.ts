import { autocompletion } from "@codemirror/autocomplete";
import { getSqlMentionOptions } from "@/lib/sql/getSqlMentionOptions";
import type { Completion } from "@codemirror/autocomplete";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types";

/**
 * `@` mention autocomplete for datasets and columns in SQL.
 */
export function createSqlMentionExtension(
  getCatalog: () => SqlDisplayCatalog,
): ReturnType<typeof autocompletion> {
  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/@([\w\s.]*)$/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }
        const query = word.text.slice(1);
        const from = word.from + 1;
        const options = getSqlMentionOptions(getCatalog(), query).map(
          (option): Completion => {
            return {
              label: option.label,
              type: option.kind,
              apply: option.insertText,
            };
          },
        );
        if (options.length === 0) {
          return null;
        }
        return { from, options };
      },
    ],
  });
}
