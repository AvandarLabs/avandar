import { MultiSelect, Select, Stack, Text, TextInput } from "@mantine/core";
import { Paper } from "@ui";
import { useEffect, useMemo } from "react";
import { logAnalyticsEvent } from "@/lib/analytics/analyticsClient";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";

export type FilterPBlockMode = "select_single" | "select_multi" | "contains";

export type FilterPBlockProps = {
  /** Stable id used by the filter state manager. */
  filterId: string;
  /** Display label shown above the input. */
  label: string;
  /** SQL column name the filter targets. */
  columnName: string;
  /** Filter behaviour. */
  mode: FilterPBlockMode;
  /**
   * Comma-separated list of allowed values. Required for `select_single` and
   * `select_multi` modes. Empty string means "no constraint" (the input shows
   * a hint).
   */
  optionsRaw: string;
  /** Optional default value. JSON array for multi-select; string otherwise. */
  defaultValue: string;
};

function _parseOptions(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((s) => {
      return s.trim();
    })
    .filter((s) => {
      return s.length > 0;
    });
}

function _parseDefaultMulti(raw: string): readonly string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is string => {
        return typeof p === "string";
      });
    }
  } catch {
    // fall through
  }
  return _parseOptions(raw);
}

export function FilterPBlock(props: FilterPBlockProps): JSX.Element {
  const { filterId, label, columnName, mode, optionsRaw, defaultValue } = props;

  const dispatch = DashboardFilterStateManager.useDispatch();
  const { filtersById } = DashboardFilterStateManager.useState();

  const operator: "equals" | "in" | "contains" =
    mode === "select_multi" ? "in"
    : mode === "contains" ? "contains"
    : "equals";

  const initialValue = useMemo(() => {
    if (mode === "select_multi") {
      return _parseDefaultMulti(defaultValue);
    }
    return defaultValue.length > 0 ? defaultValue : undefined;
  }, [mode, defaultValue]);

  // Register the filter on mount / config change so the rest of the page
  // knows it exists. Unregister on unmount.
  useEffect(() => {
    if (!filterId || !columnName || !label) {
      return;
    }
    dispatch.registerFilter({
      filterId,
      columnName,
      label,
      operator,
      value: initialValue,
    });
    return () => {
      dispatch.unregisterFilter(filterId);
    };
  }, [filterId, columnName, label, operator, initialValue, dispatch]);

  const filterState = filterId ? filtersById[filterId] : undefined;
  const options = useMemo(() => {
    return _parseOptions(optionsRaw);
  }, [optionsRaw]);

  if (!filterId || !columnName || !label) {
    return (
      <Paper withBorder p="md">
        <Text c="dimmed" fz="sm">
          Configure this filter: set its id, label, and column name in the side
          panel.
        </Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="md">
      <Stack gap={6}>
        <Text size="sm" fw={600} c="neutral.9">
          {label}
        </Text>
        {mode === "select_multi" ?
          <MultiSelect
            placeholder="All"
            data={options}
            clearable
            searchable
            value={[...((filterState?.value as readonly string[]) ?? [])]}
            onChange={(v) => {
              dispatch.setFilterValue({ filterId, value: v });
              void logAnalyticsEvent({
                event: "dashboard.filter_changed",
                app: "dashboards",
                payload: { filterId, mode },
              });
            }}
          />
        : mode === "contains" ?
          <TextInput
            placeholder="Contains…"
            value={(filterState?.value as string) ?? ""}
            onChange={(e) => {
              dispatch.setFilterValue({
                filterId,
                value: e.currentTarget.value,
              });
            }}
          />
        : <Select
            placeholder="All"
            data={options}
            clearable
            searchable
            value={(filterState?.value as string) ?? null}
            onChange={(v) => {
              dispatch.setFilterValue({
                filterId,
                value: v ?? undefined,
              });
              void logAnalyticsEvent({
                event: "dashboard.filter_changed",
                app: "dashboards",
                payload: { filterId, mode },
              });
            }}
          />
        }
      </Stack>
    </Paper>
  );
}
