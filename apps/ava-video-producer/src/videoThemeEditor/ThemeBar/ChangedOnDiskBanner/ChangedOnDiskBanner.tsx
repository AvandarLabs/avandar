import { Alert, Button, type ButtonProps } from "@mantine/core";
import css from "./ChangedOnDiskBanner.module.css";
import { Choice } from "./Choice/Choice";
import type { ReactNode } from "react";

type Props = Readonly<{
  onKeep: () => void;
  onDiscard: () => void;
  onReload: () => void;
}>;

type ChoiceSpec = Readonly<{
  label: string;
  variant: ButtonProps["variant"];
  note: string;
  onClick: () => void;
}>;

function _buildChoices({
  onKeep,
  onDiscard,
  onReload,
}: Props): readonly ChoiceSpec[] {
  return [
    {
      label: "Keep my edits",
      variant: undefined,
      note: "Apply them on top of the new file.",
      onClick: onKeep,
    },
    {
      label: "Discard my edits",
      variant: "default",
      note: "Throw them away and use the new file.",
      onClick: onDiscard,
    },
    {
      label: "Reload from file",
      variant: "default",
      note: "Read the file again in case it changed once more. Your edits stay.",
      onClick: onReload,
    },
  ];
}

/**
 * Shown when the theme file changed after the viewer's unsaved edits were
 * made. Each of the three choices says in a line what it does to the edits:
 * keep them on top of the new file, discard them, or read the file again in
 * case it changed once more. Saving waits until one is chosen.
 */
export function ChangedOnDiskBanner({
  onKeep,
  onDiscard,
  onReload,
}: Props): ReactNode {
  const choices = _buildChoices({ onKeep, onDiscard, onReload });
  return (
    <Alert
      variant="light"
      color="yellow"
      title="This theme changed on disk"
      classNames={{
        title: css.bannerTitle,
        message: css.bannerMessage,
      }}
    >
      <p className={css.bannerText}>
        {
          "The theme file changed after you started editing. Choose what happens to your unsaved edits. Saving waits until you do."
        }
      </p>
      <ul className={css.bannerChoices}>
        {choices.map((choice) => {
          return (
            <Choice
              key={choice.label}
              action={
                <Button
                  size="compact-xs"
                  variant={choice.variant}
                  onClick={choice.onClick}
                >
                  {choice.label}
                </Button>
              }
              note={choice.note}
            />
          );
        })}
      </ul>
    </Alert>
  );
}
