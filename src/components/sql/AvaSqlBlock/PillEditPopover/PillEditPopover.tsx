import { Combobox, useCombobox } from "@mantine/core";
import { isDefined, propEq } from "@utils";
import { computeSqlScope } from "@/components/sql/sql-helpers/sqlScope/sqlScope";
import { useEffect, useRef } from "react";
import css from "./PillEditPopover.module.css";
import type { SqlPillClickInfo } from "@/components/sql/sql-helpers/createSqlDisplayExtension";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";

type PillEditPopoverProps = {
  pill: SqlPillClickInfo | null;
  catalog: SqlDisplayCatalog;
  sql: string;
  onClose: () => void;
  onSelect: (replacement: { insert: string }) => void;
};

type Option = {
  value: string;
  /** Replacement text including surrounding quotes. */
  insert: string;
  label: string;
  group?: string;
};

function _buildDatasetOptions(catalog: SqlDisplayCatalog): Option[] {
  return catalog.datasets.map((d) => {
    return {
      value: d.id,
      insert: `"${d.id}"`,
      label: d.name,
    };
  });
}

function _buildColumnOptions(
  catalog: SqlDisplayCatalog,
  sql: string,
): Option[] {
  const scope = computeSqlScope({ sql, catalog });
  const options: Option[] = catalog.datasets
    .filter((dataset) => {
      return scope.datasetIds.has(dataset.id);
    })
    .flatMap((dataset) => {
      return dataset.columns.map((col) => {
        return {
          value: `${dataset.name}::${col.name}`,
          insert: `"${col.name}"`,
          label: col.name,
          group: dataset.name,
        };
      });
    });

  // Dedupe by `${dataset.name}::${col.name}`, keeping first occurrence.
  const byKey = new Map(
    options.map((option) => {
      return [option.value, option] as const;
    }),
  );
  return Array.from(byKey.values());
}

/**
 * Floating Combobox dropdown anchored to a pill's bounding rect. Shows the
 * list of datasets when a dataset pill is being edited, or the union of
 * in-scope columns (grouped by dataset) when a column pill is being edited.
 * Selecting an option replaces the original token in the SQL document.
 */
export function PillEditPopover({
  pill,
  catalog,
  sql,
  onClose,
  onSelect,
}: PillEditPopoverProps): JSX.Element | null {
  const combobox = useCombobox({
    onDropdownClose: () => {
      onClose();
    },
  });
  const lastPillStartRef = useRef<number | null>(null);

  useEffect(function syncDropdownToActivePill() {
    if (pill === null) {
      combobox.closeDropdown();
      lastPillStartRef.current = null;
      return;
    }
    if (lastPillStartRef.current !== pill.start) {
      combobox.openDropdown();
      lastPillStartRef.current = pill.start;
    }
  }, [pill, combobox]);

  if (pill === null) {
    return null;
  }

  const options: Option[] =
    pill.kind === "dataset" ?
      _buildDatasetOptions(catalog)
    : _buildColumnOptions(catalog, sql);

  const ungrouped = options.filter((opt) => {
    return opt.group === undefined;
  });
  const groupNames = Array.from(
    new Set(
      options
        .map((opt) => {
          return opt.group;
        })
        .filter(isDefined),
    ),
  );
  const grouped = new Map<string, Option[]>(
    groupNames.map((groupName) => {
      return [
        groupName,
        options.filter((opt) => {
          return opt.group === groupName;
        }),
      ];
    }),
  );

  return (
    <div
      className={css.anchor}
      style={{
        left: pill.anchorRect.left,
        top: pill.anchorRect.bottom,
        width: pill.anchorRect.width,
      }}
      data-testid="ava-sql-pill-popover-anchor"
    >
      <Combobox
        store={combobox}
        position="bottom-start"
        width={240}
        withinPortal
        onOptionSubmit={(value) => {
          const option = options.find(propEq("value", value));
          if (option) {
            onSelect({ insert: option.insert });
          }
        }}
      >
        <Combobox.Target>
          <div
            className={css.target}
            style={{ width: pill.anchorRect.width }}
          />
        </Combobox.Target>
        <Combobox.Dropdown
          data-testid="ava-sql-pill-options"
          style={{ minWidth: 220 }}
        >
          <Combobox.Options>
            {ungrouped.map((opt) => {
              return (
                <Combobox.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Combobox.Option>
              );
            })}
            {Array.from(grouped.entries()).map(([groupName, opts]) => {
              return (
                <Combobox.Group key={groupName} label={groupName}>
                  {opts.map((opt) => {
                    return (
                      <Combobox.Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Combobox.Option>
                    );
                  })}
                </Combobox.Group>
              );
            })}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
    </div>
  );
}
