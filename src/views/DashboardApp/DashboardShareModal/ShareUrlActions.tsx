import type { ReactNode } from "react";

import { ActionIcon } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { CopyButton, Group } from "@mantine/core";
import { IconCheck, IconCopy, IconQrcode } from "@tabler/icons-react";
import { useState } from "react";

import { ShareUrlQrModal } from "@/views/DashboardApp/DashboardShareModal/ShareUrlQrModal";

type Props = {
  url: string;
};

function CopyShareUrlButton({ url }: Readonly<{ url: string }>): ReactNode {
  const { t } = useLingui();
  return (
    <CopyButton value={url}>
      {({ copied, copy }) => {
        return (
          <ActionIcon
            tooltip={copied ? t`Copied!` : t`Copy link`}
            variant="light"
            color={copied ? "teal" : "neutral"}
            size="lg"
            onClick={copy}
            aria-label={t`Copy share link`}
          >
            {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
          </ActionIcon>
        );
      }}
    </CopyButton>
  );
}

/**
 * Copy and QR actions for a published share URL.
 */
export function ShareUrlActions({ url }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [isQrOpened, setIsQrOpened] = useState(false);

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <CopyShareUrlButton url={url} />
        <ActionIcon
          tooltip={t`Show QR code`}
          variant="light"
          color="neutral"
          size="lg"
          aria-label={t`Show QR code`}
          onClick={() => {
            setIsQrOpened(true);
          }}
        >
          <IconQrcode size={18} />
        </ActionIcon>
      </Group>
      <ShareUrlQrModal
        url={url}
        isOpened={isQrOpened}
        onClose={() => {
          setIsQrOpened(false);
        }}
      />
    </>
  );
}
