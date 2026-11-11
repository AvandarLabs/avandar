import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import type { ReactNode } from "react";

/** Why a read-only map shows a message instead of a map. */
export type MapViewerStateKind = "loading" | "noAccess" | "missingSnapshot";

type Props = { kind: MapViewerStateKind; heightPx: number };

function NoAccessMessage(): ReactNode {
  return (
    <Stack align="center" gap={4} className={css.mapViewerStateMessage}>
      <IconLock size={24} aria-hidden />
      <Text fw={600} size="sm" ta="center">
        <Trans>You don't have access to this map</Trans>
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        <Trans>
          Ask the map's owner to share the map and its data with you.
        </Trans>
      </Text>
    </Stack>
  );
}

/**
 * What a map block shows instead of a map: loading, no access, or a map that
 * has no published snapshot yet.
 */
export function MapViewerState({ kind, heightPx }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <div
      className={css.mapViewerState}
      style={{ minHeight: heightPx }}
      role={kind === "loading" ? undefined : "status"}
    >
      {matchLiteral(kind, {
        loading: () => {
          return <Loader size="sm" aria-label={t`Loading the map`} />;
        },
        noAccess: () => {
          return <NoAccessMessage />;
        },
        missingSnapshot: () => {
          return (
            <Text
              size="sm"
              c="dimmed"
              ta="center"
              className={css.mapViewerStateMessage}
            >
              <Trans>
                This map was added after the dashboard was last published.
                Publish again to show it here.
              </Trans>
            </Text>
          );
        },
      })}
    </div>
  );
}
