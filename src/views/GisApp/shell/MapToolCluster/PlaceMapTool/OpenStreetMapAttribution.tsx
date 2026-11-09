import { useLingui } from "@lingui/react/macro";
import { Anchor } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * The OpenStreetMap credit that geocoded addresses must carry, shown under
 * address search results and under an address filled from them.
 */
export function OpenStreetMapAttribution(): ReactNode {
  const { t } = useLingui();
  return (
    <Anchor
      href="https://www.openstreetmap.org/copyright"
      target="_blank"
      rel="noopener noreferrer"
      size="xs"
      c="dimmed"
    >
      {t`© OpenStreetMap contributors`}
    </Anchor>
  );
}
