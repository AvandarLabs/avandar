import { Button } from "@mantine/core";
import { getTokenDefinitionFromPath } from "../../../videoTheme/tokenCatalog/tokenCatalogHelpers";
import { getDefaultLiteralFromKind } from "../../controls/getDefaultLiteralFromKind";
import { useTokenEditor } from "../../TokenEditorContext/TokenEditorContext";
import {
  buildNextCustomScaleKey,
  type TokenRow as TokenRowModel,
  type TokenRowGroup,
} from "../../tokenRows/tokenRows";

type Props = TokenRowGroup &
  Readonly<{
    /** Every row in the editor, unfiltered, so new keys never collide. */
    allRows: readonly TokenRowModel[];
  }>;

/** Adds a new value to an atomic scale, starting from its kind's default. */
export function AddScaleValue({ group, allRows }: Props) {
  const editor = useTokenEditor();
  const scalePath = `atomic.${group.split(":")[1]}`;
  const kind = getTokenDefinitionFromPath(`${scalePath}.entry`)?.kind;
  if (!kind) {
    return null;
  }
  return (
    <Button
      size="compact-xs"
      variant="subtle"
      onClick={() =>
        editor.setToken(
          `${scalePath}.${buildNextCustomScaleKey(allRows, group)}`,
          getDefaultLiteralFromKind(kind),
        )
      }
    >
      {"Add value"}
    </Button>
  );
}
