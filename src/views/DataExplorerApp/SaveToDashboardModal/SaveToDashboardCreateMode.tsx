import { Trans, useLingui } from "@lingui/react/macro";
import {
  Anchor,
  Button,
  Group,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { IconArrowLeft, IconLayoutDashboard } from "@tabler/icons-react";
import { useState } from "react";
import css from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.module.css";

type Props = {
  defaultName: string;
  isCreating: boolean;
  isDisabled: boolean;
  showEmptyStateBanner: boolean;
  onBack: (() => void) | undefined;
  onCancel: () => void;
  onSubmit: (name: string) => void;
};

/**
 * "Create a new dashboard" portion of `SaveToDashboardModal`.
 *
 * Owns its own name input state. The submit handler hands the trimmed name
 * back to the parent so the parent can run the insert mutation. The optional
 * `onBack` callback is rendered as a "Back to dashboards" link when the
 * parent supplies it (i.e. the user entered create mode from list mode).
 */
export function SaveToDashboardCreateMode({
  defaultName,
  isCreating,
  isDisabled,
  showEmptyStateBanner,
  onBack,
  onCancel,
  onSubmit,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [name, setName] = useState(defaultName);

  const onCreate = () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return;
    }
    onSubmit(trimmedName);
  };

  return (
    <>
      {showEmptyStateBanner ?
        <div className={css.createBanner}>
          <ThemeIcon size={48} radius="xl" variant="light">
            <IconLayoutDashboard size={26} stroke={1.5} />
          </ThemeIcon>
          <Text size="sm" c="dimmed">
            <Trans>You don&apos;t have any dashboards yet.</Trans>
          </Text>
        </div>
      : null}

      <TextInput
        label={t`Dashboard name`}
        placeholder={defaultName}
        value={name}
        onChange={(event) => {
          setName(event.currentTarget.value);
        }}
        data-autofocus
        autoFocus
        onFocus={(event) => {
          event.currentTarget.select();
        }}
      />

      <Group justify="space-between" mt="xs">
        {onBack ?
          <Anchor component="button" type="button" size="sm" onClick={onBack}>
            <Group gap={4} wrap="nowrap">
              <IconArrowLeft size={14} />
              <span>
                <Trans>Back to dashboards</Trans>
              </span>
            </Group>
          </Anchor>
        : <span />}
        <Group gap="sm">
          <Button variant="subtle" color="neutral" onClick={onCancel}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            onClick={onCreate}
            disabled={name.trim().length === 0 || isDisabled}
            loading={isCreating}
          >
            <Trans>Create dashboard &amp; save</Trans>
          </Button>
        </Group>
      </Group>
    </>
  );
}
