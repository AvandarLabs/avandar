import { Trans } from "@lingui/react/macro";
import { Accordion, Divider, Stack } from "@mantine/core";
import { DashboardMapAudienceAlert } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/DashboardMapAudienceAlert";
import { PublishDashboardStatus } from "@/views/DashboardApp/DashboardShareModal/PublishDashboardStatus/PublishDashboardStatus";
import { PublishMapLayersPreview } from "@/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersPreview";
import { PublishSliceSection } from "@/views/DashboardApp/DashboardShareModal/PublishSliceSection/PublishSliceSection";
import { VanitySlugField } from "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField";
import type { useDashboardPublishingControl } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useDashboardPublishingControl";
import type { VanitySlugFieldProps } from "@/views/DashboardApp/DashboardShareModal/VanitySlugField/VanitySlugField";
import type { ReactNode } from "react";

type Props = {
  publishing: ReturnType<typeof useDashboardPublishingControl>;
};

function _vanitySlugProps(
  publishing: Props["publishing"],
): VanitySlugFieldProps {
  return /*  */ {
    slugInput: publishing.slugInput,
    normalisedSlug: publishing.normalisedSlug,
    errorMessage: publishing.slugErrorMessage,
    hasPendingCheck: publishing.hasPendingSlugCheck,
    isAccepted: publishing.isSlugAccepted,
    onChange: publishing.onSlugInputChange,
  };
}

/** The "Published data" half of the merged share modal. */
export function PublishingSection({ publishing }: Readonly<Props>): ReactNode {
  const isPublished = publishing.currentDashboard.visibility !== "draft";
  return (
    <Stack gap="md">
      <Divider />
      <DashboardMapAudienceAlert
        dashboard={publishing.currentDashboard}
        targetVisibility={publishing.targetVisibility}
      />
      <PublishDashboardStatus
        visibility={publishing.currentDashboard.visibility}
        targetVisibility={publishing.targetVisibility}
        isUsingVanity={Boolean(publishing.shareUrls.vanity)}
        targetUrl={
          publishing.shareUrls.vanity ?? publishing.shareUrls.canonical
        }
        pathPrefix={publishing.shareUrls.pathPrefix}
        vanitySlug={isPublished ? _vanitySlugProps(publishing) : undefined}
      />
      {isPublished ? null : (
        <VanitySlugField {..._vanitySlugProps(publishing)} />
      )}
      <Accordion defaultValue={null} variant="separated" keepMounted={false}>
        <Accordion.Item value="advanced">
          <Accordion.Control>
            <Trans>Advanced options</Trans>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="lg">
              <PublishSliceSection
                dashboard={publishing.currentDashboard}
                publishConfig={publishing.publishConfig}
                onChange={publishing.onPublishConfigChange}
              />
              {publishing.targetVisibility === "public" ? (
                <PublishMapLayersPreview
                  dashboard={publishing.currentDashboard}
                />
              ) : null}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
