import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { DangerText } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import type {
  PluginLocaleMessages,
  PluginVizSetting,
} from "@avandar/plugin-manifest/runtime";

type Props = {
  /** The required settings that have no value. */
  settings: readonly PluginVizSetting[];

  /** The plugin's manifest strings, which hold the settings' labels. */
  strings: PluginLocaleMessages;
};

/**
 * What a plugin chart shows instead of drawing while required settings are
 * unset: one line per setting, such as "You haven't chosen: Date column", in
 * the same danger text built-in charts use for a missing axis or series.
 * `PluginVizConfiguredChart` renders it.
 */
export function PluginVizMissingSettings({
  settings,
  strings,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  return (
    <Stack h="100%" w="100%" justify="center" align="center" gap="xs">
      {settings.map((setting) => {
        const settingLabel = getLocalizedTextFromManifestStrings({
          strings,
          locale: i18n.locale,
          value: setting.label,
        });
        return (
          <DangerText
            key={setting.key}
          >{t`You haven't chosen: ${settingLabel}`}</DangerText>
        );
      })}
    </Stack>
  );
}
