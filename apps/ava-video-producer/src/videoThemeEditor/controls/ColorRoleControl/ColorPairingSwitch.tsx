import { Switch } from "@mantine/core";
import { useRowHasIssue } from "../../RowIssueContext/RowIssueContext";
import { useRowIssueAriaProps } from "../../RowIssueContext/rowIssueHelpers";
import { useTokenEditor } from "../../TokenEditorContext";
import {
  canPairColorRole,
  isColorPair,
  setColorPairing,
} from "../roleValueHelpers/roleValueHelpers";
import type { ReactNode } from "react";

type Props = {
  row: Parameters<
    typeof import("./ColorRoleControl").ColorRoleControl
  >[0]["row"];
};
/** Toggles the light-background alternative for a paired colour token. */
export function ColorPairingSwitch({ row }: Readonly<Props>): ReactNode {
  const editor = useTokenEditor();
  const hasIssue = useRowHasIssue();
  const issueAriaProps = useRowIssueAriaProps();
  const pair = isColorPair(row.value) ? row.value : undefined;
  const canPair = canPairColorRole(row.value);
  return (
    <Switch
      size="xs"
      label="Use another colour on light backgrounds"
      error={hasIssue}
      {...issueAriaProps}
      checked={pair !== undefined}
      disabled={!canPair}
      description={canPair ? undefined : "Pick a colour first."}
      onChange={(event) => {
        return editor.setToken(
          row.path,
          setColorPairing({
            value: row.value,
            isPaired: event.currentTarget.checked,
          }),
        );
      }}
    />
  );
}
