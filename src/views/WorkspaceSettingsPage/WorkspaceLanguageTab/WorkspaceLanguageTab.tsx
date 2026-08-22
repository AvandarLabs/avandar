import type { SupportedLocale } from "@/i18n/locales";

import { Trans } from "@lingui/react/macro";
import { Card, Group, Radio, Stack, Text, Title } from "@mantine/core";

import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  isSupportedLocale,
  LOCALE_META,
  SUPPORTED_LOCALES,
} from "@/i18n/locales";
import { useWorkspaceLanguage } from "@/i18n/useLanguagePreference";

/**
 * Workspace-scoped language picker. The selection is persisted per workspace
 * in `localStorage` and applied immediately via the surrounding
 * `WorkspaceI18nProvider`.
 */
export function WorkspaceLanguageTab(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const { locale, setLocale } = useWorkspaceLanguage(workspace.id);

  return (
    <Stack gap="lg">
      <div>
        <Title order={4}>
          <Trans>Language</Trans>
        </Title>
        <Text c="dimmed" mt={4}>
          <Trans>
            Choose the language used across this workspace. Right-to-left
            languages flip the layout automatically.
          </Trans>
        </Text>
      </div>

      <Card withBorder padding="md">
        <Radio.Group
          name="workspace-language"
          value={locale}
          onChange={(value) => {
            if (isSupportedLocale(value)) {
              setLocale(value as SupportedLocale);
            }
          }}
        >
          <Stack gap="sm">
            {SUPPORTED_LOCALES.map((code) => {
              const meta = LOCALE_META[code];
              return (
                <Radio
                  key={code}
                  value={code}
                  label={
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={500}>{meta.label}</Text>
                      <Text c="dimmed" size="sm">
                        ({meta.englishName})
                      </Text>
                      {meta.direction === "rtl" ? (
                        <Text c="dimmed" size="xs">
                          RTL
                        </Text>
                      ) : null}
                    </Group>
                  }
                />
              );
            })}
          </Stack>
        </Radio.Group>
      </Card>
    </Stack>
  );
}
