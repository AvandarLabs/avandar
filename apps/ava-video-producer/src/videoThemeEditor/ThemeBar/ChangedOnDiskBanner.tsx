import { useLingui } from "@lingui/react/macro";
import { Alert, Button, Group } from "@mantine/core";
import css from "./ThemeBar.module.css";

/**
 * Shown when the theme file changed after the viewer's unsaved edits were
 * made: keep the edits on top of the new file, discard them, or read the
 * file again in case it changed once more.
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
    <Alert variant="light" color="yellow" title={t`This theme changed on disk`}>
      <p className={css.bannerText}>
        {t`Your unsaved edits were made against an older version. Keep them on top of the new version, discard them, or reload the theme to read the file again and keep your edits.`}
      </p>
      <Group gap="xs">
        <Button size="compact-xs" onClick={onKeep}>{t`Keep my edits`}</Button>
        <Button size="compact-xs" variant="subtle" onClick={onDiscard}>
          {t`Discard my edits`}
        </Button>
        <Button size="compact-xs" variant="subtle" onClick={onReload}>
          {t`Reload theme`}
        </Button>
      </Group>
    </Alert>
  );
}
