import type { ReactNode } from "react";
import type { ActionProps } from "react-querybuilder";

import { useLingui } from "@lingui/react/macro";
import { ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import classes from "./FilterRemoveAction.module.css";

type Props = ActionProps;

/**
 * Remove buttons. A ghost icon rather than a solid blue block, so removing a
 * rule does not outweigh the rule itself.
 */
export function FilterRemoveAction({
  ruleOrGroup,
  handleOnClick,
}: Props): ReactNode {
  const { t } = useLingui();
  const isGroup = "combinator" in ruleOrGroup;
  return (
    <ActionIcon
      variant="subtle"
      color="gray"
      size="md"
      aria-label={isGroup ? t`Remove group` : t`Remove condition`}
      onClick={(event) => {
        handleOnClick(event);
      }}
      className={classes.filterRemoveAction}
    >
      <IconTrash size={16} />
    </ActionIcon>
  );
}
