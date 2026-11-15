import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Menu, Stack, Textarea } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { validateCombineExpression } from "@/lib/crosswalks/validateCombineExpression/validateCombineExpression";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/MappingPane.module.css";
import type { CombineExpressionCheck } from "@/lib/crosswalks/validateCombineExpression/validateCombineExpression";
import type { ReactNode } from "react";

type Props = {
  sql: string;
  /** The layout's columns, the only ones a formula may name. */
  columnNames: readonly string[];
  /** Called with every non-blank text. */
  onChange: (sql: string) => void;
};

/** The text with `token` replacing the textarea's selection, or at its end. */
function _insertAtSelection(
  text: string,
  textarea: HTMLTextAreaElement | null,
  token: string,
): string {
  const start = textarea?.selectionStart ?? text.length;
  const end = textarea?.selectionEnd ?? start;
  return `${text.slice(0, start)}${token}${text.slice(end)}`;
}

function useCombineError(check: CombineExpressionCheck): string | undefined {
  const { t } = useLingui();
  if (check.isValid) {
    return undefined;
  }
  const columnName = check.columnName ?? "";
  switch (check.reason) {
    case "empty":
      return t`Write a formula, or choose another way to fill this column.`;
    case "unknown_column":
      return t`${columnName} isn't a column of this dataset.`;
    case "invalid_sql":
      return t`This isn't a single SQL expression. Check its brackets, quotes, and commas.`;
  }
}

function InsertColumnMenu(
  props: Readonly<{
    columnNames: readonly string[];
    onInsert: (name: string) => void;
  }>,
): ReactNode {
  return (
    <Menu position="bottom-start" shadow="md">
      <Menu.Target>
        <Button
          variant="default"
          size="compact-xs"
          leftSection={<IconPlus size={12} aria-hidden />}
        >
          <Trans>Insert column</Trans>
        </Button>
      </Menu.Target>
      <Menu.Dropdown className={css.insertColumnList}>
        {props.columnNames.map((name) => {
          return (
            <Menu.Item
              key={name}
              onClick={() => {
                props.onInsert(name);
              }}
            >
              {name}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}

/**
 * A Combine formula: one SQL expression over this layout's columns, named
 * in braces. It is checked as it is typed, and Insert column puts a
 * column's placeholder where the cursor is. Blank text is never sent, since
 * a Combine fill cannot be saved blank.
 */
export function CombineInput(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(props.sql);
  const error = useCombineError(
    validateCombineExpression({ sql: text, columnNames: props.columnNames }),
  );
  const exampleFormula = "{first_name}";
  const update = (nextText: string): void => {
    setText(nextText);
    if (nextText.trim() !== "") {
      props.onChange(nextText);
    }
  };
  return (
    <Stack gap={6} align="flex-start">
      <Textarea
        ref={textareaRef}
        w="100%"
        size="xs"
        autosize
        minRows={2}
        label={t`Formula`}
        description={t`One SQL expression. Put column names in braces, such as ${exampleFormula}.`}
        value={text}
        error={error}
        onChange={(event) => {
          update(event.currentTarget.value);
        }}
      />
      <InsertColumnMenu
        columnNames={props.columnNames}
        onInsert={(name) => {
          update(_insertAtSelection(text, textareaRef.current, `{${name}}`));
        }}
      />
    </Stack>
  );
}
