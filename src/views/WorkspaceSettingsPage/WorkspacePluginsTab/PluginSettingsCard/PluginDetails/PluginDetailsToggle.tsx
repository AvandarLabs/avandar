import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

type Props = Readonly<{
  isExpanded: boolean;

  /** The id of the region the toggle opens and folds. */
  regionId: string;

  /** The id of the card's heading, which describes the toggle. */
  headingId: string;
  onToggle: () => void;
}>;

/**
 * The "See more" / "See less" button that opens and folds a plugin's details
 * in `PluginDetails`. A screen reader hears it described by the plugin name.
 */
export function PluginDetailsToggle({
  isExpanded,
  regionId,
  headingId,
  onToggle,
}: Props): JSX.Element {
  const { t } = useLingui();
  const ToggleIcon = isExpanded ? IconChevronUp : IconChevronDown;
  return (
    <Button
      variant="subtle"
      color="neutral"
      size="compact-sm"
      w="fit-content"
      px={0}
      rightSection={<ToggleIcon size={14} aria-hidden />}
      aria-expanded={isExpanded}
      aria-controls={regionId}
      aria-describedby={headingId}
      onClick={onToggle}
    >
      {isExpanded ? t`See less` : t`See more`}
    </Button>
  );
}
