import { Trans } from "@lingui/react/macro";
import { Anchor, Button, Divider, Group, Stack } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { PublishDashboardStatus } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardStatus/PublishDashboardStatus";
import { PublishedShareLinks } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishedShareLinks";
import { PublishSliceSection } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishSliceSection";
import { VanitySlugField } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/VanitySlugField/VanitySlugField";
import type { buildShareUrls } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/buildShareUrls";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Props = {
  dashboard: Dashboard.T;
  publishConfig: PublishSliceConfig.Dashboard;
  shareUrls: ReturnType<typeof buildShareUrls>;
  targetUrl: string;
  slugInput: string;
  normalisedSlug: string;
  slugErrorMessage?: string;
  hasPendingSlugCheck: boolean;
  isSlugAccepted: boolean;
  isSlugRejected: boolean;
  isPublishing: boolean;
  onSlugInputChange: (slugInput: string) => void;
  onPublishConfigChange: Dispatch<SetStateAction<PublishSliceConfig.Dashboard>>;
  onSubmit: () => void;
  onClose: () => void;
};

/** Composes the publication settings and actions for the modal. */
export function PublishDashboardModalContent({
  dashboard,
  publishConfig,
  shareUrls,
  targetUrl,
  slugInput,
  normalisedSlug,
  slugErrorMessage,
  hasPendingSlugCheck,
  isSlugAccepted,
  isSlugRejected,
  isPublishing,
  onSlugInputChange,
  onPublishConfigChange,
  onSubmit,
  onClose,
}: Readonly<Props>): ReactNode {
  const isAlreadyPublished = dashboard.isPublic;
  return (
    <Stack gap="md">
      <PublishDashboardStatus
        isAlreadyPublished={isAlreadyPublished}
        isUsingVanity={Boolean(shareUrls.vanity)}
        targetUrl={targetUrl}
      />
      <Divider />
      <VanitySlugField
        slugInput={slugInput}
        normalisedSlug={normalisedSlug}
        errorMessage={slugErrorMessage}
        hasPendingCheck={hasPendingSlugCheck}
        isAccepted={isSlugAccepted}
        onChange={onSlugInputChange}
      />
      <Divider />
      <PublishSliceSection
        dashboard={dashboard}
        publishConfig={publishConfig}
        onChange={onPublishConfigChange}
      />
      {isAlreadyPublished ?
        <>
          <Divider />
          <PublishedShareLinks shareUrls={shareUrls} />
        </>
      : null}
      <Group justify="space-between" mt="md">
        <Anchor size="xs" c="dimmed" onClick={onClose} component="button">
          <Trans>Close</Trans>
        </Anchor>
        <Group gap="xs">
          <Button variant="subtle" color="neutral" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            loading={isPublishing}
            disabled={hasPendingSlugCheck || isSlugRejected}
            onClick={onSubmit}
            leftSection={<IconWorld size={16} />}
          >
            {isAlreadyPublished ?
              <Trans>Update &amp; republish</Trans>
            : <Trans>Publish</Trans>}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
