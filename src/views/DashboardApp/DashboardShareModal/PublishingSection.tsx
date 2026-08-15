import { Divider, Stack } from "@mantine/core";
import { PublishDashboardStatus } from "@/views/DashboardApp/DashboardShareModal/PublishDashboardStatus/PublishDashboardStatus";
import { PublishedShareLinks } from "@/views/DashboardApp/DashboardShareModal/PublishedShareLinks";
import { PublishSliceSection } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection";
import { VanitySlugField } from "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField";
import type { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl";
import type { ReactNode } from "react";

type Props = {
  publishing: ReturnType<typeof useDashboardPublishingControl>;
};

/** The "Published data" half of the merged share modal. */
export function PublishingSection({ publishing }: Readonly<Props>): ReactNode {
  const isPublished = publishing.currentDashboard.visibility !== "draft";
  return (
    <Stack gap="md">
      <Divider />
      <PublishDashboardStatus
        visibility={publishing.currentDashboard.visibility}
        targetVisibility={publishing.targetVisibility}
        isUsingVanity={Boolean(publishing.shareUrls.vanity)}
        targetUrl={
          publishing.shareUrls.vanity ?? publishing.shareUrls.canonical
        }
      />
      <VanitySlugField
        slugInput={publishing.slugInput}
        normalisedSlug={publishing.normalisedSlug}
        urlPrefix={publishing.urlPrefix}
        errorMessage={publishing.slugErrorMessage}
        hasPendingCheck={publishing.hasPendingSlugCheck}
        isAccepted={publishing.isSlugAccepted}
        onChange={publishing.onSlugInputChange}
      />
      <PublishSliceSection
        dashboard={publishing.currentDashboard}
        publishConfig={publishing.publishConfig}
        onChange={publishing.onPublishConfigChange}
      />
      {isPublished ?
        <PublishedShareLinks shareUrls={publishing.shareUrls} />
      : null}
    </Stack>
  );
}
