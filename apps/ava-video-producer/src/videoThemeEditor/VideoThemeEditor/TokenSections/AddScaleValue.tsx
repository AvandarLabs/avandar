import { Button } from "@mantine/core";
import { TokenCatalog } from "../../../videoTheme/tokenCatalog/TokenCatalog/TokenCatalog";
import { getDefaultLiteralFromKind } from "../../controls/getDefaultLiteralFromKind";
import { useTokenEditor } from "../../TokenEditorContext";
import { TokenRows } from "../../TokenRows/TokenRows";
import {
  type TokenRowGroup,
  type TokenRow,
} from "../../TokenRows/TokenRows.types";
import type { ReactNode } from "react";

type Props = TokenRowGroup &
  Readonly<{
    /** Every row in the editor, unfiltered, so new keys never collide. */
    allRows: readonly TokenRow[];
  }>;
/** Adds a new value to an atomic scale, starting from its kind's default. */
export function AddScaleValue({ group, allRows }: Props): ReactNode {
  const editor = useTokenEditor();
  const scalePath = `atomic.${group.split(":")[1]}`;
  const kind = TokenCatalog.getTokenDefinitionFromPath(
    `${scalePath}.entry`,
  )?.kind;
  if (!kind) {
    return null;
  }
  return (
    <Button
      size="compact-xs"
      variant="subtle"
      onClick={() => {
        return editor.setToken(
          `${scalePath}.${TokenRows.makeNextCustomScaleKeyFromRows({ rows: allRows, group })}`,
          getDefaultLiteralFromKind(kind),
        );
      }}
    >
      {"Add value"}
    </Button>
  );
}
