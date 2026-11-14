import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useCrosswalkStaleness } from "@/hooks/crosswalks/useCrosswalkStaleness/useCrosswalkStaleness";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { ReactNode } from "react";

type Props = {
  /**
   * The saved crosswalk row, refetched after every combine; undefined
   * before the first save.
   */
  crosswalk: Crosswalk.T | undefined;
  /** True on step 3, whose footer already offers the update. */
  isOnCombineStep: boolean;
  /** Goes to step 3. */
  onUpdate: () => void;
};

/**
 * The warning above the crosswalk's steps once a code list its combined
 * dataset embedded has changed, with Update combined dataset. Renders
 * nothing before the crosswalk has a combined dataset, since it has no
 * recorded code lists until then.
 */
export function CrosswalkStaleBanner({
  crosswalk,
  isOnCombineStep,
  onUpdate,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { isStale } = useCrosswalkStaleness(crosswalk);
  if (!isStale) {
    return null;
  }
  return (
    <Callout
      color="warning"
      icon={<IconAlertTriangle size={18} aria-hidden />}
      messageSize="sm"
      message={t`A dictionary this crosswalk uses has changed.`}
    >
      {isOnCombineStep ? null : (
        <Group>
          <Button size="compact-sm" variant="light" onClick={onUpdate}>
            <Trans>Update combined dataset</Trans>
          </Button>
        </Group>
      )}
    </Callout>
  );
}
