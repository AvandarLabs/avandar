import { useLingui } from "@lingui/react/macro";
import { Anchor } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * The "Powered by Geoapify" credit that Geoapify's free plan requires
 * wherever its address search results are shown.
 */
export function GeoapifyAttribution(): ReactNode {
  const { t } = useLingui();
  return (
    <Anchor
      href="https://www.geoapify.com/"
      target="_blank"
      rel="noopener noreferrer"
      size="xs"
      c="dimmed"
    >
      {t`Powered by Geoapify`}
    </Anchor>
  );
}
