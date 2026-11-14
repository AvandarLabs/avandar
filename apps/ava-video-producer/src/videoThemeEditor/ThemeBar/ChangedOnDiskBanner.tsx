import { useLingui } from "@lingui/react/macro";
import { Alert, Button, Group } from "@mantine/core";
import css from "./ThemeBar.module.css";

/**
 * Shown when the theme file changed after the viewer's unsaved edits were
 * made: keep the edits on top of the new file, or discard them.
 */
export function ChangedOnDiskBanner({
  onKeep,
  onDiscard,
}: Readonly<{ onKeep: () => void; onDiscard: () => void }>) {
  const { t } = useLingui();
  return (
    <Alert variant="light" color="yellow" title={t`This theme changed on disk`}>
      <p className={css.bannerText}>
        {t`Your unsaved edits were made against an older version. Keep them on top of the new version, or discard them.`}
      </p>
      <Group gap="xs">
        <Button size="compact-xs" onClick={onKeep}>{t`Keep my edits`}</Button>
        <Button size="compact-xs" variant="subtle" onClick={onDiscard}>
          {t`Discard my edits`}
        </Button>
      </Group>
    </Alert>
  );
}
