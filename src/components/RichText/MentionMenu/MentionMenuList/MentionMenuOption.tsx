import { useLingui } from "@lingui/react/macro";
import { Combobox, Text } from "@mantine/core";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import classes from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList.module.css";
import type { MentionMenuItem } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type { ReactNode } from "react";

type Props = {
  item: MentionMenuItem;
  optionId: string;
  isHighlighted: boolean;
};

/** Two-letter initials for a member's avatar. */
function _buildInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0]?.toUpperCase() ?? "";
    })
    .join("");
}

/**
 * One row of `MentionMenuList`: a member's initials, name, and email, or a
 * gadget's type icon, name, and sub-label (its type name when it has none).
 */
export function MentionMenuOption({
  item,
  optionId,
  isHighlighted,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const definition =
    item.kind === "gadget" ? GADGET_REGISTRY[item.result.ref.gadgetType] : null;
  const detail =
    item.detail ?? (definition ? i18n._(definition.label) : undefined);
  return (
    <Combobox.Option
      id={optionId}
      value={item.id}
      className={classes.optionRow}
      selected={isHighlighted}
      aria-selected={isHighlighted}
    >
      <div className={classes.option}>
        {definition ? (
          <span className={classes.iconTile} aria-hidden>
            <definition.Icon size={16} stroke={1.75} />
          </span>
        ) : (
          <span className={classes.initials} aria-hidden>
            {_buildInitials(item.label)}
          </span>
        )}
        <div className={classes.text}>
          <Text size="sm" fw={600} truncate="end">
            {item.label}
          </Text>
          <Text size="xs" c="dimmed" truncate="end">
            {detail}
          </Text>
        </div>
      </div>
    </Combobox.Option>
  );
}
