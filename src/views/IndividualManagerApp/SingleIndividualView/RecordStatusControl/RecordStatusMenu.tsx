import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Menu, UnstyledButton } from "@mantine/core";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordStatusControl/RecordStatusControl.module.css";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { ReactNode } from "react";

type Props = {
  /** The case type's statuses, in position order. */
  statuses: readonly ConceptStatus.T[];
  currentStatus: ConceptStatus.T;
  onChange: (statusId: ConceptStatus.Id) => void;
};

/**
 * The status picker for a user who may change a record's status: the
 * current status as a badge, opening a menu of every status.
 *
 * A menu rather than a `Select`: menu items take real focus, which is what
 * lets each status's description open on keyboard focus as well as on
 * hover. Combobox options are only highlighted, never focused.
 */
export function RecordStatusMenu({
  statuses,
  currentStatus,
  onChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <Menu position="bottom-start" width={260}>
      <Tooltip
        label={currentStatus.description}
        disabled={!currentStatus.description}
        multiline
        maw={280}
      >
        <Menu.Target>
          <UnstyledButton
            className={css.recordStatusControlTrigger}
            aria-label={t`Status: ${currentStatus.name}`}
          >
            <StatusBadge
              name={currentStatus.name}
              color={currentStatus.color}
              withTooltip={false}
            />
            <IconChevronDown
              size={14}
              aria-hidden
              className={css.recordStatusControlChevron}
            />
          </UnstyledButton>
        </Menu.Target>
      </Tooltip>
      <Menu.Dropdown>
        <Menu.Label>
          <Trans>Change status</Trans>
        </Menu.Label>
        {statuses.map((status) => {
          const isCurrent = status.id === currentStatus.id;
          return (
            <Tooltip
              key={status.id}
              label={status.description}
              disabled={!status.description}
              position="right"
              multiline
              maw={280}
            >
              <Menu.Item
                aria-current={isCurrent}
                rightSection={
                  isCurrent ? <IconCheck size={14} aria-hidden /> : null
                }
                onClick={() => {
                  onChange(status.id);
                }}
              >
                <StatusBadge
                  name={status.name}
                  color={status.color}
                  withTooltip={false}
                />
              </Menu.Item>
            </Tooltip>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
