import { Button, Group, TextInput } from "@mantine/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getThemeLabelFromInput } from "../themeBarHelpers/themeBarHelpers";
import css from "./SaveAsNewForm.module.css";

type Props = Readonly<{
  onSubmit: (label: string) => Promise<void>;
  onCancel: () => void;
}>;

/** The name form for saving the draft as a new theme. Escape cancels it. */
export function SaveAsNewForm({ onSubmit, onCancel }: Props): ReactNode {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const label = getThemeLabelFromInput(input);
  useEffect(() => {
    return inputRef.current?.focus();
  }, []);
  return (
    <form
      className={css.saveAsNewForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (label) {
          void onSubmit(label);
        }
      }}
    >
      <TextInput
        ref={inputRef}
        size="xs"
        label="New theme name"
        value={input}
        onChange={(event) => {
          return setInput(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
          }
        }}
      />
      <Group gap="xs">
        <Button size="compact-xs" type="submit" disabled={!label}>
          {"Create theme"}
        </Button>
        <Button size="compact-xs" variant="subtle" onClick={onCancel}>
          {"Cancel"}
        </Button>
      </Group>
    </form>
  );
}
