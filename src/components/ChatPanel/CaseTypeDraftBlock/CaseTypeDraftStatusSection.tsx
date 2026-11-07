import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import { StatusSetEditor } from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor";
import css from "./CaseTypeDraftCard.module.css";
import type { CaseTypeDraftEditor } from "./useCaseTypeDraftEditor";

type Props = {
  editor: CaseTypeDraftEditor;
};

/**
 * The statuses the new case type starts with. The proposal shows as a
 * read-only list, each badge above what it means, until the user chooses to
 * edit it; then the status set editor takes its place.
 */
export function CaseTypeDraftStatusSection({
  editor,
}: Readonly<Props>): React.ReactNode {
  const { t } = useLingui();
  const [isEditing, setIsEditing] = useState(false);
  const { statusSet } = editor;

  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          <Trans>Statuses</Trans>
        </Text>
        {isEditing ? null : (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            <Trans>Edit statuses</Trans>
          </Button>
        )}
      </Group>
      {isEditing ? (
        <StatusSetEditor value={statusSet} onChange={editor.setStatusSet} />
      ) : (
        <ul className={css.statusList} aria-label={t`Proposed statuses`}>
          {statusSet.statuses.map((status) => {
            return (
              <li key={status.id} className={css.statusRow}>
                <div className={css.statusRowName}>
                  {/* The description shows below, so no tooltip repeats it. */}
                  <StatusBadge
                    name={status.name}
                    color={status.color}
                    withTooltip={false}
                  />
                  {status.id === statusSet.defaultStatusId ? (
                    <Badge
                      variant="outline"
                      color="neutral"
                      radius="sm"
                      size="sm"
                      tt="none"
                      fw={500}
                    >
                      <Trans>Default</Trans>
                    </Badge>
                  ) : null}
                </div>
                {status.description ? (
                  <Text size="xs" c="dimmed">
                    {status.description}
                  </Text>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Stack>
  );
}
