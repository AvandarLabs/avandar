import { useLingui } from "@lingui/react/macro";
import { Button, Menu, Text } from "@mantine/core";
import {
  IconBook,
  IconChevronDown,
  IconPencil,
  IconSparkles,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { POPOVER_Z_INDEX } from "@/config/Theme";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ReactNode } from "react";

type Props = {
  /** Opens the dialog that creates an empty dictionary. */
  onStartEmpty: () => void;
};

/**
 * The two ways to start a dictionary: learn it from datasets, or start
 * empty and write it by hand.
 */
export function NewDictionaryMenu({
  onStartEmpty,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();

  return (
    <Menu position="bottom-end" width={300} zIndex={POPOVER_Z_INDEX}>
      <Menu.Target>
        <Button
          leftSection={<IconBook size={18} aria-hidden />}
          rightSection={<IconChevronDown size={14} aria-hidden />}
          size="compact-sm"
          variant="default"
        >
          {t`New dictionary`}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconSparkles size={16} aria-hidden />}
          onClick={() => {
            navigate(AppLinks.dataManagerNewDictionary(workspace.slug));
          }}
        >
          <Text size="sm">{t`From datasets`}</Text>
          <Text size="xs" c="dimmed">
            {t`Learns the codes and column meanings your datasets use`}
          </Text>
        </Menu.Item>
        <Menu.Item
          leftSection={<IconPencil size={16} aria-hidden />}
          onClick={onStartEmpty}
        >
          <Text size="sm">{t`Start empty`}</Text>
          <Text size="xs" c="dimmed">
            {t`Write the entries and code lists yourself`}
          </Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
