import { propEq } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Group,
  Loader,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCheck,
  IconLayoutDashboard,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { formatDashboardDate } from "@/views/DashboardApp/DashboardListView/formatDashboardDate";
import css from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal.module.css";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";

type Props = {
  dashboards: readonly Dashboard.T[];
  isLoading: boolean;
  isSaving: boolean;
  isDisabled: boolean;
  onSwitchToCreate: () => void;
  onCancel: () => void;
  onSelectAndSave: (dashboard: Dashboard.T) => void;
};

/**
 * "Pick a dashboard" portion of `SaveToDashboardModal`.
 *
 * Owns its own search and selection state. The selected dashboard is handed
 * back to the parent via `onSelectAndSave` so the parent can run the actual
 * insert mutation and surface the toast.
 */
export function SaveToDashboardListMode({
  dashboards,
  isLoading,
  isSaving,
  isDisabled,
  onSwitchToCreate,
  onCancel,
  onSelectAndSave,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDashboardId, setSelectedDashboardId] =
    useState<DashboardId | null>(null);

  const filteredDashboards = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed.length === 0) {
      return dashboards;
    }
    return dashboards.filter((dashboard) => {
      return dashboard.name.toLowerCase().includes(trimmed);
    });
  }, [dashboards, searchQuery]);

  const onSave = () => {
    if (!selectedDashboardId) {
      return;
    }
    const targetDashboard = dashboards.find(propEq("id", selectedDashboardId));
    if (!targetDashboard) {
      return;
    }
    onSelectAndSave(targetDashboard);
  };

  return (
    <>
      <TextInput
        placeholder={t`Search dashboards`}
        leftSection={<IconSearch size={16} />}
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.currentTarget.value);
        }}
        aria-label={t`Search dashboards`}
      />

      {isLoading ? (
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      ) : filteredDashboards.length === 0 ? (
        <Text size="sm" c="dimmed" className={css.emptyFilter}>
          <Trans>No dashboards match &ldquo;{searchQuery}&rdquo;.</Trans>
        </Text>
      ) : (
        <div role="listbox" aria-label={t`Dashboards`} className={css.list}>
          {filteredDashboards.map((dashboard) => {
            const isSelected = dashboard.id === selectedDashboardId;
            return (
              <UnstyledButton
                key={dashboard.id}
                role="option"
                aria-selected={isSelected}
                className={clsx(
                  css.row,
                  isSelected ? css.rowSelected : undefined,
                )}
                onClick={() => {
                  setSelectedDashboardId(dashboard.id);
                }}
              >
                <IconLayoutDashboard
                  size={18}
                  stroke={1.5}
                  className={css.rowIcon}
                />
                <Text size="sm" className={css.rowName}>
                  {dashboard.name}
                </Text>
                <Text className={css.rowMeta}>
                  <Trans>
                    Updated {formatDashboardDate(dashboard.updatedAt, i18n)}
                  </Trans>
                </Text>
                {isSelected ? (
                  <IconCheck size={16} stroke={2} className={css.rowCheck} />
                ) : null}
              </UnstyledButton>
            );
          })}
        </div>
      )}

      <Group justify="space-between" mt="xs">
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconPlus size={16} />}
          onClick={onSwitchToCreate}
        >
          <Trans>Create new dashboard</Trans>
        </Button>
        <Group gap="sm">
          <Button variant="subtle" color="neutral" onClick={onCancel}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            onClick={onSave}
            disabled={!selectedDashboardId || isDisabled}
            loading={isSaving}
          >
            <Trans>Save to dashboard</Trans>
          </Button>
        </Group>
      </Group>
    </>
  );
}
