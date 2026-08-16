import { useLingui } from "@lingui/react/macro";
import { Stack, Title } from "@mantine/core";
import { ShareUrlRow } from "@/views/DashboardApp/DashboardShareModal/ShareUrlRow";
import type { makeShareUrlsFromPublishTarget } from "@/views/DashboardApp/DashboardShareModal/makeShareUrlsFromPublishTarget/makeShareUrlsFromPublishTarget";
import type { ReactNode } from "react";

type Props = {
  shareUrls: ReturnType<typeof makeShareUrlsFromPublishTarget>;
};

/** Renders copy and QR controls for published dashboard URLs. */
export function PublishedShareLinks({ shareUrls }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <Stack gap="md">
      <Title order={5} fw={600}>{t`Share`}</Title>
      {shareUrls.vanity ?
        <ShareUrlRow
          label={t`Custom URL`}
          url={shareUrls.vanity}
          hint={t`Best for word-of-mouth sharing. Visiting the direct link below also redirects here.`}
          showQr={false}
        />
      : null}
      <ShareUrlRow
        label={
          shareUrls.vanity ? t`Direct link (use for QR codes)` : t`Share link`
        }
        url={shareUrls.canonical}
        hint={
          shareUrls.vanity ?
            t`Stable for as long as this dashboard keeps its current audience, so QR codes printed from here keep working even if the custom URL changes. Changing between workspace and public changes this link.`
          : t`Anyone with this link can view the dashboard.`
        }
      />
    </Stack>
  );
}
