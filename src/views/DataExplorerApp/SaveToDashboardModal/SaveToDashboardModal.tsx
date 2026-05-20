import { Trans, useLingui } from "@lingui/react/macro";
import { Anchor, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Model } from "@models";
import { useNavigate } from "@tanstack/react-router";
import { notifyError } from "@ui";
import { DashboardConfigs } from "$/models/Dashboard/DashboardConfig/DashboardConfigs";
import { useMemo, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { createDataVizBlock } from "@/views/DataExplorerApp/SaveToDashboardModal/createDataVizBlock";
import { SaveToDashboardCreateMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardCreateMode";
import { SaveToDashboardListMode } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardListMode";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardId } from "$/models/Dashboard/Dashboard.types";
import type {
  VizConfig,
  VizType,
} from "$/models/vizs/VizConfig/VizConfig.types";

type Props = {
  rawSQL: string;
  prompt: string | undefined;
  vizType: VizType;
  vizConfig: VizConfig;
  workspaceSlug: string;
  onClose: () => void;
};

type Mode = "list" | "create";

/**
 * Modal that saves the Data Explorer's current visualization to a dashboard.
 *
 * When the user already has dashboards, the modal opens in `"list"` mode so
 * they can pick a target; when they have none (or click "Create new"), it
 * switches to `"create"` mode so they can name and create one inline. In
 * both cases the resulting dashboard ends with a freshly built `DataViz`
 * block whose props mirror the explorer's `rawSQL`, prompt, and viz config.
 *
 * Each mode's UI lives in its own sub-component
 * (`SaveToDashboardListMode`, `SaveToDashboardCreateMode`); this component
 * owns the mode state, the dashboards query, and the mutations.
 */
export function SaveToDashboardModal({
  rawSQL,
  prompt,
  vizType,
  vizConfig,
  workspaceSlug,
  onClose,
}: Props): JSX.Element {
  const { t } = useLingui();
  const defaultNewDashboardName = t`Untitled dashboard`;
  const workspace = useCurrentWorkspace();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();
  const navigate = useNavigate();

  const dashboardsWhere =
    userProfile ?
      {
        workspace_id: { eq: workspace.id },
        owner_id: { eq: userProfile.userId },
      }
    : undefined;

  const [dashboards, isLoadingDashboards] = DashboardClient.useGetAll({
    where: dashboardsWhere,
    useQueryOptions: {
      enabled: dashboardsWhere !== undefined,
    },
  });

  const isInitialLoading = isLoadingUserProfile || isLoadingDashboards;
  const dashboardList = useMemo(() => {
    return dashboards ?? [];
  }, [dashboards]);
  const hasDashboards = dashboardList.length > 0;

  // Default mode: "create" when the user has zero dashboards (or while we
  // are still loading and assume empty), otherwise show the list first.
  const initialMode: Mode = hasDashboards ? "list" : "create";
  const [mode, setMode] = useState<Mode>(initialMode);

  // Track whether the user navigated into create mode from the list so we
  // can show a "Back to dashboards" link. When the modal opened directly
  // into create mode (no dashboards exist), there is nowhere to go back to.
  const [enteredFromList, setEnteredFromList] = useState(false);

  // Auto-switch to list mode the first render after dashboards finish
  // loading, in case we initialised assuming "empty" while the query was
  // still in-flight. Only do this if the user has not interacted yet.
  const shouldAutoSwitchToList =
    !isInitialLoading && hasDashboards && mode === "create" && !enteredFromList;
  if (shouldAutoSwitchToList) {
    setMode("list");
  }

  const showOpenDashboardToast = (
    dashboardId: DashboardId,
    dashboardName: string,
    action: "added" | "created",
  ): void => {
    const title =
      action === "added" ?
        t`Added to "${dashboardName}"`
      : t`Created "${dashboardName}"`;
    notifications.show({
      color: "green",
      title,
      message: (
        <Anchor
          size="sm"
          onClick={() => {
            navigate({
              to: "/$workspaceSlug/dashboards/edit/$dashboardId",
              params: {
                workspaceSlug,
                dashboardId,
              },
            });
          }}
        >
          <Trans>Open dashboard</Trans>
        </Anchor>
      ),
    });
  };

  const [insertDashboard, isInsertingDashboard] = DashboardClient.useInsert({
    queryToInvalidate: DashboardClient.QueryKeys.getAll(),
    onSuccess: (createdDashboard) => {
      showOpenDashboardToast(
        createdDashboard.id,
        createdDashboard.name,
        "created",
      );
      onClose();
    },
    onError: (error) => {
      notifyError(t`Failed to create dashboard: ${error.message}`);
    },
  });

  const [updateDashboard, isUpdatingDashboard] = DashboardClient.useUpdate({
    queriesToInvalidate: [DashboardClient.QueryKeys.getAll()],
    onSuccess: (updatedDashboard) => {
      showOpenDashboardToast(
        updatedDashboard.id,
        updatedDashboard.name,
        "added",
      );
      onClose();
    },
    onError: (error) => {
      notifyError(t`Failed to save to dashboard: ${error.message}`);
    },
  });

  const isMutating = isInsertingDashboard || isUpdatingDashboard;

  const onSaveToExisting = (targetDashboard: Dashboard.T) => {
    const newBlock = createDataVizBlock({
      rawSQL,
      prompt,
      vizType,
      vizConfig,
    });

    const existingConfig = targetDashboard.config as unknown as {
      content: unknown[];
      root: unknown;
    };
    const updatedConfig = {
      ...existingConfig,
      content: [...(existingConfig.content ?? []), newBlock],
    } as unknown as Dashboard.T["config"];

    updateDashboard({
      id: targetDashboard.id,
      data: { config: updatedConfig },
    });
  };

  const onCreateAndSave = (trimmedName: string) => {
    if (!userProfile) {
      notifyError(t`Your user profile is not loaded yet. Please retry.`);
      return;
    }

    const newBlock = createDataVizBlock({
      rawSQL,
      prompt,
      vizType,
      vizConfig,
    });

    const baseConfig = DashboardConfigs.makeEmpty() as {
      root: { props: Record<string, unknown> };
      content: unknown[];
    };
    const seededConfig = {
      ...baseConfig,
      root: {
        ...baseConfig.root,
        props: {
          ...baseConfig.root.props,
          title: trimmedName,
        },
      },
      content: [newBlock],
    } as unknown as Dashboard.T["config"];

    const now = new Date();
    insertDashboard({
      data: Model.make("Dashboard", {
        workspaceId: workspace.id,
        ownerId: userProfile.userId,
        ownerProfileId: userProfile.profileId,
        name: trimmedName,
        description: undefined,
        slug: undefined,
        isPublic: false,
        config: seededConfig,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }),
    });
  };

  const subtitle =
    mode === "list" ?
      t`Pick a dashboard, or create a new one.`
    : t`We'll add this visualization to your new dashboard.`;

  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Title order={4}>
          <Trans>Save to dashboard</Trans>
        </Title>
        <Text c="dimmed" size="sm">
          {subtitle}
        </Text>
      </Stack>

      {mode === "list" ?
        <SaveToDashboardListMode
          dashboards={dashboardList}
          isLoading={isInitialLoading}
          isSaving={isUpdatingDashboard}
          isDisabled={isMutating}
          onSwitchToCreate={() => {
            setEnteredFromList(true);
            setMode("create");
          }}
          onCancel={onClose}
          onSelectAndSave={onSaveToExisting}
        />
      : <SaveToDashboardCreateMode
          defaultName={defaultNewDashboardName}
          isCreating={isInsertingDashboard}
          isDisabled={isMutating}
          showEmptyStateBanner={!enteredFromList && !hasDashboards}
          onBack={
            enteredFromList ?
              () => {
                setEnteredFromList(false);
                setMode("list");
              }
            : undefined
          }
          onCancel={onClose}
          onSubmit={onCreateAndSave}
        />
      }
    </Stack>
  );
}
