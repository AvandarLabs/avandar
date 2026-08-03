import { useLingui } from "@lingui/react/macro";
import { Stack, Title } from "@mantine/core";
import { ShareUrlRow } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/ShareUrlRow";
import type { buildShareUrls } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/buildShareUrls";
import type { ReactNode } from "react";

type Props = {
  shareUrls: ReturnType<typeof buildShareUrls>;
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
          hint={t`Best for word-of-mouth sharing. Visiting the permanent link below also redirects here.`}
          showQr={false}
        />
      : null}
      <ShareUrlRow
        label={
          shareUrls.vanity ?
            t`Permanent link (use for QR codes)`
          : t`Share link`
        }
        url={shareUrls.canonical}
        hint={
          shareUrls.vanity ?
            t`Never changes, so QR codes printed from here keep working even if the custom URL changes.`
          : t`Anyone with this link can view the dashboard.`
        }
      />
    </Stack>
  );
}
