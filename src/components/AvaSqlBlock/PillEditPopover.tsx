import { Combobox, useCombobox } from "@mantine/core";
import { computeSqlScope } from "$/lib/sql/sqlScope";
import { useEffect, useRef } from "react";
import type { SqlPillClickInfo } from "@/lib/sql/createSqlDisplayExtension";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types";

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
  const seen = new Set<string>();
  const options: Option[] = [];
  for (const dataset of catalog.datasets) {
    if (!scope.datasetIds.has(dataset.id)) {
      continue;
    }
    for (const col of dataset.columns) {
      const key = `${dataset.name}::${col.name}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      options.push({
        value: key,
        insert: `"${col.name}"`,
        label: col.name,
        group: dataset.name,
      });
    }
  }
  return options;
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

  useEffect(() => {
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

  const grouped = new Map<string, Option[]>();
  const ungrouped: Option[] = [];
  for (const opt of options) {
    if (opt.group === undefined) {
      ungrouped.push(opt);
      continue;
    }
    let bucket = grouped.get(opt.group);
    if (bucket === undefined) {
      bucket = [];
      grouped.set(opt.group, bucket);
    }
    bucket.push(opt);
  }

  return (
    <div
      style={{
        position: "fixed",
        left: pill.anchorRect.left,
        top: pill.anchorRect.bottom,
        width: pill.anchorRect.width,
        height: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
      data-testid="ava-sql-pill-popover-anchor"
    >
      <Combobox
        store={combobox}
        position="bottom-start"
        width={240}
        withinPortal
        onOptionSubmit={(value) => {
          const option = options.find((o) => {
            return o.value === value;
          });
          if (option) {
            onSelect({ insert: option.insert });
          }
        }}
      >
        <Combobox.Target>
          <div
            style={{
              width: pill.anchorRect.width,
              height: 0,
              pointerEvents: "auto",
            }}
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
