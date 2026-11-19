import { Badge, SegmentedControl } from "@mantine/core";
import css from "./ScopeSwitch.module.css";
import type { ThemeEditScope } from "../../../themeDraft/themeDraft";
import type { EditorItem } from "../EditorToolbar";

type Props = Readonly<{
  scope: ThemeEditScope;
  item: EditorItem;
  overrideCount: number;
  onScopeChange: (scope: ThemeEditScope) => void;
}>;

/** Switches between editing the whole theme and the previewed item, with its change count. */
export function ScopeSwitch({
  scope,
  item,
  overrideCount,
  onScopeChange,
}: Props) {
  return (
    <div className={css.scopeSwitch}>
      <SegmentedControl
        size="xs"
        fullWidth
        aria-label="Edit scope"
        value={scope.kind}
        data={[
          { value: "theme", label: "Whole theme" },
          { value: "item", label: item.scopeLabel },
        ]}
        onChange={(kind) => {
          return onScopeChange(
            kind === "item"
              ? { kind: "item", itemId: item.id }
              : { kind: "theme" },
          );
        }}
      />
      {overrideCount > 0 ? (
        <Badge
          size="xs"
          variant="light"
          classNames={{ root: css.scopeSwitchOverridesBadge }}
        >
          {`${overrideCount} ${overrideCount === 1 ? "change" : "changes"}`}
        </Badge>
      ) : null}
    </div>
  );
}
