import { useLingui } from "@lingui/react/macro";
import { Alert, Button } from "@mantine/core";
import css from "./ThemeBar.module.css";
import type { ReactNode } from "react";

function _Choice({
  action,
  note,
}: Readonly<{ action: ReactNode; note: string }>) {
  return (
    <li className={css.bannerChoice}>
      {action}
      <span className={css.bannerChoiceNote}>{note}</span>
    </li>
  );
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
}: Readonly<{
  onKeep: () => void;
  onDiscard: () => void;
  onReload: () => void;
}>) {
  const { t } = useLingui();
  return (
    <Alert
      variant="light"
      color="yellow"
      title={t`This theme changed on disk`}
      classNames={{
        title: css.bannerTitle,
        message: css.bannerMessage,
      }}
    >
      <p className={css.bannerText}>
        {t`The theme file changed after you started editing. Choose what happens to your unsaved edits. Saving waits until you do.`}
      </p>
      <ul className={css.bannerChoices}>
        <_Choice
          action={
            <Button size="compact-xs" onClick={onKeep}>
              {t`Keep my edits`}
            </Button>
          }
          note={t`Apply them on top of the new file.`}
        />
        <_Choice
          action={
            <Button size="compact-xs" variant="default" onClick={onDiscard}>
              {t`Discard my edits`}
            </Button>
          }
          note={t`Throw them away and use the new file.`}
        />
        <_Choice
          action={
            <Button size="compact-xs" variant="default" onClick={onReload}>
              {t`Reload from file`}
            </Button>
          }
          note={t`Read the file again in case it changed once more. Your edits stay.`}
        />
      </ul>
    </Alert>
  );
}
